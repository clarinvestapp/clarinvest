"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const C = {
  dark:  { bg:"#090909", card:"#111113", surface:"#141416", border:"#333336", text:"#F0F0F0", muted:"#7A7A80", green:"#00E676" },
  light: { bg:"#F7F7F5", card:"#FFFFFF",  surface:"#EEEEED", border:"#BABAB8", text:"#0A0A0A", muted:"#606065", green:"#008A38" },
};
const gs = "'Google Sans Flex','DM Sans',sans-serif";
const ns = "'Noto Serif',Georgia,serif";
const pf = "'Playfair Display',Georgia,serif";

const RIGHTS = [
  ["Right of access", "You may request a copy of all personal data we hold about you, also known as a Subject Access Request."],
  ["Right to rectification", "You may ask us to correct personal data that is inaccurate or incomplete."],
  ["Right to erasure", "You may request deletion of your personal data. We will comply unless we are required to retain it by law or for a legitimate purpose such as fraud prevention or ongoing legal proceedings."],
  ["Right to restriction of processing", "You may ask us to limit how we use your data, for example while a correction request is being resolved."],
  ["Right to data portability", "You may request your account data in a structured, commonly used, machine-readable format."],
  ["Right to object", "You may object to processing based on legitimate interest, including any direct marketing activity."],
  ["Right to withdraw consent", "Where processing is based on your consent, you may withdraw that consent at any time. Withdrawal does not affect the lawfulness of processing that took place before consent was withdrawn."],
  ["Rights in relation to automated decision-making", "Our AI analysis is generated automatically and does not produce legal effects or similarly significant personal consequences. You may contact us at any time for an explanation of how any analysis output was generated."],
];

const SECTIONS = [
  {
    n: "1. Introduction",
    body: "Clarinvest Ltd (\"we\", \"us\") is committed to protecting your privacy. This policy explains what personal data we collect, how we use it, and your rights under UK GDPR and EU GDPR.",
  },
  {
    n: "2. Data We Collect",
    items: [
      ["Account data", "Email address, display name, and subscription plan — collected when you register."],
      ["Usage data", "Which instruments you analyse, how many AI reports you generate, and which platform features you use — used to enforce plan limits and improve the service."],
      ["Payment data", "Billing amount, currency, and transaction status. Card details are processed and stored entirely by Stripe. We never see or store your card number."],
      ["Technical data", "IP address, browser type, device type, and session logs — collected automatically for security and performance monitoring."],
    ],
  },
  {
    n: "3. How We Use Your Data",
    body: "To provide and operate the service (contract performance). To enforce subscription limits and process billing (contract performance). To send service-related emails such as billing receipts and account alerts (legitimate interest). To improve AI model outputs and platform features using anonymised, aggregated usage data (legitimate interest).\n\nWe do not use your data for advertising. We do not sell your data to third parties.",
  },
  {
    n: "4. Third-Party Services",
    body: "Your data is shared with the following sub-processors as necessary to operate the service.",
    items: [
      ["Supabase", "Authentication and database hosting (EU and US data centres)."],
      ["Stripe", "Payment processing and subscription management."],
      ["Financial Modelling Prep (FMP)", "Market data provider. Ticker symbols you query are sent to FMP to retrieve financial data."],
      ["Anthropic", "AI analysis engine. Financial data about instruments you analyse is sent to Anthropic's Claude API to generate analysis. No personally identifiable information is included in these API calls."],
    ],
  },
  {
    n: "5. Data Retention",
    body: "Account data is retained for the duration of your subscription plus 12 months. Usage logs are retained for 6 months. You may request deletion at any time — see Your Rights below.",
  },
  {
    n: "6. Cookies",
    body: "Clarinvest uses strictly necessary cookies for authentication (Supabase session tokens) and preference storage (theme and currency). We do not use advertising or tracking cookies. A cookie consent notice is displayed on your first visit and can be managed at any time via the footer link.",
  },
  {
    n: "7. Security",
    body: "All data is transmitted over HTTPS. Passwords are never stored: authentication uses Supabase's secure token system. Payment data never passes through our servers.",
  },
  {
    n: "8. Changes to This Policy",
    body: "We may update this policy periodically. We will notify you by email or in-app notice if we make material changes.",
  },
  {
    n: "9. Contact and Complaints",
    body: "For any privacy enquiries: support@clarinvest.app. If you are based in the UK and are unsatisfied with our response, you may lodge a complaint with the Information Commissioner's Office at ico.org.uk. EU users may contact their local data protection supervisory authority.",
  },
];

export default function PrivacyPage() {
  const [mode, setMode] = useState("dark");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("clarinvest-theme");
      if (saved === "light" || saved === "dark") setMode(saved);
    } catch {}
  }, []);

  function toggleMode() {
    const next = mode === "dark" ? "light" : "dark";
    setMode(next);
    try { localStorage.setItem("clarinvest-theme", next); } catch {}
  }

  const c = C[mode];

  function renderSection(s, i, total) {
    return (
      <div key={i} style={{ marginBottom: "2.5rem", paddingBottom: "2.5rem", borderBottom: i < total - 1 ? `1px solid ${c.border}` : "none" }}>
        <h2 style={{ fontFamily: ns, fontSize: "1.15rem", fontWeight: 700, marginBottom: "0.9rem", color: c.text }}>
          {s.n}
        </h2>
        {s.body && s.body.split("\n\n").map((para, j) => (
          <p key={j} style={{ fontFamily: gs, fontSize: "0.92rem", lineHeight: 1.75, color: mode === "dark" ? c.muted : "#3A3A40", marginBottom: "0.75rem" }}>
            {para}
          </p>
        ))}
        {s.items && (
          <div style={{ marginTop: s.body ? "1rem" : 0 }}>
            {s.items.map(([label, text], k) => (
              <div key={k} style={{ marginBottom: "0.85rem" }}>
                <span style={{ fontFamily: gs, fontSize: "0.92rem", fontWeight: 600, color: c.text }}>{label}. </span>
                <span style={{ fontFamily: gs, fontSize: "0.92rem", lineHeight: 1.75, color: mode === "dark" ? c.muted : "#3A3A40" }}>{text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const sectionsBeforeRights = SECTIONS.slice(0, 5);
  const sectionsAfterRights  = SECTIONS.slice(5);

  return (
    <div style={{ background: c.bg, minHeight: "100vh", color: c.text, fontFamily: gs }}>

      {/* Nav */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        borderBottom: `1px solid ${c.border}`,
        background: mode === "dark" ? "rgba(9,9,9,0.92)" : "rgba(247,247,245,0.92)",
        backdropFilter: "blur(16px)",
        padding: "0 2.5rem", height: "58px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <span style={{ fontFamily: pf, fontSize: "1rem", fontWeight: 600, letterSpacing: "0.03em", color: c.text }}>
            CLARINVEST
          </span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/terms" style={{ fontFamily: gs, fontSize: "0.8rem", color: c.muted, textDecoration: "none" }}>Terms</Link>
          <button onClick={toggleMode} style={{
            background: "transparent", border: `1px solid ${c.border}`,
            borderRadius: "50px", padding: "5px 14px", cursor: "pointer",
            fontFamily: gs, fontSize: "0.75rem", color: c.muted,
          }}>
            {mode === "dark" ? "Light" : "Dark"}
          </button>
        </div>
      </nav>

      {/* Content */}
      <main style={{ maxWidth: "680px", margin: "0 auto", padding: "4rem 2rem 6rem" }}>

        {/* Header */}
        <div style={{ marginBottom: "3rem" }}>
          <p style={{ fontFamily: gs, fontSize: "0.68rem", letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 500, color: c.muted, marginBottom: "1rem" }}>
            Legal
          </p>
          <h1 style={{ fontFamily: ns, fontSize: "clamp(2rem,5vw,2.8rem)", fontWeight: 700, lineHeight: 1.15, marginBottom: "0.75rem" }}>
            Privacy Policy
          </h1>
          <p style={{ fontFamily: gs, fontSize: "0.9rem", color: c.muted, lineHeight: 1.7 }}>
            Effective date: 1 June 2026. This policy explains how Clarinvest collects, uses, and protects your personal data under UK GDPR and EU GDPR.
          </p>
        </div>

        {/* Sections 1-5 */}
        {sectionsBeforeRights.map((s, i) => renderSection(s, i, sectionsBeforeRights.length + 1 + sectionsAfterRights.length))}

        {/* Your Rights — featured section */}
        <div style={{ marginBottom: "2.5rem", paddingBottom: "2.5rem", borderBottom: `1px solid ${c.border}` }}>
          <h2 style={{ fontFamily: ns, fontSize: "1.15rem", fontWeight: 700, marginBottom: "0.5rem", color: c.text }}>
            6. Your Rights under UK and EU GDPR
          </h2>
          <p style={{ fontFamily: gs, fontSize: "0.92rem", lineHeight: 1.75, color: mode === "dark" ? c.muted : "#3A3A40", marginBottom: "1.25rem" }}>
            You have the following rights in relation to your personal data.
          </p>
          <div style={{ background: c.surface, borderRadius: "10px", overflow: "hidden", border: `1px solid ${c.border}` }}>
            {RIGHTS.map(([label, text], k) => (
              <div key={k} style={{ padding: "1rem 1.25rem", borderBottom: k < RIGHTS.length - 1 ? `1px solid ${c.border}` : "none" }}>
                <p style={{ fontFamily: gs, fontSize: "0.88rem", fontWeight: 600, color: c.text, marginBottom: "0.25rem" }}>{label}</p>
                <p style={{ fontFamily: gs, fontSize: "0.85rem", lineHeight: 1.65, color: c.muted }}>{text}</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "1.5rem", background: `${c.green}10`, border: `1px solid ${c.green}40`, borderRadius: "8px", padding: "1rem 1.25rem" }}>
            <p style={{ fontFamily: gs, fontSize: "0.85rem", lineHeight: 1.7, color: c.green }}>
              To exercise any of these rights, email <strong>support@clarinvest.app</strong> with the subject line "Data Rights Request". We will acknowledge your request within 72 hours and provide a full response within 30 days. There is no charge for reasonable requests.
            </p>
          </div>
          <p style={{ fontFamily: gs, fontSize: "0.88rem", lineHeight: 1.7, color: mode === "dark" ? c.muted : "#3A3A40", marginTop: "1rem" }}>
            Clarinvest Ltd is the data controller for personal data processed through this platform.
          </p>
        </div>

        {/* Remaining sections */}
        {sectionsAfterRights.map((s, i) => renderSection(s, i + 6, sectionsBeforeRights.length + 1 + sectionsAfterRights.length))}

        <p style={{ fontFamily: gs, fontSize: "0.78rem", color: c.muted, lineHeight: 1.7, textAlign: "center", marginTop: "3rem" }}>
          This policy was last updated on 1 June 2026.
        </p>
      </main>

      {/* Page footer */}
      <footer style={{
        borderTop: `1px solid ${c.border}`, padding: "1.5rem 2.5rem",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: "0.75rem",
      }}>
        <span style={{ fontFamily: gs, fontSize: "0.78rem", color: c.muted }}>© 2026 Clarinvest</span>
        <div style={{ display: "flex", gap: "1.5rem" }}>
          <Link href="/" style={{ fontFamily: gs, fontSize: "0.78rem", color: c.muted, textDecoration: "none" }}>Home</Link>
          <Link href="/terms" style={{ fontFamily: gs, fontSize: "0.78rem", color: c.muted, textDecoration: "none" }}>Terms</Link>
        </div>
        <span style={{ fontFamily: gs, fontSize: "0.78rem", color: c.muted }}>For informational purposes only. Not financial advice.</span>
      </footer>

    </div>
  );
}