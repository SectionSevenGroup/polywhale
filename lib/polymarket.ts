const DATA = "https://data-api.polymarket.com";
const CLOB = "https://clob.polymarket.com";

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

export interface BookLevel { price: string; size: string }
export interface OrderBook {
  market: string;
  asset_id: string;
  bids: BookLevel[];
  asks: BookLevel[];
  last_trade_price?: string;
}

async function json<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { "user-agent": "polywhale/0.1" },
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json() as Promise<T>;
}

export async function fetchLeaderboard(
  category: Category,
  timePeriod: Period,
  orderBy: "PNL" | "VOL" = "PNL",
  limit = 50,
  offset = 0,
) {
  const q = new URLSearchParams({ category, timePeriod, orderBy, limit: String(limit), offset: String(offset) });
  return json<LeaderboardRow[]>(`${DATA}/v1/leaderboard?${q}`);
}

export async function fetchTrades(user: string, start?: number, limit = 100) {
  const q = new URLSearchParams({ user, limit: String(limit), takerOnly: "true" });
  if (start) q.set("start", String(start));
  return json<PublicTrade[]>(`${DATA}/trades?${q}`);
}

export async function fetchPositions(user: string, limit = 500) {
  const q = new URLSearchParams({ user, limit: String(limit), sizeThreshold: "0" });
  return json<Position[]>(`${DATA}/positions?${q}`);
}

export async function fetchBook(asset: string) {
  return json<OrderBook>(`${CLOB}/book?token_id=${encodeURIComponent(asset)}`);
}

export async function fetchMidpoint(asset: string): Promise<number | null> {
  try {
    const q = new URLSearchParams({ token_id: asset });
    const data = await json<{ mid: string }>(`${CLOB}/midpoint?${q}`);
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
  const depthUsd = [...book.bids.slice(-8), ...book.asks.slice(0, 8)]
    .reduce((sum, x) => sum + Number(x.price) * Number(x.size), 0);
  return { bestBid, bestAsk, midpoint, spread, depthUsd };
}
