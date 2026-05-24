"use client";
import { useState, useEffect, useCallback } from "react";
import { useTheme } from "@/lib/theme";
import { createClient } from "@/lib/supabase";

const C = {
  dark:  { bg:"#090909", card:"#111113", surface:"#141416", border:"#232325", borderHi:"#333336", text:"#F0F0F0", muted:"#7A7A80", green:"#00E676", amber:"#F59E0B", blue:"#4488FF", red:"#FF1800", redDim:"rgba(255,24,0,0.08)" },
  light: { bg:"#F7F7F5", card:"#FFFFFF",  surface:"#EEEEED", border:"#DEDEDD",  borderHi:"#BABAB8", text:"#0A0A0A", muted:"#606065", green:"#008A38", amber:"#B45309", blue:"#1E55CC", red:"#CC0000", redDim:"rgba(204,0,0,0.08)" },
};
const gs = "'Google Sans Flex','DM Sans',sans-serif";
const TYPE_COLORS = {
  info:   (c) => c.blue,
  promo:  (c) => c.green,
  urgent: (c) => c.red,
};
const TARGETS = ["all","auth","essential","pro","ultimate"];
const EMPTY   = { text:"", type:"info", position:"top", target:"all", active:false, starts_at:"", ends_at:"" };

function Toggle({ on, onChange, c }) {
  return (
    <div onClick={onChange}
      style={{ width:"38px", height:"22px", borderRadius:"11px", background:on?c.green:c.surface, border:"1px solid "+(on?c.green:c.border), cursor:"pointer", position:"relative", transition:"all 0.2s", flexShrink:0 }}>
      <div style={{ position:"absolute", top:"2px", left:on?"18px":"2px", width:"16px", height:"16px", borderRadius:"50%", background:on?"#050505":"#888", transition:"left 0.2s" }}/>
    </div>
  );
}

export default function BannersPage() {
  const { mode } = useTheme();
  const c = C[mode];
  const supabase = createClient();

  const [banners,  setBanners]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState(EMPTY);
  const [editing,  setEditing]  = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState(null);
  const [dbg,      setDbg]      = useState(null); // debug info

  // ── Get fresh token every time ──────────────────────────────────────────────
  const getToken = useCallback(async () => {
    // Try refreshing the session first to ensure token is valid
    const { data:{ session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }, [supabase]);

  // ── Generic API call with full error visibility ──────────────────────────────
  const api = useCallback(async (method, body, qp) => {
    const token = await getToken();
    if (!token) throw new Error("No session — please sign out and back in.");
    const url  = "/api/admin/banners" + (qp ? "?" + qp : "");
    const opts = {
      method,
      headers: { "Content-Type":"application/json", Authorization:`Bearer ${token}` },
      ...(body ? { body: JSON.stringify(body) } : {}),
    };
    setDbg(`${method} ${url}`);
    const res  = await fetch(url, opts);
    const text = await res.text();
    setDbg(`${method} → ${res.status}: ${text.slice(0,120)}`);
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}: ${text.slice(0,80)}`);
    return data;
  }, [getToken]);

  // ── Load ─────────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const data = await api("GET");
      setBanners(data.banners || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { load(); }, [load]);

  // ── Save (create or update) ──────────────────────────────────────────────────
  const save = async (e) => {
    e.preventDefault();
    setErr(null);
    if (!form.text.trim()) { setErr("Banner text is required."); return; }
    setSaving(true);
    const body = { ...form, starts_at:form.starts_at||null, ends_at:form.ends_at||null };
    try {
      if (editing) {
        await api("PATCH", { id:editing, ...body });
        setBanners(prev => prev.map(b => b.id === editing ? { ...b, ...body, id:editing } : b));
        setEditing(null);
      } else {
        const data = await api("POST", body);
        setBanners(prev => [data.banner, ...prev]);
      }
      setForm(EMPTY);
      setShowForm(false);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle active ────────────────────────────────────────────────────────────
  const toggleActive = async (banner) => {
    const newVal = !banner.active;
    setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, active:newVal } : b));
    try {
      await api("PATCH", { id:banner.id, active:newVal });
    } catch (e) {
      // Revert on failure
      setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, active:banner.active } : b));
      setErr("Toggle failed: " + e.message);
    }
  };

  // ── Reorder ──────────────────────────────────────────────────────────────────
  const move = async (idx, dir) => {
    const next = [...banners];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setBanners(next);
    try {
      await Promise.all([
        api("PATCH", { id:next[idx].id, sort_order:idx }),
        api("PATCH", { id:next[swap].id, sort_order:swap }),
      ]);
    } catch { /* silent */ }
  };

  // ── Delete ───────────────────────────────────────────────────────────────────
  const del = async (id) => {
    if (!confirm("Delete this banner?")) return;
    setBanners(prev => prev.filter(b => b.id !== id));
    try { await api("DELETE", null, "id="+id); } catch { /* silent */ }
  };

  const startEdit = (banner) => {
    setForm({ text:banner.text, type:banner.type, position:banner.position, target:banner.target, active:banner.active, starts_at:banner.starts_at?.slice(0,16)||"", ends_at:banner.ends_at?.slice(0,16)||"" });
    setEditing(banner.id);
    setShowForm(true);
    window.scrollTo({ top:0, behavior:"smooth" });
  };

  const inp = { background:c.surface, border:"1px solid "+c.border, borderRadius:"6px", padding:"9px 12px", color:c.text, fontSize:"0.85rem", fontFamily:gs, width:"100%" };
  const sel = { ...inp, cursor:"pointer" };
  const typeCol = (type) => TYPE_COLORS[type]?.(c) || c.blue;

  return (
    <div style={{ padding:"2rem 2.5rem", maxWidth:"900px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:"2rem", flexWrap:"wrap", gap:"1rem" }}>
        <div>
          <p style={{ fontFamily:gs, fontSize:"0.62rem", color:c.muted, letterSpacing:"0.14em", textTransform:"uppercase", fontWeight:600, marginBottom:"0.3rem" }}>Admin</p>
          <h1 style={{ fontFamily:gs, fontSize:"1.8rem", fontWeight:700, color:c.text }}>Banners</h1>
        </div>
        <button onClick={() => { setEditing(null); setForm(EMPTY); setShowForm(!showForm); }}
          style={{ background:c.text, color:c.bg, border:"none", borderRadius:"7px", padding:"9px 20px", fontFamily:gs, fontSize:"0.84rem", fontWeight:600, cursor:"pointer" }}>
          {showForm && !editing ? "Cancel" : "+ New Banner"}
        </button>
      </div>

      {/* Debug strip — remove after testing */}
      {dbg && (
        <div style={{ background:"rgba(68,136,255,0.08)", border:"1px solid rgba(68,136,255,0.3)", borderRadius:"6px", padding:"7px 12px", marginBottom:"1rem", fontFamily:"monospace", fontSize:"0.72rem", color:c.blue, wordBreak:"break-all" }}>
          {dbg}
        </div>
      )}

      {/* Error display */}
      {err && (
        <div style={{ background:c.redDim, border:"1px solid "+c.red+"50", borderRadius:"8px", padding:"10px 14px", marginBottom:"1rem", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <p style={{ fontFamily:gs, fontSize:"0.82rem", color:c.red }}>{err}</p>
          <button onClick={()=>setErr(null)} style={{ background:"none", border:"none", cursor:"pointer", color:c.red, fontSize:"0.8rem" }}>✕</button>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form onSubmit={save} style={{ background:c.card, border:"1px solid "+c.borderHi, borderRadius:"12px", padding:"1.5rem", marginBottom:"1.5rem" }}>
          <p style={{ fontFamily:gs, fontSize:"0.8rem", fontWeight:600, color:c.text, marginBottom:"1.1rem" }}>{editing ? "Edit Banner" : "New Banner"}</p>
          <div style={{ marginBottom:"0.85rem" }}>
            <label style={{ display:"block", fontFamily:gs, fontSize:"0.65rem", color:c.muted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"5px", fontWeight:600 }}>Banner Text *</label>
            <textarea value={form.text} onChange={e=>setForm(p=>({...p,text:e.target.value}))} rows={2}
              placeholder="e.g. 🎉 20% off all annual plans — use code LAUNCH20" style={{ ...inp, resize:"vertical" }}/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:"0.85rem", marginBottom:"1rem" }}>
            {[
              { key:"type",     label:"Type",     el:"select", opts:[["info","Info"],["promo","Promo"],["urgent","Urgent"]] },
              { key:"position", label:"Position", el:"select", opts:[["top","Top"],["bottom","Bottom"]] },
              { key:"target",   label:"Show to",  el:"select", opts:TARGETS.map(t=>[t, t.charAt(0).toUpperCase()+t.slice(1)]) },
            ].map(({key,label,el,opts})=>(
              <div key={key}>
                <label style={{ display:"block", fontFamily:gs, fontSize:"0.65rem", color:c.muted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"5px", fontWeight:600 }}>{label}</label>
                <select value={form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))} style={sel}>
                  {opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            ))}
            <div>
              <label style={{ display:"block", fontFamily:gs, fontSize:"0.65rem", color:c.muted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"5px", fontWeight:600 }}>Starts</label>
              <input type="datetime-local" value={form.starts_at} onChange={e=>setForm(p=>({...p,starts_at:e.target.value}))} style={inp}/>
            </div>
            <div>
              <label style={{ display:"block", fontFamily:gs, fontSize:"0.65rem", color:c.muted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"5px", fontWeight:600 }}>Ends</label>
              <input type="datetime-local" value={form.ends_at} onChange={e=>setForm(p=>({...p,ends_at:e.target.value}))} style={inp}/>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:"0.6rem", paddingTop:"1.1rem" }}>
              <Toggle on={form.active} onChange={()=>setForm(p=>({...p,active:!p.active}))} c={c}/>
              <span style={{ fontFamily:gs, fontSize:"0.82rem", color:c.muted }}>Active on save</span>
            </div>
          </div>

          {form.text && (
            <div style={{ background:typeCol(form.type)+"1A", border:"1px solid "+typeCol(form.type)+"40", borderRadius:"7px", padding:"10px 14px", marginBottom:"1rem", display:"flex", alignItems:"center", gap:"0.5rem" }}>
              <span style={{ fontFamily:gs, fontSize:"0.8rem", color:c.text, flex:1 }}>{form.text}</span>
              <span style={{ fontFamily:gs, fontSize:"0.66rem", color:c.muted }}>{form.target} · {form.position}</span>
            </div>
          )}

          <div style={{ display:"flex", gap:"0.75rem" }}>
            <button type="submit" disabled={saving}
              style={{ background:c.green, color:"#050505", border:"none", borderRadius:"6px", padding:"9px 22px", fontFamily:gs, fontSize:"0.84rem", fontWeight:700, cursor:saving?"not-allowed":"pointer", opacity:saving?0.65:1 }}>
              {saving ? "Saving…" : editing ? "Save Changes" : "Create Banner"}
            </button>
            {editing && (
              <button type="button" onClick={()=>{ setShowForm(false); setEditing(null); setForm(EMPTY); }}
                style={{ background:"transparent", color:c.muted, border:"1px solid "+c.border, borderRadius:"6px", padding:"9px 16px", fontFamily:gs, fontSize:"0.84rem", cursor:"pointer" }}>
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      {/* List */}
      <div style={{ display:"flex", flexDirection:"column", gap:"0.85rem" }}>
        {loading ? Array.from({length:3}).map((_,i)=>(
          <div key={i} style={{ height:"80px", background:c.card, borderRadius:"12px", animation:"pulse 1.4s ease infinite" }}/>
        )) : banners.length === 0 ? (
          <div style={{ background:c.card, border:"1px solid "+c.border, borderRadius:"12px", padding:"3rem", textAlign:"center" }}>
            <p style={{ fontFamily:gs, color:c.muted, fontSize:"0.85rem" }}>No banners yet. Create one above.</p>
          </div>
        ) : banners.map((banner, idx) => {
          const tc       = typeCol(banner.type);
          const now      = new Date();
          const expired  = banner.ends_at   && new Date(banner.ends_at)   < now;
          const scheduled= banner.starts_at && new Date(banner.starts_at) > now;
          return (
            <div key={banner.id} style={{ background:c.card, border:"1px solid "+(banner.active&&!expired?tc+"40":c.border), borderRadius:"12px", padding:"1.1rem 1.25rem" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"1rem", flexWrap:"wrap" }}>
                <div style={{ flex:1, minWidth:"200px" }}>
                  <div style={{ display:"flex", gap:"0.4rem", flexWrap:"wrap", marginBottom:"0.5rem", alignItems:"center" }}>
                    <span style={{ fontFamily:gs, fontSize:"0.65rem", fontWeight:700, color:tc, background:tc+"18", border:"1px solid "+tc+"40", borderRadius:"4px", padding:"2px 8px", textTransform:"uppercase", letterSpacing:"0.06em" }}>{banner.type}</span>
                    <span style={{ fontFamily:gs, fontSize:"0.65rem", color:c.muted, background:c.surface, borderRadius:"4px", padding:"2px 8px" }}>{banner.position}</span>
                    <span style={{ fontFamily:gs, fontSize:"0.65rem", color:c.muted, background:c.surface, borderRadius:"4px", padding:"2px 8px" }}>{banner.target}</span>
                    {banner.active && !expired && !scheduled && <span style={{ fontFamily:gs, fontSize:"0.65rem", color:c.green, background:c.green+"18", borderRadius:"4px", padding:"2px 8px" }}>Live</span>}
                    {expired   && <span style={{ fontFamily:gs, fontSize:"0.65rem", color:c.red,   background:c.redDim,                borderRadius:"4px", padding:"2px 8px" }}>Expired</span>}
                    {scheduled && <span style={{ fontFamily:gs, fontSize:"0.65rem", color:c.amber, background:"rgba(245,158,11,0.10)", borderRadius:"4px", padding:"2px 8px" }}>Scheduled</span>}
                  </div>
                  <p style={{ fontFamily:gs, fontSize:"0.84rem", color:c.text, lineHeight:1.5 }}>{banner.text}</p>
                  {(banner.starts_at||banner.ends_at) && (
                    <p style={{ fontFamily:gs, fontSize:"0.7rem", color:c.muted, marginTop:"4px" }}>
                      {banner.starts_at && "From "+new Date(banner.starts_at).toLocaleDateString("en-GB")}
                      {banner.starts_at&&banner.ends_at&&" → "}
                      {banner.ends_at && new Date(banner.ends_at).toLocaleDateString("en-GB")}
                    </p>
                  )}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:"0.6rem", flexShrink:0 }}>
                  <button onClick={()=>move(idx,-1)} disabled={idx===0} style={{ background:"none", border:"none", cursor:"pointer", color:c.muted, opacity:idx===0?0.3:1, fontSize:"0.9rem" }}>↑</button>
                  <button onClick={()=>move(idx,+1)} disabled={idx===banners.length-1} style={{ background:"none", border:"none", cursor:"pointer", color:c.muted, opacity:idx===banners.length-1?0.3:1, fontSize:"0.9rem" }}>↓</button>
                  <Toggle on={!!banner.active} onChange={()=>toggleActive(banner)} c={c}/>
                  <button onClick={()=>startEdit(banner)} style={{ background:"none", border:"1px solid "+c.border, borderRadius:"5px", cursor:"pointer", color:c.muted, fontSize:"0.74rem", padding:"3px 9px", fontFamily:gs }}>Edit</button>
                  <button onClick={()=>del(banner.id)} style={{ background:"none", border:"none", cursor:"pointer", color:c.muted, fontSize:"0.8rem", padding:"2px 6px" }}>✕</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.45}}`}</style>
    </div>
  );
}