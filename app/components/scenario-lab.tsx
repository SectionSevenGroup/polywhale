"use client";

import {useEffect,useMemo,useState} from "react";

type Props={
  outcome:string;
  avgEntry:number;
  currentPrice:number|null;
  edgeStatus:string;
};

const clamp=(n:number,min:number,max:number)=>Math.min(max,Math.max(min,n));
const usd=(n:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(n);
const signedUsd=(n:number)=>`${n>=0?"+":"-"}${usd(Math.abs(n))}`;
const pct=(n:number)=>`${(n*100).toFixed(1)}%`;
const cents=(n:number)=>`${(n*100).toFixed(1)}¢`;

export function ScenarioLab({outcome,avgEntry,currentPrice,edgeStatus}:Props){
  const live=clamp(Number(currentPrice??avgEntry)||.5,.001,.999);
  const [amount,setAmount]=useState(250);
  const [belief,setBelief]=useState(live);
  const [exitPrice,setExitPrice]=useState(live);

  useEffect(()=>{setBelief(live);setExitPrice(live)},[live]);

  const result=useMemo(()=>{
    const contracts=amount/live;
    const payout=contracts;
    const profitIfTrue=payout-amount;
    const lossIfFalse=-amount;
    const markToMarket=contracts*exitPrice-amount;
    const expectedValue=belief*payout-amount;
    const probabilityGap=belief-live;
    return {contracts,payout,profitIfTrue,lossIfFalse,markToMarket,expectedValue,probabilityGap};
  },[amount,belief,exitPrice,live]);

  const maxBar=Math.max(amount,Math.abs(result.profitIfTrue),1);
  const positiveWidth=Math.min(100,Math.abs(result.profitIfTrue)/maxBar*100);
  const negativeWidth=Math.min(100,amount/maxBar*100);

  return <section className="scenario-lab">
    <div className="scenario-head">
      <div><span className="scenario-kicker">Interactive decision sandbox</span><h3>What if?</h3></div>
      <div className="scenario-context"><span>{edgeStatus}</span><b>{outcome}</b></div>
    </div>

    <div className="scenario-reference">
      <span>Live market <b>{cents(live)}</b></span>
      <span>Whale entry <b>{cents(avgEntry)}</b></span>
      <span>Market implied <b>{pct(live)}</b></span>
    </div>

    <div className="scenario-controls">
      <label><span>Hypothetical amount <b>{usd(amount)}</b></span><input aria-label="Hypothetical amount" type="range" min="25" max="5000" step="25" value={amount} onChange={e=>setAmount(Number(e.target.value))}/><small>$25</small><small>$5,000</small></label>
      <label><span>Your probability <b>{pct(belief)}</b></span><input aria-label="Your probability" type="range" min="0.01" max="0.99" step="0.01" value={belief} onChange={e=>setBelief(Number(e.target.value))}/><small>1%</small><small>99%</small></label>
      <label><span>What if price moves to <b>{cents(exitPrice)}</b></span><input aria-label="Scenario exit price" type="range" min="0.001" max="0.999" step="0.001" value={exitPrice} onChange={e=>setExitPrice(Number(e.target.value))}/><small>0.1¢</small><small>99.9¢</small></label>
    </div>

    <div className="scenario-output">
      <div><span>Profit if selected outcome resolves</span><strong className={result.profitIfTrue>=0?"scenario-positive":"scenario-negative"}>{signedUsd(result.profitIfTrue)}</strong><small>{result.contracts.toFixed(1)} contracts</small></div>
      <div><span>Maximum loss</span><strong className="scenario-negative">{signedUsd(result.lossIfFalse)}</strong><small>Amount at risk</small></div>
      <div><span>P/L at scenario exit</span><strong className={result.markToMarket>=0?"scenario-positive":"scenario-negative"}>{signedUsd(result.markToMarket)}</strong><small>At {cents(exitPrice)}</small></div>
      <div><span>Expected value from your probability</span><strong className={result.expectedValue>=0?"scenario-positive":"scenario-negative"}>{signedUsd(result.expectedValue)}</strong><small>{result.probabilityGap>=0?"+":""}{pct(result.probabilityGap)} vs market</small></div>
    </div>

    <div className="scenario-risk">
      <div><span>Outcome resolves</span><i><em className="gain" style={{width:`${positiveWidth}%`}}/></i><b className="scenario-positive">{signedUsd(result.profitIfTrue)}</b></div>
      <div><span>Outcome fails</span><i><em className="loss" style={{width:`${negativeWidth}%`}}/></i><b className="scenario-negative">{signedUsd(result.lossIfFalse)}</b></div>
    </div>

    <p className="scenario-note">Hypothetical scenario only. POLY WHALE does not place orders or recommend a position size.</p>
  </section>;
}
