import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function requireAdmin(req) {
  const token = req.headers.get("authorization")?.replace("Bearer ","");
  if (!token) return null;
  const { data:{ user } } = await sb.auth.getUser(token);
  return user?.user_metadata?.role === "admin" ? user : null;
}

export async function GET(req) {
  if (!await requireAdmin(req)) return NextResponse.json({ error:"Forbidden" },{ status:403 });

  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // All users
  const { data:{ users = [] } } = await sb.auth.admin.listUsers({ perPage:1000 });
  const plans = { essential:0, pro:0, ultimate:0, cancelled:0, other:0 };
  users.forEach(u => {
    const p = u.user_metadata?.plan || "other";
    plans[p] = (plans[p]||0) + 1;
  });

  // MRR estimate (monthly prices in £)
  const PRICES = { essential:9, pro:19, ultimate:29 };
  const mrr = Object.entries(PRICES).reduce((sum,[plan,price]) => sum + (plans[plan]||0)*price, 0);

  // AI usage this month
  const { count:summaries } = await sb.from("analysis_usage").select("*",{count:"exact",head:true}).gte("created_at",start).eq("type","summary");
  const { count:reports }   = await sb.from("analysis_usage").select("*",{count:"exact",head:true}).gte("created_at",start).eq("type","full");

  // Top tickers
  const { data:tickerRows } = await sb.from("analyses").select("ticker").order("created_at",{ascending:false}).limit(200);
  const tickerCount = {};
  (tickerRows||[]).forEach(r => { tickerCount[r.ticker] = (tickerCount[r.ticker]||0)+1; });
  const topTickers = Object.entries(tickerCount).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([t,c])=>({ticker:t,count:c}));

  // Recent signups
  const recent = [...users].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,6).map(u=>({
    email: u.email, plan: u.user_metadata?.plan||"—", joined: u.created_at,
  }));

  return NextResponse.json({ plans, mrr, summaries:summaries||0, reports:reports||0, topTickers, recent, total: users.length });
}