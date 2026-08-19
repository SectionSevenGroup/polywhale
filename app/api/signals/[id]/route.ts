import { fetchPriceHistory } from "@/lib/polymarket";
import { supabaseRest } from "@/lib/supabase-rest";

export const dynamic = "force-dynamic";
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}) {
  try {
    const {id}=await params;
    const signals=await supabaseRest<any[]>(`signals?select=id,asset_id,condition_id,outcome,avg_entry,current_price,first_seen_at,last_seen_at&id=eq.${encodeURIComponent(id)}&limit=1`);
    if(!signals.length)return Response.json({error:"Signal not found"},{status:404});
    const signal=signals[0];
    const [trades,events,whales]=await Promise.all([
      supabaseRest<any[]>(`trades?select=id,wallet,price,notional,traded_at,side&condition_id=eq.${encodeURIComponent(signal.condition_id)}&asset_id=eq.${encodeURIComponent(signal.asset_id)}&order=traded_at.asc`),
      supabaseRest<any[]>(`signal_events?select=id,detected_at,trigger_reason,label,total_notional,avg_whale_entry&signal_id=eq.${encodeURIComponent(id)}&order=detected_at.asc`),
      supabaseRest<any[]>("whales?select=wallet,username&tracked=eq.true&limit=1000"),
    ]);
    const usernames=new Map(whales.map(w=>[String(w.wallet).toLowerCase(),w.username]));
    const tradesWithIdentity=trades.map(t=>({...t,username:usernames.get(String(t.wallet).toLowerCase())??null}));
    try {
      const history=await fetchPriceHistory(signal.asset_id,"max",5);
      return Response.json({signal,trades:tradesWithIdentity,events,priceHistory:{available:history.length>0,points:history,reason:history.length?null:"No historical prices returned"}});
    } catch {
      return Response.json({signal,trades:tradesWithIdentity,events,priceHistory:{available:false,points:[],reason:"Historical price data is currently unavailable"}});
    }
  } catch(error){return Response.json({error:error instanceof Error?error.message:"Signal detail query failed"},{status:500})}
}
