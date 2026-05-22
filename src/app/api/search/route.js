import { searchStocks, marketFromExchange } from "@/lib/fmp";
import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  if (!q || q.length < 2) return NextResponse.json({ results: [] });

  try {
    const raw = await searchStocks(q.trim(), 20);
    const results = (raw || []).slice(0, 20).map(s => ({
      ticker:   s.symbol,
      name:     s.name,
      exchange: s.stockExchange || s.exchange,
      market:   marketFromExchange(s.exchangeShortName || s.exchange),
      currency: s.currency ?? "USD",
    }));
    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json({ results: [], error: err.message }, { status: 500 });
  }
}