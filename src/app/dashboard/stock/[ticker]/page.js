"use client";
import { use, useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/lib/theme";
import { createClient } from "@/lib/supabase";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Cell,
} from "recharts";

// ─── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  dark:  { bg:"#090909", card:"#111113", surface:"#141416", border:"#232325", borderHi:"#333336", text:"#F0F0F0", muted:"#7A7A80", green:"#00E676", greenDim:"rgba(0,230,118,0.10)", blue:"#4488FF", blueDim:"rgba(68,136,255,0.12)", red:"#FF1800", redDim:"rgba(255,24,0,0.10)", amber:"#F59E0B" },
  light: { bg:"#F7F7F5", card:"#FFFFFF",  surface:"#EEEEED", border:"#DEDEDD",  borderHi:"#BABAB8", text:"#0A0A0A", muted:"#606065", green:"#008A38", greenDim:"rgba(0,138,56,0.09)", blue:"#1E55CC", blueDim:"rgba(30,85,204,0.09)", red:"#CC0000", redDim:"rgba(204,0,0,0.10)", amber:"#B45309" },
};
const gs = "'Google Sans Flex','DM Sans',sans-serif";

// ─── Market status ─────────────────────────────────────────────────────────────
const HOURS = {
  US: { open:[870,1260], pre:[840,870],  label:"NYSE / NASDAQ" },
  UK: { open:[480,990],  pre:[450,480],  label:"London SE"     },
  EU: { open:[480,1050], pre:[450,480],  label:"Various EU"    },
};
function getStatus(exchange) {
  const mk = exchange?.includes("NASDAQ")||exchange?.includes("NYSE") ? "US"
           : exchange?.includes("LSE") ? "UK" : "US";
  const h = HOURS[mk];
  const now = new Date();
  if ([0,6].includes(now.getUTCDay())) return { label:"Weekend", col:"muted", mk };
  const t = now.getUTCHours()*60+now.getUTCMinutes();
  if (t>=h.open[0]&&t<h.open[1]) return { label:"Open",       col:"green", mk };
  if (t>=h.pre[0] &&t<h.pre[1] ) return { label:"Pre-Market", col:"amber", mk };
  return { label:"Closed", col:"red", mk };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function fmt(v, decimals=2) { return v!=null ? (+v).toFixed(decimals) : "—"; }
function fmtLarge(v) {
  if (v==null) return "—";
  const n = +v;
  if (n>=1e12) return `$${(n/1e12).toFixed(2)}T`;
  if (n>=1e9)  return `$${(n/1e9).toFixed(2)}B`;
  if (n>=1e6)  return `$${(n/1e6).toFixed(2)}M`;
  return `$${n.toLocaleString()}`;
}
function fmtVol(v) {
  if (v==null) return "—";
  const n=+v;
  if (n>=1e9) return `${(n/1e9).toFixed(1)}B`;
  if (n>=1e6) return `${(n/1e6).toFixed(0)}M`;
  if (n>=1e3) return `${(n/1e3).toFixed(0)}K`;
  return String(n);
}
function fmtDate(d) {
  if (!d) return "";
  const [y,m,day] = d.split("-");
  return `${day}/${m}/${y.slice(2)}`;
}

// ─── Range bar ─────────────────────────────────────────────────────────────────
function RangeBar({ low, high, current, label, c }) {
  const pct = low!=null&&high!=null&&high>low ? Math.min(100,Math.max(0,((current-low)/(high-low))*100)) : 50;
  return (
    <div style={{ background:c.card, border:`1px solid ${c.border}`, borderRadius:"10px", padding:"1rem" }}>
      <p style={{ fontFamily:gs, fontSize:"0.62rem", color:c.muted, letterSpacing:"0.09em", textTransform:"uppercase", marginBottom:"0.5rem", fontWeight:600 }}>{label}</p>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"6px" }}>
        <span style={{ fontFamily:gs, fontSize:"0.78rem", color:c.red,  fontWeight:600 }}>{low  !=null?`$${fmt(low)}`:"—"}</span>
        <span style={{ fontFamily:gs, fontSize:"0.78rem", color:c.green,fontWeight:600 }}>{high !=null?`$${fmt(high)}`:"—"}</span>
      </div>
      <div style={{ position:"relative", height:"6px", background:c.surface, borderRadius:"3px", overflow:"visible" }}>
        <div style={{ position:"absolute", left:0, width:`${pct}%`, height:"100%", background:`linear-gradient(90deg,${c.red},${c.green})`, borderRadius:"3px" }}/>
        <div style={{ position:"absolute", top:"-4px", left:`calc(${pct}% - 5px)`, width:"10px", height:"14px", background:c.text, borderRadius:"2px", border:`1px solid ${c.bg}` }}/>
      </div>
      <p style={{ fontFamily:gs, fontSize:"0.74rem", color:c.text, textAlign:"center", marginTop:"8px", fontWeight:600 }}>
        {current!=null?`$${fmt(current)}`:"—"}
      </p>
    </div>
  );
}

// ─── AI Score circle ───────────────────────────────────────────────────────────
function ScoreCircle({ score, c, size=80 }) {
  const sc = score==null ? c.muted : score>=80?c.green:score>=65?c.text:c.red;
  const r=(size-8)/2, cx=size/2, cy=size/2, circ=2*Math.PI*r;
  const offset = score!=null ? circ*(1-score/100) : circ;
  return (
    <div style={{ position:"relative", width:size, height:size }}>
      <div style={{ position:"absolute", inset:"8px", borderRadius:"50%", background:score!=null?`radial-gradient(circle,${sc}25 0%,transparent 70%)`:"none", filter:"blur(6px)" }}/>
      <svg width={size} height={size} style={{ position:"absolute", top:0, left:0, transform:"rotate(-90deg)" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={c.border} strokeWidth="4"/>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={sc} strokeWidth="4" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"/>
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
        <span style={{ fontFamily:gs, fontSize:"1.15rem", fontWeight:800, color:sc, lineHeight:1 }}>{score!=null?score:"—"}</span>
        <span style={{ fontFamily:gs, fontSize:"0.5rem", color:c.muted, letterSpacing:"0.06em", textTransform:"uppercase", marginTop:"2px" }}>AI Score</span>
      </div>
    </div>
  );
}

// ─── Dividend Gauge (speedometer) ──────────────────────────────────────────────
function Gauge({ score, label, sublabel, c }) {
  // SVG layout: viewBox 0 0 200 128, center (100,108), radius 80
  const cx=100, cy=108, r=80, needleR=68;

  const col = score >= 70 ? c.green : score >= 40 ? c.amber : c.red;
  const statusLabel = score >= 70 ? "STRONG" : score >= 40 ? "MODERATE" : "WEAK";

  // Zone boundary points (33% and 67%)
  const z1a = Math.PI * 0.67;
  const z2a = Math.PI * 0.33;
  const z1x = +(cx + r * Math.cos(z1a)).toFixed(1);
  const z1y = +(cy - r * Math.sin(z1a)).toFixed(1);
  const z2x = +(cx + r * Math.cos(z2a)).toFixed(1);
  const z2y = +(cy - r * Math.sin(z2a)).toFixed(1);

  // Filled arc for this score
  const angle = Math.PI * (1 - score / 100);
  const ex = +(cx + r * Math.cos(angle)).toFixed(1);
  const ey = +(cy - r * Math.sin(angle)).toFixed(1);
  const la = score > 50 ? 1 : 0;

  // Needle
  const nx = +(cx + needleR * Math.cos(angle)).toFixed(1);
  const ny = +(cy - needleR * Math.sin(angle)).toFixed(1);

  return (
    <div style={{ textAlign:"center" }}>
      <svg width="200" height="128" viewBox="0 0 200 128" style={{ overflow:"visible" }}>
        {/* Background zones: red / amber / green */}
        <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${z1x} ${z1y}`}
          fill="none" stroke={`${c.red}28`} strokeWidth="14" strokeLinecap="butt"/>
        <path d={`M ${z1x} ${z1y} A ${r} ${r} 0 0 1 ${z2x} ${z2y}`}
          fill="none" stroke={`${c.amber}28`} strokeWidth="14" strokeLinecap="butt"/>
        <path d={`M ${z2x} ${z2y} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`}
          fill="none" stroke={`${c.green}28`} strokeWidth="14" strokeLinecap="butt"/>

        {/* Glow layer */}
        {score > 0 && (
          <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 ${la} 1 ${ex} ${ey}`}
            fill="none" stroke={col} strokeWidth="22" strokeLinecap="round" opacity="0.10"/>
        )}
        {/* Filled arc */}
        {score > 0 && (
          <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 ${la} 1 ${ex} ${ey}`}
            fill="none" stroke={col} strokeWidth="14" strokeLinecap="round"/>
        )}

        {/* Zone divider ticks */}
        <line x1={z1x} y1={z1y}
          x2={+(cx + (r-10)*Math.cos(z1a)).toFixed(1)}
          y2={+(cy - (r-10)*Math.sin(z1a)).toFixed(1)}
          stroke={c.border} strokeWidth="2"/>
        <line x1={z2x} y1={z2y}
          x2={+(cx + (r-10)*Math.cos(z2a)).toFixed(1)}
          y2={+(cy - (r-10)*Math.sin(z2a)).toFixed(1)}
          stroke={c.border} strokeWidth="2"/>

        {/* Needle shadow */}
        <line x1={cx+2} y1={cy+2} x2={+(nx+2).toFixed(1)} y2={+(ny+2).toFixed(1)}
          stroke="rgba(0,0,0,0.20)" strokeWidth="3" strokeLinecap="round"/>
        {/* Needle */}
        <line x1={cx} y1={cy} x2={nx} y2={ny}
          stroke={col} strokeWidth="2.5" strokeLinecap="round"/>

        {/* Hub rings */}
        <circle cx={cx} cy={cy} r="9" fill={c.card} stroke={c.border} strokeWidth="1.5"/>
        <circle cx={cx} cy={cy} r="4" fill={col}/>

        {/* Score number */}
        <text x={cx} y={cy-28} textAnchor="middle"
          fontFamily={gs} fontSize="26" fontWeight="800" fill={col}>{score}</text>
        <text x={cx} y={cy-12} textAnchor="middle"
          fontFamily={gs} fontSize="9" fill={c.muted}>/100</text>

        {/* Status label */}
        <text x={cx} y={cy+20} textAnchor="middle"
          fontFamily={gs} fontSize="8.5" fontWeight="700" fill={col} letterSpacing="0.08em">
          {statusLabel}
        </text>

        {/* Edge labels */}
        <text x={cx-r-2} y={cy+14} textAnchor="end"
          fontFamily={gs} fontSize="8" fill={c.red} opacity="0.65">LOW</text>
        <text x={cx+r+2} y={cy+14} textAnchor="start"
          fontFamily={gs} fontSize="8" fill={c.green} opacity="0.65">HIGH</text>
      </svg>
      <p style={{ fontFamily:gs, fontSize:"0.82rem", fontWeight:700, color:c.text, marginTop:"0.25rem" }}>{label}</p>
      {sublabel && <p style={{ fontFamily:gs, fontSize:"0.68rem", color:c.muted, marginTop:"2px" }}>{sublabel}</p>}
    </div>
  );
}

// ─── Stat row ──────────────────────────────────────────────────────────────────
function StatRow({ label, value, color, c }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 0", borderBottom:`1px solid ${c.border}` }}>
      <span style={{ fontFamily:gs, fontSize:"0.82rem", color:c.muted }}>{label}</span>
      <span style={{ fontFamily:gs, fontSize:"0.84rem", fontWeight:600, color:color||c.text }}>{value||"—"}</span>
    </div>
  );
}

// ─── Factor row (for safety/growth breakdowns) ─────────────────────────────────
function FactorRow({ label, value, status, c }) {
  const col = status==="good" ? c.green : status==="bad" ? c.red : c.muted;
  const icon = status==="good" ? "●" : status==="bad" ? "●" : "●";
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 0", borderBottom:`1px solid ${c.border}` }}>
      <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
        <span style={{ color:col, fontSize:"0.5rem" }}>{icon}</span>
        <span style={{ fontFamily:gs, fontSize:"0.82rem", color:c.muted }}>{label}</span>
      </div>
      <span style={{ fontFamily:gs, fontSize:"0.82rem", fontWeight:600, color:col }}>{value}</span>
    </div>
  );
}

// ─── Chart tooltip ──────────────────────────────────────────────────────────────
function ChartTip({ active, payload, c }) {
  if (!active||!payload?.length) return null;
  return (
    <div style={{ background:c.card, border:`1px solid ${c.borderHi}`, borderRadius:"6px", padding:"8px 12px" }}>
      <div style={{ fontFamily:gs, fontSize:"0.72rem", color:c.muted, marginBottom:"3px" }}>{fmtDate(payload[0]?.payload?.date)}</div>
      <div style={{ fontFamily:gs, fontSize:"0.88rem", fontWeight:700, color:c.text }}>${fmt(payload[0]?.value)}</div>
    </div>
  );
}

function DivTip({ active, payload, c }) {
  if (!active||!payload?.length) return null;
  return (
    <div style={{ background:c.card, border:`1px solid ${c.borderHi}`, borderRadius:"6px", padding:"8px 12px" }}>
      <div style={{ fontFamily:gs, fontSize:"0.72rem", color:c.muted, marginBottom:"2px" }}>{payload[0]?.payload?.year}</div>
      <div style={{ fontFamily:gs, fontSize:"0.88rem", fontWeight:700, color:c.green }}>${fmt(payload[0]?.value,4)} DPS</div>
    </div>
  );
}

// ─── Skeleton block ─────────────────────────────────────────────────────────────
function Sk({ w="100%", h="16px", c, radius="4px" }) {
  return <div style={{ width:w, height:h, background:c.surface, borderRadius:radius, animation:"pulse 1.4s ease infinite" }}/>;
}

// ─── STAT TABS config ─────────────────────────────────────────────────────────
const STAT_TABS = [
  { id:"general",      label:"General"      },
  { id:"valuation",    label:"Valuation"    },
  { id:"profitability",label:"Profitability"},
  { id:"liquidity",    label:"Liquidity"    },
  { id:"leverage",     label:"Leverage"     },
  { id:"pershare",     label:"Per Share"    },
  { id:"growth",       label:"Growth"       },
  { id:"dividends",    label:"💰 Dividends" },
];

const TIME_RANGES = ["1W","1M","3M","6M","1Y"];
const DAYS = { "1W":7, "1M":30, "3M":90, "6M":180, "1Y":365 };

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function StockPage({ params }) {
  const { ticker } = use(params);
  const { mode } = useTheme();
  const c = C[mode];
  const router = useRouter();
  const supabase = createClient();

  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [timeRange, setTimeRange] = useState("3M");
  const [statTab,   setStatTab]   = useState("general");
  const [scrolled,  setScrolled]  = useState(false);
  const [userPlan,  setUserPlan]  = useState(null);

  // AI analysis state
  const [analysis,  setAnalysis]  = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError,   setAiError]   = useState(null);
  const [aiType,    setAiType]    = useState("summary");

  // Watchlist state
  const [inWatchlist, setInWatchlist] = useState(false);
  const [wlToken,     setWlToken]     = useState(null);
  const [wlLoading,   setWlLoading]   = useState(false);

  // Dividends state
  const [divData,    setDivData]    = useState(null);
  const [divLoading, setDivLoading] = useState(false);
  const [divError,   setDivError]   = useState(null);
  const [projAmount, setProjAmount] = useState(10000);

  // Session + watchlist + plan
  useEffect(() => {
    supabase.auth.getSession().then(({ data:{ session } }) => {
      if (!session) return;
      setWlToken(session.access_token);
      // Watchlist check
      fetch("/api/watchlist", { headers:{ Authorization:`Bearer ${session.access_token}` } })
        .then(r => r.json())
        .then(d => setInWatchlist((d.stocks||[]).some(s => s.ticker === ticker)))
        .catch(() => {});
      // User plan
      supabase.from("users").select("plan").eq("id", session.user.id).single()
        .then(({ data:u }) => setUserPlan(u?.plan || "essential"))
        .catch(() => setUserPlan("essential"));
    });
  }, [ticker]);

  // Fetch dividends when tab selected
  useEffect(() => {
    if (statTab !== "dividends" || divData || divLoading) return;
    setDivLoading(true); setDivError(null);
    fetch(`/api/dividends/${ticker}`)
      .then(r => r.json())
      .then(d => { setDivData(d); setDivLoading(false); })
      .catch(e => { setDivError(e.message); setDivLoading(false); });
  }, [statTab, ticker, divData, divLoading]);

  const toggleWatchlist = useCallback(async () => {
    if (!wlToken) return;
    setWlLoading(true);
    const wasIn = inWatchlist;
    setInWatchlist(!wasIn);
    if (wasIn) {
      await fetch(`/api/watchlist?ticker=${ticker}`, { method:"DELETE", headers:{ Authorization:`Bearer ${wlToken}` } });
    } else {
      await fetch("/api/watchlist", {
        method:"POST",
        headers:{ "Content-Type":"application/json", Authorization:`Bearer ${wlToken}` },
        body: JSON.stringify({ ticker, name:data?.profile?.companyName||ticker, sector:data?.profile?.sector||"Other", market:"US" }),
      });
    }
    setWlLoading(false);
  }, [inWatchlist, wlToken, ticker, data]);

  const generateAnalysis = useCallback(async (type = "summary") => {
    setAiLoading(true); setAiError(null); setAiType(type);
    try {
      const { data:{ session } } = await supabase.auth.getSession();
      if (!session) { setAiError("Please log in to generate analysis."); return; }
      const res = await fetch("/api/analyse", {
        method:"POST",
        headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${session.access_token}` },
        body: JSON.stringify({ ticker, type }),
      });
      const result = await res.json();
      if (!res.ok) { setAiError(result.error || "Analysis failed."); return; }
      setAnalysis(result);
    } catch (err) {
      setAiError(err.message);
    } finally {
      setAiLoading(false);
    }
  }, [ticker, supabase]);

  useEffect(() => {
    fetch(`/api/stock/${ticker}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [ticker]);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", h, { passive:true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  const q = data?.quote;
  const p = data?.profile;
  const m = data?.metrics;
  const r = data?.ratios;

  const status    = useMemo(() => getStatus(q?.exchange || p?.exchangeShortName), [q, p]);
  const chartData = useMemo(() => {
    if (!data?.chart?.length) return [];
    const cutoff = new Date(Date.now() - DAYS[timeRange]*864e5).toISOString().slice(0,10);
    return data.chart.filter(d => d.date >= cutoff);
  }, [data, timeRange]);
  const chartMin = useMemo(() => chartData.length ? Math.min(...chartData.map(d=>d.price))*0.99 : undefined, [chartData]);
  const chartMax = useMemo(() => chartData.length ? Math.max(...chartData.map(d=>d.price))*1.01 : undefined, [chartData]);

  const price     = q?.price ?? p?.price;
  const change    = q?.change;
  const changePct = q?.changesPercentage;
  const positive  = (changePct??0) >= 0;
  const stColor   = c[status.col] || c.muted;
  const aiScore   = analysis?.score   ?? null;
  const aiVerdict = analysis?.verdict ?? null;

  const pill = (active) => ({
    background:active?c.text:"transparent", color:active?c.bg:c.muted,
    border:`1px solid ${active?c.text:c.border}`,
    borderRadius:"4px", padding:"5px 12px",
    fontFamily:gs, fontSize:"0.72rem", fontWeight:600,
    cursor:"pointer", transition:"all 0.18s", whiteSpace:"nowrap",
  });
  const tabBtn = (active) => ({
    background:"none", border:"none", cursor:"pointer",
    fontFamily:gs, fontSize:"0.76rem", fontWeight:active?600:400,
    color:active?c.text:c.muted,
    borderBottom:`2px solid ${active?c.text:"transparent"}`,
    padding:"6px 2px", paddingBottom:"8px", marginBottom:"-1px",
    transition:"all 0.18s", whiteSpace:"nowrap",
  });

  // Dividends tab content
  const isUltimate = userPlan === "ultimate";
  const annualIncome  = divData?.dividendYield && projAmount ? projAmount * divData.dividendYield : null;
  const monthlyIncome = annualIncome ? annualIncome / 12 : null;

  return (
    <div style={{ background:c.bg, minHeight:"100vh", fontFamily:gs, color:c.text }}>
      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.45}}
        * { box-sizing:border-box; }
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-thumb{background:#303032;border-radius:2px;}
        .tabs-row{display:flex;gap:0.5rem;overflow-x:auto;border-bottom:1px solid ${c.border};-ms-overflow-style:none;scrollbar-width:none;}
        .tabs-row::-webkit-scrollbar{display:none;}
      `}</style>

      {/* ── Sticky sub-header ── */}
      <div style={{
        position:"sticky", top:"58px", zIndex:100,
        background:mode==="dark"?(scrolled?"rgba(9,9,9,0.97)":"rgba(9,9,9,0.7)"):(scrolled?"rgba(247,247,245,0.97)":"rgba(247,247,245,0.7)"),
        backdropFilter:"blur(12px)",
        borderBottom:`1px solid ${scrolled?c.border:"transparent"}`,
        padding:"0 2rem", height:"52px",
        display:"flex", alignItems:"center", gap:"1.25rem",
        transition:"background 0.3s,border-color 0.3s",
      }}>
        <button onClick={() => router.back()}
          style={{ background:c.surface, border:`1px solid ${c.border}`, borderRadius:"6px", padding:"5px 12px", cursor:"pointer", color:c.muted, fontFamily:gs, fontSize:"0.78rem", display:"flex", alignItems:"center", gap:"4px", flexShrink:0 }}>
          ← Discovery
        </button>
        <span style={{ fontFamily:gs, fontSize:"1rem", fontWeight:700, color:c.text }}>{ticker}</span>
        {price!=null && <span style={{ fontFamily:gs, fontSize:"0.9rem", fontWeight:600, color:c.text }}>${fmt(price)}</span>}
        {changePct!=null && (
          <span style={{ fontFamily:gs, fontSize:"0.82rem", fontWeight:600, color:positive?c.green:c.red }}>
            {positive?"▲":"▼"} {Math.abs(changePct).toFixed(2)}%
          </span>
        )}
        <span style={{ fontFamily:gs, fontSize:"0.62rem", fontWeight:700, color:stColor, background:`${stColor}18`, border:`1px solid ${stColor}40`, borderRadius:"4px", padding:"2px 7px", letterSpacing:"0.05em", textTransform:"uppercase" }}>
          {status.label}
        </span>
        <button onClick={toggleWatchlist} disabled={wlLoading}
          style={{ background:inWatchlist?c.greenDim:"transparent", border:`1px solid ${inWatchlist?c.green+"50":c.border}`, borderRadius:"6px", padding:"5px 12px", cursor:"pointer", color:inWatchlist?c.green:c.muted, fontFamily:gs, fontSize:"0.8rem", display:"flex", alignItems:"center", gap:"5px", transition:"all 0.2s", marginLeft:"auto" }}>
          <span style={{ fontSize:"0.9rem" }}>{inWatchlist?"♥":"♡"}</span>
          <span>{inWatchlist?"Watching":"Watch"}</span>
        </button>
      </div>

      {/* ── Page content ── */}
      <div style={{ maxWidth:"1100px", margin:"0 auto", padding:"2rem 2rem 4rem" }}>

        {/* ── Hero ── */}
        <div style={{ marginBottom:"2rem" }}>
          {loading ? (
            <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
              <Sk w="200px" h="14px" c={c}/><Sk w="300px" h="32px" c={c}/><Sk w="150px" h="20px" c={c}/>
            </div>
          ) : (
            <>
              <div style={{ display:"flex", alignItems:"center", gap:"0.6rem", marginBottom:"0.4rem", flexWrap:"wrap" }}>
                <span style={{ fontFamily:gs, fontSize:"0.7rem", color:c.muted }}>{p?.exchangeShortName||q?.exchange||"—"}</span>
                {p?.isin && <span style={{ fontFamily:gs, fontSize:"0.7rem", color:c.muted }}>· ISIN: {p.isin}</span>}
                {p?.currency && <span style={{ fontFamily:gs, fontSize:"0.7rem", color:c.muted }}>· {p.currency}</span>}
              </div>
              <h1 style={{ fontFamily:gs, fontSize:"clamp(1.3rem,3vw,2rem)", fontWeight:700, color:c.text, marginBottom:"0.5rem" }}>
                {ticker} · {p?.companyName||q?.name||ticker}
              </h1>
              <div style={{ display:"flex", alignItems:"flex-end", gap:"0.75rem", flexWrap:"wrap" }}>
                <span style={{ fontFamily:gs, fontSize:"2.4rem", fontWeight:700, color:c.text, lineHeight:1 }}>
                  {price!=null?`$${fmt(price)}`:"—"}
                </span>
                {change!=null && changePct!=null && (
                  <span style={{ fontFamily:gs, fontSize:"1.1rem", fontWeight:700, color:positive?c.green:c.red, paddingBottom:"4px" }}>
                    {positive?"+":""}{fmt(change)} ({positive?"+":""}{fmt(changePct)}%) today
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Range stats ── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:"1rem", marginBottom:"2rem" }}>
          <RangeBar label="1 Day Range"   low={q?.dayLow}  high={q?.dayHigh}  current={price} c={c}/>
          <RangeBar label="52-Week Range" low={q?.yearLow} high={q?.yearHigh} current={price} c={c}/>
          <div style={{ background:c.card, border:`1px solid ${c.border}`, borderRadius:"10px", padding:"1rem" }}>
            <p style={{ fontFamily:gs, fontSize:"0.62rem", color:c.muted, letterSpacing:"0.09em", textTransform:"uppercase", marginBottom:"0.6rem", fontWeight:600 }}>Key Metrics</p>
            {loading ? [1,2,3].map(i=><Sk key={i} h="14px" c={c} w="80%"/>) : [
              ["Market Cap",    fmtLarge(q?.marketCap||p?.mktCap)],
              ["P/E Ratio",     q?.pe ? fmt(q.pe,2) : "—"],
              ["Avg Volume",    fmtVol(q?.avgVolume)],
              ["Div Yield",     r?.dividendYield ? `${(r.dividendYield*100).toFixed(2)}%` : "—"],
            ].map(([l,v])=>(
              <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"3px 0", borderBottom:`1px solid ${c.border}` }}>
                <span style={{ fontFamily:gs, fontSize:"0.75rem", color:c.muted }}>{l}</span>
                <span style={{ fontFamily:gs, fontSize:"0.77rem", fontWeight:600, color:c.text }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Price chart ── */}
        <div style={{ background:c.card, border:`1px solid ${c.border}`, borderRadius:"14px", padding:"1.5rem", marginBottom:"2rem" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem", flexWrap:"wrap", gap:"0.75rem" }}>
            <p style={{ fontFamily:gs, fontSize:"0.9rem", fontWeight:600, color:c.text }}>Price History</p>
            <div style={{ display:"flex", gap:"0.3rem" }}>
              {TIME_RANGES.map(t=>(
                <button key={t} onClick={()=>setTimeRange(t)} style={pill(timeRange===t)}>{t}</button>
              ))}
            </div>
          </div>
          {loading ? (
            <div style={{ height:"260px", background:c.surface, borderRadius:"8px", animation:"pulse 1.4s ease infinite" }}/>
          ) : chartData.length === 0 ? (
            <div style={{ height:"260px", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <p style={{ fontFamily:gs, color:c.muted, fontSize:"0.85rem" }}>Chart data requires FMP Starter plan</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top:10, right:8, bottom:0, left:4 }}>
                <defs>
                  <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={c.blue} stopOpacity={0.25}/>
                    <stop offset="95%" stopColor={c.blue} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={c.border} vertical={false}/>
                <XAxis dataKey="date" tick={{ fill:c.muted, fontSize:9, fontFamily:gs }} axisLine={false} tickLine={false}
                  tickFormatter={d=>{ const p=d.split("-"); return `${p[2]}/${p[1]}`; }}
                  interval={Math.floor(chartData.length/5)}/>
                <YAxis domain={[chartMin,chartMax]} tick={{ fill:c.muted, fontSize:9, fontFamily:gs }} axisLine={false} tickLine={false}
                  tickFormatter={v=>`$${v>=1000?(v/1000).toFixed(0)+"k":v.toFixed(0)}`} width={48}/>
                <Tooltip content={<ChartTip c={c}/>}/>
                <Area type="monotone" dataKey="price" stroke={c.blue} strokeWidth={2} fill="url(#blueGrad)" dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── AI Analysis ── */}
        <div style={{ background:c.card, border:`1px solid ${c.border}`, borderRadius:"14px", padding:"1.5rem", marginBottom:"2rem" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1rem" }}>
            <p style={{ fontFamily:gs, fontSize:"0.62rem", color:c.green, letterSpacing:"0.12em", textTransform:"uppercase", fontWeight:600 }}>AI Analysis</p>
            {analysis?.cached && (
              <span style={{ fontFamily:gs, fontSize:"0.62rem", color:c.muted, background:c.surface, border:`1px solid ${c.border}`, borderRadius:"4px", padding:"2px 8px" }}>
                Cached · refreshes in 24h
              </span>
            )}
          </div>
          <div style={{ display:"flex", gap:"1.5rem", alignItems:"flex-start", flexWrap:"wrap", marginBottom:"1.25rem" }}>
            <ScoreCircle score={aiScore} c={c} size={80}/>
            <div style={{ flex:1, minWidth:"200px" }}>
              {aiVerdict && (
                <div style={{ marginBottom:"0.75rem" }}>
                  <span style={{ fontFamily:gs, fontSize:"0.78rem", fontWeight:700,
                    color:aiVerdict==="Strong Buy"||aiVerdict==="Buy"?c.green:aiVerdict==="Sell"||aiVerdict==="Strong Sell"?c.red:c.muted,
                    background:aiVerdict==="Strong Buy"||aiVerdict==="Buy"?c.greenDim:aiVerdict==="Sell"||aiVerdict==="Strong Sell"?c.redDim:c.surface,
                    border:`1px solid ${aiVerdict==="Strong Buy"||aiVerdict==="Buy"?c.green+"50":aiVerdict==="Sell"||aiVerdict==="Strong Sell"?c.red+"50":c.border}`,
                    borderRadius:"5px", padding:"4px 12px",
                  }}>{aiVerdict}</span>
                </div>
              )}
              {analysis?.summary ? (
                <p style={{ fontFamily:gs, fontSize:"0.84rem", color:c.text, lineHeight:1.72 }}>{analysis.summary}</p>
              ) : (
                <p style={{ fontFamily:gs, fontSize:"0.84rem", color:c.muted, lineHeight:1.7 }}>
                  {aiLoading ? "Generating analysis…" : "Click below to generate an AI analysis of this stock."}
                </p>
              )}
            </div>
          </div>
          {analysis?.full_report && (
            <div style={{ borderTop:`1px solid ${c.border}`, paddingTop:"1.25rem", marginBottom:"1.25rem" }}>
              {Object.entries(analysis.full_report).map(([key, text]) => (
                <div key={key} style={{ marginBottom:"1rem" }}>
                  <p style={{ fontFamily:gs, fontSize:"0.65rem", color:c.muted, letterSpacing:"0.09em", textTransform:"uppercase", fontWeight:600, marginBottom:"4px" }}>
                    {key.charAt(0).toUpperCase()+key.slice(1)}
                  </p>
                  <p style={{ fontFamily:gs, fontSize:"0.83rem", color:c.text, lineHeight:1.7 }}>{text}</p>
                </div>
              ))}
            </div>
          )}
          {analysis?.risk_flags?.length > 0 && (
            <div style={{ borderTop:`1px solid ${c.border}`, paddingTop:"1rem", marginBottom:"1.25rem" }}>
              <p style={{ fontFamily:gs, fontSize:"0.65rem", color:c.muted, letterSpacing:"0.09em", textTransform:"uppercase", fontWeight:600, marginBottom:"0.75rem" }}>Risk Flags</p>
              <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem" }}>
                {analysis.risk_flags.map((rf, i) => {
                  const col = rf.level==="High"?c.red:rf.level==="Medium"?c.amber:c.green;
                  return (
                    <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:c.surface, borderRadius:"7px", padding:"8px 12px" }}>
                      <span style={{ fontFamily:gs, fontSize:"0.8rem", color:c.text }}>{rf.flag}</span>
                      <span style={{ fontFamily:gs, fontSize:"0.65rem", fontWeight:700, color:col, letterSpacing:"0.05em", textTransform:"uppercase", flexShrink:0, marginLeft:"0.5rem" }}>{rf.level}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {aiError && (
            <div style={{ background:c.redDim, border:`1px solid ${c.red}40`, borderRadius:"7px", padding:"10px 14px", marginBottom:"1rem" }}>
              <p style={{ fontFamily:gs, fontSize:"0.82rem", color:c.red }}>{aiError}</p>
            </div>
          )}
          <div style={{ display:"flex", gap:"0.75rem", flexWrap:"wrap" }}>
            {!analysis && (
              <button onClick={() => generateAnalysis("summary")} disabled={aiLoading}
                style={{ background:c.green, color:"#050505", border:"none", borderRadius:"6px", padding:"10px 22px", fontFamily:gs, fontSize:"0.82rem", fontWeight:700, cursor:aiLoading?"not-allowed":"pointer", opacity:aiLoading?0.65:1 }}>
                {aiLoading&&aiType==="summary" ? "Generating…" : "Generate AI Summary"}
              </button>
            )}
            {!analysis?.full_report && (
              <button onClick={() => generateAnalysis("full")} disabled={aiLoading}
                style={{ background:"transparent", color:c.text, border:`1px solid ${c.borderHi}`, borderRadius:"6px", padding:"10px 22px", fontFamily:gs, fontSize:"0.82rem", fontWeight:600, cursor:aiLoading?"not-allowed":"pointer", opacity:aiLoading?0.65:1 }}>
                {aiLoading&&aiType==="full" ? "Generating…" : analysis ? "Generate Full Report →" : "Generate Full Report"}
              </button>
            )}
            {analysis && (
              <button onClick={() => { setAnalysis(null); setAiError(null); }}
                style={{ background:"transparent", color:c.muted, border:"none", borderRadius:"6px", padding:"10px 14px", fontFamily:gs, fontSize:"0.78rem", cursor:"pointer" }}>
                Regenerate
              </button>
            )}
          </div>
        </div>

        {/* ── Stats Hub ── */}
        <div style={{ background:c.card, border:`1px solid ${c.border}`, borderRadius:"14px", padding:"1.5rem", marginBottom:"2rem" }}>
          <p style={{ fontFamily:gs, fontSize:"0.9rem", fontWeight:600, color:c.text, marginBottom:"1rem" }}>Statistics</p>
          <div className="tabs-row" style={{ marginBottom:"1.25rem" }}>
            {STAT_TABS.map(t=>(
              <button key={t.id} onClick={()=>setStatTab(t.id)} style={tabBtn(statTab===t.id)}>{t.label}</button>
            ))}
          </div>

          {loading && statTab !== "dividends" ? (
            <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
              {[1,2,3,4,5].map(i=><Sk key={i} h="32px" c={c}/>)}
            </div>
          ) : (
            <div>
              {statTab==="general" && [
                ["Market Capitalisation", fmtLarge(q?.marketCap||p?.mktCap)],
                ["Enterprise Value",      fmtLarge(m?.enterpriseValue)],
                ["Beta",                  fmt(p?.beta,2)],
                ["EPS",                   q?.eps ? `$${fmt(q.eps,2)}` : "—"],
                ["Average Volume",        fmtVol(q?.avgVolume)],
                ["Shares Outstanding",    fmtVol(q?.sharesOutstanding)],
                ["Dividend Yield",        r?.dividendYield ? `${(r.dividendYield*100).toFixed(3)}%` : "—"],
              ].map(([l,v])=><StatRow key={l} label={l} value={v} c={c}/>)}

              {statTab==="valuation" && [
                ["P/E Ratio",             q?.pe ? fmt(q.pe) : m?.peRatio ? fmt(m.peRatio) : "—"],
                ["Price to Sales (P/S)",  m?.priceToSalesRatio ? fmt(m.priceToSalesRatio) : "—"],
                ["Price to Book (P/B)",   m?.pbRatio ? fmt(m.pbRatio) : "—"],
                ["PEG Ratio",             m?.pegRatio ? fmt(m.pegRatio,3) : "—"],
                ["EV / EBITDA",           m?.evToEbitda ? fmt(m.evToEbitda) : "—"],
                ["EV / Sales",            m?.evToSales ? fmt(m.evToSales) : "—"],
                ["Price to FCF",          m?.priceToFreeCashFlowsRatio ? fmt(m.priceToFreeCashFlowsRatio) : "—"],
              ].map(([l,v])=><StatRow key={l} label={l} value={v} c={c}/>)}

              {statTab==="profitability" && [
                ["Gross Profit Margin",  r?.grossProfitMargin ? `${(r.grossProfitMargin*100).toFixed(2)}%` : "—"],
                ["Operating Margin",     r?.operatingProfitMargin ? `${(r.operatingProfitMargin*100).toFixed(2)}%` : "—"],
                ["Net Profit Margin",    r?.netProfitMargin ? `${(r.netProfitMargin*100).toFixed(2)}%` : "—"],
                ["Return on Equity",     r?.returnOnEquity ? `${(r.returnOnEquity*100).toFixed(2)}%` : "—"],
                ["Return on Assets",     r?.returnOnAssets ? `${(r.returnOnAssets*100).toFixed(2)}%` : "—"],
                ["ROIC",                 m?.roic ? `${(m.roic*100).toFixed(2)}%` : "—"],
              ].map(([l,v])=><StatRow key={l} label={l} value={v} c={c}/>)}

              {statTab==="liquidity" && [
                ["Current Ratio", r?.currentRatio ? fmt(r.currentRatio) : "—"],
                ["Quick Ratio",   r?.quickRatio   ? fmt(r.quickRatio)   : "—"],
                ["Cash Ratio",    r?.cashRatio     ? fmt(r.cashRatio)    : "—"],
              ].map(([l,v])=><StatRow key={l} label={l} value={v} c={c}/>)}

              {statTab==="leverage" && [
                ["Debt Ratio",              r?.debtRatio ? fmt(r.debtRatio,3) : "—"],
                ["Debt / Equity",           r?.debtEquityRatio ? fmt(r.debtEquityRatio,3) : "—"],
                ["Interest Coverage",       r?.interestCoverage ? fmt(r.interestCoverage) : "—"],
                ["Long-term Debt / Capital",r?.longTermDebtToCapitalization ? fmt(r.longTermDebtToCapitalization,3) : "—"],
                ["Cash Flow to Debt",       r?.cashFlowToDebtRatio ? fmt(r.cashFlowToDebtRatio) : "—"],
              ].map(([l,v])=><StatRow key={l} label={l} value={v} c={c}/>)}

              {statTab==="pershare" && [
                ["Revenue per Share",          m?.revenuePerShare ? `$${fmt(m.revenuePerShare)}` : "—"],
                ["Net Income per Share",        m?.netIncomePerShare ? `$${fmt(m.netIncomePerShare)}` : "—"],
                ["Operating CF per Share",      m?.operatingCashFlowPerShare ? `$${fmt(m.operatingCashFlowPerShare)}` : "—"],
                ["FCF per Share",               m?.freeCashFlowPerShare ? `$${fmt(m.freeCashFlowPerShare)}` : "—"],
                ["Book Value per Share",        m?.bookValuePerShare ? `$${fmt(m.bookValuePerShare)}` : "—"],
                ["Tangible Book Value / Share", m?.tangibleBookValuePerShare ? `$${fmt(m.tangibleBookValuePerShare)}` : "—"],
              ].map(([l,v])=><StatRow key={l} label={l} value={v} c={c}/>)}

              {statTab==="growth" && [
                ["Revenue Growth",          r?.revenueGrowth ? `${(r.revenueGrowth*100).toFixed(2)}%` : "—"],
                ["Gross Profit Growth",     r?.grossProfitGrowth ? `${(r.grossProfitGrowth*100).toFixed(2)}%` : "—"],
                ["EPS Growth",              r?.epsgrowth ? `${(r.epsgrowth*100).toFixed(2)}%` : "—"],
                ["Operating Income Growth", r?.operatingIncomeGrowth ? `${(r.operatingIncomeGrowth*100).toFixed(2)}%` : "—"],
                ["Net Income Growth",       r?.netIncomeGrowth ? `${(r.netIncomeGrowth*100).toFixed(2)}%` : "—"],
                ["Dividends / Share Growth",r?.dividendsperShareGrowth ? `${(r.dividendsperShareGrowth*100).toFixed(2)}%` : "—"],
              ].map(([l,v])=><StatRow key={l} label={l} value={v} c={c}/>)}

              {/* ── DIVIDENDS TAB ─────────────────────────────────────────── */}
              {statTab==="dividends" && (
                <>
                  {/* Ultimate gate */}
                  {userPlan !== null && !isUltimate ? (
                    <div style={{ textAlign:"center", padding:"3rem 1rem" }}>
                      <div style={{ fontSize:"2rem", marginBottom:"1rem" }}>💰</div>
                      <p style={{ fontFamily:gs, fontSize:"1rem", fontWeight:700, color:c.text, marginBottom:"0.5rem" }}>
                        Dividend Intelligence
                      </p>
                      <p style={{ fontFamily:gs, fontSize:"0.84rem", color:c.muted, marginBottom:"1.5rem", maxWidth:"320px", margin:"0 auto 1.5rem", lineHeight:1.65 }}>
                        Safety scores, growth gauges, dividend history and income projector are exclusive to the Ultimate plan.
                      </p>
                      <button onClick={() => router.push("/dashboard/account")}
                        style={{ background:c.text, color:c.bg, border:"none", borderRadius:"6px", padding:"11px 28px", fontFamily:gs, fontSize:"0.84rem", fontWeight:700, cursor:"pointer" }}>
                        Upgrade to Ultimate →
                      </button>
                    </div>
                  ) : divLoading ? (
                    <div style={{ display:"flex", flexDirection:"column", gap:"12px", paddingTop:"0.5rem" }}>
                      {[1,2,3,4].map(i=><Sk key={i} h="36px" c={c}/>)}
                    </div>
                  ) : divError ? (
                    <p style={{ fontFamily:gs, color:c.red, fontSize:"0.84rem" }}>Failed to load dividend data: {divError}</p>
                  ) : divData ? (
                    <>
                      {/* ── Two gauges ── */}
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem", marginBottom:"1.5rem", justifyItems:"center" }}>
                        <div style={{ width:"100%", display:"flex", justifyContent:"center", background:c.surface, borderRadius:"12px", padding:"1.25rem 0.5rem" }}>
                          <Gauge
                            score={divData.safetyScore}
                            label="Dividend Safety"
                            sublabel="Sustainability of current payout"
                            c={c}
                          />
                        </div>
                        <div style={{ width:"100%", display:"flex", justifyContent:"center", background:c.surface, borderRadius:"12px", padding:"1.25rem 0.5rem" }}>
                          <Gauge
                            score={divData.growthScore}
                            label="Dividend Growth"
                            sublabel="Likelihood of future increases"
                            c={c}
                          />
                        </div>
                      </div>

                      {divData.mock && (
                        <div style={{ background:mode==="dark"?"rgba(244,162,0,0.08)":"rgba(180,83,9,0.06)", border:`1px solid ${c.amber}35`, borderRadius:"7px", padding:"8px 12px", marginBottom:"1.25rem", display:"flex", gap:"0.5rem", alignItems:"center" }}>
                          <span style={{ color:c.amber, fontSize:"0.8rem" }}>⚠</span>
                          <span style={{ fontFamily:gs, fontSize:"0.74rem", color:c.amber }}>Scores computed from available data. Full dividend history requires FMP Starter plan.</span>
                        </div>
                      )}

                      {/* ── Key metrics ── */}
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:"0.6rem", marginBottom:"1.5rem" }}>
                        {[
                          { label:"Annual Yield",    value: divData.dividendYield ? `${(divData.dividendYield*100).toFixed(2)}%` : "—", col: divData.dividendYield > 0.03 ? c.green : c.text },
                          { label:"Ann. DPS",        value: divData.annualDPS ? `$${fmt(divData.annualDPS,4)}` : "—", col: c.text },
                          { label:"Payout Ratio",    value: divData.payoutRatio ? `${(divData.payoutRatio*100).toFixed(1)}%` : "—", col: divData.payoutRatio < 0.6 ? c.green : divData.payoutRatio < 0.8 ? c.amber : c.red },
                          { label:"Ex-Dividend",     value: divData.exDate ? fmtDate(divData.exDate) : "—", col: c.text },
                          { label:"Payment Date",    value: divData.paymentDate ? fmtDate(divData.paymentDate) : "—", col: c.text },
                        ].map(item => (
                          <div key={item.label} style={{ background:c.card, border:`1px solid ${c.border}`, borderRadius:"8px", padding:"0.75rem" }}>
                            <p style={{ fontFamily:gs, fontSize:"0.58rem", color:c.muted, letterSpacing:"0.09em", textTransform:"uppercase", marginBottom:"4px" }}>{item.label}</p>
                            <p style={{ fontFamily:gs, fontSize:"0.92rem", fontWeight:700, color:item.col }}>{item.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* ── Dividend history chart ── */}
                      {divData.history?.length > 0 && (
                        <div style={{ marginBottom:"1.5rem" }}>
                          <p style={{ fontFamily:gs, fontSize:"0.72rem", color:c.muted, letterSpacing:"0.09em", textTransform:"uppercase", fontWeight:600, marginBottom:"0.75rem" }}>
                            Annual Dividend Per Share
                          </p>
                          <ResponsiveContainer width="100%" height={160}>
                            <BarChart data={divData.history} margin={{ top:4, right:4, bottom:0, left:0 }} barCategoryGap="30%">
                              <CartesianGrid strokeDasharray="3 3" stroke={c.border} vertical={false}/>
                              <XAxis dataKey="year" tick={{ fill:c.muted, fontSize:10, fontFamily:gs }} axisLine={false} tickLine={false}/>
                              <YAxis tick={{ fill:c.muted, fontSize:9, fontFamily:gs }} axisLine={false} tickLine={false}
                                tickFormatter={v=>`$${v.toFixed(2)}`} width={44}/>
                              <Tooltip content={<DivTip c={c}/>}/>
                              <Bar dataKey="dps" radius={[4,4,0,0]}>
                                {divData.history.map((entry, i) => (
                                  <Cell key={i}
                                    fill={i === divData.history.length-1 ? c.green : c.blue}
                                    opacity={0.7 + (i/divData.history.length)*0.3}
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* ── Safety and Growth factor tables ── */}
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem", marginBottom:"1.5rem" }}>
                        <div>
                          <p style={{ fontFamily:gs, fontSize:"0.68rem", color:c.muted, letterSpacing:"0.09em", textTransform:"uppercase", fontWeight:600, marginBottom:"0.5rem" }}>
                            Safety Factors
                          </p>
                          {divData.safetyFactors?.map(f => (
                            <FactorRow key={f.label} label={f.label} value={f.value} status={f.status} c={c}/>
                          ))}
                        </div>
                        <div>
                          <p style={{ fontFamily:gs, fontSize:"0.68rem", color:c.muted, letterSpacing:"0.09em", textTransform:"uppercase", fontWeight:600, marginBottom:"0.5rem" }}>
                            Growth Factors
                          </p>
                          {divData.growthFactors?.map(f => (
                            <FactorRow key={f.label} label={f.label} value={f.value} status={f.status} c={c}/>
                          ))}
                        </div>
                      </div>

                      {/* ── Income projector ── */}
                      <div style={{ background:c.surface, border:`1px solid ${c.border}`, borderRadius:"10px", padding:"1.25rem" }}>
                        <p style={{ fontFamily:gs, fontSize:"0.68rem", color:c.muted, letterSpacing:"0.09em", textTransform:"uppercase", fontWeight:600, marginBottom:"1rem" }}>
                          Income Projector
                        </p>
                        <div style={{ display:"flex", alignItems:"center", gap:"0.75rem", marginBottom:"1rem", flexWrap:"wrap" }}>
                          <span style={{ fontFamily:gs, fontSize:"0.84rem", color:c.muted }}>If I invest</span>
                          <div style={{ position:"relative", display:"flex", alignItems:"center" }}>
                            <span style={{ position:"absolute", left:"10px", fontFamily:gs, fontSize:"0.84rem", color:c.muted, pointerEvents:"none" }}>$</span>
                            <input
                              type="number"
                              value={projAmount}
                              onChange={e => setProjAmount(Math.max(0, +e.target.value))}
                              style={{ background:c.card, border:`1px solid ${c.borderHi}`, borderRadius:"6px", padding:"8px 10px 8px 22px", fontFamily:gs, fontSize:"0.84rem", color:c.text, width:"120px", outline:"none" }}
                            />
                          </div>
                          <span style={{ fontFamily:gs, fontSize:"0.84rem", color:c.muted }}>at {divData.dividendYield ? `${(divData.dividendYield*100).toFixed(2)}%` : "current"} yield</span>
                        </div>
                        {divData.dividendYield ? (
                          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.75rem" }}>
                            <div style={{ background:c.card, border:`1px solid ${c.border}`, borderRadius:"8px", padding:"0.9rem" }}>
                              <p style={{ fontFamily:gs, fontSize:"0.6rem", color:c.muted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"4px" }}>Annual Income</p>
                              <p style={{ fontFamily:gs, fontSize:"1.4rem", fontWeight:700, color:c.green }}>${annualIncome?.toFixed(2) ?? "—"}</p>
                            </div>
                            <div style={{ background:c.card, border:`1px solid ${c.border}`, borderRadius:"8px", padding:"0.9rem" }}>
                              <p style={{ fontFamily:gs, fontSize:"0.6rem", color:c.muted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"4px" }}>Monthly Income</p>
                              <p style={{ fontFamily:gs, fontSize:"1.4rem", fontWeight:700, color:c.green }}>${monthlyIncome?.toFixed(2) ?? "—"}</p>
                            </div>
                          </div>
                        ) : (
                          <p style={{ fontFamily:gs, fontSize:"0.82rem", color:c.muted }}>Yield data unavailable for this stock.</p>
                        )}
                        <p style={{ fontFamily:gs, fontSize:"0.65rem", color:c.muted, marginTop:"0.75rem" }}>
                          Projection based on current yield only. Dividends are not guaranteed and may change.
                        </p>
                      </div>
                    </>
                  ) : null}
                </>
              )}

              {statTab!=="general" && statTab!=="dividends" && m==null && r==null && (
                <div style={{ textAlign:"center", padding:"1.5rem 0" }}>
                  <p style={{ fontFamily:gs, fontSize:"0.82rem", color:c.muted, marginBottom:"0.5rem" }}>
                    Detailed ratios require FMP Starter plan ($29/mo)
                  </p>
                  <a href="https://financialmodelingprep.com/developer/docs/pricing" target="_blank" rel="noopener noreferrer"
                    style={{ fontFamily:gs, fontSize:"0.78rem", color:c.blue, textDecoration:"none" }}>
                    View FMP pricing →
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Company Profile ── */}
        <div style={{ background:c.card, border:`1px solid ${c.border}`, borderRadius:"14px", padding:"1.5rem" }}>
          <p style={{ fontFamily:gs, fontSize:"0.9rem", fontWeight:600, color:c.text, marginBottom:"1.25rem" }}>Company Profile</p>
          {loading ? (
            <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
              <Sk h="12px" c={c}/><Sk h="12px" c={c} w="80%"/><Sk h="12px" c={c} w="60%"/>
            </div>
          ) : p ? (
            <>
              {p.description && (
                <p style={{ fontFamily:gs, fontSize:"0.84rem", color:c.muted, lineHeight:1.75, marginBottom:"1.5rem" }}>
                  {p.description.length>600?p.description.slice(0,600)+"…":p.description}
                </p>
              )}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:"0.75rem" }}>
                {[
                  ["CEO",          p.ceo],
                  ["Employees",    p.fullTimeEmployees ? (+p.fullTimeEmployees).toLocaleString() : null],
                  ["Headquarters", [p.city,p.state,p.country].filter(Boolean).join(", ")],
                  ["Sector",       p.sector],
                  ["Industry",     p.industry],
                  ["Exchange",     p.exchangeShortName],
                  ["ISIN",         p.isin],
                  ["Website",      p.website],
                ].filter(([,v])=>v).map(([label,value])=>(
                  <div key={label} style={{ background:c.surface, borderRadius:"8px", padding:"0.75rem" }}>
                    <p style={{ fontFamily:gs, fontSize:"0.6rem", color:c.muted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"4px" }}>{label}</p>
                    {label==="Website" ? (
                      <a href={value} target="_blank" rel="noopener noreferrer"
                        style={{ fontFamily:gs, fontSize:"0.78rem", color:c.blue, textDecoration:"none", wordBreak:"break-all" }}>{value.replace(/^https?:\/\//,"")}</a>
                    ) : (
                      <p style={{ fontFamily:gs, fontSize:"0.82rem", fontWeight:600, color:c.text, wordBreak:"break-word" }}>{value}</p>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p style={{ fontFamily:gs, color:c.muted, fontSize:"0.84rem" }}>Company data unavailable.</p>
          )}
        </div>

        <p style={{ fontFamily:gs, color:c.muted, fontSize:"0.68rem", textAlign:"center", marginTop:"2rem" }}>
          For informational purposes only · Not financial advice · Data via Financial Modeling Prep
        </p>
      </div>
    </div>
  );
}