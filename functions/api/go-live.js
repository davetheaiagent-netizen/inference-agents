const RESEND_API_URL = 'https://api.resend.com/emails';
const INTERNAL_EMAIL = 'hello@inference-agents.com';

const PLAN_LABELS = {
  starter: 'Starter',
  growth: 'Growth',
  fullstack: 'Full Stack',
};

function getPlanLabel(plan) {
  return PLAN_LABELS[plan?.toLowerCase()] ?? plan ?? 'Unknown';
}

function getFirstName(name) {
  if (!name) return 'there';
  return name.split(' ')[0];
}

function buildGoLiveEmail({ name, email, businessName, plan, portalToken }) {
  const firstName = getFirstName(name);
  const planLabel = getPlanLabel(plan);
  const dashboardUrl = `https://inference-agents.com/portal.html?token=${portalToken}`;

  const capabilityCards = [
    {
      icon: '🕐',
      title: '24/7 Availability',
      desc: 'Your agent never sleeps — handling enquiries around the clock.',
    },
    {
      icon: '⚡',
      title: 'Instant Responses',
      desc: 'Visitors get answers in seconds, not hours.',
    },
    {
      icon: '🎯',
      title: 'Smart Escalation',
      desc: 'Complex queries get routed to your team automatically.',
    },
    {
      icon: '📊',
      title: 'Weekly Reports',
      desc: 'Insights on conversations, leads and performance delivered weekly.',
    },
  ];

  const cardHtml = capabilityCards
    .map(
      (c) => `
      <td style="width:50%;padding:8px;vertical-align:top;">
        <div style="background:#0d0d1f;border:1px solid #1e1e3f;border-radius:12px;padding:20px;">
          <div style="font-size:28px;margin-bottom:10px;">${c.icon}</div>
          <div style="color:#e2e8f0;font-size:15px;font-weight:600;margin-bottom:6px;">${c.title}</div>
          <div style="color:#94a3b8;font-size:13px;line-height:1.5;">${c.desc}</div>
        </div>
      </td>`,
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your AI agent is live</title>
</head>
<body style="margin:0;padding:0;background:#05050f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#05050f;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom:32px;text-align:center;">
              <div style="display:inline-block;">
                <span style="font-size:22px;font-weight:700;color:#e2e8f0;letter-spacing:-0.5px;">inference</span><span style="font-size:22px;font-weight:700;color:#6366f1;">agents</span>
              </div>
            </td>
          </tr>

          <!-- Hero card -->
          <tr>
            <td style="background:linear-gradient(135deg,#0d0d1f 0%,#111128 100%);border:1px solid #1e1e3f;border-radius:16px;padding:40px 36px;text-align:center;">

              <div style="font-size:48px;margin-bottom:16px;">🚀</div>

              <h1 style="margin:0 0 12px;font-size:28px;font-weight:700;color:#e2e8f0;line-height:1.2;">
                It's live, ${firstName}!
              </h1>

              <p style="margin:0 0 8px;font-size:16px;color:#94a3b8;line-height:1.6;">
                Your AI agent is now live and handling enquiries for
              </p>
              <p style="margin:0 0 28px;font-size:20px;font-weight:600;color:#10b981;">
                ${businessName}
              </p>

              <!-- Plan badge -->
              <div style="display:inline-block;background:#6366f120;border:1px solid #6366f140;border-radius:20px;padding:6px 16px;margin-bottom:32px;">
                <span style="color:#818cf8;font-size:13px;font-weight:500;">Plan: ${planLabel}</span>
              </div>

              <!-- Capability cards 2x2 -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>${cardHtml.split('</td>').slice(0, 2).join('</td>')}</td></tr>
                <tr>${cardHtml.split('</td>').slice(2, 4).join('</td>')}</td></tr>
              </table>

              <!-- CTA button -->
              <a href="${dashboardUrl}"
                 style="display:inline-block;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 32px;border-radius:10px;letter-spacing:0.2px;">
                View Your Dashboard →
              </a>

              <p style="margin:24px 0 0;font-size:13px;color:#475569;">
                Or copy this link: <a href="${dashboardUrl}" style="color:#6366f1;text-decoration:none;word-break:break-all;">${dashboardUrl}</a>
              </p>

            </td>
          </tr>

          <!-- What's next -->
          <tr>
            <td style="padding:32px 0 0;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d1f;border:1px solid #1e1e3f;border-radius:16px;padding:28px 32px;">
                <tr>
                  <td>
                    <h2 style="margin:0 0 16px;font-size:18px;font-weight:600;color:#e2e8f0;">What happens next?</h2>
                    <ul style="margin:0;padding-left:20px;color:#94a3b8;font-size:14px;line-height:2;">
                      <li>Your agent is already embedded and responding to visitors</li>
                      <li>Check your dashboard to see live conversations</li>
                      <li>Your first weekly report will arrive in 7 days</li>
                      <li>Reply to this email any time — we're here to help</li>
                    </ul>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:32px 0 0;text-align:center;">
              <p style="margin:0 0 6px;font-size:13px;color:#334155;">
                © 2026 Inference Agents · <a href="https://inference-agents.com" style="color:#6366f1;text-decoration:none;">inference-agents.com</a>
              </p>
              <p style="margin:0;font-size:12px;color:#1e293b;">
                You're receiving this because you signed up for an Inference Agents plan.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return {
    from: 'Inference Agents <hello@inference-agents.com>',
    to: email,
    subject: `🚀 Your AI agent is live — ${businessName}`,
    html,
  };
}

function buildInternalAlertEmail({ name, email, businessName, plan, portalToken }) {
  const planLabel = getPlanLabel(plan);
  const dashboardUrl = `https://inference-agents.com/portal.html?token=${portalToken}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Agent live: ${businessName}</title>
</head>
<body style="margin:0;padding:0;background:#05050f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#05050f;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#0d0d1f;border:1px solid #1e1e3f;border-radius:16px;padding:36px;">
          <tr>
            <td>
              <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#e2e8f0;">🚀 New agent is live</h1>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:8px 0;color:#94a3b8;font-size:14px;width:140px;">Customer name</td>
                  <td style="padding:8px 0;color:#e2e8f0;font-size:14px;font-weight:500;">${name}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#94a3b8;font-size:14px;">Email</td>
                  <td style="padding:8px 0;font-size:14px;"><a href="mailto:${email}" style="color:#6366f1;text-decoration:none;">${email}</a></td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#94a3b8;font-size:14px;">Business</td>
                  <td style="padding:8px 0;color:#10b981;font-size:14px;font-weight:600;">${businessName}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#94a3b8;font-size:14px;">Plan</td>
                  <td style="padding:8px 0;color:#e2e8f0;font-size:14px;">${planLabel}</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;color:#94a3b8;font-size:14px;">Portal</td>
                  <td style="padding:8px 0;font-size:14px;"><a href="${dashboardUrl}" style="color:#6366f1;text-decoration:none;word-break:break-all;">${dashboardUrl}</a></td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return {
    from: 'Inference Agents Alerts <hello@inference-agents.com>',
    to: INTERNAL_EMAIL,
    subject: `🚀 Agent live: ${businessName} (${planLabel})`,
    html,
  };
}

async function sendEmail(apiKey, payload) {
  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend API error ${response.status}: ${errorText}`);
  }

  return response.json();
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-supabase-webhook-secret',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function onRequestPost({ request, env }) {
  // Optional webhook secret verification
  const webhookSecret = env.SUPABASE_WEBHOOK_SECRET;
  if (webhookSecret) {
    const providedSecret = request.headers.get('x-supabase-webhook-secret');
    if (!providedSecret || providedSecret !== webhookSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // Parse body
  let payload;
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { type, table, record, old_record } = payload;

  // Only handle UPDATE events on the customers table
  if (type !== 'UPDATE' || table !== 'customers') {
    return new Response(JSON.stringify({ skipped: true, reason: 'Not a customers UPDATE event' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Only act when transitioning to active
  if (old_record?.status === 'active' || record?.status !== 'active') {
    return new Response(
      JSON.stringify({ skipped: true, reason: 'Status transition does not match go-live condition' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  const { id, name, email, business_name: businessName, plan, portal_token: portalToken } = record;

  // Validate required fields
  if (!email) {
    return new Response(JSON.stringify({ error: 'Missing email in record' }), {
      status: 422,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const resendApiKey = env.RESEND_API_KEY;
  if (!resendApiKey) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const customerData = {
    id,
    name: name ?? email,
    email,
    businessName: businessName ?? 'your business',
    plan: plan ?? 'starter',
    portalToken: portalToken ?? '',
  };

  const results = { customer: null, internal: null, errors: [] };

  // Send go-live email to customer
  try {
    results.customer = await sendEmail(resendApiKey, buildGoLiveEmail(customerData));
  } catch (err) {
    results.errors.push({ target: 'customer', message: err.message });
  }

  // Send internal alert
  try {
    results.internal = await sendEmail(resendApiKey, buildInternalAlertEmail(customerData));
  } catch (err) {
    results.errors.push({ target: 'internal', message: err.message });
  }

  const status = results.errors.length === 2 ? 500 : 200;

  return new Response(
    JSON.stringify({
      success: results.errors.length < 2,
      customerId: id,
      businessName: customerData.businessName,
      emails: {
        customer: results.customer ? 'sent' : 'failed',
        internal: results.internal ? 'sent' : 'failed',
      },
      errors: results.errors.length > 0 ? results.errors : undefined,
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    },
  );
}
