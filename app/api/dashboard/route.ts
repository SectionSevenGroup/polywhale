export const dynamic = "force-dynamic";

const SUPABASE_URL = "https://ulkwmutjjiwqzjvmfhkr.supabase.co";
const SUPABASE_KEY = "sb_publishable_QovEF6QJuUUpe4tsTrQncA_3s1uQdkk";

async function rest<T>(path: string): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    cache: "no-store",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Accept: "application/json",
    },
  });
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${await response.text()}`);
  return response.json();
}

export async function GET() {
  try {
    const now = Date.now();
    const since90 = encodeURIComponent(new Date(now - 90 * 60_000).toISOString());
    const since30Ms = now - 30 * 60_000;

    const [signals, whalesAll, trades, historyRaw] = await Promise.all([
      rest<any[]>(`signals?select=id,title,slug,event_slug,outcome,signal_score,label,whale_count,total_notional,avg_entry,current_price,spread,depth_usd,edge_remaining,components,wallets,last_seen_at,updated_at&updated_at=gte.${since90}&signal_score=gte.60&order=signal_score.desc,total_notional.desc&limit=20`),
      rest<any[]>(`whales?select=wallet,username,pnl,volume,whale_score,all_rank,month_rank,week_rank,categories,copyability_score,hit_rate,closed_positions,tracked&tracked=eq.true&order=whale_score.desc&limit=100`),
      rest<any[]>(`trades?select=title,outcome,side,notional,price,traded_at,wallet&order=traded_at.desc&limit=30`),
      rest<any[]>(`signal_history?select=signal_id,horizon,observed_price,price_change,evaluated_at,signals(title,outcome,signal_score)&evaluated_at=not.is.null&order=evaluated_at.desc&limit=30`),
    ]);

    const whaleByWallet = new Map(whalesAll.map(w => [String(w.wallet).toLowerCase(), w]));
    const activity = trades.map(t => {
      const whale = whaleByWallet.get(String(t.wallet).toLowerCase());
      return { ...t, username: whale?.username, whale_score: whale?.whale_score ?? 0 };
    });

    const history = historyRaw.map(h => ({
      signal_id: h.signal_id,
      horizon: h.horizon,
      observed_price: h.observed_price,
      price_change: h.price_change,
      evaluated_at: h.evaluated_at,
      title: h.signals?.title ?? "Unknown market",
      outcome: h.signals?.outcome ?? "—",
      signal_score: h.signals?.signal_score ?? 0,
    }));

    const recent30 = signals.filter(s => new Date(s.updated_at).getTime() >= since30Ms);
    const stats = {
      tracked: String(whalesAll.length),
      strong: String(recent30.filter(s => Number(s.signal_score) >= 72).length),
      notional: String(recent30.reduce((sum, s) => sum + Number(s.total_notional || 0), 0)),
    };

    return Response.json({
      signals,
      whales: whalesAll.slice(0, 20),
      stats,
      activity,
      history,
      generatedAt: new Date().toISOString(),
      stale: false,
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Dashboard query failed" }, { status: 500 });
  }
}
