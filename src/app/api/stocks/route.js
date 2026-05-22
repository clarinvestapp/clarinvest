import { NextResponse } from "next/server";

// ─── Mock data (used until FMP Starter plan is active) ────────────────────────
// Replace with real FMP calls once plan is upgraded to Starter ($29/mo)
const MOCK_STOCKS = [
  { ticker:"NVDA",  name:"NVIDIA Corporation",    price:875.40, chg:+5.41, volume:42800000, sector:"Technology",            market:"US", currency:"USD" },
  { ticker:"META",  name:"Meta Platforms Inc.",   price:528.90, chg:+3.08, volume:18200000, sector:"Communication",         market:"US", currency:"USD" },
  { ticker:"AMZN",  name:"Amazon.com Inc.",       price:195.40, chg:+1.92, volume:31500000, sector:"Consumer Discretionary",market:"US", currency:"USD" },
  { ticker:"AAPL",  name:"Apple Inc.",            price:184.20, chg:+2.13, volume:55600000, sector:"Technology",            market:"US", currency:"USD" },
  { ticker:"MSFT",  name:"Microsoft Corporation", price:415.80, chg:+0.82, volume:22100000, sector:"Technology",            market:"US", currency:"USD" },
  { ticker:"GOOGL", name:"Alphabet Inc.",         price:175.60, chg:+0.31, volume:19400000, sector:"Communication",         market:"US", currency:"USD" },
  { ticker:"AVGO",  name:"Broadcom Inc.",         price:168.30, chg:+2.74, volume:8900000,  sector:"Technology",            market:"US", currency:"USD" },
  { ticker:"CRM",   name:"Salesforce Inc.",       price:298.50, chg:+1.55, volume:6700000,  sector:"Technology",            market:"US", currency:"USD" },
  { ticker:"AMD",   name:"Advanced Micro Devices",price:178.90, chg:+4.21, volume:47200000, sector:"Technology",            market:"US", currency:"USD" },
  { ticker:"NFLX",  name:"Netflix Inc.",          price:645.20, chg:+2.88, volume:5100000,  sector:"Communication",         market:"US", currency:"USD" },
  { ticker:"JPM",   name:"JPMorgan Chase & Co.",  price:198.40, chg:+0.62, volume:9800000,  sector:"Financials",            market:"US", currency:"USD" },
  { ticker:"GS",    name:"Goldman Sachs Group",   price:472.60, chg:+0.94, volume:2400000,  sector:"Financials",            market:"US", currency:"USD" },
  { ticker:"V",     name:"Visa Inc.",             price:274.30, chg:+1.08, volume:7200000,  sector:"Financials",            market:"US", currency:"USD" },
  { ticker:"MA",    name:"Mastercard Inc.",       price:468.90, chg:+0.77, volume:3100000,  sector:"Financials",            market:"US", currency:"USD" },
  { ticker:"UNH",   name:"UnitedHealth Group",    price:524.80, chg:+0.45, volume:3400000,  sector:"Healthcare",            market:"US", currency:"USD" },
  { ticker:"LLY",   name:"Eli Lilly and Company", price:742.50, chg:+1.32, volume:4200000,  sector:"Healthcare",            market:"US", currency:"USD" },
  { ticker:"ABBV",  name:"AbbVie Inc.",           price:168.20, chg:+0.88, volume:6500000,  sector:"Healthcare",            market:"US", currency:"USD" },
  { ticker:"PFE",   name:"Pfizer Inc.",           price:27.40,  chg:-0.72, volume:34800000, sector:"Healthcare",            market:"US", currency:"USD" },
  { ticker:"XOM",   name:"Exxon Mobil Corporation",price:118.60,chg:+1.14, volume:16200000, sector:"Energy",                market:"US", currency:"USD" },
  { ticker:"CVX",   name:"Chevron Corporation",   price:156.30, chg:+0.91, volume:9800000,  sector:"Energy",                market:"US", currency:"USD" },
  { ticker:"WMT",   name:"Walmart Inc.",          price:68.40,  chg:+0.59, volume:12100000, sector:"Consumer Staples",      market:"US", currency:"USD" },
  { ticker:"COST",  name:"Costco Wholesale",      price:876.20, chg:+0.44, volume:2900000,  sector:"Consumer Staples",      market:"US", currency:"USD" },
  { ticker:"TSLA",  name:"Tesla Inc.",            price:171.30, chg:-1.22, volume:98400000, sector:"Automotive",            market:"US", currency:"USD" },
  { ticker:"F",     name:"Ford Motor Company",    price:11.82,  chg:-0.84, volume:42600000, sector:"Automotive",            market:"US", currency:"USD" },
  { ticker:"BA",    name:"Boeing Company",        price:178.50, chg:-1.44, volume:8700000,  sector:"Industrials",           market:"US", currency:"USD" },
  { ticker:"GE",    name:"GE Aerospace",          price:164.20, chg:+2.11, volume:7400000,  sector:"Industrials",           market:"US", currency:"USD" },
  { ticker:"LMT",   name:"Lockheed Martin Corp.", price:472.30, chg:+0.55, volume:1200000,  sector:"Defence",               market:"US", currency:"USD" },
  { ticker:"RTX",   name:"RTX Corporation",       price:118.60, chg:+0.38, volume:3800000,  sector:"Defence",               market:"US", currency:"USD" },
  { ticker:"AMT",   name:"American Tower Corp.",  price:192.40, chg:+0.29, volume:2100000,  sector:"Real Estate",           market:"US", currency:"USD" },
  { ticker:"NEE",   name:"NextEra Energy Inc.",   price:74.80,  chg:-0.53, volume:8900000,  sector:"Utilities",             market:"US", currency:"USD" },
];

// ─── When FMP Starter is active, replace this with real API call ──────────────
// import { getQuotes, searchStocks, marketFromExchange, normalizeSector } from "@/lib/fmp";

function getView(stocks, view) {
  const sorted = [...stocks];
  if (view === "gainers") return sorted.sort((a,b) => b.chg - a.chg);
  if (view === "losers")  return sorted.sort((a,b) => a.chg - b.chg);
  if (view === "active")  return sorted.sort((a,b) => b.volume - a.volume);
  return sorted;
}

function mockSearch(stocks, q) {
  const query = q.toLowerCase();
  return stocks.filter(s =>
    s.ticker.toLowerCase().includes(query) ||
    s.name.toLowerCase().includes(query)   ||
    s.sector.toLowerCase().includes(query)
  );
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const view   = searchParams.get("view")   || "gainers";
  const market = searchParams.get("market") || "All";
  const q      = searchParams.get("q")      || "";

  let stocks = MOCK_STOCKS;

  if (q.trim()) {
    stocks = mockSearch(stocks, q.trim());
  } else {
    stocks = getView(stocks, view);
  }

  if (market !== "All") {
    stocks = stocks.filter(s => s.market === market);
  }

  return NextResponse.json({
    stocks: stocks.slice(0, 40),
    mock: true, // flag so we can show "demo data" badge in UI
  });
}