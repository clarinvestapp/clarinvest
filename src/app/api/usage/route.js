import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error:"Not authenticated" }, { status:401 });

    const { data:{ user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return NextResponse.json({ error:"Not authenticated" }, { status:401 });

    // Start of current month
    const start = new Date(); start.setDate(1); start.setHours(0,0,0,0);

    const { data: rows } = await supabase
      .from("analysis_usage")
      .select("type")
      .eq("user_id", user.id)
      .gte("created_at", start.toISOString());

    const summaries = (rows||[]).filter(r => r.type === "summary").length;
    const reports   = (rows||[]).filter(r => r.type === "full").length;

    return NextResponse.json({ summaries, reports });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status:500 });
  }
}