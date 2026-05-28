"use client";
import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/lib/theme";
import { createClient } from "@/lib/supabase";
import { Pencil, Copy, Trash2 } from "lucide-react";
import {
  PieChart, Pie, Cell, Sector, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const DARK = { bg:"#090909",card:"#111113",surface:"#141416",border:"#232325",borderHi:"#333336",text:"#F0F0F0",muted:"#7A7A80",green:"#00E676",greenDim:"rgba(0,230,118,0.10)",blue:"#4488FF",blueDim:"rgba(68,136,255,0.12)",red:"#FF1800",amber:"#F59E0B",cg:"linear-gradient(145deg,#131316,#0F0F12)" };
const LIGHT = { bg:"#F7F7F5",card:"#FFFFFF",surface:"#EEEEED",border:"#DEDEDD",borderHi:"#BABAB8",text:"#0A0A0A",muted:"#606065",green:"#008A38",greenDim:"rgba(0,138,56,0.09)",blue:"#1E55CC",blueDim:"rgba(30,85,204,0.09)",red:"#CC0000",amber:"#B45309",cg:"linear-gradient(145deg,#FFFFFF,#F2F2F0)" };
const gs = "'Google Sans Flex','DM Sans',sans-serif";

// ── Stock colour palette (consistent across portfolios) ────────────────────────
const STOCK_COLORS = { AAPL:"#4488FF",MSFT:"#00E676",NVDA:"#A855F7",AMZN:"#F59E0B",TSLA:"#FF6B6B",JNJ:"#06B6D4",KO:"#EF4444",PG:"#8B5CF6",O:"#10B981",CVX:"#F97316",XOM:"#6366F1",T:"#EC4899",ABBV:"#84CC16",WMT:"#14B8A6",V:"#FB923C",MA:"#C084FC",BRK:"#34D399",PFE:"#60A5FA",MRK:"#4ADE80" };
const PALETTE = ["#4488FF","#00E676","#F59E0B","#A855F7","#FF6B6B","#06B6D4","#EF4444","#8B5CF6","#10B981","#F97316","#6366F1","#EC4899","#84CC16","#14B8A6","#34D399"];
const SECTOR_COLS = { Technology:"#4488FF",Healthcare:"#00E676",Energy:"#F59E0B",Staples:"#A855F7","Real Estate":"#FF6B6B",Communication:"#06B6D4",Automotive:"#EF4444",Industrials:"#10B981",Financials:"#F97316",Materials:"#6366F1",Utilities:"#EC4899",Defence:"#84CC16" };
const sCol = (t,i) => STOCK_COLORS[t] || PALETTE[i % PALETTE.length];
const scCol = s => SECTOR_COLS[s] || "#7A7A80";

// ── Active slice shape for card mini donuts (FIX #4: no ugly tooltip popup) ───
function CardActiveShape(props){
  const{cx,cy,innerRadius,outerRadius,startAngle,endAngle,fill,payload}=props;
  return(
    <g>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius+4}
        startAngle={startAngle} endAngle={endAngle} fill={fill} opacity={1}/>
      <text x={cx} y={cy-6} textAnchor="middle" dominantBaseline="middle"
        fontFamily={gs} fontSize={9} fontWeight="700" fill={fill}>{payload.ticker}</text>
      <text x={cx} y={cy+6} textAnchor="middle" dominantBaseline="middle"
        fontFamily={gs} fontSize={8} fill="#7A7A80">{payload.weight}%</text>
    </g>
  );
}

// ── Available stocks for builder ───────────────────────────────────────────────
const AVAIL = [
  {ticker:"AAPL",name:"Apple",          sector:"Technology",   market:"US",price:178.50,aiScore:84,yield:0.5 },
  {ticker:"MSFT",name:"Microsoft",      sector:"Technology",   market:"US",price:415.20,aiScore:91,yield:0.7 },
  {ticker:"NVDA",name:"NVIDIA",         sector:"Technology",   market:"US",price:875.00,aiScore:93,yield:0.1 },
  {ticker:"AMZN",name:"Amazon",         sector:"Technology",   market:"US",price:185.00,aiScore:82,yield:0   },
  {ticker:"TSLA",name:"Tesla",          sector:"Automotive",   market:"US",price:181.00,aiScore:61,yield:0   },
  {ticker:"JNJ", name:"J&J",            sector:"Healthcare",   market:"US",price:151.80,aiScore:78,yield:3.14},
  {ticker:"KO",  name:"Coca-Cola",      sector:"Staples",      market:"US",price:61.20, aiScore:72,yield:3.08},
  {ticker:"PG",  name:"P&G",            sector:"Staples",      market:"US",price:142.60,aiScore:80,yield:2.51},
  {ticker:"O",   name:"Realty Income",  sector:"Real Estate",  market:"US",price:54.20, aiScore:71,yield:5.60},
  {ticker:"CVX", name:"Chevron",        sector:"Energy",       market:"US",price:142.40,aiScore:75,yield:4.35},
  {ticker:"XOM", name:"Exxon",          sector:"Energy",       market:"US",price:114.20,aiScore:73,yield:3.41},
  {ticker:"T",   name:"AT&T",           sector:"Communication",market:"US",price:20.40, aiScore:59,yield:5.06},
  {ticker:"V",   name:"Visa",           sector:"Financials",   market:"US",price:278.00,aiScore:88,yield:0.8 },
  {ticker:"WMT", name:"Walmart",        sector:"Staples",      market:"US",price:84.60, aiScore:85,yield:1.03},
  {ticker:"ABBV",name:"AbbVie",         sector:"Healthcare",   market:"US",price:183.60,aiScore:77,yield:3.42},
];

// ── Initial mock portfolios ────────────────────────────────────────────────────
// TODO: Persist portfolios in Supabase table `user_portfolios` (user_id, json data)
// and hydrate via: supabase.from('user_portfolios').select('*').eq('user_id', user.id)
const INITIAL = [
  { id:"p1", name:"Growth Focus",     capital:50000, holdings:[
    {ticker:"AAPL",name:"Apple",         sector:"Technology",   market:"US",weight:25,price:178.50,aiScore:84,yield:0.5 },
    {ticker:"MSFT",name:"Microsoft",     sector:"Technology",   market:"US",weight:20,price:415.20,aiScore:91,yield:0.7 },
    {ticker:"NVDA",name:"NVIDIA",        sector:"Technology",   market:"US",weight:15,price:875.00,aiScore:93,yield:0.1 },
    {ticker:"AMZN",name:"Amazon",        sector:"Technology",   market:"US",weight:15,price:185.00,aiScore:82,yield:0   },
    {ticker:"JNJ", name:"J&J",           sector:"Healthcare",   market:"US",weight:15,price:151.80,aiScore:78,yield:3.14},
    {ticker:"XOM", name:"Exxon",         sector:"Energy",       market:"US",weight:10,price:114.20,aiScore:73,yield:3.41},
  ]},
  { id:"p2", name:"Dividend Income",  capital:30000, holdings:[
    {ticker:"JNJ", name:"J&J",           sector:"Healthcare",   market:"US",weight:20,price:151.80,aiScore:78,yield:3.14},
    {ticker:"KO",  name:"Coca-Cola",     sector:"Staples",      market:"US",weight:20,price:61.20, aiScore:72,yield:3.08},
    {ticker:"PG",  name:"P&G",           sector:"Staples",      market:"US",weight:15,price:142.60,aiScore:80,yield:2.51},
    {ticker:"O",   name:"Realty Income", sector:"Real Estate",  market:"US",weight:20,price:54.20, aiScore:71,yield:5.60},
    {ticker:"CVX", name:"Chevron",       sector:"Energy",       market:"US",weight:15,price:142.40,aiScore:75,yield:4.35},
    {ticker:"T",   name:"AT&T",          sector:"Communication",market:"US",weight:10,price:20.40, aiScore:59,yield:5.06},
  ]},
  { id:"p3", name:"Balanced Global",  capital:75000, holdings:[
    {ticker:"AAPL",name:"Apple",         sector:"Technology",   market:"US",weight:15,price:178.50,aiScore:84,yield:0.5 },
    {ticker:"MSFT",name:"Microsoft",     sector:"Technology",   market:"US",weight:12,price:415.20,aiScore:91,yield:0.7 },
    {ticker:"V",   name:"Visa",          sector:"Financials",   market:"US",weight:10,price:278.00,aiScore:88,yield:0.8 },
    {ticker:"JNJ", name:"J&J",           sector:"Healthcare",   market:"US",weight:13,price:151.80,aiScore:78,yield:3.14},
    {ticker:"KO",  name:"Coca-Cola",     sector:"Staples",      market:"US",weight:10,price:61.20, aiScore:72,yield:3.08},
    {ticker:"XOM", name:"Exxon",         sector:"Energy",       market:"US",weight:8, price:114.20,aiScore:73,yield:3.41},
    {ticker:"AMZN",name:"Amazon",        sector:"Technology",   market:"US",weight:10,price:185.00,aiScore:82,yield:0   },
    {ticker:"PG",  name:"P&G",           sector:"Staples",      market:"US",weight:10,price:142.60,aiScore:80,yield:2.51},
    {ticker:"O",   name:"Realty Income", sector:"Real Estate",  market:"US",weight:12,price:54.20, aiScore:71,yield:5.60},
  ]},
];

// ── Algorithms ─────────────────────────────────────────────────────────────────
const SECTOR_CAGR = { Technology:0.20,Healthcare:0.11,Energy:0.07,Staples:0.08,"Real Estate":0.09,Communication:0.06,Automotive:0.13,Industrials:0.10,Financials:0.12 };
const MKT_RETURNS = { 2010:1.15,2011:0.98,2012:1.16,2013:1.32,2014:1.13,2015:1.01,2016:1.12,2017:1.22,2018:0.96,2019:1.31,2020:1.18,2021:1.28,2022:0.82,2023:1.26,2024:1.23,2025:1.08 };

function wCAGR(h) { return h.reduce((s,x)=>s+(x.weight/100)*(SECTOR_CAGR[x.sector]||0.10),0); }
function wYield(h){ return h.reduce((s,x)=>s+(x.weight/100)*(x.yield/100||0),0); }
function wAIScore(h){ return Math.round(h.reduce((s,x)=>s+(x.weight/100)*x.aiScore,0)); }

function divScore(h) {
  const sectors=[...new Set(h.map(x=>x.sector))];
  const markets=[...new Set(h.map(x=>x.market))];
  const hhi=h.reduce((s,x)=>s+(x.weight/100)**2,0);
  const maxSec=Math.max(...sectors.map(s=>h.filter(x=>x.sector===s).reduce((a,x)=>a+x.weight,0)));
  return Math.round(
    Math.min(30,sectors.length*6)+
    (markets.length===1?8:markets.length===2?14:20)+
    (hhi<0.10?25:hhi<0.15?20:hhi<0.25?12:hhi<0.40?6:0)+
    Math.min(15,h.length*1.5)+
    (maxSec<30?10:maxSec<50?6:maxSec<70?2:0)
  );
}

function genHistorical(portfolio, startYear, inflAdj, inflRate, drip) {
  const cagr=wCAGR(portfolio.holdings), dy=wYield(portfolio.holdings);
  const data=[]; let v=portfolio.capital;
  for(let y=startYear;y<=2025;y++){
    const mr=MKT_RETURNS[y]||1.10;
    const pr=mr*(1+(cagr-0.10)*0.6);
    const divReturn = drip ? dy : 0;
    v=v*(pr + divReturn);
    const infF=inflAdj?Math.pow(1/(1+inflRate/100),y-startYear):1;
    data.push({year:String(y),value:Math.round(v*infF),nominal:Math.round(v)});
  }
  return data;
}

function genProjection(portfolio, years, inflAdj, inflRate, drip, extraGrowth, monthlyAdd, addEnabled) {
  const cagr=wCAGR(portfolio.holdings)+extraGrowth/100;
  const dy=wYield(portfolio.holdings);
  const rate=1+cagr+(drip?dy:0);
  const data=[]; let v=portfolio.capital; let vc=portfolio.capital;
  for(let y=1;y<=years;y++){
    v=v*rate;
    vc=(vc+(addEnabled?monthlyAdd*12:0))*rate; // contributions invested at start of year
    const infF=inflAdj?Math.pow(1/(1+inflRate/100),y):1;
    data.push({year:`Yr ${y}`,value:Math.round(v*infF),nominal:Math.round(v),
      ...(addEnabled&&{withContrib:Math.round(vc*infF)})});
  }
  return data;
}

function genComparison(portfolios, years) {
  return Array.from({length:years},(_, i)=>{
    const yr=`Yr ${i+1}`;
    const row={year:yr};
    portfolios.forEach(p=>{
      const cagr=wCAGR(p.holdings);
      row[p.id]=Math.round(100*Math.pow(1+cagr,i+1));
    });
    return row;
  });
}

// ── Mini circular score ────────────────────────────────────────────────────────
function ScoreCircle({score,c,size=38,label}){
  const col=score>=75?c.green:score>=55?c.amber:c.red;
  const r=(size-5)/2,cx2=size/2,circ=2*Math.PI*r,off=circ*(1-score/100);
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"2px"}}>
      <div style={{position:"relative",width:size,height:size,display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{position:"absolute",inset:"5px",borderRadius:"50%",background:`radial-gradient(circle,${col}28 0%,transparent 75%)`,filter:"blur(3px)"}}/>
        <svg width={size} height={size} style={{position:"absolute",transform:"rotate(-90deg)"}}>
          <circle cx={cx2} cy={cx2} r={r} fill="none" stroke={c.border} strokeWidth="3"/>
          <circle cx={cx2} cy={cx2} r={r} fill="none" stroke={col} strokeWidth="3" strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"/>
        </svg>
        <span style={{fontFamily:gs,fontSize:"0.6rem",fontWeight:800,color:col,position:"relative",zIndex:1}}>{score}</span>
      </div>
      {label&&<span style={{fontFamily:gs,fontSize:"0.52rem",color:c.muted,letterSpacing:"0.04em",textTransform:"uppercase"}}>{label}</span>}
    </div>
  );
}

// ── Sector weight visualisations ───────────────────────────────────────────────
function SectorBar({holdings,c}){
  const sectors={};
  holdings.forEach(h=>{sectors[h.sector]=(sectors[h.sector]||0)+h.weight;});
  const entries=Object.entries(sectors).sort(([,a],[,b])=>b-a);
  return(
    <div>
      <div style={{height:"16px",borderRadius:"6px",overflow:"hidden",display:"flex",marginBottom:"0.5rem"}}>
        {entries.map(([s,pct])=>(
          <div key={s} title={`${s}: ${pct}%`} style={{width:`${pct}%`,background:scCol(s),height:"100%",display:"flex",alignItems:"center",justifyContent:"center"}}>
            {pct>=12&&<span style={{fontFamily:gs,fontSize:"0.5rem",fontWeight:700,color:"#fff"}}>{Math.round(pct)}%</span>}
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:"0.4rem",flexWrap:"wrap"}}>
        {entries.map(([s,pct])=>(
          <div key={s} style={{display:"flex",alignItems:"center",gap:"3px"}}>
            <div style={{width:"7px",height:"7px",borderRadius:"2px",background:scCol(s),flexShrink:0}}/>
            <span style={{fontFamily:gs,fontSize:"0.62rem",color:c.muted}}>{s.split(" ")[0]} <strong style={{color:c.text,fontWeight:600}}>{Math.round(pct)}%</strong></span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectorDonut({holdings,c,size=130}){
  const sectors={};
  holdings.forEach(h=>{sectors[h.sector]=(sectors[h.sector]||0)+h.weight;});
  const entries=Object.entries(sectors).sort(([,a],[,b])=>b-a);
  const cx=size/2,cy=size/2,r=size*0.40,ir=size*0.24;
  let cum=-Math.PI/2;
  const segs=entries.map(([s,pct])=>{
    const a=(pct/100)*2*Math.PI;
    const a1=cum,a2=cum+a;cum=a2;
    const la=a>Math.PI?1:0;
    const x1=cx+r*Math.cos(a1),y1=cy+r*Math.sin(a1);
    const x2=cx+r*Math.cos(a2),y2=cy+r*Math.sin(a2);
    const x3=cx+ir*Math.cos(a2),y3=cy+ir*Math.sin(a2);
    const x4=cx+ir*Math.cos(a1),y4=cy+ir*Math.sin(a1);
    return{s,pct,color:scCol(s),path:`M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 ${la} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} L ${x3.toFixed(1)} ${y3.toFixed(1)} A ${ir} ${ir} 0 ${la} 0 ${x4.toFixed(1)} ${y4.toFixed(1)} Z`};
  });
  return(
    <div style={{display:"flex",alignItems:"center",gap:"0.75rem"}}>
      <svg width={size} height={size} style={{flexShrink:0}}>
        {segs.map(({s,path,color},i)=><path key={i} d={path} fill={color} stroke={c.card} strokeWidth="1.5"/>)}
        <text x={cx} y={cy-4} textAnchor="middle" fontFamily={gs} fontSize={size*0.11} fontWeight="700" fill={c.text}>{entries.length}</text>
        <text x={cx} y={cy+10} textAnchor="middle" fontFamily={gs} fontSize={size*0.08} fill={c.muted}>sectors</text>
      </svg>
      <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
        {entries.slice(0,6).map(([s,pct])=>(
          <div key={s} style={{display:"flex",alignItems:"center",gap:"5px"}}>
            <div style={{width:"8px",height:"8px",borderRadius:"2px",background:scCol(s),flexShrink:0}}/>
            <span style={{fontFamily:gs,fontSize:"0.65rem",color:c.muted,whiteSpace:"nowrap"}}>{s.split(" ")[0]} <strong style={{color:c.text,fontWeight:600}}>{Math.round(pct)}%</strong></span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Portfolio Builder modal ────────────────────────────────────────────────────
function Builder({c,mode,initial,onSave,onCancel}){
  // ESC to close
  useEffect(()=>{
    const h=e=>{if(e.key==="Escape")onCancel();};
    window.addEventListener("keydown",h);
    return()=>window.removeEventListener("keydown",h);
  },[onCancel]);
  const [name,setName]=useState(initial?.name||"");
  const [capital,setCapital]=useState(initial?.capital||10000);
  const [holdings,setHoldings]=useState(initial?.holdings||[]);
  const [search,setSearch]=useState("");
  const [step,setStep]=useState(initial?"edit":1); // 1=capital, 2=stocks, "edit"=editing

  const remaining=100-holdings.reduce((s,h)=>s+h.weight,0);
  const canSave=name.trim()&&capital>0&&holdings.length>0&&Math.abs(remaining)<1;

  const addStock=s=>{
    if(holdings.find(h=>h.ticker===s.ticker))return;
    const evenW=Math.round(100/(holdings.length+1));
    const newH=[...holdings.map(h=>({...h,weight:evenW})),{...s,weight:evenW}];
    const diff=100-newH.reduce((a,x)=>a+x.weight,0);
    if(diff!==0)newH[0].weight+=diff;
    setHoldings(newH);
  };

  const removeStock=ticker=>{
    const rem=holdings.filter(h=>h.ticker!==ticker);
    if(rem.length===0){setHoldings([]);return;}
    const evenW=Math.round(100/rem.length);
    const newH=rem.map(h=>({...h,weight:evenW}));
    const diff=100-newH.reduce((a,x)=>a+x.weight,0);
    newH[0].weight+=diff;
    setHoldings(newH);
  };

  const updateWeight=(ticker,val)=>{
    // Independent sliders: each moves freely, user must reach 100% to save
    setHoldings(prev=>prev.map(h=>h.ticker===ticker?{...h,weight:Math.max(1,Math.min(99,val))}:h));
  };

  const filtered=AVAIL.filter(s=>!holdings.find(h=>h.ticker===s.ticker)&&
    (!search||(s.ticker+s.name).toLowerCase().includes(search.toLowerCase()))).slice(0,6);

  return(
    <>
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.72)",zIndex:500}}/>
      <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:"min(760px,94vw)",maxHeight:"90vh",overflowY:"auto",background:c.card,border:`1px solid ${c.borderHi}`,borderRadius:"16px",boxShadow:"0 32px 80px rgba(0,0,0,0.5)",zIndex:501}}>
        <div style={{padding:"1.25rem 1.5rem",borderBottom:`1px solid ${c.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:c.card}}>
          <div>
            <p style={{fontFamily:gs,fontSize:"0.62rem",color:c.muted,letterSpacing:"0.12em",textTransform:"uppercase",fontWeight:600}}>{initial?"Edit Portfolio":"New Portfolio"}</p>
            <h3 style={{fontFamily:gs,fontSize:"1.1rem",fontWeight:700,color:c.text}}>{step===1?"Set your budget":step===2?"Build your portfolio":"Edit holdings"}</h3>
          </div>
          <button onClick={onCancel} style={{background:c.surface,border:`1px solid ${c.border}`,borderRadius:"6px",padding:"6px 10px",cursor:"pointer",color:c.muted,fontFamily:gs,fontSize:"0.78rem"}}>✕</button>
        </div>

        <div style={{padding:"1.5rem",display:"grid",gridTemplateColumns:holdings.length>0?"1fr 260px":"1fr",gap:"1.5rem"}}>
          <div>
            {/* Step 1 - Name + Capital */}
            <div style={{marginBottom:"1.25rem"}}>
              <label style={{fontFamily:gs,fontSize:"0.72rem",color:c.muted,display:"block",marginBottom:"5px"}}>Portfolio name</label>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Growth Focus, Dividend Income…"
                style={{width:"100%",background:c.surface,border:`1px solid ${c.border}`,borderRadius:"6px",padding:"9px 12px",fontFamily:gs,fontSize:"0.88rem",color:c.text,outline:"none"}}/>
            </div>
            <div style={{marginBottom:"1.5rem"}}>
              <label style={{fontFamily:gs,fontSize:"0.72rem",color:c.muted,display:"block",marginBottom:"5px"}}>Capital to invest ($)</label>
              <input type="number" value={capital} min={100} onChange={e=>setCapital(Math.max(100,+e.target.value))}
                style={{width:"100%",background:c.surface,border:`1px solid ${c.border}`,borderRadius:"6px",padding:"9px 12px",fontFamily:gs,fontSize:"1rem",fontWeight:700,color:c.text,outline:"none"}}/>
            </div>

            {/* Stock search */}
            <div style={{marginBottom:"0.75rem"}}>
              <label style={{fontFamily:gs,fontSize:"0.72rem",color:c.muted,display:"block",marginBottom:"5px"}}>Add stocks</label>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search ticker or company…"
                style={{width:"100%",background:c.surface,border:`1px solid ${c.border}`,borderRadius:"6px",padding:"9px 12px",fontFamily:gs,fontSize:"0.84rem",color:c.text,outline:"none"}}/>
            </div>
            {filtered.length===0&&search.length>0&&<p style={{fontFamily:gs,fontSize:"0.72rem",color:c.muted,marginBottom:"0.4rem"}}>No results for "{search}"</p>}
            {filtered.length>0&&!search&&<p style={{fontFamily:gs,fontSize:"0.66rem",color:c.muted,marginBottom:"0.4rem"}}>Available to add: click to include</p>}
            <div style={{display:"flex",flexWrap:"wrap",gap:"0.4rem",marginBottom:"1.25rem"}}>
              {filtered.map(s=>(
                <button key={s.ticker} onClick={()=>addStock(s)}
                  style={{background:c.surface,border:`1px solid ${c.border}`,borderRadius:"6px",padding:"5px 12px",cursor:"pointer",fontFamily:gs,fontSize:"0.76rem",color:c.text,display:"flex",alignItems:"center",gap:"5px",transition:"border-color 0.15s"}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor=c.borderHi}
                  onMouseLeave={e=>e.currentTarget.style.borderColor=c.border}>
                  <span style={{fontWeight:700}}>{s.ticker}</span>
                  <span style={{color:c.muted,fontSize:"0.68rem"}}>{s.yield>0?`${s.yield.toFixed(1)}% yield`:""}</span>
                  <span style={{color:c.green,fontSize:"0.72rem"}}>＋</span>
                </button>
              ))}
            </div>

            {/* Holdings sliders */}
            {holdings.length>0&&(
              <div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.6rem"}}>
                  <p style={{fontFamily:gs,fontSize:"0.72rem",fontWeight:600,color:c.text}}>Allocation</p>
                  <span style={{fontFamily:gs,fontSize:"0.72rem",
                    color:Math.abs(remaining)<1?c.green:remaining>0?c.blue:c.red,
                    fontWeight:600}}>
                    {Math.abs(remaining)<1?"✓ 100% allocated"
                      :remaining>0?`${remaining}% still to allocate`
                      :`${-remaining}% over: reduce a holding`}
                  </span>
                </div>
                {holdings.map((h,i)=>(
                  <div key={h.ticker} style={{marginBottom:"0.75rem"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"4px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                        <div style={{width:"10px",height:"10px",borderRadius:"2px",background:sCol(h.ticker,i),flexShrink:0}}/>
                        <span style={{fontFamily:gs,fontSize:"0.82rem",fontWeight:700,color:c.text}}>{h.ticker}</span>
                        <span style={{fontFamily:gs,fontSize:"0.7rem",color:c.muted}}>{h.sector}</span>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                        <span style={{fontFamily:gs,fontSize:"0.8rem",fontWeight:700,color:c.text}}>{h.weight}%</span>
                        <span style={{fontFamily:gs,fontSize:"0.72rem",color:c.muted}}>${((h.weight/100)*capital).toLocaleString()}</span>
                        <button onClick={()=>removeStock(h.ticker)} style={{background:"none",border:"none",cursor:"pointer",color:c.muted,fontSize:"0.8rem",padding:"0 2px"}}>✕</button>
                      </div>
                    </div>
                    <input type="range" min={1} max={98} value={h.weight}
                      onChange={e=>updateWeight(h.ticker,+e.target.value)}
                      style={{width:"100%",accentColor:sCol(h.ticker,i),cursor:"pointer"}}/>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live pie chart */}
          {holdings.length>0&&(
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"0.75rem"}}>
              <p style={{fontFamily:gs,fontSize:"0.7rem",color:c.muted,letterSpacing:"0.1em",textTransform:"uppercase",fontWeight:600}}>Portfolio Preview</p>
              <PieChart width={240} height={240}>
                <Pie data={holdings} dataKey="weight" nameKey="ticker" cx="50%" cy="50%" outerRadius={100} innerRadius={54} paddingAngle={2} strokeWidth={0}>
                  {holdings.map((h,i)=><Cell key={i} fill={sCol(h.ticker,i)}/>)}
                </Pie>
                <Tooltip formatter={(v,n)=>[`${v}% · $${((v/100)*capital).toLocaleString()}`,n]} contentStyle={{background:c.card,border:`1px solid ${c.borderHi}`,borderRadius:"6px",fontFamily:gs,fontSize:"0.78rem",color:c.text}} itemStyle={{color:c.text}} labelStyle={{color:c.muted,display:"none"}}/>
              </PieChart>
              <div style={{background:c.surface,borderRadius:"8px",padding:"0.75rem",width:"100%",textAlign:"center"}}>
                <p style={{fontFamily:gs,fontSize:"0.6rem",color:c.muted,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:"3px"}}>Weighted Avg. AI Score</p>
                <p style={{fontFamily:gs,fontSize:"1.4rem",fontWeight:800,color:c.green}}>{wAIScore(holdings)}</p>
              </div>
            </div>
          )}
        </div>

        <div style={{padding:"0 1.5rem 1.5rem",display:"flex",gap:"0.75rem",justifyContent:"flex-end"}}>
          <button onClick={onCancel} style={{background:"transparent",color:c.muted,border:`1px solid ${c.border}`,borderRadius:"7px",padding:"10px 24px",fontFamily:gs,fontSize:"0.84rem",cursor:"pointer"}}>Cancel</button>
          <button onClick={()=>canSave&&onSave({id:initial?.id||`p${Date.now()}`,name:name.trim(),capital,holdings})} disabled={!canSave}
            style={{background:c.text,color:c.bg,border:"none",borderRadius:"7px",padding:"10px 28px",fontFamily:gs,fontSize:"0.84rem",fontWeight:700,cursor:canSave?"pointer":"not-allowed",opacity:canSave?1:0.45}}>
            {initial?"Save Changes":"Create Portfolio"}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Terms Explained accordion (FIX #6) ────────────────────────────────────────
// ── Portfolio glossary terms: basic to advanced to scores (matching Dividends module) ──
const PORT_TERMS=[
  {term:"CAGR",
   full:"Compound Annual Growth Rate",
   def:"The annualised rate at which a portfolio would need to grow each year to reach its end value from its starting value. Smooths out year-to-year volatility into one representative number. Clarinvest estimates it from each holding's weighted sector CAGR. Not a guarantee of future returns."},
  {term:"Weighted Yield",
   full:"Portfolio Weighted Dividend Yield",
   def:"How much income your whole portfolio generates each year, as a percentage of what you invested. If you put £10,000 into a portfolio with a 3% weighted yield, you'd receive roughly £300/year in dividends. Higher is better for income-focused investors, but very high yields (above 6%) can sometimes signal that a company's dividend is under pressure. Look for a balance between yield and safety."},
  {term:"DRIP",
   full:"Dividend Reinvestment Plan",
   def:"Dividends are used to purchase additional shares automatically instead of being paid in cash, compounding returns over time. In the Portfolio charts, enabling DRIP adds each holding's dividend yield on top of its annual growth rate, showing how reinvested income accelerates long-term value. Available on Ultimate only."},
  {term:"Inflation Adj.",
   full:"Inflation-Adjusted Real Return",
   def:"Converts nominal projected returns into real (purchasing-power-adjusted) returns by deflating at a selected annual rate (1.5–4%). Shows what your projected wealth is worth in today's money. The nominal line stays visible alongside for comparison."},
  {term:"Growth Focus",
   full:"Growth Scenario Adjustment",
   def:"A manual adjustment applied on top of the portfolio's base-case CAGR in the Projection chart. A positive value models more favourable conditions; a negative value models headwinds. Base (0%) uses the portfolio's weighted historical sector CAGR unchanged."},
  {term:"Div. Score",
   full:"Diversification Score",
   def:"A composite 0–100 score measuring how well-spread the portfolio is. Scored across five factors: sector variety (up to 30 pts), market spread (up to 20 pts), HHI concentration (up to 25 pts), number of holdings (up to 15 pts), and maximum single-sector weight (up to 10 pts). No AI tokens are used for this score."},
  {term:"Avg AI Score",
   full:"Weighted Average AI Score",
   def:"A single quality signal for the portfolio: each holding's Clarinvest AI Score weighted by its allocation percentage, then summed. Higher means the portfolio is concentrated in higher-quality names as assessed by the AI. 75+ strong · 60–74 moderate · below 60 mixed."},
];

// ── Terms Glossary: matches Dividends module style exactly ───────────────────
function TermsGlossary({c}){
  const[open,setOpen]=useState(false);
  return(
    <div style={{marginBottom:"2rem"}}>
      <button onClick={()=>setOpen(!open)}
        style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:"0.4rem",padding:"6px 0",fontFamily:gs,fontSize:"0.74rem",color:c.muted,fontWeight:500}}>
        <span style={{transition:"transform 0.2s",display:"inline-block",transform:open?"rotate(90deg)":"rotate(0deg)",fontSize:"0.7rem"}}>▶</span>
        Terms explained
      </button>
      {open&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:"0.6rem",marginTop:"0.75rem",padding:"1rem",background:c.surface,borderRadius:"10px",border:`1px solid ${c.border}`}}>
          {PORT_TERMS.map(({term,full,def})=>(
            <div key={term} style={{padding:"0.75rem",background:c.card,borderRadius:"7px",border:`1px solid ${c.border}`}}>
              <p style={{fontFamily:gs,fontSize:"0.72rem",fontWeight:700,color:c.text,marginBottom:"2px"}}>{term}</p>
              <p style={{fontFamily:gs,fontSize:"0.62rem",color:c.blue,marginBottom:"5px",fontWeight:500}}>{full}</p>
              <p style={{fontFamily:gs,fontSize:"0.7rem",color:c.muted,lineHeight:1.6}}>{def}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Locked cell: greyed dash, hover reveals upgrade tooltip with real navigation ─
function LockedCell({c,align="right"}){
  const router=useRouter();
  const[hov,setHov]=useState(false);
  return(
    <div style={{position:"relative",display:"inline-flex",alignItems:"center",justifyContent:align==="right"?"flex-end":"center"}}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
      <span style={{fontFamily:gs,fontSize:"0.82rem",color:c.borderHi,cursor:"default",userSelect:"none",letterSpacing:"0.05em"}}>
        - -
      </span>
      {hov&&(
        <div style={{position:"absolute",bottom:"calc(100% + 6px)",right:0,
          background:c.card,border:`1px solid ${c.borderHi}`,borderRadius:"7px",
          padding:"8px 14px",zIndex:60,whiteSpace:"nowrap",
          boxShadow:"0 6px 20px rgba(0,0,0,0.22)",pointerEvents:"auto"}}>
          <p style={{fontFamily:gs,fontSize:"0.72rem",fontWeight:700,color:c.text,marginBottom:"1px"}}>
            Upgrade to Ultimate
          </p>
          <p style={{fontFamily:gs,fontSize:"0.65rem",color:c.muted}}>
            Unlock dividend data and income tools
          </p>
          <button onClick={()=>router.push("/dashboard/account")}
            style={{marginTop:"6px",background:c.text,borderRadius:"4px",padding:"4px 10px",
              width:"100%",border:"none",cursor:"pointer",fontFamily:gs,fontSize:"0.66rem",fontWeight:700,color:c.bg}}>
            View plans
          </button>
        </div>
      )}
    </div>
  );
}

// ── Charts tooltip ─────────────────────────────────────────────────────────────
function ChartTip({active,payload,label,c,prefix="$"}){
  if(!active||!payload?.length)return null;
  return(
    <div style={{background:c.card,border:`1px solid ${c.borderHi}`,borderRadius:"6px",padding:"8px 12px"}}>
      <p style={{fontFamily:gs,fontSize:"0.68rem",color:c.muted,marginBottom:"4px"}}>{label}</p>
      {payload.map((p,i)=>(
        <p key={i} style={{fontFamily:gs,fontSize:"0.82rem",fontWeight:700,color:p.color||p.stroke||c.text}}>
          {p.name}: {prefix}{p.value?.toLocaleString()}{prefix==="$"?"":"%"}
        </p>
      ))}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function PortfolioPage(){
  const { mode } = useTheme();                // global theme from @/lib/theme
  const c = mode==="dark" ? DARK : LIGHT;
  const router = useRouter();
  const supabase = createClient();

  // Auth + plan
  const [userPlan, setUserPlan] = useState(null);
  useEffect(()=>{
    supabase.auth.getUser().then(({data:{user}})=>{
      if(!user){ router.push("/login"); return; }
      setUserPlan(user.user_metadata?.plan || "essential");
    });
  },[]);

  const [portfolios,setPortfolios]=useState(INITIAL);
  const [selectedId,setSelectedId]=useState("p1");
  const [showBuilder,setShowBuilder]=useState(false);
  const [editingPortfolio,setEditingPortfolio]=useState(null);
  const [sectorViz,setSectorViz]=useState("bar");   // "bar"|"donut"
  const [whatIfYear,setWhatIfYear]=useState(2018);
  const [projYears,setProjYears]=useState(10);
  const [drip,setDrip]=useState(false);
  const [inflation,setInflation]=useState(false);
  const [inflRate,setInflRate]=useState(2.5);
  const [extraGrowth,setExtraGrowth]=useState(0);
  const [monthlyAdd,setMonthlyAdd]=useState(200);
  const [addEnabled,setAddEnabled]=useState(false);
  const [cmpIds,setCmpIds]=useState(["p1","p2","p3"]);
  const [cmpRange,setCmpRange]=useState(10);
  const [cardActiveSlice,setCardActiveSlice]=useState({});  // FIX #4: per-card active slice
  const isUltimate = userPlan === "ultimate";

  const selected=portfolios.find(p=>p.id===selectedId)||portfolios[0];

  const handleSave=useCallback(p=>{
    setPortfolios(prev=>{
      const isNew=!prev.find(x=>x.id===p.id);
      if(isNew) setCmpIds(cids=>[...cids,p.id]); // auto-add to comparison
      return isNew?[...prev,p]:prev.map(x=>x.id===p.id?p:x);
    });
    setSelectedId(p.id);
    setShowBuilder(false);
    setEditingPortfolio(null);
  },[]);

  const handleDelete=id=>{
    const remaining=portfolios.filter(p=>p.id!==id);
    setPortfolios(remaining);
    if(selectedId===id&&remaining.length>0)setSelectedId(remaining[0].id);
    setCmpIds(prev=>prev.filter(x=>x!==id));
  };

  const handleDuplicate=p=>{
    const dup={...p,id:`p${Date.now()}`,name:`${p.name} (copy)`};
    setPortfolios(prev=>prev.length<5?[...prev,dup]:prev);
    setSelectedId(dup.id);
  };

  const Toggle=({on,set,label,locked})=>(
    <button onClick={()=>!locked&&set(!on)}
      style={{display:"flex",alignItems:"center",gap:"0.4rem",background:"none",border:"none",cursor:locked?"default":"pointer",padding:0,opacity:locked?0.5:1}}>
      <div style={{width:"32px",height:"18px",borderRadius:"9px",background:on&&!locked?c.green:c.border,position:"relative",transition:"background 0.2s",flexShrink:0}}>
        <div style={{position:"absolute",top:"2px",left:on&&!locked?"16px":"2px",width:"14px",height:"14px",borderRadius:"50%",background:on&&!locked?(mode==="dark"?"#050505":"#fff"):c.muted,transition:"left 0.2s"}}/>
      </div>
      <span style={{fontFamily:gs,fontSize:"0.76rem",color:on&&!locked?c.text:c.muted,fontWeight:on&&!locked?600:400}}>{label}</span>
      {locked&&<span style={{fontSize:"0.62rem",marginLeft:"1px"}}>🔒</span>}
    </button>
  );

  const pillBtn=(active,onClick,label)=>(
    <button onClick={onClick} style={{background:active?c.text:"transparent",color:active?c.bg:c.muted,border:`1px solid ${active?c.text:c.border}`,borderRadius:"50px",padding:"4px 12px",fontFamily:gs,fontSize:"0.72rem",fontWeight:600,cursor:"pointer",transition:"all 0.15s"}}>{label}</button>
  );

  // Computed data
  const histData=useMemo(()=>selected?genHistorical(selected,whatIfYear,inflation,inflRate,drip&&isUltimate):[]
  ,[selected,whatIfYear,inflation,inflRate,drip,isUltimate]);

  const projData=useMemo(()=>selected?genProjection(selected,projYears,inflation,inflRate,drip&&isUltimate,extraGrowth,monthlyAdd,addEnabled):[]
  ,[selected,projYears,inflation,inflRate,drip,isUltimate,extraGrowth,monthlyAdd,addEnabled]);

  const cmpPortfolios=portfolios.filter(p=>cmpIds.includes(p.id));
  const cmpData=useMemo(()=>genComparison(cmpPortfolios,cmpRange),[cmpIds,cmpRange,portfolios]);

  const divScoreVal=selected?divScore(selected.holdings):0;
  const divLabel=divScoreVal>=75?"Strong":divScoreVal>=50?"Moderate":"Needs Work";

  // Rebalancing drift (deterministic mock)
  const drifted=selected?selected.holdings.filter(h=>{
    const seed=(h.ticker.charCodeAt(0)+selected.id.length)%10;
    return seed>6;
  }):[];

  // Auth loading gate
  if(userPlan===null){
    return(
      <div style={{background:c.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <p style={{fontFamily:gs,color:c.muted,fontSize:"0.84rem"}}>Loading...</p>
      </div>
    );
  }

  return(
    <div style={{fontFamily:gs,background:c.bg,minHeight:"100vh",color:c.text}}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-thumb{background:#303032;border-radius:2px;}
        input[type=range]{-webkit-appearance:none;height:5px;background:${c.borderHi};border-radius:3px;outline:none;}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;cursor:pointer;background:${c.blue};border:2px solid rgba(255,255,255,0.22);box-shadow:0 0 0 3px ${c.blue}38,0 0 10px ${c.blue}55;}
        input[type=range]::-moz-range-track{height:5px;background:${c.borderHi};border-radius:3px;}
        input[type=range]::-moz-range-thumb{width:16px;height:16px;border:none;border-radius:50%;background:${c.blue};cursor:pointer;}
        input[type=number]::-webkit-inner-spin-button{opacity:0.35;}
        .card-strip{display:flex;gap:0.85rem;overflow-x:auto;-ms-overflow-style:none;scrollbar-width:none;padding-top:28px;padding-bottom:28px;padding-left:4px;padding-right:4px;}
        .card-strip::-webkit-scrollbar{display:none;}
      `}</style>

      <div style={{maxWidth:"1100px",margin:"0 auto",padding:"2rem 1.5rem 4rem"}}>

        {/* ── Header ── */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:"2rem",flexWrap:"wrap",gap:"1rem"}}>
          <div>
            <p style={{fontFamily:gs,fontSize:"0.65rem",color:c.muted,letterSpacing:"0.18em",textTransform:"uppercase",fontWeight:600,marginBottom:"0.3rem"}}>Portfolio Hub</p>
            <h1 style={{fontFamily:gs,fontSize:"clamp(1.5rem,3vw,2.2rem)",fontWeight:700,color:c.text,marginBottom:"0.3rem"}}>My Portfolios</h1>
            <p style={{fontFamily:gs,fontSize:"0.88rem",color:c.muted}}>Build, analyse and project your investment portfolios.</p>
          </div>
          {portfolios.length<5&&(
            <button onClick={()=>{setEditingPortfolio(null);setShowBuilder(true);}}
              style={{background:c.text,color:c.bg,border:"none",borderRadius:"7px",padding:"11px 24px",fontFamily:gs,fontSize:"0.84rem",fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:"0.5rem"}}>
              ＋ New Portfolio
            </button>
          )}
        </div>

        {/* ── Portfolio card strip ── */}
        <section style={{marginBottom:"2rem"}}>
          <div className="card-strip">
            {portfolios.map(p=>{
              const isSelected=p.id===selectedId;
              const totalReturn=Math.round((wCAGR(p.holdings)*5)*100);
              return(
                <div key={p.id} onClick={()=>setSelectedId(p.id)}
                  style={{background:isSelected?c.card:c.cg,border:`1.5px solid ${isSelected?c.blue:c.border}`,borderRadius:"14px",padding:"1.25rem",cursor:"pointer",transition:"all 0.22s",minWidth:"210px",flexShrink:0,position:"relative",
                    boxShadow:isSelected
                      ?`0 0 0 3px ${c.blue}22, 0 0 14px 4px ${c.blue}22, 0 4px 18px rgba(0,0,0,0.22)`
                      :"0 2px 12px rgba(0,0,0,0.1)"}}>
                  {/* Action buttons: modern lucide icons */}
                  <div style={{position:"absolute",top:"0.7rem",right:"0.7rem",display:"flex",flexDirection:"column",gap:"4px"}}>
                    <button onClick={e=>{e.stopPropagation();setEditingPortfolio(p);setShowBuilder(true);}}
                      title="Edit" style={{background:c.surface,border:`1px solid ${c.border}`,borderRadius:"5px",width:"26px",height:"26px",cursor:"pointer",color:c.muted,display:"flex",alignItems:"center",justifyContent:"center",transition:"border-color 0.15s"}}
                      onMouseEnter={e=>e.currentTarget.style.borderColor=c.borderHi} onMouseLeave={e=>e.currentTarget.style.borderColor=c.border}>
                      <Pencil size={12}/>
                    </button>
                    <button onClick={e=>{e.stopPropagation();handleDuplicate(p);}}
                      title="Duplicate" style={{background:c.surface,border:`1px solid ${c.border}`,borderRadius:"5px",width:"26px",height:"26px",cursor:"pointer",color:c.muted,display:"flex",alignItems:"center",justifyContent:"center",transition:"border-color 0.15s"}}
                      onMouseEnter={e=>e.currentTarget.style.borderColor=c.borderHi} onMouseLeave={e=>e.currentTarget.style.borderColor=c.border}>
                      <Copy size={12}/>
                    </button>
                    <button onClick={e=>{e.stopPropagation();handleDelete(p.id);}}
                      title="Delete" style={{background:c.red+"10",border:`1px solid ${c.red}45`,borderRadius:"5px",width:"26px",height:"26px",cursor:"pointer",color:c.red,display:"flex",alignItems:"center",justifyContent:"center",transition:"opacity 0.15s"}}
                      onMouseEnter={e=>e.currentTarget.style.opacity="0.75"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                      <Trash2 size={12}/>
                    </button>
                  </div>

                  {/* FIX #4: activeShape on mini pie: no ugly tooltip, shows ticker+% in center */}
                  <PieChart width={80} height={80} style={{margin:"0 auto 0.75rem"}}>
                    <Pie data={p.holdings} dataKey="weight" nameKey="ticker" cx="50%" cy="50%"
                      outerRadius={36} innerRadius={20} paddingAngle={2} strokeWidth={0}
                      activeIndex={cardActiveSlice[p.id]??null}
                      activeShape={CardActiveShape}
                      onMouseEnter={(_,i)=>setCardActiveSlice(prev=>({...prev,[p.id]:i}))}
                      onMouseLeave={()=>setCardActiveSlice(prev=>({...prev,[p.id]:null}))}>
                      {p.holdings.map((h,i)=><Cell key={i} fill={sCol(h.ticker,i)}/>)}
                    </Pie>
                  </PieChart>

                  <p style={{fontFamily:gs,fontSize:"0.92rem",fontWeight:700,color:c.text,marginBottom:"2px"}}>{p.name}</p>
                  <p style={{fontFamily:gs,fontSize:"0.72rem",color:c.muted,marginBottom:"0.75rem"}}>{p.holdings.length} holdings</p>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.4rem"}}>
                    <div style={{background:c.surface,borderRadius:"6px",padding:"0.4rem 0.6rem"}}>
                      <p style={{fontFamily:gs,fontSize:"0.55rem",color:c.muted,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:"2px"}}>Capital</p>
                      <p style={{fontFamily:gs,fontSize:"0.78rem",fontWeight:700,color:c.text}}>${p.capital.toLocaleString()}</p>
                    </div>
                    <div style={{background:c.surface,borderRadius:"6px",padding:"0.4rem 0.6rem"}}>
                      <p style={{fontFamily:gs,fontSize:"0.55rem",color:c.muted,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:"2px"}}>Est. CAGR</p>
                      <p style={{fontFamily:gs,fontSize:"0.78rem",fontWeight:700,color:c.green}}>{(wCAGR(p.holdings)*100).toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              );
            })}
            {portfolios.length<5&&(
              <div onClick={()=>{setEditingPortfolio(null);setShowBuilder(true);}}
                style={{background:"transparent",border:`2px dashed ${c.border}`,borderRadius:"14px",padding:"1.25rem",cursor:"pointer",minWidth:"180px",flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"0.5rem",transition:"border-color 0.18s"}}
                onMouseEnter={e=>e.currentTarget.style.borderColor=c.borderHi}
                onMouseLeave={e=>e.currentTarget.style.borderColor=c.border}>
                <span style={{fontSize:"1.8rem",color:c.muted}}>＋</span>
                <span style={{fontFamily:gs,fontSize:"0.78rem",color:c.muted}}>New Portfolio</span>
                <span style={{fontFamily:gs,fontSize:"0.65rem",color:c.muted,opacity:0.6}}>{5-portfolios.length} remaining</span>
              </div>
            )}
          </div>
        </section>

        {/* ── Portfolio Breakdown ── */}
        {selected&&(
          <section style={{background:c.card,border:`1px solid ${c.border}`,borderRadius:"16px",padding:"1.5rem",marginBottom:"2rem"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.25rem",flexWrap:"wrap",gap:"0.75rem"}}>
              <div>
                <p style={{fontFamily:gs,fontSize:"0.62rem",color:c.muted,letterSpacing:"0.12em",textTransform:"uppercase",fontWeight:600,marginBottom:"2px"}}>{selected.name}</p>
                <h2 style={{fontFamily:gs,fontSize:"1.15rem",fontWeight:700,color:c.text}}>Portfolio Analysis</h2>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:"0.75rem"}}>
                <div style={{textAlign:"center",minWidth:"36px"}}>
                  <p style={{fontFamily:gs,fontSize:"1.3rem",fontWeight:700,color:c.text,lineHeight:1}}>{selected.holdings.length}</p>
                  <p style={{fontFamily:gs,fontSize:"0.5rem",color:c.muted,letterSpacing:"0.06em",textTransform:"uppercase",marginTop:"3px"}}>Holdings</p>
                </div>
                <div style={{width:"1px",height:"32px",background:c.border,flexShrink:0}}/>
                <ScoreCircle score={divScoreVal} c={c} size={44} label="Diversification"/>
                <ScoreCircle score={wAIScore(selected.holdings)} c={c} size={44} label="Avg AI Score"/>
              </div>
            </div>

            {/* Rebalancing alert */}
            {drifted.length>0&&(
              <div style={{background:`${c.amber}12`,border:`1px solid ${c.amber}40`,borderRadius:"8px",padding:"8px 14px",marginBottom:"1.25rem",display:"flex",alignItems:"center",gap:"0.6rem"}}>
                <span style={{color:c.amber}}>⚖</span>
                <span style={{fontFamily:gs,fontSize:"0.76rem",color:c.amber}}>
                  {drifted.map(h=>h.ticker).join(", ")} {drifted.length===1?"has":"have"} drifted &gt;5% from target weight. Consider rebalancing.
                </span>
              </div>
            )}

            {/* Holdings table */}
            <div style={{overflowX:"auto",marginBottom:"1.5rem",borderRadius:"10px",border:`1px solid ${c.border}`}}>
              <table style={{borderCollapse:"collapse",width:"100%",minWidth:"620px"}}>
                <thead>
                  <tr style={{background:c.surface}}>
                    {["Stock","Sector","Weight","Capital","Price"].map(h=>(
                      <th key={h} style={{fontFamily:gs,fontSize:"0.6rem",color:c.muted,letterSpacing:"0.07em",textTransform:"uppercase",fontWeight:600,padding:"8px 12px",textAlign:h==="Stock"||h==="Sector"?"left":"right",whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                    {/* Dividend (public) and Yield (Ultimate only) */}
                    {["Dividend","Yield"].map(h=>(
                      <th key={h} style={{fontFamily:gs,fontSize:"0.6rem",color:c.muted,letterSpacing:"0.07em",textTransform:"uppercase",fontWeight:600,padding:"8px 12px",textAlign:"right",whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                    <th style={{fontFamily:gs,fontSize:"0.6rem",color:c.muted,letterSpacing:"0.07em",textTransform:"uppercase",fontWeight:600,padding:"8px 12px",textAlign:"right",whiteSpace:"nowrap"}}>AI Score</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.holdings.map((h,i)=>{
                    const isDrifted=drifted.find(d=>d.ticker===h.ticker);
                    return(
                      <tr key={h.ticker} style={{borderTop:`1px solid ${c.border}`,background:isDrifted?`${c.amber}06`:"transparent"}}>
                        <td style={{padding:"9px 12px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:"7px"}}>
                            <div style={{width:"10px",height:"10px",borderRadius:"2px",background:sCol(h.ticker,i),flexShrink:0}}/>
                            <div>
                              <div style={{fontFamily:gs,fontSize:"0.86rem",fontWeight:700,color:c.text}}>{h.ticker}</div>
                              <div style={{fontFamily:gs,fontSize:"0.66rem",color:c.muted}}>{h.name}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{padding:"9px 12px",fontFamily:gs,fontSize:"0.76rem",color:c.muted}}>{h.sector}</td>
                        <td style={{padding:"9px 12px",textAlign:"right"}}>
                          <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:"6px"}}>
                            <div style={{width:`${h.weight}px`,maxWidth:"80px",height:"4px",background:sCol(h.ticker,i),borderRadius:"2px",minWidth:"8px"}}/>
                            <span style={{fontFamily:gs,fontSize:"0.82rem",fontWeight:700,color:c.text}}>{h.weight}%</span>
                          </div>
                        </td>
                        <td style={{padding:"9px 12px",textAlign:"right",fontFamily:gs,fontSize:"0.82rem",color:c.text}}>${((h.weight/100)*selected.capital).toLocaleString()}</td>
                        <td style={{padding:"9px 12px",textAlign:"right",fontFamily:gs,fontSize:"0.82rem",color:c.muted}}>${h.price.toFixed(2)}</td>
                        {/* Dividend Yes/No: always public */}
                        <td style={{padding:"9px 12px",textAlign:"right"}}>
                          <span style={{fontFamily:gs,fontSize:"0.72rem",fontWeight:700,color:h.yield>0?c.green:c.muted}}>{h.yield>0?"Yes":"No"}</span>
                        </td>
                        {/* Yield %: Ultimate only */}
                        <td style={{padding:"9px 12px",textAlign:"right",fontFamily:gs,fontSize:"0.82rem",fontWeight:600,color:h.yield>3?c.green:h.yield>0?c.text:c.muted}}>
                          {isUltimate?(h.yield>0?`${h.yield.toFixed(2)}%`:"none"):<LockedCell c={c}/>}
                        </td>
                        <td style={{padding:"9px 12px",textAlign:"right"}}><div style={{display:"flex",justifyContent:"flex-end"}}><ScoreCircle score={h.aiScore} c={c} size={30}/></div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Sector weight: toggle between bar and donut */}
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.75rem"}}>
                <p style={{fontFamily:gs,fontSize:"0.65rem",color:c.muted,letterSpacing:"0.12em",textTransform:"uppercase",fontWeight:600}}>Sector Weights</p>
                <div style={{display:"flex",gap:"0.3rem"}}>
                  {pillBtn(sectorViz==="bar",()=>setSectorViz("bar"),"Bar")}
                  {pillBtn(sectorViz==="donut",()=>setSectorViz("donut"),"Donut")}
                </div>
              </div>
              {sectorViz==="bar"
                ?<SectorBar holdings={selected.holdings} c={c}/>
                :<SectorDonut holdings={selected.holdings} c={c} size={130}/>
              }
            </div>
          </section>
        )}

        {/* ── Charts ── */}
        {selected&&(
          <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(460px,1fr))",gap:"1.5rem",marginBottom:"2rem"}}>

            {/* What If chart */}
            <div style={{background:c.card,border:`1px solid ${c.border}`,borderRadius:"14px",padding:"1.5rem"}}>
              <p style={{fontFamily:gs,fontSize:"0.65rem",color:c.muted,letterSpacing:"0.12em",textTransform:"uppercase",fontWeight:600,marginBottom:"3px"}}>Historical Analysis</p>
              <h3 style={{fontFamily:gs,fontSize:"1rem",fontWeight:700,color:c.text,marginBottom:"1rem"}}>What If I invested in {whatIfYear}?</h3>

              {/* Controls */}
              <div style={{display:"flex",gap:"0.4rem",flexWrap:"wrap",marginBottom:"0.75rem"}}>
                {[2010,2015,2018,2019,2020,2021,2022].map(y=>pillBtn(whatIfYear===y,()=>setWhatIfYear(y),String(y)))}
              </div>
              <div style={{display:"flex",gap:"1.25rem",marginBottom:"1rem",flexWrap:"wrap",alignItems:"center"}}>
                <Toggle on={drip} set={setDrip} label="Include DRIP" locked={!isUltimate}/>
                <Toggle on={inflation} set={setInflation} label="Inflation adj."/>
                {inflation&&(
                  <div style={{display:"flex",alignItems:"center",gap:"5px"}}>
                    <span style={{fontFamily:gs,fontSize:"0.72rem",color:c.muted}}>Rate</span>
                    <select value={inflRate} onChange={e=>setInflRate(+e.target.value)}
                      style={{background:c.surface,border:`1px solid ${c.border}`,borderRadius:"4px",padding:"3px 8px",fontFamily:gs,fontSize:"0.72rem",color:c.text,cursor:"pointer"}}>
                      {[1.5,2,2.5,3,3.5,4].map(r=><option key={r} value={r}>{r}%</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div style={{background:c.surface,borderRadius:"8px",padding:"0.75rem 1rem",marginBottom:"1rem",display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:"0.5rem"}}>
                {[
                  {l:"Initial",v:`$${selected.capital.toLocaleString()}`},
                  {l:"Value Today",v:`$${histData[histData.length-1]?.value?.toLocaleString()||"n/a"}`,col:c.green},
                  {l:"Total Return",v:histData.length>0?`+${(((histData[histData.length-1]?.value||selected.capital)/selected.capital-1)*100).toFixed(0)}%`:"n/a",col:c.green},
                ].map(x=>(
                  <div key={x.l}>
                    <p style={{fontFamily:gs,fontSize:"0.58rem",color:c.muted,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:"2px"}}>{x.l}</p>
                    <p style={{fontFamily:gs,fontSize:"0.95rem",fontWeight:700,color:x.col||c.text}}>{x.v}</p>
                  </div>
                ))}
              </div>

              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={histData} margin={{top:4,right:8,bottom:0,left:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke={c.border} vertical={false}/>
                  <XAxis dataKey="year" tick={{fill:c.muted,fontSize:8,fontFamily:gs}} axisLine={false} tickLine={false} interval={2}/>
                  <YAxis tick={{fill:c.muted,fontSize:8,fontFamily:gs}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v>=1000?(v/1000).toFixed(0)+"k":v}`} width={44}/>
                  <Tooltip content={<ChartTip c={c}/>}/>
                  <Line type="monotone" dataKey="value" name="Portfolio Value" stroke={c.green} strokeWidth={2.5} dot={false} activeDot={{r:4,fill:c.green}}/>
                  {inflation&&<Line type="monotone" dataKey="nominal" name="Nominal" stroke={c.blue} strokeWidth={1.5} dot={false} strokeDasharray="4 3" opacity={0.5}/>}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Projection chart */}
            <div style={{background:c.card,border:`1px solid ${c.border}`,borderRadius:"14px",padding:"1.5rem"}}>
              <p style={{fontFamily:gs,fontSize:"0.65rem",color:c.muted,letterSpacing:"0.12em",textTransform:"uppercase",fontWeight:600,marginBottom:"3px"}}>Forward Projection</p>
              <h3 style={{fontFamily:gs,fontSize:"1rem",fontWeight:700,color:c.text,marginBottom:"1rem"}}>Growth over {projYears} years</h3>

              {/* Controls */}
              <div style={{display:"flex",gap:"0.4rem",flexWrap:"wrap",marginBottom:"0.75rem"}}>
                {[5,10,15,20,25].map(y=>pillBtn(projYears===y,()=>setProjYears(y),`${y}Y`))}
              </div>
              <div style={{display:"flex",gap:"1rem",flexWrap:"wrap",marginBottom:"0.5rem",alignItems:"center"}}>
                <Toggle on={drip} set={setDrip} label="Include DRIP" locked={!isUltimate}/>
                <Toggle on={inflation} set={setInflation} label="Inflation adj."/>
              </div>
              {/* Monthly contribution row */}
              <div style={{display:"flex",alignItems:"center",gap:"0.75rem",marginBottom:"0.75rem",flexWrap:"wrap"}}>
                <Toggle on={addEnabled} set={setAddEnabled} label="Monthly contribution"/>
                {addEnabled&&(
                  <div style={{display:"flex",alignItems:"center",gap:"5px"}}>
                    <span style={{fontFamily:gs,fontSize:"0.72rem",color:c.muted,fontWeight:600}}>$</span>
                    <input type="number" min={0} step={50} value={monthlyAdd}
                      onChange={e=>setMonthlyAdd(Math.max(0,+e.target.value))}
                      style={{width:"76px",background:c.surface,border:`1px solid ${c.borderHi}`,borderRadius:"4px",
                        padding:"4px 8px",fontFamily:gs,fontSize:"0.78rem",fontWeight:700,color:c.text,outline:"none"}}/>
                    <span style={{fontFamily:gs,fontSize:"0.72rem",color:c.muted}}>/ month</span>
                  </div>
                )}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:"0.6rem",marginBottom:"1rem"}}>
                <span style={{fontFamily:gs,fontSize:"0.72rem",color:c.muted}}>Growth adjustment</span>
                <select value={extraGrowth} onChange={e=>setExtraGrowth(+e.target.value)}
                  style={{background:c.surface,border:`1px solid ${c.border}`,borderRadius:"4px",padding:"3px 8px",fontFamily:gs,fontSize:"0.72rem",color:c.text,cursor:"pointer"}}>
                  {[-2,-1,0,1,2,3].map(v=><option key={v} value={v}>{v>=0?"+":""}{v}% (Base {v===0?"estimate":"scenario"})</option>)}
                </select>
              </div>

              <div style={{background:c.surface,borderRadius:"8px",padding:"0.75rem 1rem",marginBottom:"1rem",display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:"0.5rem"}}>
                {[
                  {l:"Today",    v:`$${selected.capital.toLocaleString()}`},
                  {l:`In ${projYears}Y`,v:`$${projData[projData.length-1]?.value?.toLocaleString()||"n/a"}`,col:c.green},
                  ...(addEnabled&&projData[projData.length-1]?.withContrib?[{l:`+Contrib. ${projYears}Y`,v:`$${projData[projData.length-1].withContrib.toLocaleString()}`,col:c.blue}]:[]),
                  {l:"Projected CAGR",v:`${((wCAGR(selected.holdings)+extraGrowth/100)*100).toFixed(1)}%`,col:c.muted},
                ].map(x=>(
                  <div key={x.l}>
                    <p style={{fontFamily:gs,fontSize:"0.58rem",color:c.muted,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:"2px"}}>{x.l}</p>
                    <p style={{fontFamily:gs,fontSize:"0.95rem",fontWeight:700,color:x.col||c.text}}>{x.v}</p>
                  </div>
                ))}
              </div>

              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={projData} margin={{top:4,right:8,bottom:0,left:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke={c.border} vertical={false}/>
                  <XAxis dataKey="year" tick={{fill:c.muted,fontSize:8,fontFamily:gs}} axisLine={false} tickLine={false} interval={Math.floor(projYears/5)}/>
                  <YAxis tick={{fill:c.muted,fontSize:8,fontFamily:gs}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v>=1000?(v/1000).toFixed(0)+"k":v}`} width={44}/>
                  <Tooltip content={<ChartTip c={c}/>}/>
                  <Line type="monotone" dataKey="value" name={inflation?"Adj. Value":"Portfolio Value"} stroke={c.green} strokeWidth={2.5} dot={false} activeDot={{r:4}}/>
                  {inflation&&<Line type="monotone" dataKey="nominal" name="Nominal" stroke={c.green} strokeWidth={1.5} dot={false} strokeDasharray="4 3" opacity={0.45}/>}
                  {addEnabled&&<Line type="monotone" dataKey="withContrib" name={`+$${monthlyAdd}/mo`} stroke={c.blue} strokeWidth={2} dot={false} strokeDasharray="6 3" activeDot={{r:4,fill:c.blue}}/>}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* ── Portfolio Comparison ── */}
        {portfolios.length>=2&&(
          <section style={{background:c.card,border:`1px solid ${c.border}`,borderRadius:"16px",padding:"1.5rem",marginBottom:"2rem"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.25rem",flexWrap:"wrap",gap:"0.75rem"}}>
              <div>
                <p style={{fontFamily:gs,fontSize:"0.62rem",color:c.muted,letterSpacing:"0.12em",textTransform:"uppercase",fontWeight:600,marginBottom:"2px"}}>Compare</p>
                <h2 style={{fontFamily:gs,fontSize:"1.1rem",fontWeight:700,color:c.text}}>Portfolio Performance</h2>
              </div>
              <div style={{display:"flex",gap:"0.4rem",flexWrap:"wrap"}}>
                {[5,10,15,20].map(y=>pillBtn(cmpRange===y,()=>setCmpRange(y),`${y}Y`))}
              </div>
            </div>

            {/* Portfolio selector */}
            <div style={{display:"flex",gap:"0.4rem",flexWrap:"wrap",marginBottom:"1rem"}}>
              {portfolios.map(p=>{
                const on=cmpIds.includes(p.id);
                return(
                  <button key={p.id} onClick={()=>setCmpIds(prev=>on?prev.length>2?prev.filter(x=>x!==p.id):prev:[...prev,p.id])}
                    style={{background:on?sCol(p.id,portfolios.indexOf(p))+"25":"transparent",color:on?sCol(p.id,portfolios.indexOf(p)):c.muted,border:`1px solid ${on?sCol(p.id,portfolios.indexOf(p)):c.border}`,borderRadius:"50px",padding:"4px 14px",fontFamily:gs,fontSize:"0.73rem",fontWeight:600,cursor:"pointer",transition:"all 0.15s"}}>
                    {p.name}
                  </button>
                );
              })}
            </div>

            {/* Normalised performance chart (base=100) */}
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={cmpData} margin={{top:4,right:8,bottom:0,left:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke={c.border} vertical={false}/>
                <XAxis dataKey="year" tick={{fill:c.muted,fontSize:8,fontFamily:gs}} axisLine={false} tickLine={false} interval={Math.floor(cmpRange/5)}/>
                <YAxis tick={{fill:c.muted,fontSize:8,fontFamily:gs}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}`} width={36} unit=""/>
                <Tooltip content={<ChartTip c={c} prefix=""/>}/>
                <Legend wrapperStyle={{fontFamily:gs,fontSize:"0.72rem",paddingTop:"0.75rem"}}/>
                {cmpPortfolios.map((p,i)=>(
                  <Line key={p.id} type="monotone" dataKey={p.id} name={p.name} stroke={PALETTE[i%PALETTE.length]} strokeWidth={2.5} dot={false} activeDot={{r:4}}/>
                ))}
              </LineChart>
            </ResponsiveContainer>
            <p style={{fontFamily:gs,fontSize:"0.64rem",color:c.muted,marginTop:"4px"}}>Indexed to 100 at start. Shows relative growth, not absolute value.</p>

            {/* Summary table */}
            <div style={{overflowX:"auto",marginTop:"1.25rem",borderRadius:"10px",border:`1px solid ${c.border}`}}>
              <table style={{borderCollapse:"collapse",width:"100%",minWidth:"500px"}}>
                <thead>
                  <tr style={{background:c.surface}}>
                    {/* Portfolio, Capital, Holdings, Est. CAGR, Weighted Yield, Div. Score, Avg AI Score */}
                    {["Portfolio","Capital","Holdings","Est. CAGR"].map(h=>(
                      <th key={h} style={{fontFamily:gs,fontSize:"0.6rem",color:c.muted,letterSpacing:"0.07em",textTransform:"uppercase",fontWeight:600,padding:"8px 12px",textAlign:h==="Portfolio"?"left":"right",whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                    <th style={{fontFamily:gs,fontSize:"0.6rem",color:c.muted,letterSpacing:"0.07em",textTransform:"uppercase",fontWeight:600,padding:"8px 12px",textAlign:"right",whiteSpace:"nowrap"}}>Weighted Yield</th>
                    {["Div. Score","Avg AI Score"].map(h=>(
                      <th key={h} style={{fontFamily:gs,fontSize:"0.6rem",color:c.muted,letterSpacing:"0.07em",textTransform:"uppercase",fontWeight:600,padding:"8px 12px",textAlign:"right",whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cmpPortfolios.map((p,i)=>(
                    <tr key={p.id} style={{borderTop:`1px solid ${c.border}`}}>
                      <td style={{padding:"9px 12px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:"7px"}}>
                          <div style={{width:"10px",height:"10px",borderRadius:"50%",background:PALETTE[i%PALETTE.length],flexShrink:0}}/>
                          <span style={{fontFamily:gs,fontSize:"0.84rem",fontWeight:700,color:c.text}}>{p.name}</span>
                        </div>
                      </td>
                      <td style={{padding:"9px 12px",textAlign:"right",fontFamily:gs,fontSize:"0.82rem",color:c.text}}>${p.capital.toLocaleString()}</td>
                      <td style={{padding:"9px 12px",textAlign:"right",fontFamily:gs,fontSize:"0.82rem",color:c.muted}}>{p.holdings.length}</td>
                      <td style={{padding:"9px 12px",textAlign:"right",fontFamily:gs,fontSize:"0.82rem",fontWeight:700,color:c.green}}>{(wCAGR(p.holdings)*100).toFixed(1)}%</td>
                      <td style={{padding:"9px 12px",textAlign:"right"}}>
                        {isUltimate
                          ?<span style={{fontFamily:gs,fontSize:"0.82rem",color:wYield(p.holdings)*100>2?c.green:c.text}}>{(wYield(p.holdings)*100).toFixed(2)}%</span>
                          :<LockedCell c={c}/>
                        }
                      </td>
                      <td style={{padding:"9px 12px",textAlign:"right"}}><div style={{display:"flex",justifyContent:"flex-end"}}><ScoreCircle score={divScore(p.holdings)} c={c} size={30}/></div></td>
                      <td style={{padding:"9px 12px",textAlign:"right"}}><div style={{display:"flex",justifyContent:"flex-end"}}><ScoreCircle score={wAIScore(p.holdings)} c={c} size={30}/></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── Terms Glossary (Dividends-style) ── */}
        <TermsGlossary c={c}/>

        <p style={{fontFamily:gs,color:c.muted,fontSize:"0.68rem",textAlign:"center"}}>
          For informational purposes only · Not financial advice · Projections are estimates, not guarantees · Data via Financial Modeling Prep
        </p>
      </div>

      {/* Builder modal */}
      {showBuilder&&(
        <Builder c={c} mode={mode}
          initial={editingPortfolio}
          onSave={handleSave}
          onCancel={()=>{setShowBuilder(false);setEditingPortfolio(null);}}
        />
      )}
    </div>
  );
}