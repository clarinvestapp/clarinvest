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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const email = session.customer_details?.email || session.customer_email;
    const customerId = session.customer;
    const subscriptionId = session.subscription;
    const priceId = session.metadata?.priceId;

    // Determine plan and billing period from price ID
    const planMap = {
      "price_1TXpfe2LvKDKlOmwCd2Kn1tM": { plan: "essential", billing: "monthly" },
      "price_1TXpgQ2LvKDKlOmwEmhpx87h": { plan: "essential", billing: "yearly"  },
      "price_1TXph12LvKDKlOmwuRfaaKwJ": { plan: "pro",       billing: "monthly" },
      "price_1TXpjD2LvKDKlOmwS2LiCkG6": { plan: "pro",       billing: "yearly"  },
    };
    const { plan, billing } = planMap[priceId] || { plan: "essential", billing: "monthly" };

    // Create Supabase user account
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      email_confirm: false,
      user_metadata: {
        plan,
        billing,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
      },
    });

    if (error) {
      console.error("Error creating user:", error.message);
      return new Response("Error creating user", { status: 500 });
    }

    // Send password setup email
    await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`,
      },
    });

    console.log(`User created: ${email} on ${plan} ${billing}`);
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    const customerId = subscription.customer;

    // Find user by stripe customer id and update their metadata
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