export async function POST(request) {
  try {
    const { priceId, planLabel, amount, currency, payCurrency } = await request.json();

    const orderId = `NP-${priceId}-${Date.now()}`;

    // Step 1: Create invoice to get invoice_id
    const invoiceRes = await fetch("https://api.nowpayments.io/v1/invoice", {
      method: "POST",
      headers: {
        "x-api-key":    process.env.NOWPAYMENTS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        price_amount:      amount,
        price_currency:    currency.toLowerCase(),
        order_id:          orderId,
        order_description: `Clarinvest ${planLabel} subscription`,
        ipn_callback_url:  `${process.env.NEXT_PUBLIC_SITE_URL}/api/nowpayments-webhook`,
        success_url:       `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?np_success=1`,
        cancel_url:        `${process.env.NEXT_PUBLIC_SITE_URL}/#pricing`,
        is_fixed_rate:     true,
        is_fee_paid_by_user: false,
      }),
    });

    const invoiceData = await invoiceRes.json();

    if (!invoiceRes.ok) {
      return Response.json({ error: invoiceData.message || "Failed to create invoice" }, { status: 500 });
    }

    // Step 2: Create payment from invoice to get wallet address + exact amount
    const paymentRes = await fetch("https://api.nowpayments.io/v1/invoice-payment", {
      method: "POST",
      headers: {
        "x-api-key":    process.env.NOWPAYMENTS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        iid:          invoiceData.id,
        pay_currency: payCurrency,
      }),
    });

    const paymentData = await paymentRes.json();

    if (!paymentRes.ok) {
      return Response.json({ error: paymentData.message || "Failed to create payment" }, { status: 500 });
    }

    return Response.json({
      pay_address: paymentData.pay_address,
      pay_amount:  paymentData.pay_amount,
      pay_currency: paymentData.pay_currency,
      payment_id:  paymentData.payment_id,
      order_id:    orderId,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}