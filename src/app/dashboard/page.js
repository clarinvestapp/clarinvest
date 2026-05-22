"use client";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "@/lib/theme";

const C = {
  dark:  { bg:"#090909", card:"#111113", surface:"#141416", border:"#232325", borderHi:"#333336", text:"#F0F0F0", muted:"#7A7A80", green:"#00E676", greenDim:"rgba(0,230,118,0.10)", blue:"#4488FF", blueDim:"rgba(68,136,255,0.12)", red:"#FF1800", amber:"#F59E0B", cg:"linear-gradient(145deg,#131316,#0F0F12)", cgh:"linear-gradient(145deg,#1C1C20,#141418)" },
  light: { bg:"#F7F7F5", card:"#FFFFFF",  surface:"#EEEEED", border:"#DEDEDD",  borderHi:"#BABAB8", text:"#0A0A0A", muted:"#606065", green:"#008A38", greenDim:"rgba(0,138,56,0.09)", blue:"#1E55CC", blueDim:"rgba(30,85,204,0.09)", red:"#CC0000", amber:"#B45309", cg:"linear-gradient(145deg,#FFFFFF,#F2F2F0)", cgh:"linear-gradient(145deg,#F5F5F3,#EBEBEA)" },
};
const gs = "'Google Sans Flex','DM Sans',sans-serif";

const VIEWS   = [
  { id:"gainers", label:"Top Gainers" },
  { id:"losers",  label:"Top Losers"  },
  { id:"active",  label:"Most Active" },
];
const MARKETS = [
  { id:"All", label:"All",   on:true  },
  { id:"US",  label:"US",    on:true  },
  { id:"EU",  label:"EU 🔜", on:false },
  { id:"UK",  label:"UK 🔜", on:false },
];
const SECTORS = [
  "All","Technology","Financials","Healthcare","Energy",
  "Consumer Discretionary","Consumer Staples","Industrials","Materials",
  "Real Estate","Utilities","Communication","Defence","Automotive",
  "Mining","Luxury","Biotech",
];

// ─── Market status ─────────────────────────────────────────────────────────────
const MARKET_META = {
  US: { currency:"USD", exchange:"NYSE / NASDAQ", hours:"09:30 – 16:00 ET",  openUTC:[870,1260], preUTC:[840,870]  },
  UK: { currency:"GBP", exchange:"London Stock Exchange", hours:"08:00 – 16:30 GMT", openUTC:[480,990],  preUTC:[450,480]  },
  EU: { currency:"EUR", exchange:"Various EU Exchanges", hours:"09:00 – 17:30 CET", openUTC:[480,1050], preUTC:[450,480]  },
};
function marketStatus(market) {
  const now = new Date();
  if ([0,6].includes(now.getUTCDay())) return { label:"Weekend", col:"muted" };
  const t = now.getUTCHours()*60 + now.getUTCMinutes();
  const m = MARKET_META[market];
  if (!m) return { label:"Unknown", col:"muted" };
  if (t >= m.openUTC[0] && t < m.openUTC[1]) return { label:"Open",       col:"green" };
  if (t >= m.preUTC[0]  && t < m.preUTC[1] ) return { label:"Pre-Market", col:"amber" };
  return { label:"Closed", col:"red" };
}

// ─── Flag image ────────────────────────────────────────────────────────────────
function FlagImg({ market, height = 18 }) {
  const codes = { US:"us", UK:"uk", EU:"eu" };
  return (
    <img src={`/flags/${codes[market]||"us"}.svg`} alt={market}
      style={{ height, width:Math.round(height*1.35), display:"inline-block", verticalAlign:"middle", borderRadius:"1px" }}
    />
  );
}

// ─── AI score circle ───────────────────────────────────────────────────────────
function ScoreBadge({ score, c, size = 48 }) {
  if (score == null) return (
    <div style={{ width:size, height:size, borderRadius:"50%", border:`2px solid ${c.border}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
      <span style={{ fontFamily:gs, fontSize:"0.5rem", color:c.muted, textAlign:"center", lineHeight:1.2 }}>AI<br/>—</span>
    </div>
  );
  const sc = score>=80?c.green:score>=65?c.text:c.red;
  const r=(size-6)/2, cx=size/2, cy=size/2, circ=2*Math.PI*r, offset=circ*(1-score/100);
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

// ─── Stock card ────────────────────────────────────────────────────────────────
function StockCard({ s, c, isActive, onClick }) {
  const [hov, setHov] = useState(false);
  const pos = (s.chg ?? 0) >= 0;
  return (
    <div onClick={() => onClick(s)}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background:hov||isActive?c.cgh:c.cg, border:`1px solid ${isActive?c.text:hov?c.borderHi:c.border}`, borderRadius:"16px", padding:"1.5rem 1.4rem", cursor:"pointer", transition:"all 0.22s", transform:hov&&!isActive?"translateY(-4px)":"none", boxShadow:hov?"0 10px 32px rgba(0,0,0,0.25)":"0 1px 8px rgba(0,0,0,0.08)" }}>
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
      <div style={{ marginBottom:"1rem" }}>
        {s.price != null ? (
          <>
            <span style={{ fontFamily:gs, fontSize:"1.5rem", fontWeight:700, color:c.text }}>${s.price.toFixed(2)}</span>
            <span style={{ fontFamily:gs, fontSize:"0.86rem", fontWeight:700, color:pos?c.green:c.red, marginLeft:"0.5rem" }}>{pos?"▲":"▼"} {Math.abs(s.chg??0).toFixed(2)}%</span>
          </>
        ) : (
          <span style={{ fontFamily:gs, fontSize:"0.8rem", color:c.muted, fontStyle:"italic" }}>Price loading…</span>
        )}
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingTop:"0.75rem", borderTop:`1px solid ${c.border}` }}>
        <div style={{ display:"flex", gap:"0.35rem", flexWrap:"wrap" }}>
          <span style={{ fontFamily:gs, fontSize:"0.6rem", color:c.muted, background:c.surface, border:`1px solid ${c.border}`, borderRadius:"4px", padding:"2px 7px" }}>{s.sector||"—"}</span>
          <span style={{ fontFamily:gs, fontSize:"0.6rem", color:c.muted, background:c.surface, border:`1px solid ${c.border}`, borderRadius:"4px", padding:"2px 7px" }}>{s.market}</span>
        </div>
        <span style={{ fontFamily:gs, fontSize:"0.66rem", fontWeight:600, color:isActive?c.green:c.muted }}>
          {isActive ? "Open ▶" : "View →"}
        </span>
      </div>
    </div>
  );
}

// ─── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonCard({ c }) {
  return (
    <div style={{ background:c.cg, border:`1px solid ${c.border}`, borderRadius:"16px", padding:"1.5rem 1.4rem" }}>
      {[["80px","16px"],["120px","12px"]].map(([w,h],i)=>(
        <div key={i} style={{ width:w, height:h, background:c.surface, borderRadius:"4px", marginBottom:"8px" }}/>
      ))}
      <div style={{ width:"100px", height:"24px", background:c.surface, borderRadius:"4px", margin:"0.75rem 0" }}/>
      <div style={{ height:"1px", background:c.border, margin:"0.75rem 0" }}/>
      <div style={{ display:"flex", gap:"0.4rem" }}>
        <div style={{ width:"70px", height:"20px", background:c.surface, borderRadius:"4px" }}/>
        <div style={{ width:"40px", height:"20px", background:c.surface, borderRadius:"4px" }}/>
      </div>
    </div>
  );
}

// ─── Slide-over stock panel ────────────────────────────────────────────────────
function StockPanel({ stock, c, mode, onClose, onFullAnalysis }) {
  const panelRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const pos = (stock?.chg ?? 0) >= 0;
  const meta = stock ? MARKET_META[stock.market] : null;
  const status = stock ? marketStatus(stock.market) : null;
  const stCol = status ? (c[status.col] || c.muted) : c.muted;

  // Animate in
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  if (!stock) return null;

  const AI_SUMMARIES = {
    default: `${stock.name} shows consistent fundamentals with a well-established market position. Key metrics suggest the stock warrants further analysis before making any investment decision.`,
    bullish: `${stock.name} demonstrates strong momentum with improving fundamentals. Revenue growth and margin expansion support a constructive near-term outlook for patient investors.`,
    bearish: `${stock.name} faces near-term headwinds including valuation pressure and slowing growth. Caution is warranted at current levels until clearer catalysts emerge.`,
  };
  const summary = (stock.chg??0)>2 ? AI_SUMMARIES.bullish : (stock.chg??0)<-1 ? AI_SUMMARIES.bearish : AI_SUMMARIES.default;

  return (
    <>
      {/* Backdrop — clicking closes panel */}
      <div onClick={onClose}
        style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:300, backdropFilter:"blur(2px)", transition:"opacity 0.3s", opacity:visible?1:0 }}/>

      {/* Panel */}
      <div ref={panelRef}
        style={{
          position:"fixed", top:"58px", right:0, bottom:0, zIndex:301,
          width:"min(480px, 100vw)",
          background:mode==="dark"?"#0E0E10":"#FFFFFF",
          borderLeft:`1px solid ${c.borderHi}`,
          boxShadow:"-12px 0 40px rgba(0,0,0,0.3)",
          display:"flex", flexDirection:"column",
          transform:visible?"translateX(0)":"translateX(100%)",
          transition:"transform 0.3s cubic-bezier(0.32,0.72,0,1)",
          overflowY:"auto",
        }}>

        {/* Panel header */}
        <div style={{ padding:"1.25rem 1.5rem", borderBottom:`1px solid ${c.border}`, display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexShrink:0, position:"sticky", top:0, background:mode==="dark"?"#0E0E10":"#FFFFFF", zIndex:1 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:"0.55rem", marginBottom:"0.25rem" }}>
              <FlagImg market={stock.market} height={18}/>
              <span style={{ fontFamily:gs, fontSize:"1.3rem", fontWeight:700, color:c.text }}>{stock.ticker}</span>
              <span style={{ fontFamily:gs, fontSize:"0.58rem", fontWeight:700, color:stCol, background:`${stCol}18`, border:`1px solid ${stCol}40`, borderRadius:"4px", padding:"2px 7px", letterSpacing:"0.05em", textTransform:"uppercase" }}>{status?.label}</span>
            </div>
            <p style={{ fontFamily:gs, fontSize:"0.78rem", color:c.muted }}>{stock.name}</p>
          </div>
          <button onClick={onClose}
            style={{ background:c.surface, border:`1px solid ${c.border}`, borderRadius:"6px", padding:"6px 10px", cursor:"pointer", color:c.muted, fontFamily:gs, fontSize:"0.8rem", flexShrink:0, marginLeft:"0.5rem" }}>
            ✕
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ padding:"1.5rem", flex:1 }}>

          {/* Price */}
          <div style={{ marginBottom:"1.5rem" }}>
            {stock.price != null ? (
              <>
                <div style={{ fontFamily:gs, fontSize:"2.2rem", fontWeight:700, color:c.text, lineHeight:1 }}>${stock.price.toFixed(2)}</div>
                <div style={{ fontFamily:gs, fontSize:"1rem", fontWeight:700, color:pos?c.green:c.red, marginTop:"0.3rem" }}>
                  {pos?"▲":"▼"} {Math.abs(stock.chg??0).toFixed(2)}% today
                </div>
              </>
            ) : (
              <div style={{ fontFamily:gs, color:c.muted, fontStyle:"italic" }}>Price unavailable</div>
            )}
          </div>

          {/* AI Score + Verdict + Sector */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"0.6rem", marginBottom:"1.25rem" }}>
            {[
              { label:"AI Score", node:<ScoreBadge score={stock.score} c={c} size={36}/> },
              { label:"Sector",   value:stock.sector||"—", color:c.muted },
              { label:"Currency", value:meta?.currency||"USD", color:c.text },
            ].map((item,i) => (
              <div key={i} style={{ background:c.surface, border:`1px solid ${c.border}`, borderRadius:"8px", padding:"0.75rem 0.6rem", display:"flex", flexDirection:"column", alignItems:"center", gap:"4px" }}>
                <div style={{ fontFamily:gs, fontSize:"0.56rem", color:c.muted, letterSpacing:"0.09em", textTransform:"uppercase" }}>{item.label}</div>
                {item.node || <div style={{ fontFamily:gs, fontSize:"0.8rem", fontWeight:600, color:item.color, textAlign:"center" }}>{item.value}</div>}
              </div>
            ))}
          </div>

          {/* Market details */}
          <div style={{ background:c.surface, border:`1px solid ${c.border}`, borderRadius:"10px", padding:"1rem", marginBottom:"1.25rem" }}>
            <p style={{ fontFamily:gs, fontSize:"0.6rem", color:c.muted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"0.75rem", fontWeight:600 }}>Market Details</p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.6rem" }}>
              {[
                { label:"Exchange", value:meta?.exchange||stock.exchange||stock.market },
                { label:"Hours",    value:meta?.hours||"N/A" },
                { label:"Market",   value:stock.market },
                { label:"Sector",   value:stock.sector||"—" },
              ].map((row,i) => (
                <div key={i}>
                  <p style={{ fontFamily:gs, fontSize:"0.58rem", color:c.muted, letterSpacing:"0.07em", textTransform:"uppercase", marginBottom:"2px" }}>{row.label}</p>
                  <p style={{ fontFamily:gs, fontSize:"0.78rem", fontWeight:600, color:c.text }}>{row.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* AI Summary */}
          <div style={{ background:c.blueDim, border:`1px solid ${c.blue}30`, borderRadius:"10px", padding:"1rem", marginBottom:"1.5rem" }}>
            <p style={{ fontFamily:gs, fontSize:"0.6rem", color:c.blue, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"6px", fontWeight:600 }}>AI Summary</p>
            <p style={{ fontFamily:gs, fontSize:"0.82rem", color:c.text, lineHeight:1.68 }}>{summary}</p>
            <p style={{ fontFamily:gs, fontSize:"0.68rem", color:c.muted, marginTop:"8px", fontStyle:"italic" }}>Live AI analysis available with Clarinvest subscription</p>
          </div>

          {/* CTA — full analysis */}
          <button onClick={() => onFullAnalysis(stock.ticker)}
            style={{ width:"100%", background:c.text, color:c.bg, border:"none", borderRadius:"8px", padding:"14px", fontFamily:gs, fontSize:"0.88rem", fontWeight:600, cursor:"pointer", letterSpacing:"0.03em", marginBottom:"0.75rem" }}>
            View Full Analysis →
          </button>
          <button onClick={onClose}
            style={{ width:"100%", background:"transparent", color:c.muted, border:`1px solid ${c.border}`, borderRadius:"8px", padding:"11px", fontFamily:gs, fontSize:"0.84rem", cursor:"pointer" }}>
            Back to Discovery
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function DiscoveryPage() {
  const { mode } = useTheme();
  const c = C[mode];
  const router = useRouter();
  const searchParams = useSearchParams();

  const [stocks,    setStocks]   = useState([]);
  const [loading,   setLoading]  = useState(true);
  const [error,     setError]    = useState(null);
  const [isMock,    setIsMock]   = useState(false);
  const [view,      setView]     = useState("gainers");
  const [market,    setMarket]   = useState("All");
  const [sector,    setSector]   = useState("All");
  const [search,    setSearch]   = useState("");
  const [sfoc,      setSfoc]     = useState(false);
  const [debounced, setDebounced]= useState("");

  // Active stock from URL query param
  const activeTickerParam = searchParams.get("stock");
  const activeStock = stocks.find(s => s.ticker === activeTickerParam) || null;

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchStocks = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ view, market });
      if (debounced) params.set("q", debounced);
      const res  = await fetch(`/api/stocks?${params}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setStocks(data.stocks || []);
      setIsMock(data.mock === true);
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

  // Open panel: update URL with ?stock=TICKER
  const openStock = useCallback((s) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("stock", s.ticker);
    router.push(`/dashboard?${params}`, { scroll: false });
  }, [router, searchParams]);

  // Close panel: remove ?stock from URL
  const closePanel = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("stock");
    const qs = params.toString();
    router.push(qs ? `/dashboard?${qs}` : "/dashboard", { scroll: false });
  }, [router, searchParams]);

  // Navigate to full analysis page
  const goFullAnalysis = useCallback((ticker) => {
    router.push(`/dashboard/stock/${ticker}`);
  }, [router]);

  const pill = (active) => ({
    background:active?c.text:"transparent", color:active?c.bg:c.muted,
    border:`1px solid ${active?c.text:c.border}`, borderRadius:"50px",
    padding:"5px 14px", fontFamily:gs, fontSize:"0.73rem", fontWeight:600,
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
        @media(max-width:700px){
          .sw{flex-wrap:nowrap;overflow-x:auto;-ms-overflow-style:none;scrollbar-width:none;}
          .sw::-webkit-scrollbar{display:none;}
          .ppd{padding:1.5rem 1.25rem !important;}
        }
      `}</style>

      <div className="ppd" style={{ maxWidth:"1200px", margin:"0 auto", padding:"2.5rem 3.5rem" }}>

        {/* Header */}
        <div style={{ marginBottom:"1.75rem" }}>
          <p style={{ fontFamily:gs, color:c.muted, fontSize:"0.65rem", letterSpacing:"0.18em", textTransform:"uppercase", marginBottom:"0.4rem", fontWeight:600 }}>Discovery</p>
          <h1 style={{ fontFamily:gs, fontSize:"clamp(1.5rem,3vw,2.2rem)", fontWeight:700, color:c.text }}>Markets Overview</h1>
        </div>

        {/* Demo data banner */}
        {isMock && (
          <div style={{ background:mode==="dark"?"rgba(244,162,0,0.08)":"rgba(180,83,9,0.07)", border:`1px solid ${c.amber}40`, borderRadius:"8px", padding:"9px 14px", marginBottom:"1.25rem", display:"flex", alignItems:"center", gap:"0.6rem" }}>
            <span style={{ color:c.amber, fontSize:"0.8rem" }}>⚠</span>
            <span style={{ fontFamily:gs, fontSize:"0.76rem", color:c.amber }}>
              Demo data · Upgrade to <strong>FMP Starter ($29/mo)</strong> at financialmodelingprep.com for live prices
            </span>
          </div>
        )}

        {/* Search */}
        <div style={{ position:"relative", marginBottom:"1.25rem" }}>
          <span style={{ position:"absolute", left:"14px", top:"50%", transform:"translateY(-50%)", color:c.muted, fontSize:"0.9rem", pointerEvents:"none" }}>⌕</span>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            onFocus={()=>setSfoc(true)} onBlur={()=>setSfoc(false)}
            placeholder="Ticker, company or keyword..."
            className={sfoc?"rbow":""}
            style={{ width:"100%", background:c.card, border:`1px solid ${sfoc?c.borderHi:c.border}`, borderRadius:"8px", padding:"11px 14px 11px 36px", color:c.text, fontSize:"0.9rem", fontFamily:gs, outline:"none", transition:"border-color 0.18s" }}
          />
          {search && <button onClick={()=>setSearch("")} style={{ position:"absolute", right:"12px", top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:c.muted, cursor:"pointer", fontSize:"0.85rem" }}>✕</button>}
        </div>

        {/* View selector */}
        {!search && (
          <div style={{ display:"flex", gap:"0.4rem", marginBottom:"1rem" }}>
            {VIEWS.map(v=>(
              <button key={v.id} onClick={()=>setView(v.id)}
                style={{ ...pill(view===v.id), borderRadius:"5px", padding:"6px 14px" }}>
                {v.label}
              </button>
            ))}
          </div>
        )}

        {/* Market filter */}
        <div className="sr" style={{ marginBottom:"0.6rem" }}>
          {MARKETS.map(m=>(
            <button key={m.id} onClick={()=>m.on&&setMarket(m.id)}
              title={m.on?m.label:"Coming soon"}
              style={{ ...pill(market===m.id), opacity:m.on?1:0.4, cursor:m.on?"pointer":"default" }}>
              {m.label}
            </button>
          ))}
        </div>

        {/* Sector filter */}
        <div className="sw" style={{ marginBottom:"1.5rem" }}>
          {SECTORS.map(s=>(
            <button key={s} onClick={()=>setSector(s)} style={pill(sector===s)}>{s}</button>
          ))}
        </div>

        {/* Results bar */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem" }}>
          <span style={{ fontFamily:gs, fontSize:"0.74rem", color:c.muted }}>
            {loading?"Loading…":`${filtered.length} stock${filtered.length!==1?"s":""}`}
          </span>
          {error && (
            <span style={{ fontFamily:gs, fontSize:"0.74rem", color:c.red }}>
              {error.includes("403")||error.includes("402")||error.includes("401")
                ? "FMP plan upgrade needed"
                : error.includes("429") ? "Rate limit — try shortly"
                : `Error: ${error.slice(0,50)}`}
            </span>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="sk" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))", gap:"1.1rem" }}>
            {Array.from({length:12}).map((_,i)=><SkeletonCard key={i} c={c}/>)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:"center", padding:"5rem 0" }}>
            <p style={{ fontFamily:gs, color:c.muted, fontSize:"0.95rem", marginBottom:"1rem" }}>
              {search?`No results for "${search}"`:"No stocks match your filters."}
            </p>
            <button onClick={()=>{setMarket("All");setSector("All");setSearch("");}}
              style={{ background:"none", border:`1px solid ${c.border}`, borderRadius:"6px", padding:"8px 20px", color:c.muted, fontFamily:gs, fontSize:"0.82rem", cursor:"pointer" }}>
              Clear filters
            </button>
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))", gap:"1.1rem" }}>
            {filtered.map(s=>(
              <StockCard key={s.ticker} s={s} c={c}
                isActive={s.ticker === activeTickerParam}
                onClick={openStock}
              />
            ))}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <p style={{ fontFamily:gs, color:c.muted, fontSize:"0.7rem", textAlign:"center", marginTop:"2rem" }}>
            For informational purposes only · Not financial advice · Data via Financial Modeling Prep
          </p>
        )}
      </div>

      {/* Slide-over panel */}
      {activeTickerParam && (
        <StockPanel
          stock={activeStock || { ticker:activeTickerParam, name:activeTickerParam, market:"US", chg:null, price:null, score:null, sector:"—", exchange:"—" }}
          c={c} mode={mode}
          onClose={closePanel}
          onFullAnalysis={goFullAnalysis}
        />
      )}
    </div>
  );
}