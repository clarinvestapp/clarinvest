"use client";
import { useState, useEffect } from "react";
import { useTheme } from "@/lib/theme";
import { createClient } from "@/lib/supabase";

const C = {
  dark:  { bg:"#090909", card:"#111113", surface:"#141416", border:"#232325", text:"#F0F0F0", muted:"#7A7A80", green:"#00E676", greenDim:"rgba(0,230,118,0.10)", blue:"#4488FF", red:"#FF1800", amber:"#F59E0B" },
  light: { bg:"#F7F7F5", card:"#FFFFFF",  surface:"#EEEEED", border:"#DEDEDD",  text:"#0A0A0A", muted:"#606065", green:"#008A38", greenDim:"rgba(0,138,56,0.09)", blue:"#1E55CC", red:"#CC0000", amber:"#B45309" },
};
const gs = "'Google Sans Flex','DM Sans',sans-serif";

function StatCard({ label, value, sub, color, c }) {
  return (
    <div style={{ background:c.card, border:`1px solid ${c.border}`, borderRadius:"12px", padding:"1.25rem 1.5rem" }}>
      <p style={{ fontFamily:gs, fontSize:"0.62rem", color:c.muted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"0.5rem", fontWeight:600 }}>{label}</p>
      <p style={{ fontFamily:gs, fontSize:"1.8rem", fontWeight:700, color:color||c.text, lineHeight:1 }}>{value}</p>
      {sub && <p style={{ fontFamily:gs, fontSize:"0.74rem", color:c.muted, marginTop:"4px" }}>{sub}</p>}
    </div>
  );
}

function Sk({ c, h="40px", w="100%" }) {
  return <div style={{ width:w, height:h, background:c.surface, borderRadius:"6px", animation:"pulse 1.4s ease infinite" }}/>;
}

export default function AdminStatsPage() {
  const { mode } = useTheme();
  const c = C[mode];
  const supabase = createClient();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data:{ session } }) => {
      if (!session) return;
      fetch("/api/admin/stats", { headers:{ Authorization:`Bearer ${session.access_token}` } })
        .then(r => r.json()).then(d => { setData(d); setLoading(false); });
    });
  }, []);

  const plans   = data?.plans || {};
  const total   = data?.total || 0;
  const mrr     = data?.mrr   || 0;

  const planColor = (p) => p==="ultimate"?c.amber:p==="pro"?c.green:c.blue;

  return (
    <div style={{ padding:"2rem 2.5rem", maxWidth:"1100px" }}>
      <div style={{ marginBottom:"2rem" }}>
        <p style={{ fontFamily:gs, fontSize:"0.62rem", color:c.muted, letterSpacing:"0.14em", textTransform:"uppercase", fontWeight:600, marginBottom:"0.3rem" }}>Admin</p>
        <h1 style={{ fontFamily:gs, fontSize:"1.8rem", fontWeight:700, color:c.text }}>Overview</h1>
      </div>

      {/* Key metrics */}
      {loading ? (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:"1rem", marginBottom:"2rem" }}>
          {Array.from({length:6}).map((_,i)=><Sk key={i} c={c} h="96px"/>)}
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:"1rem", marginBottom:"2rem" }}>
          <StatCard label="Total Subscribers" value={total} c={c}/>
          <StatCard label="Est. MRR" value={`£${mrr}`} sub="based on monthly prices" color={c.green} c={c}/>
          <StatCard label="AI Summaries" value={data?.summaries||0} sub="this month" c={c}/>
          <StatCard label="Full Reports" value={data?.reports||0} sub="this month" c={c}/>
          <StatCard label="Essential" value={plans.essential||0} color={c.blue} c={c}/>
          <StatCard label="Pro" value={plans.pro||0} color={c.green} c={c}/>
          <StatCard label="Ultimate" value={plans.ultimate||0} color={c.amber} c={c}/>
          <StatCard label="Cancelled" value={plans.cancelled||0} color={c.red} c={c}/>
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1.5rem" }}>
        {/* Top tickers */}
        <div style={{ background:c.card, border:`1px solid ${c.border}`, borderRadius:"12px", padding:"1.25rem 1.5rem" }}>
          <p style={{ fontFamily:gs, fontSize:"0.72rem", color:c.muted, letterSpacing:"0.1em", textTransform:"uppercase", fontWeight:600, marginBottom:"1rem" }}>Most Analysed Stocks</p>
          {loading ? Array.from({length:5}).map((_,i)=><Sk key={i} c={c} h="28px" w="100%"/>) :
            (data?.topTickers||[]).length === 0 ? (
              <p style={{ fontFamily:gs, color:c.muted, fontSize:"0.82rem" }}>No analyses yet.</p>
            ) : (data?.topTickers||[]).map((t,i) => (
              <div key={t.ticker} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", borderBottom:i<(data.topTickers.length-1)?`1px solid ${c.border}`:"none" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"0.6rem" }}>
                  <span style={{ fontFamily:gs, fontSize:"0.68rem", color:c.muted, width:"16px" }}>{i+1}</span>
                  <span style={{ fontFamily:gs, fontSize:"0.84rem", fontWeight:600, color:c.text }}>{t.ticker}</span>
                </div>
                <span style={{ fontFamily:gs, fontSize:"0.76rem", color:c.muted }}>{t.count} {t.count===1?"analysis":"analyses"}</span>
              </div>
            ))
          }
        </div>

        {/* Recent signups */}
        <div style={{ background:c.card, border:`1px solid ${c.border}`, borderRadius:"12px", padding:"1.25rem 1.5rem" }}>
          <p style={{ fontFamily:gs, fontSize:"0.72rem", color:c.muted, letterSpacing:"0.1em", textTransform:"uppercase", fontWeight:600, marginBottom:"1rem" }}>Recent Signups</p>
          {loading ? Array.from({length:5}).map((_,i)=><Sk key={i} c={c} h="28px" w="100%"/>) :
            (data?.recent||[]).length === 0 ? (
              <p style={{ fontFamily:gs, color:c.muted, fontSize:"0.82rem" }}>No subscribers yet.</p>
            ) : (data?.recent||[]).map((u,i) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", borderBottom:i<(data.recent.length-1)?`1px solid ${c.border}`:"none" }}>
                <div>
                  <p style={{ fontFamily:gs, fontSize:"0.8rem", color:c.text, fontWeight:500 }}>{u.email}</p>
                  <p style={{ fontFamily:gs, fontSize:"0.68rem", color:c.muted }}>{new Date(u.joined).toLocaleDateString("en-GB")}</p>
                </div>
                <span style={{ fontFamily:gs, fontSize:"0.68rem", fontWeight:700, color:planColor(u.plan), textTransform:"capitalize", background:`${planColor(u.plan)}18`, border:`1px solid ${planColor(u.plan)}40`, borderRadius:"4px", padding:"2px 8px" }}>
                  {u.plan}
                </span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}