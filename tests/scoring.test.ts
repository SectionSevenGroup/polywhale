import test from "node:test";
import assert from "node:assert/strict";
import { scoreSignal, scoreWhale, signalLabel } from "../lib/scoring";

const baseline = { weightedWhaleQuality: 88, whaleCount: 3, independentWhaleCount: 3, totalNotional: 100_000, avgEntry: .40, currentPrice: .41, spread: .01, depthUsd: 200_000, ageSeconds: 60 };

test("signal labels use every exact threshold boundary", () => {
  assert.equal(signalLabel(85), "HIGH CONVICTION"); assert.equal(signalLabel(84), "STRONG");
  assert.equal(signalLabel(72), "STRONG"); assert.equal(signalLabel(71), "WATCH");
  assert.equal(signalLabel(60), "WATCH"); assert.equal(signalLabel(59), "PASS");
});
test("single and linked wallets cannot masquerade as consensus", () => {
  assert.ok(scoreSignal({...baseline, whaleCount: 4, independentWhaleCount: 1}).score <= 69);
  assert.ok(scoreSignal({...baseline, independentWhaleCount: 3}).components.consensus > scoreSignal({...baseline, independentWhaleCount: 1}).components.consensus);
});
test("staleness, run-away price, and wide spread lower signals", () => {
  const good=scoreSignal(baseline); const stale=scoreSignal({...baseline,ageSeconds:3600});
  const run=scoreSignal({...baseline,currentPrice:.55}); const wide=scoreSignal({...baseline,spread:.10});
  assert.ok(stale.score<good.score); assert.ok(run.score<good.score); assert.ok(wide.score<=59);
});
test("whale score rewards validated depth and penalises concentration", () => {
  const basic={pnl:100_000,volume:1_000_000,allRank:20,monthRank:15,weekRank:10,categoryAppearances:2,closedPositions:100,hitRate:.64,medianImprovement:.03};
  assert.ok(scoreWhale(basic)>scoreWhale({...basic,closedPositions:0,hitRate:.3,concentration:1,medianImprovement:-.03}));
});
