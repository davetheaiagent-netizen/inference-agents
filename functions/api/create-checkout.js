/**
 * POST /api/create-checkout
 * Creates a Stripe Checkout Session and returns the redirect URL.
 */

const PRICE_IDS = {
  starter:   'price_1TFnrnAjffZi6uNdqBtsP38E',  // £99/month
  growth:    'price_1TFnroAjffZi6uNdIPcOVtJ9',  // £199/month
  fullstack: 'price_1TFnroAjffZi6uNd1uR8zsxB',  // £399/month
};

export async function onRequestPost({ request, env }) {
  const { plan } = await request.json();
  const priceId = PRICE_IDS[plan];

  if (!priceId) {
    return new Response(JSON.stringify({ error: 'Invalid plan' }), { status: 400 });
  }

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      'mode': 'subscription',
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      'success_url': 'https://inference-agents.com/onboarding.html?session_id={CHECKOUT_SESSION_ID}',
      'cancel_url': 'https://inference-agents.com/pricing.html',
      'allow_promotion_codes': 'true',
      'billing_address_collection': 'auto',
    }),
  });

  const session = await response.json();

  if (!response.ok) {
    return new Response(JSON.stringify({ error: session.error?.message || 'Stripe error' }), { status: 500 });
  }

  return new Response(JSON.stringify({ url: session.url }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
