// src/app/api/digest/route.js
// Generates and sends the weekly (Pro/Ultimate) or monthly (Essential) digest.
// Called by Vercel Cron. Also callable manually via POST for testing.
//
// POST body: { type: "weekly" | "monthly", dry_run?: true }
// dry_run = true returns the generated content without sending emails.

import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const resend    = new Resend(process.env.RESEND_API_KEY);

// Supabase admin client (bypasses RLS for digest fan-out)
const supabase  = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── FMP helper ──────────────────────────────────────────────────────────────
async function fmpFetch(endpoint) {
  const base = "https://financialmodelingprep.com/stable";
  const sep  = endpoint.includes("?") ? "&" : "?";
  const res  = await fetch(`${base}${endpoint}${sep}apikey=${process.env.FMP_API_KEY}`);
  if (!res.ok) throw new Error(`FMP ${endpoint} returned ${res.status}`);
  return res.json();
}

// ── Fetch market data from FMP ───────────────────────────────────────────────
async function fetchMarketData() {
  const [spx, ndx, ftse, gainers, losers] = await Promise.all([
    fmpFetch("/quote/%5EGSPC"),
    fmpFetch("/quote/%5EIXIC"),
    fmpFetch("/quote/%5EFTSE"),
    fmpFetch("/stock_market/gainers?limit=3"),
    fmpFetch("/stock_market/losers?limit=3"),
  ]);

  return {
    indices: {
      spx:  spx[0]  || {},
      ndx:  ndx[0]  || {},
      ftse: ftse[0] || {},
    },
    gainers: gainers.slice(0, 3),
    losers:  losers.slice(0, 3),
  };
}

// ── Call Claude to generate narrative sections ───────────────────────────────
async function generateDigestContent(marketData, type) {
  const isWeekly = type === "weekly";

  const systemPrompt = `You are the analytical voice behind Clarinvest, an AI-powered investment intelligence platform. 
Your writing is precise, confident, and authoritative but never cold or robotic. 
Think: a world-class analyst speaking plain English to an intelligent adult investor.
Rules you must follow without exception:
- No em dashes. Use commas, colons, or full stops instead.
- No exclamation marks.
- No bullet points.
- Oxford comma always.
- Abbreviate numbers: $1.2B not $1,200,000,000. 122% not 122.00%.
- American English spelling.
- Every assertion tied to a specific number or fact.
- Output valid JSON only. No preamble, no markdown, no code fences.`;

  const userPrompt = `Generate content for a Clarinvest ${isWeekly ? "weekly" : "monthly"} market digest.

Market data provided:
${JSON.stringify(marketData, null, 2)}

Return a JSON object with exactly these fields:
{
  "headline": "One sharp sentence summarising the dominant market theme this ${isWeekly ? "week" : "month"}. Max 12 words.",
  "subline": "One sentence teaser for the email preview. Max 20 words. Should mention something specific from next ${isWeekly ? "week's" : "month's"} calendar.",
  "preheader": "Same as subline but written slightly differently for inbox preview text.",
  "greeting_body": "Two sentences. Acknowledge the ${isWeekly ? "week" : "month"} with a single editorial observation. Warm but analytical tone.",
  "snap1_note": "One sentence context for S&P 500 move. Max 15 words.",
  "snap2_note": "One sentence context for NASDAQ move. Max 15 words.",
  "snap3_note": "One sentence context for FTSE 100 move. Max 15 words.",
  "gainers": [
    { "ticker": "NVDA", "name": "NVIDIA Corp", "pct": "+11.2%", "reason": "One sentence. Specific catalyst. Max 25 words." },
    { "ticker": "...", "name": "...", "pct": "...", "reason": "..." },
    { "ticker": "...", "name": "...", "pct": "...", "reason": "..." }
  ],
  "losers": [
    { "ticker": "CVX", "name": "Chevron Corp", "pct": "-4.1%", "reason": "One sentence. Specific catalyst. Max 25 words." },
    { "ticker": "...", "name": "...", "pct": "...", "reason": "..." },
    { "ticker": "...", "name": "...", "pct": "...", "reason": "..." }
  ],
  "sector_best_name": "Sector name",
  "sector_best_chg": "+X.X%",
  "sector_best_note": "Two sentences explaining why this sector led. Specific, factual.",
  "sector_worst_name": "Sector name",
  "sector_worst_chg": "-X.X%",
  "sector_worst_note": "Two sentences explaining why this sector lagged. Specific, factual.",
  "outlook_p1": "Paragraph 1 of the sign-off. Forward-looking. Key macro event or data point to watch. 3-4 sentences.",
  "outlook_p2": "Paragraph 2. Corporate earnings or sector-specific angle. 2-3 sentences.",
  "outlook_p3": "Paragraph 3. Encouraging close. Reinforce the value of staying informed and using Clarinvest. Warm, never promotional. 2-3 sentences."
}`;

  const message = await anthropic.messages.create({
    model:      "claude-sonnet-4-6",
    max_tokens: 1500,
    system:     systemPrompt,
    messages:   [{ role: "user", content: userPrompt }],
  });

  const raw = message.content[0].text.trim();
  return JSON.parse(raw);
}

// ── Build HTML rows for movers ────────────────────────────────────────────────
function buildMoverRow(ticker, name, pct, reason, isGainer) {
  const color = isGainer ? "#008A38" : "#CC0000";
  return `
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:2px;">
  <tr>
    <td width="44" style="font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#0A0A0A;padding:9px 0;border-bottom:1px solid #EEEEED;vertical-align:top;">${ticker}</td>
    <td style="font-family:Arial,sans-serif;font-size:11px;color:#606065;padding:9px 8px;border-bottom:1px solid #EEEEED;vertical-align:top;">${name}</td>
    <td width="60" style="font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:${color};padding:9px 0;border-bottom:1px solid #EEEEED;vertical-align:top;text-align:right;">${pct}</td>
  </tr>
  <tr>
    <td colspan="3" style="font-family:Arial,sans-serif;font-size:11px;line-height:1.58;color:#606065;padding:4px 0 10px 0;">${reason}</td>
  </tr>
</table>`;
}

// ── Build HTML rows for calendar ──────────────────────────────────────────────
function buildCalendarRows(events) {
  return events.map(ev => {
    const badgeColors = {
      earnings: { text: "#1E55CC", bg: "rgba(30,85,204,0.09)", border: "rgba(30,85,204,0.30)" },
      divex:    { text: "#008A38", bg: "rgba(0,138,56,0.09)",  border: "rgba(0,138,56,0.30)"  },
      macro:    { text: "#B45309", bg: "rgba(245,158,11,0.10)",border: "rgba(245,158,11,0.35)" },
    };
    const bc = badgeColors[ev.type] || badgeColors.macro;
    const badgeLabel = ev.type === "earnings" ? "Earnings" : ev.type === "divex" ? "Ex-Div" : "Macro";

    return `
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
  <tr>
    <td width="68" style="font-family:Arial,sans-serif;font-size:12px;font-weight:700;color:#0A0A0A;padding:9px 0;border-bottom:1px solid #EEEEED;vertical-align:top;">${ev.date}</td>
    <td style="font-family:Arial,sans-serif;font-size:12px;font-weight:600;color:#0A0A0A;padding:9px 0;border-bottom:1px solid #EEEEED;vertical-align:top;">${ev.company}</td>
    <td width="180" style="padding:9px 0 9px 16px;border-bottom:1px solid #EEEEED;vertical-align:top;">
      <span style="font-family:Arial,sans-serif;font-size:9px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:3px 8px;border-radius:4px;border:1px solid ${bc.border};background-color:${bc.bg};color:${bc.text};">${badgeLabel}</span>
      <span style="display:block;font-family:Arial,sans-serif;font-size:11px;color:#606065;margin-top:3px;">${ev.detail}</span>
    </td>
  </tr>
</table>`;
  }).join("");
}

// ── Assemble final HTML from template + variables ─────────────────────────────
function buildEmail(template, vars) {
  let html = template;
  for (const [key, val] of Object.entries(vars)) {
    html = html.replaceAll(`{{${key}}}`, val ?? "");
  }
  return html;
}

// ── Calendar events (hardcoded for now, will come from FMP earnings calendar) ─
function getNextWeekEvents(type) {
  // Placeholder events — replace with FMP /earning_calendar and /stock_dividend
  // endpoint calls once FMP Starter plan is active.
  if (type === "monthly") {
    return [
      { date: "Thu 12", company: "US CPI",          type: "macro",    detail: "Core est. +0.2% MoM" },
      { date: "Wed 18", company: "Fed Rate Decision",type: "macro",    detail: "Hold expected, dot plot update" },
      { date: "Mon 30", company: "Nike",             type: "earnings", detail: "Q4 FY2025, est. EPS $0.29" },
    ];
  }
  return [
    { date: "Mon 02", company: "JPMorgan Chase",    type: "divex",    detail: "$1.25/share" },
    { date: "Wed 04", company: "Salesforce",        type: "earnings", detail: "Q1 FY2027, est. EPS $2.39" },
    { date: "Thu 05", company: "Broadcom",          type: "earnings", detail: "Q2 FY2025, est. EPS $1.19" },
    { date: "Thu 05", company: "ECB Rate Decision", type: "macro",    detail: "Expected -25bps, to 3.50%" },
    { date: "Fri 06", company: "US Non-Farm Payrolls",type:"macro",   detail: "May jobs report, est. +185K" },
    { date: "Fri 06", company: "DocuSign",          type: "earnings", detail: "Q1 FY2026, est. EPS $0.90" },
  ];
}

// ── Log digest to Supabase (last 20 entries kept) ────────────────────────────
async function logDigest(type, subject, subscriberCount) {
  await supabase.from("digest_log").insert({
    type,
    subject,
    subscriber_count: subscriberCount,
    sent_at: new Date().toISOString(),
  });

  // Prune to last 20
  const { data } = await supabase
    .from("digest_log")
    .select("id")
    .order("sent_at", { ascending: false });

  if (data && data.length > 20) {
    const toDelete = data.slice(20).map(r => r.id);
    await supabase.from("digest_log").delete().in("id", toDelete);
  }
}

// ── Main handler ─────────────────────────────────────────────────────────────
export async function POST(req) {
  try {
    // Verify cron secret to prevent unauthorized calls
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type = "weekly", dry_run = false } = await req.json();

    if (!["weekly", "monthly"].includes(type)) {
      return NextResponse.json({ error: "type must be weekly or monthly" }, { status: 400 });
    }

    // ── Graceful mock when API keys are absent (development) ─────────────────
    if (!process.env.ANTHROPIC_API_KEY || !process.env.FMP_API_KEY) {
      return NextResponse.json({
        ok: false,
        message: "Missing API keys. Add ANTHROPIC_API_KEY and FMP_API_KEY to .env.local to generate real digests.",
        dry_run: true,
      });
    }

    // ── 1. Fetch market data ─────────────────────────────────────────────────
    const marketData = await fetchMarketData();

    // ── 2. Generate narrative via Claude ────────────────────────────────────
    const content = await generateDigestContent(marketData, type);

    // ── 3. Load HTML template ────────────────────────────────────────────────
    const templatePath = path.join(process.cwd(), "src/app/emails/digest.html");
    const template = fs.readFileSync(templatePath, "utf-8");

    // ── 4. Build dynamic rows ────────────────────────────────────────────────
    const gainersHtml = content.gainers.map(g =>
      buildMoverRow(g.ticker, g.name, g.pct, g.reason, true)
    ).join("");

    const losersHtml = content.losers.map(l =>
      buildMoverRow(l.ticker, l.name, l.pct, l.reason, false)
    ).join("");

    const calendarHtml = buildCalendarRows(getNextWeekEvents(type));

    const isWeekly   = type === "weekly";
    const now        = new Date();
    const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];

    // Format period label
    const periodLabel = isWeekly
      ? `Weekly digest · ${now.toLocaleDateString("en-US", { day:"numeric", month:"short" })} ${now.getFullYear()}`
      : `Monthly digest · ${monthNames[now.getMonth()]} ${now.getFullYear()}`;

    // ── 5. Fetch eligible subscribers ───────────────────────────────────────
    const planFilter = isWeekly
      ? ["pro", "ultimate"]
      : ["essential", "pro", "ultimate"];

    const { data: subscribers, error: subError } = await supabase
      .from("user_profiles")
      .select("id, display_name, email, plan")
      .in("plan", planFilter)
      .eq("digest_emails", true);

    if (subError) throw subError;

    if (dry_run) {
      return NextResponse.json({
        ok: true,
        dry_run: true,
        subscriber_count: subscribers?.length ?? 0,
        subject: content.headline,
        content,
      });
    }

    // ── 6. Send emails ───────────────────────────────────────────────────────
    let sentCount = 0;

    for (const user of subscribers ?? []) {
      const planLabel = user.plan === "essential"
        ? "Essential Plan"
        : user.plan === "pro"
          ? "Pro Plan"
          : "Ultimate Plan";

      const name = user.display_name || "there";

      const snap = marketData.indices;
      const spxChg  = snap.spx.changesPercentage  ?? 0;
      const ndxChg  = snap.ndx.changesPercentage  ?? 0;
      const ftseChg = snap.ftse.changesPercentage ?? 0;

      const html = buildEmail(template, {
        subject:          content.headline,
        preheader:        content.preheader,
        period_label:     periodLabel,
        plan_label:       planLabel,
        headline:         content.headline,
        subline:          content.subline,
        display_name:     name,
        greeting_body:    content.greeting_body,
        snap1_index:      "S&P 500",
        snap1_value:      snap.spx.price?.toLocaleString("en-US") ?? "—",
        snap1_chg:        `${spxChg >= 0 ? "+" : ""}${spxChg.toFixed(2)}% on ${isWeekly ? "week" : "month"}`,
        snap1_chg_color:  spxChg >= 0 ? "#008A38" : "#CC0000",
        snap1_note:       content.snap1_note,
        snap2_index:      "NASDAQ",
        snap2_value:      snap.ndx.price?.toLocaleString("en-US") ?? "—",
        snap2_chg:        `${ndxChg >= 0 ? "+" : ""}${ndxChg.toFixed(2)}% on ${isWeekly ? "week" : "month"}`,
        snap2_chg_color:  ndxChg >= 0 ? "#008A38" : "#CC0000",
        snap2_note:       content.snap2_note,
        snap3_index:      "FTSE 100",
        snap3_value:      snap.ftse.price?.toLocaleString("en-US") ?? "—",
        snap3_chg:        `${ftseChg >= 0 ? "+" : ""}${ftseChg.toFixed(2)}% on ${isWeekly ? "week" : "month"}`,
        snap3_chg_color:  ftseChg >= 0 ? "#008A38" : "#CC0000",
        snap3_note:       content.snap3_note,
        gainers_rows:     gainersHtml,
        losers_rows:      losersHtml,
        sector_best_name:  content.sector_best_name,
        sector_best_chg:   content.sector_best_chg,
        sector_best_note:  content.sector_best_note,
        sector_worst_name: content.sector_worst_name,
        sector_worst_chg:  content.sector_worst_chg,
        sector_worst_note: content.sector_worst_note,
        calendar_label:   isWeekly ? "Next week calendar" : `Key dates in ${monthNames[(now.getMonth() + 1) % 12]}`,
        calendar_rows:    calendarHtml,
        outlook_label:    isWeekly ? "What to watch" : `Looking ahead to ${monthNames[(now.getMonth() + 1) % 12]}`,
        outlook_p1:       content.outlook_p1,
        outlook_p2:       content.outlook_p2,
        outlook_p3:       content.outlook_p3,
        cta_sub:          isWeekly
          ? "Run a full AI analysis on any of the stocks above, directly from your dashboard."
          : `Run an AI analysis on any stock mentioned above. Available now on your ${planLabel}.`,
        unsubscribe_url:  `https://clarinvest.app/api/digest/unsubscribe?uid=${user.id}`,
        footer_sub:       `You are receiving this because you are subscribed to the ${isWeekly ? "weekly" : "monthly"} digest on a ${planLabel}.`,
      });

      await resend.emails.send({
        from:    "Clarinvest <hello@clarinvest.app>",
        to:      user.email,
        subject: `Clarinvest ${isWeekly ? "Weekly" : "Monthly"} · ${content.headline}`,
        html,
      });

      sentCount++;
    }

    // ── 7. Log to Supabase ───────────────────────────────────────────────────
    await logDigest(type, content.headline, sentCount);

    return NextResponse.json({ ok: true, sent: sentCount, subject: content.headline });

  } catch (err) {
    console.error("Digest error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}