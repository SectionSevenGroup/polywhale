import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [signals, whales, stats, activity] = await Promise.all([
      query(`SELECT id,title,slug,event_slug,outcome,signal_score,label,whale_count,total_notional,avg_entry,current_price,
        spread,depth_usd,edge_remaining,components,wallets,last_seen_at
        FROM signals WHERE updated_at > NOW() - INTERVAL '90 minutes' AND signal_score >= 60
        ORDER BY signal_score DESC,total_notional DESC LIMIT 20`),
      query(`SELECT wallet,username,pnl,volume,whale_score,all_rank,month_rank,week_rank,categories
        ,copyability_score,hit_rate,closed_positions
        FROM whales WHERE tracked=TRUE ORDER BY whale_score DESC LIMIT 20`),
      query<{tracked:string; strong:string; notional:string}>(`SELECT
        (SELECT count(*) FROM whales WHERE tracked=TRUE)::text tracked,
        (SELECT count(*) FROM signals WHERE signal_score>=72 AND updated_at>NOW()-INTERVAL '30 minutes')::text strong,
        (SELECT coalesce(sum(total_notional),0) FROM signals WHERE updated_at>NOW()-INTERVAL '30 minutes')::text notional`),
      query(`SELECT t.title,t.outcome,t.side,t.notional,t.price,t.traded_at,w.username,w.wallet,w.whale_score
        FROM trades t JOIN whales w ON w.wallet=t.wallet ORDER BY t.traded_at DESC LIMIT 30`),
    ]);
    const history = await query(`SELECT h.signal_id,h.horizon,h.observed_price,h.price_change,h.evaluated_at,s.title,s.outcome,s.signal_score
      FROM signal_history h JOIN signals s ON s.id=h.signal_id WHERE h.evaluated_at IS NOT NULL ORDER BY h.evaluated_at DESC LIMIT 30`);
    return Response.json({ signals, whales, stats: stats[0], activity, history, generatedAt: new Date().toISOString(), stale: false });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Dashboard query failed" }, { status: 500 });
  }
}
