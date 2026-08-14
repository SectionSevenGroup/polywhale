import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fetchJson } from "../lib/polymarket";

test("rate limits retry and malformed arrays are handled", async()=>{
  let calls=0; const fake=(async()=>{calls++;return calls===1?new Response("",{status:429}):Response.json([])}) as typeof fetch;
  assert.deepEqual(await fetchJson("https://example.invalid",2,fake),[]); assert.equal(calls,2);
});
test("migration contains snapshots, outcomes, and four backtest horizons",()=>{const sql=fs.readFileSync("db/schema.sql","utf8");for(const value of ["leaderboard_snapshots","closed_positions","signal_history","'5m','30m','4h','resolution'"])assert.match(sql,new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")))});
test("dashboard contract includes live activity and history",()=>{const route=fs.readFileSync("app/api/dashboard/route.ts","utf8");assert.match(route,/activity, history, generatedAt/);assert.match(route,/signal_score >= 60/)});
