"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useTheme } from "@/lib/theme";

// ─── Theme ────────────────────────────────────────────────────────────────────
const C = {
  dark:  { bg:"#090909", card:"#111113", surface:"#141416", border:"#232325", borderHi:"#333336", text:"#F0F0F0", muted:"#7A7A80", green:"#00E676", greenDim:"rgba(0,230,118,0.10)", blue:"#4488FF", red:"#FF1800" },
  light: { bg:"#F7F7F5", card:"#FFFFFF", surface:"#EEEEED", border:"#DEDEDD", borderHi:"#BABAB8", text:"#0A0A0A", muted:"#606065", green:"#008A38", greenDim:"rgba(0,138,56,0.09)", blue:"#1E55CC", red:"#CC0000" },
};
const gs = "'Google Sans Flex','DM Sans',sans-serif";
const ns = "'Noto Serif',Georgia,serif"; // prices only — per brand guidelines

// ─── Pricing data — kept in sync with app/page.js ────────────────────────────
// TODO: extract to src/lib/pricing.js and import in both files
const PRICE_IDS = {
  essential_monthly: "price_1TXpfe2LvKDKlOmwCd2Kn1tM",
  essential_yearly:  "price_1TXpgQ2LvKDKlOmwEmhpx87h",
  pro_monthly:       "price_1TZ4LX2LvKDKlOmwYOQ1bzc6",
  pro_yearly:        "price_1TZ4M22LvKDKlOmwhURhQS9B",
  ultimate_monthly:  "price_1TXph12LvKDKlOmwuRfaaKwJ",
  ultimate_yearly:   "price_1TXpjD2LvKDKlOmwS2LiCkG6",
};

const CURR = {
  GBP:{ sym:"£",  em:[9,79],   pr:[19,159], ul:[29,249] },
  USD:{ sym:"$",  em:[12,99],  pr:[25,209], ul:[35,299] },
  EUR:{ sym:"€",  em:[10,89],  pr:[22,189], ul:[32,269] },
  CAD:{ sym:"C$", em:[16,129], pr:[32,269], ul:[45,379] },
  AUD:{ sym:"A$", em:[18,149], pr:[36,299], ul:[52,429] },
};

const GEO = { GB:"GBP",US:"USD",CA:"CAD",AU:"AUD",DE:"EUR",FR:"EUR",IT:"EUR",ES:"EUR",NL:"EUR",PT:"EUR",BE:"EUR",AT:"EUR",IE:"EUR",FI:"EUR",GR:"EUR" };

// Feature lists match landing page exactly
const PLAN_CONFIGS = [
  {
    id:"essential", name:"Essential", tag:"For curious investors",
    badge:null, plusLabel:null,
    feats:[
      "5 AI summaries per month",
      "Discovery screener — US stocks",
      "Price charts",
      "Key financial ratios",
      "Watchlist",
      "Monthly market digest",
    ],
  },
  {
    id:"pro", name:"Pro", tag:"For serious investors",
    badge:"Most popular", plusLabel:"Everything in Essential, plus:",
    feats:[
      "Unlimited AI summaries",
      "15 full AI reports per month",
      "Virtual Portfolio (up to 5 portfolios)",
      "What-if & growth projection charts",
      "Sector diversification analysis",
      "Full statistics & financial statements",
      "Weekly market digest",
    ],
  },
  {
    id:"ultimate", name:"Ultimate", tag:"For the most demanding investors",
    badge:"Full access", plusLabel:"Everything in Pro, plus:",
    feats:[
      "Unlimited full AI reports",
      "Dividend screener (safety & growth scores)",
      "Dividend income planner with DRIP",
      "Compare up to 5 dividend stocks",
      "Sankey financial flow diagrams",
      "Dividend yield in portfolio analytics",
      "Early access to new features",
    ],
  },
];

const PLAN_ORDER  = { essential:0, pro:1, ultimate:2 };
const PLAN_LIMITS = {
  essential: { summaries:20,   reports:0,    label:"Essential" },
  pro:       { summaries:9999, reports:20,   label:"Pro"       },
  ultimate:  { summaries:9999, reports:9999, label:"Ultimate"  },
};

// ─── Shared sub-components ────────────────────────────────────────────────────
function Card({ children, c, innerRef, extraStyle = {} }) {
  return (
    <div ref={innerRef} style={{ background:c.card, border:`1px solid ${c.border}`, borderRadius:"14px", padding:"1.75rem 2rem", marginBottom:"1.25rem", ...extraStyle }}>
      {children}
    </div>
  );
}

function SectionLabel({ text, c }) {
  return <p style={{ fontFamily:gs, fontSize:"0.62rem", color:c.muted, letterSpacing:"0.12em", textTransform:"uppercase", fontWeight:600, marginBottom:"1.1rem" }}>{text}</p>;
}

function UsageBar({ used, limit, label, color, c }) {
  const isUnlimited = limit >= 9999;
  const pct = isUnlimited ? (used > 0 ? 40 : 0) : Math.min(100, (used / limit) * 100);
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

// ─── Plan card (used in "Available plans" section) ────────────────────────────
function PlanCard({ config, currentPlan, billing, currency, onUpgrade, onBillingPortal, upgradeLoading, mode, c }) {
  const curr    = CURR[currency] || CURR.GBP;
  const prices  = { essential:curr.em, pro:curr.pr, ultimate:curr.ul };
  const [mo, yr]= prices[config.id] || [0, 0];
  const price   = billing === "monthly" ? mo : yr;

  const isCurrent  = config.id === currentPlan;
  const isUpgrade  = PLAN_ORDER[config.id] > (PLAN_ORDER[currentPlan] ?? 0);
  const isLoading  = upgradeLoading === config.id;

  return (
    <div style={{
      background: isCurrent
        ? (mode === "dark" ? "linear-gradient(150deg,#1A1A1E 0%,#0D0D10 100%)" : "linear-gradient(150deg,#FFFFFF 0%,#F5F5F8 100%)")
        : (mode === "dark" ? "linear-gradient(150deg,#131315 0%,#0E0E10 100%)" : "linear-gradient(150deg,#F5F5F3 0%,#EEEEED 100%)"),
      border: isCurrent ? `1px solid ${c.green}` : `1px solid ${c.border}`,
      borderRadius:"14px",
      padding:"1.75rem 1.5rem",
      position:"relative",
      display:"flex",
      flexDirection:"column",
      transition:"border-color 0.2s",
    }}>

      {/* Badge pill */}
      {isCurrent ? (
        <span style={{ position:"absolute", top:"-11px", left:"50%", transform:"translateX(-50%)", background:c.green, color:mode === "dark" ? "#090909" : "#fff", fontFamily:gs, fontSize:"0.58rem", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", padding:"3px 12px", borderRadius:"50px", whiteSpace:"nowrap" }}>
          Current plan
        </span>
      ) : config.badge ? (
        <span style={{ position:"absolute", top:"-11px", left:"50%", transform:"translateX(-50%)", background:c.surface, border:`1px solid ${c.borderHi}`, color:c.muted, fontFamily:gs, fontSize:"0.58rem", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", padding:"3px 12px", borderRadius:"50px", whiteSpace:"nowrap" }}>
          {config.badge}
        </span>
      ) : null}

      {/* Plan identity */}
      <p style={{ fontFamily:gs, color:c.green, fontSize:"0.65rem", letterSpacing:"0.14em", textTransform:"uppercase", fontWeight:700, marginBottom:"0.2rem", marginTop:"0.25rem" }}>{config.name}</p>
      <p style={{ fontFamily:gs, color:c.muted, fontSize:"0.77rem", marginBottom:"1.1rem" }}>{config.tag}</p>

      {/* Price — Noto Serif per brand guidelines */}
      <div style={{ display:"flex", alignItems:"flex-end", gap:"0.2rem", marginBottom: billing === "yearly" ? "0.25rem" : "1.3rem" }}>
        <span style={{ fontFamily:ns, fontSize:"2.2rem", fontWeight:700, lineHeight:1, color:c.text }}>{curr.sym}{price}</span>
        <span style={{ fontFamily:gs, color:c.muted, fontSize:"0.78rem", paddingBottom:"0.3rem" }}>{billing === "monthly" ? "/month" : "/year"}</span>
      </div>
      {billing === "yearly" && (
        <p style={{ fontFamily:gs, color: isCurrent ? c.green : c.muted, fontSize:"0.72rem", fontWeight:600, marginBottom:"1.25rem" }}>
          {curr.sym}{(price / 12).toFixed(2)}/month · 28% saved
        </p>
      )}

      {/* CTA button */}
      {isCurrent ? (
        <div style={{ width:"100%", padding:"10px", borderRadius:"4px", textAlign:"center", background:c.surface, fontFamily:gs, fontSize:"0.8rem", color:c.muted, marginBottom:"1.35rem", border:`1px solid ${c.border}` }}>
          Your current plan
        </div>
      ) : isUpgrade ? (
        <button
          onClick={() => onUpgrade(config.id)}
          disabled={isLoading}
          style={{ width:"100%", padding:"10px", borderRadius:"4px", border:"none", background:c.text, color:c.bg, fontFamily:gs, fontSize:"0.82rem", fontWeight:600, cursor: isLoading ? "not-allowed" : "pointer", marginBottom:"1.35rem", opacity: isLoading ? 0.7 : 1, transition:"all 0.22s" }}>
          {isLoading ? "Redirecting…" : `Upgrade to ${config.name} →`}
        </button>
      ) : (
        /* Downgrade — routes to Stripe billing portal */
        <button
          onClick={onBillingPortal}
          style={{ width:"100%", padding:"10px", borderRadius:"4px", border:`1px solid ${c.border}`, background:"transparent", color:c.muted, fontFamily:gs, fontSize:"0.8rem", cursor:"pointer", marginBottom:"1.35rem", transition:"all 0.22s" }}>
          Downgrade →
        </button>
      )}

      {/* Plus label + divider */}
      {config.plusLabel && (
        <div style={{ marginBottom:"0.7rem" }}>
          <p style={{ fontFamily:gs, fontSize:"0.71rem", color:c.muted, fontStyle:"italic", marginBottom:"0.45rem" }}>{config.plusLabel}</p>
          <div style={{ height:"1px", background:c.border }}/>
        </div>
      )}

      {/* Feature list */}
      <div style={{ display:"flex", flexDirection:"column", gap:"0.6rem" }}>
        {config.feats.map((f, i) => (
          <div key={i} style={{ display:"flex", gap:"0.55rem", alignItems:"flex-start" }}>
            <span style={{ fontFamily:gs, color:c.green, fontSize:"0.68rem", marginTop:"0.12rem", flexShrink:0, fontWeight:700 }}>✓</span>
            <span style={{ fontFamily:gs, color:c.muted, fontSize:"0.8rem", lineHeight:1.5 }}>{f}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AccountPage() {
  const { mode } = useTheme();
  const c        = C[mode];
  const router   = useRouter();
  const supabase = createClient();

  const [user,            setUser]            = useState(null);
  const [usage,           setUsage]           = useState({ summaries:0, reports:0 });
  const [loading,         setLoading]         = useState(true);
  const [billingLoading,  setBillingLoading]  = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(null); // planId string while loading
  const [billing,         setBilling]         = useState("monthly"); // plan comparison toggle
  const [cur,             setCur]             = useState("GBP");
  const [pwForm,          setPwForm]          = useState({ new:"", confirm:"" });
  const [pwLoading,       setPwLoading]       = useState(false);
  const [pwMsg,           setPwMsg]           = useState(null); // { type, text }
  const [signOutConf,     setSignOutConf]     = useState(false);
  const [emailForm,       setEmailForm]       = useState({ new:"", confirm:"" });
  const [emailLoading,    setEmailLoading]    = useState(false);
  const [emailMsg,        setEmailMsg]        = useState(null);
  const [nameForm,        setNameForm]        = useState("");
  const [nameLoading,     setNameLoading]     = useState(false);
  const [nameMsg,         setNameMsg]         = useState(null);
  const [plansModalOpen,  setPlansModalOpen]  = useState(false);
  const [digestEmails,    setDigestEmails]    = useState(true);
  const [digestLoading,   setDigestLoading]   = useState(false);
  const [digestMsg,       setDigestMsg]       = useState(null);
  const planRef = useRef(null);

  // ── Currency detection (same logic as landing page) ────────────────────────
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("https://ipapi.co/json/");
        if (!alive || !r.ok) return;
        const d = await r.json();
        const k = GEO[d.country_code];
        if (alive && k) setCur(k);
      } catch { /* keep default GBP */ }
    })();
    return () => { alive = false; };
  }, []);

  // ── Load user + usage ──────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const { data:{ user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);
      // Default billing toggle to the user's actual billing cycle
      if (user.user_metadata?.billing) setBilling(user.user_metadata.billing);
      // Display name is pre-filled from user_profiles below, after the profile query

      const { data:{ session } } = await supabase.auth.getSession();
      if (session) {
        const res = await fetch("/api/usage", {
          headers: { Authorization:`Bearer ${session.access_token}` }
        });
        if (res.ok) { const d = await res.json(); setUsage(d); }

        // Load profile data from user_profiles
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("digest_emails, display_name")
          .eq("id", user.id)
          .single();
        if (profile) {
          setDigestEmails(profile.digest_emails ?? true);
          // Priority chain: user_profiles.display_name → OAuth full_name → OAuth name → ""
          const resolvedName =
            profile.display_name ||
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            "";
          if (resolvedName) setNameForm(resolvedName);
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  // ── Auto-scroll to plan section when ?tab=plan ─────────────────────────────
  // Reads URL directly (avoids useSearchParams Suspense requirement)
  useEffect(() => {
    if (!loading && typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tab") === "plan") {
        const currentPlan = user?.user_metadata?.plan || "essential";
        if (currentPlan === "ultimate") {
          setTimeout(() => setPlansModalOpen(true), 350);
        } else if (planRef.current) {
          setTimeout(() => planRef.current.scrollIntoView({ behavior:"smooth", block:"start" }), 350);
        }
      }
    }
  }, [loading]);

  // ── Close plans modal on ESC ──────────────────────────────────────────────
  useEffect(() => {
    if (!plansModalOpen) return;
    const h = e => { if (e.key === "Escape") setPlansModalOpen(false); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [plansModalOpen]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const plan         = user?.user_metadata?.plan    || "essential";
  const isUltimate   = plan === "ultimate";
  const billingCycle = user?.user_metadata?.billing || "monthly"; // user's actual cycle
  const limits       = PLAN_LIMITS[plan] || PLAN_LIMITS.essential;
  const joinedAt     = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-GB", { day:"numeric", month:"long", year:"numeric" })
    : "—";

  // ── Stripe: billing portal (manage, downgrade, cancel) ───────────────────────
  const openBillingPortal = async () => {
    setBillingLoading(true);
    try {
      const { data:{ session } } = await supabase.auth.getSession();
      const res  = await fetch("/api/billing", {
        method:"POST",
        headers:{ Authorization:`Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setPwMsg({ type:"error", text: data.error || "Could not open billing portal." });
    } catch { setPwMsg({ type:"error", text:"Billing portal unavailable." }); }
    finally   { setBillingLoading(false); }
  };

  // ── Stripe: upgrade checkout ───────────────────────────────────────────────
  const handleCheckout = async (planId) => {
    const priceId = PRICE_IDS[`${planId}_${billing}`];
    if (!priceId) return;
    setCheckoutLoading(planId);
    try {
      const { data:{ session } } = await supabase.auth.getSession();
      const res = await fetch("/api/checkout", {
        method:"POST",
        headers:{ "Content-Type":"application/json", Authorization:`Bearer ${session?.access_token}` },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setPwMsg({ type:"error", text: data.error || "Could not start checkout." });
    } catch { setPwMsg({ type:"error", text:"Checkout unavailable. Try again." }); }
    finally   { setCheckoutLoading(null); }
  };

  // ── Password change ────────────────────────────────────────────────────────
  const changePassword = async (e) => {
    e.preventDefault();
    setPwMsg(null);
    if (pwForm.new.length < 8)              { setPwMsg({ type:"error", text:"Password must be at least 8 characters." }); return; }
    if (!/[A-Z]/.test(pwForm.new))          { setPwMsg({ type:"error", text:"Password must contain at least one uppercase letter." }); return; }
    if (!/[0-9]/.test(pwForm.new))          { setPwMsg({ type:"error", text:"Password must contain at least one number." }); return; }
    if (!/[^A-Za-z0-9]/.test(pwForm.new))  { setPwMsg({ type:"error", text:"Password must contain at least one special character." }); return; }
    if (pwForm.new !== pwForm.confirm)      { setPwMsg({ type:"error", text:"Passwords do not match." }); return; }
    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pwForm.new });
    if (error) setPwMsg({ type:"error", text:error.message });
    else       { setPwMsg({ type:"success", text:"Password updated successfully." }); setPwForm({ new:"", confirm:"" }); }
    setPwLoading(false);
  };

  // ── Display name update ───────────────────────────────────────────────────
  const updateDisplayName = async (e) => {
    e.preventDefault();
    setNameMsg(null);
    const trimmed = nameForm.trim();
    if (!trimmed)          { setNameMsg({ type:"error", text:"Display name cannot be empty." }); return; }
    if (trimmed.length > 30){ setNameMsg({ type:"error", text:"Must be 30 characters or fewer." }); return; }
    setNameLoading(true);
    const { error } = await supabase.auth.updateUser({ data:{ display_name: trimmed } });
    if (error) setNameMsg({ type:"error", text: error.message });
    else       setNameMsg({ type:"success", text:"Display name updated." });
    setNameLoading(false);
  };

  // ── Email change ───────────────────────────────────────────────────────────
  const changeEmail = async (e) => {
    e.preventDefault();
    setEmailMsg(null);
    const trimmed = emailForm.new.trim().toLowerCase();
    if (!trimmed.includes("@") || !trimmed.includes(".")) { setEmailMsg({ type:"error", text:"Enter a valid email address." }); return; }
    if (trimmed === user?.email?.toLowerCase())            { setEmailMsg({ type:"error", text:"This is already your current email address." }); return; }
    if (trimmed !== emailForm.confirm.trim().toLowerCase()){ setEmailMsg({ type:"error", text:"Email addresses do not match." }); return; }
    setEmailLoading(true);
    const { error } = await supabase.auth.updateUser({ email: trimmed });
    if (error) setEmailMsg({ type:"error", text: error.message });
    else       { setEmailMsg({ type:"success", text:`Confirmation sent to ${trimmed}. Click the link to complete the change.` }); setEmailForm({ new:"", confirm:"" }); }
    setEmailLoading(false);
  };

  const toggleDigest = async (val) => {
    setDigestLoading(true);
    setDigestMsg(null);
    const { error } = await supabase
      .from("user_profiles")
      .update({ digest_emails: val })
      .eq("id", user.id);
    if (error) {
      console.error("Digest toggle error:", error);
      setDigestMsg({ type:"error", text:"Could not save preference. Try again." });
    } else {
      setDigestEmails(val);
      setDigestMsg({ type:"success", text: val ? "Digest emails enabled." : "Digest emails disabled." });
      setTimeout(() => setDigestMsg(null), 3000);
    }
    setDigestLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  // ── Style helpers ──────────────────────────────────────────────────────────
  const inputStyle = {
    width:"100%", background: mode === "dark" ? "#0A0A0A" : c.surface,
    border:`1px solid ${c.border}`, borderRadius:"5px",
    padding:"10px 14px", color:c.text, fontSize:"0.9rem",
    fontFamily:gs, outline:"none",
  };
  const btnPrimary = (disabled) => ({
    background: disabled ? c.surface : c.text,
    color:      disabled ? c.muted   : c.bg,
    border:"none", borderRadius:"6px", padding:"10px 22px",
    fontFamily:gs, fontSize:"0.84rem", fontWeight:600,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    transition:"all 0.2s",
  });

  // ── Loading spinner ────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ background:c.bg, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:"32px", height:"32px", borderRadius:"50%", border:`3px solid ${c.border}`, borderTopColor:c.green, animation:"spin 0.8s linear infinite" }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ background:c.bg, minHeight:"100vh", fontFamily:gs, color:c.text }}>
      {/* Noto Serif needed for price numbers */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;700&display=swap');`}</style>

      <div style={{ maxWidth:"1200px", margin:"0 auto", padding:"2.5rem 3.5rem 4rem" }}>

        {/* Page header */}
        <div style={{ marginBottom:"2rem" }}>
          <p style={{ fontFamily:gs, color:c.muted, fontSize:"0.65rem", letterSpacing:"0.18em", textTransform:"uppercase", marginBottom:"0.4rem", fontWeight:600 }}>Settings</p>
          <h1 style={{ fontFamily:gs, fontSize:"clamp(1.5rem,3vw,2rem)", fontWeight:700, color:c.text }}>My Account</h1>
        </div>

        {/* ─────────────────────── Profile ───────────────────────────────── */}
        <Card c={c}>
          <SectionLabel text="Profile" c={c}/>
          <form onSubmit={updateDisplayName}>
            <p style={{ fontFamily:gs, fontSize:"0.78rem", color:c.muted, marginBottom:"1rem" }}>
              Your display name is shown in the app and used to address you in emails.
            </p>
            <div style={{ marginBottom:"1.25rem" }}>
              <label style={{ display:"block", fontFamily:gs, fontSize:"0.72rem", color:c.muted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"6px", fontWeight:600 }}>Display Name</label>
              <input
                type="text"
                value={nameForm}
                onChange={e => setNameForm(e.target.value)}
                placeholder="e.g. Carlo"
                maxLength={30}
                style={inputStyle}
              />
              <p style={{ fontFamily:gs, fontSize:"0.68rem", color:c.muted, marginTop:"5px" }}>
                {nameForm.trim().length}/30 characters
              </p>
            </div>
            {nameMsg && (
              <div style={{ background: nameMsg.type==="success" ? c.greenDim : "rgba(255,24,0,0.08)", border:`1px solid ${nameMsg.type==="success" ? c.green+"50" : "rgba(255,24,0,0.25)"}`, borderRadius:"6px", padding:"9px 14px", marginBottom:"1rem" }}>
                <p style={{ fontFamily:gs, fontSize:"0.82rem", color: nameMsg.type==="success" ? c.green : c.red }}>{nameMsg.text}</p>
              </div>
            )}
            <button type="submit" disabled={nameLoading || !nameForm.trim()}
              style={btnPrimary(nameLoading || !nameForm.trim())}>
              {nameLoading ? "Saving…" : "Save Name"}
            </button>
          </form>
        </Card>

        {/* ─────────────────────── Subscription ─────────────────────────── */}
        <Card c={c}>
          <SectionLabel text="Subscription" c={c}/>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:"1rem", marginBottom:"1.25rem" }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:"0.6rem", marginBottom:"0.3rem" }}>
                <span style={{ fontFamily:gs, fontSize:"1.2rem", fontWeight:700, color:c.green }}>{limits.label}</span>
                <span style={{ fontFamily:gs, fontSize:"0.65rem", fontWeight:600, color:c.muted, background:c.surface, border:`1px solid ${c.border}`, borderRadius:"4px", padding:"2px 8px", letterSpacing:"0.05em", textTransform:"capitalize" }}>{billingCycle}</span>
              </div>
              <p style={{ fontFamily:gs, fontSize:"0.82rem", color:c.muted }}>{user?.email}</p>
              <p style={{ fontFamily:gs, fontSize:"0.78rem", color:c.muted, marginTop:"3px" }}>Member since {joinedAt}</p>
            </div>
            <div style={{ display:"flex", gap:"0.6rem", flexWrap:"wrap" }}>
              {isUltimate && (
                <button onClick={() => setPlansModalOpen(true)}
                  style={{ background:"transparent", border:`1px solid ${c.border}`, borderRadius:"6px", padding:"9px 20px", fontFamily:gs, fontSize:"0.82rem", fontWeight:600, color:c.text, cursor:"pointer", transition:"all 0.2s" }}>
                  Manage my plan →
                </button>
              )}
              <button onClick={openBillingPortal} disabled={billingLoading}
                style={{ ...btnPrimary(billingLoading), padding:"9px 20px", fontSize:"0.82rem" }}>
                {billingLoading ? "Opening…" : "Manage billing →"}
              </button>
            </div>
          </div>

          {/* Current plan features summary */}
          <div style={{ background:c.surface, borderRadius:"8px", padding:"0.9rem 1rem" }}>
            {[
              ["AI Summaries",     limits.summaries >= 9999 ? "Unlimited" : `Up to ${limits.summaries}/month`],
              ["AI Full Reports",  limits.reports === 0 ? "Not included — upgrade to Pro" : limits.reports >= 9999 ? "Unlimited" : `Up to ${limits.reports}/month`],
              ["Markets",          plan === "essential" ? "US stocks" : plan === "pro" ? "US + UK (coming soon)" : "Global (coming soon)"],
              ["Watchlist",        "Included"],
              ["Virtual Portfolio",plan === "essential" ? "Not included" : "Included"],
            ].map(([label, value], i, arr) => (
              <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom: i < arr.length - 1 ? `1px solid ${c.border}` : "none" }}>
                <span style={{ fontFamily:gs, fontSize:"0.8rem", color:c.muted }}>{label}</span>
                <span style={{ fontFamily:gs, fontSize:"0.8rem", fontWeight:600, color: value.includes("Not") ? c.muted : c.text, textAlign:"right", maxWidth:"55%" }}>{value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* ── Available plans: inline card (non-Ultimate) or popup modal (Ultimate) ── */}
        {isUltimate && plansModalOpen && (
          <div onClick={() => setPlansModalOpen(false)}
            style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.65)", zIndex:500, backdropFilter:"blur(4px)" }}/>
        )}
        {(!isUltimate || plansModalOpen) && (
          <div style={ isUltimate ? {
            position:"fixed", top:"50%", left:"50%",
            transform:"translate(-50%,-50%)",
            width:"min(960px,93vw)", maxHeight:"90vh",
            overflowY:"auto", zIndex:501,
          } : {}}>
            <Card c={c} innerRef={isUltimate ? undefined : planRef} extraStyle={isUltimate ? {} : { scrollMarginTop:"80px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"0.75rem", marginBottom:"0" }}>
                <SectionLabel text={isUltimate ? "Manage your plan" : "Available plans"} c={c}/>

                <div style={{ display:"flex", alignItems:"center", gap:"0.6rem", marginBottom:"1.1rem" }}>
                  {/* Monthly / Yearly toggle */}
                  <div style={{ display:"inline-flex", background:c.surface, border:`1px solid ${c.border}`, borderRadius:"6px", padding:"3px" }}>
                    {["monthly","yearly"].map(b => (
                      <button key={b} onClick={() => setBilling(b)}
                        style={{ background: billing === b ? c.text : "transparent", color: billing === b ? c.bg : c.muted, border:"none", cursor:"pointer", padding:"6px 18px", borderRadius:"4px", fontFamily:gs, fontSize:"0.78rem", fontWeight:600, textTransform:"capitalize", transition:"all 0.22s", display:"flex", alignItems:"center", gap:"0.4rem" }}>
                        {b}
                        {b === "yearly" && (
                          <span style={{ background: mode === "dark" ? "#1A1A1C" : "#FFFFFF", border:`1px solid ${c.borderHi}`, color: billing === "yearly" ? c.bg : c.green, fontSize:"0.6rem", fontWeight:700, padding:"1px 6px", borderRadius:"3px", letterSpacing:"0.02em" }}>
                            −28%
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  {/* Close button — modal only */}
                  {isUltimate && (
                    <button onClick={() => setPlansModalOpen(false)}
                      style={{ background:c.surface, border:`1px solid ${c.border}`, borderRadius:"7px", padding:"6px 10px", cursor:"pointer", color:c.muted, fontFamily:gs, fontSize:"0.78rem", display:"flex", alignItems:"center", gap:"4px", flexShrink:0 }}>
                      ✕ <span style={{ fontSize:"0.58rem", opacity:0.6 }}>ESC</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Currency selector */}
              <p style={{ fontFamily:gs, fontSize:"0.74rem", color:c.muted, marginBottom:"1.5rem" }}>
                Prices in <span style={{ color:c.text, fontWeight:600 }}>{cur}</span>
                {Object.keys(CURR).filter(k => k !== cur).map(k => (
                  <span key={k}>
                    {" · "}
                    <button onClick={() => setCur(k)}
                      style={{ background:"none", border:"none", cursor:"pointer", color:c.muted, fontSize:"0.74rem", fontFamily:gs, textDecoration:"underline", padding:0 }}>
                      {k}
                    </button>
                  </span>
                ))}
              </p>

              {/* Plan cards grid */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))", gap:"1rem", marginBottom:"1.75rem" }}>
                {PLAN_CONFIGS.map(config => (
                  <PlanCard
                    key={config.id}
                    config={config}
                    currentPlan={plan}
                    billing={billing}
                    currency={cur}
                    onUpgrade={handleCheckout}
                    onBillingPortal={openBillingPortal}
                    upgradeLoading={checkoutLoading}
                    mode={mode}
                    c={c}
                  />
                ))}
              </div>

              {/* Downgrade / Cancel row */}
              <div style={{ paddingTop:"1.25rem", borderTop:`1px solid ${c.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"0.75rem" }}>
                <div>
                  <p style={{ fontFamily:gs, fontSize:"0.8rem", color:c.text, fontWeight:600, marginBottom:"3px" }}>Need to downgrade or cancel?</p>
                  <p style={{ fontFamily:gs, fontSize:"0.73rem", color:c.muted }}>Changes take effect at the end of your current billing period.</p>
                </div>
                <button onClick={openBillingPortal} disabled={billingLoading}
                  style={{ background:"transparent", border:`1px solid ${c.border}`, borderRadius:"6px", padding:"8px 18px", fontFamily:gs, fontSize:"0.8rem", color:c.muted, cursor: billingLoading ? "not-allowed" : "pointer", transition:"all 0.2s", flexShrink:0 }}>
                  {billingLoading ? "Opening…" : "Manage subscription →"}
                </button>
              </div>
            </Card>
          </div>
        )}

        {/* ─────────────────────── Usage this month ──────────────────────── */}
        <Card c={c}>
          <SectionLabel text="Usage This Month" c={c}/>
          <UsageBar used={usage.summaries} limit={limits.summaries}        label="AI Summaries"   color={c.green} c={c}/>
          <UsageBar used={usage.reports}   limit={limits.reports === 0 ? 1 : limits.reports} label="AI Full Reports" color={c.blue}  c={c}/>
          {limits.reports === 0 && (
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:c.surface, borderRadius:"7px", padding:"10px 14px", marginTop:"0.5rem" }}>
              <span style={{ fontFamily:gs, fontSize:"0.78rem", color:c.muted }}>Full reports unlock on Pro and above</span>
              <button
                onClick={() => isUltimate
                  ? setPlansModalOpen(true)
                  : planRef.current?.scrollIntoView({ behavior:"smooth", block:"start" })}
                style={{ background:"none", border:`1px solid ${c.border}`, borderRadius:"4px", padding:"4px 12px", cursor:"pointer", fontFamily:gs, fontSize:"0.74rem", color:c.text }}>
                View plans →
              </button>
            </div>
          )}
        </Card>

        {/* ─────────────────────── Security ──────────────────────────────── */}
        <Card c={c}>
          <SectionLabel text="Security" c={c}/>

          {/* Email change */}
          <form onSubmit={changeEmail} style={{ marginBottom:"1.75rem" }}>
            <p style={{ fontFamily:gs, fontSize:"0.78rem", color:c.muted, marginBottom:"1rem" }}>
              Current address: <strong style={{ color:c.text }}>{user?.email}</strong>
            </p>
            <div style={{ marginBottom:"1rem" }}>
              <label style={{ display:"block", fontFamily:gs, fontSize:"0.72rem", color:c.muted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"6px", fontWeight:600 }}>New Email Address</label>
              <input type="email" value={emailForm.new} onChange={e => setEmailForm(p => ({ ...p, new:e.target.value }))}
                placeholder="your@newemail.com"
                style={inputStyle}/>
            </div>
            <div style={{ marginBottom:"1.25rem" }}>
              <label style={{ display:"block", fontFamily:gs, fontSize:"0.72rem", color:c.muted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"6px", fontWeight:600 }}>Confirm New Email Address</label>
              <input type="email" value={emailForm.confirm} onChange={e => setEmailForm(p => ({ ...p, confirm:e.target.value }))}
                placeholder="Repeat your new email"
                style={inputStyle}/>
            </div>
            {emailMsg && (
              <div style={{ background: emailMsg.type === "success" ? c.greenDim : "rgba(255,24,0,0.08)", border:`1px solid ${emailMsg.type === "success" ? c.green + "50" : "rgba(255,24,0,0.25)"}`, borderRadius:"6px", padding:"9px 14px", marginBottom:"1rem" }}>
                <p style={{ fontFamily:gs, fontSize:"0.82rem", color: emailMsg.type === "success" ? c.green : c.red }}>{emailMsg.text}</p>
              </div>
            )}
            <button type="submit" disabled={emailLoading || !emailForm.new || !emailForm.confirm}
              style={btnPrimary(emailLoading || !emailForm.new || !emailForm.confirm)}>
              {emailLoading ? "Sending confirmation…" : "Update Email"}
            </button>
          </form>

          <div style={{ height:"1px", background:c.border, margin:"0 0 1.75rem" }}/>

          {/* Password change */}
          <form onSubmit={changePassword}>
            <div style={{ marginBottom:"1rem" }}>
              <label style={{ display:"block", fontFamily:gs, fontSize:"0.72rem", color:c.muted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"6px", fontWeight:600 }}>New Password</label>
              <input type="password" value={pwForm.new} onChange={e => setPwForm(p => ({ ...p, new:e.target.value }))}
                placeholder="Min 8 chars, uppercase, number, symbol"
                style={inputStyle}/>
            </div>
            <div style={{ marginBottom:"1.25rem" }}>
              <label style={{ display:"block", fontFamily:gs, fontSize:"0.72rem", color:c.muted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"6px", fontWeight:600 }}>Confirm New Password</label>
              <input type="password" value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm:e.target.value }))}
                placeholder="Repeat your new password"
                style={inputStyle}/>
            </div>

            {pwMsg && (
              <div style={{ background: pwMsg.type === "success" ? c.greenDim : "rgba(255,24,0,0.08)", border:`1px solid ${pwMsg.type === "success" ? c.green + "50" : "rgba(255,24,0,0.25)"}`, borderRadius:"6px", padding:"9px 14px", marginBottom:"1rem" }}>
                <p style={{ fontFamily:gs, fontSize:"0.82rem", color: pwMsg.type === "success" ? c.green : c.red }}>{pwMsg.text}</p>
              </div>
            )}

            <button type="submit" disabled={pwLoading || !pwForm.new || !pwForm.confirm}
              style={btnPrimary(pwLoading || !pwForm.new || !pwForm.confirm)}>
              {pwLoading ? "Updating…" : "Update Password"}
            </button>
          </form>
        </Card>

        {/* ─────────────────────── Notifications ────────────────────────── */}
        <Card c={c}>
          <SectionLabel text="Notifications" c={c}/>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:"1.5rem", flexWrap:"wrap" }}>
            <div style={{ flex:1, minWidth:"200px" }}>
              <p style={{ fontFamily:gs, fontSize:"0.88rem", fontWeight:600, color:c.text, marginBottom:"4px" }}>
                {plan === "essential" ? "Monthly market digest" : "Weekly market digest"}
              </p>
              <p style={{ fontFamily:gs, fontSize:"0.78rem", color:c.muted, lineHeight:1.65 }}>
                {plan === "essential"
                  ? "A monthly briefing covering top movers, sector performance, and the key events to watch in the month ahead."
                  : "A weekly briefing every Friday covering top movers, sector performance, and the calendar events to watch next week."}
              </p>
            </div>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:"8px", flexShrink:0 }}>
              {/* Toggle switch */}
              <button
                onClick={() => !digestLoading && toggleDigest(!digestEmails)}
                disabled={digestLoading}
                aria-label={digestEmails ? "Disable digest emails" : "Enable digest emails"}
                style={{
                  width:"48px", height:"26px", borderRadius:"13px",
                  background: digestEmails ? c.green : c.surface,
                  border: `1px solid ${digestEmails ? c.green : c.borderHi}`,
                  cursor: digestLoading ? "not-allowed" : "pointer",
                  position:"relative", transition:"background 0.22s, border-color 0.22s",
                  flexShrink:0, padding:0,
                  opacity: digestLoading ? 0.6 : 1,
                }}>
                <span style={{
                  position:"absolute", top:"3px",
                  left: digestEmails ? "24px" : "3px",
                  width:"18px", height:"18px", borderRadius:"50%",
                  background: digestEmails ? (mode === "dark" ? "#090909" : "#fff") : c.muted,
                  transition:"left 0.22s",
                }}/>
              </button>
              <span style={{ fontFamily:gs, fontSize:"0.72rem", color: digestEmails ? c.green : c.muted, fontWeight:600 }}>
                {digestEmails ? "Enabled" : "Disabled"}
              </span>
            </div>
          </div>
          {digestMsg && (
            <div style={{ background: digestMsg.type === "success" ? c.greenDim : "rgba(255,24,0,0.08)", border:`1px solid ${digestMsg.type === "success" ? c.green + "50" : "rgba(255,24,0,0.25)"}`, borderRadius:"6px", padding:"9px 14px", marginTop:"1rem" }}>
              <p style={{ fontFamily:gs, fontSize:"0.82rem", color: digestMsg.type === "success" ? c.green : c.red }}>{digestMsg.text}</p>
            </div>
          )}
        </Card>

        {/* ─────────────────────── Session ───────────────────────────────── */}
        <Card c={c}>
          <SectionLabel text="Session" c={c}/>
          <p style={{ fontFamily:gs, fontSize:"0.82rem", color:c.muted, marginBottom:"1.1rem" }}>
            Signed in as <strong style={{ color:c.text }}>{user?.email}</strong>
          </p>
          {!signOutConf ? (
            <button onClick={() => setSignOutConf(true)}
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
              <button onClick={() => setSignOutConf(false)}
                style={{ background:"transparent", color:c.muted, border:`1px solid ${c.border}`, borderRadius:"6px", padding:"9px 16px", fontFamily:gs, fontSize:"0.84rem", cursor:"pointer" }}>
                Cancel
              </button>
            </div>
          )}
        </Card>

        <p style={{ fontFamily:gs, color:c.muted, fontSize:"0.7rem", textAlign:"center", marginTop:"1rem" }}>
          For billing support contact{" "}
          <a href="mailto:support@clarinvest.app" style={{ color:c.blue, textDecoration:"none" }}>support@clarinvest.app</a>
        </p>

      </div>
    </div>
  );
}