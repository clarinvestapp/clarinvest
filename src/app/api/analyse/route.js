import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const FMP_BASE = "https://financialmodelingprep.com/stable";
const FMP_KEY  = process.env.FMP_API_KEY;
const ANT_KEY  = process.env.ANTHROPIC_API_KEY;

// ─── FMP fetch ────────────────────────────────────────────────────────────────
async function fmp(path) {
  try {
    const sep = path.includes("?") ? "&" : "?";
    const r = await fetch(`${FMP_BASE}${path}${sep}apikey=${FMP_KEY}`, { cache:"no-store" });
    if (!r.ok) return null;
    const d = await r.json();
    return Array.isArray(d) ? (d[0]??null) : (d??null);
  } catch { return null; }
}

// ─── Usage helpers ────────────────────────────────────────────────────────────
async function monthlyUsage(userId, type) {
  const start = new Date(); start.setDate(1); start.setHours(0,0,0,0);
  const { count } = await supabase
    .from("analysis_usage")
    .select("*", { count:"exact", head:true })
    .eq("user_id", userId)
    .eq("type", type)
    .gte("created_at", start.toISOString());
  return count ?? 0;
}

// ─── Cache helpers ────────────────────────────────────────────────────────────
async function getCache(ticker, type) {
  const { data } = await supabase
    .from("analyses")
    .select("*")
    .eq("ticker", ticker.toUpperCase())
    .eq("type", type)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending:false })
    .limit(1)
    .single();
  return data ?? null;
}

async function saveCache(ticker, type, analysis) {
  await supabase.from("analyses").insert({
    ticker:      ticker.toUpperCase(),
    type,
    summary:     analysis.summary,
    full_report: analysis.full_report ? JSON.stringify(analysis.full_report) : null,
    score:       analysis.score,
    verdict:     analysis.verdict,
    risk_flags:  analysis.risk_flags ?? [],
    model:       analysis.model,
    expires_at:  new Date(Date.now() + 24*3600*1000).toISOString(),
  });
}

// ─── Prompts ──────────────────────────────────────────────────────────────────
function buildPrompt(type, d) {
  const ctx = JSON.stringify({
    ticker:         d.ticker,
    company:        d.profile?.companyName,
    sector:         d.profile?.sector,
    industry:       d.profile?.industry,
    description:    (d.profile?.description||"").slice(0,400),
    price:          d.quote?.price,
    change_pct:     d.quote?.changesPercentage,
    market_cap:     d.quote?.marketCap,
    pe:             d.quote?.pe,
    eps:            d.quote?.eps,
    year_high:      d.quote?.yearHigh,
    year_low:       d.quote?.yearLow,
    beta:           d.profile?.beta,
    gross_margin:   d.ratios?.grossProfitMargin,
    net_margin:     d.ratios?.netProfitMargin,
    roe:            d.ratios?.returnOnEquity,
    debt_equity:    d.ratios?.debtEquityRatio,
    current_ratio:  d.ratios?.currentRatio,
    revenue_growth: d.ratios?.revenueGrowth,
    eps_growth:     d.ratios?.epsgrowth,
    peg:            d.metrics?.pegRatio,
    pb:             d.metrics?.pbRatio,
    ev_ebitda:      d.metrics?.evToEbitda,
  });

  if (type === "summary") return `You are a professional financial analyst. Analyze this stock concisely.

Data: ${ctx}

Return ONLY valid JSON — no markdown, no explanation:
{
  "score": <integer 0-100. 80-100 excellent, 65-79 good, 50-64 neutral, below 50 concerning>,
  "verdict": <"Strong Buy"|"Buy"|"Hold"|"Sell"|"Strong Sell">,
  "summary": <3-4 clear sentences assessing the stock. Professional but plain English. No jargon.>,
  "risk_flags": [{"flag": <specific risk in 5-8 words>, "level": <"High"|"Medium"|"Low">}]
}`;

  return `You are a senior financial analyst. Provide a full investment analysis.

Data: ${ctx}

Return ONLY valid JSON — no markdown, no explanation:
{
  "score": <integer 0-100>,
  "verdict": <"Strong Buy"|"Buy"|"Hold"|"Sell"|"Strong Sell">,
  "summary": <3-4 sentence executive summary>,
  "full_report": {
    "overview":      <2-3 sentences on the company and business model>,
    "valuation":     <2-3 sentences on valuation vs fundamentals and peers>,
    "growth":        <2-3 sentences on revenue and earnings trajectory>,
    "profitability": <2-3 sentences on margins, ROE and capital efficiency>,
    "risks":         <2-3 sentences on key concerns and headwinds>,
    "outlook":       <2-3 sentences near and long-term investment view>
  },
  "risk_flags": [{"flag": <specific risk in 5-8 words>, "level": <"High"|"Medium"|"Low">}]
}`;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const { ticker, type = "summary" } = await request.json();
    if (!ticker) return NextResponse.json({ error:"Ticker required" }, { status:400 });
    if (!["summary","full"].includes(type)) return NextResponse.json({ error:"Invalid type" }, { status:400 });

    // ── Auth ──
    const token = request.headers.get("authorization")?.replace("Bearer ","");
    if (!token) return NextResponse.json({ error:"Not authenticated" }, { status:401 });
    const { data:{ user }, error:authErr } = await supabase.auth.getUser(token);
    if (authErr||!user) return NextResponse.json({ error:"Not authenticated" }, { status:401 });
    const plan = user.user_metadata?.plan || "essential";

    // ── Tier gating ──
    if (type==="full" && plan==="essential") {
      return NextResponse.json({ error:"Full reports require Pro or Ultimate plan.", upgrade:true }, { status:403 });
    }
    if (type==="summary" && plan==="essential") {
      const used = await monthlyUsage(user.id, "summary");
      if (used >= 5) return NextResponse.json({ error:"Monthly limit reached — 5 summaries. Upgrade to Pro for unlimited.", upgrade:true }, { status:429 });
    }
    if (type==="full" && plan==="pro") {
      const used = await monthlyUsage(user.id, "full");
      if (used >= 15) return NextResponse.json({ error:"Monthly limit reached — 15 full reports. Upgrade to Ultimate for unlimited.", upgrade:true }, { status:429 });
    }

    // ── Cache check (shared across all users) ──
    const cached = await getCache(ticker, type);
    if (cached) {
      return NextResponse.json({
        score:       cached.score,
        verdict:     cached.verdict,
        summary:     cached.summary,
        full_report: cached.full_report ? JSON.parse(cached.full_report) : null,
        risk_flags:  cached.risk_flags ?? [],
        model:       cached.model,
        cached:      true,
      });
    }

    // ── Fetch FMP data ──
    const [quote, profile, metrics, ratios] = await Promise.all([
      fmp(`/quote?symbol=${ticker}`),
      fmp(`/profile?symbol=${ticker}`),
      fmp(`/key-metrics?symbol=${ticker}&period=annual&limit=1`),
      fmp(`/ratios?symbol=${ticker}&period=annual&limit=1`),
    ]);

    // ── Claude API call ──
    const model  = type==="full" ? "claude-sonnet-4-6" : "claude-haiku-4-5-20251001";
    const prompt = buildPrompt(type, { ticker, quote, profile, metrics, ratios });

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":    "application/json",
        "x-api-key":       ANT_KEY,
        "anthropic-version":"2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: type==="full" ? 2000 : 600,
        messages: [{ role:"user", content:prompt }],
      }),
    });

    if (!aiRes.ok) {
      const err = await aiRes.text();
      throw new Error(`Claude error ${aiRes.status}: ${err.slice(0,150)}`);
    }

    const aiData  = await aiRes.json();
    const rawText = aiData.content?.[0]?.text ?? "";

    let analysis;
    try {
      analysis = JSON.parse(rawText.replace(/```json|```/g,"").trim());
    } catch {
      throw new Error("Failed to parse AI response as JSON");
    }
    analysis.model = model;

    // ── Cache + track ──
    await saveCache(ticker, type, analysis);
    await supabase.from("analysis_usage").insert({
      user_id: user.id,
      ticker:  ticker.toUpperCase(),
      type,
    });

    return NextResponse.json({ ...analysis, full_report: analysis.full_report ?? null, cached:false });

  } catch (err) {
    console.error("Analyse error:", err.message);
    return NextResponse.json({ error:err.message }, { status:500 });
  }
}