import {
  bookMetrics, fetchBook, fetchClosedPositions, fetchLeaderboard, fetchMarkets,
  fetchMidpoint, fetchPositions, fetchPriceHistory, fetchTrades,
} from "../lib/polymarket";

const shape = (value: unknown) => value && typeof value === "object" ? Object.keys(value).sort() : [];

async function main() {
  const leaders = await fetchLeaderboard("OVERALL", "WEEK", "PNL", 2);
  if (!leaders.length) throw new Error("Leaderboard returned no rows");
  const wallet = leaders[0].proxyWallet;
  const trades = await fetchTrades(wallet, undefined, 20);
  const positions = await fetchPositions(wallet, 20);
  const closed = await fetchClosedPositions(wallet, 20);
  const sample = trades[0] ?? positions[0] ?? closed[0];
  if (!sample) throw new Error(`Wallet ${wallet} returned no trades or positions from which to select a market`);
  const markets = await fetchMarkets([sample.conditionId]);
  const history = await fetchPriceHistory(sample.asset, "max", 1);
  const midpoint = await fetchMidpoint(sample.asset);
  const book = await fetchBook(sample.asset);
  const report = {
    leaderboard: { count: leaders.length, keys: shape(leaders[0]), sample: leaders[0] },
    trades: { count: trades.length, keys: shape(trades[0]), sample: trades[0] },
    positions: { count: positions.length, keys: shape(positions[0]), sample: positions[0] },
    closedPositions: { count: closed.length, keys: shape(closed[0]), sample: closed[0] },
    markets: { count: markets.length, keys: shape(markets[0]), sample: markets[0] },
    priceHistory: { count: history.length, keys: shape(history[0]), sample: history.slice(0, 2) },
    midpoint,
    orderBook: { keys: shape(book), bidCount: book.bids.length, askCount: book.asks.length, metrics: bookMetrics(book) },
  };
  console.log(JSON.stringify(report, null, 2));
}

main().catch(error => { console.error(error); process.exit(1); });
