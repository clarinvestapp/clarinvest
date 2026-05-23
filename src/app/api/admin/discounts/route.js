import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function requireAdmin(req) {
  const token = req.headers.get("authorization")?.replace("Bearer ","");
  if (!token) return null;
  const { data:{ user } } = await sb.auth.getUser(token);
  return user?.user_metadata?.role === "admin" ? user : null;
}

function genCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const seg = (n) => Array.from({length:n},()=>chars[Math.floor(Math.random()*chars.length)]).join("");
  return `TRIAL-${seg(4)}-${seg(4)}`;
}

export async function GET(req) {
  if (!await requireAdmin(req)) return NextResponse.json({ error:"Forbidden" },{ status:403 });
  const { data:codes } = await sb.from("trial_codes").select("*").order("created_at",{ascending:false});
  const { data:usage }  = await sb.from("trial_usage").select("*").order("started_at",{ascending:false});
  return NextResponse.json({ codes:codes||[], usage:usage||[] });
}

export async function POST(req) {
  if (!await requireAdmin(req)) return NextResponse.json({ error:"Forbidden" },{ status:403 });
  const { plan="essential", duration_days=14, max_uses=1, note, code } = await req.json();
  const { data, error } = await sb.from("trial_codes").insert({
    code: (code||genCode()).toUpperCase(), plan, duration_days, max_uses, note, active:true,
  }).select().single();
  if (error) return NextResponse.json({ error:error.message },{ status:500 });
  return NextResponse.json({ code:data });
}

export async function PATCH(req) {
  if (!await requireAdmin(req)) return NextResponse.json({ error:"Forbidden" },{ status:403 });
  const { id, ...updates } = await req.json();
  const { error } = await sb.from("trial_codes").update(updates).eq("id",id);
  if (error) return NextResponse.json({ error:error.message },{ status:500 });
  return NextResponse.json({ ok:true });
}

export async function DELETE(req) {
  if (!await requireAdmin(req)) return NextResponse.json({ error:"Forbidden" },{ status:403 });
  const { searchParams } = new URL(req.url);
  await sb.from("trial_codes").delete().eq("id", searchParams.get("id"));
  return NextResponse.json({ ok:true });
}