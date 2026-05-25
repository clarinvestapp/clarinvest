"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/lib/theme";
import { createClient } from "@/lib/supabase";
import { BarChart, Bar, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

const C = {
  dark:  { bg:"#090909", card:"#111113", surface:"#141416", border:"#232325", borderHi:"#333336", text:"#F0F0F0", muted:"#7A7A80", green:"#00E676", greenDim:"rgba(0,230,118,0.10)", blue:"#4488FF", blueDim:"rgba(68,136,255,0.12)", red:"#FF1800", redDim:"rgba(255,24,0,0.10)", amber:"#F59E0B", cg:"linear-gradient(145deg,#131316,#0F0F12)" },
  light: { bg:"#F7F7F5", card:"#FFFFFF",  surface:"#EEEEED", border:"#DEDEDD",  borderHi:"#BABAB8", text:"#0A0A0A", muted:"#606065", green:"#008A38", greenDim:"rgba(0,138,56,0.09)", blue:"#1E55CC", blueDim:"rgba(30,85,204,0.09)", red:"#CC0000", redDim:"rgba(204,0,0,0.10)", amber:"#B45309", cg:"linear-gradient(145deg,#FFFFFF,#F2F2F0)" },
};
const gs = "'Google Sans Flex','DM Sans',sans-serif";

// Popular dividend stocks to feature
const FEATURED_TICKERS = [
  { ticker:"JNJ",  name:"Johnson & Johnson",    sector:"Healthcare"   },
  { ticker:"KO",   name:"Coca-Cola",             sector:"Staples"      },
  { ticker:"PG",   name:"Procter & Gamble",      sector:"Staples"      },
  { ticker:"MCD",  name:"McDonald's",            sector:"Discretionary"},
  { ticker:"O",    name:"Realty Income",         sector:"Real Estate"  },
  { ticker:"VZ",   name:"Verizon",               sector:"Telecom"      },
  { ticker:"PEP",  name:"PepsiCo",               sector:"Staples"      },
  { ticker:"T",    name:"AT&T",                  sector:"Telecom"      },
  { ticker:"ABBV", name:"AbbVie",                sector:"Healthcare"   },
  { ticker:"XOM",  name:"Exxon Mobil",           sector:"Energy"       },
  { ticker:"CVX",  name:"Chevron",               sector:"Energy"       },
  { ticker:"MMM",  name:"3M",                    sector:"Industrials"  },
];

// ─── Gauge (shared with stock page) ──────────────────────────────────────────
function Gauge({ score, label, c, size = 160 }) {
  const cx = size/2, cy = size*0.54, r = size*0.40, needleR = size*0.34;
  const col = score >= 70 ? c.green : score >= 40 ? c.amber : c.red;
  const statusLabel = score >= 70 ? "STRONG" : score >= 40 ? "MODERATE" : "WEAK";

  const z1a = Math.PI * 0.67, z2a = Math.PI * 0.33;
  const z1x = +(cx + r*Math.cos(z1a)).toFixed(1), z1y = +(cy - r*Math.sin(z1a)).toFixed(1);
  const z2x = +(cx + r*Math.cos(z2a)).toFixed(1), z2y = +(cy - r*Math.sin(z2a)).toFixed(1);

  const angle = Math.PI*(1 - score/100);
  const ex = +(cx + r*Math.cos(angle)).toFixed(1), ey = +(cy - r*Math.sin(angle)).toFixed(1);
  const la = score > 50 ? 1 : 0;
  const nx = +(cx + needleR*Math.cos(angle)).toFixed(1), ny = +(cy - needleR*Math.sin(angle)).toFixed(1);
  const sw = size*0.065;

  return (
    <div style={{ textAlign:"center" }}>
      <svg width={size} height={cy+16} viewBox={`0 0 ${size} ${cy+16}`} style={{ overflow:"visible" }}>
        <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${z1x} ${z1y}`} fill="none" stroke={`${c.red}28`} strokeWidth={sw} strokeLinecap="butt"/>
        <path d={`M ${z1x} ${z1y} A ${r} ${r} 0 0 1 ${z2x} ${z2y}`} fill="none" stroke={`${c.amber}28`} strokeWidth={sw} strokeLinecap="butt"/>
        <path d={`M ${z2x} ${z2y} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`} fill="none" stroke={`${c.green}28`} strokeWidth={sw} strokeLinecap="butt"/>
        {score > 0 && <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 ${la} 1 ${ex} ${ey}`} fill="none" stroke={col} strokeWidth={sw+6} strokeLinecap="round" opacity="0.12"/>}
        {score > 0 && <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 ${la} 1 ${ex} ${ey}`} fill="none" stroke={col} strokeWidth={sw} strokeLinecap="round"/>}
        <line x1={cx+1} y1={cy+1} x2={+(nx+1).toFixed(1)} y2={+(ny+1).toFixed(1)} stroke="rgba(0,0,0,0.2)" strokeWidth="2" strokeLinecap="round"/>
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={col} strokeWidth="2" strokeLinecap="round"/>
        <circle cx={cx} cy={cy} r={size*0.045} fill={c.card} stroke={c.border} strokeWidth="1.5"/>
        <circle cx={cx} cy={cy} r={size*0.022} fill={col}/>
        <text x={cx} y={cy - r*0.38} textAnchor="middle" fontFamily={gs} fontSize={size*0.16} fontWeight="800" fill={col}>{score}</text>
        <text x={cx} y={cy - r*0.16} textAnchor="middle" fontFamily={gs} fontSize={size*0.07} fill={c.muted}>/100</text>
        <text x={cx} y={cy+13} textAnchor="middle" fontFamily={gs} fontSize={size*0.07} fontWeight="700" fill={col} letterSpacing="0.06em">{statusLabel}</text>
        <text x={cx-r-2} y={cy+14} textAnchor="end" fontFamily={gs} fontSize={size*0.07} fill={c.red} opacity="0.6">LOW</text>
        <text x={cx+r+2} y={cy+14} textAnchor="start" fontFamily={gs} fontSize={size*0.07} fill={c.green} opacity="0.6">HIGH</text>
      </svg>
      <p style={{ fontFamily:gs, fontSize:"0.76rem", fontWeight:600, color:c.text, marginTop:"0.3rem" }}>{label}</p>
    </div>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────
function Sk({ w="100%", h="16px", c, r="4px" }) {
  return <div style={{ width:w, height:h, background:c.surface, borderRadius:r, animation:"pulse 1.4s ease infinite" }}/>;
}

// ─── Dividend card for watchlist/featured stocks ───────────────────────────────
function DividendCard({ ticker, name, sector, divData, stockData, loading, c, onView }) {
  const yield_ = divData?.dividendYield;
  const safety = divData?.safetyScore;
  const growth = divData?.growthScore;
  const price  = stockData?.quote?.price;
  const pos    = (stockData?.quote?.changesPercentage ?? 0) >= 0;

  return (
    <div style={{ background:c.cg, border:`1px solid ${c.border}`, borderRadius:"14px", padding:"1.25rem", display:"flex", flexDirection:"column", gap:"0.75rem" }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <p style={{ fontFamily:gs, fontSize:"1rem", fontWeight:700, color:c.text }}>{ticker}</p>
          <p style={{ fontFamily:gs, fontSize:"0.72rem", color:c.muted, marginTop:"2px" }}>{name}</p>
          <span style={{ fontFamily:gs, fontSize:"0.58rem", color:c.muted, background:c.surface, border:`1px solid ${c.border}`, borderRadius:"3px", padding:"1px 6px", display:"inline-block", marginTop:"4px" }}>{sector}</span>
        </div>
        {loading ? <Sk w="60px" h="28px" c={c} r="6px"/> : price != null && (
          <div style={{ textAlign:"right" }}>
            <p style={{ fontFamily:gs, fontSize:"1rem", fontWeight:700, color:c.text }}>${price.toFixed(2)}</p>
            <p style={{ fontFamily:gs, fontSize:"0.72rem", fontWeight:600, color:pos?c.green:c.red }}>
              {pos?"▲":"▼"} {Math.abs(stockData?.quote?.changesPercentage??0).toFixed(2)}%
            </p>
          </div>
        )}
      </div>

      {/* Yield + DPS */}
      {loading ? (
        <div style={{ display:"flex", gap:"0.5rem" }}>
          <Sk w="50%" h="40px" c={c} r="6px"/>
          <Sk w="50%" h="40px" c={c} r="6px"/>
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"0.5rem" }}>
          {[
            { label:"Yield",        value: yield_ ? `${(yield_*100).toFixed(2)}%` : "—", col: yield_ > 0.03 ? c.green : c.text },
            { label:"Ann. DPS",     value: divData?.annualDPS ? `$${divData.annualDPS.toFixed(4)}` : "—", col: c.text },
            { label:"Payout Ratio", value: divData?.payoutRatio ? `${(divData.payoutRatio*100).toFixed(0)}%` : "—", col: divData?.payoutRatio < 0.6 ? c.green : divData?.payoutRatio < 0.8 ? c.amber : c.red },
          ].map(item => (
            <div key={item.label} style={{ background:c.surface, borderRadius:"6px", padding:"0.5rem 0.6rem" }}>
              <p style={{ fontFamily:gs, fontSize:"0.55rem", color:c.muted, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:"2px" }}>{item.label}</p>
              <p style={{ fontFamily:gs, fontSize:"0.84rem", fontWeight:700, color:item.col }}>{item.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Mini gauges */}
      {loading ? (
        <Sk h="24px" c={c} r="4px"/>
      ) : safety != null && growth != null && (
        <div style={{ display:"flex", gap:"0.5rem", justifyContent:"center", background:c.surface, borderRadius:"8px", padding:"0.75rem 0.5rem" }}>
          <Gauge score={safety} label="Safety" c={c} size={120}/>
          <div style={{ width:"1px", background:c.border, margin:"0 0.25rem" }}/>
          <Gauge score={growth} label="Growth" c={c} size={120}/>
        </div>
      )}

      {/* CTA */}
      <button onClick={() => onView(ticker)}
        style={{ width:"100%", background:"transparent", color:c.text, border:`1px solid ${c.borderHi}`, borderRadius:"6px", padding:"9px", fontFamily:gs, fontSize:"0.8rem", fontWeight:600, cursor:"pointer", transition:"all 0.18s" }}>
        Full Analysis →
      </button>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function DividendsPage() {
  const { mode } = useTheme();
  const c = C[mode];
  const router = useRouter();
  const supabase = createClient();

  const [userPlan,    setUserPlan]    = useState(null);
  const [search,      setSearch]      = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchData,  setSearchData]  = useState(null);
  const [searchStock, setSearchStock] = useState(null);
  const [searching,   setSearching]   = useState(false);
  const [searchErr,   setSearchErr]   = useState(null);

  // Watchlist dividend data
  const [watchlist,   setWatchlist]   = useState([]);
  const [wlDivData,   setWlDivData]   = useState({});
  const [wlStockData, setWlStockData] = useState({});
  const [wlLoading,   setWlLoading]   = useState(true);

  // Income goal calculator
  const [goalAmount,  setGoalAmount]  = useState(500);
  const [avgYield,    setAvgYield]    = useState(3.5);
  const neededInvest  = goalAmount && avgYield ? ((goalAmount * 12) / (avgYield / 100)).toFixed(0) : null;

  // Featured stocks data
  const [featData,    setFeatData]    = useState({});
  const [featStock,   setFeatStock]   = useState({});
  const [featLoading, setFeatLoading] = useState(true);
  const [activeTab,   setActiveTab]   = useState("watchlist"); // "watchlist" | "featured"

  // Get plan
  useEffect(() => {
    supabase.auth.getUser().then(({ data:{ user } }) => {
      if (!user) return;
      supabase.from("users").select("plan").eq("id", user.id).single()
        .then(({ data }) => setUserPlan(data?.plan || "essential"))
        .catch(() => setUserPlan("essential"));
    });
  }, []);

  // Load watchlist
  useEffect(() => {
    supabase.auth.getSession().then(({ data:{ session } }) => {
      if (!session) { setWlLoading(false); return; }
      fetch("/api/watchlist", { headers:{ Authorization:`Bearer ${session.access_token}` } })
        .then(r => r.json())
        .then(d => { setWatchlist(d.stocks || []); setWlLoading(false); })
        .catch(() => setWlLoading(false));
    });
  }, []);

  // Load dividend + stock data for watchlist items
  useEffect(() => {
    if (!watchlist.length || userPlan !== "ultimate") return;
    watchlist.forEach(s => {
      fetch(`/api/dividends/${s.ticker}`)
        .then(r => r.json())
        .then(d => setWlDivData(prev => ({ ...prev, [s.ticker]: d })))
        .catch(() => {});
      fetch(`/api/stock/${s.ticker}`)
        .then(r => r.json())
        .then(d => setWlStockData(prev => ({ ...prev, [s.ticker]: d })))
        .catch(() => {});
    });
  }, [watchlist, userPlan]);

  // Load featured stocks
  useEffect(() => {
    if (userPlan !== "ultimate") { setFeatLoading(false); return; }
    FEATURED_TICKERS.forEach(s => {
      fetch(`/api/dividends/${s.ticker}`)
        .then(r => r.json())
        .then(d => setFeatData(prev => ({ ...prev, [s.ticker]: d })))
        .catch(() => {});
      fetch(`/api/stock/${s.ticker}`)
        .then(r => r.json())
        .then(d => setFeatStock(prev => ({ ...prev, [s.ticker]: d })))
        .catch(() => {});
    });
    setFeatLoading(false);
  }, [userPlan]);

  // Dividend lookup search
  const handleSearch = useCallback(async () => {
    const t = searchInput.trim().toUpperCase();
    if (!t) return;
    setSearch(t); setSearching(true); setSearchErr(null); setSearchData(null); setSearchStock(null);
    try {
      const [div, stock] = await Promise.all([
        fetch(`/api/dividends/${t}`).then(r => r.json()),
        fetch(`/api/stock/${t}`).then(r => r.json()),
      ]);
      setSearchData(div);
      setSearchStock(stock);
    } catch (e) {
      setSearchErr(e.message);
    } finally {
      setSearching(false);
    }
  }, [searchInput]);

  const isUltimate = userPlan === "ultimate";

  const sectionHead = (title, subtitle) => (
    <div style={{ marginBottom:"1.25rem" }}>
      <p style={{ fontFamily:gs, fontSize:"0.65rem", color:c.muted, letterSpacing:"0.18em", textTransform:"uppercase", fontWeight:600, marginBottom:"0.3rem" }}>{subtitle}</p>
      <h2 style={{ fontFamily:gs, fontSize:"clamp(1.2rem,2.5vw,1.6rem)", fontWeight:700, color:c.text }}>{title}</h2>
    </div>
  );

  const tabStyle = (active) => ({
    background:active?c.text:"transparent", color:active?c.bg:c.muted,
    border:`1px solid ${active?c.text:c.border}`,
    borderRadius:"5px", padding:"6px 18px",
    fontFamily:gs, fontSize:"0.78rem", fontWeight:600,
    cursor:"pointer", transition:"all 0.18s",
  });

  return (
    <div style={{ background:c.bg, minHeight:"100vh" }}>
      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.45}}
        *{box-sizing:border-box;}
      `}</style>

      <div style={{ maxWidth:"1100px", margin:"0 auto", padding:"2.5rem 2rem 4rem" }}>

        {/* ── Page header ── */}
        <div style={{ marginBottom:"2.5rem", display:"flex", justifyContent:"space-between", alignItems:"flex-end", flexWrap:"wrap", gap:"1rem" }}>
          <div>
            <p style={{ fontFamily:gs, color:c.muted, fontSize:"0.65rem", letterSpacing:"0.18em", textTransform:"uppercase", marginBottom:"0.4rem", fontWeight:600 }}>Dividend Intelligence</p>
            <h1 style={{ fontFamily:gs, fontSize:"clamp(1.5rem,3vw,2.2rem)", fontWeight:700, color:c.text }}>Dividend Hub</h1>
            <p style={{ fontFamily:gs, color:c.muted, fontSize:"0.88rem", marginTop:"0.4rem" }}>
              AI-powered safety scores, growth analysis, income forecasting and stock lookup.
            </p>
          </div>
          <div style={{ background:c.greenDim, border:`1px solid ${c.green}40`, borderRadius:"6px", padding:"5px 14px", display:"flex", alignItems:"center", gap:"0.4rem" }}>
            <span style={{ fontFamily:gs, fontSize:"0.62rem", color:c.green, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase" }}>💰 Ultimate Feature</span>
          </div>
        </div>

        {/* ── Ultimate gate ── */}
        {userPlan !== null && !isUltimate && (
          <div style={{ background:c.card, border:`1px solid ${c.borderHi}`, borderRadius:"16px", padding:"3.5rem 2rem", textAlign:"center", marginBottom:"2rem" }}>
            <div style={{ fontSize:"3rem", marginBottom:"1rem" }}>💰</div>
            <h2 style={{ fontFamily:gs, fontSize:"1.3rem", fontWeight:700, color:c.text, marginBottom:"0.75rem" }}>Dividend Intelligence</h2>
            <p style={{ fontFamily:gs, fontSize:"0.88rem", color:c.muted, maxWidth:"400px", margin:"0 auto 2rem", lineHeight:1.7 }}>
              Safety and growth gauges, watchlist dividend tracker, dividend stock screener, and income goal calculator are exclusive to the Ultimate plan.
            </p>
            <div style={{ display:"flex", gap:"0.75rem", justifyContent:"center", flexWrap:"wrap" }}>
              <button onClick={() => router.push("/dashboard/account")}
                style={{ background:c.text, color:c.bg, border:"none", borderRadius:"7px", padding:"12px 32px", fontFamily:gs, fontSize:"0.88rem", fontWeight:700, cursor:"pointer" }}>
                Upgrade to Ultimate →
              </button>
              <button onClick={() => router.push("/dashboard")}
                style={{ background:"transparent", color:c.muted, border:`1px solid ${c.border}`, borderRadius:"7px", padding:"12px 24px", fontFamily:gs, fontSize:"0.84rem", cursor:"pointer" }}>
                Back to Discovery
              </button>
            </div>
          </div>
        )}

        {/* ── Content (Ultimate only) ── */}
        {isUltimate && (
          <>
            {/* ── Income Goal Calculator ── */}
            <div style={{ background:c.card, border:`1px solid ${c.border}`, borderRadius:"14px", padding:"1.75rem", marginBottom:"2rem" }}>
              {sectionHead("Income Goal Calculator", "Planning Tool")}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:"1.5rem", alignItems:"center" }}>
                <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
                  {/* Monthly income goal */}
                  <div>
                    <label style={{ fontFamily:gs, fontSize:"0.76rem", color:c.muted, display:"block", marginBottom:"6px" }}>
                      Monthly income goal
                    </label>
                    <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
                      <span style={{ fontFamily:gs, fontSize:"0.88rem", color:c.muted }}>$</span>
                      <input type="number" value={goalAmount} onChange={e => setGoalAmount(Math.max(1, +e.target.value))}
                        style={{ flex:1, background:c.surface, border:`1px solid ${c.borderHi}`, borderRadius:"6px", padding:"9px 12px", fontFamily:gs, fontSize:"0.9rem", color:c.text, outline:"none" }}/>
                      <span style={{ fontFamily:gs, fontSize:"0.82rem", color:c.muted }}>/month</span>
                    </div>
                  </div>
                  {/* Average yield */}
                  <div>
                    <label style={{ fontFamily:gs, fontSize:"0.76rem", color:c.muted, display:"block", marginBottom:"6px" }}>
                      Expected average dividend yield
                    </label>
                    <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
                      <input type="number" step="0.1" value={avgYield} onChange={e => setAvgYield(Math.max(0.1, +e.target.value))}
                        style={{ flex:1, background:c.surface, border:`1px solid ${c.borderHi}`, borderRadius:"6px", padding:"9px 12px", fontFamily:gs, fontSize:"0.9rem", color:c.text, outline:"none" }}/>
                      <span style={{ fontFamily:gs, fontSize:"0.88rem", color:c.muted }}>%</span>
                    </div>
                  </div>
                </div>

                {/* Result */}
                <div style={{ background:c.surface, borderRadius:"12px", padding:"1.5rem", textAlign:"center" }}>
                  <p style={{ fontFamily:gs, fontSize:"0.65rem", color:c.muted, letterSpacing:"0.1em", textTransform:"uppercase", fontWeight:600, marginBottom:"0.75rem" }}>Required Portfolio Size</p>
                  <p style={{ fontFamily:gs, fontSize:"2.8rem", fontWeight:800, color:c.green, lineHeight:1 }}>
                    ${neededInvest ? (+neededInvest).toLocaleString() : "—"}
                  </p>
                  <p style={{ fontFamily:gs, fontSize:"0.78rem", color:c.muted, marginTop:"0.5rem" }}>
                    to generate ${goalAmount}/month at {avgYield}% yield
                  </p>
                  <div style={{ height:"1px", background:c.border, margin:"1rem 0" }}/>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.5rem" }}>
                    <div>
                      <p style={{ fontFamily:gs, fontSize:"0.58rem", color:c.muted, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:"3px" }}>Annual Income</p>
                      <p style={{ fontFamily:gs, fontSize:"1rem", fontWeight:700, color:c.text }}>${(goalAmount*12).toLocaleString()}</p>
                    </div>
                    <div>
                      <p style={{ fontFamily:gs, fontSize:"0.58rem", color:c.muted, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:"3px" }}>Yield on Cost</p>
                      <p style={{ fontFamily:gs, fontSize:"1rem", fontWeight:700, color:c.text }}>{avgYield}%</p>
                    </div>
                  </div>
                </div>
              </div>
              <p style={{ fontFamily:gs, fontSize:"0.65rem", color:c.muted, marginTop:"1rem" }}>
                Illustrative only. Dividends are not guaranteed. Actual returns will vary.
              </p>
            </div>

            {/* ── Dividend Stock Lookup ── */}
            <div style={{ background:c.card, border:`1px solid ${c.border}`, borderRadius:"14px", padding:"1.75rem", marginBottom:"2rem" }}>
              {sectionHead("Stock Dividend Lookup", "Screener")}
              <div style={{ display:"flex", gap:"0.75rem", marginBottom:"1.5rem", flexWrap:"wrap" }}>
                <input
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                  placeholder="Enter ticker (e.g. KO, JNJ, O)"
                  style={{ flex:1, minWidth:"200px", background:c.surface, border:`1px solid ${c.borderHi}`, borderRadius:"7px", padding:"11px 14px", fontFamily:gs, fontSize:"0.9rem", color:c.text, outline:"none" }}
                />
                <button onClick={handleSearch} disabled={searching || !searchInput.trim()}
                  style={{ background:c.text, color:c.bg, border:"none", borderRadius:"7px", padding:"11px 28px", fontFamily:gs, fontSize:"0.84rem", fontWeight:700, cursor:searching?"not-allowed":"pointer", opacity:searching?0.65:1, flexShrink:0 }}>
                  {searching ? "Looking up…" : "Analyse →"}
                </button>
              </div>

              {searchErr && (
                <p style={{ fontFamily:gs, fontSize:"0.82rem", color:c.red, marginBottom:"1rem" }}>Error: {searchErr}</p>
              )}

              {searchData && searchStock && (
                <div style={{ border:`1px solid ${c.border}`, borderRadius:"12px", padding:"1.5rem" }}>
                  {/* Header */}
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"1.25rem", flexWrap:"wrap", gap:"0.75rem" }}>
                    <div>
                      <h3 style={{ fontFamily:gs, fontSize:"1.2rem", fontWeight:700, color:c.text }}>{search}</h3>
                      <p style={{ fontFamily:gs, fontSize:"0.78rem", color:c.muted }}>{searchStock?.profile?.companyName || search}</p>
                    </div>
                    <div style={{ display:"flex", gap:"0.5rem", flexWrap:"wrap" }}>
                      {searchStock?.quote?.price != null && (
                        <span style={{ fontFamily:gs, fontSize:"1rem", fontWeight:700, color:c.text }}>${searchStock.quote.price.toFixed(2)}</span>
                      )}
                      <button onClick={() => router.push(`/dashboard/stock/${search}`)}
                        style={{ background:c.text, color:c.bg, border:"none", borderRadius:"6px", padding:"7px 18px", fontFamily:gs, fontSize:"0.78rem", fontWeight:700, cursor:"pointer" }}>
                        Full Analysis →
                      </button>
                    </div>
                  </div>

                  {/* Gauges */}
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem", marginBottom:"1.25rem" }}>
                    <div style={{ background:c.surface, borderRadius:"10px", padding:"1rem", display:"flex", justifyContent:"center" }}>
                      <Gauge score={searchData.safetyScore} label="Dividend Safety" c={c} size={150}/>
                    </div>
                    <div style={{ background:c.surface, borderRadius:"10px", padding:"1rem", display:"flex", justifyContent:"center" }}>
                      <Gauge score={searchData.growthScore} label="Dividend Growth" c={c} size={150}/>
                    </div>
                  </div>

                  {/* Key metrics */}
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))", gap:"0.5rem", marginBottom:"1.25rem" }}>
                    {[
                      { label:"Annual Yield",  value: searchData.dividendYield ? `${(searchData.dividendYield*100).toFixed(2)}%` : "—", col: searchData.dividendYield > 0.03 ? c.green : c.text },
                      { label:"Ann. DPS",      value: searchData.annualDPS ? `$${searchData.annualDPS.toFixed(4)}` : "—", col: c.text },
                      { label:"Payout Ratio",  value: searchData.payoutRatio ? `${(searchData.payoutRatio*100).toFixed(1)}%` : "—", col: searchData.payoutRatio < 0.6 ? c.green : searchData.payoutRatio < 0.8 ? c.amber : c.red },
                      { label:"Ex-Dividend",   value: searchData.exDate || "—", col: c.text },
                      { label:"Payment Date",  value: searchData.paymentDate || "—", col: c.text },
                    ].map(item => (
                      <div key={item.label} style={{ background:c.card, border:`1px solid ${c.border}`, borderRadius:"7px", padding:"0.6rem 0.75rem" }}>
                        <p style={{ fontFamily:gs, fontSize:"0.57rem", color:c.muted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"3px" }}>{item.label}</p>
                        <p style={{ fontFamily:gs, fontSize:"0.88rem", fontWeight:700, color:item.col }}>{item.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* History chart */}
                  {searchData.history?.length > 0 && (
                    <div>
                      <p style={{ fontFamily:gs, fontSize:"0.65rem", color:c.muted, letterSpacing:"0.09em", textTransform:"uppercase", fontWeight:600, marginBottom:"0.75rem" }}>
                        Annual Dividend Per Share History
                      </p>
                      <ResponsiveContainer width="100%" height={140}>
                        <BarChart data={searchData.history} margin={{ top:4, right:4, bottom:0, left:0 }} barCategoryGap="30%">
                          <CartesianGrid strokeDasharray="3 3" stroke={c.border} vertical={false}/>
                          <XAxis dataKey="year" tick={{ fill:c.muted, fontSize:10, fontFamily:gs }} axisLine={false} tickLine={false}/>
                          <YAxis tick={{ fill:c.muted, fontSize:9, fontFamily:gs }} axisLine={false} tickLine={false} tickFormatter={v=>`$${v.toFixed(2)}`} width={44}/>
                          <Tooltip
                            contentStyle={{ background:c.card, border:`1px solid ${c.borderHi}`, borderRadius:"6px", fontFamily:gs }}
                            labelStyle={{ color:c.muted, fontSize:"0.72rem" }}
                            itemStyle={{ color:c.green, fontSize:"0.82rem", fontWeight:700 }}
                            formatter={v => [`$${v.toFixed(4)} DPS`]}
                          />
                          <Bar dataKey="dps" radius={[4,4,0,0]}>
                            {searchData.history.map((_, i) => (
                              <Cell key={i} fill={i === searchData.history.length-1 ? c.green : c.blue} opacity={0.65 + (i/searchData.history.length)*0.35}/>
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {searchData.mock && (
                    <p style={{ fontFamily:gs, fontSize:"0.65rem", color:c.amber, marginTop:"0.75rem" }}>
                      ⚠ Full dividend history requires FMP Starter plan. Scores computed from available ratio data.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* ── Watchlist / Featured tabs ── */}
            <div style={{ marginBottom:"1.5rem" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"1rem", marginBottom:"1.25rem" }}>
                {sectionHead(
                  activeTab === "watchlist" ? "Watchlist Dividend Tracker" : "Notable Dividend Stocks",
                  "Portfolio View"
                )}
                <div style={{ display:"flex", gap:"0.5rem" }}>
                  <button onClick={() => setActiveTab("watchlist")} style={tabStyle(activeTab==="watchlist")}>My Watchlist</button>
                  <button onClick={() => setActiveTab("featured")}  style={tabStyle(activeTab==="featured")}>Featured Stocks</button>
                </div>
              </div>

              {activeTab === "watchlist" && (
                wlLoading ? (
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:"1rem" }}>
                    {[1,2,3].map(i => <Sk key={i} h="260px" c={c} r="14px"/>)}
                  </div>
                ) : watchlist.length === 0 ? (
                  <div style={{ textAlign:"center", padding:"3rem", background:c.card, border:`1px solid ${c.border}`, borderRadius:"14px" }}>
                    <p style={{ fontFamily:gs, color:c.muted, fontSize:"0.9rem", marginBottom:"1rem" }}>No stocks in your watchlist yet.</p>
                    <button onClick={() => router.push("/dashboard")}
                      style={{ background:"none", border:`1px solid ${c.border}`, borderRadius:"6px", padding:"8px 20px", color:c.muted, fontFamily:gs, fontSize:"0.82rem", cursor:"pointer" }}>
                      Go to Discovery →
                    </button>
                  </div>
                ) : (
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:"1rem" }}>
                    {watchlist.map(s => (
                      <DividendCard
                        key={s.ticker}
                        ticker={s.ticker}
                        name={s.name}
                        sector={s.sector}
                        divData={wlDivData[s.ticker]}
                        stockData={wlStockData[s.ticker]}
                        loading={!wlDivData[s.ticker]}
                        c={c}
                        onView={t => router.push(`/dashboard/stock/${t}`)}
                      />
                    ))}
                  </div>
                )
              )}

              {activeTab === "featured" && (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:"1rem" }}>
                  {FEATURED_TICKERS.map(s => (
                    <DividendCard
                      key={s.ticker}
                      ticker={s.ticker}
                      name={s.name}
                      sector={s.sector}
                      divData={featData[s.ticker]}
                      stockData={featStock[s.ticker]}
                      loading={featLoading || !featData[s.ticker]}
                      c={c}
                      onView={t => router.push(`/dashboard/stock/${t}`)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <p style={{ fontFamily:gs, color:c.muted, fontSize:"0.68rem", textAlign:"center", marginTop:"2rem" }}>
              For informational purposes only · Not financial advice · Dividend data via Financial Modeling Prep
            </p>
          </>
        )}
      </div>
    </div>
  );
}