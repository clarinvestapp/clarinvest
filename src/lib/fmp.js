// FMP — new stable API (post-August 2025)
// Base plan requirements: Starter ($29/mo) for US, Premium ($69/mo) for UK, Ultimate ($139/mo) for EU+ETFs
const BASE = "https://financialmodelingprep.com/stable";
const KEY  = process.env.FMP_API_KEY;

async function fmpFetch(path, revalidate = 300) {
  const sep = path.includes("?") ? "&" : "?";
  const url = `${BASE}${path}${sep}apikey=${KEY}`;
  const res = await fetch(url, { next: { revalidate } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`FMP ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

// ─── Batch quote (comma-separated symbols) ───────────────────────────────────
export async function getQuotes(tickers) {
  const symbols = Array.isArray(tickers) ? tickers.join(",") : tickers;
  return fmpFetch(`/quote?symbol=${encodeURIComponent(symbols)}`, 60);
}

export async function getQuote(ticker) {
  const data = await fmpFetch(`/quote?symbol=${ticker}`, 60);
  return Array.isArray(data) ? data[0] : data;
}

// ─── Search ───────────────────────────────────────────────────────────────────
export async function searchStocks(query, limit = 20) {
  const [bySymbol, byName] = await Promise.allSettled([
    fmpFetch(`/search-symbol?query=${encodeURIComponent(query)}&limit=${limit}`),
    fmpFetch(`/search-name?query=${encodeURIComponent(query)}&limit=${limit}`),
  ]);
  const symbolResults = bySymbol.status === "fulfilled" ? (bySymbol.value || []) : [];
  const nameResults   = byName.status   === "fulfilled" ? (byName.value   || []) : [];
  // Merge, deduplicate by symbol
  const seen = new Set();
  return [...symbolResults, ...nameResults].filter(s => {
    const key = s.symbol;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, limit);
}

// ─── Stock profile ────────────────────────────────────────────────────────────
export async function getStockProfile(ticker) {
  const data = await fmpFetch(`/profile?symbol=${ticker}`, 3600);
  return Array.isArray(data) ? data[0] : data;
}

// ─── Financials ───────────────────────────────────────────────────────────────
export async function getIncomeStatement(ticker, period = "annual", limit = 5) {
  return fmpFetch(`/income-statement?symbol=${ticker}&period=${period}&limit=${limit}`, 3600);
}

export async function getBalanceSheet(ticker, period = "annual", limit = 5) {
  return fmpFetch(`/balance-sheet-statement?symbol=${ticker}&period=${period}&limit=${limit}`, 3600);
}

export async function getCashFlow(ticker, period = "annual", limit = 5) {
  return fmpFetch(`/cash-flow-statement?symbol=${ticker}&period=${period}&limit=${limit}`, 3600);
}

export async function getKeyMetrics(ticker, period = "annual", limit = 5) {
  return fmpFetch(`/key-metrics?symbol=${ticker}&period=${period}&limit=${limit}`, 3600);
}

export async function getRatios(ticker, period = "annual", limit = 5) {
  return fmpFetch(`/ratios?symbol=${ticker}&period=${period}&limit=${limit}`, 3600);
}

// ─── Historical price ─────────────────────────────────────────────────────────
export async function getHistoricalPrice(ticker, from, to) {
  return fmpFetch(`/historical-price-eod/light?symbol=${ticker}&from=${from}&to=${to}`, 3600);
}

// ─── Earnings ─────────────────────────────────────────────────────────────────
export async function getEarnings(ticker, limit = 8) {
  return fmpFetch(`/earnings?symbol=${ticker}&limit=${limit}`, 3600);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const EXCHANGE_MAP = {
  NYSE:"US", NASDAQ:"US", AMEX:"US", "NYSE ARCA":"US",
  LSE:"UK", AIM:"UK",
  EURONEXT:"EU", XETRA:"EU", SIX:"EU", BIT:"EU", BME:"EU",
};

export function marketFromExchange(exchange) {
  if (!exchange) return "US";
  return EXCHANGE_MAP[exchange.toUpperCase().trim()] || "US";
}

const SECTOR_MAP = {
  "Technology":"Technology", "Information Technology":"Technology",
  "Financial Services":"Financials", "Financials":"Financials",
  "Healthcare":"Healthcare", "Health Care":"Healthcare",
  "Consumer Cyclical":"Consumer Discretionary",
  "Consumer Defensive":"Consumer Staples",
  "Industrials":"Industrials", "Basic Materials":"Materials",
  "Real Estate":"Real Estate", "Utilities":"Utilities",
  "Communication Services":"Communication", "Energy":"Energy",
  "Biotechnology":"Biotech", "Aerospace & Defense":"Defence",
  "Auto Manufacturers":"Automotive",
};

export function normalizeSector(sector) {
  return SECTOR_MAP[sector] || sector || "Other";
}