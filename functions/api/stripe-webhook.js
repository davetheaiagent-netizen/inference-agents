/**
 * Cloudflare Pages Function — POST /api/stripe-webhook
 *
 * Handles Stripe webhook events:
 *   checkout.session.completed      — new customer onboarded
 *   customer.subscription.deleted   — subscription cancelled → pause agent
 *   customer.subscription.updated   — plan upgrade/downgrade
 *   invoice.payment_failed          — payment failed → warn customer
 *
 * Environment variables required:
 *   STRIPE_WEBHOOK_SECRET  — from Stripe Dashboard → Webhooks → signing secret
 *   SUPABASE_URL           — https://xyz.supabase.co
 *   SUPABASE_SERVICE_KEY   — service role key
 *   RESEND_API_KEY         — for emails
 */

const PLAN_MAP = {
  9900:  'starter',   // £99
  19900: 'growth',    // £199
  39900: 'fullstack', // £399
};

// Map Stripe price IDs to plans (set these in Stripe dashboard)
const PRICE_ID_MAP = {
  // Fill in your actual Stripe price IDs here once known
  // 'price_xxx': 'starter',
  // 'price_yyy': 'growth',
  // 'price_zzz': 'fullstack',
};

const PLAN_LABELS = {
  starter:   { name: 'Starter Plan',   agents: '1 AI agent',   price: '£99/month' },
  growth:    { name: 'Growth Package', agents: '3 AI agents',  price: '£199/month' },
  fullstack: { name: 'Full Stack',     agents: 'All agents',   price: '£399/month' },
};

export async function onRequestPost({ request, env }) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (env.STRIPE_WEBHOOK_SECRET) {
    const valid = await verifyStripeSignature(body, signature, env.STRIPE_WEBHOOK_SECRET);
    if (!valid) {
      return new Response('Invalid signature', { status: 401 });
    }
  }

  let event;
  try {
    event = JSON.parse(body);
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object, env);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object, env);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object, env);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object, env);
        break;
      default:
        // Silently acknowledge all other events
        break;
    }
  } catch (err) {
    console.error(`Stripe webhook error [${event.type}]:`, err.message);
    // Always 200 to Stripe — log but don't cause retries
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}

// ── Event handlers ────────────────────────────────────────────────────────────

async function handleCheckoutCompleted(session, env) {
  const email = session.customer_details?.email || session.customer_email;
  const name = session.customer_details?.name || '';
  const amountTotal = session.amount_total;
  const stripeCustomerId = session.customer;
  const stripeSubId = session.subscription;

  if (!email) {
    console.error('No email in Stripe session:', session.id);
    return;
  }

  const plan = PLAN_MAP[amountTotal] || 'starter';
  const planInfo = PLAN_LABELS[plan];

  const customerRes = await fetch(`${env.SUPABASE_URL}/rest/v1/customers`, {
    method: 'POST',
    headers: {
      'apikey': env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({
      email,
      name,
      business_name: name,
      plan,
      status: 'pending',
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubId,
    }),
  });

  if (!customerRes.ok) {
    const err = await customerRes.text();
    if (err.includes('duplicate') || customerRes.status === 409) {
      await handleExistingCustomer(email, env, planInfo);
      return;
    }
    throw new Error(`Supabase create failed: ${err}`);
  }

  const [customer] = await customerRes.json();
  const portalToken = customer.portal_token;

  await sendWelcomeEmail(email, name, plan, planInfo, portalToken, env);
  await sendInternalAlert(email, name, plan, planInfo, env);
  console.log(`✅ New customer onboarded: ${email} — ${plan}`);
}

async function handleSubscriptionDeleted(subscription, env) {
  const stripeCustomerId = subscription.customer;
  if (!stripeCustomerId) return;

  // Look up customer in Supabase by Stripe customer ID
  const custRes = await fetch(
    `${env.SUPABASE_URL}/rest/v1/customers?stripe_customer_id=eq.${stripeCustomerId}&select=id,email,name,business_name,plan&limit=1`,
    {
      headers: {
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      },
    }
  );

  const customers = custRes.ok ? await custRes.json() : [];
  if (!customers.length) {
    console.warn('Subscription deleted for unknown Stripe customer:', stripeCustomerId);
    return;
  }

  const customer = customers[0];

  // Pause the customer and their agents in Supabase
  await fetch(`${env.SUPABASE_URL}/rest/v1/customers?id=eq.${customer.id}`, {
    method: 'PATCH',
    headers: {
      'apikey': env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ status: 'churned' }),
  });

  await fetch(`${env.SUPABASE_URL}/rest/v1/agent_configs?customer_id=eq.${customer.id}`, {
    method: 'PATCH',
    headers: {
      'apikey': env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ is_active: false }),
  });

  // Email customer
  await sendCancellationEmail(customer.email, customer.name, customer.business_name, env);

  // Alert Dave
  if (env.RESEND_API_KEY) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Inference Agents System <hello@inference-agents.com>',
        to: ['hello@inference-agents.com'],
        subject: `❌ Cancellation: ${customer.business_name || customer.email} — ${PLAN_LABELS[customer.plan]?.name || customer.plan}`,
        html: `<p>Subscription cancelled:</p><ul><li><strong>Customer:</strong> ${customer.name || '—'}</li><li><strong>Email:</strong> ${customer.email}</li><li><strong>Business:</strong> ${customer.business_name || '—'}</li><li><strong>Plan:</strong> ${PLAN_LABELS[customer.plan]?.name || customer.plan}</li></ul><p>Their agent has been paused. Status set to churned.</p>`,
      }),
    });
  }

  console.log(`❌ Subscription cancelled: ${customer.email}`);
}

async function handleSubscriptionUpdated(subscription, env) {
  const stripeCustomerId = subscription.customer;
  if (!stripeCustomerId) return;

  // Determine new plan from price ID
  const priceId = subscription.items?.data?.[0]?.price?.id;
  const newPlan = PRICE_ID_MAP[priceId];

  // If we can't map to a plan, skip (could be a non-plan change)
  if (!newPlan) {
    console.log(`Subscription updated for ${stripeCustomerId} — price ${priceId} not in PRICE_ID_MAP, skipping`);
    return;
  }

  const custRes = await fetch(
    `${env.SUPABASE_URL}/rest/v1/customers?stripe_customer_id=eq.${stripeCustomerId}&select=id,email,name,business_name,plan&limit=1`,
    {
      headers: {
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      },
    }
  );

  const customers = custRes.ok ? await custRes.json() : [];
  if (!customers.length) return;

  const customer = customers[0];
  const oldPlan = customer.plan;

  if (oldPlan === newPlan) return; // No plan change

  // Update Supabase
  await fetch(`${env.SUPABASE_URL}/rest/v1/customers?id=eq.${customer.id}`, {
    method: 'PATCH',
    headers: {
      'apikey': env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ plan: newPlan }),
  });

  const newPlanInfo = PLAN_LABELS[newPlan];
  const oldPlanInfo = PLAN_LABELS[oldPlan] || { name: oldPlan };
  const isUpgrade = ['starter', 'growth', 'fullstack'].indexOf(newPlan) >
                    ['starter', 'growth', 'fullstack'].indexOf(oldPlan);

  // Email customer
  await sendPlanChangeEmail(customer.email, customer.name, customer.business_name, oldPlanInfo, newPlanInfo, isUpgrade, env);

  // Alert Dave
  if (env.RESEND_API_KEY) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Inference Agents System <hello@inference-agents.com>',
        to: ['hello@inference-agents.com'],
        subject: `${isUpgrade ? '⬆️' : '⬇️'} Plan change: ${customer.business_name || customer.email} — ${oldPlanInfo.name} → ${newPlanInfo.name}`,
        html: `<p>Plan changed for ${customer.name || customer.email} (${customer.business_name || '—'}):</p><ul><li><strong>From:</strong> ${oldPlanInfo.name}</li><li><strong>To:</strong> ${newPlanInfo.name}</li></ul><p>Supabase updated. ${isUpgrade ? 'Consider adding extra agents.' : 'Check agent count is within new plan limits.'}</p>`,
      }),
    });
  }

  console.log(`${isUpgrade ? '⬆️' : '⬇️'} Plan changed: ${customer.email} ${oldPlan} → ${newPlan}`);
}

async function handlePaymentFailed(invoice, env) {
  const stripeCustomerId = invoice.customer;
  const attemptCount = invoice.attempt_count || 1;
  if (!stripeCustomerId) return;

  const custRes = await fetch(
    `${env.SUPABASE_URL}/rest/v1/customers?stripe_customer_id=eq.${stripeCustomerId}&select=id,email,name,business_name,plan,portal_token&limit=1`,
    {
      headers: {
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      },
    }
  );

  const customers = custRes.ok ? await custRes.json() : [];
  if (!customers.length) return;

  const customer = customers[0];
  await sendPaymentFailedEmail(customer, attemptCount, env);

  if (env.RESEND_API_KEY) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Inference Agents System <hello@inference-agents.com>',
        to: ['hello@inference-agents.com'],
        subject: `⚠️ Payment failed (attempt ${attemptCount}): ${customer.business_name || customer.email}`,
        html: `<p>Payment failed for ${customer.name || customer.email} (${customer.business_name || '—'}). Attempt ${attemptCount}. Stripe will retry automatically. Customer has been notified.</p>`,
      }),
    });
  }

  console.log(`⚠️ Payment failed (attempt ${attemptCount}): ${customer.email}`);
}

async function handleExistingCustomer(email, env, planInfo) {
  console.log(`Existing customer re-subscribed: ${email}`);
  // Re-activate their account
  await fetch(`${env.SUPABASE_URL}/rest/v1/customers?email=eq.${encodeURIComponent(email)}`, {
    method: 'PATCH',
    headers: {
      'apikey': env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ status: 'pending' }),
  });
}

// ── Emails ────────────────────────────────────────────────────────────────────

async function sendWelcomeEmail(email, name, plan, planInfo, portalToken, env) {
  const firstName = name?.split(' ')[0] || 'there';
  const onboardingUrl = `https://inference-agents.com/onboarding.html?plan=${plan}&token=${portalToken}`;
  const portalUrl = `https://inference-agents.com/portal.html?token=${portalToken}`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#05050f;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#05050f;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td align="center" style="padding-bottom:32px;">
    <span style="font-size:22px;font-weight:800;color:#818cf8;letter-spacing:-0.5px;">Inference Agents</span>
  </td></tr>
  <tr><td style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:20px;overflow:hidden;">
    <tr><td height="3" style="background:linear-gradient(90deg,#6366f1,#10b981);font-size:0;line-height:0;">&nbsp;</td></tr>
    <tr><td style="padding:40px 40px 32px;">
      <p style="margin:0 0 8px;font-size:26px;font-weight:800;color:#f1f5f9;">Welcome, ${firstName}! 🎉</p>
      <p style="margin:0 0 28px;font-size:16px;color:#94a3b8;line-height:1.6;">Your <strong style="color:#818cf8;">${planInfo.name}</strong> is confirmed. Here's exactly what happens over the next 7 days.</p>
      <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.25);border-radius:12px;">
        <tr><td style="padding:16px 24px;">
          <span style="font-size:13px;font-weight:700;color:#818cf8;text-transform:uppercase;letter-spacing:1px;">${planInfo.name}</span>
          <span style="margin-left:16px;font-size:22px;font-weight:800;color:#10b981;">${planInfo.price}</span>
          <span style="margin-left:8px;font-size:13px;color:#94a3b8;">· ${planInfo.agents}</span>
        </td></tr>
      </table>
      <p style="margin:0 0 16px;font-size:13px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">What happens next</p>
      ${[
        ['Today', 'Complete your setup form (10 min)', '#6366f1'],
        ['Day 1–2', 'We configure your AI agent from your answers', '#6366f1'],
        ['Day 3', 'You get a preview link to test your agent', '#10b981'],
        ['Day 5', 'Any tweaks you request are made', '#10b981'],
        ['Day 7', 'Your agent goes live on your chosen channels', '#10b981'],
      ].map(([day, text, color]) => `
      <table cellpadding="0" cellspacing="0" style="margin-bottom:10px;width:100%;"><tr>
        <td width="80" valign="top" style="padding-top:2px;"><span style="font-size:11px;font-weight:800;color:${color};text-transform:uppercase;letter-spacing:0.5px;">${day}</span></td>
        <td style="font-size:14px;color:#94a3b8;line-height:1.6;">${text}</td>
      </tr></table>`).join('')}
      <table cellpadding="0" cellspacing="0" style="margin-top:32px;width:100%;"><tr><td align="center">
        <a href="${onboardingUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:16px 40px;border-radius:12px;">Complete Your Setup →</a>
      </td></tr></table>
      <p style="margin:24px 0 0;font-size:13px;color:#64748b;text-align:center;line-height:1.6;">
        Questions? Reply to this email or WhatsApp us — we respond fast.<br>
        <a href="mailto:hello@inference-agents.com" style="color:#818cf8;">hello@inference-agents.com</a>
      </p>
    </td></tr>
  </td></tr>
  <tr><td style="padding:24px 0;text-align:center;">
    <p style="margin:0;font-size:12px;color:#334155;">© 2026 Inference Agents · UK Business<br>
    <a href="${portalUrl}" style="color:#64748b;">View your dashboard</a></p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Inference Agents <hello@inference-agents.com>',
      to: [email],
      subject: `Welcome to Inference Agents — complete your setup to go live in 7 days`,
      html,
    }),
  });
}

async function sendCancellationEmail(email, name, businessName, env) {
  if (!env.RESEND_API_KEY) return;
  const firstName = name?.split(' ')[0] || 'there';

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:40px 20px;background:#05050f;font-family:Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
  <tr><td align="center" style="padding-bottom:28px;">
    <span style="font-size:20px;font-weight:800;color:#818cf8;">Inference Agents</span>
  </td></tr>
  <tr><td style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:36px;">
    <p style="margin:0 0 12px;font-size:22px;font-weight:800;color:#f1f5f9;">Your subscription has ended</p>
    <p style="margin:0 0 20px;font-size:15px;color:#94a3b8;line-height:1.6;">
      Hi ${firstName}, your Inference Agents subscription for <strong style="color:#818cf8;">${businessName || 'your business'}</strong> has been cancelled and your AI agent has been paused.
    </p>
    <p style="margin:0 0 20px;font-size:15px;color:#94a3b8;line-height:1.6;">
      Your data and configuration are kept for 90 days — you can reactivate any time and your agent will be restored.
    </p>
    <p style="margin:0;font-size:14px;color:#94a3b8;line-height:1.6;">
      If this was a mistake or you'd like to discuss, reply to this email.<br>
      <a href="mailto:hello@inference-agents.com" style="color:#818cf8;">hello@inference-agents.com</a>
    </p>
  </td></tr>
  <tr><td style="padding:20px 0;text-align:center;">
    <p style="margin:0;font-size:12px;color:#334155;">© 2026 Inference Agents</p>
  </td></tr>
</table>
</body>
</html>`;

  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Inference Agents <hello@inference-agents.com>',
      to: [email],
      subject: `Your Inference Agents subscription has ended`,
      html,
    }),
  });
}

async function sendPlanChangeEmail(email, name, businessName, oldPlanInfo, newPlanInfo, isUpgrade, env) {
  if (!env.RESEND_API_KEY) return;
  const firstName = name?.split(' ')[0] || 'there';
  const emoji = isUpgrade ? '⬆️' : '⬇️';
  const verb = isUpgrade ? 'upgraded' : 'updated';

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:40px 20px;background:#05050f;font-family:Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
  <tr><td align="center" style="padding-bottom:28px;">
    <span style="font-size:20px;font-weight:800;color:#818cf8;">Inference Agents</span>
  </td></tr>
  <tr><td style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:36px;">
    <p style="margin:0 0 12px;font-size:22px;font-weight:800;color:#f1f5f9;">${emoji} Plan ${verb}, ${firstName}</p>
    <p style="margin:0 0 20px;font-size:15px;color:#94a3b8;line-height:1.6;">
      Your plan for <strong style="color:#818cf8;">${businessName || 'your business'}</strong> has been ${verb}:
    </p>
    <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;width:100%;background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:12px;">
      <tr><td style="padding:16px 24px;font-size:14px;color:#94a3b8;">
        <span style="text-decoration:line-through;opacity:0.6;">${oldPlanInfo.name} — ${oldPlanInfo.price}</span><br>
        <strong style="color:#10b981;font-size:18px;">${newPlanInfo.name} — ${newPlanInfo.price}</strong>
      </td></tr>
    </table>
    <p style="margin:0;font-size:14px;color:#94a3b8;line-height:1.6;">
      ${isUpgrade ? 'Your additional agents will be configured within 24 hours.' : 'Your agent configuration has been updated to match your new plan.'}<br><br>
      Questions? <a href="mailto:hello@inference-agents.com" style="color:#818cf8;">hello@inference-agents.com</a>
    </p>
  </td></tr>
  <tr><td style="padding:20px 0;text-align:center;">
    <p style="margin:0;font-size:12px;color:#334155;">© 2026 Inference Agents</p>
  </td></tr>
</table>
</body>
</html>`;

  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Inference Agents <hello@inference-agents.com>',
      to: [email],
      subject: `${emoji} Your plan has been ${verb} — ${newPlanInfo.name}`,
      html,
    }),
  });
}

async function sendPaymentFailedEmail(customer, attemptCount, env) {
  if (!env.RESEND_API_KEY) return;
  const firstName = customer.name?.split(' ')[0] || 'there';
  const isLastAttempt = attemptCount >= 3;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:40px 20px;background:#05050f;font-family:Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
  <tr><td align="center" style="padding-bottom:28px;">
    <span style="font-size:20px;font-weight:800;color:#818cf8;">Inference Agents</span>
  </td></tr>
  <tr><td style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:36px;">
    <p style="margin:0 0 12px;font-size:22px;font-weight:800;color:#f1f5f9;">⚠️ Payment issue, ${firstName}</p>
    <p style="margin:0 0 20px;font-size:15px;color:#94a3b8;line-height:1.6;">
      We weren't able to collect your payment for Inference Agents${customer.business_name ? ` (${customer.business_name})` : ''}.
      ${isLastAttempt
        ? 'This was our final retry — please update your payment method to keep your agent running.'
        : 'We\'ll retry automatically — please check your payment details are up to date.'}
    </p>
    <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;width:100%;"><tr><td align="center">
      <a href="https://billing.stripe.com" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:12px;">Update Payment Method →</a>
    </td></tr></table>
    <p style="margin:0;font-size:13px;color:#64748b;text-align:center;">
      Need help? <a href="mailto:hello@inference-agents.com" style="color:#818cf8;">hello@inference-agents.com</a>
    </p>
  </td></tr>
  <tr><td style="padding:20px 0;text-align:center;">
    <p style="margin:0;font-size:12px;color:#334155;">© 2026 Inference Agents</p>
  </td></tr>
</table>
</body>
</html>`;

  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Inference Agents <hello@inference-agents.com>',
      to: [customer.email],
      subject: `⚠️ Action needed: payment failed for your Inference Agents subscription`,
      html,
    }),
  });
}

async function sendInternalAlert(email, name, plan, planInfo, env) {
  if (!env.RESEND_API_KEY) return;
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Inference Agents System <hello@inference-agents.com>',
      to: ['hello@inference-agents.com'],
      subject: `🆕 New customer: ${name || email} — ${planInfo.name}`,
      html: `<p>New customer signed up:</p><ul><li><strong>Name:</strong> ${name || '—'}</li><li><strong>Email:</strong> ${email}</li><li><strong>Plan:</strong> ${planInfo.name} (${planInfo.price})</li></ul><p>Welcome email sent. Awaiting intake form.</p>`,
    }),
  });
}

// ── Stripe signature verification ────────────────────────────────────────────

async function verifyStripeSignature(payload, sigHeader, secret) {
  try {
    const parts = sigHeader.split(',').reduce((acc, part) => {
      const [k, v] = part.split('=');
      acc[k] = v;
      return acc;
    }, {});

    const timestamp = parts.t;
    const signature = parts.v1;
    if (!timestamp || !signature) return false;

    if (Math.abs(Date.now() / 1000 - parseInt(timestamp)) > 300) return false;

    const signedPayload = `${timestamp}.${payload}`;
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const computed = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
    const computedHex = Array.from(new Uint8Array(computed)).map(b => b.toString(16).padStart(2, '0')).join('');
    return computedHex === signature;
  } catch {
    return false;
  }
}
