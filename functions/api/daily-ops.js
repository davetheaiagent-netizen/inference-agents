/**
 * Cloudflare Pages Function — POST /api/daily-ops
 *
 * Daily operations cron worker. Triggered by external cron (cron-job.org) every day at 8am UTC.
 * POST with header: x-cron-secret
 *
 * Jobs:
 *   1. Day-3 preview nudge  — customers in 'onboarding' for 3+ days → alert Dave to send preview
 *   2. Churn detection      — active customers with 0 conversations in 14 days → alert Dave
 *   3. 30-day NPS email     — customers who went live 30 days ago → send NPS survey
 *   4. Upgrade nudge        — starter customers with 150+ convos this month → send upgrade email
 *   5. Agent health monitor — customers with 5+ error convos in 24h → alert Dave
 *
 * Environment variables required:
 *   SUPABASE_URL          — https://xyz.supabase.co
 *   SUPABASE_SERVICE_KEY  — service role key
 *   RESEND_API_KEY        — for emails
 *   CRON_SECRET           — shared secret for authentication
 */

export async function onRequestPost({ request, env }) {
  const cronSecret = request.headers.get('x-cron-secret');
  if (!cronSecret || cronSecret !== env.CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorised' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    return new Response(JSON.stringify({ error: 'Supabase not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const results = {
    day3Nudges: 0,
    churnAlerts: 0,
    npsEmails: 0,
    upgradeNudges: 0,
    healthAlerts: 0,
    errors: [],
  };

  await Promise.allSettled([
    runDay3Nudge(env, results),
    runChurnDetection(env, results),
    runNPSEmails(env, results),
    runUpgradeNudges(env, results),
    runHealthMonitor(env, results),
  ]);

  console.log('✅ Daily ops complete:', JSON.stringify(results));
  return new Response(JSON.stringify({ success: true, ...results }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function onRequestGet() {
  return new Response(
    JSON.stringify({ status: 'Daily ops endpoint ready', message: 'POST with x-cron-secret header to trigger' }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

// ── Job 1: Day-3 preview nudge ────────────────────────────────────────────────

async function runDay3Nudge(env, results) {
  try {
    // Find customers in 'onboarding' status for 3-4 days (send once on day 3)
    const threeDaysAgo = daysAgo(3);
    const fourDaysAgo = daysAgo(4);

    const res = await supabaseFetch(env,
      `customers?status=eq.onboarding&updated_at=lte.${encodeURIComponent(threeDaysAgo)}&updated_at=gte.${encodeURIComponent(fourDaysAgo)}&select=id,name,email,business_name,plan,portal_token`
    );
    const customers = res.ok ? await res.json() : [];

    for (const customer of customers) {
      await sendDay3NudgeToDave(customer, env);
      results.day3Nudges++;
    }
  } catch (err) {
    results.errors.push({ job: 'day3Nudge', error: err.message });
  }
}

async function sendDay3NudgeToDave(customer, env) {
  if (!env.RESEND_API_KEY) return;
  const portalUrl = customer.portal_token
    ? `https://inference-agents.com/portal.html?token=${customer.portal_token}`
    : 'https://inference-agents.com/portal.html';

  return resendEmail(env, {
    to: ['hello@inference-agents.com'],
    subject: `📋 Day 3 reminder: send preview to ${customer.business_name || customer.email}`,
    html: `
<p><strong>Day 3 onboarding reminder</strong></p>
<p>${customer.name || customer.email} (${customer.business_name || '—'}) signed up 3 days ago and is waiting for their preview link.</p>
<ul>
  <li><strong>Plan:</strong> ${customer.plan}</li>
  <li><strong>Email:</strong> ${customer.email}</li>
  <li><strong>Portal:</strong> <a href="${portalUrl}">${portalUrl}</a></li>
</ul>
<p>Review their agent config in Supabase and send them a preview link or test session today.</p>
    `,
  });
}

// ── Job 2: Churn detection ────────────────────────────────────────────────────

async function runChurnDetection(env, results) {
  try {
    // Active customers
    const res = await supabaseFetch(env, `customers?status=eq.active&select=id,name,email,business_name,plan`);
    const customers = res.ok ? await res.json() : [];

    const fourteenDaysAgo = daysAgo(14);

    for (const customer of customers) {
      const convoRes = await supabaseFetch(env,
        `conversations?customer_id=eq.${customer.id}&created_at=gte.${encodeURIComponent(fourteenDaysAgo)}&select=id&limit=1`
      );
      const convos = convoRes.ok ? await convoRes.json() : [];

      if (convos.length === 0) {
        await sendChurnAlertToDave(customer, env);
        results.churnAlerts++;
      }
    }
  } catch (err) {
    results.errors.push({ job: 'churnDetection', error: err.message });
  }
}

async function sendChurnAlertToDave(customer, env) {
  if (!env.RESEND_API_KEY) return;
  return resendEmail(env, {
    to: ['hello@inference-agents.com'],
    subject: `⚠️ Churn risk: ${customer.business_name || customer.email} — 0 conversations in 14 days`,
    html: `
<p><strong>Churn risk alert</strong></p>
<p>${customer.name || customer.email} (${customer.business_name || '—'}) has had <strong>no conversations in 14 days</strong>.</p>
<ul>
  <li><strong>Plan:</strong> ${customer.plan}</li>
  <li><strong>Email:</strong> ${customer.email}</li>
</ul>
<p>This customer may not have their agent set up correctly, or may be disengaged. Consider reaching out directly.</p>
    `,
  });
}

// ── Job 3: 30-day NPS email ───────────────────────────────────────────────────

async function runNPSEmails(env, results) {
  try {
    // Customers who became active approximately 30 days ago (29-31 day window)
    const thirtyOneDaysAgo = daysAgo(31);
    const twentyNineDaysAgo = daysAgo(29);

    const res = await supabaseFetch(env,
      `customers?status=eq.active&updated_at=lte.${encodeURIComponent(twentyNineDaysAgo)}&updated_at=gte.${encodeURIComponent(thirtyOneDaysAgo)}&select=id,name,email,business_name,plan,portal_token`
    );
    const customers = res.ok ? await res.json() : [];

    for (const customer of customers) {
      await sendNPSEmail(customer, env);
      results.npsEmails++;
    }
  } catch (err) {
    results.errors.push({ job: 'npsEmails', error: err.message });
  }
}

async function sendNPSEmail(customer, env) {
  if (!env.RESEND_API_KEY) return;
  const firstName = customer.name?.split(' ')[0] || 'there';
  const portalUrl = customer.portal_token
    ? `https://inference-agents.com/portal.html?token=${customer.portal_token}`
    : 'https://inference-agents.com/portal.html';

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:40px 20px;background:#05050f;font-family:Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
  <tr><td align="center" style="padding-bottom:28px;">
    <span style="font-size:20px;font-weight:800;color:#818cf8;">Inference Agents</span>
  </td></tr>
  <tr><td style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:36px;">
    <p style="margin:0 0 12px;font-size:22px;font-weight:800;color:#f1f5f9;">One month in — how's it going? 🎯</p>
    <p style="margin:0 0 24px;font-size:15px;color:#94a3b8;line-height:1.6;">
      Hi ${firstName}, it's been 30 days since your AI agent went live for ${customer.business_name || 'your business'}.
      We'd love to know how it's been going.
    </p>
    <p style="margin:0 0 12px;font-size:15px;font-weight:700;color:#f1f5f9;">How likely are you to recommend Inference Agents to another business owner?</p>
    <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;width:100%;">
      <tr>
        ${[1,2,3,4,5,6,7,8,9,10].map(n => {
          const color = n <= 6 ? '#ef4444' : n <= 8 ? '#f59e0b' : '#10b981';
          return `<td align="center" style="padding:4px 2px;">
            <a href="mailto:hello@inference-agents.com?subject=NPS Score: ${n} - ${customer.business_name || customer.email}" style="display:block;width:32px;height:32px;line-height:32px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:${color};font-size:13px;font-weight:700;text-decoration:none;text-align:center;">${n}</a>
          </td>`;
        }).join('')}
      </tr>
      <tr>
        <td colspan="6" style="font-size:11px;color:#64748b;padding-top:6px;">Not likely</td>
        <td colspan="4" align="right" style="font-size:11px;color:#64748b;padding-top:6px;">Very likely</td>
      </tr>
    </table>
    <p style="margin:0 0 20px;font-size:14px;color:#94a3b8;line-height:1.6;">
      Anything we could improve? Reply to this email — we read every response personally.
    </p>
    <table cellpadding="0" cellspacing="0" style="width:100%;"><tr><td align="center">
      <a href="${portalUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:10px;">View your dashboard →</a>
    </td></tr></table>
  </td></tr>
  <tr><td style="padding:20px 0;text-align:center;">
    <p style="margin:0;font-size:12px;color:#334155;">© 2026 Inference Agents</p>
  </td></tr>
</table>
</body>
</html>`;

  return resendEmail(env, {
    to: [customer.email],
    subject: `One month with your AI agent — quick question, ${firstName}?`,
    html,
  });
}

// ── Job 4: Upgrade nudge ──────────────────────────────────────────────────────

async function runUpgradeNudges(env, results) {
  try {
    // Starter customers only
    const res = await supabaseFetch(env, `customers?plan=eq.starter&status=eq.active&select=id,name,email,business_name,portal_token`);
    const customers = res.ok ? await res.json() : [];

    const monthStart = getMonthStart();

    for (const customer of customers) {
      const convoRes = await supabaseFetch(env,
        `conversations?customer_id=eq.${customer.id}&created_at=gte.${encodeURIComponent(monthStart)}&select=id`
      );
      const convos = convoRes.ok ? await convoRes.json() : [];

      if (convos.length >= 150) {
        await sendUpgradeNudge(customer, convos.length, env);
        results.upgradeNudges++;
      }
    }
  } catch (err) {
    results.errors.push({ job: 'upgradeNudges', error: err.message });
  }
}

async function sendUpgradeNudge(customer, convoCount, env) {
  if (!env.RESEND_API_KEY) return;
  const firstName = customer.name?.split(' ')[0] || 'there';
  const portalUrl = customer.portal_token
    ? `https://inference-agents.com/portal.html?token=${customer.portal_token}`
    : 'https://inference-agents.com/portal.html';

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:40px 20px;background:#05050f;font-family:Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
  <tr><td align="center" style="padding-bottom:28px;">
    <span style="font-size:20px;font-weight:800;color:#818cf8;">Inference Agents</span>
  </td></tr>
  <tr><td style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:36px;">
    <p style="margin:0 0 12px;font-size:22px;font-weight:800;color:#f1f5f9;">Your agent is flying 🚀</p>
    <p style="margin:0 0 20px;font-size:15px;color:#94a3b8;line-height:1.6;">
      Hi ${firstName}, your AI agent has handled <strong style="color:#10b981;">${convoCount} enquiries</strong> this month for ${customer.business_name || 'your business'} — that's a serious workload.
    </p>
    <p style="margin:0 0 20px;font-size:15px;color:#94a3b8;line-height:1.6;">
      The <strong style="color:#818cf8;">Growth Package (£199/month)</strong> gives you 3 AI agents — you could add Invoice Chasing or Appointment Reminders to work alongside your Enquiry Handler.
    </p>
    <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;width:100%;background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:12px;">
      <tr><td style="padding:16px 24px;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#818cf8;text-transform:uppercase;letter-spacing:1px;">Growth Package</p>
        <p style="margin:0 0 4px;font-size:24px;font-weight:800;color:#10b981;">£199<span style="font-size:14px;color:#94a3b8;">/month</span></p>
        <p style="margin:0;font-size:13px;color:#94a3b8;">3 AI agents · Cancel anytime</p>
      </td></tr>
    </table>
    <table cellpadding="0" cellspacing="0" style="width:100%;"><tr><td align="center">
      <a href="https://inference-agents.com/pricing.html" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:10px;">See Growth Package →</a>
    </td></tr></table>
    <p style="margin:20px 0 0;font-size:13px;color:#64748b;text-align:center;">
      Not ready? No pressure — reply to this email with any questions.
    </p>
  </td></tr>
  <tr><td style="padding:20px 0;text-align:center;">
    <p style="margin:0;font-size:12px;color:#334155;">© 2026 Inference Agents</p>
  </td></tr>
</table>
</body>
</html>`;

  return resendEmail(env, {
    to: [customer.email],
    subject: `Your AI agent handled ${convoCount} enquiries this month 🚀`,
    html,
  });
}

// ── Job 5: Agent health monitor ───────────────────────────────────────────────

async function runHealthMonitor(env, results) {
  try {
    const oneDayAgo = daysAgo(1);

    // Find all active customers
    const res = await supabaseFetch(env, `customers?status=eq.active&select=id,name,email,business_name`);
    const customers = res.ok ? await res.json() : [];

    for (const customer of customers) {
      // Look for escalated conversations in the last 24h as a proxy for errors/problems
      const errorRes = await supabaseFetch(env,
        `conversations?customer_id=eq.${customer.id}&escalated=eq.true&created_at=gte.${encodeURIComponent(oneDayAgo)}&select=id`
      );
      const errors = errorRes.ok ? await errorRes.json() : [];

      if (errors.length >= 5) {
        await sendHealthAlertToDave(customer, errors.length, env);
        results.healthAlerts++;
      }
    }
  } catch (err) {
    results.errors.push({ job: 'healthMonitor', error: err.message });
  }
}

async function sendHealthAlertToDave(customer, errorCount, env) {
  if (!env.RESEND_API_KEY) return;
  return resendEmail(env, {
    to: ['hello@inference-agents.com'],
    subject: `🚨 Agent health alert: ${customer.business_name || customer.email} — ${errorCount} escalations in 24h`,
    html: `
<p><strong>Agent health alert</strong></p>
<p>${customer.name || customer.email} (${customer.business_name || '—'}) has had <strong>${errorCount} escalated conversations in the last 24 hours</strong>.</p>
<ul>
  <li><strong>Email:</strong> ${customer.email}</li>
</ul>
<p>This is significantly above normal. Possible causes: misconfigured system prompt, a topic the agent isn't handling well, or an unusual volume of complex enquiries.</p>
<p>Review recent conversations in Supabase and consider reaching out to the customer.</p>
    `,
  });
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function supabaseFetch(env, path) {
  return fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'apikey': env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    },
  });
}

function resendEmail(env, { to, subject, html }) {
  if (!env.RESEND_API_KEY) return Promise.resolve();
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Inference Agents <hello@inference-agents.com>',
      to,
      subject,
      html,
    }),
  });
}

function daysAgo(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function getMonthStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}
