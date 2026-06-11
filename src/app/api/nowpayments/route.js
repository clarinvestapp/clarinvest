export async function POST(request) {
  try {
    const { priceId, email, planLabel, amount, currency, payCurrency } = await request.json();

    const orderId = `NP-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    const response = await fetch("https://api.nowpayments.io/v1/invoice", {
      method: "POST",
      headers: {
        "x-api-key":   process.env.NOWPAYMENTS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        price_amount:    amount,
        price_currency:  currency.toLowerCase(),   // "gbp", "usd", "eur"
        pay_currency:    payCurrency || "usdtavaxc", // passed from frontend, default USDT/AVAX
        order_id:        orderId,
        order_description: `Clarinvest ${planLabel} subscription`,
        ipn_callback_url:  `${process.env.NEXT_PUBLIC_SITE_URL}/api/nowpayments-webhook`,
        success_url:       `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?np_success=1`,
        cancel_url:        `${process.env.NEXT_PUBLIC_SITE_URL}/#pricing`,
        customer_email:    email,
        is_fixed_rate:     true,
        is_fee_paid_by_user: false,
        // Store priceId so the webhook knows which plan to activate
        tag:               priceId,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return Response.json({ error: data.message || "NOWPayments order failed" }, { status: 500 });
    }

    return Response.json({ url: data.invoice_url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}