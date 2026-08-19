"use client";

import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {SignalTimeline} from "./components/signal-timeline";
import {ScenarioLab} from "./components/scenario-lab";

type Wallet={wallet:string;score:number;username?:string};
type Components=Record<string,number>;
type Signal={id:string;title:string;outcome:string;signal_score:number;label:string;edge_status:string;whale_count:number;total_notional:number;avg_entry:number;current_price:number|null;spread:number|null;depth_usd:number;edge_remaining:number;components:Components;wallets:Wallet[];last_seen_at:string};
type Whale={wallet:string;username?:string;pnl:number;volume:number;whale_score:number;copyability_score:number;hit_rate:number|null;closed_positions:number;categories:string[]};
type Activity={title:string;outcome:string;side:string;notional:number;price:number;traded_at:string;username?:string;wallet:string;whale_score:number};
type History={signal_id:string;title:string;outcome:string;signal_score:number;horizon:string;observed_price:number;price_change:number;whale_entry_edge?:number;evaluated_at:string;measurement_version?:string;thesis_key?:string};
type Performance={grain:"event"|"thesis";horizon:string;observations:string;avg_price_move_since_alert:number|null;avg_whale_entry_edge:number|null};
type Dashboard={signals:Signal[];whales:Whale[];stats:{tracked:string;strong:string;notional:string};activity:Activity[];history:History[];performanceSummary?:Performance[];generatedAt:string};

const empty:Dashboard={signals:[],whales:[],activity:[],history:[],performanceSummary:[],stats:{tracked:"0",strong:"0",notional:"0"},generatedAt:new Date().toISOString()};
const money=(n:number,compact=false)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:compact?1:0,notation:compact?"compact":"standard"}).format(n);
const cents=(n:number|null)=>n==null?"—":`${(n*100).toFixed(1)}¢`;
const signedCents=(n:number)=>`${n>=0?"+":""}${(n*100).toFixed(1)}¢`;
const age=(iso:string)=>{const s=Math.max(0,Math.floor((Date.now()-new Date(iso).getTime())/1000));return s<60?`${s}s`:s<3600?`${Math.floor(s/60)}m`:`${Math.floor(s/3600)}h`};
const shortWallet=(w:string)=>w.length>12?`${w.slice(0,6)}…${w.slice(-4)}`:w;
const componentNames:Record<string,string>={quality:"Quality",consensus:"Consensus",conviction:"Conviction",liquidity:"Liquidity",edgeRemaining:"Edge left",freshness:"Freshness"};

function signalExplanation(s:Signal){
  const move=s.current_price==null?null:s.current_price-s.avg_entry;
  if(s.whale_count<=1)return `Single-wallet flow is capped by weaker consensus. ${move==null?"Live price unavailable.":`Market is ${Math.abs(move*100).toFixed(1)}¢ ${move>=0?"above":"below"} weighted entry.`}`;
  if((s.components.liquidity??0)>=75&&(s.components.edgeRemaining??0)>=70)return `${s.whale_count} qualified whales are accumulating with firm liquidity and live edge remaining.`;
  return `${s.whale_count} qualified whales joined the setup. ${move==null?"Awaiting a live midpoint.":`Price is ${Math.abs(move*100).toFixed(1)}¢ ${move>=0?"above":"below"} weighted entry.`}`;
}
function Score({value}:{value:number}){return <span className={`score score-${value>=85?"high":value>=72?"strong":value>=60?"watch":"pass"}`}>{value}</span>}
function EdgeBadge({status}:{status:string}){return <span className={`edge-badge edge-${status.toLowerCase().replaceAll(" ","-")}`}>{status}</span>}
function EmptyState({error,loading}:{error:string;loading:boolean}){return <div className="feed-state"><span className={loading?"state-pulse":"state-mark"}/><h3>{loading?"Connecting to live intelligence":error?"Live feed unavailable":"No qualifying opportunities"}</h3><p>{loading?"Loading ranked wallets, books, and recent flow.":error||"Nothing currently clears the signal-quality threshold. The board will update automatically."}</p></div>}

export default function Page(){
  const [data,setData]=useState<Dashboard>(empty);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [filter,setFilter]=useState("ALL");
  const [selectedId,setSelectedId]=useState<string|null>(null);

  useEffect(()=>{
    let dead=false;
    const load=async()=>{
      try{
        const r=await fetch("/api/dashboard",{cache:"no-store"});
        const body=await r.json();
        if(!r.ok)throw new Error(body.error||"Dashboard unavailable");
        if(!dead){setData(body);setError("");setSelectedId(current=>current&&body.signals.some((s:Signal)=>s.id===current)?current:body.signals[0]?.id??null)}
      }catch(e){if(!dead)setError(e instanceof Error?e.message:"Dashboard unavailable")}
      finally{if(!dead)setLoading(false)}
    };
    load();
    const timer=setInterval(load,15000);
    return()=>{dead=true;clearInterval(timer)};
  },[]);

  const signals=useMemo(()=>filter==="ALL"?data.signals:data.signals.filter(s=>s.label===filter),[data.signals,filter]);
  const selected=data.signals.find(s=>s.id===selectedId)??signals[0];
  const stale=!loading&&Date.now()-new Date(data.generatedAt).getTime()>120000;
  const selectedActivity=selected?data.activity.filter(a=>a.title===selected.title&&a.outcome===selected.outcome).slice(0,4):[];

  return <main className="shell">
    <header className="topbar">
      <div className="brand"><span className="mark">PW</span><div><b>POLY WHALE</b><p>Public-market signal intelligence</p></div></div>
      <div className={`live-status ${error||stale?"status-warn":""}`}><i/>{loading?"Connecting":error?"Feed offline":stale?"Data delayed":"Live"}<time>{new Date(data.generatedAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</time></div>
    </header>

    {stale&&!error&&<div className="stale-banner">Live data is more than two minutes old. Scores may not reflect the current book.</div>}

    <section className="kpi-strip pulse-strip">
      <div><span>Tracked whales</span><strong>{data.stats.tracked}</strong></div>
      <div><span>Strong signals</span><strong>{data.stats.strong}</strong></div>
      <div><span>Live whale flow</span><strong>{money(Number(data.stats.notional),true)}</strong></div>
      <div><span>Best live score</span><strong>{data.signals[0]?.signal_score??"—"}</strong></div>
      <div className="kpi-secondary"><span>Validated V2 checks</span><strong>{data.performanceSummary?.reduce((n,p)=>n+Number(p.observations),0)??0}</strong></div>
    </section>

    <section className="opportunity-section">
      <div className="section-heading">
        <div><span className="kicker">Live intelligence</span><h1>Opportunity feed</h1><p>Whale accumulation ranked by skill, independence, liquidity, and edge remaining.</p></div>
        <div className="filters">{["ALL","HIGH CONVICTION","STRONG","WATCH"].map(x=><button key={x} className={filter===x?"active":""} onClick={()=>setFilter(x)}>{x==="HIGH CONVICTION"?"HIGH":x}</button>)}</div>
      </div>

      <div className={`workspace ${selected?"":"workspace-empty"}`}>
        <div className="signal-list">
          {loading||error||!signals.length?<EmptyState loading={loading} error={error}/>:signals.map(s=><button className={`signal-row ${selected?.id===s.id?"selected":""}`} key={s.id} onClick={()=>setSelectedId(s.id)}>
            <div className="signal-top"><Score value={s.signal_score}/><span className="signal-label">{s.label}</span><EdgeBadge status={s.edge_status}/><span className="fresh">{age(s.last_seen_at)} ago</span></div>
            <h2>{s.title}</h2>
            <div className="outcome-line"><span>{s.outcome}</span><small>{s.whale_count} whale{s.whale_count===1?"":"s"} · {money(Number(s.total_notional),true)} flow</small></div>
            <p className="signal-explanation">{signalExplanation(s)}</p>
            <div className="mini-metrics"><span>Entry <b>{cents(Number(s.avg_entry))}</b></span><span>Now <b>{cents(s.current_price==null?null:Number(s.current_price))}</b></span><div className="micro-bars">{Object.entries(s.components).map(([k,v])=><i key={k} title={`${componentNames[k]??k}: ${v}`}><em style={{width:`${v}%`}}/></i>)}</div></div>
          </button>)}
        </div>

        {selected&&<aside className="signal-detail">
          <div className="detail-intro">
            <div className="detail-head"><div><span className="kicker">Selected opportunity</span><h2>{selected.title}</h2></div><Score value={selected.signal_score}/></div>
            <div className="detail-label"><span>{selected.label}</span><b>{selected.outcome}</b><EdgeBadge status={selected.edge_status}/></div>
            <p className="detail-explanation">{signalExplanation(selected)}</p>
          </div>

          <ScenarioLab outcome={selected.outcome} avgEntry={Number(selected.avg_entry)} currentPrice={selected.current_price==null?null:Number(selected.current_price)} edgeStatus={selected.edge_status}/>
          <SignalTimeline id={selected.id}/>

          <section className="detail-section market-snapshot">
            <div className="detail-section-head"><span>Market snapshot</span><small>Live public data</small></div>
            <div className="detail-grid">
              <div><span>Whale flow</span><strong>{money(Number(selected.total_notional),true)}</strong></div>
              <div><span>Average entry</span><strong>{cents(Number(selected.avg_entry))}</strong></div>
              <div><span>Current price</span><strong>{cents(selected.current_price==null?null:Number(selected.current_price))}</strong></div>
              <div><span>Entry edge</span><strong>{selected.current_price==null?"—":signedCents(selected.current_price-selected.avg_entry)}</strong></div>
              <div><span>Spread</span><strong>{cents(selected.spread)}</strong></div>
              <div><span>Near-book depth</span><strong>{money(Number(selected.depth_usd),true)}</strong></div>
            </div>
          </section>

          <section className="detail-section signal-anatomy">
            <div className="detail-section-head"><span>Signal anatomy</span><small>Component score</small></div>
            <div className="component-list">{Object.entries(selected.components).map(([k,v])=><div key={k}><span>{componentNames[k]??k}</span><i><em style={{width:`${v}%`}}/></i><b>{v}</b></div>)}</div>
          </section>

          <div className="wallet-block">
            <div className="subhead"><b>Contributing wallets</b><span>{selected.whale_count} qualified</span></div>
            {selected.wallets.length?selected.wallets.map(w=><Link href={`/whales/${w.wallet}`} className="wallet-row" key={w.wallet}><span>{w.username||shortWallet(w.wallet)}<small>{w.username?shortWallet(w.wallet):"Public wallet"}</small></span><b>{w.score}</b></Link>):<p className="quiet">Wallet attribution is not available for this signal.</p>}
          </div>

          {selectedActivity.length>0&&<div className="detail-activity"><div className="subhead"><b>Recent flow</b><span>Matched market</span></div>{selectedActivity.map((a,i)=><div key={`${a.wallet}-${i}`}><span>{a.side} · {a.username||shortWallet(a.wallet)}</span><b>{money(Number(a.notional),true)} at {cents(Number(a.price))}</b></div>)}</div>}
        </aside>}
      </div>
    </section>

    <section className="secondary-grid">
      <article className="panel whale-panel"><div className="panel-head"><div><span className="kicker">Tracked skill</span><h2>Whale board</h2></div><span>Edge / copyability</span></div><div className="whale-list">{data.whales.map((w,i)=><Link href={`/whales/${w.wallet}`} className="whale-item" key={w.wallet}><span className="rank">{String(i+1).padStart(2,"0")}</span><div className="whale-name"><b>{w.username||shortWallet(w.wallet)}</b><span>{(w.categories||[]).slice(0,2).join(" · ")||"Overall"}</span></div><div className="whale-pnl"><b>{money(Number(w.pnl),true)}</b><span>P&amp;L</span></div><div className="dual-score"><Score value={w.whale_score}/><span>Copy {w.copyability_score}</span></div></Link>)}</div></article>
      <article className="panel guide"><div className="panel-head"><div><span className="kicker">Method</span><h2>Opportunity filters</h2></div></div>{[["Qualified wallets","2+ independent"],["Remaining edge","Move below 5¢"],["Book quality","Spread below 4¢"],["Freshness","Seen within 15m"]].map(([a,b],i)=><div className="rule" key={a}><span>0{i+1}</span><b>{a}</b><em>{b}</em></div>)}<p>Scores prioritize investigation. They are not outcome probabilities or trading advice.</p></article>
    </section>

    <section className="lower-grid">
      <article className="panel"><div className="panel-head"><div><span className="kicker">Public trades</span><h2>Recent whale activity</h2></div><span>Latest qualified flow</span></div><div className="activity-list">{data.activity.slice(0,12).map((a,i)=><Link href={`/whales/${a.wallet}`} className="activity-item" key={`${a.wallet}-${a.traded_at}-${i}`}><time>{age(a.traded_at)}</time><span className={`side side-${a.side.toLowerCase()}`}>{a.side}</span><div><b>{a.title}</b><span>{a.outcome} · {a.username||shortWallet(a.wallet)}</span></div><strong>{money(Number(a.notional),true)}<small>{cents(Number(a.price))}</small></strong></Link>)}{!data.activity.length&&!loading&&<p className="quiet empty-row">No recent qualified trades.</p>}</div></article>
      <article className="panel performance"><div className="panel-head"><div><span className="kicker">Forward validation</span><h2>Signal performance</h2></div><span>Immutable V2 checks</span></div><div className="grain-summary">{["thesis","event"].map(grain=><div key={grain}><span>{grain==="thesis"?"Unique theses":"Raw events"}</span><strong>{data.performanceSummary?.filter(p=>p.grain===grain).reduce((n,p)=>n+Number(p.observations),0)??0}</strong><small>{grain==="thesis"?"De-correlated market evidence":"Whale-information events"}</small></div>)}</div><div className="history-list">{data.history.slice(0,8).map(h=><div key={`${h.signal_id}-${h.horizon}`}><span className="horizon">+{h.horizon}</span><div><b>{h.title}</b><span>{h.outcome} · score {h.signal_score}</span></div><strong className={Number(h.price_change)>=0?"positive":"negative"}>{signedCents(Number(h.price_change))}<small>since alert</small></strong></div>)}{!data.history.length&&!loading&&<p className="quiet empty-row">Forward checks will appear after eligible events mature.</p>}</div></article>
    </section>

    <footer>Read-only public-market intelligence <span>·</span> No execution <span>·</span> Independent judgment required</footer>
  </main>;
}
