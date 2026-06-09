"use client";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/lib/theme";
import { createClient } from "@/lib/supabase";
import {
  ComposedChart, LineChart, Line, Area, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

// ─── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  dark: {
    bg:"#090909",card:"#111113",surface:"#141416",border:"#232325",borderHi:"#333336",
    text:"#F0F0F0",muted:"#7A7A80",green:"#00E676",greenDim:"rgba(0,230,118,0.10)",
    blue:"#4488FF",blueDim:"rgba(68,136,255,0.12)",red:"#FF1800",amber:"#F59E0B",
    cg:"linear-gradient(145deg,#131316,#0F0F12)",
  },
  light: {
    bg:"#F7F7F5",card:"#FFFFFF",surface:"#EEEEED",border:"#DEDEDD",borderHi:"#BABAB8",
    text:"#0A0A0A",muted:"#606065",green:"#008A38",greenDim:"rgba(0,138,56,0.09)",
    blue:"#1E55CC",blueDim:"rgba(30,85,204,0.09)",red:"#CC0000",amber:"#B45309",
    cg:"linear-gradient(145deg,#FFFFFF,#F2F2F0)",
  },
};
const gs = "'Google Sans Flex','DM Sans',sans-serif";

// ─── Sector / market filters (matching Discovery module) ───────────────────────
const SECTORS = [
  "All","Technology","Financials","Healthcare","Energy",
  "Consumer Discretionary","Consumer Staples","Industrials","Materials",
  "Real Estate","Utilities","Communication","Defence","Automotive",
  "Mining","Luxury","Biotech",
];
const MARKETS = [
  {id:"All",label:"All",   on:true },
  {id:"US", label:"US",    on:true },
  {id:"EU", label:"EU 🔜", on:false},
  {id:"UK", label:"UK 🔜", on:false},
];
const FEATURED = ["KO","PG","ABBV","O","CVX","JNJ","XOM","PEP"];

// ─── Mock dividend stocks (replaced by FMP screener once Starter plan active) ──
const MOCK_STOCKS = [
  {ticker:"JNJ", name:"Johnson & Johnson",  sector:"Healthcare",    market:"US",mktCap:380,price:151.80,chg:0.42, yield:3.14,dps:4.76,payout:44,safety:82,growth:68,h:{2021:4.24,2022:4.52,2023:4.76,2024:4.96,2025:5.12}},
  {ticker:"KO",  name:"Coca-Cola",           sector:"Staples",       market:"US",mktCap:265,price:61.20, chg:-0.18,yield:3.08,dps:1.88,payout:75,safety:78,growth:55,h:{2021:1.68,2022:1.76,2023:1.84,2024:1.88,2025:1.94}},
  {ticker:"PG",  name:"Procter & Gamble",    sector:"Staples",       market:"US",mktCap:350,price:142.60,chg:0.85, yield:2.51,dps:3.76,payout:60,safety:84,growth:72,h:{2021:3.24,2022:3.48,2023:3.68,2024:3.76,2025:3.92}},
  {ticker:"MCD", name:"McDonald's",          sector:"Discretionary", market:"US",mktCap:205,price:278.40,chg:1.20, yield:2.29,dps:6.68,payout:51,safety:76,growth:74,h:{2021:5.25,2022:5.66,2023:6.08,2024:6.68,2025:7.08}},
  {ticker:"O",   name:"Realty Income",       sector:"Real Estate",   market:"US",mktCap:45, price:54.20, chg:-0.32,yield:5.60,dps:3.08,payout:76,safety:71,growth:58,h:{2021:2.81,2022:2.97,2023:3.07,2024:3.08,2025:3.12}},
  {ticker:"VZ",  name:"Verizon",             sector:"Communication", market:"US",mktCap:162,price:39.80, chg:-0.54,yield:6.63,dps:2.66,payout:52,safety:62,growth:41,h:{2021:2.51,2022:2.56,2023:2.61,2024:2.66,2025:2.71}},
  {ticker:"PEP", name:"PepsiCo",             sector:"Staples",       market:"US",mktCap:195,price:140.80,chg:0.33, yield:3.60,dps:5.06,payout:68,safety:80,growth:65,h:{2021:4.25,2022:4.53,2023:4.92,2024:5.06,2025:5.22}},
  {ticker:"ABBV",name:"AbbVie",              sector:"Healthcare",    market:"US",mktCap:325,price:183.60,chg:1.45, yield:3.42,dps:6.20,payout:48,safety:77,growth:78,h:{2021:5.20,2022:5.64,2023:5.92,2024:6.20,2025:6.52}},
  {ticker:"XOM", name:"Exxon Mobil",         sector:"Energy",        market:"US",mktCap:490,price:114.20,chg:0.92, yield:3.41,dps:3.80,payout:41,safety:73,growth:62,h:{2021:3.49,2022:3.52,2023:3.64,2024:3.80,2025:3.96}},
  {ticker:"CVX", name:"Chevron",             sector:"Energy",        market:"US",mktCap:267,price:142.40,chg:0.68, yield:4.35,dps:6.04,payout:56,safety:75,growth:66,h:{2021:5.36,2022:5.68,2023:5.92,2024:6.04,2025:6.24}},
  {ticker:"T",   name:"AT&T",                sector:"Communication", market:"US",mktCap:148,price:20.40, chg:-0.21,yield:5.06,dps:1.11,payout:48,safety:59,growth:38,h:{2021:2.08,2022:1.11,2023:1.11,2024:1.11,2025:1.11}},
  {ticker:"TGT", name:"Target",              sector:"Discretionary", market:"US",mktCap:42, price:90.20, chg:0.56, yield:4.32,dps:4.40,payout:58,safety:69,growth:60,h:{2021:3.60,2022:3.84,2023:4.08,2024:4.40,2025:4.52}},
  {ticker:"WMT", name:"Walmart",             sector:"Staples",       market:"US",mktCap:680,price:84.60, chg:0.34, yield:1.03,dps:0.83,payout:31,safety:85,growth:55,h:{2021:2.20,2022:2.24,2023:2.28,2024:0.83,2025:0.88}},
  {ticker:"MMM", name:"3M",                  sector:"Industrials",   market:"US",mktCap:62, price:108.60,chg:-0.84,yield:2.58,dps:2.80,payout:41,safety:64,growth:45,h:{2021:5.92,2022:5.96,2023:6.00,2024:2.80,2025:2.80}},
  {ticker:"NKE", name:"Nike",                sector:"Discretionary", market:"US",mktCap:88, price:73.40, chg:-1.20,yield:2.18,dps:1.40,payout:39,safety:66,growth:58,h:{2021:1.10,2022:1.22,2023:1.34,2024:1.40,2025:1.48}},
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
const tenYrGrowthPct = s => {
  const yrs = Object.keys(s.h).sort();
  const f = s.h[+yrs[0]], l = s.h[+yrs[yrs.length-1]];
  return f && f>0 ? ((l-f)/f*100) : null;
};
const qualityScore = s => Math.round(Math.min(100, s.safety*0.5 + s.growth*0.3 + Math.min(s.yield,7)/7*100*0.2));
const isConsistent = s => {
  const v = Object.entries(s.h).sort(([a],[b])=>+a-+b).map(([,x])=>x);
  for(let i=1;i<v.length;i++) if(v[i]<=v[i-1]) return false;
  return true;
};
const fmt = (v,d=2) => v!=null ? (+v).toFixed(d) : "—";
function buildChartData(stock, view) {
  const yrs = Object.entries(stock.h).sort(([a],[b])=>+a-+b);
  const lastDps = yrs[yrs.length-1][1];
  const annual = yrs.map(([yr,dps],i)=>({year:yr,dps,price:+(stock.price*(dps/lastDps)*(0.75+i*0.03)).toFixed(2)}));
  if(view==="annual") return {data:annual,xKey:"year"};
  const quarterly = annual.flatMap(({year,dps,price})=>
    ["Q1","Q2","Q3","Q4"].map((q,qi)=>({
      label:`${year} ${q}`,
      dps:+(dps/4+(qi===3?0.005:qi===0?-0.004:0)).toFixed(4),
      price:+(price*(1+(qi-1.5)*0.01)).toFixed(2),
    }))
  );
  return {data:quarterly,xKey:"label"};
}

// ─── Glossary terms (global vocabulary, clear differentiation) ─────────────────
const GLOSSARY = [
  {term:"Market Cap",       def:"Total market value of a company's shares outstanding. Indicates company size: large-cap (>$10B), mid-cap ($2–10B), small-cap (<$2B)."},
  {term:"Dividend Yield",   def:"Annual dividends as a percentage of the current share price. A 4% yield on a $50 stock pays $2 per share per year."},
  {term:"Payout Ratio",     def:"Percentage of net earnings distributed as dividends. Below 60% is generally sustainable; above 80% may indicate the dividend is under pressure."},
  {term:"Ann. DPS",         def:"Annual Dividends Per Share. The total dividends paid to each shareholder over the past 12 months."},
  {term:"DRIP",             def:"Dividend Reinvestment Plan. Dividends are used to purchase additional shares automatically instead of being paid in cash, compounding returns over time."},
  {term:"Growth Score",     def:"Clarinvest's 0–100 score estimating the likelihood and pace of future dividend increases. Based on historical DPS growth, earnings trajectory, and remaining payout capacity."},
  {term:"Safety Score",     def:"Clarinvest's 0–100 score measuring the sustainability of the current dividend. Based on payout ratio, debt levels, free cash flow coverage, and revenue stability."},
  {term:"Quality Score",    def:"Clarinvest composite: Safety (50%) + Growth (30%) + yield contribution (20%). A single number to compare dividend stocks at a glance."},
];

// ─── Mini score circle ─────────────────────────────────────────────────────────
function MiniScore({score,c,size=36}){
  const col=score>=70?c.green:score>=50?c.amber:c.red;
  const r=(size-5)/2,cx2=size/2,circ=2*Math.PI*r,off=circ*(1-score/100);
  return(
    <div style={{position:"relative",width:size,height:size,display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
      <div style={{position:"absolute",inset:"5px",borderRadius:"50%",background:`radial-gradient(circle,${col}28 0%,transparent 75%)`,filter:"blur(4px)"}}/>
      <svg width={size} height={size} style={{position:"absolute",top:0,left:0,transform:"rotate(-90deg)"}}>
        <circle cx={cx2} cy={cx2} r={r} fill="none" stroke={c.border} strokeWidth="3"/>
        <circle cx={cx2} cy={cx2} r={r} fill="none" stroke={col} strokeWidth="3" strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"/>
      </svg>
      <span style={{fontFamily:gs,fontSize:"0.6rem",fontWeight:800,color:col,position:"relative",zIndex:1,lineHeight:1}}>{score}</span>
    </div>
  );
}

// ─── Gauge ─────────────────────────────────────────────────────────────────────
function Gauge({score,label,c,size=150}){
  const uid=`g${size}${score}${label.replace(/\W/g,"")}`;
  const cx=size/2,cy=size*0.56,r=size*0.41,nr=size*0.34,sw=size*0.067;
  const col=score>=70?c.green:score>=40?c.amber:c.red;
  const sl=score>=70?"STRONG":score>=40?"MODERATE":"WEAK";
  const z1a=Math.PI*0.67,z2a=Math.PI*0.33;
  const z1x=+(cx+r*Math.cos(z1a)).toFixed(2),z1y=+(cy-r*Math.sin(z1a)).toFixed(2);
  const z2x=+(cx+r*Math.cos(z2a)).toFixed(2),z2y=+(cy-r*Math.sin(z2a)).toFixed(2);
  const a=Math.PI*(1-score/100);
  const ex=+(cx+r*Math.cos(a)).toFixed(2),ey=+(cy-r*Math.sin(a)).toFixed(2);
  const nx=+(cx+nr*Math.cos(a)).toFixed(2),ny=+(cy-nr*Math.sin(a)).toFixed(2);
  const sd=(size*0.016).toFixed(1);
  const h=cy+24;
  return(
    <div style={{textAlign:"center"}}>
      <svg width={size} height={h} viewBox={`-4 -4 ${size+8} ${h+4}`} style={{overflow:"visible"}}>
        <defs>
          <filter id={uid} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation={sd} result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id={`${uid}h`} x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur in="SourceGraphic" stdDeviation={+(size*0.025).toFixed(1)}/>
          </filter>
        </defs>
        <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${z1x} ${z1y}`} fill="none" stroke={`${c.red}25`} strokeWidth={sw} strokeLinecap="butt"/>
        <path d={`M ${z1x} ${z1y} A ${r} ${r} 0 0 1 ${z2x} ${z2y}`} fill="none" stroke={`${c.amber}25`} strokeWidth={sw} strokeLinecap="butt"/>
        <path d={`M ${z2x} ${z2y} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`} fill="none" stroke={`${c.green}25`} strokeWidth={sw} strokeLinecap="butt"/>
        {score>0&&<>
          <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${ex} ${ey}`} fill="none" stroke={col} strokeWidth={sw*2.2} strokeLinecap="round" opacity="0.38" filter={`url(#${uid})`}/>
          <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${ex} ${ey}`} fill="none" stroke={col} strokeWidth={sw} strokeLinecap="round"/>
        </>}
        <line x1={cx+1.5} y1={cy+1.5} x2={+(nx+1.5).toFixed(2)} y2={+(ny+1.5).toFixed(2)} stroke="rgba(0,0,0,0.25)" strokeWidth="2.5" strokeLinecap="round"/>
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={col} strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx={cx} cy={cy} r={size*0.075} fill={col} opacity="0.25" filter={`url(#${uid}h)`}/>
        <circle cx={cx} cy={cy} r={size*0.044} fill={c.card} stroke={c.border} strokeWidth="1.5"/>
        <circle cx={cx} cy={cy} r={size*0.02} fill={col}/>
        <text x={cx} y={cy-r*0.3} textAnchor="middle" fontFamily={gs} fontSize={size*0.165} fontWeight="800" fill={c.text}>{score}</text>
        <text x={cx} y={cy+17} textAnchor="middle" fontFamily={gs} fontSize={size*0.072} fontWeight="700" fill={col} letterSpacing="0.055em">{sl}</text>
        <text x={cx-r} y={cy+21} textAnchor="middle" fontFamily={gs} fontSize={size*0.066} fill={c.red} opacity="0.6">LOW</text>
        <text x={cx+r} y={cy+21} textAnchor="middle" fontFamily={gs} fontSize={size*0.066} fill={c.green} opacity="0.6">HIGH</text>
      </svg>
      <p style={{fontFamily:gs,fontSize:"0.76rem",fontWeight:600,color:c.text,marginTop:"2px"}}>{label}</p>
    </div>
  );
}

// ─── Toggle ─────────────────────────────────────────────────────────────────────
function Toggle({on,onToggle,label,c,mode}){
  return(
    <button onClick={onToggle} style={{display:"flex",alignItems:"center",gap:"0.5rem",background:"none",border:"none",cursor:"pointer",padding:0}}>
      <div style={{width:"36px",height:"20px",borderRadius:"10px",background:on?c.green:c.border,position:"relative",transition:"background 0.2s",flexShrink:0}}>
        <div style={{position:"absolute",top:"2px",left:on?"18px":"2px",width:"16px",height:"16px",borderRadius:"50%",background:on?(mode==="dark"?"#050505":"#FFFFFF"):c.muted,transition:"left 0.2s"}}/>
      </div>
      <span style={{fontFamily:gs,fontSize:"0.78rem",color:on?c.text:c.muted,fontWeight:on?600:400}}>{label}</span>
    </button>
  );
}

// ─── Chart tooltip ─────────────────────────────────────────────────────────────
function DualTip({active,payload,label,c}){
  if(!active||!payload?.length)return null;
  return(
    <div style={{background:c.card,border:`1px solid ${c.borderHi}`,borderRadius:"6px",padding:"8px 12px",minWidth:"120px"}}>
      <p style={{fontFamily:gs,fontSize:"0.68rem",color:c.muted,marginBottom:"5px"}}>{label}</p>
      {payload.map((p,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:"0.4rem",marginBottom:"2px"}}>
          <span style={{width:"8px",height:"8px",borderRadius:"50%",background:p.color,flexShrink:0}}/>
          <span style={{fontFamily:gs,fontSize:"0.78rem",fontWeight:700,color:p.color}}>
            {p.dataKey==="price"?`$${(+p.value).toFixed(2)}`:`$${(+p.value).toFixed(4)} DPS`}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Stock detail modal ────────────────────────────────────────────────────────
function StockModal({stock,divData,divLoading,c,mode,onClose,onFullAnalysis}){
  const [chartView,setChartView]=useState("annual");
  const [chartType,setChartType]=useState("bar");
  const [activeBar,setActiveBar]=useState(null);

  useEffect(()=>{
    const h=e=>{if(e.key==="Escape")onClose();};
    window.addEventListener("keydown",h);
    return()=>window.removeEventListener("keydown",h);
  },[onClose]);

  if(!stock)return null;
  const pos=stock.chg>=0;
  const safety = divData?.safetyScore ?? stock.safety ?? null;
  const growth  = divData?.growthScore  ?? stock.growth  ?? null;
  const scorecol = safety>=70?c.green:safety>=50?c.amber:c.red;

  const {data:rawData,xKey} = buildChartData(stock,chartView);
  const data = rawData.map((d,i)=>({...d,_i:i}));
  const n = data.length;
  const barSz = chartView==="quarterly"?5:13;

  const Pill=({val,cur,set,label})=>(
    <button onClick={()=>set(val)} style={{background:cur===val?c.text:"transparent",color:cur===val?c.bg:c.muted,border:`1px solid ${cur===val?c.text:c.border}`,borderRadius:"4px",padding:"3px 9px",fontFamily:gs,fontSize:"0.67rem",fontWeight:600,cursor:"pointer"}}>{label}</button>
  );

  return(
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.62)",zIndex:400,backdropFilter:"blur(4px)"}}/>
      <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:"min(600px,93vw)",maxHeight:"90vh",overflowY:"auto",background:mode==="dark"?"#0E0E10":"#FFFFFF",border:`1px solid ${c.borderHi}`,borderRadius:"16px",boxShadow:"0 32px 80px rgba(0,0,0,0.5)",zIndex:401}}>
        {/* Header */}
        <div style={{padding:"1.25rem 1.5rem",borderBottom:`1px solid ${c.border}`,display:"flex",justifyContent:"space-between",alignItems:"flex-start",position:"sticky",top:0,background:mode==="dark"?"#0E0E10":"#FFFFFF",zIndex:1}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:"0.5rem",marginBottom:"2px"}}>
              <span style={{fontFamily:gs,fontSize:"1.3rem",fontWeight:700,color:c.text}}>{stock.ticker}</span>
              {safety!=null&&(
                <span style={{fontFamily:gs,fontSize:"0.58rem",fontWeight:700,color:scorecol,background:`${scorecol}18`,border:`1px solid ${scorecol}40`,borderRadius:"4px",padding:"2px 7px",letterSpacing:"0.05em",textTransform:"uppercase"}}>
                  {safety>=80?"High Safety":safety>=65?"Moderate Safety":"Lower Safety"}
                </span>
              )}
            </div>
            <p style={{fontFamily:gs,fontSize:"0.78rem",color:c.muted}}>{stock.name} · {stock.sector}</p>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:"0.75rem"}}>
            <div style={{textAlign:"right"}}>
              <p style={{fontFamily:gs,fontSize:"1.1rem",fontWeight:700,color:c.text}}>${fmt(stock.price)}</p>
              <p style={{fontFamily:gs,fontSize:"0.75rem",fontWeight:600,color:pos?c.green:c.red}}>{pos?"▲":"▼"}{Math.abs(stock.chg).toFixed(2)}%</p>
            </div>
            <button onClick={onClose} style={{background:c.surface,border:`1px solid ${c.border}`,borderRadius:"6px",padding:"6px 10px",cursor:"pointer",color:c.muted,fontFamily:gs,fontSize:"0.78rem",display:"flex",alignItems:"center",gap:"4px"}}>
              ✕<span style={{fontSize:"0.58rem",opacity:0.6}}>ESC</span>
            </button>
          </div>
        </div>

        <div style={{padding:"1.5rem"}}>
          {/* Gauges */}
          {divLoading ? (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.75rem",marginBottom:"1.25rem"}}>
              {[1,2].map(i=><div key={i} style={{background:c.surface,borderRadius:"10px",height:"160px",animation:"pulse 1.4s ease infinite"}}/>)}
            </div>
          ) : safety!=null && growth!=null ? (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.75rem",marginBottom:"1.25rem"}}>
              <div style={{background:c.surface,borderRadius:"10px",padding:"1rem",display:"flex",justifyContent:"center"}}><Gauge score={safety} label="Dividend Safety" c={c} size={135}/></div>
              <div style={{background:c.surface,borderRadius:"10px",padding:"1rem",display:"flex",justifyContent:"center"}}><Gauge score={growth} label="Dividend Growth" c={c} size={135}/></div>
            </div>
          ) : null}

          {/* Key metrics */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"0.5rem",marginBottom:"1.25rem"}}>
            {[
              {l:"Annual Yield",  v: divData?.dividendYield ? `${(divData.dividendYield*100).toFixed(2)}%` : `${fmt(stock.yield)}%`,  col:stock.yield>3?c.green:c.text},
              {l:"Ann. DPS",      v: divData?.annualDPS     ? `$${fmt(divData.annualDPS,4)}`              : `$${fmt(stock.dps)}`,       col:c.text},
              {l:"Payout Ratio",  v: divData?.payoutRatio   ? `${(divData.payoutRatio*100).toFixed(1)}%`  : `${stock.payout}%`,         col:stock.payout<60?c.green:stock.payout<80?c.amber:c.red},
              {l:"Ex-Dividend",   v: divData?.exDate        ? divData.exDate  : "—", col:c.text},
              {l:"Payment Date",  v: divData?.paymentDate   ? divData.paymentDate : "—", col:c.text},
              {l:"10-Yr Growth",  v: tenYrGrowthPct(stock)!=null?`+${tenYrGrowthPct(stock).toFixed(0)}%`:"—", col:c.green},
            ].map(m=>(
              <div key={m.l} style={{background:c.surface,borderRadius:"7px",padding:"0.6rem 0.75rem"}}>
                <p style={{fontFamily:gs,fontSize:"0.57rem",color:c.muted,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:"3px"}}>{m.l}</p>
                <p style={{fontFamily:gs,fontSize:"0.88rem",fontWeight:700,color:m.col}}>{m.v}</p>
              </div>
            ))}
          </div>

          {/* Chart controls */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.75rem",flexWrap:"wrap",gap:"0.5rem"}}>
            <div>
              <p style={{fontFamily:gs,fontSize:"0.65rem",color:c.muted,letterSpacing:"0.09em",textTransform:"uppercase",fontWeight:600,marginBottom:"3px"}}>Price & Dividend History</p>
              <div style={{display:"flex",alignItems:"center",gap:"0.85rem"}}>
                <div style={{display:"flex",alignItems:"center",gap:"4px"}}><span style={{width:"12px",height:"2px",background:c.blue,display:"inline-block",borderRadius:"1px"}}/><span style={{fontFamily:gs,fontSize:"0.64rem",color:c.muted}}>Price</span></div>
                <div style={{display:"flex",alignItems:"center",gap:"4px"}}><span style={{width:"10px",height:"8px",borderRadius:"2px",background:c.green,opacity:0.7,display:"inline-block"}}/><span style={{fontFamily:gs,fontSize:"0.64rem",color:c.muted}}>Div / Share</span></div>
              </div>
            </div>
            <div style={{display:"flex",gap:"0.3rem"}}>
              <Pill val="annual"    cur={chartView} set={setChartView} label="Annual"/>
              <Pill val="quarterly" cur={chartView} set={setChartView} label="Quarterly"/>
              <div style={{width:"1px",background:c.border,margin:"0 2px"}}/>
              <Pill val="bar"  cur={chartType} set={setChartType} label="Bar"/>
              <Pill val="line" cur={chartType} set={setChartType} label="Line"/>
            </div>
          </div>

          {/* Synced dual chart — numeric x-axis keeps line flush with edges */}
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={data} margin={{top:8,right:14,bottom:0,left:0}} onMouseLeave={()=>setActiveBar(null)}>
              <defs>
                <linearGradient id="pGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={c.blue} stopOpacity={0.18}/>
                  <stop offset="95%" stopColor={c.blue} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={c.border} vertical={false}/>
              <XAxis dataKey="_i" type="number" domain={[0,n-1]} ticks={data.map((_,i)=>i)}
                tickFormatter={i=>data[i]?.[xKey]??""}
                interval={chartView==="quarterly"?3:1}
                tick={{fill:c.muted,fontSize:8,fontFamily:gs}} axisLine={false} tickLine={false}/>
              <YAxis yAxisId="price" orientation="left"  tick={{fill:c.blue, fontSize:8,fontFamily:gs}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v.toFixed(0)}`} width={36}/>
              <YAxis yAxisId="dps"   orientation="right" tick={{fill:c.green,fontSize:8,fontFamily:gs}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v.toFixed(2)}`} width={40}/>
              <Tooltip content={<DualTip c={c}/>} cursor={{stroke:c.borderHi,strokeWidth:1.5,strokeDasharray:"4 3"}}/>
              <Area yAxisId="price" type="monotone" dataKey="price" stroke={c.blue} strokeWidth={2} fill="url(#pGrad)" dot={false} name="price"/>
              {chartType==="bar"?(
                <Bar yAxisId="dps" dataKey="dps" name="dps" radius={[3,3,0,0]} barSize={barSz}>
                  {data.map((_,i)=>(
                    <Cell key={i} fill={c.green}
                      opacity={activeBar===null?0.40:activeBar===i?0.85:0.15}
                      onMouseEnter={()=>setActiveBar(i)}/>
                  ))}
                </Bar>
              ):(
                <Line yAxisId="dps" type="monotone" dataKey="dps" stroke={c.green} strokeWidth={2.5} dot={{r:3,fill:c.green}} activeDot={{r:5,fill:c.green,stroke:c.card,strokeWidth:2}} name="dps"/>
              )}
            </ComposedChart>
          </ResponsiveContainer>

          {/* CTA */}
          <button onClick={()=>onFullAnalysis(stock.ticker)}
            style={{width:"100%",background:c.text,color:c.bg,border:"none",borderRadius:"8px",padding:"12px",fontFamily:gs,fontSize:"0.84rem",fontWeight:700,cursor:"pointer",marginTop:"1.25rem"}}>
            Full Analysis →
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Compare modal ─────────────────────────────────────────────────────────────
function CompareModal({stocks,c,mode,onClose}){
  useEffect(()=>{
    const h=e=>{if(e.key==="Escape")onClose();};
    window.addEventListener("keydown",h);
    return()=>window.removeEventListener("keydown",h);
  },[onClose]);

  if(!stocks.length)return null;
  const rows=[
    {l:"Price",             fmt:s=>`$${fmt(s.price)}`,               rawKey:"price",  hi:false},
    {l:"Yield",             fmt:s=>`${fmt(s.yield)}%`,               rawKey:"yield",  hi:true},
    {l:"Ann. DPS",          fmt:s=>`$${fmt(s.dps)}`,                 rawKey:"dps",    hi:true},
    {l:"Payout Ratio",      fmt:s=>`${s.payout}%`,                   rawKey:"payout", hi:false},
    {l:"Safety Score",      fmt:s=>String(s.safety),                  rawKey:"safety", hi:true},
    {l:"Growth Score",      fmt:s=>String(s.growth),                  rawKey:"growth", hi:true},
    {l:"Quality Score",     fmt:s=>String(qualityScore(s)),           rawKey:"qualit", hi:true},
    {l:"2021 DPS",          fmt:s=>`$${fmt(s.h[2021])}`,             rawKey:"h2021",  hi:true},
    {l:"2022 DPS",          fmt:s=>`$${fmt(s.h[2022])}`,             rawKey:"h2022",  hi:true},
    {l:"2023 DPS",          fmt:s=>`$${fmt(s.h[2023])}`,             rawKey:"h2023",  hi:true},
    {l:"2024 DPS",          fmt:s=>`$${fmt(s.h[2024])}`,             rawKey:"h2024",  hi:true},
    {l:"2025 DPS",          fmt:s=>`$${fmt(s.h[2025])}`,             rawKey:"h2025",  hi:true},
    {l:"10-Yr DPS Growth",  fmt:s=>{const g=tenYrGrowthPct(s);return g?`+${g.toFixed(0)}%`:"—";}, rawKey:"tenyrgr",hi:true},
    {l:"Raises each year",  fmt:s=>isConsistent(s)?"✓ Yes":"✗ No",   rawKey:"consist",hi:false,special:true},
  ];
  const rawVal=(row,s)=>{
    const k=row.rawKey;
    if(k==="qualit")  return qualityScore(s);
    if(k==="tenyrgr") return tenYrGrowthPct(s)||0;
    if(k==="consist") return isConsistent(s)?1:0;
    if(k.startsWith("h")) return s.h[+k.slice(1)]||0;
    return s[k]??0;
  };
  const best=row=>{const v=stocks.map(s=>rawVal(row,s));return row.hi?Math.max(...v):Math.min(...v);};

  return(
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.62)",zIndex:400,backdropFilter:"blur(4px)"}}/>
      <div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:"min(840px,95vw)",maxHeight:"88vh",overflowY:"auto",background:mode==="dark"?"#0E0E10":"#FFFFFF",border:`1px solid ${c.borderHi}`,borderRadius:"16px",boxShadow:"0 32px 80px rgba(0,0,0,0.5)",zIndex:401}}>
        <div style={{padding:"1.25rem 1.5rem",borderBottom:`1px solid ${c.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,background:mode==="dark"?"#0E0E10":"#FFFFFF"}}>
          <div>
            <p style={{fontFamily:gs,fontSize:"0.62rem",color:c.muted,letterSpacing:"0.12em",textTransform:"uppercase",fontWeight:600}}>Dividend Comparison</p>
            <h3 style={{fontFamily:gs,fontSize:"1.1rem",fontWeight:700,color:c.text}}>{stocks.map(s=>s.ticker).join(" · ")}</h3>
          </div>
          <button onClick={onClose} style={{background:c.surface,border:`1px solid ${c.border}`,borderRadius:"6px",padding:"6px 10px",cursor:"pointer",color:c.muted,fontFamily:gs,fontSize:"0.78rem",display:"flex",alignItems:"center",gap:"4px"}}>✕ <span style={{fontSize:"0.6rem",opacity:0.6}}>ESC</span></button>
        </div>
        <div style={{padding:"0 1.5rem 1.5rem",overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",marginTop:"1rem",minWidth:`${120+stocks.length*115}px`}}>
            <thead>
              <tr>
                <th style={{fontFamily:gs,fontSize:"0.62rem",color:c.muted,textAlign:"left",padding:"6px 0",fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",borderBottom:`1px solid ${c.border}`,minWidth:"130px"}}>Metric</th>
                {stocks.map(s=>(
                  <th key={s.ticker} style={{fontFamily:gs,textAlign:"center",padding:"6px 10px",borderBottom:`1px solid ${c.border}`,minWidth:"115px"}}>
                    <div style={{fontSize:"0.9rem",fontWeight:700,color:c.text}}>{s.ticker}</div>
                    <div style={{fontSize:"0.62rem",color:c.muted,fontWeight:400,marginTop:"1px"}}>{s.name.split(" ")[0]}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row,ri)=>{
                const b=best(row);
                return(
                  <tr key={ri}>
                    <td style={{fontFamily:gs,fontSize:"0.78rem",color:c.muted,padding:"9px 0",borderBottom:`1px solid ${c.border}`}}>{row.l}</td>
                    {stocks.map(s=>{
                      const rv=rawVal(row,s);
                      const isBest=Math.abs(rv-b)<0.001;
                      const isC=row.rawKey==="consist";
                      const tcol=isC?(rv===1?c.green:c.red):(isBest?c.green:c.text);
                      return(
                        <td key={s.ticker} style={{textAlign:"center",padding:"9px 10px",borderBottom:`1px solid ${c.border}`}}>
                          <span style={{fontFamily:gs,fontSize:"0.82rem",fontWeight:isBest?700:500,color:tcol,background:isBest&&!isC?c.greenDim:"transparent",padding:isBest&&!isC?"2px 8px":"0",borderRadius:"4px"}}>
                            {row.fmt(s)}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ─── Featured Stocks carousel — arrows + edge fades on mobile ─────────────────
function FeaturedCarousel({stocks,c,onSelect}){
  const [scrollLeft,setScrollLeft]=useState(0);
  const [maxScroll,setMaxScroll]=useState(0);
  const ref=useRef(null);

  useEffect(()=>{
    if(!ref.current)return;
    const el=ref.current;
    const update=()=>{ setScrollLeft(el.scrollLeft); setMaxScroll(el.scrollWidth-el.clientWidth); };
    update();
    el.addEventListener("scroll",update,{passive:true});
    window.addEventListener("resize",update);
    return()=>{ el.removeEventListener("scroll",update); window.removeEventListener("resize",update); };
  },[]);

  const scroll=dir=>ref.current?.scrollBy({left:dir*180,behavior:"smooth"});
  const showLeft=scrollLeft>8;
  const showRight=maxScroll>8&&scrollLeft<maxScroll-8;

  return(
    <div style={{position:"relative"}}>
      {/* Left fade + arrow */}
      <div className={showLeft?"feat-fade-l feat-fade-vis":"feat-fade-l"}
        style={{position:"absolute",left:0,top:0,bottom:0,width:"60px",background:`linear-gradient(to right,${c.bg} 20%,transparent)`,zIndex:2,pointerEvents:"none",transition:"opacity 0.2s",opacity:showLeft?1:0}}/>
      <button onClick={()=>scroll(-1)} className={showLeft?"feat-arr feat-arr-l feat-arr-vis":"feat-arr feat-arr-l"}
        style={{position:"absolute",left:"6px",top:"50%",transform:"translateY(-50%)",zIndex:3,background:c.card,border:`1px solid ${c.border}`,borderRadius:"50%",width:"28px",height:"28px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:c.text,fontSize:"1rem",fontWeight:300,lineHeight:1,transition:"opacity 0.2s",opacity:showLeft?1:0,pointerEvents:showLeft?"auto":"none",boxShadow:"0 2px 8px rgba(0,0,0,0.25)"}}>
        ‹
      </button>

      {/* Scroll container */}
      <div ref={ref} className="feat-grid">
        {stocks.map(s=>(
          <div key={s.ticker} onClick={()=>onSelect(s)}
            style={{background:c.cg,border:`1px solid ${c.border}`,borderRadius:"10px",padding:"0.85rem",cursor:"pointer",transition:"border-color 0.18s",flexShrink:0}}
            onMouseEnter={e=>e.currentTarget.style.borderColor=c.borderHi}
            onMouseLeave={e=>e.currentTarget.style.borderColor=c.border}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"0.5rem"}}>
              <div>
                <p style={{fontFamily:gs,fontSize:"0.88rem",fontWeight:700,color:c.text}}>{s.ticker}</p>
                <p style={{fontFamily:gs,fontSize:"0.62rem",color:c.muted,marginTop:"1px"}}>{s.name.split(" ")[0]}</p>
              </div>
              <MiniScore score={s.safety} c={c} size={30}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontFamily:gs,fontSize:"0.82rem",fontWeight:700,color:c.green}}>{fmt(s.yield)}%</span>
              <span style={{fontFamily:gs,fontSize:"0.68rem",color:c.muted}}>yield</span>
            </div>
          </div>
        ))}
      </div>

      {/* Right fade + arrow */}
      <div style={{position:"absolute",right:0,top:0,bottom:0,width:"60px",background:`linear-gradient(to left,${c.bg} 20%,transparent)`,zIndex:2,pointerEvents:"none",transition:"opacity 0.2s",opacity:showRight?1:0}}/>
      <button onClick={()=>scroll(1)}
        style={{position:"absolute",right:"6px",top:"50%",transform:"translateY(-50%)",zIndex:3,background:c.card,border:`1px solid ${c.border}`,borderRadius:"50%",width:"28px",height:"28px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:c.text,fontSize:"1rem",fontWeight:300,lineHeight:1,transition:"opacity 0.2s",opacity:showRight?1:0,pointerEvents:showRight?"auto":"none",boxShadow:"0 2px 8px rgba(0,0,0,0.25)"}}>
        ›
      </button>
    </div>
  );
}


// ─── Glossary accordion ────────────────────────────────────────────────────────
function Glossary({c}){
  const [open,setOpen]=useState(false);
  return(
    <div style={{marginTop:"1.25rem"}}>
      <button onClick={()=>setOpen(!open)}
        style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:"0.4rem",padding:"6px 0",fontFamily:gs,fontSize:"0.74rem",color:c.muted,fontWeight:500}}>
        <span style={{transition:"transform 0.2s",display:"inline-block",transform:open?"rotate(90deg)":"rotate(0deg)",fontSize:"0.7rem"}}>▶</span>
        Terms explained
      </button>
      {open&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:"0.6rem",marginTop:"0.75rem",padding:"1rem",background:c.surface,borderRadius:"10px",border:`1px solid ${c.border}`}}>
          {GLOSSARY.map(({term,def})=>(
            <div key={term} style={{padding:"0.75rem",background:c.card,borderRadius:"7px",border:`1px solid ${c.border}`}}>
              <p style={{fontFamily:gs,fontSize:"0.72rem",fontWeight:700,color:c.text,marginBottom:"4px"}}>{term}</p>
              <p style={{fontFamily:gs,fontSize:"0.72rem",color:c.muted,lineHeight:1.6}}>{def}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Screener tab ──────────────────────────────────────────────────────────────
function ScreenerTab({c,mode,stocks,onSelectStock,compareList,onToggleCompare}){
  const [search,setSearch]=useState("");
  const [sfoc,setSfoc]=useState(false);
  const [sector,setSector]=useState("All");
  const [market,setMarket]=useState("All");
  const [sortKey,setSortKey]=useState("yield");
  const [sortDir,setSortDir]=useState("desc");
  const [hovRow,setHovRow]=useState(null);

  const filtered=useMemo(()=>{
    let list=stocks.filter(s=>{
      const q=search.toLowerCase();
      return(!q||s.ticker.toLowerCase().includes(q)||s.name.toLowerCase().includes(q)||s.sector.toLowerCase().includes(q))
        &&(market==="All"||s.market===market)
        &&(sector==="All"||s.sector===sector);
    });
    return [...list].sort((a,b)=>{
      if(sortKey==="name")return sortDir==="asc"?a.name.localeCompare(b.name):b.name.localeCompare(a.name);
      return sortDir==="asc"?a[sortKey]-b[sortKey]:b[sortKey]-a[sortKey];
    });
  },[stocks,search,sector,market,sortKey,sortDir]);

  const toggleSort=k=>{if(sortKey===k)setSortDir(d=>d==="asc"?"desc":"asc");else{setSortKey(k);setSortDir("desc");}};
  const Th=({k,label,align="right",fs="0.6rem"})=>(
    <th onClick={()=>toggleSort(k)}
      style={{fontFamily:gs,fontSize:fs,color:sortKey===k?c.text:c.muted,letterSpacing:"0.07em",textTransform:"uppercase",fontWeight:600,padding:"7px 8px",textAlign:align,cursor:"pointer",whiteSpace:"nowrap",userSelect:"none",background:sortKey===k?c.surface:"transparent",transition:"color 0.15s"}}>
      {label}{sortKey===k?(sortDir==="asc"?" ↑":" ↓"):""}
    </th>
  );

  const featStocks=stocks.filter(s=>FEATURED.includes(s.ticker));

  return(
    <div>
      <div style={{marginBottom:"1rem"}}>
        <p style={{fontFamily:gs,fontSize:"0.65rem",color:c.muted,letterSpacing:"0.18em",textTransform:"uppercase",fontWeight:600,marginBottom:"3px"}}>Dividend-Paying Stocks</p>
        <h2 style={{fontFamily:gs,fontSize:"1.55rem",fontWeight:700,color:c.text}}>Dividend Screener</h2>
      </div>

      {/* Search — 1.25rem margin matching Discovery */}
      <div style={{position:"relative",marginBottom:"1.25rem"}}>
        <span style={{position:"absolute",left:"13px",top:"50%",transform:"translateY(-50%)",color:c.muted,fontSize:"1rem",pointerEvents:"none"}}>⌕</span>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          onFocus={()=>setSfoc(true)} onBlur={()=>setSfoc(false)}
          placeholder="Search by ticker, company, sector or keyword…"
          className={sfoc?"rbow":""}
          style={{width:"100%",background:c.card,border:`1px solid ${sfoc?c.borderHi:c.border}`,borderRadius:"8px",padding:"11px 14px 11px 36px",color:c.text,fontSize:"0.88rem",fontFamily:gs,outline:"none",transition:"border-color 0.18s"}}/>
        {search&&<button onClick={()=>setSearch("")} style={{position:"absolute",right:"12px",top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:c.muted,cursor:"pointer"}}>✕</button>}
      </div>

      {/* Market filter — 0.6rem below, matching Discovery layout */}
      <div style={{display:"flex",gap:"0.4rem",marginBottom:"0.6rem",overflowX:"auto"}}>
        {MARKETS.map(m=>(
          <button key={m.id} onClick={()=>m.on&&setMarket(m.id===market?"All":m.id)}
            title={m.on?m.label:"Coming soon"}
            style={{background:market===m.id?c.text:"transparent",color:market===m.id?c.bg:c.muted,border:`1px solid ${market===m.id?c.text:c.border}`,borderRadius:"50px",padding:"5px 14px",fontFamily:gs,fontSize:"0.73rem",fontWeight:600,cursor:m.on?"pointer":"default",opacity:m.on?1:0.4,whiteSpace:"nowrap",transition:"all 0.18s",flexShrink:0}}>
            {m.label}
          </button>
        ))}
      </div>

      {/* Sector filter — full list matching Discovery */}
      <div style={{display:"flex",gap:"0.4rem",flexWrap:"wrap",marginBottom:"1.5rem"}}>
        {SECTORS.map(s=>(
          <button key={s} onClick={()=>setSector(s===sector?"All":s)}
            style={{background:sector===s?c.text:"transparent",color:sector===s?c.bg:c.muted,border:`1px solid ${sector===s?c.text:c.border}`,borderRadius:"50px",padding:"4px 12px",fontFamily:gs,fontSize:"0.72rem",fontWeight:600,cursor:"pointer",transition:"all 0.15s"}}>
            {s}
          </button>
        ))}
      </div>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.5rem"}}>
        <span style={{fontFamily:gs,fontSize:"0.74rem",color:c.muted}}>{filtered.length} stocks · click to view details · select to compare (max 5)</span>
        {compareList.length>0&&<span style={{fontFamily:gs,fontSize:"0.72rem",color:c.muted}}>{compareList.length} selected</span>}
      </div>

      {/* Table — reduced stock column width + right divider line */}
      <div style={{overflowX:"auto",borderRadius:"12px",border:`1px solid ${c.border}`}}>
        <table style={{borderCollapse:"collapse",width:"100%",minWidth:"960px"}}>
          <thead>
            <tr style={{background:c.surface}}>
              {/* Sticky stock column with divider */}
              <Th k="name" label="Stock" align="left"/>
              <Th k="mktCap" label="Cap"/>
              <Th k="price"  label="Price"/>
              <Th k="yield"  label="Yield %"/>
              <Th k="dps"    label="DPS"/>
              <Th k="payout" label="Payout"/>
              {[2021,2022,2023,2024,2025].map(y=>(
                <th key={y} onClick={()=>toggleSort("h"+y)}
                  style={{fontFamily:gs,fontSize:"0.58rem",color:c.muted,letterSpacing:"0.07em",textTransform:"uppercase",fontWeight:600,padding:"7px 6px",textAlign:"right",cursor:"pointer",whiteSpace:"nowrap",userSelect:"none"}}>
                  {y}
                </th>
              ))}
              <Th k="safety" label="Safety" fs="0.58rem"/>
              <Th k="growth" label="Growth" fs="0.58rem"/>
              <th style={{fontFamily:gs,fontSize:"0.6rem",color:c.muted,letterSpacing:"0.07em",textTransform:"uppercase",fontWeight:600,padding:"8px 10px",textAlign:"center"}}>Compare</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s=>{
              const isHov=hovRow===s.ticker,inCmp=compareList.includes(s.ticker),pos=s.chg>=0;
              return(
                <tr key={s.ticker} onMouseEnter={()=>setHovRow(s.ticker)} onMouseLeave={()=>setHovRow(null)}
                  style={{background:isHov?c.surface:"transparent",cursor:"pointer",transition:"background 0.15s"}}>
                  {/* Sticky col — reduced width, right divider */}
                  <td onClick={()=>onSelectStock(s)}
                    style={{padding:"8px 10px",borderBottom:`1px solid ${c.border}`,borderRight:`1px solid ${c.border}`,position:"sticky",left:0,background:isHov?c.surface:c.bg,minWidth:"120px",maxWidth:"120px"}}>
                    <div style={{fontFamily:gs,fontSize:"0.88rem",fontWeight:700,color:c.text}}>{s.ticker}</div>
                    <div style={{fontFamily:gs,fontSize:"0.67rem",color:c.muted,marginTop:"1px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.name}</div>
                  </td>
                  <td onClick={()=>onSelectStock(s)} style={{padding:"8px 8px",borderBottom:`1px solid ${c.border}`,textAlign:"right",fontFamily:gs,fontSize:"0.78rem",color:c.muted,whiteSpace:"nowrap"}}>${s.mktCap}B</td>
                  <td onClick={()=>onSelectStock(s)} style={{padding:"8px 8px",borderBottom:`1px solid ${c.border}`,textAlign:"right",whiteSpace:"nowrap"}}>
                    <div style={{fontFamily:gs,fontSize:"0.82rem",fontWeight:600,color:c.text}}>${fmt(s.price)}</div>
                    <div style={{fontFamily:gs,fontSize:"0.67rem",color:pos?c.green:c.red}}>{pos?"▲":"▼"}{Math.abs(s.chg).toFixed(2)}%</div>
                  </td>
                  <td onClick={()=>onSelectStock(s)} style={{padding:"8px 8px",borderBottom:`1px solid ${c.border}`,textAlign:"right"}}>
                    <span style={{fontFamily:gs,fontSize:"0.84rem",fontWeight:700,color:s.yield>4?c.green:s.yield>2?c.text:c.muted}}>{fmt(s.yield)}%</span>
                  </td>
                  <td onClick={()=>onSelectStock(s)} style={{padding:"8px 8px",borderBottom:`1px solid ${c.border}`,textAlign:"right",fontFamily:gs,fontSize:"0.82rem",color:c.text,fontWeight:600,whiteSpace:"nowrap"}}>${fmt(s.dps)}</td>
                  <td onClick={()=>onSelectStock(s)} style={{padding:"8px 8px",borderBottom:`1px solid ${c.border}`,textAlign:"right"}}>
                    <span style={{fontFamily:gs,fontSize:"0.8rem",fontWeight:600,color:s.payout<60?c.green:s.payout<80?c.amber:c.red}}>{s.payout}%</span>
                  </td>
                  {[2021,2022,2023,2024,2025].map(y=>(
                    <td key={y} onClick={()=>onSelectStock(s)} style={{padding:"8px 6px",borderBottom:`1px solid ${c.border}`,textAlign:"right",fontFamily:gs,fontSize:"0.76rem",color:c.muted,whiteSpace:"nowrap"}}>${fmt(s.h[y])}</td>
                  ))}
                  <td onClick={()=>onSelectStock(s)} style={{padding:"6px 8px",borderBottom:`1px solid ${c.border}`,textAlign:"right"}}>
                    <div style={{display:"flex",justifyContent:"flex-end"}}><MiniScore score={s.safety} c={c} size={34}/></div>
                  </td>
                  <td onClick={()=>onSelectStock(s)} style={{padding:"6px 8px",borderBottom:`1px solid ${c.border}`,textAlign:"right"}}>
                    <div style={{display:"flex",justifyContent:"flex-end"}}><MiniScore score={s.growth} c={c} size={34}/></div>
                  </td>
                  <td style={{padding:"8px 8px",borderBottom:`1px solid ${c.border}`,textAlign:"center"}}>
                    <button onClick={e=>{e.stopPropagation();onToggleCompare(s.ticker);}}
                      disabled={!inCmp&&compareList.length>=5}
                      style={{width:"20px",height:"20px",borderRadius:"4px",background:inCmp?c.green:c.surface,border:`1px solid ${inCmp?c.green:c.border}`,cursor:(!inCmp&&compareList.length>=5)?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",margin:"auto",transition:"all 0.15s",opacity:(!inCmp&&compareList.length>=5)?0.3:1}}>
                      {inCmp&&<span style={{color:"#050505",fontSize:"0.65rem",fontWeight:700}}>✓</span>}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Featured Dividend Stocks — grid on desktop, scroll carousel with arrows+fade on mobile */}
      <div style={{marginTop:"2rem"}}>
        <p style={{fontFamily:gs,fontSize:"0.65rem",color:c.muted,letterSpacing:"0.18em",textTransform:"uppercase",fontWeight:600,marginBottom:"0.75rem"}}>Featured Dividend Stocks · Updated Monthly</p>
        <FeaturedCarousel stocks={featStocks} c={c} onSelect={onSelectStock}/>
        <Glossary c={c}/>
      </div>
    </div>
  );
}

// ─── Income Planner tab ────────────────────────────────────────────────────────
function PlannerTab({c,mode,stocks}){
  const [advanced,setAdvanced]=useState(false);
  const [principal,setPrincipal]=useState(25000);
  const [yieldPct,setYieldPct]=useState(4.0);
  const [years,setYears]=useState(15);
  const [drip,setDrip]=useState(true);
  const [monthlyAdd,setMonthlyAdd]=useState(200);
  const [divGrowth,setDivGrowth]=useState(5);
  const [inflation,setInflation]=useState(false);
  const [stockSearch,setStockSearch]=useState("");
  const [showDrop,setShowDrop]=useState(false);

  const matches=useMemo(()=>stockSearch.length>0
    ?stocks.filter(s=>s.ticker.includes(stockSearch.toUpperCase())||s.name.toLowerCase().includes(stockSearch.toLowerCase())).slice(0,5)
    :[]
  ,[stockSearch,stocks]);
  const pickStock=s=>{setYieldPct(s.yield);setStockSearch(`${s.ticker} — ${fmt(s.yield)}% yield applied`);setShowDrop(false);};

  const proj=useMemo(()=>{
    const d=[];let pD=principal,pN=principal;
    for(let y=1;y<=years;y++){
      const cy=(yieldPct/100)*Math.pow(1+divGrowth/100,y-1);
      const ann=monthlyAdd*12;
      const f=inflation?Math.pow(0.975,y):1;
      const iD=pD*cy*f,iN=pN*cy*f;
      d.push({year:`Yr ${y}`,withDRIP:Math.round(iD),noDRIP:Math.round(iN)});
      pD+=iD+ann;pN+=ann;
    }
    return d;
  },[principal,yieldPct,years,monthlyAdd,divGrowth,inflation]);

  const finalD=proj[proj.length-1]?.withDRIP??0;
  const finalN=proj[proj.length-1]?.noDRIP??0;
  const total=proj.reduce((a,d)=>a+d.withDRIP,0);

  const Inp=({label,value,set,min=0,step=1})=>(
    <div>
      <label style={{fontFamily:gs,fontSize:"0.72rem",color:c.muted,display:"block",marginBottom:"5px"}}>{label}</label>
      <input type="number" value={value} step={step} min={min} onChange={e=>set(Math.max(min,+e.target.value))}
        style={{width:"100%",background:c.surface,border:`1px solid ${c.borderHi}`,borderRadius:"6px",padding:"9px 12px",fontFamily:gs,fontSize:"0.88rem",color:c.text,outline:"none"}}/>
    </div>
  );

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem",flexWrap:"wrap",gap:"0.75rem"}}>
        <div>
          <p style={{fontFamily:gs,fontSize:"0.65rem",color:c.muted,letterSpacing:"0.18em",textTransform:"uppercase",fontWeight:600,marginBottom:"3px"}}>Dividend Tool</p>
          <h2 style={{fontFamily:gs,fontSize:"1.55rem",fontWeight:700,color:c.text}}>Income Planner</h2>
        </div>
        <Toggle on={advanced} onToggle={()=>setAdvanced(!advanced)} label="Advanced mode" c={c} mode={mode}/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:advanced?"repeat(auto-fit,minmax(260px,1fr))":"1fr 1fr",gap:"1.5rem",marginBottom:"1.75rem"}}>
        <div style={{background:c.card,border:`1px solid ${c.border}`,borderRadius:"14px",padding:"1.5rem",display:"flex",flexDirection:"column",gap:"1rem"}}>
          <p style={{fontFamily:gs,fontSize:"0.82rem",fontWeight:600,color:c.text}}>Parameters</p>
          <div style={{position:"relative"}}>
            <label style={{fontFamily:gs,fontSize:"0.72rem",color:c.muted,display:"block",marginBottom:"5px"}}>Based on stock (auto-fills yield)</label>
            <input value={stockSearch} onChange={e=>{setStockSearch(e.target.value);setShowDrop(true);}}
              onFocus={()=>setShowDrop(true)} onBlur={()=>setTimeout(()=>setShowDrop(false),150)}
              placeholder="Search ticker or company…"
              style={{width:"100%",background:c.surface,border:`1px solid ${c.border}`,borderRadius:"6px",padding:"9px 12px",fontFamily:gs,fontSize:"0.82rem",color:c.text,outline:"none"}}/>
            {showDrop&&matches.length>0&&(
              <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,background:c.card,border:`1px solid ${c.border}`,borderRadius:"7px",zIndex:20,overflow:"hidden",boxShadow:"0 8px 24px rgba(0,0,0,0.25)"}}>
                {matches.map(s=>(
                  <div key={s.ticker} onMouseDown={()=>pickStock(s)}
                    style={{padding:"8px 12px",cursor:"pointer",borderBottom:`1px solid ${c.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}
                    onMouseEnter={e=>e.currentTarget.style.background=c.surface}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <div>
                      <span style={{fontFamily:gs,fontSize:"0.84rem",fontWeight:700,color:c.text}}>{s.ticker}</span>
                      <span style={{fontFamily:gs,fontSize:"0.72rem",color:c.muted,marginLeft:"0.5rem"}}>{s.name}</span>
                    </div>
                    <span style={{fontFamily:gs,fontSize:"0.8rem",fontWeight:700,color:c.green,flexShrink:0}}>{fmt(s.yield)}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Inp label="Initial Investment ($)" value={principal} set={setPrincipal}/>
          <Inp label="Annual Dividend Yield (%)" value={yieldPct} set={setYieldPct} step={0.1}/>
          <Inp label="Investment Period (years)"  value={years}     set={setYears}     min={1}/>
          {advanced&&<>
            <Inp label="Monthly Contribution ($)" value={monthlyAdd} set={setMonthlyAdd}/>
            <Inp label="Expected Annual Dividend Growth (%)" value={divGrowth} set={setDivGrowth} step={0.5}/>
          </>}
          <div style={{display:"flex",flexDirection:"column",gap:"0.65rem",paddingTop:"0.1rem"}}>
            <Toggle on={drip}      onToggle={()=>setDrip(!drip)}           label="Reinvest dividends (DRIP)"   c={c} mode={mode}/>
            {advanced&&<Toggle on={inflation} onToggle={()=>setInflation(!inflation)} label="Inflation-adjusted (2.5%/yr)" c={c} mode={mode}/>}
          </div>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:"0.75rem"}}>
          <div style={{background:c.greenDim,border:`1px solid ${c.green}40`,borderRadius:"12px",padding:"1.25rem"}}>
            <p style={{fontFamily:gs,fontSize:"0.6rem",color:c.green,letterSpacing:"0.1em",textTransform:"uppercase",fontWeight:600,marginBottom:"0.4rem"}}>
              Year {years} Annual Income {drip?"(with DRIP)":"(no DRIP)"}
            </p>
            <p style={{fontFamily:gs,fontSize:"2.6rem",fontWeight:800,color:c.green,lineHeight:1}}>${(drip?finalD:finalN).toLocaleString()}</p>
            <p style={{fontFamily:gs,fontSize:"0.72rem",color:c.green,opacity:0.7,marginTop:"4px"}}>${Math.round((drip?finalD:finalN)/12).toLocaleString()} / month</p>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.6rem"}}>
            {[
              {l:"Total Dividends",  v:`$${total.toLocaleString()}`,                             s:`over ${years} years`},
              {l:"DRIP Advantage",   v:`+$${(finalD-finalN).toLocaleString()}`,                  s:"extra in final year"},
              {l:"Year 1 Monthly",   v:`$${Math.round(principal*yieldPct/100/12).toLocaleString()}`, s:"starting income"},
              {l:"Yield on Cost",    v:`${fmt(yieldPct,1)}%`,                                    s:"current"},
            ].map(s=>(
              <div key={s.l} style={{background:c.surface,borderRadius:"8px",padding:"0.9rem"}}>
                <p style={{fontFamily:gs,fontSize:"0.57rem",color:c.muted,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:"3px"}}>{s.l}</p>
                <p style={{fontFamily:gs,fontSize:"1.05rem",fontWeight:700,color:c.text}}>{s.v}</p>
                <p style={{fontFamily:gs,fontSize:"0.64rem",color:c.muted,marginTop:"1px"}}>{s.s}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{background:c.card,border:`1px solid ${c.border}`,borderRadius:"14px",padding:"1.5rem"}}>
        <p style={{fontFamily:gs,fontSize:"0.88rem",fontWeight:600,color:c.text,marginBottom:"1.25rem"}}>Annual Income Projection — With vs Without DRIP</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={proj} margin={{top:4,right:16,bottom:0,left:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke={c.border} vertical={false}/>
            <XAxis dataKey="year" tick={{fill:c.muted,fontSize:9,fontFamily:gs}} axisLine={false} tickLine={false} interval={Math.floor(years/6)}/>
            <YAxis tick={{fill:c.muted,fontSize:9,fontFamily:gs}} axisLine={false} tickLine={false}
              tickFormatter={v=>`$${v>=1000?(v/1000).toFixed(0)+"k":v}`} width={46}/>
            <Tooltip contentStyle={{background:c.card,border:`1px solid ${c.borderHi}`,borderRadius:"6px",fontFamily:gs}}
              labelStyle={{color:c.muted,fontSize:"0.7rem"}} formatter={(v,n)=>[`$${v.toLocaleString()}`,n]}/>
            <Legend wrapperStyle={{fontFamily:gs,fontSize:"0.72rem",paddingTop:"0.75rem"}}/>
            <Line type="monotone" dataKey="withDRIP" name="With DRIP"    stroke={c.green} strokeWidth={2.5} dot={false}/>
            <Line type="monotone" dataKey="noDRIP"   name="Without DRIP" stroke={c.blue}  strokeWidth={2}   dot={false} strokeDasharray="5 3" opacity={0.6}/>
          </LineChart>
        </ResponsiveContainer>
        <p style={{fontFamily:gs,fontSize:"0.65rem",color:c.muted,marginTop:"0.75rem"}}>
          Illustrative only. Assumes constant yield{advanced?` growing at ${divGrowth}%/yr`:``}. No taxes applied. Dividends are not guaranteed.
        </p>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function DividendsPage(){
  const { mode } = useTheme();
  const c = C[mode];
  const router = useRouter();
  const supabase = createClient();

  const [userPlan,    setUserPlan]   = useState(null);
  const [tab,         setTab]        = useState("screener");
  const [activeStock, setActiveStock]= useState(null);
  const [divData,     setDivData]    = useState({});   // {ticker: {safetyScore, growthScore, ...}}
  const [divLoading,  setDivLoading] = useState({});
  const [compareList, setCompareList]= useState([]);
  const [showCompare, setShowCompare]= useState(false);

  // Auth + plan check
  useEffect(()=>{
    supabase.auth.getUser().then(({data:{user}})=>{
      if(!user){router.push("/login");return;}
      setUserPlan(user.user_metadata?.plan||"essential");
    });
  },[]);

  // Fetch dividend data for a stock when modal opens
  const fetchDivData = useCallback(async (ticker) => {
    if(divData[ticker]||divLoading[ticker]) return;
    setDivLoading(p=>({...p,[ticker]:true}));
    try {
      const res = await fetch(`/api/dividends/${ticker}`);
      const d   = await res.json();
      setDivData(p=>({...p,[ticker]:d}));
    } catch(e){ /* use fallback mock data */ }
    finally { setDivLoading(p=>({...p,[ticker]:false})); }
  },[divData,divLoading]);

  const handleSelectStock = useCallback((s)=>{
    setActiveStock(s);
    fetchDivData(s.ticker);
  },[fetchDivData]);

  const toggleCompare = useCallback(ticker=>{
    setCompareList(p=>p.includes(ticker)?p.filter(t=>t!==ticker):p.length<5?[...p,ticker]:p);
  },[]);

  const compareStocks = MOCK_STOCKS.filter(s=>compareList.includes(s.ticker));

  const isUltimate = userPlan==="ultimate";

  return(
    <div style={{background:c.bg,minHeight:"100vh",fontFamily:gs,color:c.text}}>
      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.45}}
        @keyframes rbow{
          0%  {box-shadow:0 0 0 2px rgba(255,80,80,0.75),0 0 18px 4px rgba(255,80,80,0.25);}
          20% {box-shadow:0 0 0 2px rgba(255,180,50,0.75),0 0 18px 4px rgba(255,180,50,0.25);}
          40% {box-shadow:0 0 0 2px rgba(60,220,120,0.75),0 0 18px 4px rgba(60,220,120,0.25);}
          60% {box-shadow:0 0 0 2px rgba(68,160,255,0.75),0 0 18px 4px rgba(68,160,255,0.25);}
          80% {box-shadow:0 0 0 2px rgba(180,80,255,0.75),0 0 18px 4px rgba(180,80,255,0.25);}
          100%{box-shadow:0 0 0 2px rgba(255,80,80,0.75),0 0 18px 4px rgba(255,80,80,0.25);}
        }
        .rbow{animation:rbow 2.8s linear infinite;border-color:transparent !important;}
        /* Featured stocks: grid on desktop, scroll carousel on mobile */
        .feat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:0.6rem;}
        @media(max-width:700px){
          .feat-grid{display:flex;overflow-x:auto;-ms-overflow-style:none;scrollbar-width:none;padding-bottom:4px;gap:0.6rem;}
          .feat-grid::-webkit-scrollbar{display:none;}
          .feat-grid>div{min-width:145px;flex-shrink:0;}
        }
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-thumb{background:#303032;border-radius:2px;}
        input[type=number]::-webkit-inner-spin-button{opacity:0.35;}
      `}</style>

      <div style={{maxWidth:"1200px",margin:"0 auto",padding:"2.5rem 3.5rem"}}>

        {/* Page header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:"1.75rem",flexWrap:"wrap",gap:"0.75rem"}}>
          <div>
            <p style={{fontFamily:gs,fontSize:"0.65rem",color:c.muted,letterSpacing:"0.18em",textTransform:"uppercase",marginBottom:"0.3rem",fontWeight:600}}>Dividend Intelligence</p>
            <h1 style={{fontFamily:gs,fontSize:"clamp(1.5rem,3vw,2.2rem)",fontWeight:700,color:c.text,marginBottom:"0.3rem"}}>Dividend Hub</h1>
            <p style={{fontFamily:gs,fontSize:"0.88rem",color:c.muted}}>
              AI-powered safety scores, growth analysis, income forecasting and stock lookup.
            </p>
          </div>
          {compareList.length>=2&&(
            <button onClick={()=>setShowCompare(true)}
              style={{background:c.green,color:mode==="dark"?"#050505":"#FFFFFF",border:"none",borderRadius:"6px",padding:"8px 18px",fontFamily:gs,fontSize:"0.78rem",fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:"0.4rem"}}>
              ⚖ Compare ({compareList.length})
            </button>
          )}
        </div>

        {/* Ultimate gate */}
        {userPlan!==null&&!isUltimate ? (
          <div style={{background:c.card,border:`1px solid ${c.borderHi}`,borderRadius:"16px",padding:"3.5rem 2rem",textAlign:"center"}}>
            <div style={{fontSize:"2.5rem",marginBottom:"1rem"}}>💰</div>
            <h2 style={{fontFamily:gs,fontSize:"1.3rem",fontWeight:700,color:c.text,marginBottom:"0.75rem"}}>Dividend Intelligence</h2>
            <p style={{fontFamily:gs,fontSize:"0.88rem",color:c.muted,maxWidth:"400px",margin:"0 auto 2rem",lineHeight:1.7}}>
              Safety scores, growth analysis, dividend screener, and income forecasting are available on the Ultimate plan.
            </p>
            <div style={{display:"flex",gap:"0.75rem",justifyContent:"center",flexWrap:"wrap"}}>
              <button onClick={()=>router.push("/dashboard/account")}
                style={{background:c.text,color:c.bg,border:"none",borderRadius:"7px",padding:"12px 32px",fontFamily:gs,fontSize:"0.88rem",fontWeight:700,cursor:"pointer"}}>
                Upgrade to Ultimate →
              </button>
              <button onClick={()=>router.push("/dashboard")}
                style={{background:"transparent",color:c.muted,border:`1px solid ${c.border}`,borderRadius:"7px",padding:"12px 24px",fontFamily:gs,fontSize:"0.84rem",cursor:"pointer"}}>
                Back to Discovery
              </button>
            </div>
          </div>
        ) : isUltimate ? (
          <>
            {/* Sub-tabs */}
            <div style={{display:"flex",gap:"0",marginBottom:"2rem",background:c.surface,borderRadius:"8px",padding:"3px",width:"fit-content",border:`1px solid ${c.border}`}}>
              {[{id:"screener",label:"📊 Screener"},{id:"planner",label:"📈 Income Planner"}].map(t=>(
                <button key={t.id} onClick={()=>setTab(t.id)}
                  style={{background:tab===t.id?c.card:"transparent",color:tab===t.id?c.text:c.muted,border:"none",borderRadius:"6px",padding:"8px 22px",fontFamily:gs,fontSize:"0.82rem",fontWeight:tab===t.id?700:500,cursor:"pointer",transition:"all 0.18s",boxShadow:tab===t.id?"0 1px 6px rgba(0,0,0,0.2)":"none"}}>
                  {t.label}
                </button>
              ))}
            </div>

            {tab==="screener"
              ?<ScreenerTab c={c} mode={mode} stocks={MOCK_STOCKS}
                  onSelectStock={handleSelectStock} compareList={compareList} onToggleCompare={toggleCompare}/>
              :<PlannerTab c={c} mode={mode} stocks={MOCK_STOCKS}/>
            }
          </>
        ) : (
          // Loading plan state
          <div style={{height:"200px",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <p style={{fontFamily:gs,color:c.muted,fontSize:"0.84rem"}}>Loading…</p>
          </div>
        )}

        {/* Disclaimer */}
        <p style={{fontFamily:gs,color:c.muted,fontSize:"0.68rem",textAlign:"center",marginTop:"2.5rem"}}>
          For informational purposes only · Not financial advice · Data via Financial Modeling Prep
        </p>
      </div>

      {/* Modals */}
      {activeStock&&(
        <StockModal
          stock={activeStock}
          divData={divData[activeStock.ticker]}
          divLoading={divLoading[activeStock.ticker]}
          c={c} mode={mode}
          onClose={()=>setActiveStock(null)}
          onFullAnalysis={t=>router.push(`/dashboard/analysis/${t}`)}
        />
      )}
      {showCompare&&compareStocks.length>=2&&(
        <CompareModal stocks={compareStocks} c={c} mode={mode} onClose={()=>setShowCompare(false)}/>
      )}
    </div>
  );
}