"use client";

import { useEffect, useMemo, useState } from "react";

type Signal = {
  id:string; title:string; outcome:string; signal_score:number; label:string; whale_count:number; total_notional:number;
  avg_entry:number; current_price:number|null; spread:number|null; depth_usd:number; edge_remaining:number; components:Record<string,number>;
  wallets:Array<{wallet:string;score:number;username?:string}>; last_seen_at:string;
};
type Whale = {wallet:string;username?:string;pnl:number;volume:number;whale_score:number;copyability_score:number;hit_rate:number|null;closed_positions:number;all_rank?:number;month_rank?:number;week_rank?:number;categories:string[]};
type Activity = {title:string;outcome:string;side:string;notional:number;price:number;traded_at:string;username?:string;wallet:string;whale_score:number};
type History = {signal_id:string;title:string;outcome:string;signal_score:number;horizon:string;observed_price:number;price_change:number;evaluated_at:string};
type Dashboard = {signals:Signal[];whales:Whale[];stats:{tracked:string;strong:string;notional:string};activity:Activity[];history:History[];generatedAt:string};

const money = (n:number, compact=false) => new Intl.NumberFormat("en-CA", {style:"currency",currency:"USD",maximumFractionDigits:compact?0:2,notation:compact?"compact":"standard"}).format(n);
const pct = (n:number|null) => n == null ? "—" : `${(n*100).toFixed(1)}¢`;
const age = (iso:string) => { const s=Math.max(0,Math.floor((Date.now()-new Date(iso).getTime())/1000)); return s<60?`${s}s`:s<3600?`${Math.floor(s/60)}m`:`${Math.floor(s/3600)}h`; };

const empty:Dashboard = { stats:{tracked:"0",strong:"0",notional:"0"}, generatedAt:new Date().toISOString(), signals:[], whales:[], activity:[], history:[] };

function Score({n}:{n:number}) { return <span className={`score ${n>=85?"hot":n>=72?"strong":n>=60?"watch":"pass"}`}>{n}</span>; }

export default function Page() {
  const [data,setData]=useState<Dashboard>(empty);
  const [live,setLive]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [filter,setFilter]=useState("ALL");
  useEffect(()=>{
    let dead=false;
    const load=async()=>{try{const r=await fetch("/api/dashboard",{cache:"no-store"});const d=await r.json();if(!r.ok)throw new Error(d.error||"Dashboard unavailable");if(!dead){setData(d);setLive(true);setError("");}}catch(e){if(!dead){setLive(false);setError(e instanceof Error?e.message:"Dashboard unavailable");}}finally{if(!dead)setLoading(false)}};
    load(); const id=setInterval(load,15000); return()=>{dead=true;clearInterval(id)};
  },[]);
  const signals=useMemo(()=>filter==="ALL"?data.signals:data.signals.filter(s=>s.label===filter),[data,filter]);
  const top=signals[0];
  const stale=Date.now()-new Date(data.generatedAt).getTime()>120000;

  return <main>
    <header className="topbar">
      <div><div className="eyebrow">POLY WHALE</div><h1>SIGNAL CONTROL ROOM</h1></div>
      <div className="status"><span className={live&&!stale?"dot live":"dot"}/>{loading?"LOADING":error?"DATA ERROR":stale?"STALE DATA":"LIVE DATA"}<span className="time">{new Date(data.generatedAt).toLocaleTimeString()}</span></div>
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
      {!loading && error && <div className="state"><b>DATABASE FEED UNAVAILABLE</b><span>{error}</span><small>Start PostgreSQL, initialise the schema, and run the worker. No demo signals are shown as live.</small></div>}
      {!loading && !error && !signals.length && <div className="state"><b>NO QUALIFYING SIGNALS</b><span>The suppression filters found no current setup scoring 60 or higher.</span></div>}
      {signals.map((s,i)=><article className={`signal ${i===0?"primary":""}`} key={s.id}>
        <div className="signalhead"><Score n={s.signal_score}/><div className="label">{s.label}</div><div className="ago">{age(s.last_seen_at)} ago</div></div>
        <h2>{s.title}</h2>
        <div className="outcome"><span>WHALES BUYING</span><strong>{s.outcome}</strong></div>
        <div className="signalstats">
          <div><span>WHALES</span><b>{s.whale_count}</b></div><div><span>FLOW</span><b>{money(Number(s.total_notional),true)}</b></div>
          <div><span>AVG ENTRY</span><b>{pct(Number(s.avg_entry))}</b></div><div><span>NOW</span><b>{pct(s.current_price==null?null:Number(s.current_price))}</b></div>
        </div>
        <div className="meterrow">{Object.entries(s.components??{}).map(([k,v])=><div key={k}><span>{k.replace(/([A-Z])/g," $1")}</span><i><em style={{width:`${v}%`}}/></i><b>{v}</b></div>)}</div>
        <div className="explain"><b>RANKED BECAUSE</b> quality {s.components.quality} · consensus {s.components.consensus} · flow {s.components.conviction}<br/><b>LOWERED BY</b> {s.components.liquidity<70?"limited liquidity / spread · ":""}{s.components.edgeRemaining<70?"price already moved · ":""}{s.components.freshness<70?"stale activity · ":""}{s.whale_count<2?"single-wallet cap":"no material penalty"}</div>
        <footer><span>{s.spread==null?"Spread —":`Spread ${(Number(s.spread)*100).toFixed(1)}¢`}</span><span>Depth {money(Number(s.depth_usd),true)}</span><span>{s.current_price!=null&&s.current_price>s.avg_entry?`Moved +${((s.current_price-s.avg_entry)*100).toFixed(1)}¢ since entry`:`Entry still intact`}</span></footer>
      </article>)}
    </section>

    <section className="twocol">
      <article className="panel"><div className="paneltitle"><b>WHALE BOARD</b><span>Top monitored wallets</span></div>
        <table><thead><tr><th>#</th><th>TRADER</th><th>SCORE</th><th>P&L</th><th>VOLUME</th><th>FOCUS</th></tr></thead><tbody>
          {data.whales.map((w,i)=><tr key={w.wallet}><td>{String(i+1).padStart(2,"0")}</td><td><b>{w.username||w.wallet.slice(0,8)}</b><small>{w.wallet}</small></td><td><Score n={w.whale_score}/><small>Copy {w.copyability_score}</small></td><td>{money(Number(w.pnl),true)}<small>{w.closed_positions} closed · {w.hit_rate==null?"—":`${(Number(w.hit_rate)*100).toFixed(0)}%`} hit</small></td><td>{money(Number(w.volume),true)}</td><td>{(w.categories||[]).slice(0,2).join(" · ")||"OVERALL"}</td></tr>)}
        </tbody></table>
      </article>
      <article className="panel thesis"><div className="paneltitle"><b>GO / NO-GO</b><span>Hard filters before a signal deserves attention</span></div>
        {[['Whale quality','≥ 72','PASS'],['Multiple independent wallets','≥ 2','PASS'],['Remaining price edge','≤ +5¢ move','PASS'],['Order-book spread','≤ 4¢','PASS'],['Recent signal','≤ 15 min','PASS'],['Thin / stale market','avoid','BLOCK']].map(x=><div className="criterion" key={x[0]}><span>{x[0]}</span><b>{x[1]}</b><em className={x[2]==='PASS'?'ok':'block'}>{x[2]}</em></div>)}
        <p>Signal score is a prioritisation heuristic, not an estimate of true outcome probability. Do not let one profitable wallet dominate the board.</p>
      </article>
    </section>

    <section className="twocol lower">
      <article className="panel"><div className="paneltitle"><b>RECENT WHALE ACTIVITY</b><span>Public Data API trade tape</span></div><table><thead><tr><th>TIME</th><th>WALLET</th><th>MARKET / OUTCOME</th><th>SIDE</th><th>PRICE</th><th>NOTIONAL</th></tr></thead><tbody>{data.activity.slice(0,12).map((a,i)=><tr key={`${a.wallet}-${a.traded_at}-${i}`}><td>{age(a.traded_at)}</td><td>{a.username||`${a.wallet.slice(0,6)}…${a.wallet.slice(-4)}`}</td><td><b>{a.title}</b><small>{a.outcome}</small></td><td>{a.side}</td><td>{pct(Number(a.price))}</td><td>{money(Number(a.notional),true)}</td></tr>)}</tbody></table></article>
      <article className="panel"><div className="paneltitle"><b>SIGNAL PERFORMANCE</b><span>Forward checks at +5m / +30m / +4h / resolution</span></div><table><thead><tr><th>MARKET</th><th>HORIZON</th><th>ALERT</th><th>MOVE</th></tr></thead><tbody>{data.history.slice(0,12).map(h=><tr key={`${h.signal_id}-${h.horizon}`}><td><b>{h.title}</b><small>{h.outcome}</small></td><td>{h.horizon}</td><td>{h.signal_score}</td><td className={Number(h.price_change)>=0?"positive":"negative"}>{Number(h.price_change)>=0?"+":""}{(Number(h.price_change)*100).toFixed(1)}¢</td></tr>)}</tbody></table></article>
    </section>

    <section className="disclaimer">READ-ONLY INTELLIGENCE SYSTEM · NO ORDER EXECUTION · NO GEO-CIRCUMVENTION · SIGNALS REQUIRE INDEPENDENT JUDGMENT</section>
  </main>
}
