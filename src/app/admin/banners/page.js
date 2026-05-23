"use client";
import { useState, useEffect, useCallback } from "react";
import { useTheme } from "@/lib/theme";
import { createClient } from "@/lib/supabase";

const C = {
  dark:  { bg:"#090909", card:"#111113", surface:"#141416", border:"#232325", borderHi:"#333336", text:"#F0F0F0", muted:"#7A7A80", green:"#00E676", amber:"#F59E0B", blue:"#4488FF", red:"#FF1800" },
  light: { bg:"#F7F7F5", card:"#FFFFFF",  surface:"#EEEEED", border:"#DEDEDD",  borderHi:"#BABAB8", text:"#0A0A0A", muted:"#606065", green:"#008A38", amber:"#B45309", blue:"#1E55CC", red:"#CC0000" },
};
const gs = "'Google Sans Flex','DM Sans',sans-serif";

const TYPE_COLORS = {
  info:   { label:"Info",   col:(c)=>c.blue  },
  promo:  { label:"Promo",  col:(c)=>c.green },
  urgent: { label:"Urgent", col:(c)=>c.red   },
};

const TARGETS = ["all","auth","essential","pro","ultimate"];

const EMPTY_BANNER = { text:"", type:"info", position:"top", target:"all", active:false, starts_at:"", ends_at:"" };

function Toggle({ on, onChange, c }) {
  return (
    <div onClick={onChange} style={{ width:"38px", height:"22px", borderRadius:"11px", background:on?c.green:c.surface, border:`1px solid ${on?c.green:c.border}`, cursor:"pointer", position:"relative", transition:"all 0.2s", flexShrink:0 }}>
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
  const [token,    setToken]    = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState(EMPTY_BANNER);
  const [editing,  setEditing]  = useState(null); // banner id being edited
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState(null);

  const load = useCallback(async (tok) => {
    const res  = await fetch("/api/admin/banners", { headers:{ Authorization:`Bearer ${tok}` } });
    const data = await res.json();
    setBanners(data.banners||[]);
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
    if (!form.text.trim()) { setErr("Banner text is required."); setSaving(false); return; }
    const body = { ...form, starts_at:form.starts_at||null, ends_at:form.ends_at||null };

    if (editing) {
      const res = await fetch("/api/admin/banners", { method:"PATCH", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}` }, body:JSON.stringify({ id:editing, ...body }) });
      if (res.ok) {
        setBanners(prev => prev.map(b => b.id===editing ? {...b,...body} : b));
        setEditing(null);
      }
    } else {
      const res  = await fetch("/api/admin/banners", { method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}` }, body:JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setErr(data.error||"Save failed."); setSaving(false); return; }
      setBanners(prev => [data.banner, ...prev]);
    }
    setForm(EMPTY_BANNER); setShowForm(false); setSaving(false);
  };

  const startEdit = (banner) => {
    setForm({ text:banner.text, type:banner.type, position:banner.position, target:banner.target, active:banner.active, starts_at:banner.starts_at?.slice(0,16)||"", ends_at:banner.ends_at?.slice(0,16)||"" });
    setEditing(banner.id);
    setShowForm(true);
    window.scrollTo({ top:0, behavior:"smooth" });
  };

  const toggleActive = async (banner) => {
    await fetch("/api/admin/banners", { method:"PATCH", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}` }, body:JSON.stringify({ id:banner.id, active:!banner.active }) });
    setBanners(prev => prev.map(b => b.id===banner.id ? {...b,active:!b.active} : b));
  };

  const move = async (idx, dir) => {
    const next = [...banners];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    // Update sort_order
    await Promise.all([
      fetch("/api/admin/banners", { method:"PATCH", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}` }, body:JSON.stringify({ id:next[idx].id, sort_order:idx }) }),
      fetch("/api/admin/banners", { method:"PATCH", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}` }, body:JSON.stringify({ id:next[swap].id, sort_order:swap }) }),
    ]);
    setBanners(next);
  };

  const del = async (id) => {
    if (!confirm("Delete this banner?")) return;
    await fetch(`/api/admin/banners?id=${id}`, { method:"DELETE", headers:{ Authorization:`Bearer ${token}` } });
    setBanners(prev => prev.filter(b => b.id !== id));
  };

  const inp  = { background:c.surface, border:`1px solid ${c.border}`, borderRadius:"6px", padding:"9px 12px", color:c.text, fontSize:"0.85rem", fontFamily:gs, width:"100%" };
  const sel  = { ...inp, cursor:"pointer" };

  return (
    <div style={{ padding:"2rem 2.5rem", maxWidth:"900px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:"2rem", flexWrap:"wrap", gap:"1rem" }}>
        <div>
          <p style={{ fontFamily:gs, fontSize:"0.62rem", color:c.muted, letterSpacing:"0.14em", textTransform:"uppercase", fontWeight:600, marginBottom:"0.3rem" }}>Admin</p>
          <h1 style={{ fontFamily:gs, fontSize:"1.8rem", fontWeight:700, color:c.text }}>Banners</h1>
        </div>
        <button onClick={() => { setShowForm(!showForm); setEditing(null); setForm(EMPTY_BANNER); }}
          style={{ background:c.text, color:c.bg, border:"none", borderRadius:"7px", padding:"9px 20px", fontFamily:gs, fontSize:"0.84rem", fontWeight:600, cursor:"pointer" }}>
          {showForm&&!editing ? "Cancel" : "+ New Banner"}
        </button>
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <form onSubmit={save} style={{ background:c.card, border:`1px solid ${c.borderHi}`, borderRadius:"12px", padding:"1.5rem", marginBottom:"1.5rem" }}>
          <p style={{ fontFamily:gs, fontSize:"0.8rem", fontWeight:600, color:c.text, marginBottom:"1.1rem" }}>{editing ? "Edit Banner" : "New Banner"}</p>

          <div style={{ marginBottom:"0.85rem" }}>
            <label style={{ display:"block", fontFamily:gs, fontSize:"0.65rem", color:c.muted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"5px", fontWeight:600 }}>Banner Text *</label>
            <textarea value={form.text} onChange={e=>setForm(p=>({...p,text:e.target.value}))} rows={2}
              placeholder="e.g. 🎉 20% off all annual plans this week — use code LAUNCH20"
              style={{ ...inp, resize:"vertical" }}/>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:"0.85rem", marginBottom:"1rem" }}>
            <div>
              <label style={{ display:"block", fontFamily:gs, fontSize:"0.65rem", color:c.muted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"5px", fontWeight:600 }}>Type</label>
              <select value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))} style={sel}>
                <option value="info">Info</option>
                <option value="promo">Promo</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label style={{ display:"block", fontFamily:gs, fontSize:"0.65rem", color:c.muted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"5px", fontWeight:600 }}>Position</label>
              <select value={form.position} onChange={e=>setForm(p=>({...p,position:e.target.value}))} style={sel}>
                <option value="top">Top</option>
                <option value="bottom">Bottom</option>
              </select>
            </div>
            <div>
              <label style={{ display:"block", fontFamily:gs, fontSize:"0.65rem", color:c.muted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"5px", fontWeight:600 }}>Show to</label>
              <select value={form.target} onChange={e=>setForm(p=>({...p,target:e.target.value}))} style={sel}>
                {TARGETS.map(t=><option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
              </select>
            </div>
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
              <span style={{ fontFamily:gs, fontSize:"0.82rem", color:c.muted }}>Active</span>
            </div>
          </div>

          {/* Preview */}
          {form.text && (
            <div style={{ background:TYPE_COLORS[form.type]?.col(c)+"18", border:`1px solid ${TYPE_COLORS[form.type]?.col(c)}40`, borderRadius:"7px", padding:"10px 14px", marginBottom:"1rem", display:"flex", alignItems:"center", gap:"0.5rem" }}>
              <span style={{ color:TYPE_COLORS[form.type]?.col(c), fontSize:"0.75rem" }}>▣</span>
              <span style={{ fontFamily:gs, fontSize:"0.8rem", color:c.text }}>{form.text}</span>
              <span style={{ fontFamily:gs, fontSize:"0.66rem", color:c.muted, marginLeft:"auto" }}>{form.target} · {form.position}</span>
            </div>
          )}

          {err && <p style={{ fontFamily:gs, fontSize:"0.8rem", color:c.red, marginBottom:"0.75rem" }}>{err}</p>}
          <div style={{ display:"flex", gap:"0.75rem" }}>
            <button type="submit" disabled={saving}
              style={{ background:c.green, color:"#050505", border:"none", borderRadius:"6px", padding:"9px 22px", fontFamily:gs, fontSize:"0.84rem", fontWeight:700, cursor:saving?"not-allowed":"pointer", opacity:saving?0.65:1 }}>
              {saving ? "Saving…" : editing ? "Save Changes" : "Create Banner"}
            </button>
            {editing && (
              <button type="button" onClick={() => { setShowForm(false); setEditing(null); setForm(EMPTY_BANNER); }}
                style={{ background:"transparent", color:c.muted, border:`1px solid ${c.border}`, borderRadius:"6px", padding:"9px 16px", fontFamily:gs, fontSize:"0.84rem", cursor:"pointer" }}>
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      {/* Banners list */}
      <div style={{ display:"flex", flexDirection:"column", gap:"0.85rem" }}>
        {loading ? Array.from({length:3}).map((_,i)=>(
          <div key={i} style={{ height:"80px", background:c.card, borderRadius:"12px", animation:"pulse 1.4s ease infinite" }}/>
        )) : banners.length === 0 ? (
          <div style={{ background:c.card, border:`1px solid ${c.border}`, borderRadius:"12px", padding:"3rem", textAlign:"center" }}>
            <p style={{ fontFamily:gs, color:c.muted, fontSize:"0.85rem" }}>No banners yet. Create one above.</p>
          </div>
        ) : banners.map((banner, idx) => {
          const typeCol = TYPE_COLORS[banner.type]?.col(c)||c.muted;
          const now = new Date();
          const expired = banner.ends_at && new Date(banner.ends_at) < now;
          const scheduled = banner.starts_at && new Date(banner.starts_at) > now;
          return (
            <div key={banner.id} style={{ background:c.card, border:`1px solid ${banner.active&&!expired?typeCol+"40":c.border}`, borderRadius:"12px", padding:"1.1rem 1.25rem" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"1rem", flexWrap:"wrap" }}>
                <div style={{ flex:1, minWidth:"200px" }}>
                  <div style={{ display:"flex", gap:"0.5rem", flexWrap:"wrap", marginBottom:"0.5rem", alignItems:"center" }}>
                    <span style={{ fontFamily:gs, fontSize:"0.65rem", fontWeight:700, color:typeCol, background:`${typeCol}18`, border:`1px solid ${typeCol}40`, borderRadius:"4px", padding:"2px 8px", textTransform:"uppercase", letterSpacing:"0.06em" }}>{banner.type}</span>
                    <span style={{ fontFamily:gs, fontSize:"0.65rem", color:c.muted, background:c.surface, borderRadius:"4px", padding:"2px 8px" }}>{banner.position}</span>
                    <span style={{ fontFamily:gs, fontSize:"0.65rem", color:c.muted, background:c.surface, borderRadius:"4px", padding:"2px 8px" }}>{banner.target}</span>
                    {expired   && <span style={{ fontFamily:gs, fontSize:"0.65rem", color:c.red,   background:c.redDim||"rgba(255,24,0,0.08)",   borderRadius:"4px", padding:"2px 8px" }}>Expired</span>}
                    {scheduled && <span style={{ fontFamily:gs, fontSize:"0.65rem", color:c.amber, background:"rgba(245,158,11,0.1)", borderRadius:"4px", padding:"2px 8px" }}>Scheduled</span>}
                  </div>
                  <p style={{ fontFamily:gs, fontSize:"0.84rem", color:c.text, lineHeight:1.5 }}>{banner.text}</p>
                  {(banner.starts_at||banner.ends_at) && (
                    <p style={{ fontFamily:gs, fontSize:"0.7rem", color:c.muted, marginTop:"4px" }}>
                      {banner.starts_at && `From ${new Date(banner.starts_at).toLocaleDateString("en-GB")}`}
                      {banner.starts_at && banner.ends_at && " → "}
                      {banner.ends_at   && new Date(banner.ends_at).toLocaleDateString("en-GB")}
                    </p>
                  )}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:"0.6rem", flexShrink:0 }}>
                  {/* Reorder */}
                  <button onClick={() => move(idx,-1)} disabled={idx===0}            style={{ background:"none", border:"none", cursor:"pointer", color:c.muted, opacity:idx===0?0.3:1, fontSize:"0.9rem" }}>↑</button>
                  <button onClick={() => move(idx,+1)} disabled={idx===banners.length-1} style={{ background:"none", border:"none", cursor:"pointer", color:c.muted, opacity:idx===banners.length-1?0.3:1, fontSize:"0.9rem" }}>↓</button>
                  <Toggle on={banner.active} onChange={() => toggleActive(banner)} c={c}/>
                  <button onClick={() => startEdit(banner)} style={{ background:"none", border:`1px solid ${c.border}`, borderRadius:"5px", cursor:"pointer", color:c.muted, fontSize:"0.74rem", padding:"3px 9px", fontFamily:gs }}>Edit</button>
                  <button onClick={() => del(banner.id)} style={{ background:"none", border:"none", cursor:"pointer", color:c.muted, fontSize:"0.8rem", padding:"2px 6px" }}>✕</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}