import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { evaluationEdges, freezeSignalEvent, isMaterialSignalChange, materialSignalReason, performanceCounts, thesisKey, type FrozenSignalState } from "../lib/signal-events";

const state = (overrides: Partial<FrozenSignalState> = {}): FrozenSignalState => ({
  signalScore: 72, label: "STRONG", independentWhaleCount: 2, totalNotional: 10_000, marketMidpoint: .40, ...overrides,
});

test("signal event snapshots cannot be changed after creation", () => {
  const event = freezeSignalEvent({...state(),avgWhaleEntry:.35,wallets:[{wallet:"0x1",score:80}]});
  assert.throws(()=>{(event as {signalScore:number}).signalScore=99},TypeError);
  assert.throws(()=>{(event.wallets[0] as {score:number}).score=99},TypeError);
});

test("later trade state cannot alter a prior event's score, entry, or detection price", () => {
  const mutable = {...state(),avgWhaleEntry:.35,wallets:[{wallet:"0x1"}]};
  const event = freezeSignalEvent(mutable);
  mutable.signalScore=90; mutable.avgWhaleEntry=.50; mutable.marketMidpoint=.55;
  assert.deepEqual([event.signalScore,event.avgWhaleEntry,event.marketMidpoint],[72,.35,.40]);
});

test("duplicate polls and repeated midpoint movement alone do not create events", () => {
  assert.equal(isMaterialSignalChange(state(),state()),false);
  assert.equal(isMaterialSignalChange(state(),state({marketMidpoint:.43})),false);
  assert.equal(isMaterialSignalChange(state(),state({marketMidpoint:.10})),false);
});

test("new independent whales and qualifying notional create events", () => {
  assert.equal(isMaterialSignalChange(state(),state({independentWhaleCount:3})),true);
  assert.equal(isMaterialSignalChange(state(),state({totalNotional:12_499})),false);
  assert.equal(isMaterialSignalChange(state(),state({totalNotional:12_500})),true);
});

test("label transitions require new whale flow", () => {
  assert.equal(materialSignalReason(state(),state({label:"HIGH CONVICTION",signalScore:85})),null);
  assert.equal(materialSignalReason(state(),state({label:"HIGH CONVICTION",signalScore:85,totalNotional:10_001})),"label_changed_on_new_flow");
});

test("evaluation uses frozen alert price and whale entry as independent baselines", () => {
  const measured=evaluationEdges(.52,.45,.30);
  assert.ok(Math.abs((measured.priceMoveSinceAlert??0)-.07)<1e-12);
  assert.ok(Math.abs(measured.whaleEntryEdge-.22)<1e-12);
  const missing=evaluationEdges(.52,null,.30);
  assert.equal(missing.priceMoveSinceAlert,null);
  assert.ok(Math.abs(missing.whaleEntryEdge-.22)<1e-12);
});

test("performance aggregation distinguishes raw events from unique thesis horizons", () => {
  const key=thesisKey(" 0xABC "," TOKEN "," YES ");
  assert.equal(key,"0xabc|token|yes");
  const rows=[
    {thesisKey:key,horizon:"30m",priceMoveSinceAlert:.1,whaleEntryEdge:.2},
    {thesisKey:key,horizon:"30m",priceMoveSinceAlert:.2,whaleEntryEdge:.3},
    {thesisKey:key,horizon:"4h",priceMoveSinceAlert:.3,whaleEntryEdge:.4},
    {thesisKey:"other|token|yes",horizon:"30m",priceMoveSinceAlert:.1,whaleEntryEdge:.1},
  ];
  assert.deepEqual(performanceCounts(rows),{eventObservations:4,uniqueThesisObservations:3});
});

test("migration guards immutable events and marks old history as legacy", () => {
  const sql=fs.readFileSync("db/schema.sql","utf8");
  assert.match(sql,/BEFORE UPDATE OR DELETE ON signal_events/);
  assert.match(sql,/legacy_mutable_v0/);
  assert.match(sql,/price_move_since_alert DOUBLE PRECISION/);
  assert.match(sql,/whale_entry_edge DOUBLE PRECISION/);
  assert.match(sql,/legacy_v1_price_possible/);
  assert.match(sql,/calibration_eligible=TRUE/);
});
