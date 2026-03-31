/**
 * Cloudflare Pages Function — POST /api/change-request
 *
 * Handles change request form submissions from change-request.html.
 * Flow: validate → store in Supabase change_requests → notify Dave via email
 *
 * Environment variables required:
 *   SUPABASE_URL          — https://xyz.supabase.co
 *   SUPABASE_SERVICE_KEY  — service role key
 *   RESEND_API_KEY        — for internal alert email
 */

export async function onRequestPost({ request, env }) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': 'https://inference-agents.com',
  };

  let data;
  try {
    data = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers });
  }

  const { name, email, business, requestType, newAgent, details, urgency, token } = data;

  if (!name || !email || !requestType || !details) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers });
  }

  // Length limits
  const safeName = String(name).slice(0, 200);
  const safeEmail = String(email).slice(0, 254);
  const safeBusiness = String(business || '').slice(0, 200);
  const safeDetails = String(details).slice(0, 5000);

  try {
    // 1. Look up customer by portal token (optional — we store what we can)
    let customerId = null;
    if (token && env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY) {
      const custRes = await fetch(
        `${env.SUPABASE_URL}/rest/v1/customers?portal_token=eq.${token}&select=id&limit=1`,
        {
          headers: {
            'apikey': env.SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
          },
        }
      );
      const customers = custRes.ok ? await custRes.json() : [];
      customerId = customers[0]?.id || null;
    }

    // 2. Store in Supabase change_requests
    if (env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY) {
      const crRes = await fetch(`${env.SUPABASE_URL}/rest/v1/change_requests`, {
        method: 'POST',
        headers: {
          'apikey': env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          customer_id: customerId,
          contact_name: name,
          contact_email: email,
          business_name: business || '',
          request_type: requestType,
          new_agent: newAgent || null,
          details,
          urgency: urgency || 'normal',
          status: 'open',
        }),
      });

      if (!crRes.ok) {
        const err = await crRes.text();
        console.error('Supabase change_request insert failed:', crRes.status, err);
        // Continue anyway — alert will still fire
      }
    }

    // 3. Send internal alert to Dave
    await sendInternalAlert({ name, email, business, requestType, newAgent, details, urgency }, env);

    // 4. Send confirmation to customer
    await sendCustomerConfirmation(email, name, requestType, urgency, env);

    console.log(`✅ Change request received from ${email}: ${requestType}`);
    return new Response(JSON.stringify({ success: true }), { status: 200, headers });

  } catch (err) {
    console.error('Change request error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'https://inference-agents.com',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Email helpers ─────────────────────────────────────────────────────────────

const REQUEST_TYPE_LABELS = {
  swap:           'Swap to a different agent',
  update_faqs:    'Update FAQs / business knowledge',
  add_channel:    'Add a new channel',
  escalation:     'Change escalation contact',
  pause:          'Pause agent',
  resume:         'Resume paused agent',
  other:          'Other',
};

const AGENT_LABELS = {
  enquiry_handler:       'Enquiry Handler',
  invoice_chaser:        'Invoice Chaser',
  appointment_reminder:  'Appointment Reminders',
  review_requester:      'Review Requester',
  booking_followup:      'Booking Follow-Up',
  lead_qualifier:        'Lead Qualifier',
};

async function sendInternalAlert({ name, email, business, requestType, newAgent, details, urgency }, env) {
  if (!env.RESEND_API_KEY) return;

  const urgencyBadge = urgency === 'urgent'
    ? '<span style="color:#ef4444;font-weight:bold;">🚨 URGENT</span>'
    : '<span style="color:#10b981;">Normal priority</span>';

  const agentLine = newAgent
    ? `<li><strong>Requested agent:</strong> ${AGENT_LABELS[newAgent] || newAgent}</li>`
    : '';

  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Inference Agents System <hello@inference-agents.com>',
      to: ['hello@inference-agents.com'],
      subject: `${urgency === 'urgent' ? '🚨 URGENT' : '📝'} Change request: ${escHtml(name)} — ${REQUEST_TYPE_LABELS[requestType] || escHtml(requestType)}`,
      html: `
<p>${urgencyBadge}</p>
<p><strong>Change request received:</strong></p>
<ul>
  <li><strong>Name:</strong> ${escHtml(name)}</li>
  <li><strong>Email:</strong> ${escHtml(email)}</li>
  <li><strong>Business:</strong> ${escHtml(business || '—')}</li>
  <li><strong>Request type:</strong> ${REQUEST_TYPE_LABELS[requestType] || escHtml(requestType)}</li>
  ${agentLine}
  <li><strong>Urgency:</strong> ${escHtml(urgency || 'normal')}</li>
</ul>
<p><strong>Details:</strong></p>
<blockquote style="border-left:4px solid #6366f1;padding:8px 16px;margin:0;color:#4b5563;">${escHtml(details)}</blockquote>
<p style="margin-top:16px;">Action this within ${urgency === 'urgent' ? '2 hours' : '24 hours'} and reply directly to ${escHtml(email)}.</p>
      `,
    }),
  });
}

async function sendCustomerConfirmation(email, name, requestType, urgency, env) {
  if (!env.RESEND_API_KEY) return;
  const firstName = name?.split(' ')[0] || 'there';
  const timeframe = urgency === 'urgent' ? 'within 2 hours' : 'within 24 hours';

  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Inference Agents <hello@inference-agents.com>',
      to: [email],
      subject: `Change request received — we'll action this ${timeframe}`,
      html: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:40px 20px;background:#05050f;font-family:Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;">
  <tr><td align="center" style="padding-bottom:28px;">
    <span style="font-size:20px;font-weight:800;color:#818cf8;">Inference Agents</span>
  </td></tr>
  <tr><td style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:36px;">
    <p style="margin:0 0 12px;font-size:22px;font-weight:800;color:#f1f5f9;">Got it, ${firstName}!</p>
    <p style="margin:0 0 20px;font-size:15px;color:#94a3b8;line-height:1.6;">
      We've received your <strong style="color:#818cf8;">${REQUEST_TYPE_LABELS[requestType] || 'change request'}</strong>
      and we'll action it <strong style="color:#10b981;">${timeframe}</strong>.
    </p>
    <p style="margin:0;font-size:14px;color:#94a3b8;line-height:1.6;">
      We'll email you when the change is complete. If anything's urgent, reply directly to this email.<br><br>
      <a href="mailto:hello@inference-agents.com" style="color:#818cf8;">hello@inference-agents.com</a>
    </p>
  </td></tr>
  <tr><td style="padding:20px 0;text-align:center;">
    <p style="margin:0;font-size:12px;color:#334155;">© 2026 Inference Agents</p>
  </td></tr>
</table>
</body>
</html>`,
    }),
  });
}
