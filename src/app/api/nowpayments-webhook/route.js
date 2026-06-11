import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PLAN_MAP = {
  "essential_monthly": { plan: "essential", interval: "monthly" },
  "essential_yearly":  { plan: "essential", interval: "yearly"  },
  "pro_monthly":       { plan: "pro",       interval: "monthly" },
  "pro_yearly":        { plan: "pro",       interval: "yearly"  },
  "ultimate_monthly":  { plan: "ultimate",  interval: "monthly" },
  "ultimate_yearly":   { plan: "ultimate",  interval: "yearly"  },
};

export async function POST(request) {
  try {
    const rawBody = await request.text();
    const payload = JSON.parse(rawBody);

    // Verify NOWPayments IPN signature
    const signature = request.headers.get("x-nowpayments-sig");
    if (signature && process.env.NOWPAYMENTS_IPN_SECRET) {
      const sorted = JSON.stringify(
        Object.keys(payload).sort().reduce((acc, key) => {
          acc[key] = payload[key];
          return acc;
        }, {})
      );
      const expected = crypto
        .createHmac("sha512", process.env.NOWPAYMENTS_IPN_SECRET)
        .update(sorted)
        .digest("hex");

      if (signature !== expected) {
        return new Response("Invalid signature", { status: 401 });
      }
    }

    const { payment_status, order_id, tag, customer_email } = payload;

    // Only act on confirmed payments
    if (payment_status !== "finished" && payment_status !== "confirmed") {
      return new Response("OK", { status: 200 });
    }

    const planInfo = PLAN_MAP[tag];
    if (!planInfo || !customer_email) {
      console.error("NOWPayments webhook: unknown tag or missing email", { tag, customer_email });
      return new Response("OK", { status: 200 });
    }

    // Look up user by email
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
    const user = users?.find(u => u.email === customer_email);

    if (!user) {
      console.error("NOWPayments webhook: user not found", customer_email);
      return new Response("OK", { status: 200 });
    }

    // Update plan
    await supabaseAdmin
      .from("user_profiles")
      .upsert({
        id:                   user.id,
        plan:                 planInfo.plan,
        plan_interval:        planInfo.interval,
        plan_source:          "nowpayments",
        nowpayments_order_id: order_id,
        updated_at:           new Date().toISOString(),
      }, { onConflict: "id" });

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("NOWPayments webhook error:", error);
    return new Response("OK", { status: 200 });
  }
}