import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const planMap = {
  "price_1TXpfe2LvKDKlOmwCd2Kn1tM": { plan: "essential", billing: "monthly" },
  "price_1TXpgQ2LvKDKlOmwEmhpx87h": { plan: "essential", billing: "yearly"  },
  "price_1TXph12LvKDKlOmwuRfaaKwJ": { plan: "pro",       billing: "monthly" },
  "price_1TXpjD2LvKDKlOmwS2LiCkG6": { plan: "pro",       billing: "yearly"  },
};

async function sendSetupEmail(email, setupLink, plan) {
  const planLabel = plan === "pro" ? "Pro" : "Essential";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Clarinvest <onboarding@resend.dev>",
      to: email,
      subject: "Set up your Clarinvest account",
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="margin:0;padding:0;background:#090909;font-family:'Helvetica Neue',Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#090909;padding:40px 20px;">
            <tr><td align="center">
              <table width="560" cellpadding="0" cellspacing="0" style="background:#111113;border:1px solid #232325;border-radius:12px;overflow:hidden;">
                <tr><td style="padding:32px 40px;border-bottom:1px solid #232325;">
                  <p style="margin:0;font-family:Georgia,serif;font-size:18px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#F0F0F0;">Clarinvest</p>
                </td></tr>
                <tr><td style="padding:40px;">
                  <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:26px;font-weight:700;color:#F0F0F0;line-height:1.2;">Welcome to Clarinvest</h1>
                  <p style="margin:0 0 12px;font-size:15px;color:#7A7A80;line-height:1.7;">Your <strong style="color:#F0F0F0;">${planLabel}</strong> subscription is active. Click the button below to set your password and access your dashboard.</p>
                  <p style="margin:0 0 32px;font-size:15px;color:#7A7A80;line-height:1.7;">This link expires in 24 hours.</p>
                  <table cellpadding="0" cellspacing="0">
                    <tr><td style="border-radius:5px;background:#F0F0F0;">
                      <a href="${setupLink}" style="display:inline-block;padding:14px 32px;font-size:14px;font-weight:600;color:#090909;text-decoration:none;letter-spacing:0.03em;">Set up my account →</a>
                    </td></tr>
                  </table>
                  <p style="margin:32px 0 0;font-size:13px;color:#3A3A3A;line-height:1.7;">If you did not make this purchase, please ignore this email or contact us at support@clarinvest.app</p>
                </td></tr>
                <tr><td style="padding:24px 40px;border-top:1px solid #232325;">
                  <p style="margin:0;font-size:12px;color:#3A3A3A;">© 2026 Clarinvest · For informational purposes only · Not financial advice</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `,
    }),
  });

  const result = await response.json();
  console.log("Resend status:", response.status, "Response:", JSON.stringify(result));
  return result;
}

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

  // ── Payment confirmed ──────────────────────────────────────────────────────
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const email = session.customer_details?.email || session.customer_email;
    const customerId = session.customer;
    const subscriptionId = session.subscription;
    const priceId = session.metadata?.priceId;

    if (!email) {
      console.error("No email found in session");
      return new Response("No email found", { status: 400 });
    }

    const { plan, billing } = planMap[priceId] || { plan: "essential", billing: "monthly" };

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    if (existingUser) {
      // Existing user — update plan only
      await supabase.auth.admin.updateUserById(existingUser.id, {
        user_metadata: {
          ...existingUser.user_metadata,
          plan,
          billing,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
        },
      });
      console.log(`Plan updated for: ${email} → ${plan} ${billing}`);
    } else {
      // New user — create account
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          plan,
          billing,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
        },
      });

      if (createError) {
        console.error("Error creating user:", createError.message);
        return new Response("Error creating user", { status: 500 });
      }

      // Generate password setup link
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: "recovery",
        email,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard`,
        },
      });

      if (linkError) {
        console.error("Error generating link:", linkError.message);
        return new Response("Error generating link", { status: 500 });
      }

      // Send email via Resend
      await sendSetupEmail(email, linkData.properties.action_link, plan);
      console.log(`New user created and email sent: ${email} on ${plan} ${billing}`);
    }
  }

  // ── Subscription cancelled ─────────────────────────────────────────────────
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