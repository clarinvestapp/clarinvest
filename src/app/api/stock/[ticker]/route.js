import { NextResponse } from "next/server";

const BASE = "https://financialmodelingprep.com/stable";
const KEY  = process.env.FMP_API_KEY;

async function safe(path, ttl = 300) {
  try {
    const sep = path.includes("?") ? "&" : "?";
    const res = await fetch(`${BASE}${path}${sep}apikey=${KEY}`, { next: { revalidate: ttl } });
    if (!res.ok) return null;
    const d = await res.json();
    return Array.isArray(d) ? d[0] ?? null : d ?? null;
  } catch { return null; }
}

async function safeArr(path, ttl = 300) {
  try {
    const sep = path.includes("?") ? "&" : "?";
    const res = await fetch(`${BASE}${path}${sep}apikey=${KEY}`, { next: { revalidate: ttl } });
    if (!res.ok) return [];
    const d = await res.json();
    return Array.isArray(d) ? d : (d?.historical ?? []);
  } catch { return []; }
}

function daysAgo(n) {
  return new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
}

export async function GET(request, { params }) {
  const { ticker } = await params;
  const t = ticker.toUpperCase();

  const [quote, profile, historical, metrics, ratios] = await Promise.all([
    safe(`/quote?symbol=${t}`, 60),
    safe(`/profile?symbol=${t}`, 3600),
    safeArr(`/historical-price-eod/light?symbol=${t}&from=${daysAgo(365)}&to=${daysAgo(0)}`, 3600),
    safe(`/key-metrics?symbol=${t}&period=annual&limit=1`, 3600),
    safe(`/ratios?symbol=${t}&period=annual&limit=1`, 3600),
  ]);

  // Normalise historical: FMP returns newest-first, we want oldest-first for chart
  const chart = (Array.isArray(historical) ? historical : [])
    .filter(h => h?.date && h?.close != null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(h => ({ date: h.date, price: +h.close }));

  return NextResponse.json({ ticker: t, quote, profile, chart, metrics, ratios });
}