"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useTheme } from "@/lib/theme";

const C = {
  dark:  { bg:"#090909", card:"#111113", surface:"#141416", border:"#232325", borderHi:"#333336", text:"#F0F0F0", muted:"#7A7A80", green:"#00E676", blue:"#4488FF", red:"#FF1800", cg:"linear-gradient(145deg,#131316,#0F0F12)", cgh:"linear-gradient(145deg,#1C1C20,#141418)" },
  light: { bg:"#F7F7F5", card:"#FFFFFF",  surface:"#EEEEED", border:"#DEDEDD",  borderHi:"#BABAB8", text:"#0A0A0A", muted:"#606065", green:"#008A38", blue:"#1E55CC", red:"#CC0000", cg:"linear-gradient(145deg,#FFFFFF,#F2F2F0)", cgh:"linear-gradient(145deg,#F5F5F3,#EBEBEA)" },
};
const gs = "'Google Sans Flex','DM Sans',sans-serif";

function FlagImg({ market, height = 16 }) {
  const codes = { US:"us", UK:"uk", EU:"eu" };
  return (
    <img src={`/flags/${codes[market]||"us"}.svg`} alt={market}
      style={{ height, width:Math.round(height*1.35), display:"inline-block", verticalAlign:"middle", borderRadius:"1px" }}
    />
  );
}

function WatchlistCard({ s, c, onRemove, onClick }) {
  const [hov, setHov] = useState(false);
  const [removing, setRemoving] = useState(false);
  const pos = (s.chg ?? 0) >= 0;
  const hasPrice = s.price != null;

  const handleRemove = async (e) => {
    e.stopPropagation();
    setRemoving(true);
    await onRemove(s.ticker);
  };

  return (
    <div onClick={() => onClick(s.ticker)}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background:hov?c.cgh:c.cg, border:`1px solid ${hov?c.borderHi:c.border}`, borderRadius:"16px", padding:"1.5rem 1.4rem", cursor:"pointer", transition:"all 0.22s", transform:hov?"translateY(-4px)":"none", boxShadow:hov?"0 10px 32px rgba(0,0,0,0.25)":"0 1px 8px rgba(0,0,0,0.06)", position:"relative" }}>

      {/* Remove button */}
      <button onClick={handleRemove} disabled={removing}
        title="Remove from watchlist"
        style={{ position:"absolute", top:"0.9rem", right:"0.9rem", background:hov?c.surface:"transparent", border:`1px solid ${hov?c.borderHi:"transparent"}`, borderRadius:"6px", padding:"3px 7px", cursor:"pointer", color:c.muted, fontSize:"0.75rem", transition:"all 0.18s", opacity:removing?0.4:1 }}>
        {removing ? "…" : "✕"}
      </button>

      {/* Ticker + name */}
      <div style={{ paddingRight:"2rem", marginBottom:"0.85rem" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"0.45rem", marginBottom:"0.25rem" }}>
          <FlagImg market={s.market||"US"} height={15}/>
          <span style={{ fontFamily:gs, fontSize:"1.05rem", fontWeight:700, color:c.text }}>{s.ticker}</span>
        </div>
        <p style={{ fontFamily:gs, fontSize:"0.72rem", color:c.muted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.name}</p>
      </div>

      {/* Price */}
      <div style={{ marginBottom:"0.85rem" }}>
        {hasPrice ? (
          <>
            <span style={{ fontFamily:gs, fontSize:"1.4rem", fontWeight:700, color:c.text }}>${s.price.toFixed(2)}</span>
            <span style={{ fontFamily:gs, fontSize:"0.84rem", fontWeight:700, color:pos?c.green:c.red, marginLeft:"0.5rem" }}>
              {pos?"▲":"▼"} {Math.abs(s.chg||0).toFixed(2)}%
            </span>
          </>
        ) : (
          <span style={{ fontFamily:gs, fontSize:"0.78rem", color:c.muted, fontStyle:"italic" }}>Price loading…</span>
        )}
      </div>

      {/* Footer */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingTop:"0.7rem", borderTop:`1px solid ${c.border}` }}>
        <div style={{ display:"flex", gap:"0.35rem" }}>
          <span style={{ fontFamily:gs, fontSize:"0.6rem", color:c.muted, background:c.surface, border:`1px solid ${c.border}`, borderRadius:"4px", padding:"2px 7px" }}>{s.sector||"—"}</span>
          <span style={{ fontFamily:gs, fontSize:"0.6rem", color:c.muted, background:c.surface, border:`1px solid ${c.border}`, borderRadius:"4px", padding:"2px 7px" }}>{s.market||"US"}</span>
        </div>
        <span style={{ fontFamily:gs, fontSize:"0.65rem", color:c.muted }}>View →</span>
      </div>
    </div>
  );
}

function SkeletonCard({ c }) {
  return (
    <div style={{ background:c.cg, border:`1px solid ${c.border}`, borderRadius:"16px", padding:"1.5rem 1.4rem" }}>
      {[["80px","15px"],["130px","11px"]].map(([w,h],i)=>(
        <div key={i} style={{ width:w, height:h, background:c.surface, borderRadius:"4px", marginBottom:"8px", animation:"pulse 1.4s ease infinite" }}/>
      ))}
      <div style={{ width:"100px", height:"22px", background:c.surface, borderRadius:"4px", margin:"0.6rem 0" }}/>
      <div style={{ height:"1px", background:c.border, margin:"0.7rem 0" }}/>
      <div style={{ display:"flex", gap:"0.35rem" }}>
        <div style={{ width:"60px", height:"18px", background:c.surface, borderRadius:"4px" }}/>
        <div style={{ width:"36px", height:"18px", background:c.surface, borderRadius:"4px" }}/>
      </div>
    </div>
  );
}

export default function WatchlistPage() {
  const { mode } = useTheme();
  const c = C[mode];
  const router   = useRouter();
  const supabase = createClient();

  const [stocks,  setStocks]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [token,   setToken]   = useState(null);

  const load = useCallback(async (tok) => {
    setLoading(true);
    try {
      const res  = await fetch("/api/watchlist", {
        headers: { Authorization:`Bearer ${tok}` }
      });
      const data = await res.json();
      setStocks(data.stocks || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data:{ session } }) => {
      if (!session) { router.push("/login"); return; }
      setToken(session.access_token);
      load(session.access_token);
    });
  }, []);

  const handleRemove = useCallback(async (ticker) => {
    await fetch(`/api/watchlist?ticker=${ticker}`, {
      method: "DELETE",
      headers: { Authorization:`Bearer ${token}` },
    });
    setStocks(prev => prev.filter(s => s.ticker !== ticker));
  }, [token]);

  return (
    <div style={{ background:c.bg, minHeight:"100vh", fontFamily:gs }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>

      <div style={{ maxWidth:"1200px", margin:"0 auto", padding:"2.5rem 3.5rem" }}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:"2rem", flexWrap:"wrap", gap:"1rem" }}>
          <div>
            <p style={{ fontFamily:gs, color:c.muted, fontSize:"0.65rem", letterSpacing:"0.18em", textTransform:"uppercase", marginBottom:"0.4rem", fontWeight:600 }}>Portfolio</p>
            <h1 style={{ fontFamily:gs, fontSize:"clamp(1.5rem,3vw,2.2rem)", fontWeight:700, color:c.text }}>
              Watchlist {!loading && stocks.length > 0 && (
                <span style={{ fontFamily:gs, fontSize:"1rem", fontWeight:400, color:c.muted }}>· {stocks.length} stock{stocks.length!==1?"s":""}</span>
              )}
            </h1>
          </div>
          <button onClick={() => router.push("/dashboard")}
            style={{ background:c.text, color:c.bg, border:"none", borderRadius:"6px", padding:"9px 20px", fontFamily:gs, fontSize:"0.82rem", fontWeight:600, cursor:"pointer" }}>
            + Add stocks
          </button>
        </div>

        {/* Grid */}
        {loading ? (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:"1.1rem" }}>
            {Array.from({length:6}).map((_,i)=><SkeletonCard key={i} c={c}/>)}
          </div>
        ) : stocks.length === 0 ? (
          /* Empty state */
          <div style={{ textAlign:"center", padding:"6rem 2rem" }}>
            <div style={{ fontSize:"2.5rem", marginBottom:"1rem" }}>♡</div>
            <h2 style={{ fontFamily:gs, fontSize:"1.3rem", fontWeight:700, color:c.text, marginBottom:"0.75rem" }}>Your watchlist is empty</h2>
            <p style={{ fontFamily:gs, color:c.muted, fontSize:"0.88rem", marginBottom:"1.5rem", maxWidth:"380px", margin:"0 auto 1.5rem" }}>
              Browse the Discovery page and tap the heart icon on any stock to add it here.
            </p>
            <button onClick={() => router.push("/dashboard")}
              style={{ background:c.text, color:c.bg, border:"none", borderRadius:"6px", padding:"11px 28px", fontFamily:gs, fontSize:"0.84rem", fontWeight:600, cursor:"pointer" }}>
              Go to Discovery →
            </button>
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:"1.1rem" }}>
            {stocks.map(s => (
              <WatchlistCard key={s.ticker} s={s} c={c}
                onRemove={handleRemove}
                onClick={(ticker) => router.push(`/dashboard/analysis/${ticker}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}