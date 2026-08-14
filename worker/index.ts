import crypto from "node:crypto";
import { query, db } from "../lib/db";
import {
  bookMetrics,
  fetchBook,
  fetchLeaderboard,
  fetchClosedPositions,
  fetchMidpoint,
  fetchTrades,
  type Category,
  type Period,
  type PublicTrade,
} from "../lib/polymarket";
import { scoreSignal, scoreWhale } from "../lib/scoring";
import { dedupeFills } from "../lib/signals";
import { evaluationEdges, materialSignalReason, thesisKey, type FrozenSignalState } from "../lib/signal-events";

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const POLL_SECONDS = Number(process.env.POLL_SECONDS ?? 20);
const LEADERBOARD_REFRESH_MINUTES = Number(process.env.LEADERBOARD_REFRESH_MINUTES ?? 15);
const MAX_TRACKED = Number(process.env.MAX_TRACKED_WHALES ?? 100);
const MIN_WHALE_SCORE = Number(process.env.MIN_WHALE_SCORE ?? 58);
const SIGNAL_WINDOW_MINUTES = Number(process.env.SIGNAL_WINDOW_MINUTES ?? 10);

const CATEGORIES: Category[] = ["OVERALL", "POLITICS", "CRYPTO", "ECONOMICS", "FINANCE", "TECH", "CULTURE", "SPORTS"];
const PERIODS: Period[] = ["WEEK", "MONTH", "ALL"];

interface Aggregate {
  wallet: string;
  username?: string;
  pnl: number;
  volume: number;
  allRank?: number;
  monthRank?: number;
  weekRank?: number;
  categories: Set<string>;
}

async function refreshWhales() {
  const map = new Map<string, Aggregate>();
  for (const category of CATEGORIES) {
    for (const period of PERIODS) {
      const rows = await fetchLeaderboard(category, period, "PNL", 50);
      for (const row of rows) {
        const wallet = row.proxyWallet.toLowerCase();
        const agg = map.get(wallet) ?? {
          wallet, username: row.userName, pnl: 0, volume: 0, categories: new Set<string>()
        };
        // Use ALL period as the primary monetary scale when available; otherwise retain the max observed.
        if (period === "ALL" || row.pnl > agg.pnl) agg.pnl = row.pnl;
        if (period === "ALL" || row.vol > agg.volume) agg.volume = row.vol;
        if (period === "ALL") agg.allRank = Math.min(agg.allRank ?? 999999, Number(row.rank));
        if (period === "MONTH") agg.monthRank = Math.min(agg.monthRank ?? 999999, Number(row.rank));
        if (period === "WEEK") agg.weekRank = Math.min(agg.weekRank ?? 999999, Number(row.rank));
        if (category !== "OVERALL") agg.categories.add(category);
        map.set(wallet, agg);
        await query(`INSERT INTO leaderboard_snapshots(wallet,category,period,rank,pnl,volume,captured_at)
          VALUES($1,$2,$3,$4,$5,$6,date_trunc('minute',NOW())) ON CONFLICT DO NOTHING`,
          [wallet, category, period, Number(row.rank), Number(row.pnl) || 0, Number(row.vol) || 0]);
      }
      await sleep(80);
    }
  }

  const ranked = [...map.values()].map(w => ({
    ...w,
    whaleScore: scoreWhale({
      pnl: w.pnl,
      volume: w.volume,
      allRank: w.allRank,
      monthRank: w.monthRank,
      weekRank: w.weekRank,
      categoryAppearances: w.categories.size,
    })
  })).sort((a, b) => b.whaleScore - a.whaleScore).slice(0, MAX_TRACKED);

  await query("UPDATE whales SET tracked = FALSE");
  for (const w of ranked) {
    await query(
      `INSERT INTO whales(wallet, username, pnl, volume, whale_score, all_rank, month_rank, week_rank, categories, tracked, updated_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,TRUE,NOW())
       ON CONFLICT(wallet) DO UPDATE SET username=EXCLUDED.username,pnl=EXCLUDED.pnl,volume=EXCLUDED.volume,
       whale_score=EXCLUDED.whale_score,all_rank=EXCLUDED.all_rank,month_rank=EXCLUDED.month_rank,
       week_rank=EXCLUDED.week_rank,categories=EXCLUDED.categories,tracked=TRUE,updated_at=NOW()`,
      [w.wallet, w.username ?? null, w.pnl, w.volume, w.whaleScore, w.allRank ?? null, w.monthRank ?? null,
        w.weekRank ?? null, JSON.stringify([...w.categories])]
    );
  }
  console.log(`[whales] refreshed ${ranked.length}`);
}

async function ingestOutcomes() {
  const whales = await query<{wallet:string}>(`SELECT wallet FROM whales WHERE tracked=TRUE ORDER BY whale_score DESC LIMIT 100`);
  for (const { wallet } of whales) {
    try {
      const positions = await fetchClosedPositions(wallet, 50);
      for (const p of positions) await query(`INSERT INTO closed_positions(wallet,condition_id,asset_id,title,outcome,avg_price,total_bought,realized_pnl,end_date)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(wallet,condition_id,asset_id) DO UPDATE SET
        realized_pnl=EXCLUDED.realized_pnl,total_bought=EXCLUDED.total_bought,end_date=EXCLUDED.end_date,ingested_at=NOW()`,
        [wallet,p.conditionId,p.asset,p.title,p.outcome,p.avgPrice,p.totalBought,p.realizedPnl,p.endDate ?? null]);
      await query(`UPDATE whales w SET closed_positions=s.n,hit_rate=s.hit,copyability_score=s.copy FROM
        (SELECT wallet,count(*)::int n,avg((realized_pnl>0)::int) hit,
         round(least(100,greatest(0,50+avg(realized_pnl/nullif(total_bought,0))*200)))::int copy
         FROM closed_positions WHERE wallet=$1 GROUP BY wallet) s WHERE w.wallet=s.wallet`, [wallet]);
    } catch (error) { console.error(`[positions] ${wallet}`, error); }
    await sleep(50);
  }
}

function tradeId(t: PublicTrade) {
  return crypto.createHash("sha256").update([
    t.proxyWallet.toLowerCase(), t.transactionHash, t.asset, t.side, t.timestamp, t.size, t.price
  ].join("|")).digest("hex");
}

async function ingestTrades() {
  const whales = await query<{wallet:string; whale_score:number}>(
    `SELECT wallet, whale_score FROM whales WHERE tracked=TRUE AND whale_score >= $1 ORDER BY whale_score DESC`,
    [MIN_WHALE_SCORE]
  );
  const start = Math.floor(Date.now() / 1000) - Math.max(300, POLL_SECONDS * 4);

  for (const whale of whales) {
    try {
      const trades = dedupeFills(await fetchTrades(whale.wallet, start, 100));
      for (const t of trades) {
        await query(
          `INSERT INTO trades(id,wallet,transaction_hash,condition_id,asset_id,title,slug,event_slug,outcome,side,size,price,notional,traded_at)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,to_timestamp($14))
           ON CONFLICT(id) DO NOTHING`,
          [tradeId(t), whale.wallet, t.transactionHash, t.conditionId, t.asset, t.title, t.slug, t.eventSlug ?? null,
            t.outcome, t.side, t.size, t.price, t.size * t.price, t.timestamp]
        );
        await query(`INSERT INTO wallet_links(wallet_a,wallet_b,reason)
          SELECT least($1,wallet),greatest($1,wallet),'shared_transaction' FROM trades
          WHERE transaction_hash=$2 AND wallet<>$1 ON CONFLICT(wallet_a,wallet_b,reason) DO UPDATE SET evidence_count=wallet_links.evidence_count+1,updated_at=NOW()`,
          [whale.wallet,t.transactionHash]);
      }
    } catch (err) {
      console.error(`[trades] ${whale.wallet}`, err);
    }
    await sleep(60);
  }
}

async function rebuildSignals() {
  const groups = await query<{
    condition_id:string; asset_id:string; title:string; slug:string; event_slug:string|null; outcome:string;
    whale_count:string; total_notional:string; avg_entry:string; first_seen:string; last_seen:string;
    weighted_quality:string; wallets: unknown; independent_count:string;
  }>(
    `SELECT t.condition_id, t.asset_id, max(t.title) title, max(t.slug) slug, max(t.event_slug) event_slug, t.outcome,
       count(DISTINCT t.wallet)::text whale_count,
       sum(t.notional)::text total_notional,
       (sum(t.price*t.notional)/nullif(sum(t.notional),0))::text avg_entry,
       min(t.traded_at)::text first_seen, max(t.traded_at)::text last_seen,
       (sum(w.whale_score*t.notional)/nullif(sum(t.notional),0))::text weighted_quality,
       greatest(1,count(DISTINCT t.wallet)-coalesce((SELECT count(*) FROM wallet_links l WHERE
         l.wallet_a IN (SELECT tx.wallet FROM trades tx WHERE tx.condition_id=t.condition_id AND tx.asset_id=t.asset_id AND tx.traded_at>=NOW()-($1::text||' minutes')::interval)
         AND l.wallet_b IN (SELECT tx.wallet FROM trades tx WHERE tx.condition_id=t.condition_id AND tx.asset_id=t.asset_id AND tx.traded_at>=NOW()-($1::text||' minutes')::interval)),0))::text independent_count,
       jsonb_agg(DISTINCT jsonb_build_object('wallet',t.wallet,'score',w.whale_score,'username',w.username)) wallets
     FROM trades t JOIN whales w ON w.wallet=t.wallet
     WHERE t.side='BUY' AND t.traded_at >= NOW() - ($1::text || ' minutes')::interval AND w.tracked=TRUE
     GROUP BY t.condition_id,t.asset_id,t.outcome
     HAVING sum(t.notional) >= 1000
     ORDER BY sum(t.notional) DESC LIMIT 100`,
    [SIGNAL_WINDOW_MINUTES]
  );

  for (const g of groups) {
    let metrics = { midpoint: null as number|null, bestBid: null as number|null, bestAsk: null as number|null, spread: null as number|null, depthUsd: 0 };
    try { metrics = { ...metrics, ...bookMetrics(await fetchBook(g.asset_id)) }; } catch {}
    const avgEntry = Number(g.avg_entry);
    const current = metrics.midpoint;
    const ageSeconds = Math.max(0, (Date.now() - new Date(g.last_seen).getTime()) / 1000);
    const result = scoreSignal({
      weightedWhaleQuality: Number(g.weighted_quality),
      whaleCount: Number(g.whale_count),
      independentWhaleCount: Number(g.independent_count),
      totalNotional: Number(g.total_notional),
      avgEntry,
      currentPrice: current,
      spread: metrics.spread,
      depthUsd: metrics.depthUsd,
      ageSeconds,
      sameDirectionRatio: 1,
    });
    const edgeRemaining = current == null ? 0 : avgEntry - current;
    const id = crypto.createHash("sha256").update(`${g.condition_id}|${g.asset_id}|${g.outcome}`).digest("hex");
    await query(
      `INSERT INTO signals(id,condition_id,asset_id,title,slug,event_slug,outcome,signal_score,label,whale_count,total_notional,
       avg_entry,current_price,spread,depth_usd,edge_remaining,components,wallets,first_seen_at,last_seen_at,updated_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb,$18::jsonb,$19,$20,NOW())
       ON CONFLICT(id) DO UPDATE SET signal_score=EXCLUDED.signal_score,label=EXCLUDED.label,whale_count=EXCLUDED.whale_count,
       total_notional=EXCLUDED.total_notional,avg_entry=EXCLUDED.avg_entry,current_price=EXCLUDED.current_price,
       spread=EXCLUDED.spread,depth_usd=EXCLUDED.depth_usd,edge_remaining=EXCLUDED.edge_remaining,
       components=EXCLUDED.components,wallets=EXCLUDED.wallets,last_seen_at=EXCLUDED.last_seen_at,updated_at=NOW()`,
      [id,g.condition_id,g.asset_id,g.title,g.slug,g.event_slug,g.outcome,result.score,result.label,Number(g.whale_count),
       Number(g.total_notional),avgEntry,current,metrics.spread,metrics.depthUsd,edgeRemaining,JSON.stringify(result.components),
       JSON.stringify(g.wallets),new Date(g.first_seen),new Date(g.last_seen)]
    );
    const previous = (await query<{
      signal_score:number;label:"HIGH CONVICTION"|"STRONG"|"WATCH"|"PASS";independent_whale_count:number;
      total_notional:number;market_midpoint:number|null;
    }>(`SELECT signal_score,label,independent_whale_count,total_notional,market_midpoint FROM signal_events
       WHERE signal_id=$1 ORDER BY detected_at DESC LIMIT 1`, [id]))[0];
    const next: FrozenSignalState = {
      signalScore: result.score, label: result.label, independentWhaleCount: Number(g.independent_count),
      totalNotional: Number(g.total_notional), marketMidpoint: current,
    };
    const reason = materialSignalReason(previous ? {
      signalScore: previous.signal_score, label: previous.label, independentWhaleCount: previous.independent_whale_count,
      totalNotional: previous.total_notional, marketMidpoint: previous.market_midpoint,
    } : null, next);
    if (result.score >= 60 && reason) {
      const eventId = crypto.randomUUID();
      const detectedAt = new Date();
      await query(`INSERT INTO signal_events(id,signal_id,condition_id,asset_id,outcome,detected_at,signal_score,label,
        weighted_whale_quality,independent_whale_count,wallets,total_notional,avg_whale_entry,market_midpoint,best_bid,best_ask,
        spread,depth_usd,edge_remaining,freshness_score,components,thesis_key,event_version,trigger_reason,calibration_eligible)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21::jsonb,$22,'whale_information_v2',$23,TRUE)`,
        [eventId,id,g.condition_id,g.asset_id,g.outcome,detectedAt,result.score,result.label,Number(g.weighted_quality),
          Number(g.independent_count),JSON.stringify(g.wallets),Number(g.total_notional),avgEntry,current,metrics.bestBid,metrics.bestAsk,
          metrics.spread,metrics.depthUsd,edgeRemaining,result.components.freshness,JSON.stringify(result.components),
          thesisKey(g.condition_id,g.asset_id,g.outcome),reason]);
      for (const [horizon, seconds] of [["5m",300],["30m",1800],["4h",14400]] as const) {
        await query(`INSERT INTO signal_event_evaluations(event_id,horizon,due_at) VALUES($1,$2,$3::timestamptz + ($4 * interval '1 second'))`,
          [eventId,horizon,detectedAt,seconds]);
      }
      await query(`INSERT INTO signal_event_evaluations(event_id,horizon,due_at) VALUES($1,'resolution','infinity'::timestamptz)`, [eventId]);
    }
  }
}

async function evaluateSignals() {
  const due = await query<{event_id:string;horizon:string;asset_id:string;avg_whale_entry:number;market_midpoint:number|null}>(`SELECT e.event_id,e.horizon,s.asset_id,s.avg_whale_entry,s.market_midpoint
    FROM signal_event_evaluations e JOIN signal_events s ON s.id=e.event_id
    WHERE e.evaluated_at IS NULL AND e.due_at<=NOW() ORDER BY e.due_at LIMIT 50`);
  for (const item of due) {
    const price = await fetchMidpoint(item.asset_id);
    if (price != null) {
      const edges = evaluationEdges(price, item.market_midpoint, item.avg_whale_entry);
      await query(`UPDATE signal_event_evaluations SET evaluated_at=NOW(),observed_price=$3,
        price_move_since_alert=$4,whale_entry_edge=$5 WHERE event_id=$1 AND horizon=$2`,
        [item.event_id,item.horizon,price,edges.priceMoveSinceAlert,edges.whaleEntryEdge]);
    }
  }
}

async function main() {
  console.log("POLY WHALE worker starting");
  let lastLeaderboardRefresh = 0;
  for (;;) {
    const now = Date.now();
    try {
      if (now - lastLeaderboardRefresh > LEADERBOARD_REFRESH_MINUTES * 60_000) {
        await refreshWhales();
        await ingestOutcomes();
        lastLeaderboardRefresh = now;
      }
      await ingestTrades();
      await rebuildSignals();
      await evaluateSignals();
    } catch (err) {
      console.error("[worker] cycle failed", err);
    }
    await sleep(POLL_SECONDS * 1000);
  }
}

main().catch(async err => {
  console.error(err);
  await db().end();
  process.exit(1);
});
