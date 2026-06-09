"use client";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useTheme } from "@/lib/theme";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";

// ─── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  dark: {
    bg:"#090909", card:"#111113", surface:"#141416",
    border:"#232325", borderHi:"#333336",
    text:"#F0F0F0", muted:"#7A7A80",
    green:"#00E676", greenDim:"rgba(0,230,118,0.10)",
    blue:"#4488FF",  blueDim:"rgba(68,136,255,0.12)",
    red:"#FF1800",   redDim:"rgba(255,24,0,0.10)",
    amber:"#F59E0B",
    cg:"linear-gradient(145deg,#131316,#0F0F12)",
  },
  light: {
    bg:"#F7F7F5", card:"#FFFFFF", surface:"#EEEEED",
    border:"#DEDEDD", borderHi:"#BABAB8",
    text:"#0A0A0A", muted:"#606065",
    green:"#008A38", greenDim:"rgba(0,138,56,0.09)",
    blue:"#1E55CC",  blueDim:"rgba(30,85,204,0.09)",
    red:"#CC0000",   redDim:"rgba(204,0,0,0.10)",
    amber:"#B45309",
    cg:"linear-gradient(145deg,#FFFFFF,#F2F2F0)",
  },
};
const gs = "'Google Sans Flex','DM Sans',sans-serif";

// ─── Mock stock data ─────────────────────────────────────────────────────────
// TODO: replace with live /api/stocks response once FMP is wired
const MOCK_STOCKS = [
  {ticker:"NVDA", name:"NVIDIA Corp",          exchange:"NASDAQ", sector:"Technology",       market:"US", price:875.40, chg:+5.43, mktCap:"$2.15T", score:93, verdict:"Strong Buy", pe:65.2, ps:28.1, evEbitda:42.3, grossMargin:"78.4%", revenueGrowth:"+122%", dayLow:831.20, dayHigh:891.60, weekLow:402.01, weekHigh:974.00,
   risks:[{flag:"China export restrictions",level:"High"},{flag:"Customer concentration",level:"Medium"},{flag:"AMD MI300X competition",level:"Low"}]},
  {ticker:"AAPL", name:"Apple Inc",            exchange:"NASDAQ", sector:"Technology",       market:"US", price:184.20, chg:+1.82, mktCap:"$2.83T", score:84, verdict:"Buy",        pe:28.4, ps:7.2,  evEbitda:22.1, grossMargin:"45.9%", revenueGrowth:"+6%",   dayLow:181.10, dayHigh:185.90, weekLow:164.08, weekHigh:199.62,
   risks:[{flag:"China revenue concentration",level:"Medium"},{flag:"iPhone upgrade cycle slowdown",level:"Medium"},{flag:"Regulatory antitrust scrutiny",level:"Low"}]},
  {ticker:"MSFT", name:"Microsoft Corp",       exchange:"NASDAQ", sector:"Technology",       market:"US", price:415.80, chg:+0.94, mktCap:"$3.09T", score:91, verdict:"Strong Buy", pe:35.1, ps:13.4, evEbitda:28.7, grossMargin:"69.8%", revenueGrowth:"+17%",  dayLow:411.20, dayHigh:418.60, weekLow:309.45, weekHigh:430.82,
   risks:[{flag:"Azure growth deceleration risk",level:"Low"},{flag:"AI capex scaling costs",level:"Medium"},{flag:"Regulatory/antitrust exposure",level:"Low"}]},
  {ticker:"AMZN", name:"Amazon.com Inc",       exchange:"NASDAQ", sector:"Consumer Disc.",   market:"US", price:186.30, chg:+2.11, mktCap:"$1.95T", score:82, verdict:"Buy",        pe:44.2, ps:3.2,  evEbitda:19.8, grossMargin:"47.6%", revenueGrowth:"+13%",  dayLow:183.40, dayHigh:188.70, weekLow:118.35, weekHigh:201.20,
   risks:[{flag:"AWS competitive pressure",level:"Low"},{flag:"Labour relations and costs",level:"Medium"},{flag:"Advertising slowdown sensitivity",level:"Low"}]},
  {ticker:"GOOGL",name:"Alphabet Inc",         exchange:"NASDAQ", sector:"Communication",    market:"US", price:163.80, chg:+0.34, mktCap:"$2.02T", score:80, verdict:"Buy",        pe:24.6, ps:6.1,  evEbitda:18.4, grossMargin:"56.9%", revenueGrowth:"+15%",  dayLow:161.20, dayHigh:165.40, weekLow:121.46, weekHigh:191.75,
   risks:[{flag:"AI search disruption risk",level:"High"},{flag:"Antitrust ruling overhang",level:"High"},{flag:"YouTube ad spend cyclicality",level:"Low"}]},
  {ticker:"META", name:"Meta Platforms",       exchange:"NASDAQ", sector:"Communication",    market:"US", price:504.20, chg:+3.21, mktCap:"$1.28T", score:83, verdict:"Buy",        pe:25.8, ps:8.9,  evEbitda:21.3, grossMargin:"81.5%", revenueGrowth:"+27%",  dayLow:496.80, dayHigh:510.30, weekLow:279.40, weekHigh:531.49,
   risks:[{flag:"AI Capex escalation",level:"Medium"},{flag:"Regulatory fine risk (EU)",level:"Medium"},{flag:"Gen-Z engagement trends",level:"Low"}]},
  {ticker:"TSLA", name:"Tesla Inc",            exchange:"NASDAQ", sector:"Automotive",       market:"US", price:248.50, chg:-1.34, mktCap:"$794B",  score:61, verdict:"Hold",       pe:61.8, ps:7.4,  evEbitda:38.2, grossMargin:"18.2%", revenueGrowth:"+8%",   dayLow:243.20, dayHigh:252.10, weekLow:138.80, weekHigh:278.98,
   risks:[{flag:"Margin compression pressure",level:"High"},{flag:"Elon Musk distraction risk",level:"High"},{flag:"EV demand slowdown",level:"Medium"}]},
  {ticker:"JNJ",  name:"Johnson & Johnson",    exchange:"NYSE",   sector:"Healthcare",       market:"US", price:151.80, chg:+0.42, mktCap:"$364B",  score:78, verdict:"Buy",        pe:14.8, ps:4.1,  evEbitda:11.9, grossMargin:"68.7%", revenueGrowth:"+4%",   dayLow:149.90, dayHigh:153.20, weekLow:143.13, weekHigh:168.99,
   risks:[{flag:"Talc litigation liability",level:"High"},{flag:"Patent cliffs on MedTech",level:"Medium"},{flag:"Pharma pricing pressure",level:"Low"}]},
  {ticker:"V",    name:"Visa Inc",             exchange:"NYSE",   sector:"Financials",       market:"US", price:277.40, chg:+0.86, mktCap:"$571B",  score:85, verdict:"Strong Buy", pe:28.9, ps:16.3, evEbitda:23.7, grossMargin:"97.8%", revenueGrowth:"+10%",  dayLow:274.10, dayHigh:279.80, weekLow:227.82, weekHigh:290.96,
   risks:[{flag:"Crypto/DeFi disintermediation",level:"Low"},{flag:"Regulatory interchange caps",level:"Medium"},{flag:"Global recession sensitivity",level:"Low"}]},
  {ticker:"XOM",  name:"Exxon Mobil",          exchange:"NYSE",   sector:"Energy",           market:"US", price:114.20, chg:+0.92, mktCap:"$455B",  score:72, verdict:"Hold",       pe:12.4, ps:1.3,  evEbitda:8.4,  grossMargin:"44.8%", revenueGrowth:"+2%",   dayLow:112.40, dayHigh:116.10, weekLow:95.77,  weekHigh:123.75,
   risks:[{flag:"Oil price cyclical exposure",level:"High"},{flag:"Energy transition headwinds",level:"Medium"},{flag:"Permian Basin capex intensity",level:"Low"}]},
  {ticker:"KO",   name:"Coca-Cola Co",         exchange:"NYSE",   sector:"Consumer Staples", market:"US", price:61.40,  chg:-0.18, mktCap:"$265B",  score:72, verdict:"Hold",       pe:22.1, ps:5.8,  evEbitda:18.2, grossMargin:"59.2%", revenueGrowth:"+3%",   dayLow:60.80,  dayHigh:62.10,  weekLow:55.29,  weekHigh:67.20,
   risks:[{flag:"Sugar/health regulation risk",level:"Medium"},{flag:"Currency headwinds (EM)",level:"Medium"},{flag:"Commodity cost inflation",level:"Low"}]},
  {ticker:"WMT",  name:"Walmart Inc",          exchange:"NYSE",   sector:"Consumer Staples", market:"US", price:84.60,  chg:+0.34, mktCap:"$682B",  score:78, verdict:"Buy",        pe:28.4, ps:0.8,  evEbitda:17.8, grossMargin:"24.2%", revenueGrowth:"+6%",   dayLow:83.40,  dayHigh:85.80,  weekLow:60.14,  weekHigh:93.47,
   risks:[{flag:"Margin thin — execution dependent",level:"Medium"},{flag:"eCommerce competition",level:"Low"},{flag:"Labour cost escalation",level:"Low"}]},
];

const SECTORS     = ["All","Technology","Healthcare","Financials","Energy","Consumer Staples","Consumer Disc.","Communication","Automotive"];
const MARKETS     = [{id:"All",label:"All",on:true},{id:"US",label:"US",on:true},{id:"EU",label:"EU 🔜",on:false},{id:"UK",label:"UK 🔜",on:false}];
const TIME_RANGES = ["1W","1M","3M","6M","1Y"];
const DAYS        = {"1W":7,"1M":30,"3M":90,"6M":180,"1Y":365};

// ─── Market hours (NYSE/NASDAQ, times in UTC minutes) ────────────────────────
const MARKET_HOURS = {
  NASDAQ: { open:[870,1260], pre:[840,870], after:[1260,1320], tz:"America/New_York", label:"NYSE/NASDAQ" },
  NYSE:   { open:[870,1260], pre:[840,870], after:[1260,1320], tz:"America/New_York", label:"NYSE"        },
};

function getMarketStatus(exchange) {
  const h = MARKET_HOURS[exchange] || MARKET_HOURS.NASDAQ;
  const now = new Date();
  if ([0,6].includes(now.getUTCDay())) return { label:"Weekend", col:"muted", isOpen:false };
  const t = now.getUTCHours()*60 + now.getUTCMinutes();
  if (t >= h.open[0]  && t < h.open[1] ) return { label:"Open",        col:"green", isOpen:true  };
  if (t >= h.pre[0]   && t < h.pre[1]  ) return { label:"Pre-Market",  col:"amber", isOpen:false };
  if (t >= h.after[0] && t < h.after[1]) return { label:"After-Hours", col:"amber", isOpen:false };
  return { label:"Closed", col:"red", isOpen:false };
}

function getMarketHoursLocal(exchange) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const tzAbbr = new Intl.DateTimeFormat("en",{ timeZone:tz, timeZoneName:"short" })
    .formatToParts(new Date()).find(p => p.type === "timeZoneName")?.value || tz;
  const offsetMin  = -new Date().getTimezoneOffset();
  const etOffset   = -300; // EST winter
  const diff       = offsetMin - etOffset;
  const toLocal    = (h,m) => {
    let mins = h*60 + m + diff;
    const hh = Math.floor(((mins%1440)+1440)%1440/60).toString().padStart(2,"0");
    const mm  = (((mins%1440)+1440)%1440%60).toString().padStart(2,"0");
    return `${hh}:${mm}`;
  };
  return `${toLocal(9,30)} – ${toLocal(16,0)} ${tzAbbr}`;
}

// ─── Mock chart generator ─────────────────────────────────────────────────────
function genChartData(stock, range) {
  const days = DAYS[range];
  const pts  = Math.min(days, range==="1W"?7:range==="1M"?20:range==="3M"?60:range==="6M"?90:120);
  const data = [];
  let price  = stock.price * (1 - stock.chg/100 * (days/365));
  const trend = stock.chg > 0 ? 1 : -1;
  for (let i = 0; i < pts; i++) {
    const noise = (Math.random()-0.48) * stock.price * 0.015;
    const drift = (stock.price-price) / (pts-i) * 0.8;
    price = Math.max(price*0.95, price+drift+noise*trend*0.3);
    const d = new Date(Date.now()-(pts-i)*864e5/pts*days);
    data.push({ date:d.toISOString().slice(0,10), price:+price.toFixed(2) });
  }
  data[data.length-1].price = stock.price;
  return data;
}

// ─── Parse market cap string for numeric sort ────────────────────────────────
function parseMktCap(v) {
  if (!v) return 0;
  const n = parseFloat(v.replace(/[^0-9.]/g,""));
  if (v.includes("T")) return n * 1e12;
  if (v.includes("B")) return n * 1e9;
  return n;
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const IconBookmark = ({ filled, size=14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24"
    fill={filled?"currentColor":"none"} stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
  </svg>
);
const IconPieChart = ({ size=14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>
    <path d="M22 12A10 10 0 0 0 12 2v10z"/>
  </svg>
);
const IconChevronDown = ({ size=12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2.5"
    strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

// ─── AI Score circle ──────────────────────────────────────────────────────────
function AIScore({ score, c, size=40 }) {
  if (score == null) return null;
  const col    = score >= 80 ? c.green : score >= 65 ? c.text : c.red;
  const r      = (size-5)/2, cx2 = size/2, circ = 2*Math.PI*r;
  const offset = circ*(1-score/100);
  return (
    <div style={{ position:"relative", width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} style={{ position:"absolute", top:0, left:0, transform:"rotate(-90deg)" }}>
        <circle cx={cx2} cy={cx2} r={r} fill="none" stroke={col} strokeOpacity={0.2} strokeWidth="3"/>
        <circle cx={cx2} cy={cx2} r={r} fill="none" stroke={col} strokeWidth="3"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"/>
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <span style={{ fontFamily:gs, fontSize:size*0.26, fontWeight:800, color:col, lineHeight:1 }}>{score}</span>
      </div>
    </div>
  );
}

// ─── Chart tooltip ────────────────────────────────────────────────────────────
function ChartTip({ active, payload, c }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:c.card, border:`1px solid ${c.borderHi}`, borderRadius:"6px", padding:"7px 11px" }}>
      <div style={{ fontFamily:gs, fontSize:"0.68rem", color:c.muted, marginBottom:"2px" }}>{payload[0]?.payload?.date}</div>
      <div style={{ fontFamily:gs, fontSize:"0.82rem", fontWeight:700, color:c.text }}>${payload[0]?.value?.toFixed(2)}</div>
    </div>
  );
}

// ─── Verdict badge ────────────────────────────────────────────────────────────
function VerdictBadge({ verdict, c }) {
  const isBull = verdict?.includes("Buy");
  const isBear = verdict?.includes("Sell");
  const col = isBull ? c.green : isBear ? c.red : c.muted;
  const bg  = isBull ? c.greenDim : isBear ? c.redDim : c.surface;
  const bd  = isBull ? `${c.green}40` : isBear ? `${c.red}40` : c.border;
  return (
    <span style={{ fontFamily:gs, fontSize:"0.68rem", fontWeight:700, color:col, background:bg,
      border:`1px solid ${bd}`, borderRadius:"4px", padding:"3px 8px", whiteSpace:"nowrap" }}>
      {verdict || "—"}
    </span>
  );
}

// ─── Floating Stock Card ──────────────────────────────────────────────────────
function StockCard({ stock, c, mode, onClose, watchlist, onWatchlist, portfolios, onAddToPortfolio, onViewFullAnalysis }) {
  const [tab,       setTab]       = useState("overview");
  const [timeRange, setTimeRange] = useState("3M");
  const [portOpen,  setPortOpen]  = useState(false);
  const [addedTo,   setAddedTo]   = useState(null);
  const portRef = useRef(null);

  const chartData = useMemo(() => genChartData(stock, timeRange), [stock, timeRange]);
  const chartMin  = useMemo(() => Math.min(...chartData.map(d=>d.price))*0.993, [chartData]);
  const chartMax  = useMemo(() => Math.max(...chartData.map(d=>d.price))*1.007, [chartData]);
  const status    = getMarketStatus(stock.exchange);
  const hours     = getMarketHoursLocal(stock.exchange);
  const stColor   = c[status.col] || c.muted;
  const pos       = stock.chg >= 0;
  const inWatchlist = watchlist.has(stock.ticker);

  useEffect(() => {
    const h = e => { if (portRef.current && !portRef.current.contains(e.target)) setPortOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const handleAddToPortfolio = (p) => {
    onAddToPortfolio(stock.ticker, p);
    setAddedTo(p.name);
    setPortOpen(false);
    setTimeout(() => setAddedTo(null), 2500);
  };

  const pill = (active) => ({
    background:active ? c.text : "transparent", color:active ? c.bg : c.muted,
    border:`1px solid ${active ? c.text : c.border}`,
    borderRadius:"4px", padding:"4px 10px",
    fontFamily:gs, fontSize:"0.68rem", fontWeight:600,
    cursor:"pointer", transition:"all 0.15s",
  });

  const tabBtn = (active) => ({
    background:"none", border:"none", cursor:"pointer",
    fontFamily:gs, fontSize:"0.76rem", fontWeight:active?600:400,
    color:active ? c.text : c.muted,
    borderBottom:`2px solid ${active ? c.text : "transparent"}`,
    padding:"6px 2px 8px", marginBottom:"-1px",
    transition:"all 0.15s", whiteSpace:"nowrap",
  });

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.65)", zIndex:400, backdropFilter:"blur(4px)" }}/>

      {/* Card */}
      <div style={{
        position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)",
        width:"min(780px,93vw)", maxHeight:"88vh",
        display:"flex", flexDirection:"column",
        background:mode==="dark" ? "#0E0E10" : "#FFFFFF",
        border:`1px solid ${c.borderHi}`,
        borderRadius:"16px",
        boxShadow:"0 32px 80px rgba(0,0,0,0.5)",
        zIndex:401,
      }}>

        {/* Header */}
        <div style={{
          padding:"1.25rem 1.5rem", borderBottom:`1px solid ${c.border}`,
          background:mode==="dark" ? "linear-gradient(90deg,#111113,#141418)" : "linear-gradient(90deg,#FFFFFF,#F5F5F8)",
          position:"sticky", top:0, zIndex:2, borderRadius:"16px 16px 0 0",
        }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"1rem" }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:"0.6rem", marginBottom:"0.25rem", flexWrap:"wrap" }}>
                <span style={{ fontFamily:gs, fontSize:"1.4rem", fontWeight:700, color:c.text }}>{stock.ticker}</span>
                <span style={{ fontFamily:gs, fontSize:"0.65rem", fontWeight:700, color:stColor,
                  background:`${stColor}18`, border:`1px solid ${stColor}40`,
                  borderRadius:"4px", padding:"2px 7px", letterSpacing:"0.05em", textTransform:"uppercase" }}>
                  {status.label}
                </span>
                <span style={{ fontFamily:gs, fontSize:"0.68rem", color:c.muted }}>{stock.exchange}</span>
              </div>
              <div style={{ fontFamily:gs, fontSize:"0.82rem", color:c.muted, marginBottom:"0.35rem" }}>{stock.name}</div>
              <div style={{ display:"flex", alignItems:"center", gap:"5px" }}>
                <div style={{ width:6, height:6, borderRadius:"50%", background:stColor, boxShadow:status.isOpen?`0 0 6px ${stColor}`:"none" }}/>
                <span style={{ fontFamily:gs, fontSize:"0.65rem", color:c.muted }}>
                  {MARKET_HOURS[stock.exchange]?.label || stock.exchange} · {hours}
                </span>
              </div>
            </div>
            <div style={{ display:"flex", alignItems:"flex-start", gap:"1rem", flexShrink:0 }}>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontFamily:gs, fontSize:"1.6rem", fontWeight:700, color:c.text, lineHeight:1 }}>${stock.price.toFixed(2)}</div>
                <div style={{ fontFamily:gs, fontSize:"0.82rem", fontWeight:700, color:pos?c.green:c.red, marginTop:"3px" }}>
                  {pos?"+":""}{stock.chg.toFixed(2)}% · 24h
                </div>
              </div>
              <button onClick={onClose} style={{
                background:c.surface, border:`1px solid ${c.border}`, borderRadius:"7px",
                padding:"7px 10px", cursor:"pointer", color:c.muted,
                fontFamily:gs, fontSize:"0.78rem", display:"flex", alignItems:"center", gap:"4px",
              }}>✕ <span style={{ fontSize:"0.58rem", opacity:0.6 }}>ESC</span></button>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:"0.75rem", marginTop:"0.75rem" }}>
            <AIScore score={stock.score} c={c} size={42}/>
            <VerdictBadge verdict={stock.verdict} c={c}/>
            <span style={{ fontFamily:gs, fontSize:"0.72rem", color:c.muted }}>{stock.sector} · {stock.market}</span>
            <span style={{ fontFamily:gs, fontSize:"0.72rem", color:c.muted }}>
              Market Cap: <strong style={{ color:c.text }}>{stock.mktCap}</strong>
            </span>
          </div>
        </div>

        {/* Body: chart + tabs */}
        <div style={{ flex:1, overflowY:"auto", display:"grid", gridTemplateColumns:"1fr 340px" }}>

          {/* Chart column */}
          <div style={{ padding:"1.4rem 1.25rem 1.25rem", borderRight:`1px solid ${c.border}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1rem" }}>
              <span style={{ fontFamily:gs, fontSize:"0.68rem", color:c.muted, letterSpacing:"0.1em", textTransform:"uppercase", fontWeight:600 }}>
                Price History
              </span>
              <div style={{ display:"flex", gap:"0.25rem" }}>
                {TIME_RANGES.map(t => (
                  <button key={t} onClick={() => setTimeRange(t)} style={pill(timeRange===t)}>{t}</button>
                ))}
              </div>
            </div>

            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData} margin={{ top:8, right:8, bottom:0, left:0 }}>
                <defs>
                  <linearGradient id="cg-disc-blue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={c.blue} stopOpacity={0.22}/>
                    <stop offset="95%" stopColor={c.blue} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={c.border} vertical={false}/>
                <XAxis dataKey="date" tick={{ fill:c.muted, fontSize:8, fontFamily:gs }} axisLine={false} tickLine={false}
                  tickFormatter={d => { const p=d.split("-"); return `${p[2]}/${p[1]}`; }}
                  interval={Math.floor(chartData.length/5)}/>
                <YAxis domain={[chartMin,chartMax]} tick={{ fill:c.muted, fontSize:8, fontFamily:gs }}
                  axisLine={false} tickLine={false}
                  tickFormatter={v => `$${v>=1000?(v/1000).toFixed(0)+"k":v.toFixed(0)}`} width={44}/>
                <Tooltip content={<ChartTip c={c}/>}/>
                <Area type="monotone" dataKey="price" stroke={c.blue} strokeWidth={2}
                  fill="url(#cg-disc-blue)" dot={false} activeDot={{ r:4, fill:c.blue }}/>
              </AreaChart>
            </ResponsiveContainer>

            {/* 52-week range bar */}
            <div style={{ marginTop:"1rem", padding:"0.75rem", background:c.surface, borderRadius:"8px", border:`1px solid ${c.border}` }}>
              <div style={{ fontFamily:gs, fontSize:"0.6rem", color:c.muted, letterSpacing:"0.09em", textTransform:"uppercase", fontWeight:600, marginBottom:"6px" }}>
                52-Week Range
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"5px" }}>
                <span style={{ fontFamily:gs, fontSize:"0.74rem", color:c.red,   fontWeight:600 }}>${stock.weekLow?.toFixed(2)}</span>
                <span style={{ fontFamily:gs, fontSize:"0.74rem", color:c.green, fontWeight:600 }}>${stock.weekHigh?.toFixed(2)}</span>
              </div>
              {(() => {
                const pct = stock.weekLow && stock.weekHigh && stock.weekHigh > stock.weekLow
                  ? Math.min(100, Math.max(0, ((stock.price-stock.weekLow)/(stock.weekHigh-stock.weekLow))*100)) : 50;
                return (
                  <div style={{ position:"relative", height:"5px", background:c.border, borderRadius:"3px" }}>
                    <div style={{ position:"absolute", left:0, width:`${pct}%`, height:"100%",
                      background:`linear-gradient(90deg,${c.red},${c.green})`, borderRadius:"3px" }}/>
                    <div style={{ position:"absolute", top:"-4px", left:`calc(${pct}% - 4px)`,
                      width:"8px", height:"13px", background:c.text, borderRadius:"2px", border:`1px solid ${c.bg}` }}/>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Tabs column */}
          <div style={{ padding:"1.25rem" }}>
            <div style={{ display:"flex", gap:"0.4rem", borderBottom:`1px solid ${c.border}`, marginBottom:"1rem" }}>
              {["Overview","Valuation","Risk"].map(t => (
                <button key={t} onClick={() => setTab(t.toLowerCase())} style={tabBtn(tab===t.toLowerCase())}>{t}</button>
              ))}
            </div>

            {tab === "overview" && (
              <div style={{ display:"flex", flexDirection:"column", gap:"0.7rem" }}>
                <div style={{ background:mode==="dark"?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)", borderRadius:"8px", padding:"0.85rem", borderLeft:`2.5px solid ${c.borderHi}` }}>
                  <div style={{ fontFamily:gs, fontSize:"0.58rem", color:c.muted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"5px", fontWeight:700 }}>AI Summary</div>
                  <p style={{ fontFamily:gs, fontSize:"0.78rem", color:c.text, lineHeight:1.68 }}>
                    {stock.ticker === "NVDA"
                      ? "NVDA's AI accelerator dominance is structural. CUDA lock-in makes switching costly for hyperscalers. Revenue growth and margin expansion support a constructive outlook."
                      : `${stock.name} shows consistent fundamentals with a well-established market position. Key metrics suggest a ${stock.verdict?.toLowerCase()||"neutral"} positioning for the period ahead.`}
                  </p>
                </div>
                {[
                  { label:"Revenue Growth (YoY)", value:stock.revenueGrowth, flag:stock.chg>0?"positive":"neutral" },
                  { label:"Gross Margin",          value:stock.grossMargin,   flag:"positive" },
                  { label:"P/E Ratio",             value:`${stock.pe}×`,      flag:stock.pe<30?"positive":"neutral" },
                  { label:"24h Volume",            value:"—",                 flag:"neutral" },
                ].map((row,i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 0", borderBottom:`1px solid ${c.border}` }}>
                    <span style={{ fontFamily:gs, fontSize:"0.78rem", color:c.muted }}>{row.label}</span>
                    <span style={{ fontFamily:gs, fontSize:"0.8rem", fontWeight:700, color:row.flag==="positive"?c.green:row.flag==="negative"?c.red:c.text }}>{row.value}</span>
                  </div>
                ))}
              </div>
            )}

            {tab === "valuation" && (
              <div style={{ display:"flex", flexDirection:"column", gap:"0.7rem" }}>
                <div style={{ background:mode==="dark"?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)", borderRadius:"8px", padding:"0.85rem", borderLeft:`2.5px solid ${c.borderHi}` }}>
                  <div style={{ fontFamily:gs, fontSize:"0.58rem", color:c.muted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"5px", fontWeight:700 }}>Valuation Note</div>
                  <p style={{ fontFamily:gs, fontSize:"0.78rem", color:c.text, lineHeight:1.68 }}>
                    {stock.pe < 20
                      ? `Trading at ${stock.pe}× earnings with a P/S of ${stock.ps}×. Valuation appears attractive relative to sector peers.`
                      : `EV/EBITDA of ${stock.evEbitda}× and P/S of ${stock.ps}×. Premium to peers justified by growth trajectory.`}
                  </p>
                </div>
                {[
                  { label:"P/E Ratio",     value:`${stock.pe}×`       },
                  { label:"Price / Sales", value:`${stock.ps}×`       },
                  { label:"EV / EBITDA",   value:`${stock.evEbitda}×` },
                  { label:"vs Sector P/E", value:"—"                  },
                ].map((row,i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 0", borderBottom:`1px solid ${c.border}` }}>
                    <span style={{ fontFamily:gs, fontSize:"0.78rem", color:c.muted }}>{row.label}</span>
                    <span style={{ fontFamily:gs, fontSize:"0.8rem", fontWeight:700, color:c.text }}>{row.value}</span>
                  </div>
                ))}
              </div>
            )}

            {tab === "risk" && (
              <div style={{ display:"flex", flexDirection:"column", gap:"0.6rem" }}>
                {stock.risks?.map((r,i) => {
                  const col = r.level==="High" ? c.red : r.level==="Medium" ? c.amber : c.green;
                  return (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:"0.6rem", padding:"9px 11px",
                      background:mode==="dark"?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)",
                      borderRadius:"8px", border:`1px solid ${c.border}` }}>
                      <span style={{ fontFamily:gs, fontSize:"0.76rem", color:c.text, flex:1 }}>{r.flag}</span>
                      <span style={{ fontFamily:gs, fontSize:"0.62rem", fontWeight:700, color:col, letterSpacing:"0.05em", textTransform:"uppercase", flexShrink:0 }}>{r.level}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div style={{
          padding:"1rem 1.5rem", borderTop:`1px solid ${c.border}`,
          display:"flex", alignItems:"center", gap:"0.75rem",
          background:mode==="dark"?"rgba(9,9,9,0.5)":"rgba(247,247,245,0.5)",
          flexWrap:"wrap", borderRadius:"0 0 16px 16px",
        }}>
          {/* Watchlist toggle */}
          <button onClick={() => onWatchlist(stock.ticker)}
            style={{
              background:inWatchlist ? c.greenDim : "transparent",
              border:`1px solid ${inWatchlist ? `${c.green}50` : c.border}`,
              borderRadius:"7px", padding:"9px 16px",
              cursor:"pointer", color:inWatchlist ? c.green : c.muted,
              fontFamily:gs, fontSize:"0.8rem",
              display:"flex", alignItems:"center", gap:"6px",
              transition:"all 0.2s",
            }}>
            <IconBookmark filled={inWatchlist} size={14}/>
            {inWatchlist ? "Watching" : "Watchlist"}
          </button>

          {/* Add to portfolio dropdown */}
          <div ref={portRef} style={{ position:"relative" }}>
            <button onClick={() => setPortOpen(!portOpen)}
              style={{
                background:addedTo ? c.greenDim : c.surface,
                border:`1px solid ${addedTo ? `${c.green}50` : c.borderHi}`,
                borderRadius:"7px", padding:"9px 14px",
                cursor:"pointer", color:addedTo ? c.green : c.muted,
                fontFamily:gs, fontSize:"0.8rem",
                display:"flex", alignItems:"center", gap:"6px",
                transition:"all 0.2s",
              }}>
              <IconPieChart size={14}/>
              {addedTo ? `Added to ${addedTo} ✓` : "Add to Portfolio"}
              {!addedTo && <IconChevronDown size={11}/>}
            </button>
            {portOpen && (
              <div style={{
                position:"absolute", bottom:"calc(100% + 6px)", left:0,
                background:c.card, border:`1px solid ${c.borderHi}`,
                borderRadius:"9px", overflow:"hidden", zIndex:10,
                boxShadow:"0 8px 24px rgba(0,0,0,0.25)", minWidth:"190px",
              }}>
                <div style={{ padding:"8px 12px", fontFamily:gs, fontSize:"0.62rem", color:c.muted,
                  letterSpacing:"0.1em", textTransform:"uppercase", borderBottom:`1px solid ${c.border}` }}>
                  Add to portfolio
                </div>
                {portfolios.length === 0 ? (
                  <div style={{ padding:"10px 14px", fontFamily:gs, fontSize:"0.78rem", color:c.muted }}>
                    No portfolios yet
                  </div>
                ) : portfolios.map(p => (
                  <button key={p.id} onClick={() => handleAddToPortfolio(p)}
                    style={{ width:"100%", padding:"9px 14px", background:"transparent", border:"none",
                      borderBottom:`1px solid ${c.border}`, textAlign:"left", cursor:"pointer",
                      fontFamily:gs, fontSize:"0.82rem", color:c.text,
                      display:"flex", alignItems:"center", gap:"7px" }}
                    onMouseEnter={e => e.currentTarget.style.background = c.surface}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <IconPieChart size={12}/>{p.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ flex:1 }}/>

          {/* View full analysis — navigates to analysis page */}
          <button onClick={onViewFullAnalysis}
            style={{ background:c.text, color:c.bg, border:"none", borderRadius:"7px",
              padding:"9px 22px", fontFamily:gs, fontSize:"0.84rem", fontWeight:700,
              cursor:"pointer", letterSpacing:"0.02em" }}>
            View Full Analysis →
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Main Discovery Page ──────────────────────────────────────────────────────
export default function DiscoveryPage() {
  const { mode } = useTheme();
  const c        = C[mode];
  const router   = useRouter();
  const supabase = createClient();

  // ── State ──────────────────────────────────────────────────────────────────
  const [stocks,      setStocks]      = useState(MOCK_STOCKS); // TODO: fetch from /api/stocks (FMP)
  const [watchlist,   setWatchlist]   = useState(new Set());
  const [portfolios,  setPortfolios]  = useState([]);
  const [token,       setToken]       = useState(null);

  const [search,      setSearch]      = useState("");
  const [sfoc,        setSfoc]        = useState(false);
  const [sector,      setSector]      = useState("All");
  const [market,      setMarket]      = useState("All");
  const [sortKey,     setSortKey]     = useState("score");
  const [sortDir,     setSortDir]     = useState("desc");
  const [selected,    setSelected]    = useState(null);
  const [hovRow,      setHovRow]      = useState(null);
  const [openPortRow, setOpenPortRow] = useState(null);

  // ── Load session, watchlist, portfolios ────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data:{ session } }) => {
      if (!session) { router.push("/login"); return; }
      const tok = session.access_token;
      setToken(tok);

      // Load watchlist tickers
      try {
        const res = await fetch("/api/watchlist", { headers:{ Authorization:`Bearer ${tok}` } });
        if (res.ok) {
          const data = await res.json();
          setWatchlist(new Set((data.stocks || []).map(s => s.ticker)));
        }
      } catch {}

      // Load portfolios (name only needed for dropdown)
      try {
        const { data: rows } = await supabase
          .from("user_portfolios")
          .select("id, name")
          .eq("user_id", session.user.id);
        if (rows) setPortfolios(rows);
      } catch {}

      // TODO: uncomment once /api/stocks returns FMP live data
      // try {
      //   const res = await fetch("/api/stocks", { headers:{ Authorization:`Bearer ${tok}` } });
      //   if (res.ok) { const d = await res.json(); setStocks(d.stocks || MOCK_STOCKS); }
      // } catch {}

      // Auto-open instrument from ?instrument=TICKER (e.g. from analysis page ← Discovery link)
      const params = new URLSearchParams(window.location.search);
      const fromTicker = params.get("instrument");
      if (fromTicker) {
        const found = MOCK_STOCKS.find(s => s.ticker === fromTicker);
        if (found) setSelected(found);
      }
    });
  }, []);

  // Close table portfolio dropdown on outside click
  useEffect(() => {
    if (!openPortRow) return;
    const h = () => setOpenPortRow(null);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [openPortRow]);

  // ── Watchlist toggle with optimistic update ───────────────────────────────
  const toggleWatchlist = useCallback(async (ticker) => {
    if (!token) return;
    const isIn = watchlist.has(ticker);
    setWatchlist(prev => { const n = new Set(prev); isIn ? n.delete(ticker) : n.add(ticker); return n; });
    try {
      if (isIn) {
        await fetch(`/api/watchlist?ticker=${ticker}`, {
          method:"DELETE", headers:{ Authorization:`Bearer ${token}` }
        });
      } else {
        const stock = stocks.find(s => s.ticker === ticker);
        await fetch("/api/watchlist", {
          method:"POST",
          headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}` },
          body: JSON.stringify({ ticker, name:stock?.name, sector:stock?.sector, market:stock?.market }),
        });
      }
    } catch {
      // Revert on failure
      setWatchlist(prev => { const n = new Set(prev); isIn ? n.add(ticker) : n.delete(ticker); return n; });
    }
  }, [token, watchlist, stocks]);

  // ── Add to portfolio ──────────────────────────────────────────────────────
  // TODO: wire to actual portfolio holdings update via Supabase user_portfolios
  const handleAddToPortfolio = useCallback((ticker, portfolio) => {
    console.log(`TODO: add ${ticker} to portfolio "${portfolio.name}" (id: ${portfolio.id})`);
  }, []);

  // ── Filter + sort ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const list = stocks.filter(s =>
      (!q || s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.sector.toLowerCase().includes(q))
      && (market === "All" || s.market === market)
      && (sector === "All" || s.sector === sector)
    );
    return [...list].sort((a,b) => {
      if (sortKey === "ticker")  return sortDir==="asc" ? a.ticker.localeCompare(b.ticker) : b.ticker.localeCompare(a.ticker);
      if (sortKey === "name")    return sortDir==="asc" ? a.name.localeCompare(b.name)     : b.name.localeCompare(a.name);
      if (sortKey === "mktCap")  { const av=parseMktCap(a.mktCap), bv=parseMktCap(b.mktCap); return sortDir==="asc"?av-bv:bv-av; }
      return sortDir==="asc" ? a[sortKey]-b[sortKey] : b[sortKey]-a[sortKey];
    });
  }, [stocks, search, sector, market, sortKey, sortDir]);

  const toggleSort = k => {
    if (sortKey === k) setSortDir(d => d==="asc"?"desc":"asc");
    else { setSortKey(k); setSortDir("desc"); }
  };

  // ── Sortable table header ─────────────────────────────────────────────────
  const Th = ({ k, label, align="right" }) => (
    <th onClick={() => toggleSort(k)} style={{
      fontFamily:gs, fontSize:"0.6rem",
      color:sortKey===k ? c.text : c.muted,
      letterSpacing:"0.07em", textTransform:"uppercase", fontWeight:600,
      padding:"8px 10px", textAlign:align, cursor:"pointer",
      whiteSpace:"nowrap", userSelect:"none",
      background:sortKey===k ? c.surface : "transparent",
      borderBottom:`1px solid ${c.border}`,
      transition:"color 0.15s",
    }}>
      {label}{sortKey===k ? (sortDir==="asc"?" ↑":" ↓") : ""}
    </th>
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ background:c.bg, minHeight:"100vh", fontFamily:gs, color:c.text }}>
      <style>{`
        .sr{display:flex;gap:0.4rem;overflow-x:auto;-ms-overflow-style:none;scrollbar-width:none;}
        .sr::-webkit-scrollbar{display:none;}
        @keyframes rbow{
          0%  {box-shadow:0 0 0 2px rgba(255,80,80,0.7),0 0 18px 4px rgba(255,80,80,0.2);}
          25% {box-shadow:0 0 0 2px rgba(255,180,50,0.7),0 0 18px 4px rgba(255,180,50,0.2);}
          50% {box-shadow:0 0 0 2px rgba(60,220,120,0.7),0 0 18px 4px rgba(60,220,120,0.2);}
          75% {box-shadow:0 0 0 2px rgba(68,160,255,0.7),0 0 18px 4px rgba(68,160,255,0.2);}
          100%{box-shadow:0 0 0 2px rgba(255,80,80,0.7),0 0 18px 4px rgba(255,80,80,0.2);}
        }
        .rbow{animation:rbow 2.8s linear infinite;border-color:transparent !important;}
        .tr-hover{transition:background 0.12s;}
      `}</style>

      <div style={{ maxWidth:"1200px", margin:"0 auto", padding:"2.5rem 3.5rem" }}>

        {/* Header */}
        <div style={{ marginBottom:"1.75rem" }}>
          <p style={{ fontFamily:gs, color:c.muted, fontSize:"0.65rem", letterSpacing:"0.18em", textTransform:"uppercase", marginBottom:"0.4rem", fontWeight:600 }}>Discovery</p>
          <h1 style={{ fontFamily:gs, fontSize:"clamp(1.5rem,3vw,2.2rem)", fontWeight:700, color:c.text }}>Markets Overview</h1>
        </div>

        {/* Search */}
        <div style={{ position:"relative", marginBottom:"1.25rem" }}>
          <span style={{ position:"absolute", left:"13px", top:"50%", transform:"translateY(-50%)", color:c.muted, fontSize:"1rem", pointerEvents:"none" }}>⌕</span>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            onFocus={() => setSfoc(true)} onBlur={() => setSfoc(false)}
            placeholder="Search by ticker, company, sector or keyword..."
            className={sfoc ? "rbow" : ""}
            style={{ width:"100%", background:c.card, border:`1px solid ${sfoc ? c.borderHi : c.border}`,
              borderRadius:"8px", padding:"11px 14px 11px 36px",
              color:c.text, fontSize:"0.88rem", fontFamily:gs, outline:"none", transition:"border-color 0.18s" }}
          />
          {search && (
            <button onClick={() => setSearch("")}
              style={{ position:"absolute", right:"12px", top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:c.muted, cursor:"pointer" }}>✕</button>
          )}
        </div>

        {/* Market filter pills */}
        <div className="sr" style={{ marginBottom:"0.6rem" }}>
          {MARKETS.map(m => (
            <button key={m.id} onClick={() => m.on && setMarket(m.id === market ? "All" : m.id)}
              style={{
                background:market===m.id ? c.text : "transparent",
                color:market===m.id ? c.bg : c.muted,
                border:`1px solid ${market===m.id ? c.text : c.border}`,
                borderRadius:"50px", padding:"5px 14px",
                fontFamily:gs, fontSize:"0.73rem", fontWeight:600,
                cursor:m.on ? "pointer" : "default",
                opacity:m.on ? 1 : 0.4, whiteSpace:"nowrap",
                transition:"all 0.18s", flexShrink:0,
              }}>
              {m.label}
            </button>
          ))}
        </div>

        {/* Sector filter pills */}
        <div className="sr" style={{ flexWrap:"wrap", marginBottom:"1.5rem" }}>
          {SECTORS.map(s => (
            <button key={s} onClick={() => setSector(s === sector ? "All" : s)}
              style={{
                background:sector===s ? c.text : "transparent",
                color:sector===s ? c.bg : c.muted,
                border:`1px solid ${sector===s ? c.text : c.border}`,
                borderRadius:"50px", padding:"4px 12px",
                fontFamily:gs, fontSize:"0.72rem", fontWeight:600,
                cursor:"pointer", transition:"all 0.15s", flexShrink:0,
              }}>
              {s}
            </button>
          ))}
        </div>

        {/* Result count */}
        <div style={{ fontFamily:gs, fontSize:"0.74rem", color:c.muted, marginBottom:"0.75rem" }}>
          {filtered.length} instrument{filtered.length !== 1 ? "s" : ""} · tap any row to view details
        </div>

        {/* Table */}
        <div style={{ overflowX:"auto", borderRadius:"12px", border:`1px solid ${c.border}` }}>
          <table style={{ borderCollapse:"collapse", width:"100%", minWidth:"900px" }}>
            <thead>
              <tr style={{ background:c.surface }}>
                <Th k="ticker" label="Ticker"  align="left"/>
                <Th k="name"   label="Company" align="left"/>
                <Th k="market" label="Market"  align="left"/>
                <Th k="price"  label="Price"/>
                <Th k="chg"    label="24h Chg"/>
                <Th k="mktCap" label="Mkt Cap"/>
                <Th k="sector" label="Sector"  align="left"/>
                <Th k="score"  label="AI Score"/>
                <th style={{ fontFamily:gs, fontSize:"0.6rem", color:c.muted, letterSpacing:"0.07em",
                  textTransform:"uppercase", fontWeight:600, padding:"8px 10px", textAlign:"center",
                  borderBottom:`1px solid ${c.border}`, whiteSpace:"nowrap" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const pos   = s.chg >= 0;
                const isHov = hovRow === s.ticker;
                const inWL  = watchlist.has(s.ticker);
                return (
                  <tr key={s.ticker}
                    className="tr-hover"
                    onMouseEnter={() => setHovRow(s.ticker)}
                    onMouseLeave={() => setHovRow(null)}
                    style={{ background:isHov ? c.surface : "transparent", cursor:"pointer" }}>

                    {/* Ticker */}
                    <td onClick={() => setSelected(s)} style={{ padding:"10px", borderBottom:`1px solid ${c.border}` }}>
                      <div style={{ fontFamily:gs, fontSize:"0.9rem", fontWeight:700, color:c.text }}>{s.ticker}</div>
                    </td>

                    {/* Company */}
                    <td onClick={() => setSelected(s)} style={{ padding:"10px", borderBottom:`1px solid ${c.border}` }}>
                      <div style={{ fontFamily:gs, fontSize:"0.82rem", color:c.muted, maxWidth:"180px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.name}</div>
                    </td>

                    {/* Market */}
                    <td onClick={() => setSelected(s)} style={{ padding:"10px", borderBottom:`1px solid ${c.border}` }}>
                      <span style={{ fontFamily:gs, fontSize:"0.7rem", fontWeight:600, color:c.blue,
                        background:c.blueDim, border:`1px solid ${c.blue}30`, borderRadius:"3px", padding:"2px 6px" }}>
                        {s.market}
                      </span>
                    </td>

                    {/* Price */}
                    <td onClick={() => setSelected(s)} style={{ padding:"10px", borderBottom:`1px solid ${c.border}`, textAlign:"right" }}>
                      <div style={{ fontFamily:gs, fontSize:"0.88rem", fontWeight:600, color:c.text }}>${s.price.toFixed(2)}</div>
                    </td>

                    {/* 24h change */}
                    <td onClick={() => setSelected(s)} style={{ padding:"10px", borderBottom:`1px solid ${c.border}`, textAlign:"right" }}>
                      <span style={{ fontFamily:gs, fontSize:"0.82rem", fontWeight:700, color:pos?c.green:c.red }}>
                        {pos?"+":""}{s.chg.toFixed(2)}%
                      </span>
                    </td>

                    {/* Market cap */}
                    <td onClick={() => setSelected(s)} style={{ padding:"10px", borderBottom:`1px solid ${c.border}`, textAlign:"right", fontFamily:gs, fontSize:"0.82rem", color:c.muted }}>
                      {s.mktCap}
                    </td>

                    {/* Sector */}
                    <td onClick={() => setSelected(s)} style={{ padding:"10px", borderBottom:`1px solid ${c.border}` }}>
                      <span style={{ fontFamily:gs, fontSize:"0.72rem", color:c.muted,
                        background:c.surface, border:`1px solid ${c.border}`, borderRadius:"3px", padding:"2px 7px", whiteSpace:"nowrap" }}>
                        {s.sector}
                      </span>
                    </td>

                    {/* AI Score + Verdict */}
                    <td onClick={() => setSelected(s)} style={{ padding:"8px 10px", borderBottom:`1px solid ${c.border}`, textAlign:"right" }}>
                      <div style={{ display:"flex", justifyContent:"flex-end", alignItems:"center", gap:"6px" }}>
                        <VerdictBadge verdict={s.verdict} c={c}/>
                        <AIScore score={s.score} c={c} size={32}/>
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ padding:"8px 10px", borderBottom:`1px solid ${c.border}`, textAlign:"center" }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"5px" }}>

                        {/* Watchlist */}
                        <button
                          onClick={e => { e.stopPropagation(); toggleWatchlist(s.ticker); }}
                          title={inWL ? "Remove from watchlist" : "Add to watchlist"}
                          style={{
                            background:inWL ? c.greenDim : "none",
                            border:`1px solid ${inWL ? `${c.green}50` : c.border}`,
                            borderRadius:"5px", width:"28px", height:"28px",
                            cursor:"pointer", color:inWL ? c.green : c.muted,
                            display:"flex", alignItems:"center", justifyContent:"center",
                            transition:"all 0.15s", flexShrink:0,
                          }}>
                          <IconBookmark filled={inWL} size={13}/>
                        </button>

                        {/* Add to portfolio */}
                        <div style={{ position:"relative" }} onClick={e => e.stopPropagation()}>
                          <button
                            title="Add to portfolio"
                            onClick={() => setOpenPortRow(openPortRow === s.ticker ? null : s.ticker)}
                            style={{
                              background:c.surface, border:`1px solid ${c.border}`,
                              borderRadius:"5px", height:"28px", padding:"0 8px",
                              cursor:"pointer", color:c.muted,
                              display:"flex", alignItems:"center", gap:"4px",
                              transition:"all 0.15s", flexShrink:0,
                            }}>
                            <IconPieChart size={13}/>
                            <IconChevronDown size={10}/>
                          </button>
                          {openPortRow === s.ticker && (
                            <div style={{
                              position:"absolute", top:"calc(100% + 5px)", right:0,
                              background:c.card, border:`1px solid ${c.borderHi}`,
                              borderRadius:"9px", overflow:"hidden", zIndex:50,
                              boxShadow:"0 8px 24px rgba(0,0,0,0.25)", minWidth:"175px",
                            }}>
                              <div style={{ padding:"7px 12px", fontFamily:gs, fontSize:"0.6rem", color:c.muted,
                                letterSpacing:"0.1em", textTransform:"uppercase",
                                borderBottom:`1px solid ${c.border}`, fontWeight:600 }}>
                                Add {s.ticker} to
                              </div>
                              {portfolios.length === 0 ? (
                                <div style={{ padding:"10px 12px", fontFamily:gs, fontSize:"0.78rem", color:c.muted }}>No portfolios yet</div>
                              ) : portfolios.map(p => (
                                <button key={p.id}
                                  onClick={() => { handleAddToPortfolio(s.ticker, p); setOpenPortRow(null); }}
                                  style={{ width:"100%", padding:"8px 12px", background:"transparent", border:"none",
                                    borderBottom:`1px solid ${c.border}`, textAlign:"left", cursor:"pointer",
                                    fontFamily:gs, fontSize:"0.8rem", color:c.text,
                                    display:"flex", alignItems:"center", gap:"7px" }}
                                  onMouseEnter={e => e.currentTarget.style.background = c.surface}
                                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                  <IconPieChart size={12}/>{p.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* View in floating card */}
                        <button onClick={() => setSelected(s)}
                          style={{ background:c.surface, border:`1px solid ${c.border}`,
                            borderRadius:"5px", padding:"4px 9px",
                            cursor:"pointer", color:c.muted,
                            fontFamily:gs, fontSize:"0.68rem", fontWeight:600,
                            transition:"all 0.15s", whiteSpace:"nowrap" }}>
                          View →
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p style={{ fontFamily:gs, color:c.muted, fontSize:"0.68rem", textAlign:"center", marginTop:"2rem" }}>
          For informational purposes only · Not financial advice · Data via Financial Modeling Prep
        </p>
      </div>

      {/* Floating stock card */}
      {selected && (
        <StockCard
          stock={selected}
          c={c}
          mode={mode}
          onClose={() => setSelected(null)}
          watchlist={watchlist}
          onWatchlist={toggleWatchlist}
          portfolios={portfolios}
          onAddToPortfolio={handleAddToPortfolio}
          onViewFullAnalysis={() => router.push(`/dashboard/analysis/${selected.ticker}`)}
        />
      )}
    </div>
  );
}