import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const FMP_BASE = "https://financialmodelingprep.com/stable";
const FMP_KEY  = process.env.FMP_API_KEY;

async function getUser(request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data:{ user } } = await supabase.auth.getUser(token);
  return user ?? null;
}

async function fetchPrices(tickers) {
  if (!tickers.length) return {};
  try {
    const res = await fetch(
      `${FMP_BASE}/quote?symbol=${tickers.join(",")}&apikey=${FMP_KEY}`,
      { cache:"no-store" }
    );
    if (!res.ok) return {};
    const data = await res.json();
    const map = {};
    (Array.isArray(data) ? data : []).forEach(q => {
      map[q.symbol] = { price:q.price, chg:q.changesPercentage };
    });
    return map;
  } catch { return {}; }
}

// GET — return full watchlist with current prices
export async function GET(request) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error:"Not authenticated" }, { status:401 });

  const { data: rows, error } = await supabase
    .from("watchlists")
    .select("ticker,name,sector,market,added_at")
    .eq("user_id", user.id)
    .order("added_at", { ascending:false });

  if (error) return NextResponse.json({ error:error.message }, { status:500 });

  const tickers = (rows||[]).map(r => r.ticker);
  const prices  = await fetchPrices(tickers);

  const stocks = (rows||[]).map(r => ({
    ...r,
    price: prices[r.ticker]?.price ?? null,
    chg:   prices[r.ticker]?.chg   ?? null,
    score: null,
  }));

  return NextResponse.json({ stocks });
}

// POST — add to watchlist
export async function POST(request) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error:"Not authenticated" }, { status:401 });

  const { ticker, name, sector, market } = await request.json();
  if (!ticker) return NextResponse.json({ error:"Ticker required" }, { status:400 });

  const { error } = await supabase.from("watchlists").upsert({
    user_id: user.id,
    ticker:  ticker.toUpperCase(),
    name:    name  || ticker,
    sector:  sector|| "Other",
    market:  market|| "US",
  }, { onConflict:"user_id,ticker" });

  if (error) return NextResponse.json({ error:error.message }, { status:500 });
  return NextResponse.json({ ok:true });
}

// DELETE — remove from watchlist
export async function DELETE(request) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error:"Not authenticated" }, { status:401 });

  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker")?.toUpperCase();
  if (!ticker) return NextResponse.json({ error:"Ticker required" }, { status:400 });

  const { error } = await supabase
    .from("watchlists")
    .delete()
    .eq("user_id", user.id)
    .eq("ticker", ticker);

  if (error) return NextResponse.json({ error:error.message }, { status:500 });
  return NextResponse.json({ ok:true });
}