"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
      } else {
        setUser(user);
        setLoading(false);
      }
    };
    getUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const c = {
    bg: "#090909", card: "#111113", border: "#232325",
    text: "#F0F0F0", muted: "#7A7A80", green: "#00E676",
    surface: "#141416",
  };

  if (loading) return (
    <div style={{ minHeight:"100vh", background:c.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <p style={{ color:c.muted, fontFamily:"'Google Sans Flex',sans-serif" }}>Loading...</p>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:c.bg, fontFamily:"'Google Sans Flex','DM Sans',sans-serif" }}>
      {/* Nav */}
      <nav style={{ borderBottom:`1px solid ${c.border}`, padding:"0 2.5rem", height:"62px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.1rem", fontWeight:600, letterSpacing:"0.03em", textTransform:"uppercase", color:c.text }}>Clarinvest</span>
        <button onClick={handleLogout}
          style={{ background:"transparent", border:`1px solid ${c.border}`, borderRadius:"4px", padding:"7px 18px", color:c.muted, fontSize:"0.82rem", fontFamily:"inherit", cursor:"pointer" }}>
          Sign out
        </button>
      </nav>

      {/* Content */}
      <div style={{ maxWidth:"900px", margin:"0 auto", padding:"4rem 2rem" }}>
        <div style={{ marginBottom:"3rem" }}>
          <p style={{ color:c.green, fontSize:"0.68rem", letterSpacing:"0.18em", textTransform:"uppercase", fontWeight:600, marginBottom:"0.75rem" }}>Dashboard</p>
          <h1 style={{ fontFamily:"'Noto Serif',serif", fontSize:"clamp(1.8rem,4vw,2.8rem)", fontWeight:700, color:c.text, marginBottom:"0.5rem" }}>Welcome to Clarinvest</h1>
          <p style={{ color:c.muted, fontSize:"0.95rem" }}>Signed in as <strong style={{ color:c.text }}>{user.email}</strong></p>
        </div>

        {/* Placeholder cards */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:"1.25rem" }}>
          {["Stock Analysis", "My Watchlist", "Market Overview", "Account Settings"].map((item, i) => (
            <div key={i} style={{ background:c.card, border:`1px solid ${c.border}`, borderRadius:"14px", padding:"2rem", opacity:0.5 }}>
              <p style={{ color:c.muted, fontSize:"0.68rem", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:"0.5rem" }}>Coming soon</p>
              <h3 style={{ color:c.text, fontSize:"1.05rem", fontWeight:600 }}>{item}</h3>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}