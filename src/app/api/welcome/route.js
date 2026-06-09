// src/app/api/welcome/route.js
// Sends a branded welcome email via Resend when a new user activates their account.
// Called from src/app/auth/callback/route.js after first sign-in.
// Guards against duplicate sends using welcomed_at timestamp in user_profiles.

import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const resend  = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── Feature data per plan ────────────────────────────────────────────────────
const PLAN_FEATURES = {
  essential: [
    { name:"AI Stock Summaries",    desc:"20 AI-generated summaries per month. Verdict, score, and key risk flags for any US stock in seconds." },
    { name:"Discovery Screener",    desc:"Browse and filter US stocks by sector, signal, and performance. Find your next idea fast." },
    { name:"Price Charts",          desc:"Interactive price history charts up to 5 years. Visualise momentum at a glance." },
    { name:"Key Financial Ratios",  desc:"Valuation, profitability, liquidity, leverage, and growth metrics across multiple years." },
    { name:"Watchlist",             desc:"Save the stocks you are tracking and monitor them from a single, clean view." },
    { name:"Monthly Market Digest", desc:"A curated briefing every month covering top movers, sector performance, and key events ahead." },
  ],
  pro: [
    { name:"Unlimited AI Summaries",    desc:"Run as many AI summaries as you need. No monthly cap." },
    { name:"20 Full AI Reports/Month",  desc:"Deep-dive reports covering valuation, growth, catalysts, and risk across 5 structured sections." },
    { name:"Virtual Portfolio",         desc:"Up to 5 portfolios with what-if analysis, growth projections, and sector diversification." },
    { name:"Full Financial Statements", desc:"Income statement, balance sheet, and cash flow with 5-year charts and year-on-year comparisons." },
    { name:"Index Analysis",            desc:"AI analysis for major indexes including the S&P 500, NASDAQ 100, and FTSE 100." },
    { name:"Weekly Market Digest",      desc:"A curated briefing every Friday covering the week's top movers and next week's calendar." },
  ],
  ultimate: [
    { name:"Unlimited AI Reports",  desc:"Full deep-dive reports with no monthly cap. Stocks, ETFs, indexes, and commodities all covered." },
    { name:"Dividend Intelligence", desc:"Safety scores, income planner with DRIP modelling, and a full dividend screener." },
    { name:"Sankey Flow Diagrams",  desc:"Visual income statement, balance sheet, and cash flow ribbons. The clearest way to see where money flows." },
    { name:"Full Portfolio Suite",  desc:"Up to 5 portfolios with what-if analysis, projection charts, and dividend yield tracking." },
    { name:"ETF and Index Analysis",desc:"AI analysis across fund profiles, sector weights, top holdings, performance, and tracking error." },
    { name:"Early Access",          desc:"First access to every new feature before it rolls out to other plans." },
  ],
};

// ── Build 2-column feature grid rows ────────────────────────────────────────
function buildFeaturesHtml(plan, isDark) {
  const bg     = isDark ? "#141416" : "#F8F8F8";
  const brd    = isDark ? "#232325" : "#DEDEDD";
  const tick   = isDark ? "#00E676" : "#008A38";
  const title  = isDark ? "#F0F0F0" : "#0A0A0A";
  const desc   = isDark ? "#7A7A80" : "#606065";
  const gap    = isDark ? "#090909" : "#F7F7F5";

  const feats  = PLAN_FEATURES[plan] || PLAN_FEATURES.essential;
  let rows     = "";

  for (let i = 0; i < feats.length; i += 2) {
    const a = feats[i];
    const b = feats[i + 1];
    rows += `
<tr>
  <td class="em-feat-cell" width="48%" style="background-color:${bg};border:1px solid ${brd};border-radius:8px;padding:12px 14px;vertical-align:top;">
    <p style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:${tick};margin:0 0 4px;">&#10003;</p>
    <p style="font-family:Arial,sans-serif;font-size:12px;font-weight:600;color:${title};margin:0 0 2px;">${a.name}</p>
    <p style="font-family:Arial,sans-serif;font-size:11px;line-height:1.55;color:${desc};margin:0;">${a.desc}</p>
  </td>
  <td class="em-feat-gap" width="4%" style="background-color:${gap};padding:0;"></td>
  <td class="em-feat-cell" width="48%" style="background-color:${b ? bg : "transparent"};border:${b ? `1px solid ${brd}` : "none"};border-radius:8px;padding:${b ? "12px 14px" : "0"};vertical-align:top;">
    ${b ? `
    <p style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:${tick};margin:0 0 4px;">&#10003;</p>
    <p style="font-family:Arial,sans-serif;font-size:12px;font-weight:600;color:${title};margin:0 0 2px;">${b.name}</p>
    <p style="font-family:Arial,sans-serif;font-size:11px;line-height:1.55;color:${desc};margin:0;">${b.desc}</p>` : ""}
  </td>
</tr>
<tr><td colspan="3" style="height:8px;padding:0;"></td></tr>`;
  }
  return rows;
}

// ── Build upgrade section HTML ───────────────────────────────────────────────
function buildUpgradeHtml(plan, isDark) {
  const cardBg = isDark ? "#111113" : "#FFFFFF";
  const cardBrd= isDark ? "#232325" : "#DEDEDD";
  const mut    = isDark ? "#7A7A80" : "#606065";
  const dot    = isDark ? "#555558" : "#BABAB8";
  const blue   = isDark ? "#4488FF" : "#1E55CC";
  const green  = isDark ? "#00E676" : "#008A38";
  const fullBg = isDark ? "rgba(0,230,118,0.10)" : "rgba(0,138,56,0.09)";
  const fullBrd= isDark ? "rgba(0,230,118,0.35)" : "rgba(0,138,56,0.30)";

  if (plan === "ultimate") {
    return `
<tr>
  <td class="em-pad" style="padding:52px 40px 0;text-align:center;">
    <p class="em-text-mut em-outer-brd" style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${mut};margin:0 0 14px;padding-bottom:10px;border-bottom:1px solid ${cardBrd};text-align:left;">Full access unlocked</p>
    <div style="display:inline-block;padding:14px 28px;border-radius:8px;border:1px solid ${fullBrd};background-color:${fullBg};">
      <p style="font-family:Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:${green};margin:0 0 4px;">You have full access</p>
      <p style="font-family:Arial,sans-serif;font-size:12px;line-height:1.6;color:${mut};margin:0;">Every feature is unlocked. Nothing is held back.</p>
    </div>
  </td>
</tr>`;
  }

  if (plan === "pro") {
    const items = [
      "Unlimited full AI reports",
      "ETF and commodity analysis",
      "Dividend screener and income planner",
      "Sankey financial flow diagrams",
      "Dividend yield in portfolio analytics",
      "Early access to new features",
    ];
    const itemsHtml = items.map(item =>
      `<p style="font-family:Arial,sans-serif;font-size:11px;line-height:1.6;color:${mut};margin:0 0 4px;"><span style="color:${dot};margin-right:6px;">+</span>${item}</p>`
    ).join("");

    return `
<tr>
  <td class="em-pad" style="padding:52px 40px 0;">
    <p class="em-text-mut em-outer-brd" style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${mut};margin:0 0 14px;padding-bottom:10px;border-bottom:1px solid ${cardBrd};">Unlock even more with Ultimate</p>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:${cardBg};border:1px solid ${cardBrd};border-radius:10px;">
      <tr>
        <td style="padding:16px 18px;">
          <p style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${green};margin:0 0 10px;">Ultimate Plan</p>
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td width="49%">${items.slice(0,3).map(i=>`<p style="font-family:Arial,sans-serif;font-size:11px;line-height:1.6;color:${mut};margin:0 0 4px;"><span style="color:${dot};margin-right:6px;">+</span>${i}</p>`).join("")}</td>
              <td width="2%"></td>
              <td width="49%">${items.slice(3).map(i=>`<p style="font-family:Arial,sans-serif;font-size:11px;line-height:1.6;color:${mut};margin:0 0 4px;"><span style="color:${dot};margin-right:6px;">+</span>${i}</p>`).join("")}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <p style="text-align:center;margin-top:16px;">
      <a href="https://clarinvest.app/dashboard/account?tab=plan" style="font-family:Arial,sans-serif;font-size:12px;font-weight:600;color:${green};text-decoration:none;">Upgrade to Ultimate in your account &rarr;</a>
    </p>
  </td>
</tr>`;
  }

  // Essential: two-column teaser (Pro + Ultimate)
  const proItems = [
    "Unlimited AI summaries",
    "20 full AI reports per month",
    "Virtual portfolio with what-if analysis",
    "Full financial statements",
    "Index analysis (S&P 500, NASDAQ, FTSE)",
    "Weekly market digest",
  ];
  const ultItems = [
    "Unlimited full AI reports",
    "ETF and commodity analysis",
    "Dividend screener and income planner",
    "Sankey financial flow diagrams",
    "Dividend yield in portfolio analytics",
    "Early access to new features",
  ];

  const proHtml = proItems.map(i =>
    `<p style="font-family:Arial,sans-serif;font-size:11px;line-height:1.6;color:${mut};margin:0 0 4px;"><span style="color:${dot};margin-right:6px;">+</span>${i}</p>`
  ).join("");
  const ultHtml = ultItems.map(i =>
    `<p style="font-family:Arial,sans-serif;font-size:11px;line-height:1.6;color:${mut};margin:0 0 4px;"><span style="color:${dot};margin-right:6px;">+</span>${i}</p>`
  ).join("");

  return `
<tr>
  <td class="em-pad" style="padding:52px 40px 0;">
    <p class="em-text-mut em-outer-brd" style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${mut};margin:0 0 14px;padding-bottom:10px;border-bottom:1px solid ${cardBrd};">Unlock more with Pro and Ultimate</p>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td class="em-upgrade-cell" width="48%" style="background-color:${cardBg};border:1px solid ${cardBrd};border-radius:10px;padding:16px 18px;vertical-align:top;">
          <p style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${blue};margin:0 0 10px;">Pro Plan</p>
          ${proHtml}
        </td>
        <td class="em-upgrade-gap" width="4%"></td>
        <td class="em-upgrade-cell" width="48%" style="background-color:${cardBg};border:1px solid ${cardBrd};border-radius:10px;padding:16px 18px;vertical-align:top;">
          <p style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${green};margin:0 0 10px;">Ultimate Plan</p>
          ${ultHtml}
        </td>
      </tr>
    </table>
    <p style="text-align:center;margin-top:16px;">
      <a href="https://clarinvest.app/dashboard/account?tab=plan" style="font-family:Arial,sans-serif;font-size:12px;font-weight:600;color:${blue};text-decoration:none;">View upgrade options in your account &rarr;</a>
    </p>
  </td>
</tr>`;
}

// ── Replace all {{variable}} placeholders ────────────────────────────────────
function buildEmail(template, vars) {
  let html = template;
  for (const [key, val] of Object.entries(vars)) {
    html = html.replaceAll(`{{${key}}}`, val ?? "");
  }
  return html;
}

// ── CTA sub-text per plan ────────────────────────────────────────────────────
const CTA_SUB = {
  essential: "Run your first AI summary on any US stock. It takes under 10 seconds.",
  pro:       "Run a full AI deep-dive report on any stock. Head to Discovery to get started.",
  ultimate:  "Everything is ready. Open your dashboard and run your first analysis.",
};

// ── Main handler ─────────────────────────────────────────────────────────────
export async function POST(req) {
  try {
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    // Guard: check if welcome email was already sent
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("id, display_name, plan, welcomed_at")
      .eq("id", userId)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }
    if (profile.welcomed_at) {
      return NextResponse.json({ ok: true, skipped: true, reason: "already welcomed" });
    }

    // Get user email from auth
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError || !user?.email) {
      return NextResponse.json({ error: "Could not fetch user email" }, { status: 500 });
    }

    // Resolve display name using priority chain
    const displayName =
      profile.display_name ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      // Extract and capitalise email prefix as last resort
      (user.email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, l => l.toUpperCase())) ||
      "there";

    const plan      = profile.plan || "essential";
    const planLabel =
      plan === "ultimate" ? "Ultimate Plan" :
      plan === "pro"      ? "Pro Plan"       : "Essential Plan";

    // Graceful mock when Resend key is absent (development)
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({
        ok: false,
        message: "RESEND_API_KEY not set. Add it to .env.local to send welcome emails.",
      });
    }

    // Load and build email HTML
    const templatePath = path.join(process.cwd(), "src/app/emails/welcome.html");
    const template     = fs.readFileSync(templatePath, "utf-8");

    // Dark mode is handled via CSS media query in the template.
    // The route always generates the light-mode HTML variables;
    // dark mode overrides are applied client-side by the email client.
    const isDark = false;

    const html = buildEmail(template, {
      display_name:        displayName,
      plan_label:          planLabel,
      plan_features_html:  buildFeaturesHtml(plan, isDark),
      upgrade_section_html:buildUpgradeHtml(plan, isDark),
      cta_sub:             CTA_SUB[plan] || CTA_SUB.essential,
      unsubscribe_url:     `https://clarinvest.app/api/welcome/unsubscribe?uid=${userId}`,
      footer_plan_sub:     `You created a Clarinvest account on a ${planLabel}.`,
    });

    // Send via Resend
    const { error: sendError } = await resend.emails.send({
      from:    "Clarinvest <hello@clarinvest.app>",
      to:      user.email,
      subject: `Welcome to Clarinvest, ${displayName === "there" ? "" : displayName}.`.replace(/,\s*\.$/, "."),
      html,
    });

    if (sendError) {
      console.error("Resend error:", sendError);
      return NextResponse.json({ error: sendError.message }, { status: 500 });
    }

    // Mark as welcomed so duplicates are prevented
    await supabase
      .from("user_profiles")
      .update({ welcomed_at: new Date().toISOString() })
      .eq("id", userId);

    return NextResponse.json({ ok: true, sent: true, to: user.email });

  } catch (err) {
    console.error("Welcome email error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}