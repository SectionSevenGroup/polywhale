import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { bookMetrics, fetchJson, fetchMarkets, PolymarketHttpError } from "../lib/polymarket";

test("rate limits retry and malformed arrays are handled", async()=>{
  let calls=0; const fake=(async()=>{calls++;return calls===1?new Response("",{status:429}):Response.json([])}) as typeof fetch;
  assert.deepEqual(await fetchJson("https://example.invalid",2,fake),[]); assert.equal(calls,2);
});
test("permanent client errors are not retried",async()=>{let calls=0;const fake=(async()=>{calls++;return Response.json({message:"bad"},{status:400})}) as typeof fetch;await assert.rejects(fetchJson("https://example.invalid",4,fake),PolymarketHttpError);assert.equal(calls,1)});
test("near-book depth is independent of API level ordering",()=>{const book={market:"m",asset_id:"a",bids:[{price:".1",size:"100"},{price:".4",size:"10"}],asks:[{price:".8",size:"100"},{price:".5",size:"10"}]};const result=bookMetrics(book);assert.equal(result.bestBid,.4);assert.equal(result.bestAsk,.5);assert.ok(Math.abs((result.spread??0)-.1)<1e-12);assert.equal(result.depthUsd,99)});
test("Gamma array filters use repeated condition_ids parameters",async()=>{const original=globalThis.fetch;let requested="";globalThis.fetch=(async(input)=>{requested=String(input);return Response.json([])}) as typeof fetch;try{await fetchMarkets(["one","two"]);const url=new URL(requested);assert.deepEqual(url.searchParams.getAll("condition_ids"),["one","two"])}finally{globalThis.fetch=original}});
test("migration contains snapshots, outcomes, and four backtest horizons",()=>{const sql=fs.readFileSync("db/schema.sql","utf8");for(const value of ["leaderboard_snapshots","closed_positions","signal_history","'5m','30m','4h','resolution'"])assert.match(sql,new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")))});
test("dashboard contract includes live activity, event history, and both performance grains",()=>{const route=fs.readFileSync("app/api/dashboard/route.ts","utf8");assert.match(route,/activity, history, performanceSummary, generatedAt/);assert.match(route,/signal_performance_summary/);assert.match(route,/signal_score >= 60/)});
