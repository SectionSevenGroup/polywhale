export const dynamic = "force-dynamic";
import { getEdgeStatus } from "@/lib/edge-status";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

async function rest<T>(path: string): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase dashboard connection is not configured");
  }
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    cache: "no-store",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase dashboard query failed (${response.status}): ${body.slice(0, 240)}`);
  }
  return response.json() as Promise<T>;
}

export async function GET() {
  // Dashboard contract: activity, history, performanceSummary, generatedAt; signal_score >= 60.
  try {
    const now = Date.now();
    const since90 = new Date(now - 90 * 60_000).toISOString();
    const since30 = new Date(now - 30 * 60_000).toISOString();

    const signals = await rest<any[]>(
      `signals?select=id,title,slug,event_slug,outcome,signal_score,label,whale_count,total_notional,avg_entry,current_price,spread,depth_usd,edge_remaining,components,wallets,last_seen_at,updated_at&signal_score=gte.60&updated_at=gte.${encodeURIComponent(since90)}&order=signal_score.desc,total_notional.desc&limit=20`
    );
    const signalIds = signals.map(s => `"${String(s.id).replaceAll('"', '\\"')}"`).join(",");
    const [whales, activity, performanceSummary, signalEvents, evaluations] = await Promise.all([
      rest<any[]>(
        "whales?select=wallet,username,pnl,volume,whale_score,copyability_score,hit_rate,closed_positions,all_rank,month_rank,week_rank,categories,tracked&tracked=eq.true&order=whale_score.desc&limit=500"
      ),
      rest<any[]>(
        "trades?select=title,outcome,side,notional,price,traded_at,wallet&order=traded_at.desc&limit=30"
      ),
      rest<any[]>(
        "signal_performance_summary?select=grain,horizon,observations,avg_price_move_since_alert,avg_whale_entry_edge&order=horizon.asc,grain.asc"
      ),
      signals.length ? rest<any[]>(
        `signal_events?select=id,signal_id,independent_whale_count,detected_at&signal_id=in.(${encodeURIComponent(signalIds)})&event_version=eq.whale_information_v2&calibration_eligible=eq.true&order=detected_at.desc`
      ) : Promise.resolve([]),
      rest<any[]>(
        "signal_event_evaluations?select=horizon,observed_price,price_move_since_alert,whale_entry_edge,evaluated_at,signal_events!inner(signal_id,outcome,signal_score,event_version,thesis_key,calibration_eligible,signals!inner(title))&evaluated_at=not.is.null&signal_events.calibration_eligible=eq.true&signal_events.event_version=eq.whale_information_v2&order=evaluated_at.desc&limit=50"
      ),
    ]);

    const whaleByWallet = new Map(whales.map(w => [String(w.wallet).toLowerCase(), w]));
    const activityWithWhales = activity.map(t => {
      const whale = whaleByWallet.get(String(t.wallet).toLowerCase());
      return {
        ...t,
        username: whale?.username ?? null,
        whale_score: whale?.whale_score ?? 0,
      };
    });

    const strong = signals.filter(
      s => Number(s.signal_score) >= 72 && new Date(s.updated_at).getTime() >= new Date(since30).getTime()
    ).length;
    const notional = signals
      .filter(s => new Date(s.updated_at).getTime() >= new Date(since30).getTime())
      .reduce((sum, s) => sum + Number(s.total_notional || 0), 0);
    const latestIndependentCount = new Map<string, number>();
    for (const event of signalEvents) {
      if (!latestIndependentCount.has(String(event.signal_id))) {
        latestIndependentCount.set(String(event.signal_id), Number(event.independent_whale_count));
      }
    }
    const history = evaluations.map(e => ({
      signal_id: e.signal_events.signal_id,
      title: e.signal_events.signals.title,
      outcome: e.signal_events.outcome,
      signal_score: e.signal_events.signal_score,
      horizon: e.horizon,
      observed_price: e.observed_price,
      price_change: e.price_move_since_alert,
      whale_entry_edge: e.whale_entry_edge,
      evaluated_at: e.evaluated_at,
      measurement_version: e.signal_events.event_version,
      event_version: e.signal_events.event_version,
      thesis_key: e.signal_events.thesis_key,
    }));

    return Response.json({
      signals: signals.map(s => {
        const independentWhaleCount = latestIndependentCount.get(String(s.id)) ?? null;
        return {...s, independent_whale_count: independentWhaleCount, edge_status: getEdgeStatus({
          avg_entry: Number(s.avg_entry), current_price: s.current_price == null ? null : Number(s.current_price),
          spread: s.spread == null ? null : Number(s.spread), depth_usd: s.depth_usd == null ? null : Number(s.depth_usd),
          independent_whale_count: independentWhaleCount, last_seen_at: s.last_seen_at,
        }, now)};
      }),
      whales: whales.slice(0, 20),
      stats: {
        tracked: String(whales.length),
        strong: String(strong),
        notional: String(notional),
      },
      activity: activityWithWhales,
      history,
      performanceSummary,
      generatedAt: new Date().toISOString(),
      stale: false,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Dashboard query failed" },
      { status: 500 }
    );
  }
}
