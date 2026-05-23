import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Public endpoint — no auth required
// ?target=all|auth|essential|pro|ultimate
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get("target") || "all";
  const now    = new Date().toISOString();

  // Fetch banners visible to this target: "all" banners always show,
  // plus banners targeted at the specific plan/auth level
  const { data } = await sb
    .from("banners")
    .select("id,text,type,position,target")
    .eq("active", true)
    .or(`target.eq.all,target.eq.${target}`)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order("sort_order")
    .order("created_at", { ascending: false });

  return NextResponse.json({ banners: data || [] });
}