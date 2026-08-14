import test from "node:test";
import assert from "node:assert/strict";
import { dedupeFills, independentWalletCount } from "../lib/signals";
import type { PublicTrade } from "../lib/polymarket";

const trade=(wallet:string,tx:string,size=10):PublicTrade=>({proxyWallet:wallet,transactionHash:tx,size,price:.4,asset:"a",conditionId:"c",side:"BUY",timestamp:1,title:"m",slug:"m",outcome:"Yes",outcomeIndex:0});
test("duplicate split fills are aggregated by wallet, transaction and asset",()=>{const rows=dedupeFills([trade("0x1","tx",10),trade("0x1","tx",20)]);assert.equal(rows.length,1);assert.equal(rows[0].size,30)});
test("wallets sharing a transaction are conservatively linked",()=>assert.equal(independentWalletCount([trade("0x1","same"),trade("0x2","same"),trade("0x3","other")]),2));
