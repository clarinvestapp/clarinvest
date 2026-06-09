import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";
import Anthropic        from "@anthropic-ai/sdk";

// ── FMP ───────────────────────────────────────────────────────────────────────
const FMP_KEY  = process.env.FMP_KEY ?? "";
const FMP_BASE = "https://financialmodelingprep.com/api";

async function fmp(path) {
  const sep = path.includes("?") ? "&" : "?";
  try {
    const r = await fetch(`${FMP_BASE}${path}${sep}apikey=${FMP_KEY}`, { cache:"no-store" });
    if (!r.ok) return null;
    return r.json().catch(() => null);
  } catch { return null; }
}
const fmpOne = async (path) => { const d = await fmp(path); return Array.isArray(d) ? d[0] : d; };

// ── Anthropic ─────────────────────────────────────────────────────────────────
const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Score → Verdict (deterministic) ──────────────────────────────────────────
function scoreToVerdict(s) {
  if (s >= 90) return "Strong Buy";
  if (s >= 75) return "Buy";
  if (s >= 55) return "Hold";
  if (s >= 35) return "Reduce";
  return "Sell";
}

// ── Instrument type detection ─────────────────────────────────────────────────
const COMMODITY_TICKERS = new Set([
  // Precious metals
  "XAUUSD","XAGUSD","XPTUSD","XPDUSD","GC","SI","PL","PA","GOLDUSD","SILVERUSD",
  // Energy
  "WTICOUSD","BRENTOIL","USOIL","NGAS","CL","NG","HO","RB","BRENT","WTI",
  // Base metals
  "COPPUSD","ALUMUSD","ZINCUSD","NICKUSD","LEADUSD","TINNUSD","HG","ALU","ZN","NI","PB","SN",
  // Agriculture
  "ZW","ZC","ZS","KC","CC","SB","LB","OJ","CT","ZO","ZR",
  "WHEAT","CORN","SOYBEAN","COFFEE","COCOA","SUGAR","LUMBER","OJ","COTTON","OATS","RICE",
  // Nuclear
  "URANUSD","UX","U3O8",
  // Other
  "NATGAS",
]);

function detectInstrumentType(ticker, profile) {
  const T = ticker.toUpperCase();
  if (T.startsWith("^"))                      return "index";
  if (profile?.isEtf === true)                return "etf";
  if (COMMODITY_TICKERS.has(T))               return "commodity";
  // FMP returns null sector for commodities/forex
  if (!profile?.sector && !profile?.industry) return "commodity";
  return "stock";
}

// ── FMP data fetching per type ────────────────────────────────────────────────
async function fetchFmpData(ticker, type) {
  const T = ticker.toUpperCase();
  const quoteRaw = await fmp(`/v3/quote/${T}`);
  const quote    = Array.isArray(quoteRaw) ? quoteRaw[0] : quoteRaw;

  if (type === "stock") {
    const [profile, ratios, metrics, income, growth] = await Promise.all([
      fmpOne(`/v3/profile/${T}`),
      fmpOne(`/v3/ratios-ttm/${T}`),
      fmpOne(`/v3/key-metrics-ttm/${T}`),
      fmp(`/v3/income-statement/${T}?limit=4`),
      fmpOne(`/v3/financial-growth/${T}?limit=1`),
    ]);
    return { quote, profile, ratios, metrics, income, growth };
  }

  if (type === "etf") {
    const [profile, holders, sectorW, countryW] = await Promise.all([
      fmpOne(`/v3/profile/${T}`),
      fmp(`/v3/etf-holder/${T}`),
      fmp(`/v3/etf-sector-weightings/${T}`),
      fmp(`/v3/etf-country-weightings/${T}`),
    ]);
    return { quote, profile, holders:(holders||[]).slice(0,10), sectorW, countryW };
  }

  if (type === "index") {
    const profile = await fmpOne(`/v3/profile/${T}`);
    return { quote, profile };
  }

  // commodity: quote only, Claude uses macro knowledge
  return { quote };
}

// ── Shared system prompt ──────────────────────────────────────────────────────
const SYSTEM = `You are a senior investment analyst producing institutional-grade research notes for Clarinvest, a professional investment intelligence platform. Your analysis is read by sophisticated investors who expect the rigour and neutrality of a CFA-charterholder sell-side analyst.

Core principles:
- Write with strict analytical neutrality. Your role is to assess fundamentals and present evidence, not to persuade or promote. Avoid promotional language, superlatives, and hype of any kind.
- Ground every assertion in a specific metric, ratio, or established market fact. Quantify wherever possible. A sentence that could apply to any instrument has no place in the report.
- Present a balanced picture. Where data supports a constructive read, state it and cite why. Where there are weaknesses, risks, or counterarguments, state them with equal candour.
- Be precise and dense. Every sentence must carry analytical weight. No filler.
- Acknowledge uncertainty honestly. Where data is unavailable, note it or omit the point. Never fabricate figures.
- Write in professional British English. Do not use em-dashes anywhere. Use commas, colons, or full stops.

This analysis is for informational purposes only and is not financial advice.
Respond with valid JSON only. No preamble, no markdown, no text outside the JSON object.`;

// ── Summary prompt (all types, Haiku) ─────────────────────────────────────────
function buildSummaryPrompt(ticker, type, data) {
  const q = data.quote;
  const p = data.profile;
  const priceCtx = q
    ? `Price: ${q.price} | Change: ${q.changesPercentage?.toFixed(2)}% | 52W: ${q.yearLow}–${q.yearHigh}`
    : "Limited price data available.";
  const profileCtx = p
    ? `Name: ${p.companyName || p.name || ticker} | Sector: ${p.sector || "n/a"} | Exchange: ${p.exchangeShortName || "n/a"}`
    : "";

  return `Produce a concise AI summary for the following ${type}.

TICKER: ${ticker}
${profileCtx}
${priceCtx}

Return ONLY this JSON:
{
  "score": <integer 0-100, overall fundamental quality for this ${type}>,
  "summary": "<2-3 sentence neutral thesis. Lead with the single most important analytical observation. Include at least one specific metric. End with the primary risk.>",
  "risk_flags": [
    {"flag": "<concise risk label, 3-6 words>", "level": "<High|Medium|Low>"}
  ]
}

Scoring guidance: 90-100 exceptional fundamentals, 75-89 solid, 55-74 mixed, 35-54 weak, below 35 materially deteriorating.`;
}

// ── Full report: STOCK ────────────────────────────────────────────────────────
function buildStockPrompt(ticker, data) {
  const { quote:q, profile:p, ratios:r, metrics:m, income:inc, growth:g } = data;
  const li = Array.isArray(inc) ? inc[0] : null;  // latest annual income statement
  const pct = v => v != null ? (v * 100).toFixed(1) + "%" : "n/a";
  const fix2 = v => v != null ? parseFloat(v).toFixed(2) : "n/a";

  const ctx = `
TICKER: ${ticker} — ${p?.companyName || ""}
SECTOR: ${p?.sector || "n/a"} | INDUSTRY: ${p?.industry || "n/a"} | EXCHANGE: ${p?.exchangeShortName || ""}
MARKET CAP: ${q?.marketCap ? "$" + (q.marketCap/1e9).toFixed(2) + "B" : "n/a"} | BETA: ${fix2(q?.beta || r?.betaTTM)}
PRICE: $${q?.price || "n/a"} | 52W HIGH: $${q?.yearHigh || "n/a"} | 52W LOW: $${q?.yearLow || "n/a"}

VALUATION (TTM):
  P/E: ${fix2(r?.peRatioTTM || q?.pe)} | Forward P/E: ${fix2(m?.forwardPE)} | PEG: ${fix2(r?.priceEarningsToGrowthRatioTTM)}
  EV/EBITDA: ${fix2(m?.evToEbitdaTTM || r?.enterpriseValueMultipleTTM)} | P/S: ${fix2(r?.priceToSalesRatioTTM)} | P/B: ${fix2(m?.pbRatioTTM)}
  Dividend Yield: ${pct(r?.dividendYieldTTM)}

PROFITABILITY & RETURNS (TTM):
  Gross Margin: ${pct(r?.grossProfitMarginTTM)} | Operating Margin: ${pct(r?.operatingProfitMarginTTM)} | Net Margin: ${pct(r?.netProfitMarginTTM)}
  ROE: ${pct(r?.returnOnEquityTTM)} | ROIC: ${pct(r?.returnOnCapitalEmployedTTM)}
  FCF/Share: $${fix2(r?.freeCashFlowPerShareTTM)}

INCOME STATEMENT (latest annual):
  Revenue: ${li?.revenue ? "$" + (li.revenue/1e9).toFixed(2) + "B" : "n/a"} | Gross Profit: ${li?.grossProfit ? "$" + (li.grossProfit/1e9).toFixed(2) + "B" : "n/a"}
  Operating Income: ${li?.operatingIncome ? "$" + (li.operatingIncome/1e9).toFixed(2) + "B" : "n/a"} | Net Income: ${li?.netIncome ? "$" + (li.netIncome/1e9).toFixed(2) + "B" : "n/a"}
  EPS: $${fix2(li?.eps)} | EPS Diluted: $${fix2(li?.epsdiluted)}

GROWTH:
  Revenue Growth YoY: ${g?.revenueGrowth ? pct(g.revenueGrowth) : "n/a"} | EPS Growth: ${g?.epsgrowth ? pct(g.epsgrowth) : "n/a"}
  Gross Profit Growth: ${g?.grossProfitGrowth ? pct(g.grossProfitGrowth) : "n/a"} | Free Cash Flow Growth: ${g?.freeCashFlowGrowth ? pct(g.freeCashFlowGrowth) : "n/a"}

BALANCE SHEET HEALTH:
  Debt/Equity: ${fix2(r?.debtEquityRatioTTM)} | Current Ratio: ${fix2(r?.currentRatioTTM)} | Interest Coverage: ${fix2(r?.interestCoverageTTM)}
  Debt/EBITDA: ${fix2(r?.debtToEBITDATTM)}

DESCRIPTION: ${p?.description ? p.description.slice(0, 350) : "n/a"}`.trim();

  return `Analyse the following stock applying a rigorous sell-side framework. Assess whether the valuation multiple is justified by growth quality and profitability. Identify specific structural catalysts. Flag risks with proportionate severity. Avoid vague assertions: every claim must be tied to a figure in the data.

${ctx}

Return ONLY this JSON:
{
  "score": <integer 0-100>,
  "summary": "<2-3 sentence neutral thesis. Lead with the most important analytical insight. Include specific metrics. End with the primary risk or uncertainty.>",
  "sections": [
    {"key": "valuation",     "body": "<2-4 sentences. Assess whether the multiple is justified by growth and quality. Reference specific ratios. Compare to sector norms or historical average where relevant.>"},
    {"key": "growth",        "body": "<2-4 sentences. Assess revenue and earnings trajectory. Is growth structural or cyclical? Evaluate the durability and reinvestment quality.>"},
    {"key": "profitability", "body": "<2-4 sentences. Analyse margin profile and return on capital. Assess FCF conversion. Note the direction of margin trajectory.>"},
    {"key": "catalysts",     "body": "<2-4 sentences. Identify specific forward drivers with quantifiable scope where possible. Refer to product cycles, market expansion, or structural tailwinds. Be concrete.>"},
    {"key": "outlook",       "body": "<2-4 sentences. Synthesise the risk and reward. What would change the thesis? Balance constructive and cautionary signals without bias.>"}
  ],
  "risk_flags": [
    {"flag": "<concise risk label, 3-6 words>", "level": "<High|Medium|Low>"}
  ]
}

Scoring: 90-100 exceptional fundamentals, 75-89 solid, 55-74 mixed or hold territory, 35-54 weak, below 35 materially deteriorating. Score the data, not the name.`;
}

// ── Full report: ETF ──────────────────────────────────────────────────────────
function buildEtfPrompt(ticker, data) {
  const { quote:q, profile:p, holders, sectorW, countryW } = data;
  const topH = (holders||[]).slice(0,10).map(h =>
    `${h.asset} ${(parseFloat(h.weightPercentage||h.sharePercentage||0)).toFixed(1)}%`
  ).join(", ");
  const sectors = (sectorW||[]).slice(0,6).map(s =>
    `${s.sector} ${parseFloat(s.weightPercentage||0).toFixed(1)}%`
  ).join(", ");
  const countries = (countryW||[]).slice(0,5).map(c =>
    `${c.country} ${parseFloat(c.weightPercentage||0).toFixed(1)}%`
  ).join(", ");

  const ctx = `
TICKER: ${ticker} — ${p?.companyName || ""}
EXCHANGE: ${p?.exchangeShortName || "n/a"} | ASSET CLASS: ${p?.assetClass || "n/a"}
AUM: ${q?.marketCap ? "$" + (q.marketCap/1e9).toFixed(2) + "B" : "n/a"} | INCEPTION: ${p?.ipoDate || "n/a"}
EXPENSE RATIO: ${p?.expenseRatio != null ? (p.expenseRatio*100).toFixed(2) + "%" : "n/a"}
PRICE: $${q?.price || "n/a"} | YTD: ${q?.ytdChangePercent?.toFixed(2) || "n/a"}%
52W HIGH: $${q?.yearHigh || "n/a"} | 52W LOW: $${q?.yearLow || "n/a"} | BETA: ${q?.beta ?? "n/a"}
AVG DAILY VOLUME: ${q?.avgVolume?.toLocaleString() || "n/a"}

TOP HOLDINGS (up to 10): ${topH || "n/a"}
SECTOR WEIGHTS: ${sectors || "n/a"}
GEOGRAPHIC WEIGHTS: ${countries || "n/a"}

DESCRIPTION: ${p?.description ? p.description.slice(0,300) : "n/a"}`.trim();

  return `Analyse the following ETF. Focus on cost structure, tracking quality, liquidity, concentration risk, and whether the fund efficiently delivers its stated exposure. Note: tracking error vs benchmark is often unavailable via standard data feeds. Use expense ratio as the primary cost indicator and apply your knowledge of ETF evaluation best practices.

${ctx}

Return ONLY this JSON:
{
  "score": <integer 0-100, reflecting cost efficiency, liquidity adequacy, diversification quality, and performance track record>,
  "summary": "<2-3 sentence neutral assessment. What does this fund deliver and how efficiently does it do so? Include AUM and cost context with specific figures.>",
  "sections": [
    {"key": "exposure",        "body": "<2-4 sentences. Describe what the fund holds. Assess top-holding concentration risk, sector tilt, and geographic distribution. Note any structural bias.>"},
    {"key": "cost_efficiency", "body": "<2-4 sentences. Assess the expense ratio against peer norms for this asset class. Quantify the compounding impact of cost over a 10-year horizon. Note total cost of ownership.>"},
    {"key": "performance",     "body": "<2-4 sentences. Assess YTD and positioning within 52-week range. Comment on risk-adjusted quality relative to the fund's stated benchmark or category.>"},
    {"key": "liquidity",       "body": "<2-4 sentences. Assess AUM relative to closure risk thresholds (below $30M carries elevated risk). Evaluate average daily volume and bid-ask spread quality. Fund age and track record.>"},
    {"key": "outlook",         "body": "<2-4 sentences. Is this exposure well-positioned in the current macro and sector cycle? Identify the primary structural risk and any tailwind for the underlying exposure.>"}
  ],
  "risk_flags": [
    {"flag": "<concise risk label, 3-6 words>", "level": "<High|Medium|Low>"}
  ]
}

Scoring: weight cost efficiency heavily, along with AUM stability, diversification quality, and track record length.`;
}

// ── Full report: INDEX ────────────────────────────────────────────────────────
function buildIndexPrompt(ticker, data) {
  const { quote:q } = data;
  const rangePct = q?.yearHigh && q?.yearLow && q?.price
    ? (((q.price-q.yearLow)/(q.yearHigh-q.yearLow))*100).toFixed(0) + "% of 52W range"
    : "n/a";

  const ctx = `
TICKER: ${ticker} — ${q?.name || ""}
PRICE: ${q?.price || "n/a"} | CHANGE: ${q?.changesPercentage?.toFixed(2) || "n/a"}% | YTD: ${q?.ytdChangePercent?.toFixed(2) || "n/a"}%
52W HIGH: ${q?.yearHigh || "n/a"} | 52W LOW: ${q?.yearLow || "n/a"} | RANGE POSITION: ${rangePct}
P/E (if reported): ${q?.pe || "n/a"} | AVG VOLUME: ${q?.avgVolume?.toLocaleString() || "n/a"}`.trim();

  return `Analyse the following market index. Since index fundamental data is limited, you must draw on your knowledge of this index's specific composition, sector weights, historical valuation norms, and the prevailing macro environment. Be explicit when a claim is supported by the data provided versus derived from your analytical knowledge of this index.

${ctx}

Return ONLY this JSON:
{
  "score": <integer 0-100, reflecting valuation vs historical average, macro backdrop quality, breadth, and near-term risk/reward>,
  "summary": "<2-3 sentence neutral assessment of where this index stands fundamentally and technically. Include specific price context and at least one valuation or macro observation.>",
  "sections": [
    {"key": "composition",        "body": "<2-4 sentences. Describe this index's specific sector composition, weighting methodology, and concentration risk. Use your knowledge of this index precisely, not generically.>"},
    {"key": "valuation_context",  "body": "<2-4 sentences. Assess the current P/E or forward multiple versus this index's own long-run historical average. Is the index stretched, fair, or cheap by its own history? Reference specific multiples.>"},
    {"key": "macro_drivers",      "body": "<2-4 sentences. Identify 2-3 primary macro variables currently driving or weighing on this index. Be specific: monetary policy, fiscal backdrop, earnings momentum, currency effects, or sector-specific dynamics.>"},
    {"key": "trend",              "body": "<2-4 sentences. Assess price momentum, 52-week range positioning, and breadth quality. Are gains concentrated in a handful of names or broadly distributed? Note the volatility regime.>"},
    {"key": "outlook",            "body": "<2-4 sentences. What is the balance of risk and reward at current levels? Identify the most credible upside and downside scenario and what conditions would trigger each.>"}
  ],
  "risk_flags": [
    {"flag": "<concise risk label, 3-6 words>", "level": "<High|Medium|Low>"}
  ]
}

Scoring: an index at fair historical valuations with supportive macro and broad breadth scores 70-85. Elevated multiples versus history or deteriorating breadth weigh on the score. Macro tailwinds lift it.`;
}

// ── Full report: COMMODITY ────────────────────────────────────────────────────
function buildCommodityPrompt(ticker, data) {
  const { quote:q } = data;
  const T = ticker.toUpperCase();
  const rangePct = q?.yearHigh && q?.yearLow && q?.price
    ? (((q.price-q.yearLow)/(q.yearHigh-q.yearLow))*100).toFixed(0) + "% of 52W range"
    : "n/a";

  // Category detection for tailored driver guidance
  const PRECIOUS    = new Set(["XAUUSD","XAGUSD","XPTUSD","XPDUSD","GC","SI","PL","PA","GOLDUSD","SILVERUSD"]);
  const ENERGY      = new Set(["WTICOUSD","BRENTOIL","USOIL","NGAS","CL","NG","HO","RB","BRENT","WTI","NATGAS"]);
  const BASE_METALS = new Set(["COPPUSD","ALUMUSD","ZINCUSD","NICKUSD","LEADUSD","TINNUSD","HG","ALU","ZN","NI","PB","SN"]);
  const AGRICULTURE = new Set(["ZW","ZC","ZS","KC","CC","SB","LB","OJ","CT","ZO","ZR","WHEAT","CORN","SOYBEAN","COFFEE","COCOA","SUGAR","LUMBER","COTTON","OATS","RICE"]);
  const NUCLEAR     = new Set(["URANUSD","UX","U3O8"]);

  let categoryLabel = "commodity";
  let driverNote    = "Note: global macroeconomic shocks drive approximately two thirds of commodity price variance. Commodity-specific supply and demand factors account for the remainder. Weight macro drivers proportionately.";

  if (PRECIOUS.has(T)) {
    categoryLabel = "precious metal";
    driverNote    = "Precious metal drivers: real interest rates (inverse relationship), US dollar strength (inverse), inflation expectations and breakevens, central bank reserve buying and policy, ETF and institutional flows, physical demand (jewellery, industrial), and safe-haven demand during geopolitical or financial stress. Note this commodity's specific supply-demand characteristics (mine production, recycling, industrial use split).";
  } else if (ENERGY.has(T)) {
    categoryLabel = "energy commodity";
    driverNote    = "Energy commodity drivers: OPEC+ production quotas and compliance, US shale output and rig counts, EIA weekly inventory levels and draws, global GDP trajectory and industrial demand, geopolitical disruption risk in producing regions, US dollar strength (inverse), refinery utilisation and crack spreads, and seasonal demand patterns (heating, cooling, transport).";
  } else if (BASE_METALS.has(T)) {
    categoryLabel = "base metal";
    driverNote    = "Base metal drivers: China industrial activity and property sector (largest consumer for most base metals), global manufacturing PMI cycle, infrastructure and capex spending globally, mine supply concentration and disruption risk, smelter capacity and energy cost inputs, LME or SHFE warehouse stock levels, and trade or tariff policy affecting supply chains.";
  } else if (AGRICULTURE.has(T)) {
    categoryLabel = "agricultural commodity";
    driverNote    = "Agricultural commodity drivers: weather and growing conditions in key producing regions (note hemisphere seasonality), crop inventory and carryover stocks from prior season, export demand particularly from China and emerging markets, currency dynamics affecting import purchasing power, government policy, subsidies and trade restrictions, and seasonal harvest and planting cycles specific to this crop.";
  } else if (NUCLEAR.has(T)) {
    categoryLabel = "nuclear fuel commodity";
    driverNote    = "Uranium drivers: global nuclear reactor capacity additions and retirements, utility contracting cycle and spot vs term pricing split, mine supply concentration (Kazatomprom, Cameco dominate), enrichment capacity and conversion availability, government energy policy and the SMR development pipeline, and financial investor flows via physical holding vehicles.";
  }

  const ctx = `
COMMODITY: ${ticker} (${categoryLabel})
PRICE: ${q?.price || "n/a"} | CHANGE: ${q?.changesPercentage?.toFixed(2) || "n/a"}%
52W HIGH: ${q?.yearHigh || "n/a"} | 52W LOW: ${q?.yearLow || "n/a"} | RANGE POSITION: ${rangePct}
AVG VOLUME: ${q?.avgVolume?.toLocaleString() || "n/a"}

ANALYTICAL FRAMEWORK FOR THIS COMMODITY:
${driverNote}`.trim();

  return `Analyse the following commodity. Commodities have no earnings or balance sheet, so analysis must be rooted in supply and demand fundamentals, macro drivers, and price context. Draw specifically on your knowledge of this commodity's market structure and current conditions. Be specific to this commodity, not generic.

${ctx}

Return ONLY this JSON:
{
  "score": <integer 0-100, reflecting the strength of fundamental supply-demand support, macro alignment, and price positioning>,
  "summary": "<2-3 sentence neutral assessment. Lead with the dominant fundamental or macro driver currently influencing price. Quantify the price context (52W position). End with the primary risk.>",
  "sections": [
    {"key": "supply_demand", "body": "<2-4 sentences. Assess the supply-demand balance specific to this commodity: production trends, inventory levels, structural demand shifts. Be precise to this commodity's market structure, not generic.>"},
    {"key": "macro_drivers", "body": "<2-4 sentences. Identify the 2-3 primary macro variables currently influencing price. Specify the direction of each at present: for instance, whether real rates are supportive or headwind, or whether the USD is strengthening.>"},
    {"key": "price_context", "body": "<2-4 sentences. Assess where current price sits within the 52-week range and any broader historical context. Note momentum, mean-reversion dynamics, and any relevant support or resistance levels.>"},
    {"key": "catalysts",     "body": "<2-4 sentences. Identify specific forward events or structural shifts that could move this commodity materially in either direction. Reference scheduled supply decisions, policy events, or seasonal inflection points.>"},
    {"key": "outlook",       "body": "<2-4 sentences. Synthesise supply-demand and macro signals into a balanced outlook. Identify the primary upside scenario and the primary downside risk from current levels.>"}
  ],
  "risk_flags": [
    {"flag": "<concise risk label, 3-6 words>", "level": "<High|Medium|Low>"}
  ]
}

Scoring: strong supply-demand support with aligned macro tailwinds scores 70-85. Macro headwinds, oversupply, or technically extended prices weigh on the score.`;
}

// ── Supabase helpers ──────────────────────────────────────────────────────────
async function getCache(supabase, ticker, type) {
  const { data } = await supabase
    .from("analyses")
    .select("result, expires_at")
    .eq("ticker", ticker.toUpperCase())
    .eq("type", type)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending:false })
    .limit(1)
    .single();
  return data?.result ?? null;
}

async function saveCache(supabase, ticker, type, result) {
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await supabase
    .from("analyses")
    .upsert(
      { ticker: ticker.toUpperCase(), type, result, expires_at: expires },
      { onConflict: "ticker,type" }
    );
}

async function getUsageCount(supabase, userId, type) {
  const start = new Date();
  start.setDate(1); start.setHours(0,0,0,0);
  const { count } = await supabase
    .from("analysis_usage")
    .select("*", { count:"exact", head:true })
    .eq("user_id", userId)
    .eq("type", type)
    .gte("created_at", start.toISOString());
  return count ?? 0;
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(req) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("authorization") ?? "";
    const token      = authHeader.replace("Bearer ", "").trim();
    if (!token) return NextResponse.json({ error:"Unauthorised" }, { status:401 });

    const supabase = createClient();
    const { data:{ user }, error:authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error:"Unauthorised" }, { status:401 });

    // ── Parse body ────────────────────────────────────────────────────────────
    const body   = await req.json().catch(() => ({}));
    const ticker = (body.ticker || "").toUpperCase().trim();
    const type   = body.type === "full" ? "full" : "summary"; // "summary" | "full"

    if (!ticker) return NextResponse.json({ error:"Ticker is required" }, { status:400 });

    // ── Plan + tier gating ────────────────────────────────────────────────────
    const plan = user.user_metadata?.plan || "essential";

    if (type === "full" && plan === "essential") {
      return NextResponse.json({
        error:   "Full AI Reports require a Pro or Ultimate plan.",
        upgrade: true,
      }, { status:403 });
    }

    // ── Usage limits ──────────────────────────────────────────────────────────
    if (plan !== "ultimate") {
      const used = await getUsageCount(supabase, user.id, type);
      if (type === "summary" && plan === "essential" && used >= 20) {
        return NextResponse.json({
          error:   "Monthly limit reached: 20 AI summaries. Upgrade to Pro for unlimited.",
          upgrade: true,
        }, { status:429 });
      }
      if (type === "full" && plan === "pro" && used >= 20) {
        return NextResponse.json({
          error:   "Monthly limit reached: 20 full reports. Upgrade to Ultimate for unlimited.",
          upgrade: true,
        }, { status:429 });
      }
    }

    // ── Cache check ───────────────────────────────────────────────────────────
    const cached = await getCache(supabase, ticker, type);
    if (cached) {
      const verdict = scoreToVerdict(cached.score);
      return NextResponse.json({ ...cached, verdict, cached: true });
    }

    // ── Detect instrument type & fetch FMP data ───────────────────────────────
    // Quick profile fetch to detect type
    const profileRaw = await fmp(`/v3/profile/${ticker}`);
    const profile    = Array.isArray(profileRaw) ? profileRaw[0] : profileRaw;
    const instrType  = detectInstrumentType(ticker, profile);

    const fmpData = await fetchFmpData(ticker, instrType);
    // Re-use profile if we already have it
    if (!fmpData.profile && profile) fmpData.profile = profile;

    // ── Build prompt ──────────────────────────────────────────────────────────
    let userPrompt;
    const model = type === "full"
      ? "claude-sonnet-4-6"
      : "claude-haiku-4-5-20251001";

    if (type === "summary") {
      userPrompt = buildSummaryPrompt(ticker, instrType, fmpData);
    } else {
      if (instrType === "etf")       userPrompt = buildEtfPrompt(ticker, fmpData);
      else if (instrType === "index") userPrompt = buildIndexPrompt(ticker, fmpData);
      else if (instrType === "commodity") userPrompt = buildCommodityPrompt(ticker, fmpData);
      else                            userPrompt = buildStockPrompt(ticker, fmpData);
    }

    // ── Claude call ───────────────────────────────────────────────────────────
    const aiRes = await ai.messages.create({
      model,
      max_tokens: type === "full" ? 1800 : 700,
      system:   SYSTEM,
      messages: [{ role:"user", content: userPrompt }],
    });

    const rawText = aiRes.content?.[0]?.text ?? "";
    let analysis;
    try {
      analysis = JSON.parse(rawText.replace(/```json|```/g, "").trim());
    } catch {
      throw new Error("Failed to parse AI response as JSON");
    }

    // ── Compute verdict from score (deterministic) ────────────────────────────
    analysis.verdict      = scoreToVerdict(analysis.score ?? 50);
    analysis.instrumentType = instrType;

    // ── Save cache + track usage ──────────────────────────────────────────────
    await saveCache(supabase, ticker, type, analysis);
    await supabase.from("analysis_usage").insert({
      user_id: user.id,
      ticker,
      type,
    });

    return NextResponse.json({ ...analysis, cached: false });

  } catch (err) {
    console.error("Analyse error:", err.message);
    return NextResponse.json({ error: err.message }, { status:500 });
  }
}