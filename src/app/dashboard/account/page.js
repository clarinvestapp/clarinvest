"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useTheme } from "@/lib/theme";

const C = {
  dark:  { bg:"#090909", card:"#111113", surface:"#141416", border:"#232325", borderHi:"#333336", text:"#F0F0F0", muted:"#7A7A80", green:"#00E676", greenDim:"rgba(0,230,118,0.10)", blue:"#4488FF", red:"#FF1800" },
  light: { bg:"#F7F7F5", card:"#FFFFFF",  surface:"#EEEEED", border:"#DEDEDD",  borderHi:"#BABAB8", text:"#0A0A0A", muted:"#606065", green:"#008A38", greenDim:"rgba(0,138,56,0.09)", blue:"#1E55CC", red:"#CC0000" },
};
const gs = "'Google Sans Flex','DM Sans',sans-serif";

const PLAN_LIMITS = {
  essential: { summaries:5,    reports:0,   label:"Essential" },
  pro:       { summaries:9999, reports:15,   label:"Pro"       },
  ultimate:  { summaries:9999, reports:9999, label:"Ultimate"  },
};

function Card({ children, c }) {
  return (
    <div style={{ background:c.card, border:`1px solid ${c.border}`, borderRadius:"14px", padding:"1.75rem 2rem", marginBottom:"1.25rem" }}>
      {children}
    </div>
  );
}

function SectionLabel({ text, c }) {
  return <p style={{ fontFamily:gs, fontSize:"0.62rem", color:c.muted, letterSpacing:"0.12em", textTransform:"uppercase", fontWeight:600, marginBottom:"1.1rem" }}>{text}</p>;
}

function UsageBar({ used, limit, label, color, c }) {
  const pct   = limit >= 9999 ? (used > 0 ? 40 : 0) : Math.min(100, (used/limit)*100);
  const isUnlimited = limit >= 9999;
  return (
    <div style={{ marginBottom:"1rem" }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"6px" }}>
        <span style={{ fontFamily:gs, fontSize:"0.82rem", color:c.text }}>{label}</span>
        <span style={{ fontFamily:gs, fontSize:"0.82rem", color:c.muted, fontWeight:600 }}>
          {isUnlimited ? `${used} used · Unlimited` : `${used} / ${limit}`}
        </span>
      </div>
      <div style={{ height:"6px", background:c.surface, borderRadius:"3px", overflow:"hidden" }}>
        <div style={{ width:`${pct}%`, height:"100%", background:color, borderRadius:"3px", transition:"width 0.6s ease" }}/>
      </div>
    </div>
  );
}

export default function AccountPage() {
  const { mode } = useTheme();
  const c = C[mode];
  const router   = useRouter();
  const supabase = createClient();

  const [user,         setUser]         = useState(null);
  const [usage,        setUsage]        = useState({ summaries:0, reports:0 });
  const [loading,      setLoading]      = useState(true);
  const [billingLoading,setBillingLoading]=useState(false);
  const [pwForm,       setPwForm]       = useState({ new:"", confirm:"" });
  const [pwLoading,    setPwLoading]    = useState(false);
  const [pwMsg,        setPwMsg]        = useState(null); // { type:'success'|'error', text }
  const [signOutConf,  setSignOutConf]  = useState(false);

  useEffect(() => {
    async function load() {
      const { data:{ user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);

      // Fetch usage
      const { data:{ session } } = await supabase.auth.getSession();
      if (session) {
        const res = await fetch("/api/usage", {
          headers: { Authorization:`Bearer ${session.access_token}` }
        });
        if (res.ok) { const d = await res.json(); setUsage(d); }
      }
      setLoading(false);
    }
    load();
  }, []);

  const plan    = user?.user_metadata?.plan    || "essential";
  const billing = user?.user_metadata?.billing || "monthly";
  const limits  = PLAN_LIMITS[plan] || PLAN_LIMITS.essential;
  const joinedAt = user?.created_at ? new Date(user.created_at).toLocaleDateString("en-GB",{ day:"numeric", month:"long", year:"numeric" }) : "—";

  const openBillingPortal = async () => {
    setBillingLoading(true);
    try {
      const { data:{ session } } = await supabase.auth.getSession();
      const res  = await fetch("/api/billing", {
        method: "POST",
        headers: { Authorization:`Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setPwMsg({ type:"error", text: data.error || "Could not open billing portal." });
    } catch { setPwMsg({ type:"error", text:"Billing portal unavailable." }); }
    finally   { setBillingLoading(false); }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setPwMsg(null);
    if (pwForm.new.length < 8)          { setPwMsg({ type:"error", text:"Password must be at least 8 characters." }); return; }
    if (!/[A-Z]/.test(pwForm.new))      { setPwMsg({ type:"error", text:"Password must contain at least one uppercase letter." }); return; }
    if (!/[0-9]/.test(pwForm.new))      { setPwMsg({ type:"error", text:"Password must contain at least one number." }); return; }
    if (!/[^A-Za-z0-9]/.test(pwForm.new)){ setPwMsg({ type:"error", text:"Password must contain at least one special character." }); return; }
    if (pwForm.new !== pwForm.confirm)  { setPwMsg({ type:"error", text:"Passwords do not match." }); return; }

    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pwForm.new });
    if (error) { setPwMsg({ type:"error", text:error.message }); }
    else       { setPwMsg({ type:"success", text:"Password updated successfully." }); setPwForm({ new:"", confirm:"" }); }
    setPwLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const inputStyle = {
    width:"100%", background:mode==="dark"?"#0A0A0A":c.surface,
    border:`1px solid ${c.border}`, borderRadius:"5px",
    padding:"10px 14px", color:c.text, fontSize:"0.9rem",
    fontFamily:gs, outline:"none",
  };

  const btnPrimary = (disabled) => ({
    background: disabled ? c.surface : c.text,
    color:      disabled ? c.muted   : c.bg,
    border:"none", borderRadius:"6px",
    padding:"10px 22px", fontFamily:gs,
    fontSize:"0.84rem", fontWeight:600,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    transition:"all 0.2s",
  });

  if (loading) return (
    <div style={{ background:c.bg, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:"32px", height:"32px", borderRadius:"50%", border:`3px solid ${c.border}`, borderTopColor:c.green, animation:"spin 0.8s linear infinite" }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ background:c.bg, minHeight:"100vh", fontFamily:gs, color:c.text }}>
      <div style={{ maxWidth:"640px", margin:"0 auto", padding:"2.5rem 2rem 4rem" }}>

        {/* Page header */}
        <div style={{ marginBottom:"2rem" }}>
          <p style={{ fontFamily:gs, color:c.muted, fontSize:"0.65rem", letterSpacing:"0.18em", textTransform:"uppercase", marginBottom:"0.4rem", fontWeight:600 }}>Settings</p>
          <h1 style={{ fontFamily:gs, fontSize:"clamp(1.5rem,3vw,2rem)", fontWeight:700, color:c.text }}>My Account</h1>
        </div>

        {/* ── Plan ── */}
        <Card c={c}>
          <SectionLabel text="Subscription" c={c}/>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:"1rem", marginBottom:"1.25rem" }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:"0.6rem", marginBottom:"0.3rem" }}>
                <span style={{ fontFamily:gs, fontSize:"1.2rem", fontWeight:700, color:c.green }}>{limits.label}</span>
                <span style={{ fontFamily:gs, fontSize:"0.65rem", fontWeight:600, color:c.muted, background:c.surface, border:`1px solid ${c.border}`, borderRadius:"4px", padding:"2px 8px", letterSpacing:"0.05em", textTransform:"capitalize" }}>{billing}</span>
              </div>
              <p style={{ fontFamily:gs, fontSize:"0.82rem", color:c.muted }}>{user?.email}</p>
              <p style={{ fontFamily:gs, fontSize:"0.78rem", color:c.muted, marginTop:"3px" }}>Member since {joinedAt}</p>
            </div>
            <button onClick={openBillingPortal} disabled={billingLoading}
              style={{ ...btnPrimary(billingLoading), padding:"9px 20px", fontSize:"0.82rem" }}>
              {billingLoading ? "Opening…" : "Manage Billing →"}
            </button>
          </div>

          {/* Plan features summary */}
          <div style={{ background:c.surface, borderRadius:"8px", padding:"0.9rem 1rem" }}>
            {[
              ["AI Summaries",    limits.summaries>=9999 ? "Unlimited" : `Up to ${limits.summaries}/month`],
              ["AI Full Reports", limits.reports  ===0   ? "Not included — upgrade to Pro" : limits.reports>=9999 ? "Unlimited" : `Up to ${limits.reports}/month`],
              ["Markets",         plan==="essential" ? "US stocks" : plan==="pro" ? "US + UK (coming soon)" : "Global (coming soon)"],
              ["Watchlist",       "Included"],
              ["Virtual Portfolio",plan==="essential" ? "Not included" : "Included (coming soon)"],
            ].map(([label,value],i,arr)=>(
              <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:i<arr.length-1?`1px solid ${c.border}`:"none" }}>
                <span style={{ fontFamily:gs, fontSize:"0.8rem", color:c.muted }}>{label}</span>
                <span style={{ fontFamily:gs, fontSize:"0.8rem", fontWeight:600, color:value.includes("Not")?c.muted:c.text, textAlign:"right", maxWidth:"55%" }}>{value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* ── Usage this month ── */}
        <Card c={c}>
          <SectionLabel text="Usage This Month" c={c}/>
          <UsageBar
            used={usage.summaries} limit={limits.summaries}
            label="AI Summaries" color={c.green} c={c}
          />
          <UsageBar
            used={usage.reports}   limit={limits.reports===0?1:limits.reports}
            label="AI Full Reports" color={c.blue} c={c}
          />
          {limits.reports === 0 && (
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:c.surface, borderRadius:"7px", padding:"10px 14px", marginTop:"0.5rem" }}>
              <span style={{ fontFamily:gs, fontSize:"0.78rem", color:c.muted }}>Full reports unlock on Pro and above</span>
              <button onClick={()=>router.push("/#pricing")}
                style={{ background:"none", border:`1px solid ${c.border}`, borderRadius:"4px", padding:"4px 12px", cursor:"pointer", fontFamily:gs, fontSize:"0.74rem", color:c.text }}>
                Upgrade →
              </button>
            </div>
          )}
        </Card>

        {/* ── Change password ── */}
        <Card c={c}>
          <SectionLabel text="Security" c={c}/>
          <form onSubmit={changePassword}>
            <div style={{ marginBottom:"1rem" }}>
              <label style={{ display:"block", fontFamily:gs, fontSize:"0.72rem", color:c.muted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"6px", fontWeight:600 }}>New Password</label>
              <input type="password" value={pwForm.new} onChange={e=>setPwForm(p=>({...p,new:e.target.value}))}
                placeholder="Min 8 chars, uppercase, number, symbol"
                style={inputStyle}/>
            </div>
            <div style={{ marginBottom:"1.25rem" }}>
              <label style={{ display:"block", fontFamily:gs, fontSize:"0.72rem", color:c.muted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"6px", fontWeight:600 }}>Confirm New Password</label>
              <input type="password" value={pwForm.confirm} onChange={e=>setPwForm(p=>({...p,confirm:e.target.value}))}
                placeholder="Repeat your new password"
                style={inputStyle}/>
            </div>

            {pwMsg && (
              <div style={{ background:pwMsg.type==="success"?c.greenDim:"rgba(255,24,0,0.08)", border:`1px solid ${pwMsg.type==="success"?c.green+"50":"rgba(255,24,0,0.25)"}`, borderRadius:"6px", padding:"9px 14px", marginBottom:"1rem" }}>
                <p style={{ fontFamily:gs, fontSize:"0.82rem", color:pwMsg.type==="success"?c.green:c.red }}>{pwMsg.text}</p>
              </div>
            )}

            <button type="submit" disabled={pwLoading||!pwForm.new||!pwForm.confirm}
              style={btnPrimary(pwLoading||!pwForm.new||!pwForm.confirm)}>
              {pwLoading ? "Updating…" : "Update Password"}
            </button>
          </form>
        </Card>

        {/* ── Sign out ── */}
        <Card c={c}>
          <SectionLabel text="Session" c={c}/>
          <p style={{ fontFamily:gs, fontSize:"0.82rem", color:c.muted, marginBottom:"1.1rem" }}>
            Signed in as <strong style={{ color:c.text }}>{user?.email}</strong>
          </p>
          {!signOutConf ? (
            <button onClick={()=>setSignOutConf(true)}
              style={{ background:"transparent", color:c.red, border:`1px solid ${c.red}50`, borderRadius:"6px", padding:"9px 20px", fontFamily:gs, fontSize:"0.84rem", fontWeight:600, cursor:"pointer" }}>
              Sign out
            </button>
          ) : (
            <div style={{ display:"flex", gap:"0.75rem", alignItems:"center", flexWrap:"wrap" }}>
              <span style={{ fontFamily:gs, fontSize:"0.82rem", color:c.muted }}>Are you sure?</span>
              <button onClick={handleSignOut}
                style={{ background:c.red, color:"#fff", border:"none", borderRadius:"6px", padding:"9px 20px", fontFamily:gs, fontSize:"0.84rem", fontWeight:600, cursor:"pointer" }}>
                Yes, sign out
              </button>
              <button onClick={()=>setSignOutConf(false)}
                style={{ background:"transparent", color:c.muted, border:`1px solid ${c.border}`, borderRadius:"6px", padding:"9px 16px", fontFamily:gs, fontSize:"0.84rem", cursor:"pointer" }}>
                Cancel
              </button>
            </div>
          )}
        </Card>

        <p style={{ fontFamily:gs, color:c.muted, fontSize:"0.7rem", textAlign:"center", marginTop:"1rem" }}>
          For billing support contact <a href="mailto:support@clarinvest.app" style={{ color:c.blue, textDecoration:"none" }}>support@clarinvest.app</a>
        </p>
      </div>
    </div>
  );
}