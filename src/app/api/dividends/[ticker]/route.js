import { NextResponse } from "next/server";

const BASE = "https://financialmodelingprep.com/stable";
const KEY  = process.env.FMP_API_KEY;

async function safe(path) {
  try {
    const sep = path.includes("?") ? "&" : "?";
    const res = await fetch(`${BASE}${path}${sep}apikey=${KEY}`, { next:{ revalidate:3600 } });
    if (!res.ok) return null;
    const d = await res.json();
    return Array.isArray(d) ? d : (d || null);
  } catch { return null; }
}

function computeScores(r, m, history) {
  // ── Safety Score ─────────────────────────────────────────────────────────────
  let safety = 0;
  const pr  = r?.payoutRatio      != null ? +r.payoutRatio      : null;
  const de  = r?.debtEquityRatio  != null ? +r.debtEquityRatio  : null;
  const rg  = r?.revenueGrowth    != null ? +r.revenueGrowth    : null;
  const dg  = r?.dividendsperShareGrowth != null ? +r.dividendsperShareGrowth : null;
  const cfd = r?.cashFlowToDebtRatio != null ? +r.cashFlowToDebtRatio : null;
  const fcf = m?.freeCashFlowPerShare != null ? +m.freeCashFlowPerShare : null;
  const dps = m?.dividendsPerShare    != null ? +m.dividendsPerShare    : null;

  // Payout ratio (0–30 pts)
  if (pr != null) {
    if (pr < 0.35) safety += 30;
    else if (pr < 0.55) safety += 20;
    else if (pr < 0.75) safety += 10;
  } else safety += 14;

  // FCF coverage (0–25 pts)
  if (fcf != null && dps != null && dps > 0) {
    const cov = fcf / dps;
    if (cov > 3) safety += 25;
    else if (cov > 2) safety += 18;
    else if (cov > 1) safety += 10;
  } else if (cfd != null) {
    if (cfd > 5) safety += 20;
    else if (cfd > 2) safety += 12;
    else if (cfd > 0) safety += 6;
  } else safety += 11;

  // Debt / Equity (0–20 pts)
  if (de != null) {
    if (de < 0.3) safety += 20;
    else if (de < 0.7) safety += 14;
    else if (de < 1.5) safety += 7;
  } else safety += 10;

  // Revenue trend (0–15 pts)
  if (rg != null) {
    if (rg > 0.10) safety += 15;
    else if (rg > 0) safety += 10;
    else if (rg > -0.05) safety += 4;
  } else safety += 7;

  // Dividend history depth (0–10 pts)
  const payments = history?.length || 0;
  if (payments >= 20) safety += 10;
  else if (payments >= 8) safety += 6;
  else if (dg != null && dg > 0) safety += 5;

  // ── Growth Score ─────────────────────────────────────────────────────────────
  let growth = 0;
  const eg = r?.epsgrowth != null ? +r.epsgrowth : null;

  // DPS growth rate (0–35 pts)
  if (dg != null) {
    if (dg > 0.15) growth += 35;
    else if (dg > 0.08) growth += 25;
    else if (dg > 0.03) growth += 15;
    else if (dg > 0) growth += 8;
  } else growth += 15;

  // EPS growth (0–25 pts)
  if (eg != null) {
    if (eg > 0.15) growth += 25;
    else if (eg > 0.08) growth += 18;
    else if (eg > 0) growth += 10;
  } else growth += 12;

  // Payout headroom — room to raise (0–25 pts)
  if (pr != null) {
    if (pr < 0.30) growth += 25;
    else if (pr < 0.50) growth += 18;
    else if (pr < 0.65) growth += 10;
    else growth += 3;
  } else growth += 12;

  // Revenue momentum (0–15 pts)
  if (rg != null) {
    if (rg > 0.15) growth += 15;
    else if (rg > 0.05) growth += 10;
    else if (rg > 0) growth += 5;
  } else growth += 7;

  return {
    safetyScore: Math.min(100, Math.round(safety)),
    growthScore:  Math.min(100, Math.round(growth)),
  };
}

function statusFor(val, good, mid) {
  if (val == null) return "neutral";
  return val >= good ? "good" : val >= mid ? "neutral" : "bad";
}

export async function GET(request, { params }) {
  const { ticker } = await params;

  const [histDiv, ratiosArr, metricsArr, profileArr] = await Promise.all([
    safe(`/dividends?symbol=${ticker}&limit=24`),
    safe(`/ratios?symbol=${ticker}&period=annual&limit=1`),
    safe(`/key-metrics?symbol=${ticker}&period=annual&limit=1`),
    safe(`/profile?symbol=${ticker}`),
  ]);

  const r    = Array.isArray(ratiosArr)  ? ratiosArr[0]  : ratiosArr;
  const m    = Array.isArray(metricsArr) ? metricsArr[0] : metricsArr;
  const prof = Array.isArray(profileArr) ? profileArr[0] : profileArr;

  const { safetyScore, growthScore } = computeScores(r, m, histDiv);

  // Key metrics
  const dividendYield = r?.dividendYield != null
    ? +r.dividendYield
    : (prof?.lastDiv && prof?.price ? +prof.lastDiv / +prof.price : null);
  const annualDPS    = m?.dividendsPerShare != null ? +m.dividendsPerShare : (prof?.lastDiv ? +prof.lastDiv : null);
  const payoutRatio  = r?.payoutRatio != null ? +r.payoutRatio : null;

  // Annual dividend history from quarterly payments
  let history = [];
  if (histDiv?.length > 0) {
    const byYear = {};
    histDiv.forEach(d => {
      const yr = d.date?.split("-")[0];
      if (yr) byYear[yr] = +(((byYear[yr] || 0) + +(d.dividend ?? d.adjDividend ?? 0)).toFixed(4));
    });
    history = Object.entries(byYear)
      .sort(([a],[b]) => +a - +b)
      .slice(-6)
      .map(([year, dps]) => ({ year:+year, dps }));
  }

  // Safety factor breakdown
  const pr  = r?.payoutRatio != null ? +r.payoutRatio : null;
  const de  = r?.debtEquityRatio != null ? +r.debtEquityRatio : null;
  const rg  = r?.revenueGrowth != null ? +r.revenueGrowth : null;
  const dg  = r?.dividendsperShareGrowth != null ? +r.dividendsperShareGrowth : null;
  const eg  = r?.epsgrowth != null ? +r.epsgrowth : null;

  const safetyFactors = [
    {
      label: "Payout Ratio",
      value: pr != null ? `${(pr*100).toFixed(1)}%` : "—",
      status: pr != null ? (pr<0.55?"good":pr<0.75?"neutral":"bad") : "neutral",
    },
    {
      label: "Debt / Equity",
      value: de != null ? de.toFixed(2) : "—",
      status: de != null ? (de<0.7?"good":de<1.5?"neutral":"bad") : "neutral",
    },
    {
      label: "Revenue Trend",
      value: rg != null ? `${(rg*100).toFixed(1)}%` : "—",
      status: rg != null ? (rg>0?"good":rg>-0.05?"neutral":"bad") : "neutral",
    },
    {
      label: "Dividend History",
      value: histDiv?.length > 0 ? `${histDiv.length} payments on record` : "Limited data",
      status: (histDiv?.length||0)>12?"good":(histDiv?.length||0)>4?"neutral":"bad",
    },
  ];

  const growthFactors = [
    {
      label: "DPS Growth (YoY)",
      value: dg != null ? `${(dg*100).toFixed(1)}%` : "—",
      status: dg != null ? (dg>0.05?"good":dg>0?"neutral":"bad") : "neutral",
    },
    {
      label: "EPS Growth",
      value: eg != null ? `${(eg*100).toFixed(1)}%` : "—",
      status: eg != null ? (eg>0.05?"good":eg>0?"neutral":"bad") : "neutral",
    },
    {
      label: "Payout Headroom",
      value: pr != null ? `${(100-pr*100).toFixed(0)}% room to raise` : "—",
      status: pr != null ? (pr<0.50?"good":pr<0.70?"neutral":"bad") : "neutral",
    },
    {
      label: "Revenue Growth",
      value: rg != null ? `${(rg*100).toFixed(1)}%` : "—",
      status: rg != null ? (rg>0.05?"good":rg>0?"neutral":"bad") : "neutral",
    },
  ];

  return NextResponse.json({
    safetyScore,
    growthScore,
    dividendYield,
    annualDPS,
    payoutRatio,
    history,
    safetyFactors,
    growthFactors,
    exDate:      histDiv?.[0]?.date        || null,
    paymentDate: histDiv?.[0]?.paymentDate || null,
    mock: !histDiv,
  });
}