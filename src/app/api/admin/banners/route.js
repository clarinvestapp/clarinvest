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
  const { data } = await sb.from("banners").select("*").order("sort_order").order("created_at",{ascending:false});
  return NextResponse.json({ banners: data||[] });
}

export async function POST(req) {
  if (!await requireAdmin(req)) return NextResponse.json({ error:"Forbidden" },{ status:403 });
  const body = await req.json();
  const { data, error } = await sb.from("banners").insert(body).select().single();
  if (error) return NextResponse.json({ error:error.message },{ status:500 });
  return NextResponse.json({ banner:data });
}

export async function PATCH(req) {
  if (!await requireAdmin(req)) return NextResponse.json({ error:"Forbidden" },{ status:403 });
  const { id, ...updates } = await req.json();
  const { error } = await sb.from("banners").update(updates).eq("id",id);
  if (error) return NextResponse.json({ error:error.message },{ status:500 });
  return NextResponse.json({ ok:true });
}

export async function DELETE(req) {
  if (!await requireAdmin(req)) return NextResponse.json({ error:"Forbidden" },{ status:403 });
  const { searchParams } = new URL(req.url);
  await sb.from("banners").delete().eq("id", searchParams.get("id"));
  return NextResponse.json({ ok:true });
}