"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  const c = {
    bg: "#090909", card: "#111113", border: "#232325",
    text: "#F0F0F0", muted: "#7A7A80", green: "#00E676",
  };

  return (
    <div style={{ minHeight:"100vh", background:c.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Google Sans Flex','DM Sans',sans-serif" }}>
      <div style={{ width:"100%", maxWidth:"420px", padding:"0 1.5rem" }}>

        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:"2.5rem" }}>
          <a href="/" style={{ textDecoration:"none" }}>
            <span style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.2rem", fontWeight:600, letterSpacing:"0.03em", textTransform:"uppercase", color:c.text }}>
              Clarinvest
            </span>
          </a>
        </div>

        <div style={{ background:c.card, border:`1px solid ${c.border}`, borderRadius:"14px", padding:"2.5rem 2rem" }}>
          <h1 style={{ fontFamily:"'Noto Serif',serif", fontSize:"1.6rem", fontWeight:700, color:c.text, marginBottom:"0.5rem" }}>Welcome back</h1>
          <p style={{ color:c.muted, fontSize:"0.9rem", marginBottom:"2rem" }}>Sign in to your Clarinvest account.</p>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom:"1.25rem" }}>
              <label style={{ display:"block", color:c.muted, fontSize:"0.78rem", fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"0.5rem" }}>Email</label>
              <input
                type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{ width:"100%", background:"#0A0A0A", border:`1px solid ${c.border}`, borderRadius:"5px", padding:"11px 14px", color:c.text, fontSize:"0.95rem", fontFamily:"inherit", outline:"none", boxSizing:"border-box" }}
              />
            </div>

            <div style={{ marginBottom:"0.75rem" }}>
              <label style={{ display:"block", color:c.muted, fontSize:"0.78rem", fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"0.5rem" }}>Password</label>
              <input
                type="password" required value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Your password"
                style={{ width:"100%", background:"#0A0A0A", border:`1px solid ${c.border}`, borderRadius:"5px", padding:"11px 14px", color:c.text, fontSize:"0.95rem", fontFamily:"inherit", outline:"none", boxSizing:"border-box" }}
              />
            </div>

            <div style={{ textAlign:"right", marginBottom:"1.75rem" }}>
             <a href="/forgot-password" style={{ color:c.muted, fontSize:"0.83rem", textDecoration:"none" }}>Forgot password?</a>
            </div>

            {error && (
              <div style={{ background:"rgba(255,24,0,0.08)", border:"1px solid rgba(255,24,0,0.25)", borderRadius:"6px", padding:"10px 14px", marginBottom:"1.25rem" }}>
                <p style={{ color:"#FF1800", fontSize:"0.85rem", margin:0 }}>{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{ width:"100%", background:c.text, color:c.bg, border:"none", borderRadius:"5px", padding:"13px", fontSize:"0.88rem", fontWeight:600, fontFamily:"inherit", cursor:loading?"not-allowed":"pointer", opacity:loading?0.7:1, letterSpacing:"0.04em" }}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>

        <p style={{ textAlign:"center", marginTop:"1.5rem", color:c.muted, fontSize:"0.88rem" }}>
         No account yet?{" "}
         <a href="/#pricing" style={{ color:c.text, fontWeight:600, textDecoration:"none" }}>View plans</a>
        </p>
      </div>
    </div>
  );
}