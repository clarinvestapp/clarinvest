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
  },
  light: {
    bg:"#F7F7F5", card:"#FFFFFF", surface:"#EEEEED",
    border:"#DEDEDD", borderHi:"#BABAB8",
    text:"#0A0A0A", muted:"#606065",
    green:"#008A38", greenDim:"rgba(0,138,56,0.09)",
    blue:"#1E55CC",  blueDim:"rgba(30,85,204,0.09)",
    red:"#CC0000",   redDim:"rgba(204,0,0,0.10)",
  },
};
const gs = "'Google Sans Flex','DM Sans',sans-serif";

// ─── Mock instrument data ─────────────────────────────────────────────────────
// TODO: replace with live /api/stocks response once FMP is wired
// type: "stock" | "etf" | "commodity" | "index"
const MOCK_STOCKS = [
  // ── Stocks ──
  {type:"stock", ticker:"NVDA", name:"NVIDIA Corp",        exchange:"NASDAQ", sector:"Technology",       market:"US", price:875.40, chg:+5.43, mktCap:"$2.15T", score:93, verdict:"Strong Buy", pe:65.2, ps:28.1, evEbitda:42.3, grossMargin:"78.4%", revenueGrowth:"+122%", dayLow:831.20, dayHigh:891.60, weekLow:402.01, weekHigh:974.00,
   risks:[{flag:"China export restrictions",level:"High"},{flag:"Customer concentration",level:"Medium"},{flag:"AMD MI300X competition",level:"Low"}]},
  {type:"stock", ticker:"AAPL", name:"Apple Inc",          exchange:"NASDAQ", sector:"Technology",       market:"US", price:184.20, chg:+1.82, mktCap:"$2.83T", score:84, verdict:"Buy",        pe:28.4, ps:7.2,  evEbitda:22.1, grossMargin:"45.9%", revenueGrowth:"+6%",   dayLow:181.10, dayHigh:185.90, weekLow:164.08, weekHigh:199.62,
   risks:[{flag:"China revenue concentration",level:"Medium"},{flag:"iPhone upgrade cycle slowdown",level:"Medium"},{flag:"Regulatory antitrust scrutiny",level:"Low"}]},
  {type:"stock", ticker:"MSFT", name:"Microsoft Corp",     exchange:"NASDAQ", sector:"Technology",       market:"US", price:415.80, chg:+0.94, mktCap:"$3.09T", score:91, verdict:"Strong Buy", pe:35.1, ps:13.4, evEbitda:28.7, grossMargin:"69.8%", revenueGrowth:"+17%",  dayLow:411.20, dayHigh:418.60, weekLow:309.45, weekHigh:430.82,
   risks:[{flag:"Azure growth deceleration risk",level:"Low"},{flag:"AI capex scaling costs",level:"Medium"},{flag:"Regulatory/antitrust exposure",level:"Low"}]},
  {type:"stock", ticker:"AMZN", name:"Amazon.com Inc",     exchange:"NASDAQ", sector:"Consumer Disc.",   market:"US", price:186.30, chg:+2.11, mktCap:"$1.95T", score:82, verdict:"Buy",        pe:44.2, ps:3.2,  evEbitda:19.8, grossMargin:"47.6%", revenueGrowth:"+13%",  dayLow:183.40, dayHigh:188.70, weekLow:118.35, weekHigh:201.20,
   risks:[{flag:"AWS competitive pressure",level:"Low"},{flag:"Labour relations and costs",level:"Medium"},{flag:"Advertising slowdown sensitivity",level:"Low"}]},
  {type:"stock", ticker:"GOOGL",name:"Alphabet Inc",       exchange:"NASDAQ", sector:"Communication",    market:"US", price:163.80, chg:+0.34, mktCap:"$2.02T", score:80, verdict:"Buy",        pe:24.6, ps:6.1,  evEbitda:18.4, grossMargin:"56.9%", revenueGrowth:"+15%",  dayLow:161.20, dayHigh:165.40, weekLow:121.46, weekHigh:191.75,
   risks:[{flag:"AI search disruption risk",level:"High"},{flag:"Antitrust ruling overhang",level:"High"},{flag:"YouTube ad spend cyclicality",level:"Low"}]},
  {type:"stock", ticker:"META", name:"Meta Platforms",     exchange:"NASDAQ", sector:"Communication",    market:"US", price:504.20, chg:+3.21, mktCap:"$1.28T", score:83, verdict:"Buy",        pe:25.8, ps:8.9,  evEbitda:21.3, grossMargin:"81.5%", revenueGrowth:"+27%",  dayLow:496.80, dayHigh:510.30, weekLow:279.40, weekHigh:531.49,
   risks:[{flag:"AI capex escalation",level:"Medium"},{flag:"Regulatory fine risk (EU)",level:"Medium"},{flag:"Gen-Z engagement trends",level:"Low"}]},
  {type:"stock", ticker:"TSLA", name:"Tesla Inc",          exchange:"NASDAQ", sector:"Automotive",       market:"US", price:248.50, chg:-1.34, mktCap:"$794B",  score:61, verdict:"Hold",       pe:61.8, ps:7.4,  evEbitda:38.2, grossMargin:"18.2%", revenueGrowth:"+8%",   dayLow:243.20, dayHigh:252.10, weekLow:138.80, weekHigh:278.98,
   risks:[{flag:"Margin compression pressure",level:"High"},{flag:"Brand perception risk",level:"High"},{flag:"EV demand slowdown",level:"Medium"}]},
  {type:"stock", ticker:"JNJ",  name:"Johnson & Johnson",  exchange:"NYSE",   sector:"Healthcare",       market:"US", price:151.80, chg:+0.42, mktCap:"$364B",  score:78, verdict:"Buy",        pe:14.8, ps:4.1,  evEbitda:11.9, grossMargin:"68.7%", revenueGrowth:"+4%",   dayLow:149.90, dayHigh:153.20, weekLow:143.13, weekHigh:168.99,
   risks:[{flag:"Talc litigation liability",level:"High"},{flag:"Patent cliffs on MedTech",level:"Medium"},{flag:"Pharma pricing pressure",level:"Low"}]},
  {type:"stock", ticker:"V",    name:"Visa Inc",           exchange:"NYSE",   sector:"Financials",       market:"US", price:277.40, chg:+0.86, mktCap:"$571B",  score:85, verdict:"Strong Buy", pe:28.9, ps:16.3, evEbitda:23.7, grossMargin:"97.8%", revenueGrowth:"+10%",  dayLow:274.10, dayHigh:279.80, weekLow:227.82, weekHigh:290.96,
   risks:[{flag:"Crypto/DeFi disintermediation",level:"Low"},{flag:"Regulatory interchange caps",level:"Medium"},{flag:"Global recession sensitivity",level:"Low"}]},
  {type:"stock", ticker:"XOM",  name:"Exxon Mobil",        exchange:"NYSE",   sector:"Energy",           market:"US", price:114.20, chg:+0.92, mktCap:"$455B",  score:72, verdict:"Hold",       pe:12.4, ps:1.3,  evEbitda:8.4,  grossMargin:"44.8%", revenueGrowth:"+2%",   dayLow:112.40, dayHigh:116.10, weekLow:95.77,  weekHigh:123.75,
   risks:[{flag:"Oil price cyclical exposure",level:"High"},{flag:"Energy transition headwinds",level:"Medium"},{flag:"Permian Basin capex intensity",level:"Low"}]},
  {type:"stock", ticker:"KO",   name:"Coca-Cola Co",       exchange:"NYSE",   sector:"Consumer Staples", market:"US", price:61.40,  chg:-0.18, mktCap:"$265B",  score:72, verdict:"Hold",       pe:22.1, ps:5.8,  evEbitda:18.2, grossMargin:"59.2%", revenueGrowth:"+3%",   dayLow:60.80,  dayHigh:62.10,  weekLow:55.29,  weekHigh:67.20,
   risks:[{flag:"Sugar/health regulation risk",level:"Medium"},{flag:"Currency headwinds (EM)",level:"Medium"},{flag:"Commodity cost inflation",level:"Low"}]},
  {type:"stock", ticker:"WMT",  name:"Walmart Inc",        exchange:"NYSE",   sector:"Consumer Staples", market:"US", price:84.60,  chg:+0.34, mktCap:"$682B",  score:78, verdict:"Buy",        pe:28.4, ps:0.8,  evEbitda:17.8, grossMargin:"24.2%", revenueGrowth:"+6%",   dayLow:83.40,  dayHigh:85.80,  weekLow:60.14,  weekHigh:93.47,
   risks:[{flag:"Thin margin execution risk",level:"Medium"},{flag:"eCommerce competition",level:"Low"},{flag:"Labour cost escalation",level:"Low"}]},

  // ── ETFs (Ultimate plan) ──
  {type:"etf", ticker:"QQQ",  name:"Invesco QQQ Trust",          exchange:"NASDAQ", sector:"Technology", market:"US", price:446.20, chg:+1.18, mktCap:"$245B", score:88, verdict:"Strong Buy",
   aum:"$245B", expenseRatio:"0.20%", holdings:101, divYield:"0.54%",
   topHoldings:[{ticker:"AAPL",weight:"8.9%"},{ticker:"MSFT",weight:"8.4%"},{ticker:"NVDA",weight:"7.8%"},{ticker:"AMZN",weight:"5.1%"},{ticker:"GOOGL",weight:"4.2%"}],
   topSectors:[{name:"Technology",weight:"61%"},{name:"Communication",weight:"18%"}],
   weekLow:340.12, weekHigh:503.60,
   risks:[{flag:"High tech concentration (61%)",level:"High"},{flag:"Rate sensitivity",level:"Medium"},{flag:"Tracking error vs Nasdaq-100",level:"Low"}]},
  {type:"etf", ticker:"SPY",  name:"SPDR S&P 500 ETF Trust",     exchange:"NYSE",   sector:"Broad Market", market:"US", price:548.30, chg:+0.62, mktCap:"$558B", score:82, verdict:"Buy",
   aum:"$558B", expenseRatio:"0.0945%", holdings:503, divYield:"1.31%",
   topHoldings:[{ticker:"AAPL",weight:"7.1%"},{ticker:"MSFT",weight:"6.8%"},{ticker:"NVDA",weight:"6.2%"},{ticker:"AMZN",weight:"3.9%"},{ticker:"META",weight:"2.7%"}],
   topSectors:[{name:"Technology",weight:"31%"},{name:"Financials",weight:"13%"}],
   weekLow:420.46, weekHigh:613.23,
   risks:[{flag:"Market cap concentration (top 10 = 37%)",level:"Medium"},{flag:"US-only exposure",level:"Medium"},{flag:"Sector rotation risk",level:"Low"}]},
  {type:"etf", ticker:"VTI",  name:"Vanguard Total Stock Market", exchange:"NYSE",   sector:"Broad Market", market:"US", price:268.40, chg:+0.48, mktCap:"$422B", score:80, verdict:"Buy",
   aum:"$422B", expenseRatio:"0.03%", holdings:3724, divYield:"1.28%",
   topHoldings:[{ticker:"AAPL",weight:"6.4%"},{ticker:"MSFT",weight:"6.1%"},{ticker:"NVDA",weight:"5.6%"},{ticker:"AMZN",weight:"3.5%"},{ticker:"GOOGL",weight:"2.0%"}],
   topSectors:[{name:"Technology",weight:"29%"},{name:"Financials",weight:"14%"}],
   weekLow:205.22, weekHigh:296.18,
   risks:[{flag:"US market concentration",level:"Medium"},{flag:"Small-cap drag in downturns",level:"Low"},{flag:"Dividend yield below inflation",level:"Low"}]},

  // ── Commodities (Essential plan and above) ──
  {type:"commodity", ticker:"XAUUSD", name:"Gold Spot",      exchange:"OTC / COMEX", sector:"Precious Metals", market:"US", price:2345.60, chg:+0.79, mktCap:"—", score:74, verdict:"Hold",
   unit:"Troy Ounce", contractSize:"100 oz", ytd:"+12.8%", volatility30d:"11.2%",
   technicals:{rsi14:58.4, ma50:2298.40, ma200:2142.80, atr14:24.80},
   weekLow:1984.30, weekHigh:2431.20,
   risks:[{flag:"USD strength headwind",level:"High"},{flag:"Rising real yield pressure",level:"Medium"},{flag:"Central bank demand slowdown",level:"Low"}]},
  {type:"commodity", ticker:"XAGUSD", name:"Silver Spot",    exchange:"OTC / COMEX", sector:"Precious Metals", market:"US", price:31.42,   chg:+1.14, mktCap:"—", score:68, verdict:"Hold",
   unit:"Troy Ounce", contractSize:"5,000 oz", ytd:"+18.4%", volatility30d:"22.8%",
   technicals:{rsi14:62.1, ma50:29.84, ma200:26.40, atr14:0.72},
   weekLow:21.84, weekHigh:34.86,
   risks:[{flag:"Industrial demand cyclicality",level:"Medium"},{flag:"High price volatility",level:"High"},{flag:"Thin physical market depth",level:"Medium"}]},
  {type:"commodity", ticker:"WTICL",  name:"Crude Oil (WTI)", exchange:"NYMEX",      sector:"Energy",          market:"US", price:78.42,   chg:-0.88, mktCap:"—", score:58, verdict:"Hold",
   unit:"Barrel", contractSize:"1,000 bbl", ytd:"-4.2%", volatility30d:"26.4%",
   technicals:{rsi14:44.2, ma50:80.10, ma200:78.90, atr14:1.84},
   weekLow:63.64, weekHigh:95.03,
   risks:[{flag:"OPEC supply decision risk",level:"High"},{flag:"Global recession demand risk",level:"High"},{flag:"USD correlation headwind",level:"Medium"}]},

  // ── Indexes (Pro plan and above) ──
  {type:"index", ticker:"SPX",  name:"S&P 500 Index",       exchange:"NYSE/NASDAQ", sector:"Broad Market", market:"US", price:5487.20, chg:+0.79, mktCap:"—", score:81, verdict:"Buy",
   constituents:503, methodology:"Float-adjusted market cap", pe:22.4, divYield:"1.31%", ytd:"+12.1%",
   topConstituents:[{ticker:"AAPL",weight:"7.1%"},{ticker:"MSFT",weight:"6.8%"},{ticker:"NVDA",weight:"6.2%"},{ticker:"AMZN",weight:"3.9%"},{ticker:"META",weight:"2.7%"}],
   weekLow:4103.78, weekHigh:5669.67,
   risks:[{flag:"Top 10 holdings = 37% of index",level:"High"},{flag:"Technology sector overweight",level:"Medium"},{flag:"Quarterly rebalancing front-running",level:"Low"}]},
  {type:"index", ticker:"NDX",  name:"Nasdaq-100 Index",    exchange:"NASDAQ",      sector:"Technology",   market:"US", price:19284.50, chg:+1.22, mktCap:"—", score:85, verdict:"Strong Buy",
   constituents:100, methodology:"Modified market cap weighted", pe:28.6, divYield:"0.54%", ytd:"+18.4%",
   topConstituents:[{ticker:"AAPL",weight:"8.9%"},{ticker:"MSFT",weight:"8.4%"},{ticker:"NVDA",weight:"7.8%"},{ticker:"AMZN",weight:"5.1%"},{ticker:"GOOGL",weight:"4.2%"}],
   weekLow:14477.57, weekHigh:22222.61,
   risks:[{flag:"Extreme tech concentration",level:"High"},{flag:"Rate sensitivity of growth names",level:"Medium"},{flag:"Single-country (US) exposure",level:"Low"}]},
  {type:"index", ticker:"DJI",  name:"Dow Jones Industrial", exchange:"NYSE",        sector:"Broad Market", market:"US", price:39118.60, chg:+0.31, mktCap:"—", score:72, verdict:"Hold",
   constituents:30, methodology:"Price-weighted", pe:19.8, divYield:"1.82%", ytd:"+4.8%",
   topConstituents:[{ticker:"UNH",weight:"9.4%"},{ticker:"GS",weight:"7.8%"},{ticker:"MSFT",weight:"6.2%"},{ticker:"HD",weight:"5.9%"},{ticker:"CAT",weight:"5.4%"}],
   weekLow:32327.20, weekHigh:41376.00,
   risks:[{flag:"Price-weighting methodology distortion",level:"Medium"},{flag:"Only 30 constituents",level:"High"},{flag:"Low tech exposure vs market",level:"Low"}]},
];

const INSTRUMENT_TYPES = ["All","Stocks","ETFs","Commodities","Indexes"];
const SECTOR_INDUSTRY_MAP = {
  "Technology":       ["Semiconductors","Software","Hardware","Cloud Services","AI / Machine Learning","Cybersecurity","Consumer Electronics"],
  "Communication":    ["Internet Content","Social Media","Streaming","Telecoms","Advertising"],
  "Healthcare":       ["Pharmaceuticals","Biotechnology","Medical Devices","Health Insurance","Hospital Systems"],
  "Financials":       ["Banking","Investment Banking","Asset Management","Insurance","Payments / FinTech","REITs"],
  "Consumer Disc.":   ["eCommerce","Automotive Makers","Retail","Restaurants","Travel / Leisure","Apparel"],
  "Consumer Staples": ["Food & Beverage","Household Products","Tobacco","Supermarkets"],
  "Energy":           ["Oil & Gas","Renewable Energy","Utilities","Pipeline / Midstream"],
  "Industrials":      ["Aerospace","Defence","Logistics","Construction","Machinery"],
  "Materials":        ["Mining","Chemicals","Steel","Packaging"],
  "Real Estate":      ["Commercial REITs","Residential REITs","Infrastructure REITs"],
  "Precious Metals":  ["Gold","Silver","Platinum Group"],
  "Broad Market":     ["Large Cap","Mid Cap","Multi-Sector","Dividend Income"],
};
const SECTORS = ["All", ...Object.keys(SECTOR_INDUSTRY_MAP)];
const MARKETS     = [{id:"All",label:"All",on:true},{id:"US",label:"US",on:true},{id:"EU",label:"EU 🔜",on:false},{id:"UK",label:"UK 🔜",on:false}];
const TIME_RANGES = ["1W","1M","3M","6M","1Y"];
const DAYS        = {"1W":7,"1M":30,"3M":90,"6M":180,"1Y":365};

// Type display helpers
const TYPE_LABEL  = {stock:"Stock", etf:"ETF", commodity:"Commodity", index:"Index"};
const TYPE_COLOR  = (type, c) => ({
  stock:     {bg:c.blueDim,    border:`${c.blue}30`,    text:c.blue},
  etf:       {bg:"rgba(167,139,250,0.10)", border:"rgba(167,139,250,0.30)", text:"#A78BFA"},
  commodity: {bg:"rgba(245,158,11,0.10)",  border:"rgba(245,158,11,0.30)",  text:"#F59E0B"},
  index:     {bg:"rgba(52,211,153,0.10)",  border:"rgba(52,211,153,0.30)",  text:"#34D399"},
}[type] || {bg:c.surface, border:c.border, text:c.muted});

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
  if (t >= h.pre[0]   && t < h.pre[1]  ) return { label:"Pre-Market",  col:"muted", isOpen:false };
  if (t >= h.after[0] && t < h.after[1]) return { label:"After-Hours", col:"muted", isOpen:false };
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
      <div style={{ position:"absolute", inset:`${size*0.13}px`, borderRadius:"50%", background:`radial-gradient(circle,${col}28 0%,transparent 75%)`, filter:"blur(3px)" }}/>
      <svg width={size} height={size} style={{ position:"absolute", top:0, left:0, transform:"rotate(-90deg)" }}>
        <circle cx={cx2} cy={cx2} r={r} fill="none" stroke={col} strokeOpacity={0.2} strokeWidth="3"/>
        <circle cx={cx2} cy={cx2} r={r} fill="none" stroke={col} strokeWidth="3"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"/>
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <span style={{ fontFamily:gs, fontSize:size*0.26, fontWeight:600, color:col, lineHeight:1 }}>{score}</span>
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
    <span style={{ fontFamily:gs, fontSize:"0.68rem", fontWeight:600, color:col, background:bg,
      border:`1px solid ${bd}`, borderRadius:"6px", padding:"3px 8px", whiteSpace:"nowrap" }}>
      {verdict || "—"}
    </span>
  );
}

// ─── Floating Instrument Card (type-aware) ────────────────────────────────────
function StockCard({ stock, c, mode, onClose, watchlist, onWatchlist, portfolios, onAddToPortfolio, onViewFullAnalysis }) {
  const type      = stock.type || "stock";
  const typeCol   = TYPE_COLOR(type, c);

  // Tab labels adapt per instrument type
  const TAB2_LABEL = {stock:"Valuation", etf:"Allocation", commodity:"Technicals", index:"Composition"};
  const tabs = ["overview", "tab2", "risk"];
  const tabLabels = ["Overview", TAB2_LABEL[type] || "Details", "Risk"];

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
    cursor:"pointer", transition:"opacity 0.15s ease",
  });

  const tabBtn = (active) => ({
    background:"none", border:"none", cursor:"pointer",
    fontFamily:gs, fontSize:"0.76rem", fontWeight:active?600:400,
    color:active ? c.text : c.muted,
    borderBottom:`2px solid ${active ? c.text : "transparent"}`,
    padding:"6px 2px 8px", marginBottom:"-1px",
    transition:"opacity 0.15s ease", whiteSpace:"nowrap",
  });

  const MetricRow = ({label, value, flag}) => {
    const col = flag==="positive" ? c.green : flag==="negative" ? c.red : c.text;
    return (
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:`1px solid ${c.border}`}}>
        <span style={{fontFamily:gs,fontSize:"0.78rem",color:c.muted}}>{label}</span>
        <span style={{fontFamily:gs,fontSize:"0.8rem",fontWeight:700,color:col}}>{value}</span>
      </div>
    );
  };

  // ── Overview tab content ──────────────────────────────────────────────────
  function OverviewContent() {
    const summaryText = {
      stock:     `${stock.name} shows ${stock.verdict?.toLowerCase()||"neutral"} fundamentals. Revenue growth of ${stock.revenueGrowth||"—"} with gross margin at ${stock.grossMargin||"—"}.`,
      etf:       `${stock.name} tracks its benchmark with a ${stock.expenseRatio} expense ratio across ${stock.holdings?.toLocaleString()||"—"} holdings. Broad diversification with a tilt toward ${stock.topSectors?.[0]?.name||"—"}.`,
      commodity: `${stock.name} is ${stock.chg>=0?"up":"down"} ${Math.abs(stock.chg).toFixed(2)}% over 24 hours. YTD performance: ${stock.ytd||"—"}. 30-day volatility at ${stock.volatility30d||"—"}.`,
      index:     `${stock.name} comprises ${stock.constituents||"—"} constituents using a ${stock.methodology||"market cap"} methodology. YTD return: ${stock.ytd||"—"}.`,
    };
    const metrics = {
      stock:     [{label:"Revenue Growth (YoY)",value:stock.revenueGrowth||"—",flag:stock.chg>0?"positive":"neutral"},{label:"Gross Margin",value:stock.grossMargin||"—",flag:"positive"},{label:"P/E Ratio",value:stock.pe?`${stock.pe}×`:"—",flag:stock.pe<30?"positive":"neutral"},{label:"24h Volume",value:"—",flag:"neutral"}],
      etf:       [{label:"AUM",value:stock.aum||"—",flag:"neutral"},{label:"Expense Ratio",value:stock.expenseRatio||"—",flag:"positive"},{label:"Holdings",value:stock.holdings?.toLocaleString()||"—",flag:"neutral"},{label:"Dividend Yield",value:stock.divYield||"—",flag:"neutral"}],
      commodity: [{label:"YTD Performance",value:stock.ytd||"—",flag:parseFloat(stock.ytd)>0?"positive":"negative"},{label:"30d Volatility",value:stock.volatility30d||"—",flag:"neutral"},{label:"Contract Size",value:stock.contractSize||"—",flag:"neutral"},{label:"Unit",value:stock.unit||"—",flag:"neutral"}],
      index:     [{label:"Constituents",value:stock.constituents?.toLocaleString()||"—",flag:"neutral"},{label:"P/E Ratio",value:stock.pe?`${stock.pe}×`:"—",flag:"neutral"},{label:"Dividend Yield",value:stock.divYield||"—",flag:"neutral"},{label:"YTD Return",value:stock.ytd||"—",flag:parseFloat(stock.ytd)>0?"positive":"negative"}],
    };
    return (
      <div style={{display:"flex",flexDirection:"column",gap:"0.7rem"}}>
        <div style={{background:mode==="dark"?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)",borderRadius:"8px",padding:"0.85rem",borderLeft:`2.5px solid ${c.borderHi}`}}>
          <div style={{fontFamily:gs,fontSize:"0.58rem",color:c.muted,letterSpacing:"0.18em",textTransform:"uppercase",marginBottom:"5px",fontWeight:500}}>AI Summary</div>
          <p style={{fontFamily:gs,fontSize:"0.78rem",color:c.text,lineHeight:1.68}}>{summaryText[type]||summaryText.stock}</p>
        </div>
        {(metrics[type]||metrics.stock).map((row,i)=><MetricRow key={i} {...row}/>)}
      </div>
    );
  }

  // ── Tab 2 content (type-specific) ─────────────────────────────────────────
  function Tab2Content() {
    if (type === "stock") {
      return (
        <div style={{display:"flex",flexDirection:"column",gap:"0.7rem"}}>
          <div style={{background:mode==="dark"?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)",borderRadius:"8px",padding:"0.85rem",borderLeft:`2.5px solid ${c.borderHi}`}}>
            <div style={{fontFamily:gs,fontSize:"0.58rem",color:c.muted,letterSpacing:"0.18em",textTransform:"uppercase",marginBottom:"5px",fontWeight:500}}>Valuation Note</div>
            <p style={{fontFamily:gs,fontSize:"0.78rem",color:c.text,lineHeight:1.68}}>
              {stock.pe < 20
                ? `Trading at ${stock.pe}× earnings with a P/S of ${stock.ps}×. Valuation appears attractive relative to sector peers.`
                : `EV/EBITDA of ${stock.evEbitda}× and P/S of ${stock.ps}×. Premium to peers justified by growth trajectory.`}
            </p>
          </div>
          {[{label:"P/E Ratio",value:`${stock.pe}×`},{label:"Price / Sales",value:`${stock.ps}×`},{label:"EV / EBITDA",value:`${stock.evEbitda}×`},{label:"vs Sector P/E",value:"—"}].map((row,i)=><MetricRow key={i} {...row} flag="neutral"/>)}
        </div>
      );
    }
    if (type === "etf") {
      return (
        <div style={{display:"flex",flexDirection:"column",gap:"0.7rem"}}>
          <div style={{background:mode==="dark"?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)",borderRadius:"8px",padding:"0.85rem",borderLeft:`2.5px solid ${c.borderHi}`}}>
            <div style={{fontFamily:gs,fontSize:"0.58rem",color:c.muted,letterSpacing:"0.18em",textTransform:"uppercase",marginBottom:"5px",fontWeight:500}}>Top Holdings</div>
            {(stock.topHoldings||[]).map((h,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:`1px solid ${c.border}`}}>
                <span style={{fontFamily:gs,fontSize:"0.78rem",fontWeight:600,color:c.text}}>{h.ticker}</span>
                <span style={{fontFamily:gs,fontSize:"0.78rem",color:c.muted}}>{h.weight}</span>
              </div>
            ))}
          </div>
          <div style={{fontFamily:gs,fontSize:"0.6rem",color:c.muted,letterSpacing:"0.1em",textTransform:"uppercase",fontWeight:600,marginTop:"0.3rem"}}>Top Sectors</div>
          {(stock.topSectors||[]).map((s,i)=><MetricRow key={i} label={s.name} value={s.weight} flag="neutral"/>)}
        </div>
      );
    }
    if (type === "commodity") {
      const t = stock.technicals || {};
      return (
        <div style={{display:"flex",flexDirection:"column",gap:"0.7rem"}}>
          <div style={{background:mode==="dark"?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)",borderRadius:"8px",padding:"0.85rem",borderLeft:`2.5px solid ${c.borderHi}`}}>
            <div style={{fontFamily:gs,fontSize:"0.58rem",color:c.muted,letterSpacing:"0.18em",textTransform:"uppercase",marginBottom:"5px",fontWeight:500}}>Technical Levels</div>
            <p style={{fontFamily:gs,fontSize:"0.78rem",color:c.text,lineHeight:1.68}}>
              {t.rsi14 > 70 ? "RSI above 70 signals overbought conditions." : t.rsi14 < 30 ? "RSI below 30 signals oversold conditions." : `RSI at ${t.rsi14||"—"} suggests neutral momentum.`}
            </p>
          </div>
          {[{label:"RSI (14)",value:t.rsi14||"—"},{label:"MA (50)",value:t.ma50?`$${t.ma50.toLocaleString()}`:"—"},{label:"MA (200)",value:t.ma200?`$${t.ma200.toLocaleString()}`:"—"},{label:"ATR (14)",value:t.atr14||"—"}].map((row,i)=><MetricRow key={i} {...row} flag="neutral"/>)}
        </div>
      );
    }
    if (type === "index") {
      return (
        <div style={{display:"flex",flexDirection:"column",gap:"0.7rem"}}>
          <div style={{background:mode==="dark"?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)",borderRadius:"8px",padding:"0.85rem",borderLeft:`2.5px solid ${c.borderHi}`}}>
            <div style={{fontFamily:gs,fontSize:"0.58rem",color:c.muted,letterSpacing:"0.18em",textTransform:"uppercase",marginBottom:"5px",fontWeight:500}}>Methodology</div>
            <p style={{fontFamily:gs,fontSize:"0.78rem",color:c.text,lineHeight:1.68}}>{stock.methodology||"Market cap weighted"}. {stock.constituents||"—"} constituents rebalanced quarterly.</p>
          </div>
          <div style={{fontFamily:gs,fontSize:"0.6rem",color:c.muted,letterSpacing:"0.1em",textTransform:"uppercase",fontWeight:600,marginTop:"0.3rem"}}>Top 5 Constituents</div>
          {(stock.topConstituents||[]).map((h,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:`1px solid ${c.border}`}}>
              <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                <span style={{fontFamily:gs,fontSize:"0.65rem",color:c.muted,width:"14px"}}>{i+1}</span>
                <span style={{fontFamily:gs,fontSize:"0.78rem",fontWeight:600,color:c.text}}>{h.ticker}</span>
              </div>
              <span style={{fontFamily:gs,fontSize:"0.78rem",color:c.muted}}>{h.weight}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  }

  // ── Risk tab content ──────────────────────────────────────────────────────
  function RiskContent() {
    return (
      <div style={{display:"flex",flexDirection:"column",gap:"0.6rem"}}>
        {(stock.risks||[]).map((r,i) => {
          const col = r.level==="High" ? c.red : r.level==="Medium" ? c.muted : c.green;
          return (
            <div key={i} style={{display:"flex",alignItems:"center",gap:"0.6rem",padding:"9px 11px",
              background:mode==="dark"?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)",
              borderRadius:"8px",border:`1px solid ${c.border}`}}>
              <span style={{fontFamily:gs,fontSize:"0.76rem",color:c.text,flex:1}}>{r.flag}</span>
              <span style={{fontFamily:gs,fontSize:"0.62rem",fontWeight:700,color:col,letterSpacing:"0.05em",textTransform:"uppercase",flexShrink:0}}>{r.level}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",zIndex:400,backdropFilter:"blur(4px)"}}/>

      {/* Card */}
      <div style={{
        position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",
        width:"min(780px,93vw)",maxHeight:"88vh",
        display:"flex",flexDirection:"column",
        background:mode==="dark"?"#0E0E10":"#FFFFFF",
        border:`1px solid ${c.borderHi}`,
        borderRadius:"16px",
        boxShadow:"0 32px 80px rgba(0,0,0,0.5)",
        zIndex:401,
      }}>

        {/* Header */}
        <div style={{
          padding:"1.25rem 1.5rem",borderBottom:`1px solid ${c.border}`,
          background:mode==="dark"?"linear-gradient(90deg,#111113,#141418)":"linear-gradient(90deg,#FFFFFF,#F5F5F8)",
          position:"sticky",top:0,zIndex:2,borderRadius:"16px 16px 0 0",
        }}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:"1rem"}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:"0.6rem",marginBottom:"0.25rem",flexWrap:"wrap"}}>
                <span style={{fontFamily:gs,fontSize:"1.4rem",fontWeight:700,color:c.text}}>{stock.ticker}</span>
                {/* Instrument type badge */}
                <span style={{fontFamily:gs,fontSize:"0.62rem",fontWeight:700,
                  background:typeCol.bg,border:`1px solid ${typeCol.border}`,color:typeCol.text,
                  borderRadius:"6px",padding:"2px 7px",letterSpacing:"0.05em",textTransform:"uppercase"}}>
                  {TYPE_LABEL[type]||"Stock"}
                </span>
                {/* Market status badge */}
                <span style={{fontFamily:gs,fontSize:"0.65rem",fontWeight:700,color:stColor,
                  background:`${stColor}18`,border:`1px solid ${stColor}40`,
                  borderRadius:"6px",padding:"2px 7px",letterSpacing:"0.05em",textTransform:"uppercase"}}>
                  {status.label}
                </span>
                <span style={{fontFamily:gs,fontSize:"0.68rem",color:c.muted}}>{stock.exchange}</span>
              </div>
              <div style={{fontFamily:gs,fontSize:"0.82rem",color:c.muted,marginBottom:"0.35rem"}}>{stock.name}</div>
              <div style={{display:"flex",alignItems:"center",gap:"5px"}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:stColor,boxShadow:status.isOpen?`0 0 6px ${stColor}`:"none"}}/>
                <span style={{fontFamily:gs,fontSize:"0.65rem",color:c.muted}}>
                  {MARKET_HOURS[stock.exchange]?.label||stock.exchange} · {hours}
                </span>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"flex-start",gap:"1rem",flexShrink:0}}>
              <div style={{textAlign:"right"}}>
                <div style={{fontFamily:gs,fontSize:"1.6rem",fontWeight:700,color:c.text,lineHeight:1}}>
                  {type==="commodity"||type==="index" ? "" : "$"}{stock.price.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}
                </div>
                <div style={{fontFamily:gs,fontSize:"0.82rem",fontWeight:700,color:pos?c.green:c.red,marginTop:"3px"}}>
                  {pos?"+":""}{stock.chg.toFixed(2)}% · 24h
                </div>
              </div>
              <button onClick={onClose} style={{
                background:c.surface,border:`1px solid ${c.border}`,borderRadius:"4px",
                padding:"7px 10px",cursor:"pointer",color:c.muted,
                fontFamily:gs,fontSize:"0.78rem",display:"flex",alignItems:"center",gap:"4px",
              }}>✕ <span style={{fontSize:"0.58rem",opacity:0.6}}>ESC</span></button>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:"0.75rem",marginTop:"0.75rem"}}>
            <AIScore score={stock.score} c={c} size={42}/>
            <VerdictBadge verdict={stock.verdict} c={c}/>
            <span style={{fontFamily:gs,fontSize:"0.72rem",color:c.muted}}>{stock.sector}</span>
            {stock.mktCap && stock.mktCap !== "—" && (
              <span style={{fontFamily:gs,fontSize:"0.72rem",color:c.muted}}>
                Market Cap: <strong style={{color:c.text}}>{stock.mktCap}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Body: chart + tabs */}
        <div style={{flex:1,overflowY:"auto",display:"grid",gridTemplateColumns:"1fr 340px"}}>

          {/* Chart column */}
          <div style={{padding:"1.4rem 1.25rem 1.25rem",borderRight:`1px solid ${c.border}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}>
              <span style={{fontFamily:gs,fontSize:"0.68rem",color:c.muted,letterSpacing:"0.18em",textTransform:"uppercase",fontWeight:500}}>
                Price History
              </span>
              <div style={{display:"flex",gap:"0.25rem"}}>
                {TIME_RANGES.map(t => (
                  <button key={t} onClick={() => setTimeRange(t)} style={pill(timeRange===t)}>{t}</button>
                ))}
              </div>
            </div>

            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData} margin={{top:8,right:8,bottom:0,left:0}}>
                <defs>
                  <linearGradient id="cg-disc-blue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={c.blue} stopOpacity={0.22}/>
                    <stop offset="95%" stopColor={c.blue} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={c.border} vertical={false}/>
                <XAxis dataKey="date" tick={{fill:c.muted,fontSize:8,fontFamily:gs}} axisLine={false} tickLine={false}
                  tickFormatter={d => {const p=d.split("-");return `${p[2]}/${p[1]}`;}}
                  interval={Math.floor(chartData.length/5)}/>
                <YAxis domain={[chartMin,chartMax]} tick={{fill:c.muted,fontSize:8,fontFamily:gs}}
                  axisLine={false} tickLine={false}
                  tickFormatter={v => v>=1000?`${(v/1000).toFixed(0)}k`:`${v.toFixed(0)}`} width={44}/>
                <Tooltip content={<ChartTip c={c}/>} cursor={{stroke:c.borderHi,strokeWidth:1,strokeDasharray:"3 3"}}/>
                <Area type="monotone" dataKey="price" stroke={c.blue} strokeWidth={2}
                  fill="url(#cg-disc-blue)" dot={false} activeDot={{r:4,fill:c.blue}}/>
              </AreaChart>
            </ResponsiveContainer>

            {/* 52-week range bar */}
            <div style={{marginTop:"1rem",padding:"0.75rem",background:c.surface,borderRadius:"8px",border:`1px solid ${c.border}`}}>
              <div style={{fontFamily:gs,fontSize:"0.6rem",color:c.muted,letterSpacing:"0.18em",textTransform:"uppercase",fontWeight:500,marginBottom:"6px"}}>
                52-Week Range
              </div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:"5px"}}>
                <span style={{fontFamily:gs,fontSize:"0.74rem",color:c.red,fontWeight:600}}>
                  {stock.weekLow?.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}
                </span>
                <span style={{fontFamily:gs,fontSize:"0.74rem",color:c.green,fontWeight:600}}>
                  {stock.weekHigh?.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}
                </span>
              </div>
              {(() => {
                const pct = stock.weekLow && stock.weekHigh && stock.weekHigh > stock.weekLow
                  ? Math.min(100, Math.max(0, ((stock.price-stock.weekLow)/(stock.weekHigh-stock.weekLow))*100)) : 50;
                return (
                  <div style={{position:"relative",height:"5px",background:c.border,borderRadius:"3px"}}>
                    <div style={{position:"absolute",left:0,width:`${pct}%`,height:"100%",
                      background:`linear-gradient(90deg,${c.red},${c.green})`,borderRadius:"3px"}}/>
                    <div style={{position:"absolute",top:"-4px",left:`calc(${pct}% - 4px)`,
                      width:"8px",height:"13px",background:c.text,borderRadius:"2px",border:`1px solid ${c.bg}`}}/>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Tabs column */}
          <div style={{padding:"1.25rem"}}>
            <div style={{display:"flex",gap:"0.4rem",borderBottom:`1px solid ${c.border}`,marginBottom:"1rem"}}>
              {tabs.map((t,i) => (
                <button key={t} onClick={() => setTab(t)} style={tabBtn(tab===t)}>{tabLabels[i]}</button>
              ))}
            </div>
            {tab==="overview" && <OverviewContent/>}
            {tab==="tab2"     && <Tab2Content/>}
            {tab==="risk"     && <RiskContent/>}
          </div>
        </div>

        {/* Footer actions */}
        <div style={{
          padding:"1rem 1.5rem",borderTop:`1px solid ${c.border}`,
          display:"flex",alignItems:"center",gap:"0.75rem",
          background:mode==="dark"?"rgba(9,9,9,0.5)":"rgba(247,247,245,0.5)",
          flexWrap:"wrap",borderRadius:"0 0 16px 16px",
        }}>
          <button onClick={() => onWatchlist(stock.ticker)}
            style={{
              background:inWatchlist?c.greenDim:"transparent",
              border:`1px solid ${inWatchlist?`${c.green}50`:c.border}`,
              borderRadius:"4px",padding:"9px 16px",
              cursor:"pointer",color:inWatchlist?c.green:c.muted,
              fontFamily:gs,fontSize:"0.8rem",
              display:"flex",alignItems:"center",gap:"6px",
              transition:"opacity 0.2s ease",
            }}>
            <IconBookmark filled={inWatchlist} size={14}/>
            {inWatchlist ? "Watching" : "Watchlist"}
          </button>

          <div ref={portRef} style={{position:"relative"}}>
            <button onClick={() => setPortOpen(!portOpen)}
              style={{
                background:addedTo?c.greenDim:c.surface,
                border:`1px solid ${addedTo?`${c.green}50`:c.borderHi}`,
                borderRadius:"4px",padding:"9px 14px",
                cursor:"pointer",color:addedTo?c.green:c.muted,
                fontFamily:gs,fontSize:"0.8rem",
                display:"flex",alignItems:"center",gap:"6px",
                transition:"opacity 0.2s ease",
              }}>
              <IconPieChart size={14}/>
              {addedTo ? `Added to ${addedTo} ✓` : "Add to Portfolio"}
              {!addedTo && <IconChevronDown size={11}/>}
            </button>
            {portOpen && (
              <div style={{
                position:"absolute",bottom:"calc(100% + 6px)",left:0,
                background:c.card,border:`1px solid ${c.borderHi}`,
                borderRadius:"8px",overflow:"hidden",zIndex:10,
                boxShadow:"0 8px 24px rgba(0,0,0,0.25)",minWidth:"190px",
              }}>
                <div style={{padding:"8px 12px",fontFamily:gs,fontSize:"0.62rem",color:c.muted,
                  letterSpacing:"0.1em",textTransform:"uppercase",borderBottom:`1px solid ${c.border}`}}>
                  Add to portfolio
                </div>
                {portfolios.length===0 ? (
                  <div style={{padding:"10px 14px",fontFamily:gs,fontSize:"0.78rem",color:c.muted}}>No portfolios yet</div>
                ) : portfolios.map(p => (
                  <button key={p.id} onClick={() => handleAddToPortfolio(p)}
                    style={{width:"100%",padding:"9px 14px",background:"transparent",border:"none",
                      borderBottom:`1px solid ${c.border}`,textAlign:"left",cursor:"pointer",
                      fontFamily:gs,fontSize:"0.82rem",color:c.text,
                      display:"flex",alignItems:"center",gap:"7px"}}
                    onMouseEnter={e => e.currentTarget.style.background=c.surface}
                    onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                    <IconPieChart size={12}/>{p.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{flex:1}}/>

          <button onClick={onViewFullAnalysis}
            style={{background:c.text,color:c.bg,border:"none",borderRadius:"4px",
              padding:"9px 22px",fontFamily:gs,fontSize:"0.84rem",fontWeight:600,
              cursor:"pointer",letterSpacing:"0.02em"}}>
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
  const [userPlan,    setUserPlan]    = useState("essential"); // "essential"|"pro"|"ultimate"

  const [search,      setSearch]      = useState("");
  const [sfoc,        setSfoc]        = useState(false);
  const [sector,      setSector]      = useState("All");
  const [market,      setMarket]      = useState("All");
  const [typeFilter,  setTypeFilter]  = useState("All");
  const [industry,    setIndustry]    = useState("All");
  const [filterOpen,  setFilterOpen]  = useState(false);
  const [sortKey,     setSortKey]     = useState("score");
  const [sortDir,     setSortDir]     = useState("desc");
  const [selected,    setSelected]    = useState(null);
  const [hovRow,      setHovRow]      = useState(null);
  const [openPortRow, setOpenPortRow] = useState(null);

  // ── Smart Filters state ───────────────────────────────────────────────────
  const [sfPanelOpen,   setSfPanelOpen]   = useState(true);
  const [sfOpenFilter,  setSfOpenFilter]  = useState(null); // which filter panel is expanded
  const [sfVol,         setSfVol]         = useState(null); // { dir:"gt"|"lt", val:number }
  const [sfMc,          setSfMc]          = useState(null);
  const [sfPe,          setSfPe]          = useState(null); // string label
  const [sfFv,          setSfFv]          = useState(null);
  const [sfGpm,         setSfGpm]         = useState(null);
  const [sfRev,         setSfRev]         = useState(null);
  const [sfDs,          setSfDs]          = useState(null);

  const sfIsUltimate = userPlan === "ultimate";
  const sfAnyActive  = [sfVol,sfMc,sfPe,sfFv,sfGpm,sfRev,sfDs].some(v => v !== null);

  // Sync the type filter pill visually when Smart Filters activate/deactivate
  useEffect(() => {
    if (sfAnyActive) setTypeFilter("Stocks");
    else setTypeFilter("All");
  }, [sfAnyActive]);

  // Graham Number upside: sqrt(22.5 * EPS * BVPS), expressed as % vs current price
  const grahamUpside = (eps, bvps, price) => {
    if (!eps || !bvps || eps <= 0 || bvps <= 0) return null;
    const gn = Math.sqrt(22.5 * eps * bvps);
    return ((gn - price) / price * 100).toFixed(1);
  };

  // Smart Filter numeric presets
  const SF_VOL_PRESETS = [{label:"1M",val:1_000_000},{label:"5M",val:5_000_000},{label:"10M",val:10_000_000},{label:"50M",val:50_000_000}];
  const SF_MC_PRESETS  = [{label:"$300M",val:300},{label:"$2B",val:2_000},{label:"$10B",val:10_000},{label:"$200B",val:200_000}];

  // ── Load session, watchlist, portfolios ────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data:{ session } }) => {
      if (!session) { router.push("/login"); return; }
      const tok = session.access_token;
      setToken(tok);

      // Read plan from user_profiles (canonical source — JWT metadata is stale)
      try {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("plan")
          .eq("id", session.user.id)
          .single();
        if (profile?.plan) setUserPlan(profile.plan);
      } catch {}

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
          .eq("id", session.user.id);
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
          body: JSON.stringify({ ticker, name:stock?.name, sector:stock?.sector, market:stock?.market, type:stock?.type||"stock" }),
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
    const TYPE_FILTER_MAP = {"Stocks":"stock","ETFs":"etf","Commodities":"commodity","Indexes":"index"};
    const list = stocks.filter(s =>
      (!q || s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.sector.toLowerCase().includes(q) || (s.industry||"").toLowerCase().includes(q))
      && (market === "All" || s.market === market)
      && (sector === "All" || s.sector === sector)
      && (industry === "All" || s.industry === industry)
      && (typeFilter === "All" || s.type === TYPE_FILTER_MAP[typeFilter])
    );
    // Apply Smart Filters (stocks only, Ultimate plan)
    const sfFiltered = list.filter(s => {
      if (!sfAnyActive) return true;
      if (s.type !== "stock") return false;
      if (sfVol) {
        const v = s.volume ?? 0;
        if (sfVol.dir === "gt" && v < sfVol.val) return false;
        if (sfVol.dir === "lt" && v > sfVol.val) return false;
      }
      if (sfMc) {
        const mc = parseMktCap(s.mktCap);
        const threshold = sfMc.val * 1_000_000; // stored in $M
        if (sfMc.dir === "gt" && mc < threshold) return false;
        if (sfMc.dir === "lt" && mc > threshold) return false;
      }
      if (sfPe) {
        const pe = s.pe ?? 0;
        if (sfPe === "Low (0–15×)"     && !(pe >= 0   && pe < 15))  return false;
        if (sfPe === "Mid (15–30×)"    && !(pe >= 15  && pe < 30))  return false;
        if (sfPe === "High (30–50×)"   && !(pe >= 30  && pe < 50))  return false;
        if (sfPe === "Premium (50×+)"  && !(pe >= 50))              return false;
      }
      if (sfFv) {
        const eps = s.eps ?? 0; const bvps = s.bvps ?? 0;
        if (eps > 0 && bvps > 0) {
          const gn = Math.sqrt(22.5 * eps * bvps);
          const upsidePct = ((gn - s.price) / s.price) * 100;
          if (sfFv === "Undervalued" && upsidePct <= 10)  return false;
          if (sfFv === "Fair"        && Math.abs(upsidePct) > 10) return false;
          if (sfFv === "Overvalued"  && upsidePct >= -10) return false;
        }
      }
      if (sfGpm) {
        const gm = parseFloat((s.grossMargin||"0").replace("%",""));
        if (sfGpm === ">40%" && gm < 40) return false;
        if (sfGpm === ">60%" && gm < 60) return false;
        if (sfGpm === ">75%" && gm < 75) return false;
        if (sfGpm === ">90%" && gm < 90) return false;
      }
      if (sfRev) {
        const rg = parseFloat((s.revenueGrowth||"0").replace(/[^0-9.-]/g,""));
        if (sfRev === ">10%"  && rg < 10)  return false;
        if (sfRev === ">25%"  && rg < 25)  return false;
        if (sfRev === ">50%"  && rg < 50)  return false;
        if (sfRev === ">100%" && rg < 100) return false;
      }
      if (sfDs) {
        const streak = s.dividendStreak ?? 0;
        if (sfDs === ">5 yrs"  && streak < 5)  return false;
        if (sfDs === ">10 yrs" && streak < 10) return false;
        if (sfDs === ">25 yrs" && streak < 25) return false;
        if (sfDs === ">50 yrs" && streak < 50) return false;
      }
      return true;
    });

    return [...sfFiltered].sort((a,b) => {
      if (sortKey === "ticker")   return sortDir==="asc" ? a.ticker.localeCompare(b.ticker) : b.ticker.localeCompare(a.ticker);
      if (sortKey === "name")     return sortDir==="asc" ? a.name.localeCompare(b.name)     : b.name.localeCompare(a.name);
      if (sortKey === "mktCap")   { const av=parseMktCap(a.mktCap), bv=parseMktCap(b.mktCap); return sortDir==="asc"?av-bv:bv-av; }
      if (sortKey === "momentum") {
        // 20-day momentum: approximate from chg (live data will use actual 20d price change)
        return sortDir==="asc" ? (a.chg??0)-(b.chg??0) : (b.chg??0)-(a.chg??0);
      }
      if (sortKey === "upside") {
        const au = (a.eps && a.bvps) ? parseFloat(grahamUpside(a.eps,a.bvps,a.price)??"-999") : -999;
        const bu = (b.eps && b.bvps) ? parseFloat(grahamUpside(b.eps,b.bvps,b.price)??"-999") : -999;
        return sortDir==="asc" ? au-bu : bu-au;
      }
      return sortDir==="asc" ? (a[sortKey]??0)-(b[sortKey]??0) : (b[sortKey]??0)-(a[sortKey]??0);
    });
  }, [stocks, search, sector, market, sortKey, sortDir, sfAnyActive, sfVol, sfMc, sfPe, sfFv, sfGpm, sfRev, sfDs]);

  const toggleSort = k => {
    if (sortKey === k) setSortDir(d => d==="asc"?"desc":"asc");
    else { setSortKey(k); setSortDir("desc"); }
  };

  // ── Sortable table header ─────────────────────────────────────────────────
  const Th = ({ k, label, align="right" }) => (
    <th onClick={() => toggleSort(k)} style={{
      fontFamily:gs, fontSize:"0.6rem",
      color:sortKey===k ? c.text : c.muted,
      letterSpacing:"0.07em", textTransform:"uppercase", fontWeight:500,
      padding:"8px 10px", textAlign:align, cursor:"pointer",
      whiteSpace:"nowrap", userSelect:"none",
      background:sortKey===k ? c.surface : "transparent",
      borderBottom:`1px solid ${c.border}`,
      transition:"opacity 0.15s ease",
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
        .tr-hover{transition:opacity 0.12s;}
        .recharts-wrapper,.recharts-wrapper *{outline:none !important;-webkit-tap-highlight-color:transparent;}
        .recharts-wrapper *:focus,.recharts-wrapper *:focus-visible{outline:none !important;}
        .recharts-surface{outline:none !important;}
      `}</style>

      <div style={{ maxWidth:"1200px", margin:"0 auto", padding:"2.5rem 3.5rem" }}>

        {/* Header */}
        <div style={{ marginBottom:"1.75rem" }}>
          <p style={{ fontFamily:gs, color:c.muted, fontSize:"0.65rem", letterSpacing:"0.18em", textTransform:"uppercase", marginBottom:"0.4rem", fontWeight:500 }}>Discovery</p>
          <h1 style={{ fontFamily:gs, fontSize:"clamp(1.5rem,3vw,2.2rem)", fontWeight:600, color:c.text }}>Markets Overview</h1>
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
              color:c.text, fontSize:"0.88rem", fontFamily:gs, outline:"none", transition:"opacity 0.18s ease" }}
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
                transition:"opacity 0.18s ease", flexShrink:0,
              }}>
              {m.label}
            </button>
          ))}
        </div>

        {/* Instrument type filter pills */}
        <div className="sr" style={{ marginBottom:"0.6rem" }}>
          {INSTRUMENT_TYPES.map(t => (
            <button key={t} onClick={() => setTypeFilter(t === typeFilter ? "All" : t)}
              style={{
                background:typeFilter===t ? c.text : "transparent",
                color:typeFilter===t ? c.bg : c.muted,
                border:`1px solid ${typeFilter===t ? c.text : c.border}`,
                borderRadius:"50px", padding:"5px 14px",
                fontFamily:gs, fontSize:"0.73rem", fontWeight:600,
                cursor:"pointer", whiteSpace:"nowrap",
                transition:"opacity 0.18s ease", flexShrink:0,
              }}>
              {t}
            </button>
          ))}
        </div>

        {/* Sector / Industry accordion filter */}
        {(() => {
          const hasFilter = sector !== "All" || industry !== "All";
          const industries = sector !== "All" ? (SECTOR_INDUSTRY_MAP[sector] || []) : [];
          const filterLabel = industry !== "All" ? industry : sector !== "All" ? sector : "Sector / Industry";
          return (
            <div style={{ marginBottom:"1.25rem" }}>

              {/* Accordion trigger row */}
              <button
                onClick={() => setFilterOpen(o => !o)}
                style={{
                  display:"flex", alignItems:"center", gap:"8px",
                  background:"transparent", border:`1px solid ${hasFilter ? c.borderHi : c.border}`,
                  borderRadius:"8px", padding:"8px 14px",
                  cursor:"pointer", fontFamily:gs, fontSize:"0.76rem", fontWeight:600,
                  color: hasFilter ? c.text : c.muted,
                  transition:"opacity 0.18s ease", width:"100%", textAlign:"left",
                }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
                </svg>
                <span style={{ flex:1 }}>{filterLabel}</span>
                {hasFilter && (
                  <span
                    onClick={e => { e.stopPropagation(); setSector("All"); setIndustry("All"); }}
                    style={{ fontSize:"0.68rem", color:c.muted, padding:"1px 6px",
                      background:c.surface, borderRadius:"4px", cursor:"pointer",
                      border:`1px solid ${c.border}`, lineHeight:"1.6" }}>
                    Clear
                  </span>
                )}
                <svg
                  width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{ transform: filterOpen ? "rotate(180deg)" : "rotate(0deg)", transition:"transform 0.22s ease", flexShrink:0 }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {/* Accordion body */}
              <div style={{
                overflow:"hidden",
                maxHeight: filterOpen ? "420px" : "0px",
                opacity: filterOpen ? 1 : 0,
                transition:"max-height 0.28s ease, opacity 0.22s ease",
              }}>
                <div style={{
                  marginTop:"8px", padding:"1rem",
                  background:c.bg, border:`1px solid ${c.border}`,
                  borderRadius:"10px",
                }}>

                  {/* Sector pills */}
                  <p style={{ fontFamily:gs, fontSize:"0.6rem", color:c.muted, letterSpacing:"0.14em",
                    textTransform:"uppercase", fontWeight:600, marginBottom:"8px" }}>Sector</p>
                  <div className="sr" style={{ flexWrap:"wrap", gap:"6px", marginBottom:"1rem" }}>
                    {SECTORS.map(s => (
                      <button key={s}
                        onClick={() => {
                          const next = s === sector ? "All" : s;
                          setSector(next);
                          setIndustry("All"); // reset industry when sector changes
                        }}
                        style={{
                          background: sector===s ? c.text : "transparent",
                          color: sector===s ? c.bg : c.muted,
                          border:`1px solid ${sector===s ? c.text : c.border}`,
                          borderRadius:"50px", padding:"4px 12px",
                          fontFamily:gs, fontSize:"0.72rem", fontWeight:600,
                          cursor:"pointer", transition:"all 0.15s ease", flexShrink:0,
                          whiteSpace:"nowrap",
                        }}>
                        {s}
                      </button>
                    ))}
                  </div>

                  {/* Industry pills — only shown when a sector is selected */}
                  <div style={{
                    overflow:"hidden",
                    maxHeight: industries.length > 0 ? "160px" : "0px",
                    opacity: industries.length > 0 ? 1 : 0,
                    transition:"max-height 0.24s ease, opacity 0.2s ease",
                  }}>
                    <div style={{ height:"1px", background:c.border, marginBottom:"0.85rem" }}/>
                    <p style={{ fontFamily:gs, fontSize:"0.6rem", color:c.muted, letterSpacing:"0.14em",
                      textTransform:"uppercase", fontWeight:600, marginBottom:"8px" }}>Industry</p>
                    <div className="sr" style={{ flexWrap:"wrap", gap:"6px" }}>
                      {industries.map(ind => (
                        <button key={ind}
                          onClick={() => setIndustry(ind === industry ? "All" : ind)}
                          style={{
                            background: industry===ind ? c.text : "transparent",
                            color: industry===ind ? c.bg : c.muted,
                            border:`1px solid ${industry===ind ? c.text : c.border}`,
                            borderRadius:"50px", padding:"4px 12px",
                            fontFamily:gs, fontSize:"0.72rem", fontWeight:600,
                            cursor:"pointer", transition:"all 0.15s ease", flexShrink:0,
                            whiteSpace:"nowrap",
                          }}>
                          {ind}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>
              </div>

            </div>
          );
        })()}

        {/* Smart Filters panel — Ultimate only */}
        {(() => {
          const amber     = mode==="dark" ? "#F59E0B" : "#B45309";
          const amberDim  = mode==="dark" ? "rgba(245,158,11,0.12)" : "rgba(180,83,9,0.08)";
          const amberBd   = mode==="dark" ? "rgba(245,158,11,0.30)" : "rgba(180,83,9,0.25)";

          // Helper: pill label for numeric filters
          const numLabel = (state, fallback) => {
            if (!state) return fallback;
            const dir = state.dir === "gt" ? ">" : "<";
            const v = state.val >= 1_000_000 ? `${(state.val/1_000_000).toFixed(0)}M`
                    : state.val >= 1_000     ? `${(state.val/1_000).toFixed(0)}K`
                    : String(state.val);
            return `${dir}${v}`;
          };

          // Shared styles
          const sfPillBase = (isSet, isOpen) => ({
            borderRadius:"50px", padding:"6px 14px",
            fontFamily:gs, fontSize:"0.74rem", fontWeight:600,
            cursor: sfIsUltimate ? "pointer" : "default",
            border:`1px solid ${isSet ? c.text : isOpen ? c.borderHi : c.border}`,
            background: isSet ? c.text : "transparent",
            color: isSet ? c.bg : isOpen ? c.text : c.muted,
            display:"inline-flex", alignItems:"center", gap:"5px",
            transition:"all 0.15s", whiteSpace:"nowrap",
          });
          const sfOpPill = (isActive) => ({
            borderRadius:"50px", padding:"5px 13px",
            fontFamily:gs, fontSize:"0.72rem", fontWeight:600,
            cursor:"pointer",
            border:`1px solid ${isActive ? c.text : c.border}`,
            background: isActive ? c.text : "transparent",
            color: isActive ? c.bg : c.muted,
            transition:"all 0.15s", whiteSpace:"nowrap",
          });
          const sfFoWrap = (isOpen) => ({
            overflow:"hidden",
            maxHeight: isOpen ? "300px" : "0px",
            opacity: isOpen ? 1 : 0,
            transition:"max-height 0.26s ease, opacity 0.2s ease",
            padding:"0 14px",
          });
          const sfFoInner = {
            padding:"10px 12px 12px",
            background:c.bg,
            border:`1px solid ${c.borderHi}`,
            borderRadius:"8px", marginBottom:"10px",
          };
          const sfFoLbl = {
            fontFamily:gs, fontSize:"0.59rem", letterSpacing:"0.12em",
            textTransform:"uppercase", color:c.muted, fontWeight:600, marginBottom:"8px",
          };

          // Toggle which filter panel is open
          const tapFilter = (id, currentVal) => {
            if (!sfIsUltimate) return;
            setSfOpenFilter(prev => prev === id ? null : id);
          };

          // Bucket pick (toggle on/off, close panel)
          const bucketPick = (setter, currentVal, label) => {
            setter(currentVal === label ? null : label);
            setSfOpenFilter(null);
          };

          // Numeric quick-preset pick (toggle on/off)
          const numPresetPick = (setter, currentVal, val, dir) => {
            if (currentVal && currentVal.val === val) {
              setter(null);
            } else {
              setter({ dir, val });
              setSfOpenFilter(null);
            }
          };

          // Clear all Smart Filters
          const clearAllSf = () => {
            setSfVol(null); setSfMc(null); setSfPe(null); setSfFv(null);
            setSfGpm(null); setSfRev(null); setSfDs(null);
            setSfOpenFilter(null);
          };

          // Auto-sync type filter pill when SF activates/deactivates
          // (handled in filtered useMemo — type pill visual sync below)

          const filters = [
            { id:"vol", label: numLabel(sfVol,"Volume"),           isSet:sfVol!==null },
            { id:"mc",  label: numLabel(sfMc,"Market Cap"),        isSet:sfMc!==null  },
            { id:"pe",  label: sfPe  || "P/E Ratio",              isSet:sfPe!==null  },
            { id:"fv",  label: sfFv  || "Fair Value",             isSet:sfFv!==null  },
            { id:"gpm", label: sfGpm || "Gross Profit Margin",    isSet:sfGpm!==null },
            { id:"rev", label: sfRev || "Revenue Growth",         isSet:sfRev!==null },
            { id:"ds",  label: sfDs  || "Dividend Streak",        isSet:sfDs!==null  },
          ];

          return (
            <div style={{
              position:"relative",
              borderRadius:"10px", border:`1px solid ${c.border}`,
              background:c.bg, marginBottom:"1.25rem", overflow:"hidden",
            }}>

              {/* Lock overlay for non-Ultimate */}
              {!sfIsUltimate && (
                <div style={{
                  position:"absolute", inset:0,
                  background: mode==="dark" ? "rgba(9,9,9,0.90)" : "rgba(247,247,245,0.92)",
                  borderRadius:"10px", zIndex:10,
                  display:"flex", flexDirection:"column",
                  alignItems:"center", justifyContent:"center",
                  gap:"6px", padding:"10px 16px",
                }}>
                  {/* FA6 lock icon */}
                  <svg width="18" height="18" viewBox="0 0 448 512" fill={c.muted}>
                    <path d="M144 144v48h160v-48c0-44.2-35.8-80-80-80s-80 35.8-80 80zM80 192v-48C80 64.5 144.5 0 224 0s144 64.5 144 144v48h16c35.3 0 64 28.7 64 64v192c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V256c0-35.3 28.7-64 64-64H80z"/>
                  </svg>
                  <div style={{fontFamily:gs, fontSize:"0.8rem", fontWeight:600, color:c.text}}>Smart Filters require Ultimate</div>
                  <div style={{fontFamily:gs, fontSize:"0.7rem", color:c.muted, whiteSpace:"nowrap"}}>Upgrade to unlock 7 screener-grade precision filters.</div>
                  <button
                    onClick={() => router.push("/dashboard/account")}
                    style={{background:c.text, color:c.bg, border:"none", borderRadius:"4px",
                      padding:"6px 16px", fontSize:"0.76rem", fontWeight:700,
                      cursor:"pointer", fontFamily:gs}}>
                    View Ultimate plan ↗
                  </button>
                </div>
              )}

              {/* Panel content (blurred when locked) */}
              <div style={{ filter:sfIsUltimate?"none":"blur(3px)", pointerEvents:sfIsUltimate?"auto":"none" }}>

                {/* Header */}
                <div
                  onClick={() => setSfPanelOpen(o => !o)}
                  style={{
                    display:"flex", alignItems:"center", gap:"10px",
                    padding:"11px 14px", cursor:"pointer", userSelect:"none",
                    borderBottom: sfPanelOpen ? `1px solid ${c.border}` : "none",
                  }}>
                  {/* ULTIMATE badge — same style as type badges, amber */}
                  <span style={{
                    fontFamily:gs, fontSize:"0.62rem", fontWeight:700,
                    letterSpacing:"0.06em", textTransform:"uppercase",
                    color:amber, background:amberDim,
                    border:`1px solid ${amberBd}`,
                    borderRadius:"6px", padding:"2px 7px", flexShrink:0,
                  }}>ULTIMATE</span>
                  <div style={{flex:1, display:"flex", alignItems:"center", gap:"8px"}}>
                    <span style={{fontFamily:gs, fontSize:"0.8rem", fontWeight:600, color:c.muted}}>Smart Filters</span>
                    <span style={{fontFamily:gs, fontSize:"0.71rem", color:c.muted, opacity:0.6}}>(stocks only)</span>
                  </div>
                  {sfAnyActive && (
                    <button
                      onClick={e => { e.stopPropagation(); clearAllSf(); }}
                      style={{background:"none", border:`1px solid ${c.border}`, borderRadius:"4px",
                        padding:"2px 8px", cursor:"pointer", fontFamily:gs,
                        fontSize:"0.66rem", color:c.muted}}>
                      Clear all
                    </button>
                  )}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={c.muted}
                    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    style={{transform:sfPanelOpen?"rotate(180deg)":"rotate(0deg)",transition:"transform 0.22s ease",flexShrink:0}}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>

                {/* Collapsible body */}
                <div style={{
                  overflow:"hidden",
                  maxHeight: sfPanelOpen ? "600px" : "0px",
                  opacity: sfPanelOpen ? 1 : 0,
                  transition:"max-height 0.28s ease, opacity 0.22s ease",
                }}>

                  {/* Filter name pills row */}
                  <div style={{display:"flex", gap:"6px", flexWrap:"wrap", padding:"12px 14px"}}>
                    {filters.map(f => (
                      <button key={f.id} onClick={() => tapFilter(f.id)} style={sfPillBase(f.isSet, sfOpenFilter===f.id)}>
                        {f.label}
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                          style={{opacity:0.55, transform:(sfOpenFilter===f.id||f.isSet)?"rotate(180deg)":"none", transition:"transform 0.18s"}}>
                          <polyline points="6 9 12 15 18 9"/>
                        </svg>
                      </button>
                    ))}
                  </div>

                  {/* Volume panel */}
                  <div style={sfFoWrap(sfOpenFilter==="vol")}>
                    <div style={sfFoInner}>
                      <div style={sfFoLbl}>Daily volume threshold</div>
                      <div style={{display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap"}}>
                        <div style={{display:"flex", border:`1px solid ${c.border}`, borderRadius:"50px", overflow:"hidden", height:"30px", flexShrink:0}}>
                          <button onClick={() => setSfVol(v => v ? {...v,dir:"gt"} : {dir:"gt",val:0})}
                            style={{padding:"0 11px", background:(!sfVol||sfVol.dir==="gt")?c.text:"transparent",
                              color:(!sfVol||sfVol.dir==="gt")?c.bg:c.muted,
                              border:"none", fontWeight:700, cursor:"pointer", fontFamily:gs, fontSize:"0.82rem"}}>
                            &gt;
                          </button>
                          <button onClick={() => setSfVol(v => v ? {...v,dir:"lt"} : {dir:"lt",val:0})}
                            style={{padding:"0 11px", background:(sfVol?.dir==="lt")?c.text:"transparent",
                              color:(sfVol?.dir==="lt")?c.bg:c.muted,
                              border:"none", fontWeight:700, cursor:"pointer", fontFamily:gs, fontSize:"0.82rem"}}>
                            &lt;
                          </button>
                        </div>
                        <input type="number" placeholder="e.g. 5000000"
                          value={sfVol?.val||""}
                          onChange={e => {
                            const v = parseFloat(e.target.value);
                            if (!isNaN(v) && v > 0) setSfVol(prev => ({dir:prev?.dir||"gt", val:v}));
                            else setSfVol(null);
                            // clear any active preset visual by resetting sfOpenFilter tracking
                          }}
                          style={{background:c.card, border:`1px solid ${c.border}`, borderRadius:"50px",
                            color:c.text, fontSize:"0.8rem", padding:"4px 14px", height:"30px",
                            width:"130px", outline:"none", fontFamily:gs}}/>
                        <span style={{fontFamily:gs, fontSize:"0.72rem", color:c.muted}}>shares / day</span>
                      </div>
                      <div style={{display:"flex", gap:"6px", flexWrap:"wrap", marginTop:"9px"}}>
                        {SF_VOL_PRESETS.map(p => (
                          <button key={p.label}
                            onClick={() => numPresetPick(setSfVol, sfVol, p.val, sfVol?.dir||"gt")}
                            style={sfOpPill(sfVol?.val===p.val)}>
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Market Cap panel */}
                  <div style={sfFoWrap(sfOpenFilter==="mc")}>
                    <div style={sfFoInner}>
                      <div style={sfFoLbl}>Market capitalisation threshold</div>
                      <div style={{display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap"}}>
                        <div style={{display:"flex", border:`1px solid ${c.border}`, borderRadius:"50px", overflow:"hidden", height:"30px", flexShrink:0}}>
                          <button onClick={() => setSfMc(v => v ? {...v,dir:"gt"} : {dir:"gt",val:0})}
                            style={{padding:"0 11px", background:(!sfMc||sfMc.dir==="gt")?c.text:"transparent",
                              color:(!sfMc||sfMc.dir==="gt")?c.bg:c.muted,
                              border:"none", fontWeight:700, cursor:"pointer", fontFamily:gs, fontSize:"0.82rem"}}>
                            &gt;
                          </button>
                          <button onClick={() => setSfMc(v => v ? {...v,dir:"lt"} : {dir:"lt",val:0})}
                            style={{padding:"0 11px", background:(sfMc?.dir==="lt")?c.text:"transparent",
                              color:(sfMc?.dir==="lt")?c.bg:c.muted,
                              border:"none", fontWeight:700, cursor:"pointer", fontFamily:gs, fontSize:"0.82rem"}}>
                            &lt;
                          </button>
                        </div>
                        <input type="number" placeholder="e.g. 10000"
                          value={sfMc?.val||""}
                          onChange={e => {
                            const v = parseFloat(e.target.value);
                            if (!isNaN(v) && v > 0) setSfMc(prev => ({dir:prev?.dir||"gt", val:v}));
                            else setSfMc(null);
                          }}
                          style={{background:c.card, border:`1px solid ${c.border}`, borderRadius:"50px",
                            color:c.text, fontSize:"0.8rem", padding:"4px 14px", height:"30px",
                            width:"130px", outline:"none", fontFamily:gs}}/>
                        <span style={{fontFamily:gs, fontSize:"0.72rem", color:c.muted}}>$M</span>
                      </div>
                      <div style={{display:"flex", gap:"6px", flexWrap:"wrap", marginTop:"9px"}}>
                        {SF_MC_PRESETS.map(p => (
                          <button key={p.label}
                            onClick={() => numPresetPick(setSfMc, sfMc, p.val, sfMc?.dir||"gt")}
                            style={sfOpPill(sfMc?.val===p.val)}>
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* P/E Ratio panel */}
                  <div style={sfFoWrap(sfOpenFilter==="pe")}>
                    <div style={sfFoInner}>
                      <div style={sfFoLbl}>Price-to-earnings range</div>
                      <div style={{display:"flex", gap:"6px", flexWrap:"wrap"}}>
                        {["Low (0–15×)","Mid (15–30×)","High (30–50×)","Premium (50×+)"].map(lbl => (
                          <button key={lbl} onClick={() => bucketPick(setSfPe, sfPe, lbl)} style={sfOpPill(sfPe===lbl)}>{lbl}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Fair Value panel */}
                  <div style={sfFoWrap(sfOpenFilter==="fv")}>
                    <div style={sfFoInner}>
                      <div style={sfFoLbl}>AI-computed fair value vs current price</div>
                      <div style={{display:"flex", gap:"6px", flexWrap:"wrap"}}>
                        {["Undervalued","Fair","Overvalued"].map(lbl => (
                          <button key={lbl} onClick={() => bucketPick(setSfFv, sfFv, lbl)} style={sfOpPill(sfFv===lbl)}>{lbl}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Gross Profit Margin panel */}
                  <div style={sfFoWrap(sfOpenFilter==="gpm")}>
                    <div style={sfFoInner}>
                      <div style={sfFoLbl}>Minimum gross profit margin</div>
                      <div style={{display:"flex", gap:"6px", flexWrap:"wrap"}}>
                        {[">40%",">60%",">75%",">90%"].map(lbl => (
                          <button key={lbl} onClick={() => bucketPick(setSfGpm, sfGpm, lbl)} style={sfOpPill(sfGpm===lbl)}>{lbl}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Revenue Growth panel */}
                  <div style={sfFoWrap(sfOpenFilter==="rev")}>
                    <div style={sfFoInner}>
                      <div style={sfFoLbl}>Year-on-year revenue growth (minimum)</div>
                      <div style={{display:"flex", gap:"6px", flexWrap:"wrap"}}>
                        {[">10%",">25%",">50%",">100%"].map(lbl => (
                          <button key={lbl} onClick={() => bucketPick(setSfRev, sfRev, lbl)} style={sfOpPill(sfRev===lbl)}>{lbl}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Dividend Streak panel */}
                  <div style={sfFoWrap(sfOpenFilter==="ds")}>
                    <div style={sfFoInner}>
                      <div style={sfFoLbl}>Minimum consecutive years of dividends paid</div>
                      <div style={{display:"flex", gap:"6px", flexWrap:"wrap"}}>
                        {[
                          {label:">5 years",  val:">5 yrs"},
                          {label:">10 years", val:">10 yrs"},
                          {label:">25 years", val:">25 yrs", sub:"Aristocrat"},
                          {label:">50 years", val:">50 yrs", sub:"King"},
                        ].map(opt => (
                          <button key={opt.val} onClick={() => bucketPick(setSfDs, sfDs, opt.val)}
                            style={{...sfOpPill(sfDs===opt.val), display:"inline-flex", alignItems:"center", gap:"5px"}}>
                            {opt.label}
                            {opt.sub && <span style={{fontSize:"0.61rem", opacity:0.65, fontWeight:500}}>{opt.sub}</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          );
        })()}

        {/* Sort row */}
        {(() => {
          const sortOptions = [
            {k:"score",    label:"AI Score"},
            {k:"price",    label:"Price"},
            {k:"chg",      label:"24h Change"},
            {k:"mktCap",   label:"Market Cap"},
            {k:"momentum", label:"Momentum"},
            {k:"upside",   label:"Upside", ultimateOnly:true},
          ];
          const sortPillStyle = (isActive) => ({
            borderRadius:"50px", padding:"5px 13px",
            fontFamily:gs, fontSize:"0.72rem", fontWeight:600,
            cursor:"pointer",
            border:`1px solid ${isActive ? c.text : c.border}`,
            background: isActive ? c.text : "transparent",
            color: isActive ? c.bg : c.muted,
            transition:"all 0.15s", whiteSpace:"nowrap",
            display:"inline-flex", alignItems:"center", gap:"5px",
          });
          return (
            <div style={{display:"flex", alignItems:"center", gap:"8px", marginBottom:"0.75rem", flexWrap:"wrap"}}>
              <span style={{fontFamily:gs, fontSize:"0.67rem", color:c.muted, letterSpacing:"0.08em", textTransform:"uppercase", fontWeight:500}}>Sort by</span>
              {sortOptions.map(opt => {
                const isActive = sortKey === opt.k;
                const isLocked = opt.ultimateOnly && userPlan !== "ultimate";
                return (
                  <div key={opt.k} style={{position:"relative", display:"inline-flex", alignItems:"center", gap:"4px"}}>
                    <button
                      onClick={() => { if (!isLocked) toggleSort(opt.k); }}
                      style={{...sortPillStyle(isActive), opacity:isLocked?0.45:1, cursor:isLocked?"default":"pointer"}}>
                      {opt.label}
                      {isActive && (sortDir==="asc" ? " ↑" : " ↓")}
                    </button>
                    {isLocked && (
                      <div style={{position:"relative"}}>
                        <svg width="12" height="12" viewBox="0 0 512 512" fill={c.muted} style={{cursor:"default", opacity:0.5}}
                          onMouseEnter={e => e.currentTarget.nextSibling.style.opacity="1"}
                          onMouseLeave={e => e.currentTarget.nextSibling.style.opacity="0"}>
                          <path d="M256 32a224 224 0 1 1 0 448A224 224 0 1 1 256 32zm0 480a256 256 0 1 0 0-512 256 256 0 1 0 0 512zM208 352c-8.8 0-16 7.2-16 16s7.2 16 16 16l96 0c8.8 0 16-7.2 16-16s-7.2-16-16-16l-32 0 0-112c0-8.8-7.2-16-16-16l-48 0c-8.8 0-16 7.2-16 16s7.2 16 16 16l32 0 0 96-32 0zm48-168a24 24 0 1 0 0-48 24 24 0 1 0 0 48z"/>
                        </svg>
                        <div style={{
                          position:"absolute", bottom:"calc(100% + 8px)", left:"50%", transform:"translateX(-50%)",
                          background:c.card, border:`1px solid ${c.borderHi}`, borderRadius:"8px",
                          padding:"9px 12px", width:"210px", fontFamily:gs, fontSize:"0.71rem",
                          color:c.muted, lineHeight:1.55, zIndex:30, opacity:0,
                          pointerEvents:"none", transition:"opacity 0.18s", whiteSpace:"normal",
                        }}>
                          <strong style={{color:c.text, fontWeight:600}}>Ultimate feature.</strong> Sorts by Graham Number upside: estimated intrinsic value vs current price as a percentage gap.
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* Result count */}
        <div style={{ fontFamily:gs, fontSize:"0.74rem", color:c.muted, marginBottom:"0.75rem" }}>
          {sfAnyActive
            ? `${filtered.length} stock${filtered.length !== 1 ? "s" : ""} matched · Smart Filters active`
            : `${filtered.length} instrument${filtered.length !== 1 ? "s" : ""} · tap any row to view details`}
        </div>

        {/* Table */}
        <div style={{ overflowX:"auto", borderRadius:"14px", border:`1px solid ${c.border}` }}>
          <table style={{ borderCollapse:"collapse", width:"100%", minWidth:"900px" }}>
            <thead>
              <tr style={{ background:c.surface }}>
                <Th k="ticker" label="Ticker"   align="left"/>
                <Th k="name"   label="Company"  align="left"/>
                <Th k="type"   label="Type"     align="left"/>
                <Th k="market" label="Market"   align="left"/>
                <Th k="sector" label="Sector"   align="left"/>
                <Th k="mktCap" label="Mkt Cap"/>
                <Th k="price"  label="Price"/>
                <Th k="chg"    label="24h"/>
                <th style={{ fontFamily:gs, fontSize:"0.6rem", color:c.muted, letterSpacing:"0.07em",
                  textTransform:"uppercase", fontWeight:500, padding:"8px 10px", textAlign:"right",
                  borderBottom:`1px solid ${c.border}`, whiteSpace:"nowrap" }}>
                  Upside
                </th>
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
                      <div style={{ fontFamily:gs, fontSize:"0.82rem", color:c.muted, maxWidth:"160px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.name}</div>
                    </td>

                    {/* Type */}
                    <td onClick={() => setSelected(s)} style={{ padding:"10px", borderBottom:`1px solid ${c.border}` }}>
                      {(() => { const tc = TYPE_COLOR(s.type||"stock", c); return (
                        <span style={{fontFamily:gs,fontSize:"0.68rem",fontWeight:600,
                          background:tc.bg,border:`1px solid ${tc.border}`,color:tc.text,
                          borderRadius:"6px",padding:"2px 6px",whiteSpace:"nowrap"}}>
                          {TYPE_LABEL[s.type||"stock"]}
                        </span>
                      ); })()}
                    </td>

                    {/* Market */}
                    <td onClick={() => setSelected(s)} style={{ padding:"10px", borderBottom:`1px solid ${c.border}` }}>
                      <span style={{ fontFamily:gs, fontSize:"0.7rem", fontWeight:600, color:c.blue,
                        background:c.blueDim, border:`1px solid ${c.blue}30`, borderRadius:"6px", padding:"2px 6px" }}>
                        {s.market}
                      </span>
                    </td>

                    {/* Sector */}
                    <td onClick={() => setSelected(s)} style={{ padding:"10px", borderBottom:`1px solid ${c.border}` }}>
                      <span style={{ fontFamily:gs, fontSize:"0.72rem", color:c.muted, whiteSpace:"nowrap" }}>
                        {s.sector}
                      </span>
                    </td>

                    {/* Market cap */}
                    <td onClick={() => setSelected(s)} style={{ padding:"10px", borderBottom:`1px solid ${c.border}`, textAlign:"right", fontFamily:gs, fontSize:"0.82rem", color:c.muted }}>
                      {s.mktCap}
                    </td>

                    {/* Price */}
                    <td onClick={() => setSelected(s)} style={{ padding:"10px", borderBottom:`1px solid ${c.border}`, textAlign:"right" }}>
                      <div style={{ fontFamily:gs, fontSize:"0.88rem", fontWeight:600, color:c.text }}>
                        {s.type==="commodity"||s.type==="index" ? "" : "$"}{s.price.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}
                      </div>
                    </td>

                    {/* 24h change */}
                    <td onClick={() => setSelected(s)} style={{ padding:"10px", borderBottom:`1px solid ${c.border}`, textAlign:"right" }}>
                      <span style={{ fontFamily:gs, fontSize:"0.82rem", fontWeight:700, color:pos?c.green:c.red }}>
                        {pos?"+":""}{s.chg.toFixed(2)}%
                      </span>
                    </td>

                    {/* Upside — Graham Number, Ultimate only */}
                    <td onClick={() => setSelected(s)} style={{ padding:"10px", borderBottom:`1px solid ${c.border}`, textAlign:"right" }}>
                      {userPlan !== "ultimate" ? (
                        <svg width="11" height="11" viewBox="0 0 448 512" fill={c.muted} style={{opacity:0.35}}>
                          <path d="M144 144v48h160v-48c0-44.2-35.8-80-80-80s-80 35.8-80 80zM80 192v-48C80 64.5 144.5 0 224 0s144 64.5 144 144v48h16c35.3 0 64 28.7 64 64v192c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V256c0-35.3 28.7-64 64-64H80z"/>
                        </svg>
                      ) : (() => {
                        const up = (s.type==="stock" && s.eps && s.bvps)
                          ? grahamUpside(s.eps, s.bvps, s.price) : null;
                        if (up === null) return <span style={{color:c.border}}>—</span>;
                        const n = parseFloat(up);
                        const col = n >= 10 ? c.green : n <= -10 ? c.red : c.muted;
                        return <span style={{fontFamily:gs,fontSize:"0.82rem",fontWeight:700,color:col}}>{n>0?"+":""}{up}%</span>;
                      })()}
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
                            borderRadius:"4px", width:"28px", height:"28px",
                            cursor:"pointer", color:inWL ? c.green : c.muted,
                            display:"flex", alignItems:"center", justifyContent:"center",
                            transition:"opacity 0.15s ease", flexShrink:0,
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
                              borderRadius:"4px", height:"28px", padding:"0 8px",
                              cursor:"pointer", color:c.muted,
                              display:"flex", alignItems:"center", gap:"4px",
                              transition:"opacity 0.15s ease", flexShrink:0,
                            }}>
                            <IconPieChart size={13}/>
                            <IconChevronDown size={10}/>
                          </button>
                          {openPortRow === s.ticker && (
                            <div style={{
                              position:"absolute", top:"calc(100% + 5px)", right:0,
                              background:c.card, border:`1px solid ${c.borderHi}`,
                              borderRadius:"8px", overflow:"hidden", zIndex:50,
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
          onViewFullAnalysis={() => router.push(`/dashboard/analysis/${selected.ticker}?type=${selected.type||"stock"}`)}
        />
      )}
    </div>
  );
}