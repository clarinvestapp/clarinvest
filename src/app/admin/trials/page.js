"use client";
import { useState, useEffect, useCallback } from "react";
import { useTheme } from "@/lib/theme";
import { createClient } from "@/lib/supabase";

const C = {
  dark:  { bg:"#090909", card:"#111113", surface:"#141416", border:"#232325", borderHi:"#333336", text:"#F0F0F0", muted:"#7A7A80", green:"#00E676", amber:"#F59E0B", blue:"#4488FF", red:"#FF1800" },
  light: { bg:"#F7F7F5", card:"#FFFFFF",  surface:"#EEEEED", border:"#DEDEDD",  borderHi:"#BABAB8", text:"#0A0A0A", muted:"#606065", green:"#008A38", amber:"#B45309", blue:"#1E55CC", red:"#CC0000" },
};
const gs = "'Google Sans Flex','DM Sans',sans-serif";

function Toggle({ on, onChange, c }) {
  return (
    <div onClick={onChange} style={{ width:"38px", height:"22px", borderRadius:"11px", background:on?c.green:c.surface, border:`1px solid ${on?c.green:c.border}`, cursor:"pointer", position:"relative", transition:"all 0.2s", flexShrink:0 }}>
      <div style={{ position:"absolute", top:"2px", left:on?"18px":"2px", width:"16px", height:"16px", borderRadius:"50%", background:on?"#050505":"#888", transition:"left 0.2s" }}/>
    </div>
  );
}

const PLAN_COLOR = (p, c) => p==="ultimate"?c.amber:p==="pro"?c.green:c.blue;

export default function TrialsPage() {
  const { mode } = useTheme();
  const c = C[mode];
  const supabase = createClient();

  const [codes,    setCodes]    = useState([]);
  const [usage,    setUsage]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [token,    setToken]    = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [form,     setForm]     = useState({ plan:"essential", duration_days:"14", max_uses:"1", note:"", code:"" });
  const [err,      setErr]      = useState(null);
  const [copied,   setCopied]   = useState(null);

  const load = useCallback(async (tok) => {
    const res  = await fetch("/api/admin/trials", { headers:{ Authorization:`Bearer ${tok}` } });
    const data = await res.json();
    setCodes(data.codes||[]);
    setUsage(data.usage||[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data:{ session } }) => {
      if (!session) return;
      setToken(session.access_token);
      load(session.access_token);
    });
  }, []);

  const save = async (e) => {
    e.preventDefault(); setSaving(true); setErr(null);
    const body = { plan:form.plan, duration_days:+form.duration_days, max_uses:+form.max_uses, note:form.note, code:form.code||undefined };
    const res  = await fetch("/api/admin/trials", { method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}` }, body:JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) { setErr(data.error||"Failed"); setSaving(false); return; }
    setCodes(prev => [data.code, ...prev]);
    setForm({ plan:"essential", duration_days:"14", max_uses:"1", note:"", code:"" });
    setShowForm(false); setSaving(false);
  };

  const toggleActive = async (code) => {
    await fetch("/api/admin/trials", { method:"PATCH", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}` }, body:JSON.stringify({ id:code.id, active:!code.active }) });
    setCodes(prev => prev.map(t => t.id===code.id ? {...t,active:!t.active} : t));
  };

  const del = async (id) => {
    if (!confirm("Delete this trial code?")) return;
    await fetch(`/api/admin/trials?id=${id}`, { method:"DELETE", headers:{ Authorization:`Bearer ${token}` } });
    setCodes(prev => prev.filter(t => t.id !== id));
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 1800);
  };

  const inp = { background:c.surface, border:`1px solid ${c.border}`, borderRadius:"6px", padding:"9px 12px", color:c.text, fontSize:"0.85rem", fontFamily:gs, width:"100%" };

  const usageForCode = (id) => usage.filter(u => u.code_id === id);

  return (
    <div style={{ padding:"2rem 2.5rem", maxWidth:"900px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:"2rem", flexWrap:"wrap", gap:"1rem" }}>
        <div>
          <p style={{ fontFamily:gs, fontSize:"0.62rem", color:c.muted, letterSpacing:"0.14em", textTransform:"uppercase", fontWeight:600, marginBottom:"0.3rem" }}>Admin</p>
          <h1 style={{ fontFamily:gs, fontSize:"1.8rem", fontWeight:700, color:c.text }}>Trial Codes</h1>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          style={{ background:c.text, color:c.bg, border:"none", borderRadius:"7px", padding:"9px 20px", fontFamily:gs, fontSize:"0.84rem", fontWeight:600, cursor:"pointer" }}>
          {showForm ? "Cancel" : "+ Generate Trial"}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={save} style={{ background:c.card, border:`1px solid ${c.borderHi}`, borderRadius:"12px", padding:"1.5rem", marginBottom:"1.5rem" }}>
          <p style={{ fontFamily:gs, fontSize:"0.8rem", fontWeight:600, color:c.text, marginBottom:"1.1rem" }}>New Trial Code</p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:"0.85rem", marginBottom:"1rem" }}>
            <div>
              <label style={{ display:"block", fontFamily:gs, fontSize:"0.65rem", color:c.muted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"5px", fontWeight:600 }}>Plan</label>
              <select value={form.plan} onChange={e=>setForm(p=>({...p,plan:e.target.value}))} style={inp}>
                <option value="essential">Essential</option>
                <option value="pro">Pro</option>
                <option value="ultimate">Ultimate</option>
              </select>
            </div>
            <div>
              <label style={{ display:"block", fontFamily:gs, fontSize:"0.65rem", color:c.muted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"5px", fontWeight:600 }}>Duration (days)</label>
              <input type="number" value={form.duration_days} onChange={e=>setForm(p=>({...p,duration_days:e.target.value}))} style={inp}/>
            </div>
            <div>
              <label style={{ display:"block", fontFamily:gs, fontSize:"0.65rem", color:c.muted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"5px", fontWeight:600 }}>Max uses</label>
              <input type="number" value={form.max_uses} onChange={e=>setForm(p=>({...p,max_uses:e.target.value}))} style={inp}/>
            </div>
            <div>
              <label style={{ display:"block", fontFamily:gs, fontSize:"0.65rem", color:c.muted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"5px", fontWeight:600 }}>Custom code (optional)</label>
              <input type="text" placeholder="Auto-generated if blank" value={form.code} onChange={e=>setForm(p=>({...p,code:e.target.value}))} style={inp}/>
            </div>
            <div style={{ gridColumn:"1/-1" }}>
              <label style={{ display:"block", fontFamily:gs, fontSize:"0.65rem", color:c.muted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"5px", fontWeight:600 }}>Internal note</label>
              <input type="text" placeholder="e.g. Press kit for TechCrunch" value={form.note} onChange={e=>setForm(p=>({...p,note:e.target.value}))} style={inp}/>
            </div>
          </div>
          {err && <p style={{ fontFamily:gs, fontSize:"0.8rem", color:c.red, marginBottom:"0.75rem" }}>{err}</p>}
          <button type="submit" disabled={saving}
            style={{ background:c.green, color:"#050505", border:"none", borderRadius:"6px", padding:"9px 22px", fontFamily:gs, fontSize:"0.84rem", fontWeight:700, cursor:saving?"not-allowed":"pointer", opacity:saving?0.65:1 }}>
            {saving ? "Generating…" : "Generate Trial Code"}
          </button>
        </form>
      )}

      {/* Trial codes list */}
      <div style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
        {loading ? Array.from({length:3}).map((_,i)=>(
          <div key={i} style={{ height:"100px", background:c.card, borderRadius:"12px", animation:"pulse 1.4s ease infinite" }}/>
        )) : codes.length === 0 ? (
          <div style={{ background:c.card, border:`1px solid ${c.border}`, borderRadius:"12px", padding:"3rem", textAlign:"center" }}>
            <p style={{ fontFamily:gs, color:c.muted, fontSize:"0.85rem" }}>No trial codes yet. Generate one above.</p>
          </div>
        ) : codes.map(code => {
          const planCol = PLAN_COLOR(code.plan, c);
          const codeUsage = usageForCode(code.id);
          const exhausted = code.used_count >= code.max_uses;
          return (
            <div key={code.id} style={{ background:c.card, border:`1px solid ${c.border}`, borderRadius:"12px", padding:"1.25rem 1.5rem" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:"0.75rem", marginBottom:"0.75rem" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"0.75rem", flexWrap:"wrap" }}>
                  {/* Code with copy */}
                  <button onClick={() => copyCode(code.code)}
                    title="Click to copy"
                    style={{ background:c.surface, border:`1px solid ${c.border}`, borderRadius:"6px", padding:"5px 12px", cursor:"pointer", display:"flex", alignItems:"center", gap:"6px", color:c.text }}>
                    <span style={{ fontFamily:"'SF Mono','Fira Code',monospace", fontSize:"0.9rem", fontWeight:700, letterSpacing:"0.06em" }}>{code.code}</span>
                    <span style={{ fontSize:"0.7rem", color:c.muted }}>{copied===code.code?"✓ Copied":"⎘"}</span>
                  </button>
                  {/* Plan badge */}
                  <span style={{ fontFamily:gs, fontSize:"0.68rem", fontWeight:700, color:planCol, background:`${planCol}18`, border:`1px solid ${planCol}40`, borderRadius:"4px", padding:"3px 9px", textTransform:"capitalize" }}>
                    {code.plan}
                  </span>
                  {/* Duration */}
                  <span style={{ fontFamily:gs, fontSize:"0.76rem", color:c.muted }}>{code.duration_days} days</span>
                  {/* Usage */}
                  <span style={{ fontFamily:gs, fontSize:"0.76rem", color:exhausted?c.red:c.muted }}>
                    {code.used_count}/{code.max_uses} used {exhausted&&"· Exhausted"}
                  </span>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:"0.75rem" }}>
                  <Toggle on={code.active} onChange={() => toggleActive(code)} c={c}/>
                  <button onClick={() => del(code.id)} style={{ background:"none", border:"none", cursor:"pointer", color:c.muted, fontSize:"0.8rem", padding:"2px 6px" }}>✕</button>
                </div>
              </div>
              {code.note && <p style={{ fontFamily:gs, fontSize:"0.76rem", color:c.muted, marginBottom:"0.5rem" }}>Note: {code.note}</p>}
              {codeUsage.length > 0 && (
                <div style={{ borderTop:`1px solid ${c.border}`, paddingTop:"0.6rem", display:"flex", flexWrap:"wrap", gap:"0.5rem" }}>
                  <span style={{ fontFamily:gs, fontSize:"0.64rem", color:c.muted, letterSpacing:"0.07em", textTransform:"uppercase", fontWeight:600, marginRight:"0.3rem" }}>Used by:</span>
                  {codeUsage.map((u,i)=>(
                    <span key={i} style={{ fontFamily:gs, fontSize:"0.72rem", color:c.text, background:c.surface, borderRadius:"4px", padding:"2px 8px" }}>{u.user_email}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}