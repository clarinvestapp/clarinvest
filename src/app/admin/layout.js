"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { ThemeProvider, useTheme } from "@/lib/theme";

const C = {
  dark:  { bg:"#090909", sidebar:"#0D0D0F", card:"#111113", surface:"#141416", border:"#232325", borderHi:"#333336", text:"#F0F0F0", muted:"#7A7A80", green:"#00E676", red:"#FF1800", amber:"#F59E0B", blue:"#4488FF" },
  light: { bg:"#F7F7F5", sidebar:"#FFFFFF",  card:"#FFFFFF",  surface:"#EEEEED", border:"#DEDEDD",  borderHi:"#BABAB8", text:"#0A0A0A", muted:"#606065", green:"#008A38", red:"#CC0000", amber:"#B45309", blue:"#1E55CC" },
};
const gs = "'Google Sans Flex','DM Sans',sans-serif";

const NAV = [
  { href:"/admin",          label:"Overview",  icon:"◈" },
  { href:"/admin/discounts",label:"Discounts", icon:"%" },
  { href:"/admin/trials",   label:"Trials",    icon:"◇" },
  { href:"/admin/banners",  label:"Banners",   icon:"▣" },
];

function AdminShell({ children }) {
  const { mode, setMode } = useTheme();
  const c = C[mode];
  const router   = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [authed, setAuthed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data:{ user } }) => {
      if (!user || user.user_metadata?.role !== "admin") {
        router.replace("/dashboard");
      } else {
        setAuthed(true);
      }
    });
  }, []);

  if (!authed) return (
    <div style={{ background:c.bg, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ fontFamily:gs, color:c.muted, fontSize:"0.85rem" }}>Verifying access…</div>
    </div>
  );

  const SideNav = () => (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", padding:"1.5rem 1rem" }}>
      {/* Logo */}
      <div style={{ marginBottom:"2rem", paddingLeft:"0.5rem" }}>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1rem", fontWeight:600, letterSpacing:"0.03em", textTransform:"uppercase", color:c.text }}>Clarinvest</div>
        <div style={{ fontFamily:gs, fontSize:"0.64rem", color:c.muted, letterSpacing:"0.1em", textTransform:"uppercase", marginTop:"2px" }}>Admin Panel</div>
      </div>

      {/* Nav links */}
      <nav style={{ flex:1 }}>
        {NAV.map(n => {
          const active = pathname === n.href;
          return (
            <button key={n.href} onClick={() => { router.push(n.href); setMobileNav(false); }}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:"0.6rem", padding:"9px 12px", borderRadius:"8px", border:"none", background:active?c.surface:"transparent", color:active?c.text:c.muted, fontFamily:gs, fontSize:"0.84rem", fontWeight:active?600:400, cursor:"pointer", marginBottom:"2px", textAlign:"left", transition:"all 0.15s" }}>
              <span style={{ fontSize:"0.85rem", opacity:0.8 }}>{n.icon}</span>
              {n.label}
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div style={{ borderTop:`1px solid ${c.border}`, paddingTop:"1rem", display:"flex", flexDirection:"column", gap:"0.4rem" }}>
        <button onClick={() => setMode(mode==="dark"?"light":"dark")}
          style={{ display:"flex", alignItems:"center", gap:"0.5rem", padding:"8px 12px", borderRadius:"7px", border:"none", background:"transparent", color:c.muted, fontFamily:gs, fontSize:"0.78rem", cursor:"pointer", textAlign:"left" }}>
          <span>{mode==="dark"?"☀":"☾"}</span> {mode==="dark"?"Light Mode":"Dark Mode"}
        </button>
        <button onClick={() => router.push("/dashboard")}
          style={{ display:"flex", alignItems:"center", gap:"0.5rem", padding:"8px 12px", borderRadius:"7px", border:"none", background:"transparent", color:c.muted, fontFamily:gs, fontSize:"0.78rem", cursor:"pointer", textAlign:"left" }}>
          ← Back to App
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:c.bg, fontFamily:gs, color:c.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600&family=Google+Sans+Flex:opsz,wght@8..144,300..700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-thumb{background:#303032;border-radius:2px;}
        input,textarea,select{font-family:'Google Sans Flex','DM Sans',sans-serif;outline:none;}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.45}}
      `}</style>

      {/* Desktop sidebar */}
      <aside style={{ width:"220px", background:c.sidebar, borderRight:`1px solid ${c.border}`, flexShrink:0, position:"sticky", top:0, height:"100vh", overflow:"auto", display:"none" }} className="admin-sidebar">
        <SideNav/>
      </aside>

      <style>{`
        @media(min-width:768px){.admin-sidebar{display:block !important;}.admin-topbar{display:none !important;}}
        @media(max-width:767px){.admin-sidebar{display:none !important;}}
      `}</style>

      {/* Mobile top bar */}
      <div className="admin-topbar" style={{ position:"fixed", top:0, left:0, right:0, zIndex:100, height:"52px", background:c.sidebar, borderBottom:`1px solid ${c.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 1.25rem" }}>
        <span style={{ fontFamily:"'Playfair Display',serif", fontSize:"0.95rem", fontWeight:600, letterSpacing:"0.03em", textTransform:"uppercase", color:c.text }}>Admin</span>
        <button onClick={() => setMobileNav(!mobileNav)} style={{ background:"none", border:"none", cursor:"pointer", color:c.text, fontSize:"1.2rem" }}>☰</button>
      </div>

      {/* Mobile nav drawer */}
      {mobileNav && (
        <div style={{ position:"fixed", inset:0, zIndex:200 }}>
          <div onClick={() => setMobileNav(false)} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.5)" }}/>
          <div style={{ position:"absolute", left:0, top:0, bottom:0, width:"240px", background:c.sidebar, borderRight:`1px solid ${c.border}` }}>
            <SideNav/>
          </div>
        </div>
      )}

      {/* Main content */}
      <main style={{ flex:1, overflow:"auto", paddingTop:0 }} className="admin-main">
        <style>{`@media(max-width:767px){.admin-main{padding-top:52px !important;}}`}</style>
        {children}
      </main>
    </div>
  );
}

export default function AdminLayout({ children }) {
  return (
    <ThemeProvider>
      <AdminShell>{children}</AdminShell>
    </ThemeProvider>
  );
}