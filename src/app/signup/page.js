"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(null);
  const router = useRouter();
  const supabase = createClient();

  const handleOAuth = async (provider) => {
    setOauthLoading(provider);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setOauthLoading(null);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setConfirmed(true);
      setLoading(false);
    }
  };

  const c = {
    bg: "#090909", card: "#111113", border: "#232325",
    text: "#F0F0F0", muted: "#7A7A80", green: "#00E676",
  };

  if (confirmed) return (
    <div style={{ minHeight:"100vh", background:c.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Google Sans Flex','DM Sans',sans-serif" }}>
      <div style={{ textAlign:"center", maxWidth:"420px", padding:"0 1.5rem" }}>
        <div style={{ fontSize:"2.5rem", marginBottom:"1rem" }}>✉️</div>
        <h2 style={{ fontFamily:"'Noto Serif',serif", fontSize:"1.8rem", fontWeight:700, color:c.text, marginBottom:"0.75rem" }}>Check your email</h2>
        <p style={{ color:c.muted, lineHeight:1.7 }}>We sent a confirmation link to <strong style={{ color:c.text }}>{email}</strong>. Click it to activate your account and continue to your dashboard.</p>
      </div>
    </div>
  );

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
          <h1 style={{ fontFamily:"'Noto Serif',serif", fontSize:"1.6rem", fontWeight:700, color:c.text, marginBottom:"0.5rem" }}>Create your account</h1>
          <p style={{ color:c.muted, fontSize:"0.9rem", marginBottom:"2rem" }}>Start investing with absolute clarity.</p>

          {/* Social login */}
          <div style={{ display:"flex", gap:"0.75rem", marginBottom:"1.5rem" }}>
            <button type="button" onClick={() => handleOAuth("google")} disabled={!!oauthLoading}
              style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:"0.55rem", background:"#0A0A0A", border:`1px solid ${c.border}`, borderRadius:"5px", padding:"11px", cursor:oauthLoading?"not-allowed":"pointer", opacity:oauthLoading==="google"?0.7:1, transition:"opacity 0.18s", fontFamily:"inherit", fontSize:"0.85rem", fontWeight:600, color:c.text }}>
              <svg width="17" height="17" viewBox="0 0 24 24" style={{flexShrink:0}}>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {oauthLoading==="google" ? "Connecting..." : "Google"}
            </button>
            <button type="button" onClick={() => handleOAuth("twitter")} disabled={!!oauthLoading}
              style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:"0.55rem", background:"#0A0A0A", border:`1px solid ${c.border}`, borderRadius:"5px", padding:"11px", cursor:oauthLoading?"not-allowed":"pointer", opacity:oauthLoading==="twitter"?0.7:1, transition:"opacity 0.18s", fontFamily:"inherit", fontSize:"0.85rem", fontWeight:600, color:c.text }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style={{flexShrink:0}}>
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              {oauthLoading==="twitter" ? "Connecting..." : "X"}
            </button>
          </div>

          {/* Divider */}
          <div style={{ display:"flex", alignItems:"center", gap:"0.75rem", marginBottom:"1.5rem" }}>
            <div style={{ flex:1, height:"1px", background:c.border }}/>
            <span style={{ fontSize:"0.72rem", color:c.muted, letterSpacing:"0.08em", textTransform:"uppercase", fontFamily:"inherit" }}>or</span>
            <div style={{ flex:1, height:"1px", background:c.border }}/>
          </div>

          <form onSubmit={handleSignup}>
            <div style={{ marginBottom:"1.25rem" }}>
              <label style={{ display:"block", color:c.muted, fontSize:"0.78rem", fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"0.5rem" }}>Email</label>
              <input
                type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{ width:"100%", background:"#0A0A0A", border:`1px solid ${c.border}`, borderRadius:"5px", padding:"11px 14px", color:c.text, fontSize:"0.95rem", fontFamily:"inherit", outline:"none", boxSizing:"border-box" }}
              />
            </div>

            <div style={{ marginBottom:"1.75rem" }}>
              <label style={{ display:"block", color:c.muted, fontSize:"0.78rem", fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"0.5rem" }}>Password</label>
              <input
                type="password" required value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                style={{ width:"100%", background:"#0A0A0A", border:`1px solid ${c.border}`, borderRadius:"5px", padding:"11px 14px", color:c.text, fontSize:"0.95rem", fontFamily:"inherit", outline:"none", boxSizing:"border-box" }}
              />
            </div>

            {error && (
              <div style={{ background:"rgba(255,24,0,0.08)", border:"1px solid rgba(255,24,0,0.25)", borderRadius:"6px", padding:"10px 14px", marginBottom:"1.25rem" }}>
                <p style={{ color:"#FF1800", fontSize:"0.85rem", margin:0 }}>{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{ width:"100%", background:c.text, color:c.bg, border:"none", borderRadius:"5px", padding:"13px", fontSize:"0.88rem", fontWeight:600, fontFamily:"inherit", cursor:loading?"not-allowed":"pointer", opacity:loading?0.7:1, letterSpacing:"0.04em" }}>
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>
        </div>

        <p style={{ textAlign:"center", marginTop:"1.5rem", color:c.muted, fontSize:"0.88rem" }}>
          Already have an account?{" "}
          <a href="/login" style={{ color:c.text, fontWeight:600, textDecoration:"none" }}>Sign in</a>
        </p>
      </div>
    </div>
  );
}