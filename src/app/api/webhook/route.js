import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature error:", err.message);
    return new Response(`Webhook error: ${err.message}`, { status: 400 });
  }

  // ── Payment confirmed ────────────────────────────────────────────────────
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const email = session.customer_email;
    const customerId = session.customer;
    const subscriptionId = session.subscription;
    const priceId = session.metadata?.priceId;

    const planMap = {
      "price_1TXpfe2LvKDKlOmwCd2Kn1tM": { plan: "essential", billing: "monthly" },
      "price_1TXpgQ2LvKDKlOmwEmhpx87h": { plan: "essential", billing: "yearly"  },
      "price_1TXph12LvKDKlOmwuRfaaKwJ": { plan: "pro",       billing: "monthly" },
      "price_1TXpjD2LvKDKlOmwS2LiCkG6": { plan: "pro",       billing: "yearly"  },
    };
    const { plan, billing } = planMap[priceId] || { plan: "essential", billing: "monthly" };

    // Check if user already exists (e.g. upgrading their plan)
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    if (existingUser) {
      // User exists — just update their plan metadata
      await supabase.auth.admin.updateUserById(existingUser.id, {
        user_metadata: {
          ...existingUser.user_metadata,
          plan,
          billing,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
        },
      });
      console.log(`Plan updated for existing user: ${email} → ${plan} ${billing}`);
    } else {
      // New user — invite them (creates account + sends setup email automatically)
      const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`,
        data: {
          plan,
          billing,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
        },
      });

      if (error) {
        console.error("Error inviting user:", error.message);
        return new Response("Error inviting user", { status: 500 });
      }
      console.log(`New user invited: ${email} on ${plan} ${billing}`);
    }
  }

  // ── Subscription cancelled ───────────────────────────────────────────────
  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    const customerId = subscription.customer;

    const { data: users } = await supabase.auth.admin.listUsers();
    const user = users?.users?.find(
      u => u.user_metadata?.stripe_customer_id === customerId
    );

    if (user) {
      await supabase.auth.admin.updateUserById(user.id, {
        user_metadata: { ...user.user_metadata, plan: "cancelled" },
      });
      console.log(`Subscription cancelled for: ${user.email}`);
    }
  }

  return new Response("OK", { status: 200 });
}