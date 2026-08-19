"use client";

import {useEffect,useMemo,useState} from "react";

type Detail={
  signal:{avg_entry:number;current_price:number|null};
  trades:Array<{id:string;wallet:string;username:string|null;price:number;notional:number;traded_at:string;side:string}>;
  events:Array<{id:string;detected_at:string;trigger_reason:string}>;
  priceHistory:{available:boolean;points:Array<{t:number;p:number}>;reason:string|null};
};

type RangeKey="6H"|"24H"|"7D"|"ALL";
type Point={t:number;p:number};

const RANGE_MS:Record<Exclude<RangeKey,"ALL">,number>={"6H":6*60*60_000,"24H":24*60*60_000,"7D":7*24*60*60_000};
const short=(w:string)=>w.length>12?`${w.slice(0,6)}…${w.slice(-4)}`:w;
const cents=(n:number)=>`${(n*100).toFixed(1)}¢`;
const clamp=(n:number,min:number,max:number)=>Math.min(max,Math.max(min,n));

function sample(points:Point[],max=180){
  if(points.length<=max)return points;
  const out:Point[]=[];
  const step=(points.length-1)/(max-1);
  for(let i=0;i<max;i++)out.push(points[Math.round(i*step)]);
  return out.filter((p,i)=>i===0||p.t!==out[i-1]?.t);
}

function axisTime(ms:number,spanMs:number){
  const d=new Date(ms);
  if(spanMs>36*60*60_000)return d.toLocaleDateString([],{month:"short",day:"numeric"});
  return d.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});
}

export function SignalTimeline({id}:{id:string}){
  const [detail,setDetail]=useState<Detail|null>(null);
  const [error,setError]=useState("");
  const [range,setRange]=useState<RangeKey>("6H");

  useEffect(()=>{
    let active=true;
    setDetail(null);
    setError("");
    setRange("6H");
    fetch(`/api/signals/${encodeURIComponent(id)}`,{cache:"no-store"})
      .then(async r=>{const b=await r.json();if(!r.ok)throw new Error(b.error);if(active)setDetail(b)})
      .catch(e=>active&&setError(e instanceof Error?e.message:"Timeline unavailable"));
    return()=>{active=false};
  },[id]);

  const chart=useMemo(()=>{
    if(!detail?.priceHistory.available)return null;

    const raw=detail.priceHistory.points
      .map(p=>({t:Number(p.t)*1000,p:Number(p.p)}))
      .filter(p=>Number.isFinite(p.t)&&Number.isFinite(p.p)&&p.p>=0&&p.p<=1)
      .sort((a,b)=>a.t-b.t);
    if(raw.length<2)return null;

    const deduped:Point[]=[];
    for(const point of raw){
      const last=deduped[deduped.length-1];
      if(last&&last.t===point.t)deduped[deduped.length-1]=point;
      else deduped.push(point);
    }

    const latest=deduped[deduped.length-1].t;
    let visible=range==="ALL"?deduped:deduped.filter(p=>p.t>=latest-RANGE_MS[range]);
    if(visible.length<2)visible=deduped.slice(-Math.min(80,deduped.length));
    const points=sample(visible);

    const minT=points[0].t;
    const maxT=points[points.length-1].t;
    const span=Math.max(1,maxT-minT);
    const buys=detail.trades
      .filter(t=>t.side==="BUY")
      .map(t=>({...t,ms:new Date(t.traded_at).getTime(),price:Number(t.price)}))
      .filter(t=>Number.isFinite(t.ms)&&Number.isFinite(t.price)&&t.ms>=minT&&t.ms<=maxT);
    const events=detail.events
      .map(e=>({...e,ms:new Date(e.detected_at).getTime()}))
      .filter(e=>Number.isFinite(e.ms)&&e.ms>=minT&&e.ms<=maxT);

    const current=detail.signal.current_price==null?null:Number(detail.signal.current_price);
    const entry=Number(detail.signal.avg_entry);
    const prices=[...points.map(p=>p.p),entry,...buys.map(b=>b.price),...(current==null?[]:[current])].filter(Number.isFinite);
    let minP=Math.min(...prices),maxP=Math.max(...prices);
    const diff=Math.max(.01,maxP-minP);
    const pad=Math.max(.008,diff*.12);
    minP=clamp(minP-pad,0,1);
    maxP=clamp(maxP+pad,0,1);
    if(maxP-minP<.02){const mid=(maxP+minP)/2;minP=clamp(mid-.01,0,1);maxP=clamp(mid+.01,0,1)}

    const W=760,H=330;
    const m={l:48,r:76,t:26,b:42};
    const left=m.l,right=W-m.r,top=m.t,bottom=H-m.b;
    const x=(t:number)=>left+(right-left)*(t-minT)/span;
    const y=(p:number)=>bottom-(bottom-top)*(p-minP)/Math.max(.001,maxP-minP);
    const path=points.map((p,i)=>`${i?"L":"M"}${x(p.t).toFixed(2)},${y(p.p).toFixed(2)}`).join(" ");
    const area=`${path} L${x(points[points.length-1].t).toFixed(2)},${bottom} L${x(points[0].t).toFixed(2)},${bottom} Z`;
    const ticks=Array.from({length:4},(_,i)=>maxP-(maxP-minP)*(i/3));
    const times=[minT,minT+span/2,maxT];
    const entryY=y(entry);
    const currentY=current==null?null:y(current);
    let entryLabelY=entryY;
    let currentLabelY=currentY;
    if(currentY!=null&&Math.abs(currentY-entryY)<16){entryLabelY=clamp(entryY+13,top+8,bottom-4);currentLabelY=clamp(currentY-9,top+8,bottom-4)}

    return {W,H,left,right,top,bottom,minP,maxP,minT,maxT,span,points,buys,events,current,entry,x,y,path,area,ticks,times,entryY,currentY,entryLabelY,currentLabelY};
  },[detail,range]);

  if(error)return <div className="chart-unavailable"><b>Market path unavailable</b><span>{error}</span></div>;
  if(!detail)return <div className="chart-unavailable"><span>Loading market path…</span></div>;
  if(!chart)return <div className="chart-unavailable"><b>Historical price unavailable</b><span>{detail.priceHistory.reason||"No official price history was returned."}</span></div>;

  const entryDelta=chart.current==null?null:chart.current-chart.entry;

  return <section className="timeline timeline-v2">
    <div className="timeline-head">
      <div>
        <span className="timeline-eyebrow">Market context</span>
        <h3>Price path</h3>
        <p>Official CLOB history with stored whale entries.</p>
      </div>
      <div className="timeline-ranges" aria-label="Timeline range">
        {(["6H","24H","7D","ALL"] as RangeKey[]).map(r=><button key={r} type="button" className={range===r?"active":""} onClick={()=>setRange(r)}>{r}</button>)}
      </div>
    </div>

    <div className="timeline-frame">
      <svg viewBox={`0 0 ${chart.W} ${chart.H}`} role="img" aria-label="Market price history with whale entries and signal events">
        <defs>
          <linearGradient id={`price-fill-${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity=".10"/>
            <stop offset="100%" stopColor="currentColor" stopOpacity="0"/>
          </linearGradient>
        </defs>

        {chart.ticks.map((tick,i)=><g key={i}>
          <line className="timeline-grid" x1={chart.left} x2={chart.right} y1={chart.y(tick)} y2={chart.y(tick)}/>
          <text className="timeline-axis timeline-axis-y" x="6" y={chart.y(tick)+4}>{cents(tick)}</text>
        </g>)}
        {chart.times.map((t,i)=><g key={i}>
          <line className="timeline-grid timeline-grid-v" x1={chart.x(t)} x2={chart.x(t)} y1={chart.top} y2={chart.bottom}/>
          <text className={`timeline-axis timeline-axis-x ${i===2?"end":""}`} x={chart.x(t)} y={chart.H-12} textAnchor={i===0?"start":i===2?"end":"middle"}>{axisTime(t,chart.span)}</text>
        </g>)}

        <path className="timeline-area" d={chart.area} fill={`url(#price-fill-${id})`}/>
        <line className="entry-reference" x1={chart.left} x2={chart.right} y1={chart.entryY} y2={chart.entryY}/>
        <path className="timeline-price" d={chart.path}/>

        {chart.events.map((e,i)=><g key={e.id}>
          <line className={`event-line ${i===0?"event-primary":""}`} x1={chart.x(e.ms)} x2={chart.x(e.ms)} y1={chart.top} y2={chart.bottom}/>
          {i===0&&<><circle className="signal-node" cx={chart.x(e.ms)} cy={chart.top+7} r="3"/><text className="signal-label-chart" x={chart.x(e.ms)+7} y={chart.top+10}>SIGNAL</text></>}
          <title>{i===0?"Signal detected":e.trigger_reason.replaceAll("_"," ")} · {new Date(e.ms).toLocaleString()}</title>
        </g>)}

        {chart.buys.map((t,i)=><circle className={`whale-buy whale-buy-${i%3}`} key={t.id} cx={chart.x(t.ms)} cy={chart.y(t.price)} r={Math.min(5,2.8+Math.sqrt(Math.max(0,Number(t.notional)))/180)}>
          <title>{t.username?`${t.username} · `:""}{short(t.wallet)} · entry {cents(t.price)} · ${Number(t.notional).toLocaleString()} · {new Date(t.ms).toLocaleString()}</title>
        </circle>)}

        {chart.current!=null&&<>
          <line className="current-guide" x1={chart.x(chart.maxT)} x2={chart.right} y1={chart.currentY!} y2={chart.currentY!}/>
          <circle className="current-dot" cx={chart.x(chart.maxT)} cy={chart.currentY!} r="4.6"><title>Current price {cents(chart.current)}</title></circle>
        </>}

        <text className="timeline-direct timeline-direct-entry" x={chart.right+10} y={chart.entryLabelY+4}>ENTRY {cents(chart.entry)}</text>
        {chart.current!=null&&<text className="timeline-direct timeline-direct-current" x={chart.right+10} y={(chart.currentLabelY??chart.currentY!)+4}>NOW {cents(chart.current)}</text>}
      </svg>
    </div>

    <div className="timeline-readout">
      <div><span>Current</span><strong>{chart.current==null?"—":cents(chart.current)}</strong></div>
      <div><span>Whale average</span><strong>{cents(chart.entry)}</strong></div>
      <div><span>From whale entry</span><strong className={entryDelta!=null&&entryDelta<0?"negative":"positive"}>{entryDelta==null?"—":`${entryDelta>=0?"+":""}${cents(entryDelta)}`}</strong></div>
      <div><span>Whale buys in view</span><strong>{chart.buys.length}</strong></div>
    </div>
  </section>;
}
