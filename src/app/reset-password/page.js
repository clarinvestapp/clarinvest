"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [error,    setError]    = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [ready,    setReady]    = useState(false);
  const router   = useRouter();
  const supabase = createClient();

  const c = {
    bg:"#090909", card:"#111113", border:"#232325",
    text:"#F0F0F0", muted:"#7A7A80",
  };

  useEffect(() => {
    const handleTokens = async () => {
      // Method 1: PKCE flow — token comes as ?code= in query string
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setError("This reset link is invalid or has expired. Please request a new one.");
        } else {
          setReady(true);
        }
        return;
      }

      // Method 2: Implicit flow — token comes as #access_token= in hash
      const hash = window.location.hash;
      if (hash) {
        const hashParams = new URLSearchParams(hash.replace("#", ""));
        const accessToken  = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) {
            setError("This reset link is invalid or has expired. Please request a new one.");
          } else {
            setReady(true);
          }
          return;
        }
      }

      setError("No reset token found. Please use the link from your email.");
    };

    handleTokens();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (!/[A-Z]/.test(password)) { setError("Password must contain at least one uppercase letter."); return; }
    if (!/[0-9]/.test(password)) { setError("Password must contain at least one number."); return; }
    if (!/[^A-Za-z0-9]/.test(password)) { setError("Password must contain at least one special character."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setError(error.message); setLoading(false); }
    else router.push("/dashboard");
  };

  const inputStyle = {
    width:"100%", background:"#0A0A0A", border:`1px solid ${c.border}`,
    borderRadius:"5px", padding:"11px 14px", color:c.text,
    fontSize:"0.95rem", fontFamily:"inherit", outline:"none", boxSizing:"border-box",
  };

  const labelStyle = {
    display:"block", color:c.muted, fontSize:"0.78rem", fontWeight:600,
    letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:"0.5rem",
  };

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
            Choose a new password for your Clarinvest account.
          </p>

          {!ready && !error && (
            <p style={{ color:c.muted, fontSize:"0.9rem", textAlign:"center" }}>
              Verifying your link...
            </p>
          )}

          {error && (
            <div style={{ background:"rgba(255,24,0,0.08)", border:"1px solid rgba(255,24,0,0.25)", borderRadius:"6px", padding:"10px 14px", marginBottom:"1.25rem" }}>
              <p style={{ color:"#FF1800", fontSize:"0.85rem", margin:0 }}>{error}</p>
              <p style={{ marginTop:"0.75rem", margin:0 }}>
                <a href="/forgot-password" style={{ color:c.text, fontSize:"0.85rem", fontWeight:600 }}>
                  Request a new reset link
                </a>
              </p>
            </div>
          )}

          {ready && (
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom:"1.25rem" }}>
                <label style={labelStyle}>New password</label>
                <input type="password" required value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min 8 chars, uppercase, number, symbol"
                  style={inputStyle}/>
              </div>
              <div style={{ marginBottom:"1.75rem" }}>
                <label style={labelStyle}>Confirm password</label>
                <input type="password" required value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat your password"
                  style={inputStyle}/>
              </div>
              <button type="submit" disabled={loading}
                style={{ width:"100%", background:c.text, color:c.bg, border:"none", borderRadius:"5px", padding:"13px", fontSize:"0.88rem", fontWeight:600, fontFamily:"inherit", cursor:loading?"not-allowed":"pointer", opacity:loading?0.7:1 }}>
                {loading ? "Updating password..." : "Set new password →"}
              </button>
            </form>
          )}
        </div>

        <p style={{ textAlign:"center", marginTop:"1.5rem", color:c.muted, fontSize:"0.88rem" }}>
          Need help?{" "}
          <a href="mailto:support@clarinvest.app" style={{ color:c.text, fontWeight:600, textDecoration:"none" }}>
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}