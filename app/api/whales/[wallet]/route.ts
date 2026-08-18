import { fetchClosedPositions, fetchPositions } from "@/lib/polymarket";
import { supabaseRest } from "@/lib/supabase-rest";

export const dynamic="force-dynamic";
export async function GET(_:Request,{params}:{params:Promise<{wallet:string}>}){
  try{
    const {wallet}=await params;
    const whales=await supabaseRest<any[]>(`whales?select=*&wallet=eq.${encodeURIComponent(wallet)}&limit=1`);
    if(!whales.length)return Response.json({error:"Tracked whale not found"},{status:404});
    const whale=whales[0];
    const [trades,closed,snapshots,publicData]=await Promise.all([
      supabaseRest<any[]>(`trades?select=id,title,outcome,side,size,price,notional,traded_at&wallet=eq.${encodeURIComponent(wallet)}&order=traded_at.desc&limit=50`),
      supabaseRest<any[]>(`closed_positions?select=condition_id,asset_id,title,outcome,avg_price,total_bought,realized_pnl,end_date&wallet=eq.${encodeURIComponent(wallet)}&order=end_date.desc.nullslast&limit=30`),
      supabaseRest<any[]>(`leaderboard_snapshots?select=category,period,rank,pnl,volume,captured_at&wallet=eq.${encodeURIComponent(wallet)}&order=captured_at.asc&limit=200`),
      Promise.allSettled([fetchPositions(wallet,100),fetchClosedPositions(wallet,30)]),
    ]);
    const positions=publicData[0].status==="fulfilled"?publicData[0].value:[];
    const publicClosed=publicData[1].status==="fulfilled"?publicData[1].value:[];
    const notionals=trades.map(t=>Number(t.notional)).filter(Number.isFinite);
    return Response.json({whale,trades,closedPositions:closed.length?closed:publicClosed,currentPositions:positions,snapshots,metrics:{typicalPositionNotional:notionals.length?notionals.sort((a,b)=>a-b)[Math.floor(notionals.length/2)]:null,tradeSampleSize:notionals.length,closedSampleSize:closed.length||publicClosed.length},publicDataAvailable:{positions:publicData[0].status==="fulfilled",closedPositions:publicData[1].status==="fulfilled"}});
  }catch(error){return Response.json({error:error instanceof Error?error.message:"Whale detail query failed"},{status:500})}
}
