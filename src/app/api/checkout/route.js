import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    const { priceId } = await request.json();

    // Resolve user from session token if present
    let userEmail = null;
    let userId    = null;
    let existingCustomerId = null;

    if (token) {
      const { data:{ user } } = await supabase.auth.getUser(token);
      if (user) {
        userEmail          = user.email;
        userId             = user.id;
        existingCustomerId = user.user_metadata?.stripe_customer_id;
      }
    }

    // Look up or create Stripe customer so the ID is stable
    let customerId = existingCustomerId;
    if (!customerId && userEmail) {
      const existing = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (existing.data.length > 0) {
        customerId = existing.data[0].id;
      } else {
        const customer = await stripe.customers.create({ email: userEmail });
        customerId = customer.id;
      }
      // Store customer ID back to Supabase user metadata
      if (userId) {
        await supabase.auth.admin.updateUserById(userId, {
          user_metadata: { stripe_customer_id: customerId },
        });
      }
    }

    const sessionParams = {
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/account`,
      metadata: { priceId },
    };

    if (customerId) {
      sessionParams.customer = customerId;
    } else if (userEmail) {
      sessionParams.customer_email = userEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    return Response.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}