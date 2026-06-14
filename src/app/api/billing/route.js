import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error:"Not authenticated" }, { status:401 });

    const { data:{ user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return NextResponse.json({ error:"Not authenticated" }, { status:401 });

    // Try metadata first (fast path), then fall back to Stripe lookup by email
    let customerId = user.user_metadata?.stripe_customer_id;

    if (!customerId && user.email) {
      const existing = await stripe.customers.list({ email: user.email, limit: 1 });
      if (existing.data.length > 0) {
        customerId = existing.data[0].id;
        // Write it back so the next call hits the fast path
        await supabase.auth.admin.updateUserById(user.id, {
          user_metadata: { stripe_customer_id: customerId },
        });
      }
    }

    if (!customerId) {
      return NextResponse.json({ error:"No billing account found. Please subscribe first." }, { status:404 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer:   customerId,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/account`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Billing portal error:", err.message);
    return NextResponse.json({ error: err.message }, { status:500 });
  }
}