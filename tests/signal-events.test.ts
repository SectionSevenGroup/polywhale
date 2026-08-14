import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { evaluationEdges, freezeSignalEvent, isMaterialSignalChange, type FrozenSignalState } from "../lib/signal-events";

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

test("duplicate polls do not create events but each deterministic material rule does", () => {
  assert.equal(isMaterialSignalChange(state(),state()),false);
  assert.equal(isMaterialSignalChange(state(),state({independentWhaleCount:3})),true);
  assert.equal(isMaterialSignalChange(state(),state({label:"HIGH CONVICTION",signalScore:85})),true);
  assert.equal(isMaterialSignalChange(state(),state({totalNotional:12_499})),false);
  assert.equal(isMaterialSignalChange(state(),state({totalNotional:12_500})),true);
  assert.equal(isMaterialSignalChange(state(),state({marketMidpoint:.429})),false);
  assert.equal(isMaterialSignalChange(state(),state({marketMidpoint:.43})),true);
});

test("evaluation uses frozen alert price and whale entry as independent baselines", () => {
  const measured=evaluationEdges(.52,.45,.30);
  assert.ok(Math.abs((measured.priceMoveSinceAlert??0)-.07)<1e-12);
  assert.ok(Math.abs(measured.whaleEntryEdge-.22)<1e-12);
  const missing=evaluationEdges(.52,null,.30);
  assert.equal(missing.priceMoveSinceAlert,null);
  assert.ok(Math.abs(missing.whaleEntryEdge-.22)<1e-12);
});

test("migration guards immutable events and marks old history as legacy", () => {
  const sql=fs.readFileSync("db/schema.sql","utf8");
  assert.match(sql,/BEFORE UPDATE OR DELETE ON signal_events/);
  assert.match(sql,/legacy_mutable_v0/);
  assert.match(sql,/price_move_since_alert DOUBLE PRECISION/);
  assert.match(sql,/whale_entry_edge DOUBLE PRECISION/);
});
