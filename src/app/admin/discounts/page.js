"use client";
import { useState, useEffect, useCallback } from "react";
import { useTheme } from "@/lib/theme";
import { createClient } from "@/lib/supabase";

const C = {
  dark:  { bg:"#090909", card:"#111113", surface:"#141416", border:"#232325", borderHi:"#333336", text:"#F0F0F0", muted:"#7A7A80", green:"#00E676", greenDim:"rgba(0,230,118,0.10)", red:"#FF1800", redDim:"rgba(255,24,0,0.08)" },
  light: { bg:"#F7F7F5", card:"#FFFFFF",  surface:"#EEEEED", border:"#DEDEDD",  borderHi:"#BABAB8", text:"#0A0A0A", muted:"#606065", green:"#008A38", greenDim:"rgba(0,138,56,0.09)", red:"#CC0000", redDim:"rgba(204,0,0,0.08)" },
};
const gs = "'Google Sans Flex','DM Sans',sans-serif";

const EMPTY = { code:"", discount:"", description:"", active:false, expires_at:"", max_uses:"" };

function Toggle({ on, onChange, c }) {
  return (
    <div onClick={onChange} style={{ width:"38px", height:"22px", borderRadius:"11px", background:on?c.green:c.surface, border:`1px solid ${on?c.green:c.border}`, cursor:"pointer", position:"relative", transition:"all 0.2s", flexShrink:0 }}>
      <div style={{ position:"absolute", top:"2px", left:on?"18px":"2px", width:"16px", height:"16px", borderRadius:"50%", background:on?"#050505":"#888", transition:"left 0.2s" }}/>
    </div>
  );
}

export default function DiscountsPage() {
  const { mode } = useTheme();
  const c = C[mode];
  const supabase = createClient();

  const [codes,   setCodes]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [token,   setToken]   = useState(null);
  const [form,    setForm]    = useState(EMPTY);
  const [saving,  setSaving]  = useState(false);
  const [showForm,setShowForm]= useState(false);
  const [err,     setErr]     = useState(null);

  const load = useCallback(async (tok) => {
    const res  = await fetch("/api/admin/discounts", { headers:{ Authorization:`Bearer ${tok}` } });
    const data = await res.json();
    setCodes(data.codes || []);
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
    if (!form.code.trim() || !form.discount) { setErr("Code and discount % are required."); setSaving(false); return; }
    const body = { ...form, discount:+form.discount, max_uses:form.max_uses?+form.max_uses:null, expires_at:form.expires_at||null };
    const res  = await fetch("/api/admin/discounts", { method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}` }, body:JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) { setErr(data.error||"Save failed."); setSaving(false); return; }
    setCodes(prev => [data.code, ...prev]);
    setForm(EMPTY); setShowForm(false); setSaving(false);
  };

  const toggleActive = async (code) => {
    await fetch("/api/admin/discounts", { method:"PATCH", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}` }, body:JSON.stringify({ id:code.id, active:!code.active }) });
    setCodes(prev => prev.map(c => c.id===code.id ? {...c,active:!c.active} : c));
  };

  const del = async (id) => {
    if (!confirm("Delete this discount code?")) return;
    await fetch(`/api/admin/discounts?id=${id}`, { method:"DELETE", headers:{ Authorization:`Bearer ${token}` } });
    setCodes(prev => prev.filter(c => c.id !== id));
  };

  const inp = { background:c.surface, border:`1px solid ${c.border}`, borderRadius:"6px", padding:"9px 12px", color:c.text, fontSize:"0.85rem", fontFamily:gs, width:"100%" };

  return (
    <div style={{ padding:"2rem 2.5rem", maxWidth:"900px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:"2rem", flexWrap:"wrap", gap:"1rem" }}>
        <div>
          <p style={{ fontFamily:gs, fontSize:"0.62rem", color:c.muted, letterSpacing:"0.14em", textTransform:"uppercase", fontWeight:600, marginBottom:"0.3rem" }}>Admin</p>
          <h1 style={{ fontFamily:gs, fontSize:"1.8rem", fontWeight:700, color:c.text }}>Discount Codes</h1>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          style={{ background:c.text, color:c.bg, border:"none", borderRadius:"7px", padding:"9px 20px", fontFamily:gs, fontSize:"0.84rem", fontWeight:600, cursor:"pointer" }}>
          {showForm ? "Cancel" : "+ New Code"}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={save} style={{ background:c.card, border:`1px solid ${c.borderHi}`, borderRadius:"12px", padding:"1.5rem", marginBottom:"1.5rem" }}>
          <p style={{ fontFamily:gs, fontSize:"0.8rem", fontWeight:600, color:c.text, marginBottom:"1.1rem" }}>New Discount Code</p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:"0.85rem", marginBottom:"1rem" }}>
            {[
              { key:"code",        label:"Code *",            placeholder:"e.g. LAUNCH20",  type:"text"   },
              { key:"discount",    label:"Discount % *",      placeholder:"e.g. 20",         type:"number" },
              { key:"description", label:"Description",       placeholder:"Internal note",   type:"text"   },
              { key:"max_uses",    label:"Max uses",          placeholder:"Leave blank = ∞", type:"number" },
              { key:"expires_at",  label:"Expires",           placeholder:"",                type:"datetime-local" },
            ].map(({ key, label, placeholder, type }) => (
              <div key={key}>
                <label style={{ display:"block", fontFamily:gs, fontSize:"0.65rem", color:c.muted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"5px", fontWeight:600 }}>{label}</label>
                <input type={type} placeholder={placeholder} value={form[key]} onChange={e => setForm(p=>({...p,[key]:e.target.value}))} style={inp}/>
              </div>
            ))}
            <div style={{ display:"flex", alignItems:"center", gap:"0.6rem", paddingTop:"1.1rem" }}>
              <Toggle on={form.active} onChange={() => setForm(p=>({...p,active:!p.active}))} c={c}/>
              <span style={{ fontFamily:gs, fontSize:"0.82rem", color:c.muted }}>Active on create</span>
            </div>
          </div>
          {err && <p style={{ fontFamily:gs, fontSize:"0.8rem", color:c.red, marginBottom:"0.75rem" }}>{err}</p>}
          <button type="submit" disabled={saving}
            style={{ background:c.green, color:"#050505", border:"none", borderRadius:"6px", padding:"9px 22px", fontFamily:gs, fontSize:"0.84rem", fontWeight:700, cursor:saving?"not-allowed":"pointer", opacity:saving?0.65:1 }}>
            {saving ? "Saving…" : "Create Code"}
          </button>
        </form>
      )}

      {/* Codes table */}
      <div style={{ background:c.card, border:`1px solid ${c.border}`, borderRadius:"12px", overflow:"hidden" }}>
        {loading ? (
          <div style={{ padding:"2rem", display:"flex", flexDirection:"column", gap:"10px" }}>
            {Array.from({length:3}).map((_,i)=><div key={i} style={{ height:"44px", background:c.surface, borderRadius:"6px", animation:"pulse 1.4s ease infinite" }}/>)}
          </div>
        ) : codes.length === 0 ? (
          <div style={{ padding:"3rem", textAlign:"center" }}>
            <p style={{ fontFamily:gs, color:c.muted, fontSize:"0.85rem" }}>No discount codes yet. Create one above.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1.5fr 1fr 1fr 1fr auto", gap:"0.5rem", padding:"0.6rem 1.25rem", borderBottom:`1px solid ${c.border}`, background:c.surface }}>
              {["Code","Discount","Description","Uses","Expires","Active",""].map(h=>(
                <span key={h} style={{ fontFamily:gs, fontSize:"0.62rem", color:c.muted, letterSpacing:"0.08em", textTransform:"uppercase", fontWeight:600 }}>{h}</span>
              ))}
            </div>
            {codes.map((code, i) => {
              const expired = code.expires_at && new Date(code.expires_at) < new Date();
              return (
                <div key={code.id} style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1.5fr 1fr 1fr 1fr auto", gap:"0.5rem", padding:"0.85rem 1.25rem", alignItems:"center", borderBottom:i<codes.length-1?`1px solid ${c.border}`:"none" }}>
                  <span style={{ fontFamily:"'SF Mono','Fira Code',monospace", fontSize:"0.84rem", fontWeight:700, color:c.text, letterSpacing:"0.05em" }}>{code.code}</span>
                  <span style={{ fontFamily:gs, fontSize:"0.84rem", fontWeight:700, color:c.green }}>{code.discount}%</span>
                  <span style={{ fontFamily:gs, fontSize:"0.78rem", color:c.muted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{code.description||"—"}</span>
                  <span style={{ fontFamily:gs, fontSize:"0.78rem", color:c.muted }}>{code.used_count||0}{code.max_uses?` / ${code.max_uses}`:" / ∞"}</span>
                  <span style={{ fontFamily:gs, fontSize:"0.74rem", color:expired?c.red:c.muted }}>
                    {code.expires_at ? new Date(code.expires_at).toLocaleDateString("en-GB") : "Never"}
                  </span>
                  <Toggle on={code.active} onChange={() => toggleActive(code)} c={c}/>
                  <button onClick={() => del(code.id)} style={{ background:"none", border:"none", cursor:"pointer", color:c.muted, fontSize:"0.8rem", padding:"2px 6px" }} title="Delete">✕</button>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}