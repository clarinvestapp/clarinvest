"use client";
export const dynamic = "force-dynamic";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { useTheme } from "@/lib/theme";
import { createClient } from "@/lib/supabase";
import FullReportPopup from "@/app/components/FullReportPopup";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, AreaChart, Area,
} from "recharts";

// ─── Design tokens ─────────────────────────────────────────────────────────────
const DARK  = { bg:"#090909",card:"#111113",surface:"#141416",border:"#232325",borderHi:"#333336",text:"#F0F0F0",muted:"#7A7A80",green:"#00E676",greenDim:"rgba(0,230,118,0.10)",blue:"#4488FF",blueDim:"rgba(68,136,255,0.12)",blue2:"rgba(68,136,255,0.62)",blue3:"rgba(68,136,255,0.35)",red:"#FF1800",redDim:"rgba(255,24,0,0.10)",amber:"#F59E0B" };
const LIGHT = { bg:"#F7F7F5",card:"#FFFFFF",surface:"#EEEEED",border:"#DEDEDD",borderHi:"#BABAB8",text:"#0A0A0A",muted:"#606065",green:"#008A38",greenDim:"rgba(0,138,56,0.09)",blue:"#1E55CC",blueDim:"rgba(30,85,204,0.09)",blue2:"rgba(30,85,204,0.62)",blue3:"rgba(30,85,204,0.35)",red:"#CC0000",redDim:"rgba(204,0,0,0.10)",amber:"#B45309" };
const gs = "'Google Sans Flex','DM Sans',sans-serif";

// ─── 5-year NVDA mock data (FY2022 – FY2026) ──────────────────────────────────
const YEARS = ["2022","2023","2024","2025","2026"];
const D = {
  general:      { 2022:{mktCap:"$745B", ev:"$730B", beta:1.64,eps:"$0.38",avgVol:"310M",pe:55.20,divYield:"0.07%"}, 2023:{mktCap:"$360B", ev:"$355B", beta:1.82,eps:"$0.97",avgVol:"322M",pe:109.09,divYield:"0.05%"}, 2024:{mktCap:"$1.22T",ev:"$1.21T",beta:2.18,eps:"$1.30",avgVol:"280M",pe:65.30,divYield:"0.04%"}, 2025:{mktCap:"$2.60T",ev:"$2.60T",beta:2.24,eps:"$2.97",avgVol:"195M",pe:51.20,divYield:"0.03%"}, 2026:{mktCap:"$5.40T",ev:"$5.40T",beta:2.24,eps:"$4.93",avgVol:"171M",pe:37.75,divYield:"0.02%"} },
  valuation:    { 2022:{pe:55.20,ps:18.40,pb:12.60,pfcf:68.40,pocf:60.20,peg:null,  divYield:"0.07%",evMultiple:42.10}, 2023:{pe:109.09,ps:24.51,pb:18.20,pfcf:128.40,pocf:118.60,peg:null,  divYield:"0.05%",evMultiple:64.20}, 2024:{pe:65.30, ps:35.22,pb:31.40,pfcf:68.90, pocf:62.30, peg:0.28,divYield:"0.04%",evMultiple:42.80}, 2025:{pe:51.20, ps:28.44,pb:35.60,pfcf:54.20, pocf:51.80, peg:0.35,divYield:"0.03%",evMultiple:38.10}, 2026:{pe:37.75, ps:20.99,pb:28.81,pfcf:46.88, pocf:44.12, peg:0.57,divYield:"0.02%",evMultiple:31.36} },
  profitability:{ 2022:{grossMargin:64.93,netMargin:36.23,opMargin:37.31,roe:44.20,roa:19.40,roic:22.80}, 2023:{grossMargin:56.94,netMargin:16.19,opMargin:16.07,roe:18.62,roa:8.42, roic:9.84 }, 2024:{grossMargin:64.61,netMargin:55.04,opMargin:53.48,roe:91.40,roa:36.04,roic:51.20}, 2025:{grossMargin:74.99,netMargin:55.85,opMargin:62.05,roe:123.8,roa:47.60,roic:78.40}, 2026:{grossMargin:71.07,netMargin:55.60,opMargin:60.38,roe:98.40,roa:58.00,roic:82.10} },
  liquidity:    { 2022:{current:6.64,quick:5.82,cash:0.92}, 2023:{current:3.52,quick:2.81,cash:0.58}, 2024:{current:4.17,quick:3.59,cash:0.72}, 2025:{current:3.81,quick:3.34,cash:0.62}, 2026:{current:3.91,quick:3.24,cash:0.33} },
  efficiency:   { 2022:{assetTurnover:0.52,invTurnover:5.22,recTurnover:4.80,payTurnover:4.60,fixedAsset:10.20,dso:76,dio:70, dpo:79, opCycle:146,cashCycle:67 }, 2023:{assetTurnover:0.62,invTurnover:4.64,recTurnover:5.18,payTurnover:5.22,fixedAsset:12.40,dso:70,dio:78, dpo:70, opCycle:148,cashCycle:78 }, 2024:{assetTurnover:0.80,invTurnover:3.22,recTurnover:5.44,payTurnover:5.92,fixedAsset:14.20,dso:67,dio:113,dpo:62, opCycle:180,cashCycle:118}, 2025:{assetTurnover:0.92,invTurnover:2.80,recTurnover:5.52,payTurnover:6.18,fixedAsset:15.80,dso:66,dio:130,dpo:59, opCycle:196,cashCycle:137}, 2026:{assetTurnover:1.04,invTurnover:2.92,recTurnover:5.61,payTurnover:6.37,fixedAsset:16.30,dso:65,dio:125,dpo:57, opCycle:190,cashCycle:133} },
  leverage:     { 2022:{debtRatio:0.42,debtEquity:0.72,equityMult:2.20,ltDebtCap:0.40,totalDebtCap:0.49,intCoverage:10.40,cfDebt:0.86}, 2023:{debtRatio:0.29,debtEquity:0.54,equityMult:1.83,ltDebtCap:0.28,totalDebtCap:0.36,intCoverage:16.40,cfDebt:1.18}, 2024:{debtRatio:0.19,debtEquity:0.32,equityMult:1.56,ltDebtCap:0.19,totalDebtCap:0.24,intCoverage:89.20,cfDebt:3.82}, 2025:{debtRatio:0.12,debtEquity:0.18,equityMult:1.44,ltDebtCap:0.12,totalDebtCap:0.15,intCoverage:248.6,cfDebt:6.20}, 2026:{debtRatio:0.06,debtEquity:0.07,equityMult:1.31,ltDebtCap:0.05,totalDebtCap:0.07,intCoverage:503.4,cfDebt:9.00} },
  perShare:     { 2022:{revShare:1.66,niShare:0.60,ocfShare:0.74,fcfShare:0.70,cashShare:0.54,bvShare:1.60,tbvShare:1.32,seShare:1.60}, 2023:{revShare:2.22,niShare:0.36,ocfShare:0.51,fcfShare:0.48,cashShare:0.88,bvShare:2.12,tbvShare:1.82,seShare:2.12}, 2024:{revShare:3.00,niShare:1.65,ocfShare:1.64,fcfShare:1.52,cashShare:1.28,bvShare:2.40,tbvShare:2.08,seShare:2.40}, 2025:{revShare:5.38,niShare:3.00,ocfShare:2.64,fcfShare:2.50,cashShare:1.84,bvShare:3.24,tbvShare:2.90,seShare:3.24}, 2026:{revShare:8.88,niShare:4.94,ocfShare:4.23,fcfShare:3.98,cashShare:2.57,bvShare:6.47,tbvShare:5.48,seShare:6.47} },
  cashflow:     { 2022:{ocfSalesRatio:0.24,fcfOcfRatio:0.95,cfCoverage:0.86,stCoverage:4.20,capexCoverage:5.80,divCapexCoverage:5.10,payoutRatio:0.190}, 2023:{ocfSalesRatio:0.18,fcfOcfRatio:0.87,cfCoverage:1.18,stCoverage:8.40,capexCoverage:8.10,divCapexCoverage:7.62,payoutRatio:0.118}, 2024:{ocfSalesRatio:0.39,fcfOcfRatio:0.91,cfCoverage:3.82,stCoverage:44.20,capexCoverage:14.20,divCapexCoverage:12.80,payoutRatio:0.028}, 2025:{ocfSalesRatio:0.45,fcfOcfRatio:0.92,cfCoverage:6.20,stCoverage:88.40,capexCoverage:15.80,divCapexCoverage:14.10,payoutRatio:0.013}, 2026:{ocfSalesRatio:0.48,fcfOcfRatio:0.94,cfCoverage:9.00,stCoverage:102.82,capexCoverage:17.00,divCapexCoverage:14.64,payoutRatio:0.0081} },
  growth:       { 2022:{revGrowth:61.40,epsGrowth:128.30,dpsGrowth:5.26,gpGrowth:84.20,ebitGrowth:143.00,opGrowth:145.00,niGrowth:125.00,epsDilGrowth:128.00}, 2023:{revGrowth:-16.14,epsGrowth:-53.85,dpsGrowth:7.14,gpGrowth:-26.40,ebitGrowth:-57.60,opGrowth:-57.20,niGrowth:-55.10,epsDilGrowth:-53.60}, 2024:{revGrowth:122.40,epsGrowth:572.22,dpsGrowth:16.67,gpGrowth:162.00,ebitGrowth:681.00,opGrowth:678.00,niGrowth:581.00,epsDilGrowth:572.00}, 2025:{revGrowth:93.61,epsGrowth:145.00,dpsGrowth:14.29,gpGrowth:118.00,ebitGrowth:165.00,opGrowth:160.00,niGrowth:142.00,epsDilGrowth:145.00}, 2026:{revGrowth:65.47,epsGrowth:65.99,dpsGrowth:17.99,gpGrowth:56.82,ebitGrowth:68.15,opGrowth:60.08,niGrowth:64.75,epsDilGrowth:66.67} },
  income:       { 2022:{revenue:26.91,cogs:9.43, grossProfit:17.48,opex:5.60, opIncome:11.88,otherNet:0.10,ebt:11.98,tax:2.22,netIncome:9.75}, 2023:{revenue:26.97,cogs:11.60,grossProfit:15.37,opex:5.64, opIncome:9.73, otherNet:0.14,ebt:9.87, tax:1.80,netIncome:8.08}, 2024:{revenue:60.92,cogs:21.18,grossProfit:39.74,opex:6.68, opIncome:33.06,otherNet:0.76,ebt:33.82,tax:4.04,netIncome:29.76}, 2025:{revenue:130.5,cogs:32.63,grossProfit:97.87,opex:11.42,opIncome:86.45,otherNet:5.22,ebt:91.67,tax:13.0,netIncome:72.88}, 2026:{revenue:215.9,cogs:62.48,grossProfit:153.46,opex:23.08,opIncome:130.39,otherNet:11.06,ebt:141.45,tax:21.38,netIncome:120.07} },
  balance:      { 2022:{totalAssets:44.19,currentAssets:26.07,nonCurrentAssets:18.12,totalLiabilities:20.71,currentLiabilities:12.63,nonCurrentLiabilities:8.08,totalEquity:23.48}, 2023:{totalAssets:41.19,currentAssets:23.07,nonCurrentAssets:18.12,totalLiabilities:17.71,currentLiabilities:10.63,nonCurrentLiabilities:7.08,totalEquity:23.48}, 2024:{totalAssets:65.73,currentAssets:44.35,nonCurrentAssets:21.38,totalLiabilities:22.75,currentLiabilities:14.50,nonCurrentLiabilities:8.25,totalEquity:42.98}, 2025:{totalAssets:111.60,currentAssets:76.72,nonCurrentAssets:34.88,totalLiabilities:31.46,currentLiabilities:20.80,nonCurrentLiabilities:10.66,totalEquity:80.14}, 2026:{totalAssets:206.80,currentAssets:125.61,nonCurrentAssets:81.20,totalLiabilities:49.51,currentLiabilities:32.16,nonCurrentLiabilities:17.35,totalEquity:157.29} },
  cashflowStmt: { 2022:{operatingCF:6.44, investingCF:-11.80,financingCF:3.28,  netChange:-2.08,capex:-0.97,freeCF:5.47 }, 2023:{operatingCF:9.26, investingCF:-11.50,financingCF:1.32,  netChange:-0.92,capex:-1.07,freeCF:8.19 }, 2024:{operatingCF:28.08,investingCF:-22.30,financingCF:-4.88, netChange:0.90, capex:-1.07,freeCF:27.01}, 2025:{operatingCF:64.09,investingCF:-37.84,financingCF:-24.66,netChange:1.59, capex:-3.23,freeCF:60.86}, 2026:{operatingCF:102.72,investingCF:-52.23,financingCF:-48.47,netChange:2.02,capex:-6.04,freeCF:96.68} },
};

// Bar data builders
function getBars(tab) {
  switch(tab) {
    case "valuation":    return YEARS.map(y=>({year:y,"P/E":D.valuation[y].pe,"P/S":D.valuation[y].ps,"P/B":D.valuation[y].pb}));
    case "profitability":return YEARS.map(y=>({year:y,"Gross Margin":D.profitability[y].grossMargin,"Net Margin":D.profitability[y].netMargin}));
    case "liquidity":    return YEARS.map(y=>({year:y,"Current":D.liquidity[y].current,"Quick":D.liquidity[y].quick,"Cash":D.liquidity[y].cash}));
    case "efficiency":   return YEARS.map(y=>({year:y,"Asset Turn.":D.efficiency[y].assetTurnover,"Inv. Turn.":D.efficiency[y].invTurnover}));
    case "leverage":     return YEARS.map(y=>({year:y,"Debt Ratio":D.leverage[y].debtRatio,"Debt/Equity":D.leverage[y].debtEquity}));
    case "perShare":     return YEARS.map(y=>({year:y,"Rev/Share":D.perShare[y].revShare,"NI/Share":D.perShare[y].niShare}));
    case "cashflow":     return YEARS.map(y=>({year:y,"OCF/Sales":D.cashflow[y].ocfSalesRatio,"FCF/OCF":D.cashflow[y].fcfOcfRatio}));
    case "growth":       return YEARS.map(y=>({year:y,"Rev Growth":D.growth[y].revGrowth,"EPS Growth":D.growth[y].epsGrowth,"DPS Growth":D.growth[y].dpsGrowth}));
    default: return [];
  }
}
function getSeries(tab,c) {
  switch(tab) {
    case "valuation":    return [{k:"P/E",c:c.blue},{k:"P/S",c:c.blue2},{k:"P/B",c:c.blue3}];
    case "profitability":return [{k:"Gross Margin",c:c.blue},{k:"Net Margin",c:c.blue2}];
    case "liquidity":    return [{k:"Current",c:c.blue},{k:"Quick",c:c.blue2},{k:"Cash",c:c.blue3}];
    case "efficiency":   return [{k:"Asset Turn.",c:c.blue},{k:"Inv. Turn.",c:c.blue2}];
    case "leverage":     return [{k:"Debt Ratio",c:c.blue},{k:"Debt/Equity",c:c.blue2}];
    case "perShare":     return [{k:"Rev/Share",c:c.blue},{k:"NI/Share",c:c.blue2}];
    case "cashflow":     return [{k:"OCF/Sales",c:c.blue},{k:"FCF/OCF",c:c.blue2}];
    case "growth":       return [{k:"Rev Growth",c:c.blue},{k:"EPS Growth",c:c.blue2},{k:"DPS Growth",c:c.blue3}];
    default: return [];
  }
}

// ─── Helper components ─────────────────────────────────────────────────────────
function AIScore({ score, c, size=68 }) {
  const col = score==null?c.muted:score>=80?c.green:score>=65?c.text:c.red;
  const r=(size-8)/2,cx=size/2,circ=2*Math.PI*r,offset=score!=null?circ*(1-score/100):circ;
  return (
    <div style={{position:"relative",width:size,height:size,flexShrink:0}}>
      <div style={{position:"absolute",inset:"8px",borderRadius:"50%",background:score!=null?`radial-gradient(circle,${col}20 0%,transparent 70%)`:"none",filter:"blur(5px)"}}/>
      <svg width={size} height={size} style={{position:"absolute",top:0,left:0,transform:"rotate(-90deg)"}}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={c.border} strokeWidth="4"/>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={col} strokeWidth="4" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"/>
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
        <span style={{fontFamily:gs,fontSize:size*0.22,fontWeight:800,color:col,lineHeight:1}}>{score??""}</span>
        <span style={{fontFamily:gs,fontSize:"0.45rem",color:c.muted,letterSpacing:"0.06em",textTransform:"uppercase",marginTop:"2px"}}>AI Score</span>
      </div>
    </div>
  );
}

function StatRow({label,value,indent=false,c}) {
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:`1px solid ${c.border}`,paddingLeft:indent?"10px":0}}>
      <span style={{fontFamily:gs,fontSize:"0.78rem",color:c.muted}}>{label}</span>
      <span style={{fontFamily:gs,fontSize:"0.8rem",fontWeight:600,color:c.text}}>{value||"—"}</span>
    </div>
  );
}

// Grouped bar chart with proper tooltip and hover styling
function GroupedBarChart({data,series,c,height=155}) {
  const Tip = ({active,payload,label}) => {
    if(!active||!payload?.length) return null;
    return (
      <div style={{background:c.card,border:`1px solid ${c.borderHi}`,borderRadius:"7px",padding:"8px 12px",boxShadow:"0 4px 12px rgba(0,0,0,0.2)"}}>
        <div style={{fontFamily:gs,fontSize:"0.65rem",color:c.muted,marginBottom:"5px",fontWeight:600}}>{label}</div>
        {payload.map((p,i)=>(
          <div key={i} style={{display:"flex",gap:"8px",justifyContent:"space-between",fontFamily:gs,fontSize:"0.76rem",fontWeight:600,color:p.fill,marginBottom:"2px"}}>
            <span>{p.name}</span><span>{typeof p.value==="number"?p.value.toFixed(2):p.value}</span>
          </div>
        ))}
      </div>
    );
  };
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{top:4,right:4,bottom:0,left:0}} barCategoryGap="22%" barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke={c.border} vertical={false}/>
        <XAxis dataKey="year" tick={{fill:c.muted,fontSize:9,fontFamily:gs}} axisLine={false} tickLine={false}/>
        <YAxis tick={{fill:c.muted,fontSize:8,fontFamily:gs}} axisLine={false} tickLine={false} width={36}
          tickFormatter={v=>Math.abs(v)>=100?`${v.toFixed(0)}`:v.toFixed(1)}/>
        <Tooltip content={<Tip/>} wrapperStyle={{outline:"none",background:"transparent"}} cursor={false}/>
        {series.map(s=>(
          <Bar key={s.k} dataKey={s.k} fill={s.c} radius={[3,3,0,0]}
            opacity={0.62}
            activeBar={{fill:s.c,opacity:1,radius:[3,3,0,0]}}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// Financials bar chart
function FinBarChart({section,c,height=180}) {
  const {data,series} = useMemo(()=>{
    if(section==="income")  return {data:YEARS.map(y=>({year:y,Revenue:D.income[y].revenue,"Net Income":D.income[y].netIncome})),series:[{k:"Revenue",c:c.blue},{k:"Net Income",c:c.blue2}]};
    if(section==="balance") return {data:YEARS.map(y=>({year:y,"Total Assets":D.balance[y].totalAssets,"Total Liabilities":D.balance[y].totalLiabilities})),series:[{k:"Total Assets",c:c.blue},{k:"Total Liabilities",c:c.blue2}]};
    return {data:YEARS.map(y=>({year:y,"Operating CF":D.cashflowStmt[y].operatingCF,"Free CF":D.cashflowStmt[y].freeCF})),series:[{k:"Operating CF",c:c.blue},{k:"Free CF",c:c.blue2}]};
  },[section]);
  const Tip=({active,payload,label})=>{
    if(!active||!payload?.length) return null;
    return (<div style={{background:c.card,border:`1px solid ${c.borderHi}`,borderRadius:"7px",padding:"8px 12px",boxShadow:"0 4px 12px rgba(0,0,0,0.2)"}}>
      <div style={{fontFamily:gs,fontSize:"0.65rem",color:c.muted,marginBottom:"5px",fontWeight:600}}>{label}</div>
      {payload.map((p,i)=><div key={i} style={{display:"flex",gap:"8px",justifyContent:"space-between",fontFamily:gs,fontSize:"0.76rem",fontWeight:600,color:p.fill,marginBottom:"2px"}}><span>{p.name}</span><span>${p.value.toFixed(1)}B</span></div>)}
    </div>);
  };
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{top:4,right:4,bottom:0,left:0}} barCategoryGap="22%" barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke={c.border} vertical={false}/>
        <XAxis dataKey="year" tick={{fill:c.muted,fontSize:9,fontFamily:gs}} axisLine={false} tickLine={false}/>
        <YAxis tick={{fill:c.muted,fontSize:8,fontFamily:gs}} axisLine={false} tickLine={false} width={40}
          tickFormatter={v=>`$${Math.abs(v)>=100?(v/1000).toFixed(1)+"T":`${v.toFixed(0)}B`}`}/>
        <Tooltip content={<Tip/>} wrapperStyle={{outline:"none",background:"transparent"}} cursor={false}/>
        {series.map(s=><Bar key={s.k} dataKey={s.k} fill={s.c} radius={[3,3,0,0]} opacity={0.62} activeBar={{fill:s.c,opacity:1,radius:[3,3,0,0]}}/>)}
      </BarChart>
    </ResponsiveContainer>
  );
}


// ─── Sankey SVG helpers ─────────────────────────────────────────────────────────
// True S-curve bezier: control points at 55% horizontal span.
// The S-shape comes from the ribbon travelling to a different vertical position.
// No symmetric nudging — that causes accordion shapes.
function ribbon(x1,y1a,y1b,x2,y2a,y2b) {
  const t = (x2-x1)*0.55;
  return `M${x1} ${y1a} C${x1+t} ${y1a} ${x2-t} ${y2a} ${x2} ${y2a} L${x2} ${y2b} C${x2-t} ${y2b} ${x1+t} ${y1b} ${x1} ${y1b}Z`;
}

function SankeyLabel({x,y,text,val,col,anchor="start"}) {
  return (
    <g>
      <text x={x} y={y}    textAnchor={anchor} fontFamily={gs} fontSize="8.5" fontWeight="700" fill={col}>{text}</text>
      <text x={x} y={y+12} textAnchor={anchor} fontFamily={gs} fontSize="8"   fill={col} opacity="0.80">{val}</text>
    </g>
  );
}

// ── Helper: build a Sankey layout from nodes+edges ──────────────────────────────
function buildSankey({ W, H, padL, padR, padT, padB, nodeW, gap, columns, edges: edgeSpec }) {
  const usableH = H - padT - padB;
  const nCols   = columns.length;
  const colSpan = (W - padL - padR - nodeW * nCols) / Math.max(nCols - 1, 1);
  const colX    = columns.map((_,i) => padL + i * (nodeW + colSpan));
  const MIN_RIBBON = 2, MAX_RIBBON = 120;

  // ── Pass 1: scale node heights proportionally ────────────────────────────────
  const nodes = {};
  columns.forEach((col, ci) => {
    const total = col.reduce((s,n)=>s+n.val, 0);
    const scale = (usableH - gap*(col.length-1)) / total;
    let y = padT;
    col.forEach(n => {
      const h = n.val * scale;
      nodes[n.id] = { x:colX[ci], y, h, col:n.col, val:n.val, ci };
      y += h + gap;
    });
  });

  // ── Pass 2: compute clamped ribbon heights ───────────────────────────────────
  const edgeInfo = edgeSpec.map(e => {
    const src = nodes[e.from], dst = nodes[e.to];
    const sh = Math.max(MIN_RIBBON, Math.min(MAX_RIBBON, src.h * (e.val / src.val)));
    const dh = Math.max(MIN_RIBBON, Math.min(MAX_RIBBON, dst.h * (e.val / dst.val)));
    return { ...e, sh, dh };
  });

  // Total ribbon height each node sends/receives
  const totalOut = {}, totalIn = {};
  Object.keys(nodes).forEach(id => { totalOut[id]=0; totalIn[id]=0; });
  edgeInfo.forEach(e => { totalOut[e.from]+=e.sh; totalIn[e.to]+=e.dh; });

  // ── Pass 3: trim every node to its actual ribbon height ──────────────────────
  // Positive-flow nodes (top of column): align TOP edge with ribbon arrival → shift down
  // Negative-flow nodes (bottom of column): align BOTTOM edge → shift up
  // Single-node columns: center
  columns.forEach(col => {
    if (col.length === 1) {
      const n   = nodes[col[0].id];
      const rh  = Math.max(totalOut[col[0].id]||0, totalIn[col[0].id]||0);
      if (rh > 0 && rh < n.h) {
        n.y += (n.h - rh) / 2;   // center
        n.h  = rh;
      }
    } else {
      // For multi-node columns, trim each node height to ribbon height.
      // Place top node flush at column top, bottom node flush at column bottom.
      // Middle nodes will be re-stacked with gap in pass 4.
      col.forEach((item, idx) => {
        const n  = nodes[item.id];
        const rh = Math.max(totalOut[item.id]||0, totalIn[item.id]||0);
        if (rh > 0 && rh < n.h) n.h = rh;
      });
    }
  });

  // ── Pass 4: re-stack multi-node columns top-to-bottom with gap ───────────────
  // This ensures nodes are flush and there are no gaps between ribbon bands.
  columns.forEach(col => {
    if (col.length < 2) return;
    // Compute total height of trimmed nodes + gaps
    const totalH = col.reduce((s,item)=>s+nodes[item.id].h, 0) + gap*(col.length-1);
    // Center the whole stack vertically within usableH
    let y = padT + (usableH - totalH) / 2;
    col.forEach(item => {
      nodes[item.id].y = y;
      y += nodes[item.id].h + gap;
    });
  });

  // ── Pass 5: build edges from final node positions ────────────────────────────
  const nodeOut = {}, nodeIn = {}, nodeTotalOut = {}, nodeTotalIn = {};
  Object.keys(nodes).forEach(id => {
    nodeOut[id]=0; nodeIn[id]=0; nodeTotalOut[id]=0; nodeTotalIn[id]=0;
  });

  const edges = edgeInfo.map(e => {
    const src = nodes[e.from], dst = nodes[e.to];
    const x1=src.x+nodeW, y1a=src.y+nodeOut[e.from],    y1b=y1a+e.sh;
    const x2=dst.x,       y2a=dst.y+nodeIn[e.to],       y2b=y2a+e.dh;
    nodeOut[e.from]    += e.sh;  nodeIn[e.to]       += e.dh;
    nodeTotalOut[e.from]+= e.sh; nodeTotalIn[e.to]  += e.dh;
    return { x1,y1a,y1b,x2,y2a,y2b, col:e.col, opacity:e.opacity||0.42 };
  });

  // Final trim: node rendered height = sum of its ribbons
  Object.keys(nodes).forEach(id => {
    const rT = Math.max(nodeTotalOut[id]||0, nodeTotalIn[id]||0);
    if (rT > 0 && rT < nodes[id].h) nodes[id].h = rT;
  });

  return { nodes, edges };
}

// ── Income Statement Sankey ─────────────────────────────────────────────────────
// T212 reference: 3 cols. Labels+values ABOVE each node, centered on node x.
// Col1: Total revenue (blue, single tall). Col2: Gross profit (blue top) + Cost of sales (pink bottom).
// Col3: Operating profit (blue top) + Operating expenses (pink tiny bottom).
// Ribbons: rev→gp blue, rev→cogs pink, gp→opinc blue, gp→opex pink.
function IncomeSankey({c}) {
  const W=560, H=320, padL=70, padR=70, padT=50, padB=50, nodeW=12, gap=10;
  const BLU="#4488FF", PNK="#F472B6";

  const columns = [
    [{ id:"rev",   val:215.94, col:BLU }],
    [{ id:"gp",    val:153.47, col:BLU },
     { id:"cogs",  val:62.47,  col:PNK }],  // 153.47+62.47=215.94
    [{ id:"opinc", val:130.39, col:BLU },
     { id:"opex",  val:23.08,  col:PNK }],  // 130.39+23.08=153.47
  ];

  const edgeSpec = [
    { from:"rev",  to:"gp",    val:153.47, col:BLU, opacity:0.35 },
    { from:"rev",  to:"cogs",  val:62.47,  col:PNK, opacity:0.35 },
    { from:"gp",   to:"opinc", val:130.39, col:BLU, opacity:0.35 },
    { from:"gp",   to:"opex",  val:23.08,  col:PNK, opacity:0.35 },
  ];

  const { nodes, edges } = buildSankey({ W,H,padL,padR,padT,padB,nodeW,gap,columns,edges:edgeSpec });

  // Labels: rev → center-left. Top nodes above. Bottom nodes (cogs, opex) below.
  const labels = [
    { id:"rev",   pos:"left",  text:"Total revenue",    val:"$215.94B" },
    { id:"gp",    pos:"above", text:"Gross profit",     val:"$153.46B" },
    { id:"cogs",  pos:"below", text:"Cost of sales",    val:"$62.48B"  },
    { id:"opinc", pos:"above", text:"Operating profit", val:"$130.39B" },
    { id:"opex",  pos:"below", text:"Op. expenses",     val:"$23.08B"  },
  ];

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{display:"block",maxWidth:"680px",margin:"0 auto"}}>
      <defs>
        {edges.map((e,i)=>(
          <linearGradient key={i} id={`ig${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor={e.col} stopOpacity={e.opacity+0.10}/>
            <stop offset="100%" stopColor={e.col} stopOpacity={e.opacity}/>
          </linearGradient>
        ))}
      </defs>
      {edges.map((e,i)=>(
        <path key={i} d={ribbon(e.x1,e.y1a,e.y1b,e.x2,e.y2a,e.y2b)} fill={`url(#ig${i})`}/>
      ))}
      {Object.entries(nodes).map(([id,n])=>(
        <rect key={id} x={n.x} y={n.y} width={nodeW} height={n.h} rx="2" fill={n.col} opacity="0.90"/>
      ))}
      {labels.map(l=>{
        const n=nodes[l.id];
        if(!n) return null;
        if(l.pos==="left") {
          const x  = n.x - 5;
          const my = n.y + n.h/2;
          return (
            <g key={l.id}>
              <text x={x} y={my-5} textAnchor="end" fontFamily={gs} fontSize="8"   fontWeight="700" fill={n.col}>{l.text}</text>
              <text x={x} y={my+7} textAnchor="end" fontFamily={gs} fontSize="7.5" fill={n.col} opacity="0.85">{l.val}</text>
            </g>
          );
        }
        const cx = n.x + nodeW/2;
        const ty = l.pos==="above" ? n.y - 18 : n.y + n.h + 18;
        const vy = l.pos==="above" ? n.y - 6  : n.y + n.h + 30;
        return (
          <g key={l.id}>
            <text x={cx} y={ty} textAnchor="middle" fontFamily={gs} fontSize="8"   fontWeight="700" fill={n.col}>{l.text}</text>
            <text x={cx} y={vy} textAnchor="middle" fontFamily={gs} fontSize="7.5" fill={n.col} opacity="0.85">{l.val}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Balance Sheet Sankey ────────────────────────────────────────────────────────
// T212 reference: 3 cols. Labels+values ABOVE each node, centered.
// Col1: Current assets (blue top) + Non-current assets (blue bottom, shorter).
// Col2: Total assets (blue single). Col3: Total equity (purple top) + Total liabilities (pink bottom).
// Ribbons: curr→assets blue, ncurr→assets blue dim, assets→equity purple, assets→liab pink.
function BalanceSankey({c}) {
  const W=580, H=320, padL=108, padR=108, padT=50, padB=50, nodeW=12, gap=10;
  const BLU="#4488FF", PUR="#A78BFA", PNK="#F472B6";

  // equity + liab must equal assets exactly to fill the node with no gap
  // 125.61 + 81.20 = 206.81 ✓   157.29 + 49.52 = 206.81 ✓ (adjusted liab by 0.01)
  const columns = [
    [{ id:"curr",   val:125.61, col:BLU },
     { id:"ncurr",  val:81.20,  col:BLU }],
    [{ id:"assets", val:206.81, col:BLU }],
    [{ id:"equity", val:157.29, col:PUR },
     { id:"liab",   val:49.52,  col:PNK }],  // 157.29+49.52=206.81 exact
  ];

  const edgeSpec = [
    { from:"curr",   to:"assets", val:125.61, col:BLU, opacity:0.35 },
    { from:"ncurr",  to:"assets", val:81.20,  col:BLU, opacity:0.22 },
    { from:"assets", to:"equity", val:157.29, col:PUR, opacity:0.35 },
    { from:"assets", to:"liab",   val:49.52,  col:PNK, opacity:0.35 },
  ];

  const { nodes, edges } = buildSankey({ W,H,padL,padR,padT,padB,nodeW,gap,columns,edges:edgeSpec });

  // Label positions:
  // curr, ncurr  → centered vertically on LEFT side of node (anchor=end)
  // assets       → above node, centered
  // equity, liab → centered vertically on RIGHT side of node (anchor=start)
  const labels = [
    { id:"curr",   pos:"left",  text:"Current assets",     val:"$125.61B" },
    { id:"ncurr",  pos:"left",  text:"Non-current assets", val:"$81.20B"  },
    { id:"assets", pos:"above", text:"Total assets",       val:"$206.80B" },
    { id:"equity", pos:"right", text:"Total equity",       val:"$157.29B" },
    { id:"liab",   pos:"right", text:"Total liabilities",  val:"$49.51B"  },
  ];

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{display:"block",maxWidth:"640px",margin:"0 auto"}}>
      <defs>
        {edges.map((e,i)=>(
          <linearGradient key={i} id={`bg${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor={e.col} stopOpacity={e.opacity+0.10}/>
            <stop offset="100%" stopColor={e.col} stopOpacity={e.opacity}/>
          </linearGradient>
        ))}
      </defs>
      {edges.map((e,i)=>(
        <path key={i} d={ribbon(e.x1,e.y1a,e.y1b,e.x2,e.y2a,e.y2b)} fill={`url(#bg${i})`}/>
      ))}
      {Object.entries(nodes).map(([id,n])=>(
        <rect key={id} x={n.x} y={n.y} width={nodeW} height={n.h} rx="2" fill={n.col} opacity="0.90"/>
      ))}
      {labels.map(l=>{
        const n=nodes[l.id];
        if(!n) return null;
        if(l.pos==="left") {
          // Centered vertically, label to left of node
          const x  = n.x - 5;
          const my = n.y + n.h/2;
          return (
            <g key={l.id}>
              <text x={x} y={my-5}  textAnchor="end" fontFamily={gs} fontSize="8"   fontWeight="700" fill={n.col}>{l.text}</text>
              <text x={x} y={my+7}  textAnchor="end" fontFamily={gs} fontSize="7.5" fill={n.col} opacity="0.85">{l.val}</text>
            </g>
          );
        } else if(l.pos==="right") {
          // Centered vertically, label to right of node
          const x  = n.x + nodeW + 5;
          const my = n.y + n.h/2;
          return (
            <g key={l.id}>
              <text x={x} y={my-5}  textAnchor="start" fontFamily={gs} fontSize="8"   fontWeight="700" fill={n.col}>{l.text}</text>
              <text x={x} y={my+7}  textAnchor="start" fontFamily={gs} fontSize="7.5" fill={n.col} opacity="0.85">{l.val}</text>
            </g>
          );
        } else {
          // Above node, centered (Total assets)
          const cx = n.x + nodeW/2;
          return (
            <g key={l.id}>
              <text x={cx} y={n.y-18} textAnchor="middle" fontFamily={gs} fontSize="8"   fontWeight="700" fill={n.col}>{l.text}</text>
              <text x={cx} y={n.y-6}  textAnchor="middle" fontFamily={gs} fontSize="7.5" fill={n.col} opacity="0.85">{l.val}</text>
            </g>
          );
        }
      })}
    </svg>
  );
}

// ── Cash Flow Sankey ────────────────────────────────────────────────────────────
// T212 reference: 2 cols.
// Col1 LEFT (3 nodes): Operating activities (blue, top, large) + Investing activities (pink, middle)
//   + Financing activities (purple, bottom). Labels LEFT of each node (anchor=end), value below.
// Col2 RIGHT (1 node): Change in cash (purple, single). Label RIGHT of node (anchor=start).
// All 3 left nodes connect into Change in cash. The operating ribbon is huge (fills most of right node).
function CashFlowSankey({c}) {
  const W=500, H=300, padL=100, padR=90, padT=14, padB=14, nodeW=12, gap=10;
  const BLU="#4488FF", PUR="#A78BFA", PNK="#F472B6";

  const columns = [
    [{ id:"opcf", val:102.72, col:BLU },
     { id:"inv",  val:52.23,  col:PNK },
     { id:"fin",  val:48.47,  col:PUR }],
    [{ id:"net",  val:203.42, col:PUR }], // sum of all 3 so ribbons fill node exactly
  ];

  // All 3 left nodes flow into Change in cash — each ribbon is proportional to its value
  const edgeSpec = [
    { from:"opcf", to:"net", val:102.72, col:BLU, opacity:0.35 },
    { from:"inv",  to:"net", val:52.23,  col:PNK, opacity:0.35 },
    { from:"fin",  to:"net", val:48.47,  col:PUR, opacity:0.35 },
  ];

  const { nodes, edges } = buildSankey({ W,H,padL,padR,padT,padB,nodeW,gap,columns,edges:edgeSpec });

  // Left nodes: label to the LEFT (anchor=end), value on next line
  // Right node: label to the RIGHT (anchor=start)
  const labels = [
    { id:"opcf", anchor:"end",   text:"Operating activities", val:"$102.72B" },
    { id:"inv",  anchor:"end",   text:"Investing activities", val:"-$52.23B" },
    { id:"fin",  anchor:"end",   text:"Financing activities", val:"-$48.47B" },
    { id:"net",  anchor:"start", text:"Change in cash",       val:"$2.02B"   },
  ];

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{display:"block",maxWidth:"580px",margin:"0 auto"}}>
      <defs>
        {edges.map((e,i)=>(
          <linearGradient key={i} id={`cg${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor={e.col} stopOpacity={e.opacity+0.10}/>
            <stop offset="100%" stopColor={e.col} stopOpacity={e.opacity}/>
          </linearGradient>
        ))}
      </defs>
      {edges.map((e,i)=>(
        <path key={i} d={ribbon(e.x1,e.y1a,e.y1b,e.x2,e.y2a,e.y2b)} fill={`url(#cg${i})`}/>
      ))}
      {Object.entries(nodes).map(([id,n])=>(
        <rect key={id} x={n.x} y={n.y} width={nodeW} height={n.h} rx="2" fill={n.col} opacity="0.90"/>
      ))}
      {labels.map(l=>{
        const n=nodes[l.id];
        if(!n) return null;
        if(l.anchor==="end") {
          // Left-side labels: name right-aligned to left of node, value below name
          const x = n.x - 5;
          const cy = n.y + n.h/2;
          return (
            <g key={l.id}>
              <text x={x} y={cy-5}  textAnchor="end" fontFamily={gs} fontSize="8" fontWeight="700" fill={n.col}>{l.text}</text>
              <text x={x} y={cy+7}  textAnchor="end" fontFamily={gs} fontSize="7.5" fill={n.col} opacity="0.85">{l.val}</text>
            </g>
          );
        } else {
          // Right node (Change in cash): centered vertically, label to right of node
          const x  = n.x + nodeW + 5;
          const my = n.y + n.h/2;
          return (
            <g key={l.id}>
              <text x={x} y={my-5} textAnchor="start" fontFamily={gs} fontSize="8"   fontWeight="700" fill={n.col}>{l.text}</text>
              <text x={x} y={my+7} textAnchor="start" fontFamily={gs} fontSize="7.5" fill={n.col} opacity="0.85">{l.val}</text>
            </g>
          );
        }
      })}
    </svg>
  );
}

// ─── Sankey toggle icons ───────────────────────────────────────────────────────
const IconBar = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <rect x="3" y="12" width="4" height="9" rx="1.5"/><rect x="10" y="7" width="4" height="14" rx="1.5"/><rect x="17" y="3" width="4" height="18" rx="1.5"/>
  </svg>
);
const IconFlow = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M2.82,6.62h-1.17c-.76,0-1.38-.62-1.38-1.38v-2.62c0-.76.62-1.38,1.38-1.38h1.17c.76,0,1.38.62,1.38,1.38v2.62c0,.76-.62,1.38-1.38,1.38ZM1.66,2.25c-.21,0-.38.17-.38.38v2.62c0,.21.17.38.38.38h1.17c.21,0,.38-.17.38-.38v-2.62c0-.21-.17-.38-.38-.38h-1.17Z"/>
    <path d="M2.82,12.75h-1.17c-.76,0-1.38-.62-1.38-1.38v-2.62c0-.76.62-1.38,1.38-1.38h1.17c.76,0,1.38.62,1.38,1.38v2.62c0,.76-.62,1.38-1.38,1.38ZM1.66,8.38c-.21,0-.38.17-.38.38v2.62c0,.21.17.38.38.38h1.17c.21,0,.38-.17.38-.38v-2.62c0-.21-.17-.38-.38-.38h-1.17Z"/>
    <path d="M11.08,4.39v-2.06s-2.96,0-3.81,1.87c-1.24-1.56-3.19-1.87-3.19-1.87v3.21s1.29.22,2,1c.12.14.21.3.3.46-.09.16-.18.33-.3.46-.71.78-2,1-2,1v3.21s1.95-.31,3.19-1.87c.86,1.87,3.81,1.87,3.81,1.87v-2.06s-1.47,0-2.05-.67c-.41-.48-.6-1.22-.74-1.94.14-.72.32-1.46.74-1.94.58-.67,2.05-.67,2.05-.67Z"/>
    <path d="M12.9,12.59h-.85c-.6,0-1.1-.49-1.1-1.1v-1.71c0-.6.49-1.1,1.1-1.1h.85c.6,0,1.1.49,1.1,1.1v1.71c0,.6-.49,1.1-1.1,1.1ZM12.06,9.69c-.05,0-.1.04-.1.1v1.71c0,.05.04.1.1.1h.85c.05,0,.1-.04.1-.1v-1.71c0-.05-.04-.1-.1-.1h-.85Z"/>
    <path d="M12.9,5.36h-.85c-.6,0-1.1-.49-1.1-1.1v-1.71c0-.6.49-1.1,1.1-1.1h.85c.6,0,1.1.49,1.1,1.1v1.71c0,.6-.49,1.1-1.1,1.1ZM12.06,2.46c-.05,0-.1.04-.1.1v1.71c0,.05.04.1.1.1h.85c.05,0,.1-.04.1-.1v-1.71c0-.05-.04-.1-.1-.1h-.85Z"/>
  </svg>
);

// ─── Statistics panel ──────────────────────────────────────────────────────────
const STABS = [{id:"general",l:"General"},{id:"valuation",l:"Valuation"},{id:"profitability",l:"Profitability"},{id:"liquidity",l:"Liquidity"},{id:"leverage",l:"Leverage"},{id:"perShare",l:"Per Share"},{id:"cashflow",l:"Cash Flow"},{id:"growth",l:"Growth"},{id:"dividends",l:"Dividends"}];

// ─── ETF mock data (QQQ) ────────────────────────────────────────────────────
const ETF_DATA = {
  overview:{ name:"Invesco QQQ Trust", ticker:"QQQ", aum:"$230B", expenseRatio:"0.20%", nav:445.20, navChange:+1.8, holdings:101, index:"NASDAQ-100", category:"Large-Cap Growth", inception:"1999", exchange:"NASDAQ", currency:"USD" },
  performance:{ ytd:"+12.4%", oneY:"+28.3%", threeY:"+8.1%", fiveY:"+19.2%", tenY:"+17.8%", sharpe3Y:0.82, beta:1.08, stdDev:18.4, maxDrawdown:"-8.4%", trackingError:"0.04%" },
  topHoldings:[
    {ticker:"MSFT",name:"Microsoft Corp",weight:"8.84%"},
    {ticker:"AAPL",name:"Apple Inc",weight:"8.41%"},
    {ticker:"NVDA",name:"NVIDIA Corp",weight:"7.18%"},
    {ticker:"AMZN",name:"Amazon.com",weight:"5.12%"},
    {ticker:"META",name:"Meta Platforms",weight:"4.83%"},
    {ticker:"GOOGL",name:"Alphabet (A)",weight:"4.24%"},
    {ticker:"GOOG", name:"Alphabet (C)",weight:"3.81%"},
    {ticker:"TSLA",name:"Tesla Inc",weight:"3.44%"},
    {ticker:"AVGO",name:"Broadcom Inc",weight:"3.21%"},
    {ticker:"COST",name:"Costco Wholesale",weight:"2.78%"},
  ],
  sectors:[
    {s:"Technology",w:61.2},{s:"Consumer Disc.",w:18.4},{s:"Healthcare",w:5.1},
    {s:"Communication",w:4.8},{s:"Industrials",w:3.8},{s:"Financials",w:2.9},{s:"Other",w:3.8},
  ],
  dividends:{ yield:"0.54%", frequency:"Quarterly", annualDPS:"$2.38", exDate:"21/03/25", payDate:"31/03/25", paysDiv:true },
};

// ─── Commodity mock data (Gold / XAUUSD) ──────────────────────────────────────
const COMMODITY_DATA = {
  overview:{ name:"Gold Spot", ticker:"XAUUSD", type:"Precious Metal", currency:"USD", exchange:"OTC / COMEX", contractSize:"100 troy oz", unit:"Troy Ounce", sector:"Metals", subsector:"Precious Metals" },
  quote:{ price:2345.60, change:+18.40, changePct:+0.79, open:2327.20, high:2351.80, low:2318.40, prevClose:2327.20, fiftyTwoHigh:2431.20, fiftyTwoLow:1984.30, avgVol30:"182K", volume:"214K" },
  performance:{ ytd:"+12.8%", oneY:"+18.4%", threeY:"+32.1%", fiveY:"+71.3%", tenY:"+98.4%", volatility30d:"11.2%", beta:"-0.12", sharpe3Y:0.94, maxDrawdown:"-17.4%", stdDev:"13.8%" },
  technicals:{ rsi14:58.4, ma50:2298.40, ma200:2142.80, macd:"+12.40", macdSignal:"+9.80", bollingerUpper:2398.40, bollingerLower:2218.40, atr14:24.80 },
  fundamentals:[
    ["USD Index Correlation","-0.82"],["Inflation Correlation","+0.68"],["Real Yield Correlation","-0.91"],
    ["Central Bank Demand","1,037 t (2023)"],["Mine Supply","3,644 t (2023)"],["Recycled Supply","1,237 t (2023)"],
    ["Jewellery Demand","49%"],["Investment Demand","26%"],["Industrial Demand","7%"],
  ],
};

// ─── Index mock data (S&P 500 / SPX) ─────────────────────────────────────────
const INDEX_DATA = {
  overview:{ name:"S&P 500 Index", ticker:"SPX", exchange:"NYSE / NASDAQ", currency:"USD", constituents:503, methodology:"Float-adjusted market cap", rebalancing:"Quarterly", launchDate:"1957", indexProvider:"S&P Dow Jones Indices" },
  quote:{ price:5487.20, change:+42.80, changePct:+0.79, open:5444.40, high:5502.60, low:5438.20, prevClose:5444.40, fiftyTwoHigh:5669.67, fiftyTwoLow:4103.78, ytdReturn:"+12.1%" },
  performance:{ ytd:"+12.1%", oneY:"+24.8%", threeY:"+8.4%", fiveY:"+84.2%", tenY:"+183.4%", dividendYield:"1.31%", pe:22.4, forwardPe:20.1, pb:4.2, eps:244.97 },
  topConstituents:[
    {ticker:"AAPL",  name:"Apple Inc",         weight:"7.12%"},
    {ticker:"MSFT",  name:"Microsoft Corp",    weight:"6.84%"},
    {ticker:"NVDA",  name:"NVIDIA Corp",       weight:"6.21%"},
    {ticker:"AMZN",  name:"Amazon.com",        weight:"3.88%"},
    {ticker:"META",  name:"Meta Platforms",    weight:"2.66%"},
    {ticker:"GOOGL", name:"Alphabet (A)",      weight:"2.18%"},
    {ticker:"BRK.B", name:"Berkshire Hathaway",weight:"1.74%"},
    {ticker:"LLY",   name:"Eli Lilly & Co",   weight:"1.68%"},
    {ticker:"AVGO",  name:"Broadcom Inc",      weight:"1.62%"},
    {ticker:"JPM",   name:"JPMorgan Chase",    weight:"1.54%"},
  ],
  sectors:[
    {s:"Information Technology",w:31.4},{s:"Financials",w:13.2},{s:"Healthcare",w:11.8},
    {s:"Consumer Disc.",w:10.6},{s:"Industrials",w:8.4},{s:"Communication",w:8.2},
    {s:"Consumer Staples",w:5.8},{s:"Energy",w:3.6},{s:"Real Estate",w:2.4},{s:"Other",w:4.6},
  ],
};

function StatisticsPanel({c,mode,userPlan,instrumentType="stock",router,ticker="NVDA"}) {
  const [tab,setTab]=useState("general");
  const [year,setYear]=useState("2026");
  const [period,setPeriod]=useState("Annual");
  const [etfTab,setEtfTab]=useState("overview"); // must stay at top level (Rules of Hooks)
  const [cTab,setCTab]=useState("overview");      // commodity tab — hoisted per Rules of Hooks
  const [iTab,setITab]=useState("overview");      // index tab — hoisted per Rules of Hooks
  const isUlt=userPlan==="ultimate";
  const d=D[tab]?.[year]||{};
  const tBtn=a=>({background:"none",border:"none",cursor:"pointer",fontFamily:gs,fontSize:"0.72rem",fontWeight:a?600:400,color:a?c.text:c.muted,borderBottom:`2px solid ${a?c.text:"transparent"}`,padding:"5px 8px",paddingBottom:"7px",marginBottom:"-1px",transition:"all 0.15s",whiteSpace:"nowrap"});
  const pill=a=>({background:a?c.text:"transparent",color:a?c.bg:c.muted,border:`1px solid ${a?c.text:c.border}`,borderRadius:"4px",padding:"3px 8px",fontFamily:gs,fontSize:"0.66rem",fontWeight:600,cursor:"pointer",transition:"all 0.15s"});
  
  function rows() {
    switch(tab){
      case "general":      return [["Market Cap",d.mktCap],["Enterprise Value",d.ev],["Beta",d.beta?.toFixed(2)],["EPS",`$${d.eps}`],["Avg Volume",d.avgVol],["P/E Ratio",d.pe?.toFixed(2)],["Dividend Yield",d.divYield]];
      case "valuation":    return [["P/E Ratio",d.pe?.toFixed(2)],["P/S Ratio",d.ps?.toFixed(2)],["P/B Ratio",d.pb?.toFixed(2)],["P/FCF",d.pfcf?.toFixed(2)],["P/Op. CF",d.pocf?.toFixed(2)],["PEG Ratio",d.peg?.toFixed(2)??null],["Dividend Yield",d.divYield],["EV Multiple",d.evMultiple?.toFixed(2)]];
      case "profitability":return [["Gross Margin",`${d.grossMargin?.toFixed(2)}%`],["Net Margin",`${d.netMargin?.toFixed(2)}%`],["Operating Margin",`${d.opMargin?.toFixed(2)}%`],["ROE",`${d.roe?.toFixed(2)}%`],["ROA",`${d.roa?.toFixed(2)}%`],["ROIC",`${d.roic?.toFixed(2)}%`]];
      case "liquidity":    return [["Current Ratio",d.current?.toFixed(2)],["Quick Ratio",d.quick?.toFixed(2)],["Cash Ratio",d.cash?.toFixed(2)]];
      case "efficiency":   return [["Asset Turnover",d.assetTurnover?.toFixed(2)],["Inventory Turnover",d.invTurnover?.toFixed(2)],["Receivables Turnover",d.recTurnover?.toFixed(2)],["Payables Turnover",d.payTurnover?.toFixed(2)],["Fixed Asset Turnover",d.fixedAsset?.toFixed(2)],["Days Sales Outstanding",`${d.dso} days`],["Days Inv. Outstanding",`${d.dio} days`],["Days Payables Outstanding",`${d.dpo} days`],["Operating Cycle",`${d.opCycle} days`],["Cash Conversion Cycle",`${d.cashCycle} days`]];
      case "leverage":     return [["Debt Ratio",d.debtRatio?.toFixed(2)],["Debt / Equity",d.debtEquity?.toFixed(2)],["Equity Multiplier",d.equityMult?.toFixed(2)],["LT Debt / Cap.",d.ltDebtCap?.toFixed(2)],["Total Debt / Cap.",d.totalDebtCap?.toFixed(2)],["Interest Coverage",d.intCoverage?.toFixed(2)],["CF to Debt",d.cfDebt?.toFixed(2)]];
      case "perShare":     return [["Revenue / Share",`$${d.revShare?.toFixed(2)}`],["Net Income / Share",`$${d.niShare?.toFixed(2)}`],["Op. CF / Share",`$${d.ocfShare?.toFixed(2)}`],["FCF / Share",`$${d.fcfShare?.toFixed(2)}`],["Cash / Share",`$${d.cashShare?.toFixed(2)}`],["Book Value / Share",`$${d.bvShare?.toFixed(2)}`],["Tangible BV / Share",`$${d.tbvShare?.toFixed(2)}`]];
      case "cashflow":     return [["Op. CF / Sales",d.ocfSalesRatio?.toFixed(2)],["FCF / Op. CF",d.fcfOcfRatio?.toFixed(2)],["CF Coverage",d.cfCoverage?.toFixed(2)],["ST Coverage",d.stCoverage?.toFixed(2)],["Capex Coverage",d.capexCoverage?.toFixed(2)],["Div + Capex Coverage",d.divCapexCoverage?.toFixed(2)],["Payout Ratio",d.payoutRatio?.toFixed(4)]];
      case "growth":       return [["Revenue Growth",`${d.revGrowth?.toFixed(2)}%`],["EPS Growth",`${d.epsGrowth?.toFixed(2)}%`],["DPS Growth",`${d.dpsGrowth?.toFixed(2)}%`],["Gross Profit Growth",`${d.gpGrowth?.toFixed(2)}%`],["EBIT Growth",`${d.ebitGrowth?.toFixed(2)}%`],["Op. Income Growth",`${d.opGrowth?.toFixed(2)}%`],["Net Income Growth",`${d.niGrowth?.toFixed(2)}%`]];
      default: return [];
    }
  }

  const hasChart = tab!=="general"&&tab!=="dividends";

  // ── ETF layout ──────────────────────────────────────────────────────────────
  if (instrumentType === "etf") {
    const ETF_TABS = [{id:"overview",l:"Overview"},{id:"performance",l:"Performance"},{id:"holdings",l:"Top Holdings"},{id:"sectors",l:"Allocation"},{id:"dividends",l:"Dividends"}];
    return (
      <div>
        <p style={{fontFamily:gs,fontSize:"0.88rem",fontWeight:700,color:c.text,marginBottom:"0.9rem"}}>Fund Profile</p>
        <div style={{display:"flex",gap:"0",overflowX:"auto",borderBottom:`1px solid ${c.border}`,marginBottom:"0.9rem",scrollbarWidth:"none"}}>
          {ETF_TABS.map(t=><button key={t.id} onClick={()=>setEtfTab(t.id)} style={tBtn(etfTab===t.id)}>{t.l}</button>)}
        </div>
        {etfTab==="overview"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.3rem"}}>
            {[["Fund Name",ETF_DATA.overview.name],["Index Tracked",ETF_DATA.overview.index],["AUM",ETF_DATA.overview.aum],["Expense Ratio",ETF_DATA.overview.expenseRatio],["Holdings","101 stocks"],["Category",ETF_DATA.overview.category],["Inception","1999"],["Exchange","NASDAQ"]].map(([l,v])=>(
              <div key={l} style={{display:"flex",flexDirection:"column",padding:"5px 0",borderBottom:`1px solid ${c.border}`}}>
                <span style={{fontFamily:gs,fontSize:"0.68rem",color:c.muted}}>{l}</span>
                <span style={{fontFamily:gs,fontSize:"0.78rem",fontWeight:600,color:c.text}}>{v}</span>
              </div>
            ))}
          </div>
        )}
        {etfTab==="performance"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.3rem"}}>
            {[["YTD Return","+12.4%",true],["1Y Return","+28.3%",true],["3Y CAGR","+8.1%",true],["5Y CAGR","+19.2%",true],["10Y CAGR","+17.8%",true],["Sharpe (3Y)","0.82",null],["Beta","1.08",null],["Max Drawdown","-8.4%",false],["Std Deviation","18.4%",null],["Tracking Error","0.04%",null]].map(([l,v,pos])=>(
              <div key={l} style={{display:"flex",flexDirection:"column",padding:"5px 0",borderBottom:`1px solid ${c.border}`}}>
                <span style={{fontFamily:gs,fontSize:"0.68rem",color:c.muted}}>{l}</span>
                <span style={{fontFamily:gs,fontSize:"0.78rem",fontWeight:600,color:pos===true?c.green:pos===false?c.red:c.text}}>{v}</span>
              </div>
            ))}
          </div>
        )}
        {etfTab==="holdings"&&(
          <div>
            <p style={{fontFamily:gs,fontSize:"0.6rem",color:c.muted,letterSpacing:"0.08em",textTransform:"uppercase",fontWeight:600,marginBottom:"0.5rem"}}>Top 10 Holdings</p>
            {ETF_DATA.topHoldings.map((h,i)=>(
              <div key={h.ticker} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:`1px solid ${c.border}`}}>
                <div style={{display:"flex",alignItems:"center",gap:"8px",flex:1,minWidth:0}}>
                  <span style={{fontFamily:gs,fontSize:"0.65rem",color:c.muted,width:"16px",flexShrink:0}}>{i+1}</span>
                  <span style={{fontFamily:gs,fontSize:"0.8rem",fontWeight:700,color:c.text,flexShrink:0}}>{h.ticker}</span>
                  <span style={{fontFamily:gs,fontSize:"0.7rem",color:c.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.name}</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:"6px",flexShrink:0,marginLeft:"8px"}}>
                  <div style={{width:"50px",height:"4px",background:c.surface,borderRadius:"2px",overflow:"hidden"}}>
                    <div style={{height:"100%",width:h.weight,background:c.blue,borderRadius:"2px",maxWidth:"100%"}}/>
                  </div>
                  <span style={{fontFamily:gs,fontSize:"0.74rem",fontWeight:600,color:c.blue,width:"36px",textAlign:"right"}}>{h.weight}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        {etfTab==="sectors"&&(
          <div>
            <p style={{fontFamily:gs,fontSize:"0.6rem",color:c.muted,letterSpacing:"0.08em",textTransform:"uppercase",fontWeight:600,marginBottom:"0.6rem"}}>Sector Allocation</p>
            {ETF_DATA.sectors.map(s=>(
              <div key={s.s} style={{marginBottom:"8px"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:"3px"}}>
                  <span style={{fontFamily:gs,fontSize:"0.76rem",color:c.muted}}>{s.s}</span>
                  <span style={{fontFamily:gs,fontSize:"0.76rem",fontWeight:600,color:c.text}}>{s.w}%</span>
                </div>
                <div style={{height:"4px",background:c.surface,borderRadius:"2px",overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${s.w}%`,background:c.blue,borderRadius:"2px",opacity:0.65+s.w/180}}/>
                </div>
              </div>
            ))}
          </div>
        )}
        {etfTab==="dividends"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.3rem"}}>
            {[["Pays Dividend","Yes"],["Annual Yield","0.54%"],["Annual DPS","$2.38"],["Frequency","Quarterly"],["Ex-Dividend","21/03/25"],["Payment Date","31/03/25"]].map(([l,v])=>(
              <div key={l} style={{display:"flex",flexDirection:"column",padding:"5px 0",borderBottom:`1px solid ${c.border}`}}>
                <span style={{fontFamily:gs,fontSize:"0.68rem",color:c.muted}}>{l}</span>
                <span style={{fontFamily:gs,fontSize:"0.78rem",fontWeight:600,color:c.text}}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Commodity layout ────────────────────────────────────────────────────────
  if (instrumentType === "commodity") {
    const CTABS = [{id:"overview",l:"Overview"},{id:"performance",l:"Performance"},{id:"technicals",l:"Technicals"},{id:"fundamentals",l:"Supply & Demand"}];
    return (
      <div>
        <p style={{fontFamily:gs,fontSize:"0.88rem",fontWeight:700,color:c.text,marginBottom:"0.9rem"}}>Commodity Profile</p>
        <div style={{display:"flex",gap:"0",overflowX:"auto",borderBottom:`1px solid ${c.border}`,marginBottom:"0.9rem",scrollbarWidth:"none"}}>
          {CTABS.map(t=><button key={t.id} onClick={()=>setCTab(t.id)} style={tBtn(cTab===t.id)}>{t.l}</button>)}
        </div>
        {cTab==="overview"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.3rem"}}>
            {[["Name",COMMODITY_DATA.overview.name],["Type",COMMODITY_DATA.overview.type],["Currency",COMMODITY_DATA.overview.currency],["Exchange",COMMODITY_DATA.overview.exchange],["Contract Size",COMMODITY_DATA.overview.contractSize],["Unit",COMMODITY_DATA.overview.unit],["Sector",COMMODITY_DATA.overview.sector],["Sub-sector",COMMODITY_DATA.overview.subsector]].map(([l,v])=>(
              <div key={l} style={{display:"flex",flexDirection:"column",padding:"5px 0",borderBottom:`1px solid ${c.border}`}}>
                <span style={{fontFamily:gs,fontSize:"0.68rem",color:c.muted}}>{l}</span>
                <span style={{fontFamily:gs,fontSize:"0.78rem",fontWeight:600,color:c.text}}>{v}</span>
              </div>
            ))}
          </div>
        )}
        {cTab==="performance"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.3rem"}}>
            {[["YTD",COMMODITY_DATA.performance.ytd,true],["1Y",COMMODITY_DATA.performance.oneY,true],["3Y",COMMODITY_DATA.performance.threeY,true],["5Y",COMMODITY_DATA.performance.fiveY,true],["10Y",COMMODITY_DATA.performance.tenY,true],["30d Volatility",COMMODITY_DATA.performance.volatility30d,null],["Beta",COMMODITY_DATA.performance.beta,null],["Sharpe (3Y)",COMMODITY_DATA.performance.sharpe3Y,null],["Max Drawdown",COMMODITY_DATA.performance.maxDrawdown,false],["Std Deviation",COMMODITY_DATA.performance.stdDev,null]].map(([l,v,pos])=>(
              <div key={l} style={{display:"flex",flexDirection:"column",padding:"5px 0",borderBottom:`1px solid ${c.border}`}}>
                <span style={{fontFamily:gs,fontSize:"0.68rem",color:c.muted}}>{l}</span>
                <span style={{fontFamily:gs,fontSize:"0.78rem",fontWeight:600,color:pos===true?c.green:pos===false?c.red:c.text}}>{v}</span>
              </div>
            ))}
          </div>
        )}
        {cTab==="technicals"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.3rem"}}>
            {[["RSI (14)",COMMODITY_DATA.technicals.rsi14],["MA (50)",`$${COMMODITY_DATA.technicals.ma50}`],["MA (200)",`$${COMMODITY_DATA.technicals.ma200}`],["MACD",COMMODITY_DATA.technicals.macd],["MACD Signal",COMMODITY_DATA.technicals.macdSignal],["Bollinger Upper",`$${COMMODITY_DATA.technicals.bollingerUpper}`],["Bollinger Lower",`$${COMMODITY_DATA.technicals.bollingerLower}`],["ATR (14)",COMMODITY_DATA.technicals.atr14]].map(([l,v])=>(
              <div key={l} style={{display:"flex",flexDirection:"column",padding:"5px 0",borderBottom:`1px solid ${c.border}`}}>
                <span style={{fontFamily:gs,fontSize:"0.68rem",color:c.muted}}>{l}</span>
                <span style={{fontFamily:gs,fontSize:"0.78rem",fontWeight:600,color:c.text}}>{v}</span>
              </div>
            ))}
          </div>
        )}
        {cTab==="fundamentals"&&(
          <div>
            <p style={{fontFamily:gs,fontSize:"0.6rem",color:c.muted,letterSpacing:"0.08em",textTransform:"uppercase",fontWeight:600,marginBottom:"0.5rem"}}>Supply, Demand & Correlations</p>
            {COMMODITY_DATA.fundamentals.map(([l,v])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${c.border}`}}>
                <span style={{fontFamily:gs,fontSize:"0.78rem",color:c.muted}}>{l}</span>
                <span style={{fontFamily:gs,fontSize:"0.78rem",fontWeight:600,color:c.text}}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Index layout ────────────────────────────────────────────────────────────
  if (instrumentType === "index") {
    const ITABS = [{id:"overview",l:"Overview"},{id:"performance",l:"Performance"},{id:"constituents",l:"Top Holdings"},{id:"sectors",l:"Sectors"}];
    return (
      <div>
        <p style={{fontFamily:gs,fontSize:"0.88rem",fontWeight:700,color:c.text,marginBottom:"0.9rem"}}>Index Profile</p>
        <div style={{display:"flex",gap:"0",overflowX:"auto",borderBottom:`1px solid ${c.border}`,marginBottom:"0.9rem",scrollbarWidth:"none"}}>
          {ITABS.map(t=><button key={t.id} onClick={()=>setITab(t.id)} style={tBtn(iTab===t.id)}>{t.l}</button>)}
        </div>
        {iTab==="overview"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.3rem"}}>
            {[["Full Name",INDEX_DATA.overview.name],["Exchange",INDEX_DATA.overview.exchange],["Currency",INDEX_DATA.overview.currency],["Constituents",INDEX_DATA.overview.constituents],["Methodology",INDEX_DATA.overview.methodology],["Rebalancing",INDEX_DATA.overview.rebalancing],["Launch",INDEX_DATA.overview.launchDate],["Provider",INDEX_DATA.overview.indexProvider]].map(([l,v])=>(
              <div key={l} style={{display:"flex",flexDirection:"column",padding:"5px 0",borderBottom:`1px solid ${c.border}`}}>
                <span style={{fontFamily:gs,fontSize:"0.68rem",color:c.muted}}>{l}</span>
                <span style={{fontFamily:gs,fontSize:"0.78rem",fontWeight:600,color:c.text}}>{v}</span>
              </div>
            ))}
          </div>
        )}
        {iTab==="performance"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.3rem"}}>
            {[["YTD",INDEX_DATA.performance.ytd,true],["1Y",INDEX_DATA.performance.oneY,true],["3Y",INDEX_DATA.performance.threeY,true],["5Y",INDEX_DATA.performance.fiveY,true],["10Y",INDEX_DATA.performance.tenY,true],["Dividend Yield",INDEX_DATA.performance.dividendYield,null],["P/E Ratio",INDEX_DATA.performance.pe,null],["Forward P/E",INDEX_DATA.performance.forwardPe,null],["P/B Ratio",INDEX_DATA.performance.pb,null],["Index EPS",`$${INDEX_DATA.performance.eps}`,null]].map(([l,v,pos])=>(
              <div key={l} style={{display:"flex",flexDirection:"column",padding:"5px 0",borderBottom:`1px solid ${c.border}`}}>
                <span style={{fontFamily:gs,fontSize:"0.68rem",color:c.muted}}>{l}</span>
                <span style={{fontFamily:gs,fontSize:"0.78rem",fontWeight:600,color:pos===true?c.green:pos===false?c.red:c.text}}>{v}</span>
              </div>
            ))}
          </div>
        )}
        {iTab==="constituents"&&(
          <div>
            <p style={{fontFamily:gs,fontSize:"0.6rem",color:c.muted,letterSpacing:"0.08em",textTransform:"uppercase",fontWeight:600,marginBottom:"0.5rem"}}>Top 10 Constituents</p>
            {INDEX_DATA.topConstituents.map((h,i)=>(
              <div key={h.ticker} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:`1px solid ${c.border}`}}>
                <div style={{display:"flex",alignItems:"center",gap:"8px",flex:1,minWidth:0}}>
                  <span style={{fontFamily:gs,fontSize:"0.65rem",color:c.muted,width:"16px",flexShrink:0}}>{i+1}</span>
                  <span style={{fontFamily:gs,fontSize:"0.8rem",fontWeight:700,color:c.text,flexShrink:0}}>{h.ticker}</span>
                  <span style={{fontFamily:gs,fontSize:"0.7rem",color:c.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.name}</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:"6px",flexShrink:0,marginLeft:"8px"}}>
                  <div style={{width:"50px",height:"4px",background:c.surface,borderRadius:"2px",overflow:"hidden"}}>
                    <div style={{height:"100%",width:h.weight,background:c.blue,borderRadius:"2px",maxWidth:"100%"}}/>
                  </div>
                  <span style={{fontFamily:gs,fontSize:"0.74rem",fontWeight:600,color:c.blue,width:"36px",textAlign:"right"}}>{h.weight}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        {iTab==="sectors"&&(
          <div>
            <p style={{fontFamily:gs,fontSize:"0.6rem",color:c.muted,letterSpacing:"0.08em",textTransform:"uppercase",fontWeight:600,marginBottom:"0.6rem"}}>Sector Weights</p>
            {INDEX_DATA.sectors.map(s=>(
              <div key={s.s} style={{marginBottom:"8px"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:"3px"}}>
                  <span style={{fontFamily:gs,fontSize:"0.76rem",color:c.muted}}>{s.s}</span>
                  <span style={{fontFamily:gs,fontSize:"0.76rem",fontWeight:600,color:c.text}}>{s.w}%</span>
                </div>
                <div style={{height:"4px",background:c.surface,borderRadius:"2px",overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${s.w}%`,background:c.blue,borderRadius:"2px",opacity:0.65+s.w/180}}/>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Section label */}
      <p style={{fontFamily:gs,fontSize:"0.88rem",fontWeight:700,color:c.text,marginBottom:"0.9rem"}}>Statistics</p>
      {/* Tab row */}
      <div style={{display:"flex",gap:"0",overflowX:"auto",borderBottom:`1px solid ${c.border}`,marginBottom:"0.9rem",scrollbarWidth:"none"}}>
        {STABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={tBtn(tab===t.id)}>{t.l}</button>)}
      </div>
      {/* Controls */}
      {tab!=="dividends"&&(
        <div style={{display:"flex",alignItems:"center",gap:"0.5rem",marginBottom:"0.9rem",flexWrap:"wrap"}}>
          {["Annual","Quarterly","TTM"].map(p=><button key={p} onClick={()=>setPeriod(p)} style={{...pill(period===p),borderRadius:"4px",padding:"2px 7px",fontSize:"0.63rem"}}>{p}</button>)}
          <div style={{width:"1px",height:"16px",background:c.border,flexShrink:0}}/>
          {YEARS.map(y=><button key={y} onClick={()=>setYear(y)} style={{...pill(year===y),borderRadius:"4px"}}>{y}</button>)}
        </div>
      )}
      {/* Bar chart */}
      {hasChart&&(
        <div style={{marginBottom:"0.9rem"}}>
          <p style={{fontFamily:gs,fontSize:"0.6rem",color:c.muted,letterSpacing:"0.08em",textTransform:"uppercase",fontWeight:600,marginBottom:"0.4rem"}}>
            {STABS.find(t=>t.id===tab)?.l}: All Years
          </p>
          <GroupedBarChart data={getBars(tab)} series={getSeries(tab,c)} c={c}/>
          <div style={{display:"flex",gap:"0.7rem",marginTop:"4px",flexWrap:"wrap"}}>
            {getSeries(tab,c).map(s=>(
              <div key={s.k} style={{display:"flex",alignItems:"center",gap:"4px"}}>
                <div style={{width:7,height:7,borderRadius:"2px",background:s.c,flexShrink:0}}/>
                <span style={{fontFamily:gs,fontSize:"0.63rem",color:c.muted}}>{s.k}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {hasChart&&<div style={{height:"1px",background:c.border,marginBottom:"0.9rem"}}/>}
      {/* Metrics */}
      {tab!=="dividends"&&(
        <>
          <p style={{fontFamily:gs,fontSize:"0.6rem",color:c.muted,letterSpacing:"0.08em",textTransform:"uppercase",fontWeight:600,marginBottom:"0.4rem"}}>
            {STABS.find(t=>t.id===tab)?.l}: FY{year}
          </p>
          {rows().map(([l,v],i)=><StatRow key={i} label={l} value={v} c={c}/>)}
        </>
      )}
      {/* Dividends tab */}
      {tab==="dividends"&&(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.6rem",marginBottom:"1rem"}}>
            {[{l:"Pays Dividend",v:"Yes",col:c.green},{l:"Annual Yield",v:"0.02%",col:c.muted},{l:"Annual DPS",v:"$0.04",col:c.text},{l:"Payout Ratio",v:"0.81%",col:c.green}].map((item,i)=>(
              <div key={i} style={{background:c.surface,border:`1px solid ${c.border}`,borderRadius:"8px",padding:"0.7rem"}}>
                <p style={{fontFamily:gs,fontSize:"0.58rem",color:c.muted,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:"3px"}}>{item.l}</p>
                <p style={{fontFamily:gs,fontSize:"0.88rem",fontWeight:700,color:item.col}}>{item.v}</p>
              </div>
            ))}
          </div>
          <div style={{background:c.surface,border:`1px solid ${c.border}`,borderRadius:"10px",padding:"1.25rem",textAlign:"center"}}>
            <p style={{fontFamily:gs,fontSize:"0.88rem",fontWeight:700,color:c.text,marginBottom:"0.4rem"}}>Dividend Intelligence</p>
            <p style={{fontFamily:gs,fontSize:"0.78rem",color:c.muted,lineHeight:1.65,marginBottom:"1.1rem",maxWidth:"260px",margin:"0 auto 1.1rem"}}>
              Safety scores, growth gauges, payout history and income projector are available on the Ultimate plan.
            </p>
            <div style={{display:"flex",gap:"0.6rem",justifyContent:"center",flexWrap:"wrap"}}>
              {!isUlt&&(
                <button onClick={()=>router.push("/dashboard/account?tab=plan")}
                  style={{background:c.text,color:c.bg,border:"none",borderRadius:"6px",padding:"8px 18px",fontFamily:gs,fontSize:"0.78rem",fontWeight:700,cursor:"pointer"}}>
                  Upgrade to Ultimate
                </button>
              )}
              {isUlt&&(
                <button onClick={()=>{
                  // Navigate to dividends; pass ticker only if it's a dividend-paying stock
                  const divYield = D.general?.["2026"]?.divYield;
                  const paysDividend = divYield && parseFloat(divYield) > 0;
                  router.push(paysDividend ? `/dashboard/dividends?ticker=${ticker}` : "/dashboard/dividends");
                }}
                  style={{background:c.green,color:"#050505",border:"none",borderRadius:"6px",padding:"8px 18px",fontFamily:gs,fontSize:"0.78rem",fontWeight:700,cursor:"pointer"}}>
                  Go to Dividends section ↗
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Financials panel ──────────────────────────────────────────────────────────
function FinancialsPanel({c,mode,userPlan}) {
  const [tab,setTab]=useState("income");
  const [year,setYear]=useState("2026");
  const [period,setPeriod]=useState("Annual");
  const [view,setView]=useState("bar");
  const isUlt=userPlan==="ultimate";
  const tBtn=a=>({background:"none",border:"none",cursor:"pointer",fontFamily:gs,fontSize:"0.72rem",fontWeight:a?600:400,color:a?c.text:c.muted,borderBottom:`2px solid ${a?c.text:"transparent"}`,padding:"5px 8px",paddingBottom:"7px",marginBottom:"-1px",transition:"all 0.15s",whiteSpace:"nowrap"});
  const pill=a=>({background:a?c.text:"transparent",color:a?c.bg:c.muted,border:`1px solid ${a?c.text:c.border}`,borderRadius:"4px",padding:"3px 8px",fontFamily:gs,fontSize:"0.66rem",fontWeight:600,cursor:"pointer",transition:"all 0.15s"});

  function finRows() {
    if(tab==="income"){ const d=D.income[year]; return [[`Revenue`,`$${d.revenue?.toFixed(2)}B`,false,true],[`Cost of Revenue`,`$${d.cogs?.toFixed(2)}B`,true,false],[`Gross Profit`,`$${d.grossProfit?.toFixed(2)}B`,false,true],[`Gross Margin`,`${((d.grossProfit/d.revenue)*100).toFixed(2)}%`,true,false],[`Operating Expenses`,`$${d.opex?.toFixed(2)}B`,true,false],[`Operating Income`,`$${d.opIncome?.toFixed(2)}B`,false,true],[`Op. Margin`,`${((d.opIncome/d.revenue)*100).toFixed(2)}%`,true,false],[`Other Income / Exp.`,`$${d.otherNet?.toFixed(2)}B`,true,false],[`Income Before Tax`,`$${d.ebt?.toFixed(2)}B`,false,false],[`Income Tax`,`$${d.tax?.toFixed(2)}B`,true,false],[`Net Income`,`$${d.netIncome?.toFixed(2)}B`,false,true],[`Net Margin`,`${((d.netIncome/d.revenue)*100).toFixed(2)}%`,true,false]]; }
    if(tab==="balance"){ const d=D.balance[year]; return [[`Total Assets`,`$${d.totalAssets?.toFixed(2)}B`,false,true],[`Current Assets`,`$${d.currentAssets?.toFixed(2)}B`,true,false],[`Non-current Assets`,`$${d.nonCurrentAssets?.toFixed(2)}B`,true,false],[`Total Liabilities`,`$${d.totalLiabilities?.toFixed(2)}B`,false,false],[`Current Liabilities`,`$${d.currentLiabilities?.toFixed(2)}B`,true,false],[`Non-current Liabilities`,`$${d.nonCurrentLiabilities?.toFixed(2)}B`,true,false],[`Total Equity`,`$${d.totalEquity?.toFixed(2)}B`,false,true]]; }
    const d=D.cashflowStmt[year]; return [[`Operating activities`,`$${d.operatingCF?.toFixed(2)}B`,false,true],[`Investing activities`,`$${d.investingCF?.toFixed(2)}B`,false,d.investingCF>=0],[`Financing activities`,`$${d.financingCF?.toFixed(2)}B`,false,d.financingCF>=0],[`Capital Expenditure`,`$${d.capex?.toFixed(2)}B`,true,false],[`Free Cash Flow`,`$${d.freeCF?.toFixed(2)}B`,false,true],[`Change in Cash`,`$${d.netChange?.toFixed(2)}B`,false,d.netChange>=0]];
  }

  return (
    <div>
      <p style={{fontFamily:gs,fontSize:"0.88rem",fontWeight:700,color:c.text,marginBottom:"0.9rem"}}>Financials</p>
      <div style={{display:"flex",gap:"0",borderBottom:`1px solid ${c.border}`,marginBottom:"0.9rem",scrollbarWidth:"none"}}>
        {[{id:"income",l:"Income Statement"},{id:"balance",l:"Balance Sheet"},{id:"cashflow",l:"Cash Flow"}].map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={tBtn(tab===t.id)}>{t.l}</button>)}
      </div>
      {/* Controls: period + years left | chart type right — single row */}
      <div style={{display:"flex",alignItems:"center",gap:"0.4rem",marginBottom:"0.9rem",flexWrap:"wrap"}}>
        {/* Period pills — flat, no box */}
        {["Annual","Quarterly"].map(p=>(
          <button key={p} onClick={()=>setPeriod(p)} style={{...pill(period===p),borderRadius:"4px",padding:"3px 8px",fontSize:"0.65rem"}}>{p}</button>
        ))}
        <div style={{width:"1px",height:"14px",background:c.border,flexShrink:0}}/>
        {/* Year pills */}
        {YEARS.map(y=>(
          <button key={y} onClick={()=>setYear(y)} style={{...pill(year===y),borderRadius:"4px",padding:"3px 8px",fontSize:"0.65rem"}}>{y}</button>
        ))}
        {/* Chart type — pushed to right */}
        <div style={{marginLeft:"auto",display:"flex",gap:"3px"}}>
          <button onClick={()=>setView("bar")} title="Bar chart"
            style={{...pill(view==="bar"),borderRadius:"4px",padding:"4px 9px",display:"flex",alignItems:"center",gap:"4px"}}>
            <IconBar/><span style={{fontSize:"0.63rem"}}>Bar</span>
          </button>
          <button onClick={()=>{if(isUlt)setView("sankey");}}
            title={isUlt?"Sankey flow diagram":"Upgrade to Ultimate for Sankey diagrams"}
            style={{...pill(view==="sankey"),borderRadius:"4px",padding:"4px 9px",display:"flex",alignItems:"center",gap:"4px",opacity:isUlt?1:0.5,cursor:isUlt?"pointer":"not-allowed",position:"relative"}}>
            <IconFlow/><span style={{fontSize:"0.63rem"}}>Flow</span>
            {!isUlt&&<span style={{position:"absolute",top:"-4px",right:"-4px",background:c.amber,color:"#000",fontSize:"0.38rem",fontWeight:800,padding:"1px 4px",borderRadius:"2px",letterSpacing:"0.04em"}}>ULT</span>}
          </button>
        </div>
      </div>
      {/* Chart or Sankey */}
      {view==="bar"
        ?<div style={{marginBottom:"0.9rem"}}><FinBarChart section={tab} c={c}/></div>
        :<div style={{marginBottom:"0.9rem",padding:"0.6rem",background:c.surface,borderRadius:"8px",border:`1px solid ${c.border}`}}>
          {tab==="income"  &&<IncomeSankey   c={c}/>}
          {tab==="balance" &&<BalanceSankey  c={c}/>}
          {tab==="cashflow"&&<CashFlowSankey c={c}/>}
        </div>
      }
      <div style={{height:"1px",background:c.border,marginBottom:"0.9rem"}}/>
      <p style={{fontFamily:gs,fontSize:"0.6rem",color:c.muted,letterSpacing:"0.08em",textTransform:"uppercase",fontWeight:600,marginBottom:"0.4rem"}}>
        {["income","balance","cashflow"].map(s=>s==="income"?"Income Statement":s==="balance"?"Balance Sheet":"Cash Flow").find((_,i)=>["income","balance","cashflow"][i]===tab)}: FY{year}
      </p>
      {finRows().map(([l,v,indent,positive],i)=>(
        <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:`1px solid ${c.border}`,paddingLeft:indent?"10px":0}}>
          <span style={{fontFamily:gs,fontSize:"0.78rem",color:c.muted}}>{l}</span>
          <span style={{fontFamily:gs,fontSize:"0.8rem",fontWeight:600,color:positive?c.green:c.text}}>{v}</span>
        </div>
      ))}
      <p style={{fontFamily:gs,fontSize:"0.6rem",color:c.muted,marginTop:"0.6rem",fontStyle:"italic"}}>All figures in USD billions. FY ending January.</p>
    </div>
  );
}

// ─── Terms Explained ───────────────────────────────────────────────────────────
const TERMS = [
  {id:"general",l:"General",items:[
    ["Market Cap","The total market value of all outstanding shares. Calculated by multiplying the share price by total shares outstanding. The simplest measure of a company's size and the basis for index inclusion thresholds."],
    ["Enterprise Value","Market cap plus total debt minus cash and equivalents. Represents the theoretical price to acquire the entire business, including its debt obligations. More comprehensive than market cap for comparing companies with different capital structures."],
    ["Beta","A measure of a stock's volatility relative to the broader market. A beta above 1 means the stock tends to move more than the market; below 1 means it is more stable. A negative beta indicates the stock tends to move inversely to the market."],
    ["EPS","Earnings per share. Net income divided by the number of shares outstanding. A key indicator of a company's profitability on a per-share basis and the basis for the P/E ratio calculation."],
    ["Average Volume","The mean number of shares traded daily over a recent period, typically 30 days. High volume indicates active trading and good liquidity. Low volume can make it harder to enter or exit a position at a desired price without moving the market."],
    ["Dividend Yield","Annual dividends per share expressed as a percentage of the current share price. A higher yield provides more current income but may also signal lower expected capital growth or elevated payout risk."],
  ]},
  {id:"valuation",l:"Valuation",items:[
    ["P/E Ratio","Price-to-Earnings. Compares the share price to annual earnings per share. A higher P/E reflects expectations of stronger future growth. Should always be compared to sector peers and historical averages rather than in isolation."],
    ["P/S Ratio","Price-to-Sales. Compares the share price to annual revenue per share. Particularly useful for early-stage companies with no profits yet, as it values the business relative to its revenue-generating capacity regardless of margin profile."],
    ["P/B Ratio","Price-to-Book. Compares the share price to book value per share (net assets). A ratio below 1 may suggest the market values the company below its net assets, which can indicate undervaluation or structural business concerns."],
    ["PEG Ratio","Price/Earnings-to-Growth. Divides the P/E ratio by the expected earnings growth rate. A PEG below 1 is often interpreted as growth being underpriced relative to peers. Above 1 suggests a premium is being paid for anticipated growth."],
    ["EV/EBITDA","Enterprise value divided by earnings before interest, tax, depreciation, and amortisation. A debt-neutral multiple that allows comparison across companies with different capital structures. Lower values typically indicate cheaper valuations within a sector."],
  ]},
  {id:"profitability",l:"Profitability",items:[
    ["Gross Margin","Revenue minus cost of goods sold, expressed as a percentage of revenue. High and stable gross margins signal pricing power and efficient production. Best compared within the same industry as margins vary significantly across sectors."],
    ["Net Margin","Net income as a percentage of revenue. This bottom-line metric shows how much profit a company retains from each unit of revenue after all costs, taxes, and interest are accounted for. Expanding net margins over time signal improving profitability."],
    ["Operating Margin","Operating income as a percentage of revenue. Strips out interest and tax effects to show the core profitability of business operations. Useful for comparing operational efficiency across companies regardless of their financing choices."],
    ["ROE","Return on Equity. Net income as a percentage of shareholders' equity. Measures how effectively management uses shareholder capital to generate profit. Sustained high ROE often signals a durable competitive advantage."],
    ["ROA","Return on Assets. Net income as a percentage of total assets. Measures how efficiently a company uses its assets to generate profit. Particularly important in capital-intensive industries where asset utilisation directly drives returns."],
    ["ROIC","Return on Invested Capital. Measures how well a company generates returns on the capital deployed in the business. Consistently above the weighted average cost of capital signals ongoing value creation for shareholders."],
  ]},
  {id:"liquidity",l:"Liquidity",items:[
    ["Current Ratio","Current assets divided by current liabilities. A ratio above 1 indicates the company has enough short-term assets to cover its near-term obligations. Very high values may suggest capital inefficiency; below 1 can signal liquidity stress."],
    ["Quick Ratio","Like the current ratio but excludes inventory, which is harder to convert quickly to cash. A stricter measure of a company's ability to meet short-term obligations without relying on inventory sales. Particularly important for retailers."],
    ["Cash Ratio","Cash and cash equivalents only, divided by current liabilities. The most conservative liquidity metric. Very high values may indicate idle cash that could be deployed more productively; very low values may signal near-term repayment risk."],
  ]},
  {id:"leverage",l:"Leverage",items:[
    ["Debt Ratio","Total debt divided by total assets. Indicates what proportion of assets are financed by debt. Higher ratios signal more financial leverage and potentially greater vulnerability to earnings downturns or rising interest rates."],
    ["Debt / Equity","Total debt divided by shareholders' equity. Shows the balance between debt and equity financing. Higher values mean creditors finance proportionally more of the business, increasing financial risk but also the potential return on equity."],
    ["Interest Coverage","Operating income divided by interest expense. Indicates how comfortably the company can service its debt from operating profit. Below 1.5x is generally a warning sign; above 5x is considered conservative and healthy."],
    ["Equity Multiplier","Total assets divided by shareholders' equity. A higher value indicates greater financial leverage, meaning each dollar of equity supports more assets through debt financing. One of the three components of the DuPont ROE decomposition."],
  ]},
  {id:"perShare",l:"Per Share",items:[
    ["Revenue / Share","Total revenue divided by shares outstanding. Helps track revenue efficiency and growth on a per-share basis, naturally accounting for any share dilution or buybacks that change the share count over time."],
    ["Book Value / Share","Net assets (total assets minus total liabilities) divided by shares outstanding. Represents the theoretical value per share if the business were liquidated today. Commonly used as a floor valuation metric in asset-heavy industries."],
    ["FCF / Share","Free cash flow available per share after subtracting capital expenditure from operating cash flow. A key measure of the cash a business generates for shareholders on a per-share basis, before any dividends or buybacks."],
    ["Cash / Share","Cash and cash equivalents held per share. High values can indicate optionality for buybacks, dividends, or acquisitions. Also provides a partial margin of safety as cash on the balance sheet belongs to shareholders."],
  ]},
  {id:"cashflow",l:"Cash Flow",items:[
    ["OCF / Sales","Operating cash flow as a proportion of revenue. Measures how effectively the company converts sales into actual cash. Consistently above 0.15 is generally considered strong and indicates high-quality earnings."],
    ["FCF / OCF","Free cash flow as a proportion of operating cash flow. Values close to 1 indicate most operating cash flow is available after capital expenditure. Lower values suggest heavy reinvestment back into the business, which can be positive for growth companies."],
    ["CF Coverage","Operating cash flow divided by total debt. A higher ratio indicates stronger capacity to repay debt from operations without needing to raise additional capital. Values above 0.5 are generally considered comfortable."],
  ]},
  {id:"growth",l:"Growth",items:[
    ["Revenue Growth","Year-on-year percentage change in total revenue. Measures the pace of top-line expansion. Sustained high revenue growth at scale is rare and typically commands a premium valuation from the market."],
    ["EPS Growth","Year-on-year percentage change in earnings per share. Reflects the combined effect of revenue growth, margin changes, and share count movements. The most direct measure of shareholder value creation on a per-share basis."],
    ["DPS Growth","Year-on-year percentage change in dividends per share. A growing dividend stream signals management confidence in future earnings and cash flows. Consistent DPS growth over many years is a hallmark of quality compounders."],
  ]},
  {id:"financials",l:"Financials",items:[
    ["Gross Profit","Revenue minus the direct costs of producing goods or services sold. The starting point of a company's profitability cascade and a key measure of pricing power relative to production costs."],
    ["Operating Income","Gross profit minus all operating expenses such as R&D, sales, and administrative costs. Represents the profit generated from core business operations before interest costs and taxes are applied."],
    ["Net Income","The final bottom-line profit after all costs, interest, and taxes. The headline earnings figure used to calculate EPS, ROE, and other key metrics. Also the starting point for the cash flow statement."],
    ["Total Assets","Everything the company owns with measurable economic value, including cash, receivables, inventory, property, equipment, and intangibles. The foundation of the balance sheet and the denominator in ROA calculations."],
    ["Total Equity","Total assets minus total liabilities: what shareholders would theoretically receive if the company were wound up today and all debts paid. Also called net assets or book value. The basis for ROE and P/B calculations."],
    ["Operating CF","Cash generated from core business operations in the period. Unlike net income, operating cash flow is harder to manipulate through accounting choices, giving a clearer picture of underlying business health and cash generation quality."],
    ["Free Cash Flow","Operating cash flow minus capital expenditure. Often considered the truest measure of how much cash a business generates for its owners. The basis for dividends, buybacks, debt repayment, and organic reinvestment."],
  ]},
];

function TermsExplained({c, instrumentType="stock"}) {
  const [open,setOpen]=useState(false);
  const [sec,setSec]=useState(null);

  // Which TERMS sections apply to each instrument type
  const SHOW = {
    stock:     ["general","valuation","profitability","liquidity","leverage","perShare","cashflow","growth","financials"],
    etf:       ["etf","growth"],
    commodity: ["commodity"],
    index:     ["index","valuation"],
  };

  // Extra terms for ETF, commodity, index
  const EXTRA_TERMS = [
    {id:"etf",l:"ETF",applies:["etf"],items:[
      ["AUM","Assets Under Management. The total market value of all assets held by the fund. Larger AUM generally indicates greater liquidity and lower trading costs for investors entering or exiting the position."],
      ["Expense Ratio","The annual fee charged by the fund as a percentage of assets. Lower is better for long-term returns. A 0.20% expense ratio means $2 per year on a $1,000 investment."],
      ["NAV","Net Asset Value. The per-share value of the fund's holdings calculated at end of day. ETF market prices trade around NAV with small premiums or discounts throughout the day."],
      ["Tracking Error","The deviation between the ETF's return and its benchmark index. Lower tracking error means the fund more precisely replicates the index. Caused by fees, sampling, and cash drag."],
      ["Sharpe Ratio","Risk-adjusted return. Measures excess return per unit of volatility. A higher Sharpe ratio means better compensation for the risk taken. Above 1.0 is generally considered good."],
      ["Beta","For ETFs, beta measures sensitivity relative to the broad market. A beta of 1.08 moves about 8% more than the market in either direction. Sector ETFs often have higher betas than their benchmark."],
    ]},
    {id:"commodity",l:"Commodities",applies:["commodity"],items:[
      ["Spot Price","The current market price for immediate delivery of the commodity. Distinct from futures prices, which reflect expected future delivery prices adjusted for cost of carry and storage."],
      ["Beta (Commodity)","For commodities, beta vs. equities is often negative (gold) or near zero, making them useful portfolio diversifiers. Negative beta means the asset tends to rise when stocks fall."],
      ["ATR (Average True Range)","A measure of daily price volatility. Calculated as the average of daily high-minus-low ranges over 14 periods. Higher ATR means more volatile daily price swings."],
      ["RSI (Relative Strength Index)","A momentum oscillator ranging from 0 to 100. Above 70 is typically considered overbought; below 30 is oversold. Used to identify potential reversal points in commodity price trends."],
      ["Moving Average (MA)","The average price over a set number of periods. The 50-day and 200-day MAs are widely watched. When the 50-day crosses above the 200-day, it is called a Golden Cross — a bullish signal."],
      ["Real Yield Correlation","Gold and most precious metals have a strong negative correlation to real yields (inflation-adjusted interest rates). When real yields fall, the opportunity cost of holding non-yielding gold decreases, supporting price."],
    ]},
    {id:"index",l:"Indexes",applies:["index"],items:[
      ["Index P/E","The aggregate price-to-earnings ratio of all constituents, weighted by market cap. Comparing the current index P/E to historical averages helps assess whether the overall market is cheap or expensive."],
      ["Float-Adjusted Market Cap","Weighting methodology that uses only shares available for public trading, excluding insider holdings and strategic stakes. The standard for most major indexes including the S&P 500."],
      ["Constituent","An individual security included in the index. Inclusion criteria typically cover market cap thresholds, liquidity requirements, profitability screens, and domicile rules set by the index provider."],
      ["Rebalancing","Periodic review and adjustment of index constituents and weights. The S&P 500 rebalances quarterly. Rebalancing creates predictable buying/selling pressure that active traders attempt to front-run."],
      ["Forward P/E","The index P/E calculated using next twelve months' earnings estimates rather than trailing reported earnings. More forward-looking but dependent on analyst forecast accuracy."],
      ["Index EPS","The aggregate earnings per share of the index, calculated by dividing the index's total earnings by the divisor. Tracks the collective profitability of the index constituents over time."],
    ]},
  ];

  const allTerms = [...TERMS, ...EXTRA_TERMS];
  const relevantIds = SHOW[instrumentType] || SHOW.stock;
  const visibleTerms = allTerms.filter(s => relevantIds.includes(s.id));

  return (
    <div style={{marginTop:"1.25rem",borderTop:`1px solid ${c.border}`,paddingTop:"0.9rem"}}>
      <button onClick={()=>setOpen(!open)}
        style={{background:"none",border:"none",cursor:"pointer",padding:0,display:"flex",alignItems:"center",gap:"0.5rem",marginBottom:open?"0.85rem":0}}>
        <span style={{fontSize:"0.65rem",color:c.muted,transform:`rotate(${open?90:0}deg)`,transition:"transform 0.2s",display:"inline-block",flexShrink:0}}>▶</span>
        <span style={{fontFamily:gs,fontSize:"0.75rem",fontWeight:600,color:c.text}}>Terms Explained</span>
      </button>
      {open&&(
        <div>
          {visibleTerms.map(s=>(
            <div key={s.id} style={{marginBottom:"4px"}}>
              <button onClick={()=>setSec(sec===s.id?null:s.id)}
                style={{background:"none",border:"none",cursor:"pointer",padding:"4px 0",display:"flex",alignItems:"center",gap:"0.4rem",width:"100%",textAlign:"left"}}>
                <span style={{fontSize:"0.60rem",color:c.muted,transform:`rotate(${sec===s.id?90:0}deg)`,transition:"transform 0.18s",display:"inline-block",flexShrink:0}}>▶</span>
                <span style={{fontFamily:gs,fontSize:"0.74rem",fontWeight:600,color:sec===s.id?c.text:c.muted}}>{s.l}</span>
              </button>
              {sec===s.id&&(
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:"0.5rem",paddingTop:"0.4rem",paddingLeft:"1rem",paddingBottom:"0.5rem"}}>
                  {s.items.map(([term,def])=>(
                    <div key={term} style={{background:c.surface,borderRadius:"8px",padding:"0.7rem",border:`1px solid ${c.border}`}}>
                      <p style={{fontFamily:gs,fontSize:"0.72rem",fontWeight:700,color:c.text,marginBottom:"4px"}}>{term}</p>
                      <p style={{fontFamily:gs,fontSize:"0.72rem",color:c.muted,lineHeight:1.62}}>{def}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SVG action icons ─────────────────────────────────────────────────────────
const IconBookmark = ({filled,size=14}) => (<svg width={size} height={size} viewBox="0 0 24 24" fill={filled?"currentColor":"none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>);
const IconPieChartSm = ({size=14}) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>);
const IconChevronDn = ({size=11}) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>);

const MOCK_PORTFOLIOS = [{id:"p1",name:"Tech Growth"},{id:"p2",name:"Dividend Income"},{id:"p3",name:"Balanced Global"}];

// ─── Mock price chart ─────────────────────────────────────────────────────────
const TIME_RANGES=["1W","1M","3M","6M","1Y","2Y","3Y","5Y"];
function genFullChart(){
  const pts=[];let price=180;
  for(let i=0;i<260;i++){
    price=Math.max(100,price+(Math.random()-0.42)*14+(i*0.92));
    const d=new Date(Date.now()-(260-i)*864e5*7/5);
    pts.push({date:d.toISOString().slice(0,10),price:+price.toFixed(2)});
  }
  pts[pts.length-1].price=875.40;
  return pts;
}
const ALL_CHART=genFullChart();
const RANGE_DAYS={"1W":5,"1M":20,"3M":60,"6M":120,"1Y":260,"2Y":260,"3Y":260,"5Y":260};

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function Page(){
  const { mode } = useTheme();
  const c=mode==="dark"?DARK:LIGHT;
  const router = useRouter();
  const params = useParams();
  const ticker = params?.ticker || "NVDA";
  const [userPlan,setUserPlan]=useState("ultimate"); // TODO: wire to user session
  const [instrumentType]=useState("stock");          // TODO: wire to ticker type from FMP
  const [inWL,setInWL]=useState(false);
  const [wlToken,setWlToken]=useState(null);
  const [aiState,setAiState]=useState(null);
  const [timeRange,setTimeRange]=useState("3M");
  const [mobileTab,setMobileTab]=useState("statistics");
  const [isMobile,setIsMobile]=useState(false);
  const [portOpen,setPortOpen]=useState(false);
  const [addedTo,setAddedTo]=useState(null);
  const [portfolios,setPortfolios]=useState([]);
  const supabase = createClient();
  const [summaryResult, setSummaryResult] = useState(null);
  const [fullReport,    setFullReport]    = useState(null);
  const [showReport,    setShowReport]    = useState(false);
  const [aiLoading,     setAiLoading]     = useState(false);
  const [aiError,       setAiError]       = useState(null);

  // ── Auth + watchlist state + portfolios ──────────────────────────────────────
  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      if(!session) return;
      const tok = session.access_token;
      setWlToken(tok);
      // Check if this ticker is already in watchlist
      fetch("/api/watchlist",{headers:{Authorization:`Bearer ${tok}`}})
        .then(r=>r.json())
        .then(d=>{
          const tickers=(d.stocks||[]).map(s=>s.ticker);
          setInWL(tickers.includes(ticker.toUpperCase()));
        })
        .catch(()=>{});
    });
  },[ticker]);

  // ── Load real portfolios from Supabase ───────────────────────────────────────
  useEffect(()=>{
    supabase.auth.getSession().then(async({data:{session}})=>{
      if(!session) return;
      const {data,error}=await supabase
        .from("user_portfolios")
        .select("id,name")
        .order("created_at",{ascending:true});
      if(!error&&data) setPortfolios(data);
    });
  },[]);

  // ── Watchlist toggle ─────────────────────────────────────────────────────────
  const toggleWatchlist = useCallback(async()=>{
    if(!wlToken) return;
    const wasIn = inWL;
    setInWL(!wasIn); // optimistic
    if(wasIn){
      await fetch(`/api/watchlist?ticker=${ticker}`,{method:"DELETE",headers:{Authorization:`Bearer ${wlToken}`}});
    } else {
      await fetch("/api/watchlist",{
        method:"POST",
        headers:{"Content-Type":"application/json",Authorization:`Bearer ${wlToken}`},
        body:JSON.stringify({ticker,name:ticker,sector:"Technology",market:"US"}),
      });
    }
  },[wlToken,inWL,ticker]);

  useEffect(()=>{const check=()=>setIsMobile(window.innerWidth<940);check();window.addEventListener("resize",check);return()=>window.removeEventListener("resize",check);},[]);

  const chartData=ALL_CHART.slice(-RANGE_DAYS[timeRange]);
  const chartMin=Math.min(...chartData.map(d=>d.price))*0.993;
  const chartMax=Math.max(...chartData.map(d=>d.price))*1.007;

  const generateAnalysis = useCallback(async (type) => {
    setAiLoading(true); setAiError(null);
    try {
      const { data:{ session } } = await supabase.auth.getSession();
      if (!session) { setAiError("Please sign in to generate analysis."); setAiLoading(false); return; }
      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type":"application/json", Authorization:`Bearer ${session.access_token}` },
        body: JSON.stringify({ ticker: ticker.toUpperCase(), type }),
      });
      const data = await res.json();
      if (!res.ok) { setAiError(data.error || "Analysis failed. Please try again."); setAiLoading(false); return; }
      if (type === "summary") {
        setSummaryResult(data);
        setAiState("summary");
      } else {
        setFullReport(data);
        setAiState("full");
        setShowReport(true);
      }
    } catch (err) {
      setAiError(err.message || "Network error. Please try again.");
    } finally {
      setAiLoading(false);
    }
  }, [ticker]);

  const pill=a=>({background:a?c.text:"transparent",color:a?c.bg:c.muted,border:`1px solid ${a?c.text:c.border}`,borderRadius:"4px",padding:"4px 10px",fontFamily:gs,fontSize:"0.68rem",fontWeight:600,cursor:"pointer",transition:"all 0.15s"});

  const ChartTip=({active,payload})=>{
    if(!active||!payload?.length) return null;
    return(<div style={{background:c.card,border:`1px solid ${c.borderHi}`,borderRadius:"7px",padding:"7px 11px",boxShadow:"0 4px 12px rgba(0,0,0,0.2)"}}>
      <div style={{fontFamily:gs,fontSize:"0.66rem",color:c.muted}}>{payload[0].payload.date}</div>
      <div style={{fontFamily:gs,fontSize:"0.82rem",fontWeight:700,color:c.text}}>${payload[0].value?.toFixed(2)}</div>
    </div>);
  };

  // AI panel logic: after generating one, show option to generate the other
  const canFull = userPlan==="pro"||userPlan==="ultimate";
  const summaryLimit = userPlan==="essential"?"5/month":userPlan==="pro"?"15/month":"Unlimited";

  return (
    <div style={{fontFamily:gs,background:c.bg,minHeight:"100vh",color:c.text}}>
      <link rel="preconnect" href="https://fonts.googleapis.com"/>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      <style>{`*{box-sizing:border-box;margin:0;padding:0;}::-webkit-scrollbar{width:4px;height:4px;}::-webkit-scrollbar-thumb{background:#303032;border-radius:2px;}.scroll-x{overflow-x:auto;-ms-overflow-style:none;scrollbar-width:none;}.scroll-x::-webkit-scrollbar{display:none;}`}</style>

      {/* Sticky sub-header — no overflow:hidden so Portfolio dropdown can escape */}
      <div style={{position:"sticky",top:0,zIndex:99,background:mode==="dark"?"rgba(9,9,9,0.96)":"rgba(247,247,245,0.96)",backdropFilter:"blur(12px)",borderBottom:`1px solid ${c.border}`}}>
        <div style={{maxWidth:"1100px",margin:"0 auto",padding:"0 2rem",height:"48px",display:"flex",alignItems:"center",gap:"1rem",flexWrap:"nowrap"}}>
        <button onClick={()=>router.push(`/dashboard?instrument=${ticker}`)}
          style={{background:c.surface,border:`1px solid ${c.border}`,borderRadius:"6px",padding:"4px 11px",cursor:"pointer",color:c.muted,fontFamily:gs,fontSize:"0.76rem",display:"flex",alignItems:"center",gap:"4px",flexShrink:0}}>← Discovery</button>
        <span style={{fontFamily:gs,fontSize:"0.96rem",fontWeight:700,color:c.text,flexShrink:0}}>NVDA</span>
        <span style={{fontFamily:gs,fontSize:"0.88rem",fontWeight:600,color:c.text,flexShrink:0}}>$875.40</span>
        <span style={{fontFamily:gs,fontSize:"0.8rem",fontWeight:700,color:c.green,flexShrink:0}}>+5.43%</span>
        <span style={{fontFamily:gs,fontSize:"0.62rem",fontWeight:700,color:c.green,background:c.greenDim,border:`1px solid ${c.green}40`,borderRadius:"4px",padding:"2px 7px",letterSpacing:"0.05em",textTransform:"uppercase",flexShrink:0}}>Open</span>
        <div style={{marginLeft:"auto",display:"flex",gap:"0.4rem",alignItems:"center"}}>
          {/* Watchlist */}
          <button onClick={toggleWatchlist}
            style={{background:inWL?c.greenDim:"transparent",border:`1px solid ${inWL?`${c.green}50`:c.border}`,borderRadius:"6px",padding:"5px 12px",cursor:"pointer",color:inWL?c.green:c.muted,fontFamily:gs,fontSize:"0.78rem",display:"flex",alignItems:"center",gap:"6px",transition:"all 0.2s"}}>
            <IconBookmark filled={inWL} size={14}/>{inWL?"Watching":"Watchlist"}
          </button>
          {/* Add to Portfolio */}
          <div style={{position:"relative"}}>
            <button onClick={()=>setPortOpen(!portOpen)}
              style={{background:addedTo?c.greenDim:c.surface,border:`1px solid ${addedTo?`${c.green}50`:c.borderHi}`,borderRadius:"6px",padding:"5px 12px",cursor:"pointer",color:addedTo?c.green:c.muted,fontFamily:gs,fontSize:"0.78rem",display:"flex",alignItems:"center",gap:"6px",transition:"all 0.2s"}}>
              <IconPieChartSm size={14}/>{addedTo?`Added to ${addedTo} ✓`:"Portfolio"}<IconChevronDn size={10}/>
            </button>
            {portOpen&&(
              <div style={{position:"absolute",top:"calc(100% + 5px)",right:0,background:c.card,border:`1px solid ${c.borderHi}`,borderRadius:"9px",overflow:"hidden",zIndex:500,boxShadow:"0 8px 24px rgba(0,0,0,0.25)",minWidth:"200px"}}>
                <div style={{padding:"7px 12px 6px",fontFamily:gs,fontSize:"0.6rem",color:c.muted,letterSpacing:"0.1em",textTransform:"uppercase",borderBottom:`1px solid ${c.border}`,fontWeight:600}}>Add {ticker.toUpperCase()} to</div>
                {portfolios.length===0&&(
                  <div style={{padding:"10px 14px",fontFamily:gs,fontSize:"0.76rem",color:c.muted,fontStyle:"italic"}}>No portfolios yet</div>
                )}
                {portfolios.map(p=>(
                  <button key={p.id} onClick={async()=>{
                    setAddedTo(p.name);setPortOpen(false);
                    // Add ticker to the portfolio in Supabase
                    const {data:existing}=await supabase.from("user_portfolios").select("holdings").eq("id",p.id).single();
                    if(existing){
                      const holdings=existing.holdings||[];
                      if(!holdings.find(h=>h.ticker===ticker.toUpperCase())){
                        holdings.push({ticker:ticker.toUpperCase(),name:ticker,sector:"Technology",market:"US",weight:0,price:0,aiScore:0,yield:0});
                        await supabase.from("user_portfolios").update({holdings}).eq("id",p.id);
                      }
                    }
                    setTimeout(()=>setAddedTo(null),2500);
                  }}
                    style={{width:"100%",padding:"8px 12px",background:"transparent",border:"none",borderBottom:`1px solid ${c.border}`,textAlign:"left",cursor:"pointer",fontFamily:gs,fontSize:"0.8rem",color:c.text,display:"flex",alignItems:"center",gap:"7px"}}
                    onMouseEnter={e=>e.currentTarget.style.background=c.surface}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <IconPieChartSm size={12}/>{p.name}
                  </button>
                ))}
                {/* New portfolio option */}
                <button onClick={()=>{setPortOpen(false);router.push("/dashboard/portfolio?new=1");}}
                  style={{width:"100%",padding:"8px 12px",background:"transparent",border:"none",textAlign:"left",cursor:"pointer",fontFamily:gs,fontSize:"0.78rem",color:c.blue,display:"flex",alignItems:"center",gap:"6px"}}
                  onMouseEnter={e=>e.currentTarget.style.background=c.surface}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  New portfolio
                </button>
              </div>
            )}
          </div>
        </div>{/* end button group */}
        </div>{/* end inner max-width wrapper */}
      </div>{/* end sticky sub-header */}

      <div style={{maxWidth:"1100px",margin:"0 auto",padding:"2rem 2rem 5rem"}}>

        {/* Hero */}
        <div style={{marginBottom:"1.5rem"}}>
          <div style={{display:"flex",alignItems:"center",gap:"0.5rem",marginBottom:"0.3rem",flexWrap:"wrap"}}>
            <span style={{fontFamily:gs,fontSize:"0.68rem",color:c.muted}}>NASDAQ · USD · ISIN: US67066G1040</span>
          </div>
          <h1 style={{fontFamily:gs,fontSize:"clamp(1.3rem,3vw,2rem)",fontWeight:700,color:c.text,marginBottom:"0.4rem"}}>NVDA · NVIDIA Corporation</h1>
          <div style={{display:"flex",alignItems:"flex-end",gap:"0.6rem",flexWrap:"wrap"}}>
            <span style={{fontFamily:gs,fontSize:"2.2rem",fontWeight:700,color:c.text,lineHeight:1}}>$875.40</span>
            <span style={{fontFamily:gs,fontSize:"1rem",fontWeight:700,color:c.green,paddingBottom:"3px"}}>+$44.99 (+5.43%) today</span>
          </div>
        </div>

        {/* Ranges + Key Metrics: single unified card */}
        <div style={{background:c.card,border:`1px solid ${c.border}`,borderRadius:"12px",padding:"1rem",marginBottom:"1.5rem",display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:"0",alignItems:"start"}}>
          {/* Range bars */}
          <div>
            <p style={{fontFamily:gs,fontSize:"0.6rem",color:c.muted,letterSpacing:"0.09em",textTransform:"uppercase",fontWeight:600,marginBottom:"0.75rem"}}>Price Ranges</p>
            {[{l:"1 Day",lo:831.20,hi:891.60},{l:"52 Week",lo:402.01,hi:974.00}].map((r)=>{
              const pct=Math.min(100,Math.max(0,((875.40-r.lo)/(r.hi-r.lo))*100));
              return (
                <div key={r.l} style={{marginBottom:"0.65rem"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:"3px"}}>
                    <span style={{fontFamily:gs,fontSize:"0.62rem",color:c.muted,fontWeight:600}}>{r.l}</span>
                    <span style={{fontFamily:gs,fontSize:"0.66rem",color:c.text,fontWeight:600}}>$875.40</span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                    <span style={{fontFamily:gs,fontSize:"0.65rem",color:c.red,fontWeight:600,minWidth:"38px",textAlign:"right"}}>${r.lo.toFixed(0)}</span>
                    <div style={{flex:1,height:"4px",background:c.surface,borderRadius:"2px",position:"relative"}}>
                      <div style={{position:"absolute",left:0,width:`${pct}%`,height:"100%",background:`linear-gradient(90deg,${c.red},${c.green})`,borderRadius:"2px"}}/>
                      <div style={{position:"absolute",top:"-4px",left:`calc(${pct}% - 4px)`,width:"8px",height:"12px",background:c.text,borderRadius:"2px",border:`1px solid ${c.bg}`}}/>
                    </div>
                    <span style={{fontFamily:gs,fontSize:"0.65rem",color:c.green,fontWeight:600,minWidth:"38px"}}>${r.hi.toFixed(0)}</span>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Divider */}
          <div style={{width:"1px",background:c.border,alignSelf:"stretch",margin:"0 1rem"}}/>
          {/* Key metrics */}
          <div>
            <p style={{fontFamily:gs,fontSize:"0.6rem",color:c.muted,letterSpacing:"0.09em",textTransform:"uppercase",fontWeight:600,marginBottom:"0.75rem"}}>Key Metrics</p>
            {[["Market Cap","$5.40T"],["P/E Ratio","37.75"],["Beta","2.24"],["EPS","$4.93"],["Avg Volume","171M"],["Div Yield","0.02%"]].map(([l,v])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",borderBottom:`1px solid ${c.border}`}}>
                <span style={{fontFamily:gs,fontSize:"0.72rem",color:c.muted}}>{l}</span>
                <span style={{fontFamily:gs,fontSize:"0.74rem",fontWeight:600,color:c.text}}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Price chart: up to 5Y */}
        <div style={{background:c.card,border:`1px solid ${c.border}`,borderRadius:"14px",padding:"1.25rem",marginBottom:"1.5rem"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem",flexWrap:"wrap",gap:"0.5rem"}}>
            <p style={{fontFamily:gs,fontSize:"0.86rem",fontWeight:600,color:c.text}}>Price History</p>
            <div style={{display:"flex",gap:"0.2rem"}}>
              {TIME_RANGES.map(t=><button key={t} onClick={()=>setTimeRange(t)} style={pill(timeRange===t)}>{t}</button>)}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{top:8,right:8,bottom:0,left:0}}>
              <defs>
                <linearGradient id="blueG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={c.blue} stopOpacity={0.22}/><stop offset="95%" stopColor={c.blue} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={c.border} vertical={false}/>
              <XAxis dataKey="date" tick={{fill:c.muted,fontSize:8,fontFamily:gs}} axisLine={false} tickLine={false} tickFormatter={d=>{const p=d.split("-");return`${p[2]}/${p[1]}`;}} interval={Math.floor(chartData.length/5)}/>
              <YAxis domain={[chartMin,chartMax]} tick={{fill:c.muted,fontSize:8,fontFamily:gs}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v>=1000?(v/1000).toFixed(0)+"k":v.toFixed(0)}`} width={44}/>
              <Tooltip content={<ChartTip/>} wrapperStyle={{outline:"none",background:"transparent"}} cursor={{stroke:c.borderHi,strokeWidth:1,strokeDasharray:"3 3"}}/>
              <Area type="monotone" dataKey="price" stroke={c.blue} strokeWidth={2} fill="url(#blueG)" dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* AI Analysis */}
        <div style={{background:c.card,border:`1px solid ${c.border}`,borderRadius:"14px",padding:"1.25rem",marginBottom:"1.5rem"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.9rem"}}>
            <p style={{fontFamily:gs,fontSize:"0.62rem",color:c.green,letterSpacing:"0.12em",textTransform:"uppercase",fontWeight:600}}>AI Analysis</p>
            <div style={{display:"flex",alignItems:"center",gap:"0.5rem"}}>
              {aiState&&<span style={{fontFamily:gs,fontSize:"0.62rem",color:c.muted,background:c.surface,border:`1px solid ${c.border}`,borderRadius:"4px",padding:"2px 7px"}}>Cached · 24h</span>}
              <span style={{fontFamily:gs,fontSize:"0.62rem",color:c.muted,background:c.surface,border:`1px solid ${c.border}`,borderRadius:"4px",padding:"2px 7px"}}>{summaryLimit}</span>
            </div>
          </div>

          {!aiState ? (
            // No analysis yet
            <>
              <div style={{display:"flex",gap:"1.25rem",alignItems:"flex-start",flexWrap:"wrap",marginBottom:"1.1rem"}}>
                <AIScore score={null} c={c} size={68}/>
                <p style={{fontFamily:gs,fontSize:"0.84rem",color:c.muted,lineHeight:1.7,flex:1,minWidth:"180px"}}>
                  Generate an AI analysis for NVDA. Summaries give a quick verdict and overview. Full Reports go deep across valuation, growth, catalysts, and risk.
                </p>
              </div>
              <div style={{display:"flex",gap:"0.6rem",flexWrap:"wrap"}}>
                <button onClick={()=>generateAnalysis("summary")} disabled={aiLoading}
                  style={{background:c.green,color:"#050505",border:"none",borderRadius:"6px",padding:"9px 20px",fontFamily:gs,fontSize:"0.82rem",fontWeight:700,cursor:aiLoading?"not-allowed":"pointer",opacity:aiLoading?0.7:1}}>
                  {aiLoading?"Generating...":"Generate AI Summary"}
                </button>
                <button onClick={()=>{if(canFull&&!aiLoading)generateAnalysis("full");}} disabled={!canFull||aiLoading}
                  style={{background:"transparent",color:c.text,border:`1px solid ${c.borderHi}`,borderRadius:"6px",padding:"9px 20px",fontFamily:gs,fontSize:"0.82rem",fontWeight:600,cursor:(canFull&&!aiLoading)?"pointer":"not-allowed",opacity:(canFull&&!aiLoading)?1:0.45}}>
                  {aiLoading?"Generating...":"Generate Full Report"}{!canFull&&" (Pro+)"}
                </button>
                {aiError&&<p style={{fontFamily:gs,fontSize:"0.78rem",color:c.red,width:"100%",marginTop:"0.3rem"}}>{aiError}</p>}
              </div>
            </>
          ) : (
            // Analysis generated
            <>
              <div style={{display:"flex",gap:"1.25rem",alignItems:"flex-start",flexWrap:"wrap",marginBottom:"0.9rem"}}>
                <AIScore score={summaryResult?.score??93} c={c} size={68}/>
                <div style={{flex:1,minWidth:"180px"}}>
                  {(()=>{
                    const v=summaryResult?.verdict??"Strong Buy";
                    const isBull=v.includes("Buy"),isBear=v.includes("Sell");
                    const col=isBull?c.green:isBear?c.red:c.muted;
                    const bg=isBull?c.greenDim:isBear?c.redDim:c.surface;
                    const bd=isBull?`${c.green}50`:isBear?`${c.red}50`:c.border;
                    return <span style={{fontFamily:gs,fontSize:"0.78rem",fontWeight:700,color:col,background:bg,border:`1px solid ${bd}`,borderRadius:"5px",padding:"3px 11px",display:"inline-block",marginBottom:"0.6rem"}}>{v}</span>;
                  })()}
                  <p style={{fontFamily:gs,fontSize:"0.84rem",color:c.text,lineHeight:1.72}}>
                    {summaryResult?.summary??"NVDA's dominance in AI accelerators is structural. CUDA lock-in makes switching costly for hyperscalers, and data centre demand remains robust through FY2027."}
                  </p>
                </div>
              </div>

              {/* Navigation: always show both directions */}
              <div style={{display:"flex",gap:"0.6rem",flexWrap:"wrap",borderTop:`1px solid ${c.border}`,paddingTop:"0.9rem",alignItems:"center"}}>
                {aiState==="summary"&&(
                  <button onClick={()=>{if(canFull&&!aiLoading)generateAnalysis("full");}} disabled={!canFull||aiLoading}
                    style={{background:"transparent",color:canFull?c.text:c.muted,border:`1px solid ${canFull?c.borderHi:c.border}`,borderRadius:"6px",padding:"8px 18px",fontFamily:gs,fontSize:"0.8rem",fontWeight:600,cursor:canFull?"pointer":"not-allowed",opacity:canFull?1:0.5,position:"relative"}}>
                    Generate Full Report → {!canFull&&<span style={{marginLeft:"4px",background:c.amber,color:"#000",fontSize:"0.55rem",fontWeight:800,padding:"1px 5px",borderRadius:"3px",verticalAlign:"middle"}}>Pro+</span>}
                  </button>
                )}
                {aiState==="full"&&(
                  <>
                    <button onClick={()=>setShowReport(true)}
                      style={{background:c.text,color:c.bg,border:"none",borderRadius:"6px",padding:"8px 18px",fontFamily:gs,fontSize:"0.8rem",fontWeight:700,cursor:"pointer"}}>
                      View Full Report
                    </button>
                    <button onClick={()=>setAiState("summary")}
                      style={{background:"transparent",color:c.muted,border:`1px solid ${c.border}`,borderRadius:"6px",padding:"8px 14px",fontFamily:gs,fontSize:"0.78rem",cursor:"pointer"}}>
                      Back to Summary
                    </button>
                  </>
                )}
                {aiError&&<p style={{fontFamily:gs,fontSize:"0.78rem",color:c.red}}>{aiError}</p>}
              </div>
            </>
          )}
        </div>

        <div style={{background:c.card,border:`1px solid ${c.border}`,borderRadius:"14px",padding:"1.25rem",marginBottom:"1.5rem"}}>
          {/* Statistics — always full width, all screen sizes */}
          <StatisticsPanel c={c} mode={mode} userPlan={userPlan} instrumentType={instrumentType} router={router} ticker={ticker}/>

          {/* Financials — below Statistics, only for stocks, hidden on mobile unless selected */}
          {(instrumentType!=="etf"&&instrumentType!=="commodity"&&instrumentType!=="index")&&(
            <>
              <div style={{height:"1px",background:c.border,margin:"1.5rem 0"}}/>
              {isMobile ? (
                <div>
                  <div style={{display:"flex",gap:"0",background:c.surface,borderRadius:"8px",padding:"4px",border:`1px solid ${c.border}`,marginBottom:"1rem"}}>
                    {["statistics","financials"].map(t=>(
                      <button key={t} onClick={()=>setMobileTab(t)} style={{flex:1,background:mobileTab===t?c.text:"transparent",color:mobileTab===t?c.bg:c.muted,border:"none",borderRadius:"6px",padding:"7px",fontFamily:gs,fontSize:"0.78rem",fontWeight:600,cursor:"pointer",textTransform:"capitalize",transition:"all 0.18s"}}>{t}</button>
                    ))}
                  </div>
                  {mobileTab==="financials"&&<FinancialsPanel c={c} mode={mode} userPlan={userPlan}/>}
                </div>
              ) : (
                <FinancialsPanel c={c} mode={mode} userPlan={userPlan}/>
              )}
            </>
          )}

          {/* Terms Explained: spans full width, context-aware by instrument type */}
          <TermsExplained c={c} instrumentType={instrumentType}/>
        </div>

        {/* Company Profile */}
        <div style={{background:c.card,border:`1px solid ${c.border}`,borderRadius:"14px",padding:"1.25rem"}}>
          <p style={{fontFamily:gs,fontSize:"0.88rem",fontWeight:600,color:c.text,marginBottom:"0.9rem"}}>Company Profile</p>
          <p style={{fontFamily:gs,fontSize:"0.84rem",color:c.muted,lineHeight:1.75,marginBottom:"1.1rem"}}>NVIDIA Corporation provides graphics, compute and networking solutions globally. Its Data Center segment powers AI accelerated computing via H100/H200/Blackwell GPUs, Mellanox networking, and the CUDA software platform. Gaming remains a secondary but material revenue contributor.</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(175px,1fr))",gap:"0.6rem"}}>
            {[["CEO","Jensen Huang"],["Employees","36,000"],["Headquarters","Santa Clara, CA"],["Sector","Technology"],["Industry","Semiconductors"],["Exchange","NASDAQ"],["ISIN","US67066G1040"],["Website","nvidia.com"]].map(([l,v])=>(
              <div key={l} style={{background:c.surface,borderRadius:"7px",padding:"0.65rem"}}>
                <p style={{fontFamily:gs,fontSize:"0.58rem",color:c.muted,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:"3px"}}>{l}</p>
                <p style={{fontFamily:gs,fontSize:"0.8rem",fontWeight:600,color:c.text}}>{v}</p>
              </div>
            ))}
          </div>
        </div>

        <p style={{fontFamily:gs,color:c.muted,fontSize:"0.68rem",textAlign:"center",marginTop:"1.75rem"}}>
          For informational purposes only · Not financial advice · Data via Financial Modeling Prep
        </p>

        {showReport && fullReport && (
          <FullReportPopup
            report={fullReport}
            ticker={ticker.toUpperCase()}
            name={ticker.toUpperCase()}
            onClose={()=>setShowReport(false)}
            onRegenerate={()=>{setShowReport(false);generateAnalysis("full");}}
            c={c}
            mode={mode}
          />
        )}
      </div>
    </div>
  );
}