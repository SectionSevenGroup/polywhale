"use client";

import { useEffect, useMemo, useState } from "react";

type Signal = {
  id:string; title:string; outcome:string; signal_score:number; label:string; whale_count:number; total_notional:number;
  avg_entry:number; current_price:number|null; spread:number|null; depth_usd:number; edge_remaining:number; components:Record<string,number>;
  wallets:Array<{wallet:string;score:number;username?:string}>; last_seen_at:string;
};
type Whale = {wallet:string;username?:string;pnl:number;volume:number;whale_score:number;all_rank?:number;month_rank?:number;week_rank?:number;categories:string[]};
type Activity = {title:string;outcome:string;side:string;notional:number;price:number;traded_at:string;username?:string;wallet:string;whale_score:number};
type Dashboard = {signals:Signal[];whales:Whale[];stats:{tracked:string;strong:string;notional:string};activity:Activity[];generatedAt:string};

const money = (n:number, compact=false) => new Intl.NumberFormat("en-CA", {style:"currency",currency:"USD",maximumFractionDigits:compact?0:2,notation:compact?"compact":"standard"}).format(n);
const pct = (n:number|null) => n == null ? "—" : `${(n*100).toFixed(1)}¢`;
const age = (iso:string) => { const s=Math.max(0,Math.floor((Date.now()-new Date(iso).getTime())/1000)); return s<60?`${s}s`:s<3600?`${Math.floor(s/60)}m`:`${Math.floor(s/3600)}h`; };

const demo:Dashboard = {
  stats:{tracked:"100",strong:"3",notional:"428500"}, generatedAt:new Date().toISOString(),
  signals:[
    {id:"1",title:"Example: Will candidate X win the election?",outcome:"Yes",signal_score:88,label:"HIGH CONVICTION",whale_count:4,total_notional:184200,avg_entry:.347,current_price:.362,spread:.012,depth_usd:210000,edge_remaining:-.015,components:{quality:92,consensus:91,conviction:84,liquidity:88,edgeRemaining:82,freshness:96},wallets:[],last_seen_at:new Date().toISOString()},
    {id:"2",title:"Example: Will BTC exceed target by month-end?",outcome:"Yes",signal_score:76,label:"STRONG",whale_count:3,total_notional:91200,avg_entry:.521,current_price:.534,spread:.018,depth_usd:125000,edge_remaining:-.013,components:{quality:82,consensus:78,conviction:72,liquidity:81,edgeRemaining:82,freshness:89},wallets:[],last_seen_at:new Date(Date.now()-240000).toISOString()},
    {id:"3",title:"Example: Central-bank rate decision",outcome:"No change",signal_score:64,label:"WATCH",whale_count:2,total_notional:43000,avg_entry:.618,current_price:.657,spread:.032,depth_usd:72000,edge_remaining:-.039,components:{quality:75,consensus:65,conviction:64,liquidity:66,edgeRemaining:58,freshness:82},wallets:[],last_seen_at:new Date(Date.now()-480000).toISOString()}
  ],
  whales:[
    {wallet:"0x91a7…f24c",username:"SignalOne",pnl:1840000,volume:12400000,whale_score:94,all_rank:8,month_rank:4,week_rank:11,categories:["POLITICS","ECONOMICS"]},
    {wallet:"0x24bc…8d71",username:"MktMaven",pnl:920000,volume:7100000,whale_score:89,all_rank:16,month_rank:9,week_rank:6,categories:["CRYPTO","FINANCE"]},
    {wallet:"0x5ad2…1a0e",username:"EventEdge",pnl:610000,volume:4300000,whale_score:84,all_rank:31,month_rank:12,week_rank:17,categories:["POLITICS"]}
  ], activity:[]
};

function Score({n}:{n:number}) { return <span className={`score ${n>=85?"hot":n>=72?"strong":n>=60?"watch":"pass"}`}>{n}</span>; }

export default function Page() {
  const [data,setData]=useState<Dashboard>(demo);
  const [live,setLive]=useState(false);
  const [filter,setFilter]=useState("ALL");
  useEffect(()=>{
    let dead=false;
    const load=async()=>{try{const r=await fetch("/api/dashboard",{cache:"no-store"});if(r.ok){const d=await r.json();if(!d.error&&!dead){setData(d);setLive(true);}}}catch{}};
    load(); const id=setInterval(load,15000); return()=>{dead=true;clearInterval(id)};
  },[]);
  const signals=useMemo(()=>filter==="ALL"?data.signals:data.signals.filter(s=>s.label===filter),[data,filter]);
  const top=signals[0];

  return <main>
    <header className="topbar">
      <div><div className="eyebrow">POLY WHALE</div><h1>SIGNAL CONTROL ROOM</h1></div>
      <div className="status"><span className={live?"dot live":"dot"}/>{live?"LIVE DATA":"DEMO / DB OFFLINE"}<span className="time">{new Date(data.generatedAt).toLocaleTimeString()}</span></div>
    </header>

    <section className="kpis">
      <article><span>TRACKED WHALES</span><strong>{data.stats.tracked}</strong><small>ranked by quality, not fame</small></article>
      <article><span>STRONG SIGNALS</span><strong>{data.stats.strong}</strong><small>score 72+ / last 30 min</small></article>
      <article><span>WHALE FLOW</span><strong>{money(Number(data.stats.notional),true)}</strong><small>signal-linked / last 30 min</small></article>
      <article className="accent"><span>BEST LIVE SETUP</span><strong>{top?top.signal_score:"—"}</strong><small>{top?top.label:"No qualifying signal"}</small></article>
    </section>

    <section className="controlrow">
      <div><b>OPPORTUNITY BOARD</b><span>Fresh whale accumulation ranked by quality, consensus, liquidity and remaining edge.</span></div>
      <nav>{["ALL","HIGH CONVICTION","STRONG","WATCH"].map(x=><button key={x} className={filter===x?"active":""} onClick={()=>setFilter(x)}>{x}</button>)}</nav>
    </section>

    <section className="signalgrid">
      {signals.map((s,i)=><article className={`signal ${i===0?"primary":""}`} key={s.id}>
        <div className="signalhead"><Score n={s.signal_score}/><div className="label">{s.label}</div><div className="ago">{age(s.last_seen_at)} ago</div></div>
        <h2>{s.title}</h2>
        <div className="outcome"><span>WHALES BUYING</span><strong>{s.outcome}</strong></div>
        <div className="signalstats">
          <div><span>WHALES</span><b>{s.whale_count}</b></div><div><span>FLOW</span><b>{money(Number(s.total_notional),true)}</b></div>
          <div><span>AVG ENTRY</span><b>{pct(Number(s.avg_entry))}</b></div><div><span>NOW</span><b>{pct(s.current_price==null?null:Number(s.current_price))}</b></div>
        </div>
        <div className="meterrow">{Object.entries(s.components??{}).map(([k,v])=><div key={k}><span>{k.replace(/([A-Z])/g," $1")}</span><i><em style={{width:`${v}%`}}/></i><b>{v}</b></div>)}</div>
        <footer><span>{s.spread==null?"Spread —":`Spread ${(Number(s.spread)*100).toFixed(1)}¢`}</span><span>Depth {money(Number(s.depth_usd),true)}</span><span>{s.current_price!=null&&s.current_price>s.avg_entry?`Moved +${((s.current_price-s.avg_entry)*100).toFixed(1)}¢ since entry`:`Entry still intact`}</span></footer>
      </article>)}
    </section>

    <section className="twocol">
      <article className="panel"><div className="paneltitle"><b>WHALE BOARD</b><span>Top monitored wallets</span></div>
        <table><thead><tr><th>#</th><th>TRADER</th><th>SCORE</th><th>P&L</th><th>VOLUME</th><th>FOCUS</th></tr></thead><tbody>
          {data.whales.map((w,i)=><tr key={w.wallet}><td>{String(i+1).padStart(2,"0")}</td><td><b>{w.username||w.wallet.slice(0,8)}</b><small>{w.wallet}</small></td><td><Score n={w.whale_score}/></td><td>{money(Number(w.pnl),true)}</td><td>{money(Number(w.volume),true)}</td><td>{(w.categories||[]).slice(0,2).join(" · ")||"OVERALL"}</td></tr>)}
        </tbody></table>
      </article>
      <article className="panel thesis"><div className="paneltitle"><b>GO / NO-GO</b><span>Hard filters before a signal deserves attention</span></div>
        {[['Whale quality','≥ 72','PASS'],['Multiple independent wallets','≥ 2','PASS'],['Remaining price edge','≤ +5¢ move','PASS'],['Order-book spread','≤ 4¢','PASS'],['Recent signal','≤ 15 min','PASS'],['Thin / stale market','avoid','BLOCK']].map(x=><div className="criterion" key={x[0]}><span>{x[0]}</span><b>{x[1]}</b><em className={x[2]==='PASS'?'ok':'block'}>{x[2]}</em></div>)}
        <p>Signal score is a prioritisation heuristic, not an estimate of true outcome probability. Do not let one profitable wallet dominate the board.</p>
      </article>
    </section>

    <section className="disclaimer">READ-ONLY INTELLIGENCE SYSTEM · NO ORDER EXECUTION · NO GEO-CIRCUMVENTION · SIGNALS REQUIRE INDEPENDENT JUDGMENT</section>
  </main>
}
