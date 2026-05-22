"use client";
import { useTheme } from "@/lib/theme";
import { createClient } from "@/lib/supabase";
import { useEffect, useState } from "react";

export default function AccountPage() {
  const { mode } = useTheme();
  const [user, setUser] = useState(null);
  const c = mode === "dark"
    ? { bg:"#090909", card:"#111113", border:"#232325", text:"#F0F0F0", muted:"#7A7A80", green:"#00E676" }
    : { bg:"#F7F7F5", card:"#FFFFFF",  border:"#DEDEDD",  text:"#0A0A0A", muted:"#606065", green:"#008A38" };
  const gs = "'Google Sans Flex','DM Sans',sans-serif";
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  const plan = user?.user_metadata?.plan || "essential";

  return (
    <div style={{ background:c.bg, minHeight:"100vh", fontFamily:gs }}>
      <div style={{ maxWidth:"640px", margin:"0 auto", padding:"2.5rem 2rem" }}>
        <p style={{ color:c.muted, fontSize:"0.65rem", letterSpacing:"0.18em", textTransform:"uppercase", marginBottom:"0.4rem", fontWeight:600 }}>Account</p>
        <h1 style={{ fontSize:"2rem", fontWeight:700, color:c.text, marginBottom:"2rem" }}>My Account</h1>

        <div style={{ background:c.card, border:`1px solid ${c.border}`, borderRadius:"14px", padding:"2rem", marginBottom:"1.25rem" }}>
          <p style={{ fontSize:"0.68rem", color:c.muted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"0.75rem", fontWeight:600 }}>Profile</p>
          <p style={{ fontSize:"0.9rem", color:c.text, marginBottom:"0.4rem" }}><strong>Email:</strong> {user?.email || "—"}</p>
          <p style={{ fontSize:"0.9rem", color:c.text }}>
            <strong>Plan:</strong>{" "}
            <span style={{ color:c.green, fontWeight:700, textTransform:"capitalize" }}>{plan}</span>
          </p>
        </div>

        <div style={{ background:c.card, border:`1px solid ${c.border}`, borderRadius:"14px", padding:"2rem" }}>
          <p style={{ fontSize:"0.68rem", color:c.muted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"0.75rem", fontWeight:600 }}>Billing</p>
          <p style={{ fontSize:"0.85rem", color:c.muted, marginBottom:"1.25rem" }}>Manage your subscription, update payment details, or cancel anytime.</p>
          <a href="https://billing.stripe.com/p/login/test_00000" target="_blank" rel="noopener noreferrer"
            style={{ display:"inline-block", background:c.text, color:c.bg, borderRadius:"5px", padding:"10px 24px", fontSize:"0.84rem", fontWeight:600, textDecoration:"none" }}>
            Manage billing →
          </a>
        </div>
      </div>
    </div>
  );
}