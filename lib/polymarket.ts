const DATA = "https://data-api.polymarket.com";
const CLOB = "https://clob.polymarket.com";
const GAMMA = "https://gamma-api.polymarket.com";

export type Category =
  | "OVERALL" | "POLITICS" | "SPORTS" | "ESPORTS" | "CRYPTO"
  | "CULTURE" | "MENTIONS" | "WEATHER" | "ECONOMICS" | "TECH" | "FINANCE";
export type Period = "DAY" | "WEEK" | "MONTH" | "ALL";

export interface LeaderboardRow {
  rank: string;
  proxyWallet: string;
  userName?: string;
  vol: number;
  pnl: number;
  profileImage?: string;
  xUsername?: string;
  verifiedBadge?: boolean;
}

export interface PublicTrade {
  proxyWallet: string;
  side: "BUY" | "SELL";
  asset: string;
  conditionId: string;
  size: number;
  price: number;
  timestamp: number;
  title: string;
  slug: string;
  icon?: string;
  eventSlug?: string;
  outcome: string;
  outcomeIndex: number;
  name?: string;
  pseudonym?: string;
  transactionHash: string;
}

export interface Position {
  proxyWallet: string;
  asset: string;
  conditionId: string;
  size: number;
  avgPrice: number;
  initialValue: number;
  currentValue: number;
  cashPnl: number;
  percentPnl: number;
  totalBought: number;
  realizedPnl: number;
  curPrice: number;
  title: string;
  slug: string;
  eventSlug?: string;
  outcome: string;
  endDate?: string;
}

export interface ClosedPosition {
  proxyWallet: string;
  asset: string;
  conditionId: string;
  avgPrice: number;
  totalBought: number;
  realizedPnl: number;
  curPrice: number;
  title: string;
  slug: string;
  eventSlug?: string;
  outcome: string;
  outcomeIndex?: number;
  timestamp?: number;
  endDate?: string;
}

export interface PricePoint { t: number; p: number }

export interface BookLevel { price: string; size: string }
export interface OrderBook {
  market: string;
  asset_id: string;
  bids: BookLevel[];
  asks: BookLevel[];
  last_trade_price?: string;
}

export class PolymarketHttpError extends Error {
  constructor(public readonly status: number, url: string) { super(`Polymarket HTTP ${status}: ${url}`); }
}

function retryDelay(response: Response, attempt: number) {
  const raw = response.headers.get("retry-after");
  if (raw) {
    const seconds = Number(raw);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
    const date = Date.parse(raw);
    if (Number.isFinite(date)) return Math.max(0, date - Date.now());
  }
  return Math.min(8000, 250 * 2 ** attempt) + Math.floor(Math.random() * 100);
}

export async function fetchJson<T>(url: string, attempts = 4, fetcher: typeof fetch = fetch): Promise<T> {
  let last: Error | undefined;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const response = await fetcher(url, { headers: { "user-agent": "polywhale/1.0" }, cache: "no-store" });
      if (response.ok) {
        const contentType = response.headers.get("content-type") ?? "";
        if (!contentType.includes("json")) throw new Error(`Expected JSON from ${url}, received ${contentType || "unknown content type"}`);
        const value: unknown = await response.json();
        if (value == null) throw new Error(`Empty JSON response: ${url}`);
        return value as T;
      }
      if (response.status !== 429 && response.status < 500) throw new PolymarketHttpError(response.status, url);
      last = new PolymarketHttpError(response.status, url);
      if (attempt < attempts - 1) await new Promise(resolve => setTimeout(resolve, retryDelay(response, attempt)));
    } catch (error) {
      if (error instanceof PolymarketHttpError && error.status !== 429 && error.status < 500) throw error;
      last = error instanceof Error ? error : new Error(String(error));
      if (attempt < attempts - 1) await new Promise(resolve => setTimeout(resolve, Math.min(4000, 250 * 2 ** attempt)));
    }
  }
  throw last ?? new Error(`Request failed: ${url}`);
}

export async function fetchLeaderboard(
  category: Category,
  timePeriod: Period,
  orderBy: "PNL" | "VOL" = "PNL",
  limit = 50,
  offset = 0,
) {
  const q = new URLSearchParams({ category, timePeriod, orderBy, limit: String(limit), offset: String(offset) });
  const rows = await fetchJson<unknown>(`${DATA}/v1/leaderboard?${q}`);
  return Array.isArray(rows) ? rows as LeaderboardRow[] : [];
}

export async function fetchTrades(user: string, start?: number, limit = 100) {
  const q = new URLSearchParams({ user, limit: String(limit), takerOnly: "true" });
  if (start) q.set("start", String(start));
  const rows = await fetchJson<unknown>(`${DATA}/trades?${q}`);
  return Array.isArray(rows) ? rows as PublicTrade[] : [];
}

export async function fetchPositions(user: string, limit = 500) {
  const q = new URLSearchParams({ user, limit: String(limit), sizeThreshold: "0" });
  const rows = await fetchJson<unknown>(`${DATA}/positions?${q}`);
  return Array.isArray(rows) ? rows as Position[] : [];
}

export async function fetchClosedPositions(user: string, limit = 50, offset = 0) {
  const q = new URLSearchParams({ user, limit: String(limit), offset: String(offset), sortBy: "TIMESTAMP", sortDirection: "DESC" });
  const rows = await fetchJson<unknown>(`${DATA}/closed-positions?${q}`);
  return Array.isArray(rows) ? rows as ClosedPosition[] : [];
}

export async function fetchPriceHistory(asset: string, interval = "max", fidelity = 1) {
  const q = new URLSearchParams({ market: asset, interval, fidelity: String(fidelity) });
  const data = await fetchJson<{history?: PricePoint[]}>(`${CLOB}/prices-history?${q}`);
  return Array.isArray(data.history) ? data.history : [];
}

export async function fetchMarkets(conditionIds: string[]) {
  if (!conditionIds.length) return [];
  const q = new URLSearchParams({ limit: String(Math.min(conditionIds.length, 500)) });
  for (const id of conditionIds.slice(0, 500)) q.append("condition_ids", id);
  const rows = await fetchJson<unknown>(`${GAMMA}/markets?${q}`);
  return Array.isArray(rows) ? rows : [];
}

export async function fetchBook(asset: string) {
  return fetchJson<OrderBook>(`${CLOB}/book?token_id=${encodeURIComponent(asset)}`);
}

export async function fetchMidpoint(asset: string): Promise<number | null> {
  try {
    const q = new URLSearchParams({ token_id: asset });
    const data = await fetchJson<{ mid: string }>(`${CLOB}/midpoint?${q}`);
    return Number(data.mid);
  } catch {
    return null;
  }
}

export function bookMetrics(book: OrderBook) {
  const bestBid = book.bids.length ? Math.max(...book.bids.map(x => Number(x.price))) : null;
  const bestAsk = book.asks.length ? Math.min(...book.asks.map(x => Number(x.price))) : null;
  const midpoint = bestBid != null && bestAsk != null ? (bestBid + bestAsk) / 2 : null;
  const spread = bestBid != null && bestAsk != null ? bestAsk - bestBid : null;
  const nearBids = [...book.bids].sort((a, b) => Number(b.price) - Number(a.price)).slice(0, 8);
  const nearAsks = [...book.asks].sort((a, b) => Number(a.price) - Number(b.price)).slice(0, 8);
  const depthUsd = [...nearBids, ...nearAsks]
    .reduce((sum, x) => sum + Number(x.price) * Number(x.size), 0);
  return { bestBid, bestAsk, midpoint, spread, depthUsd };
}
