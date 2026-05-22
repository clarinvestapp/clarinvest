"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/lib/theme";

// ─── Color tokens ─────────────────────────────────────────────────────────────
const C = {
  dark:  { bg:"#090909", card:"#111113", surface:"#141416", border:"#232325", borderHi:"#333336", text:"#F0F0F0", muted:"#7A7A80", green:"#00E676", greenDim:"rgba(0,230,118,0.10)", blue:"#4488FF", blueDim:"rgba(68,136,255,0.12)", red:"#FF1800", redDim:"rgba(255,24,0,0.10)", amber:"#F59E0B", cg:"linear-gradient(145deg,#131316,#0F0F12)", cgh:"linear-gradient(145deg,#1C1C20,#141418)" },
  light: { bg:"#F7F7F5", card:"#FFFFFF",  surface:"#EEEEED", border:"#DEDEDD",  borderHi:"#BABAB8", text:"#0A0A0A", muted:"#606065", green:"#008A38", greenDim:"rgba(0,138,56,0.09)", blue:"#1E55CC", blueDim:"rgba(30,85,204,0.09)", red:"#CC0000", redDim:"rgba(204,0,0,0.10)", amber:"#B45309", cg:"linear-gradient(145deg,#FFFFFF,#F2F2F0)", cgh:"linear-gradient(145deg,#F5F5F3,#EBEBEA)" },
};
const gs = "'Google Sans Flex','DM Sans',sans-serif";

const MARKETS  = ["All","US","EU","UK"];
const SECTORS  = ["All","Technology","Financials","Healthcare","Energy","Consumer Discretionary","Consumer Staples","Industrials","Materials","Real Estate","Utilities","Communication","Defence","Automotive","Mining","Luxury","Biotech"];
const VIEWS    = [{ id:"gainers", label:"Top Gainers" },{ id:"losers", label:"Top Losers" },{ id:"active", label:"Most Active" }];

// ─── Flag image ───────────────────────────────────────────────────────────────
function FlagImg({ market, height = 18 }) {
  const codes = { US:"us", UK:"uk", EU:"eu" };
  return (
    <img src={`/flags/${codes[market]||"us"}.svg`} alt={market}
      style={{ height, width:Math.round(height*1.35), display:"inline-block", verticalAlign:"middle", borderRadius:"1px" }}
    />
  );
}

// ─── Circular AI score placeholder ───────────────────────────────────────────
function ScoreBadge({ score, c, size = 48 }) {
  if (score === null || score === undefined) {
    return (
      <div style={{ width:size, height:size, borderRadius:"50%", border:`2px solid ${c.border}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <span style={{ fontFamily:gs, fontSize:"0.5rem", color:c.muted, textAlign:"center", lineHeight:1.2 }}>AI<br/>—</span>
      </div>
    );
  }
  const sc = score>=80?c.green:score>=65?c.text:c.red;
  const r = (size-6)/2, cx=size/2, cy=size/2;
  const circ = 2*Math.PI*r;
  const offset = circ*(1-score/100);
  return (
    <div style={{ position:"relative", width:size, height:size, flexShrink:0 }}>
      <div style={{ position:"absolute", inset:"5px", borderRadius:"50%", background:`radial-gradient(circle,${sc}28 0%,transparent 75%)`, filter:"blur(4px)", pointerEvents:"none" }}/>
      <svg width={size} height={size} style={{ position:"absolute", top:0, left:0, transform:"rotate(-90deg)" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={c.border} strokeWidth="2.5"/>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={sc} strokeWidth="2.5" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"/>
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <span style={{ fontFamily:gs, fontSize:"0.76rem", fontWeight:800, color:sc }}>{score}</span>
      </div>
    </div>
  );
}

// ─── Editorial stock card ─────────────────────────────────────────────────────
function StockCard({ s, c, onClick }) {
  const [hov, setHov] = useState(false);
  const pos = s.chg >= 0;
  const hasPrice = s.price !== null && s.price !== undefined;

  return (
    <div onClick={() => onClick(s)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ background:hov?c.cgh:c.cg, border:`1px solid ${hov?c.borderHi:c.border}`, borderRadius:"16px", padding:"1.5rem 1.4rem", cursor:"pointer", transition:"all 0.25s", transform:hov?"translateY(-4px)":"none", boxShadow:hov?"0 10px 32px rgba(0,0,0,0.25)":"0 1px 8px rgba(0,0,0,0.08)" }}>

      {/* Header: flag + ticker + company | score */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"1rem" }}>
        <div style={{ flex:1, minWidth:0, paddingRight:"0.75rem" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"0.45rem", marginBottom:"0.3rem" }}>
            <FlagImg market={s.market} height={16}/>
            <span style={{ fontFamily:gs, fontSize:"1.1rem", fontWeight:700, color:c.text }}>{s.ticker}</span>
          </div>
          <p style={{ fontFamily:gs, fontSize:"0.72rem", color:c.muted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.name}</p>
        </div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"3px", flexShrink:0 }}>
          <ScoreBadge score={s.score} c={c} size={46}/>
          <span style={{ fontFamily:gs, fontSize:"0.52rem", color:c.muted, letterSpacing:"0.05em", textTransform:"uppercase" }}>AI Score</span>
        </div>
      </div>

      {/* Price */}
      <div style={{ marginBottom:"1rem" }}>
        {hasPrice ? (
          <>
            <span style={{ fontFamily:gs, fontSize:"1.5rem", fontWeight:700, color:c.text }}>
              {s.currency === "GBp" ? `${(s.price/100).toFixed(2)}p` : `$${s.price.toFixed(2)}`}
            </span>
            <span style={{ fontFamily:gs, fontSize:"0.86rem", fontWeight:700, color:pos?c.green:c.red, marginLeft:"0.5rem" }}>
              {pos?"▲":"▼"} {Math.abs(s.chg ?? 0).toFixed(2)}%
            </span>
          </>
        ) : (
          <span style={{ fontFamily:gs, fontSize:"0.8rem", color:c.muted, fontStyle:"italic" }}>Price unavailable</span>
        )}
      </div>

      {/* Footer: sector + market | verdict */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingTop:"0.75rem", borderTop:`1px solid ${c.border}` }}>
        <div style={{ display:"flex", gap:"0.35rem", flexWrap:"wrap" }}>
          <span style={{ fontFamily:gs, fontSize:"0.6rem", color:c.muted, background:c.surface, border:`1px solid ${c.border}`, borderRadius:"4px", padding:"2px 7px" }}>{s.sector||"—"}</span>
          <span style={{ fontFamily:gs, fontSize:"0.6rem", color:c.muted, background:c.surface, border:`1px solid ${c.border}`, borderRadius:"4px", padding:"2px 7px" }}>{s.market}</span>
        </div>
        <span style={{ fontFamily:gs, fontSize:"0.66rem", fontWeight:600, color:c.muted, letterSpacing:"0.04em" }}>
          {s.score ? (s.score>=80?"Strong Buy":s.score>=65?"Buy":s.score>=50?"Hold":"Sell") : "View →"}
        </span>
      </div>
    </div>
  );
}

// ─── Skeleton card ────────────────────────────────────────────────────────────
function SkeletonCard({ c }) {
  return (
    <div style={{ background:c.cg, border:`1px solid ${c.border}`, borderRadius:"16px", padding:"1.5rem 1.4rem" }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"1rem" }}>
        <div>
          <div style={{ width:"80px", height:"16px", background:c.surface, borderRadius:"4px", marginBottom:"8px" }}/>
          <div style={{ width:"120px", height:"12px", background:c.surface, borderRadius:"4px" }}/>
        </div>
        <div style={{ width:"46px", height:"46px", borderRadius:"50%", background:c.surface }}/>
      </div>
      <div style={{ width:"100px", height:"24px", background:c.surface, borderRadius:"4px", marginBottom:"1rem" }}/>
      <div style={{ height:"1px", background:c.border, marginBottom:"0.75rem" }}/>
      <div style={{ display:"flex", gap:"0.4rem" }}>
        <div style={{ width:"70px", height:"20px", background:c.surface, borderRadius:"4px" }}/>
        <div style={{ width:"40px", height:"20px", background:c.surface, borderRadius:"4px" }}/>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DiscoveryPage() {
  const { mode } = useTheme();
  const c = C[mode];
  const router = useRouter();

  const [stocks,  setStocks]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [view,    setView]    = useState("gainers");
  const [market,  setMarket]  = useState("All");
  const [sector,  setSector]  = useState("All");
  const [search,  setSearch]  = useState("");
  const [sfoc,    setSfoc]    = useState(false);
  const [debounced, setDebounced] = useState("");

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch stocks from API route
  const fetchStocks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ view, market });
      if (debounced) params.set("q", debounced);
      const res  = await fetch(`/api/stocks?${params}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setStocks(data.stocks || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [view, market, debounced]);

  useEffect(() => { fetchStocks(); }, [fetchStocks]);

  const filtered = useMemo(() => {
    if (sector === "All") return stocks;
    return stocks.filter(s => s.sector === sector);
  }, [stocks, sector]);

  const pill = (active) => ({
    background:   active ? c.text : "transparent",
    color:        active ? c.bg   : c.muted,
    border:       `1px solid ${active ? c.text : c.border}`,
    borderRadius: "50px", padding:"5px 14px",
    fontFamily:   gs, fontSize:"0.73rem", fontWeight:600,
    cursor:"pointer", transition:"all 0.18s", whiteSpace:"nowrap",
  });

  return (
    <div style={{ background:c.bg, minHeight:"100vh" }}>
      <style>{`
        .sr{display:flex;gap:0.4rem;overflow-x:auto;-ms-overflow-style:none;scrollbar-width:none;}
        .sr::-webkit-scrollbar{display:none;}
        .sw{display:flex;gap:0.4rem;flex-wrap:wrap;}
        @keyframes rbow{
          0%  {box-shadow:0 0 0 2px rgba(255,80,80,0.75), 0 0 20px 5px rgba(255,80,80,0.28);}
          20% {box-shadow:0 0 0 2px rgba(255,180,50,0.75),0 0 20px 5px rgba(255,180,50,0.28);}
          40% {box-shadow:0 0 0 2px rgba(60,220,120,0.75),0 0 20px 5px rgba(60,220,120,0.28);}
          60% {box-shadow:0 0 0 2px rgba(68,160,255,0.75),0 0 20px 5px rgba(68,160,255,0.28);}
          80% {box-shadow:0 0 0 2px rgba(180,80,255,0.75),0 0 20px 5px rgba(180,80,255,0.28);}
          100%{box-shadow:0 0 0 2px rgba(255,80,80,0.75), 0 0 20px 5px rgba(255,80,80,0.28);}
        }
        .rbow{animation:rbow 2.8s linear infinite;border-color:transparent !important;}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        .sk>div{animation:pulse 1.4s ease infinite;}
        @media(max-width:700px){.sw{flex-wrap:nowrap;overflow-x:auto;-ms-overflow-style:none;scrollbar-width:none;}.sw::-webkit-scrollbar{display:none;}.page-pad{padding:1.5rem 1.25rem !important;}}
      `}</style>

      <div className="page-pad" style={{ maxWidth:"1200px", margin:"0 auto", padding:"2.5rem 3.5rem" }}>

        {/* Header */}
        <div style={{ marginBottom:"1.75rem" }}>
          <p style={{ fontFamily:gs, color:c.muted, fontSize:"0.65rem", letterSpacing:"0.18em", textTransform:"uppercase", marginBottom:"0.4rem", fontWeight:600 }}>Discovery</p>
          <h1 style={{ fontFamily:gs, fontSize:"clamp(1.5rem,3vw,2.2rem)", fontWeight:700, color:c.text }}>Markets Overview</h1>
        </div>

        {/* Search */}
        <div style={{ position:"relative", marginBottom:"1.25rem" }}>
          <span style={{ position:"absolute", left:"14px", top:"50%", transform:"translateY(-50%)", color:c.muted, fontSize:"0.9rem", pointerEvents:"none" }}>⌕</span>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            onFocus={() => setSfoc(true)} onBlur={() => setSfoc(false)}
            placeholder="Ticker, company or keyword..."
            className={sfoc ? "rbow" : ""}
            style={{ width:"100%", background:c.card, border:`1px solid ${sfoc?c.borderHi:c.border}`, borderRadius:"8px", padding:"11px 14px 11px 36px", color:c.text, fontSize:"0.9rem", fontFamily:gs, outline:"none", transition:"border-color 0.18s" }}
          />
          {search && <button onClick={() => setSearch("")} style={{ position:"absolute", right:"12px", top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:c.muted, cursor:"pointer", fontSize:"0.85rem" }}>✕</button>}
        </div>

        {/* View selector */}
        {!search && (
          <div style={{ display:"flex", gap:"0.4rem", marginBottom:"1rem" }}>
            {VIEWS.map(v => (
              <button key={v.id} onClick={() => setView(v.id)}
                style={{ ...pill(view===v.id), borderRadius:"5px", padding:"6px 14px" }}>
                {v.label}
              </button>
            ))}
          </div>
        )}

        {/* Market filter */}
        <div className="sr" style={{ marginBottom:"0.6rem" }}>
          {MARKETS.map(m => <button key={m} onClick={() => setMarket(m)} style={pill(market===m)}>{m}</button>)}
        </div>

        {/* Sector filter */}
        <div className="sw" style={{ marginBottom:"1.5rem" }}>
          {SECTORS.map(s => <button key={s} onClick={() => setSector(s)} style={pill(sector===s)}>{s}</button>)}
        </div>

        {/* Results bar */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem" }}>
          <span style={{ fontFamily:gs, fontSize:"0.74rem", color:c.muted }}>
            {loading ? "Loading…" : `${filtered.length} stock${filtered.length!==1?"s":""}`}
          </span>
          {error && (
            <span style={{ fontFamily:gs, fontSize:"0.74rem", color:c.red }}>
              Data unavailable — {error.includes("429") ? "rate limit reached, try again shortly" : "check your FMP API key"}
            </span>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="sk" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))", gap:"1.1rem" }}>
            {Array.from({length:12}).map((_,i) => <SkeletonCard key={i} c={c}/>)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:"center", padding:"5rem 0" }}>
            <p style={{ fontFamily:gs, color:c.muted, fontSize:"0.95rem", marginBottom:"1rem" }}>
              {search ? `No results for "${search}"` : "No stocks match your filters."}
            </p>
            <button onClick={() => { setMarket("All"); setSector("All"); setSearch(""); }}
              style={{ background:"none", border:`1px solid ${c.border}`, borderRadius:"6px", padding:"8px 20px", color:c.muted, fontFamily:gs, fontSize:"0.82rem", cursor:"pointer" }}>
              Clear filters
            </button>
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))", gap:"1.1rem" }}>
            {filtered.map(s => (
              <StockCard key={s.ticker} s={s} c={c}
                onClick={() => router.push(`/dashboard/stock/${s.ticker}`)}
              />
            ))}
          </div>
        )}

        {/* Info note */}
        {!loading && filtered.length > 0 && (
          <p style={{ fontFamily:gs, color:c.muted, fontSize:"0.7rem", textAlign:"center", marginTop:"2rem" }}>
            For informational purposes only · Not financial advice · Data via Financial Modeling Prep
          </p>
        )}
      </div>
    </div>
  );
}
