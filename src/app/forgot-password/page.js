"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email,     setEmail]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error,     setError]     = useState(null);
  const supabase = createClient();

  const c = {
    bg:"#090909", card:"#111113", border:"#232325",
    text:"#F0F0F0", muted:"#7A7A80",
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSubmitted(true);
    }
  };

  if (submitted) return (
    <div style={{ minHeight:"100vh", background:c.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Google Sans Flex','DM Sans',sans-serif" }}>
      <div style={{ textAlign:"center", maxWidth:"420px", padding:"0 1.5rem" }}>
        <div style={{ fontSize:"2.5rem", marginBottom:"1rem" }}>✉️</div>
        <h2 style={{ fontFamily:"'Noto Serif',serif", fontSize:"1.8rem", fontWeight:700, color:c.text, marginBottom:"0.75rem" }}>Check your email</h2>
        <p style={{ color:c.muted, lineHeight:1.7 }}>
          We sent a password reset link to <strong style={{ color:c.text }}>{email}</strong>. Click it to choose a new password.
        </p>
        <p style={{ color:c.muted, fontSize:"0.85rem", marginTop:"1rem" }}>
          Did not receive it?{" "}
          <button onClick={() => setSubmitted(false)}
            style={{ background:"none", border:"none", cursor:"pointer", color:c.text, fontWeight:600, fontSize:"0.85rem", fontFamily:"inherit" }}>
            Try again
          </button>
        </p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:c.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Google Sans Flex','DM Sans',sans-serif" }}>
      <div style={{ width:"100%", maxWidth:"420px", padding:"0 1.5rem" }}>

        <div style={{ textAlign:"center", marginBottom:"2.5rem" }}>
          <a href="/" style={{ textDecoration:"none" }}>
            <span style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.2rem", fontWeight:600, letterSpacing:"0.03em", textTransform:"uppercase", color:c.text }}>
              Clarinvest
            </span>
          </a>
        </div>

        <div style={{ background:c.card, border:`1px solid ${c.border}`, borderRadius:"14px", padding:"2.5rem 2rem" }}>
          <h1 style={{ fontFamily:"'Noto Serif',serif", fontSize:"1.6rem", fontWeight:700, color:c.text, marginBottom:"0.5rem" }}>
            Reset your password
          </h1>
          <p style={{ color:c.muted, fontSize:"0.9rem", marginBottom:"2rem" }}>
            Enter your email and we will send you a reset link.
          </p>

          {error && (
            <div style={{ background:"rgba(255,24,0,0.08)", border:"1px solid rgba(255,24,0,0.25)", borderRadius:"6px", padding:"10px 14px", marginBottom:"1.25rem" }}>
              <p style={{ color:"#FF1800", fontSize:"0.85rem", margin:0 }}>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom:"1.75rem" }}>
              <label style={{ display:"block", color:c.muted, fontSize:"0.78rem", fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"0.5rem" }}>
                Email address
              </label>
              <input
                type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{ width:"100%", background:"#0A0A0A", border:`1px solid ${c.border}`, borderRadius:"5px", padding:"11px 14px", color:c.text, fontSize:"0.95rem", fontFamily:"inherit", outline:"none", boxSizing:"border-box" }}
              />
            </div>

            <button type="submit" disabled={loading}
              style={{ width:"100%", background:c.text, color:c.bg, border:"none", borderRadius:"5px", padding:"13px", fontSize:"0.88rem", fontWeight:600, fontFamily:"inherit", cursor:loading?"not-allowed":"pointer", opacity:loading?0.7:1 }}>
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>
        </div>

        <p style={{ textAlign:"center", marginTop:"1.5rem", color:c.muted, fontSize:"0.88rem" }}>
          Remembered it?{" "}
          <a href="/login" style={{ color:c.text, fontWeight:600, textDecoration:"none" }}>Sign in</a>
        </p>
      </div>
    </div>
  );
}