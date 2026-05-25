"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { ThemeProvider, useTheme } from "@/lib/theme";

const C = {
  dark:  { bg:"#090909", card:"#111113", surface:"#141416", border:"#232325", borderHi:"#333336", text:"#F0F0F0", muted:"#7A7A80", green:"#00E676" },
  light: { bg:"#F7F7F5", card:"#FFFFFF",  surface:"#EEEEED", border:"#DEDEDD",  borderHi:"#BABAB8", text:"#0A0A0A", muted:"#606065", green:"#008A38" },
};
const gs = "'Google Sans Flex','DM Sans',sans-serif";
const pf = "'Playfair Display',Georgia,serif";

const NAV_ITEMS = [
  { label:"Discovery",  href:"/dashboard",            icon:"◈", ready:true  },
  { label:"Watchlist",  href:"/dashboard/watchlist",  icon:"♡", ready:true  },
  { label:"Dividends",  href:"/dashboard/dividends",  icon:"💰", ready:true  },
  { label:"Portfolio",  href:"/dashboard/portfolio",  icon:"▲", ready:false },
  { label:"Account",    href:"/dashboard/account",    icon:"○", ready:true  },
];

// ─── Banner colours ──────────────────────────────────────────────────────────
const BCOLS = {
  dark: {
    info:   { bg:"rgba(68,136,255,0.12)",  brd:"rgba(68,136,255,0.35)",  txt:"#4488FF" },
    promo:  { bg:"rgba(0,230,118,0.10)",   brd:"rgba(0,230,118,0.35)",   txt:"#00E676" },
    urgent: { bg:"rgba(255,24,0,0.10)",    brd:"rgba(255,24,0,0.35)",    txt:"#FF1800" },
  },
  light: {
    info:   { bg:"rgba(30,85,204,0.08)",   brd:"rgba(30,85,204,0.30)",   txt:"#1E55CC" },
    promo:  { bg:"rgba(0,138,56,0.08)",    brd:"rgba(0,138,56,0.30)",    txt:"#008A38" },
    urgent: { bg:"rgba(204,0,0,0.08)",     brd:"rgba(204,0,0,0.30)",     txt:"#CC0000" },
  },
};

function BannerStrip({ banners, mode, dismissed, onDismiss, side="top" }) {
  const visible = banners.filter(b => !dismissed.has(b.id));
  if (!visible.length) return null;
  const isTop = side === "top";
  return (
    <div style={{ position:"fixed", [side]:0, left:0, right:0, zIndex:201 }}>
      {visible.map(b => {
        const col = (BCOLS[mode] || BCOLS.dark)[b.type] || BCOLS.dark.info;
        return (
          <div key={b.id} style={{ background:col.bg, borderBottom:isTop?"1px solid "+col.brd:undefined, borderTop:!isTop?"1px solid "+col.brd:undefined, padding:"8px 1.5rem", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"0.75rem" }}>
            <p style={{ fontFamily:gs, fontSize:"0.8rem", color:col.txt, flex:1, textAlign:"center" }}>{b.text}</p>
            <button onClick={() => onDismiss(b.id)}
              style={{ background:"none", border:"none", cursor:"pointer", color:col.txt, opacity:0.6, fontSize:"0.85rem", flexShrink:0, padding:"2px 6px" }}>✕</button>
          </div>
        );
      })}
    </div>
  );
}

function DashboardShell({ children }) {
  const { mode, setMode } = useTheme();
  const c = C[mode];
  const router   = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const [user,      setUser]      = useState(null);
  const [plan,      setPlan]      = useState(null);
  const [solid,     setSolid]     = useState(false);
  const [banners,   setBanners]   = useState([]);
  const [dismissed, setDismissed] = useState(new Set());

  useEffect(() => {
    supabase.auth.getUser().then(({ data:{ user } }) => {
      if (!user) { router.push("/login"); return; }
      setUser(user);
      const p = user.user_metadata?.plan || "essential";
      setPlan(p);
      fetch("/api/banners?target=" + p)
        .then(r => r.json())
        .then(d => setBanners(d.banners || []))
        .catch(() => {});
    });
  }, []);

  useEffect(() => {
    const h = () => setSolid(window.scrollY > 10);
    window.addEventListener("scroll", h, { passive:true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  const planLabel = plan === "ultimate" ? "Ultimate" : plan === "pro" ? "Pro" : "Essential";
  const initials  = user?.email?.[0]?.toUpperCase() ?? "?";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const dismissBanner = (id) => setDismissed(prev => new Set([...prev, id]));
  const visibleBanners = banners.filter(b => !dismissed.has(b.id));
  const topBanners     = visibleBanners.filter(b => b.position === "top");

  return (
    <div style={{ minHeight:"100vh", background:c.bg, color:c.text, fontFamily:gs, transition:"background 0.3s,color 0.3s" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600&family=Google+Sans+Flex:opsz,wght@8..144,300..700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-thumb{background:#303032;border-radius:2px;}
        .nav-link{background:none;border:none;cursor:pointer;font-family:inherit;transition:color 0.18s;}
        .nav-link:hover{opacity:0.6;}
        @media(max-width:700px){
          .desktop-nav{display:none !important;}
          .bottom-tabs{display:flex !important;}
          .page-content{padding-bottom:72px !important;}
        }
        @media(min-width:701px){
          .bottom-tabs{display:none !important;}
          .tier-label{display:inline !important;}
        }
      `}</style>

      {/* ── Top banners ── */}
      <BannerStrip banners={topBanners} mode={mode} dismissed={dismissed} onDismiss={dismissBanner}/>

      {/* ── Top nav ── */}
      <nav className="desktop-nav" style={{
        position:"sticky", top:0, zIndex:200, height:"58px",
        background: solid
          ? (mode==="dark" ? "rgba(9,9,9,0.97)"  : "rgba(247,247,245,0.97)")
          : (mode==="dark" ? "rgba(9,9,9,0.70)"  : "rgba(247,247,245,0.70)"),
        backdropFilter:"blur(12px)",
        borderBottom:`1px solid ${solid ? c.border : "transparent"}`,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"0 2.5rem", gap:"1rem",
        transition:"background 0.3s,border-color 0.3s",
      }}>
        {/* Logo */}
        <button onClick={() => router.push("/dashboard")}
          style={{ background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:"0.6rem", flexShrink:0 }}>
          <svg width="20" height="20" viewBox="0 0 200 200">
            <rect x="8"   y="8"   width="84" height="84" rx="10" fill={c.text}/>
            <rect x="108" y="8"   width="84" height="84" rx="10" fill={c.text} opacity="0.22"/>
            <rect x="8"   y="108" width="84" height="84" rx="10" fill={c.text} opacity="0.22"/>
            <rect x="108" y="108" width="84" height="84" rx="10" fill={c.text}/>
          </svg>
          <span style={{ fontFamily:pf, fontSize:"1rem", fontWeight:600, letterSpacing:"0.03em", textTransform:"uppercase", color:c.text }}>Clarinvest</span>
        </button>

        {/* Nav links */}
        <div style={{ display:"flex", gap:"0.2rem", flex:1, justifyContent:"center" }}>
          {NAV_ITEMS.map(n => {
            const active = pathname === n.href || (n.href !== "/dashboard" && pathname.startsWith(n.href));
            return (
              <button key={n.href} className="nav-link"
                onClick={() => n.ready && router.push(n.href)}
                title={n.ready ? n.label : n.label + " — coming soon"}
                style={{ fontFamily:gs, fontSize:"0.83rem", fontWeight:active?600:400, color:active?c.text:c.muted, padding:"6px 14px", borderRadius:"5px", background:active?c.surface:"transparent", opacity:n.ready?1:0.4, cursor:n.ready?"pointer":"default" }}>
                {n.label}
              </button>
            );
          })}
        </div>

        {/* Right side */}
        <div style={{ display:"flex", alignItems:"center", gap:"0.75rem", flexShrink:0 }}>
          <button onClick={() => setMode(mode==="dark"?"light":"dark")}
            style={{ background:c.surface, border:"1px solid "+c.border, borderRadius:"50px", padding:"5px 12px", cursor:"pointer", display:"flex", alignItems:"center", gap:"4px", color:c.muted, fontSize:"0.76rem", fontFamily:gs }}>
            <span>{mode==="dark"?"☀":"☾"}</span>
            <span>{mode==="dark"?"Light":"Dark"}</span>
          </button>
          <span className="tier-label" style={{ display:"none", fontFamily:gs, fontSize:"0.74rem", color:c.muted }}>{planLabel}</span>
          <div style={{ position:"relative" }}>
            <button onClick={handleSignOut} title="Sign out"
              style={{ width:"32px", height:"32px", borderRadius:"50%", background:"linear-gradient(135deg,#1A1A1C,#2A2A2E)", border:"1px solid "+c.borderHi, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
              <span style={{ fontFamily:gs, fontSize:"0.72rem", color:c.muted, fontWeight:600 }}>{initials}</span>
            </button>
            <span style={{ position:"absolute", bottom:"-2px", right:"-2px", background:c.green, color:"#050505", fontSize:"0.42rem", fontWeight:800, fontFamily:gs, padding:"1px 3px", borderRadius:"3px", lineHeight:1.2 }}>
              {planLabel.toUpperCase().slice(0,3)}
            </span>
          </div>
        </div>
      </nav>

      {/* ── Page content ── */}
      <div className="page-content" style={{ paddingTop:"58px" }}>
        {children}
      </div>

      {/* ── Mobile bottom tabs ── */}
      <div className="bottom-tabs" style={{
        position:"fixed", bottom:0, left:0, right:0, zIndex:200,
        background: mode==="dark" ? "rgba(9,9,9,0.97)" : "rgba(247,247,245,0.97)",
        backdropFilter:"blur(12px)",
        borderTop:"1px solid "+c.border,
        height:"64px", alignItems:"center", justifyContent:"space-around",
        padding:"0 0.5rem",
      }}>
        {NAV_ITEMS.map(n => {
          const active = pathname === n.href || (n.href !== "/dashboard" && pathname.startsWith(n.href));
          return (
            <button key={n.href} onClick={() => n.ready && router.push(n.href)}
              style={{ background:"none", border:"none", cursor:n.ready?"pointer":"default", display:"flex", flexDirection:"column", alignItems:"center", gap:"3px", padding:"6px 12px", flex:1, opacity:n.ready?1:0.4 }}>
              <span style={{ fontSize:"1.1rem", color:active?c.green:c.muted }}>{n.icon}</span>
              <span style={{ fontFamily:gs, fontSize:"0.62rem", fontWeight:active?600:400, color:active?c.text:c.muted, letterSpacing:"0.04em" }}>{n.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }) {
  return (
    <ThemeProvider>
      <DashboardShell>{children}</DashboardShell>
    </ThemeProvider>
  );
}