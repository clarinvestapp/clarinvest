import { getGainers, getLosers, getMostActive, searchStocks, marketFromExchange, normalizeSector } from "@/lib/fmp";
import { NextResponse } from "next/server";

function normalize(raw) {
  return (raw || []).map(s => ({
    ticker:   s.symbol,
    name:     s.name,
    price:    s.price      ?? null,
    chg:      s.changesPercentage ?? s.change ?? null,
    market:   marketFromExchange(s.exchange || s.exchangeShortName),
    sector:   normalizeSector(s.sector),
    exchange: s.exchange   ?? s.exchangeShortName ?? null,
    currency: s.currency   ?? "USD",
  }));
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const view   = searchParams.get("view")   || "gainers";
  const market = searchParams.get("market") || "All";
  const q      = searchParams.get("q")      || "";

  try {
    let stocks = [];

    if (q.trim()) {
      const results = await searchStocks(q.trim(), 30);
      stocks = (results || []).map(s => ({
        ticker:   s.symbol,
        name:     s.name,
        price:    null,
        chg:      null,
        market:   marketFromExchange(s.exchangeShortName),
        sector:   "Technology",
        exchange: s.stockExchange,
        currency: s.currency ?? "USD",
      }));
    } else {
      let raw = [];
      if (view === "gainers") raw = await getGainers();
      if (view === "losers")  raw = await getLosers();
      if (view === "active")  raw = await getMostActive();
      stocks = normalize(raw);
    }

    if (market !== "All") {
      stocks = stocks.filter(s => s.market === market);
    }

    return NextResponse.json({ stocks: stocks.slice(0, 60) });
  } catch (err) {
    console.error("Stocks API error:", err.message);
    return NextResponse.json({ stocks: [], error: err.message }, { status: 500 });
  }
}
