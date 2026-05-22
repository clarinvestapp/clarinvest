const BASE = "https://financialmodelingprep.com/api/v3";
const KEY  = process.env.FMP_API_KEY;

async function fmpFetch(path, revalidate = 300) {
  const sep = path.includes("?") ? "&" : "?";
  const url = `${BASE}${path}${sep}apikey=${KEY}`;
  const res = await fetch(url, { next: { revalidate } });
  if (!res.ok) throw new Error(`FMP ${res.status}: ${path}`);
  return res.json();
}

// ─── Discovery ────────────────────────────────────────────────────────────────
export async function getGainers()   { return fmpFetch("/stock_market/gainers",  60); }
export async function getLosers()    { return fmpFetch("/stock_market/losers",   60); }
export async function getMostActive(){ return fmpFetch("/stock_market/actives",  60); }

// ─── Search ───────────────────────────────────────────────────────────────────
export async function searchStocks(query, limit = 20) {
  return fmpFetch(`/search?query=${encodeURIComponent(query)}&limit=${limit}`);
}

// ─── Quotes ───────────────────────────────────────────────────────────────────
export async function getQuote(ticker) {
  const data = await fmpFetch(`/quote/${ticker}`, 60);
  return Array.isArray(data) ? data[0] : data;
}

export async function getQuotes(tickers) {
  const list = Array.isArray(tickers) ? tickers.join(",") : tickers;
  return fmpFetch(`/quote/${list}`, 60);
}

// ─── Stock profile ────────────────────────────────────────────────────────────
export async function getStockProfile(ticker) {
  const data = await fmpFetch(`/profile/${ticker}`, 3600);
  return Array.isArray(data) ? data[0] : data;
}

// ─── Financials ───────────────────────────────────────────────────────────────
export async function getIncomeStatement(ticker, period = "annual") {
  return fmpFetch(`/income-statement/${ticker}?period=${period}&limit=5`, 3600);
}

export async function getBalanceSheet(ticker, period = "annual") {
  return fmpFetch(`/balance-sheet-statement/${ticker}?period=${period}&limit=5`, 3600);
}

export async function getCashFlow(ticker, period = "annual") {
  return fmpFetch(`/cash-flow-statement/${ticker}?period=${period}&limit=5`, 3600);
}

export async function getKeyMetrics(ticker, period = "annual") {
  return fmpFetch(`/key-metrics/${ticker}?period=${period}&limit=5`, 3600);
}

export async function getRatios(ticker, period = "annual") {
  return fmpFetch(`/ratios/${ticker}?period=${period}&limit=5`, 3600);
}

// ─── Historical price ─────────────────────────────────────────────────────────
export async function getHistoricalPrice(ticker, from, to) {
  return fmpFetch(`/historical-price-full/${ticker}?from=${from}&to=${to}`, 3600);
}

// ─── Earnings ─────────────────────────────────────────────────────────────────
export async function getEarnings(ticker) {
  return fmpFetch(`/earnings/${ticker}?limit=8`, 3600);
}

export async function getEarningsCalendar(from, to) {
  return fmpFetch(`/earning_calendar?from=${from}&to=${to}`, 3600);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const EXCHANGE_MAP = {
  NYSE:"US", NASDAQ:"US", AMEX:"US", "NYSE ARCA":"US", "NYSE MKT":"US",
  LSE:"UK", AIM:"UK",
  EURONEXT:"EU", XETRA:"EU", SIX:"EU", BIT:"EU", BME:"EU", EPA:"EU",
};

export function marketFromExchange(exchange) {
  if (!exchange) return "US";
  const key = exchange.toUpperCase().replace(/\s+/g, " ").trim();
  return EXCHANGE_MAP[key] || (key.includes("NYSE") || key.includes("NASDAQ") ? "US" : "US");
}

const SECTOR_MAP = {
  "Technology":"Technology",
  "Information Technology":"Technology",
  "Financial Services":"Financials",
  "Financials":"Financials",
  "Healthcare":"Healthcare",
  "Health Care":"Healthcare",
  "Consumer Cyclical":"Consumer Discretionary",
  "Consumer Defensive":"Consumer Staples",
  "Industrials":"Industrials",
  "Basic Materials":"Materials",
  "Real Estate":"Real Estate",
  "Utilities":"Utilities",
  "Communication Services":"Communication",
  "Energy":"Energy",
  "Biotechnology":"Biotech",
  "Defense":"Defence",
  "Aerospace & Defense":"Defence",
  "Auto Manufacturers":"Automotive",
  "Luxury Goods":"Luxury",
};

export function normalizeSector(sector) {
  return SECTOR_MAP[sector] || sector || "Other";
}
