/**
 * Cloudflare Pages Function — POST /api/360dialog-provision
 *
 * Called after a customer completes the intake form. Provisions a WhatsApp
 * WABA for the customer via the 360Dialog Partner API, then stores the result
 * in Supabase and sends an internal alert to Dave.
 *
 * Trigger: POST with JSON body { customerId, customerEmail, businessName, token }
 *
 * Environment variables required:
 *   DIALOG360_PARTNER_ID     — 360Dialog partner identifier
 *   DIALOG360_PARTNER_TOKEN  — 360Dialog partner bearer token
 *   SUPABASE_URL             — https://xyz.supabase.co
 *   SUPABASE_SERVICE_KEY     — service role key
 *   RESEND_API_KEY           — for internal alert emails
 */

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': 'https://inference-agents.com',
};

export async function onRequestPost({ request, env }) {
  // ── Parse request body ────────────────────────────────────────────────────
  let data;
  try {
    data = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: CORS_HEADERS,
    });
  }

  const { customerId, customerEmail, businessName, token } = data;

  if (!customerId || !customerEmail || !businessName || !token) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: customerId, customerEmail, businessName, token' }),
      { status: 400, headers: CORS_HEADERS }
    );
  }

  // ── 1. Call 360Dialog Partner API to create channel ───────────────────────
  let wabaId = null;
  let phoneNumber = null;
  let dialogSuccess = false;
  let dialogError = null;

  try {
    const dialogRes = await fetch(
      `https://hub.360dialog.io/api/v2/partners/${env.DIALOG360_PARTNER_ID}/channels`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.DIALOG360_PARTNER_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          country: 'GB',
          name: businessName,
          email: customerEmail,
        }),
      }
    );

    const dialogBody = await dialogRes.json();

    if (!dialogRes.ok) {
      dialogError = `360Dialog API error ${dialogRes.status}: ${JSON.stringify(dialogBody)}`;
      console.error('360Dialog provisioning failed:', dialogError);
    } else {
      wabaId = dialogBody?.waba_id ?? null;
      phoneNumber = dialogBody?.channel?.phone_number ?? null;
      dialogSuccess = true;
      console.log(`360Dialog WABA provisioned: waba_id=${wabaId}, phone=${phoneNumber}`);
    }
  } catch (err) {
    dialogError = `360Dialog network error: ${err.message}`;
    console.error(dialogError);
  }

  // ── 2. Update Supabase agent_configs ──────────────────────────────────────
  const provisioningStatus = dialogSuccess ? 'pending' : 'failed';

  const supabasePatch = {
    provisioning_status: provisioningStatus,
  };

  if (wabaId) supabasePatch.waba_id = wabaId;
  if (phoneNumber) supabasePatch.whatsapp_number = phoneNumber;

  try {
    const supabaseRes = await fetch(
      `${env.SUPABASE_URL}/rest/v1/agent_configs?customer_id=eq.${customerId}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify(supabasePatch),
      }
    );

    if (!supabaseRes.ok) {
      const body = await supabaseRes.text();
      console.error(`Supabase PATCH failed (${supabaseRes.status}): ${body}`);
    }
  } catch (err) {
    console.error('Supabase update error:', err.message);
  }

  // ── 3. Send internal alert to Dave ────────────────────────────────────────
  if (dialogSuccess) {
    await sendInternalSuccessAlert({ businessName, wabaId, phoneNumber, customerEmail, customerId, env });
  } else {
    await sendInternalFailureAlert({ businessName, customerEmail, customerId, dialogError, env });
  }

  // ── 4. Return result — always 200 to avoid blocking onboarding ───────────
  if (dialogSuccess) {
    return new Response(
      JSON.stringify({ success: true, wabaId, status: 'pending_verification' }),
      { status: 200, headers: CORS_HEADERS }
    );
  }

  return new Response(
    JSON.stringify({
      success: false,
      status: 'failed',
      error: dialogError,
      message: 'WABA provisioning failed. Dave has been alerted. Onboarding continues.',
    }),
    { status: 200, headers: CORS_HEADERS }
  );
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

// ── Helpers ───────────────────────────────────────────────────────────────────

async function sendInternalSuccessAlert({ businessName, wabaId, phoneNumber, customerEmail, customerId, env }) {
  if (!env.RESEND_API_KEY) return;

  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Inference Agents System <hello@inference-agents.com>',
      to: ['hello@inference-agents.com'],
      subject: `New WABA provisioned — ${businessName}`,
      html: `<p>A new WhatsApp WABA has been provisioned via 360Dialog.</p>
<ul>
  <li><strong>Business:</strong> ${businessName}</li>
  <li><strong>Customer email:</strong> ${customerEmail}</li>
  <li><strong>Customer ID:</strong> ${customerId}</li>
  <li><strong>WABA ID:</strong> ${wabaId}</li>
  <li><strong>Phone number:</strong> ${phoneNumber || 'Not yet assigned'}</li>
  <li><strong>Status:</strong> pending_verification</li>
</ul>
<p>New WABA provisioned for ${businessName} — waba_id: ${wabaId}. Phone number pending verification in 360Dialog dashboard.</p>
<p>Action required: complete phone number verification in the <a href="https://hub.360dialog.io">360Dialog dashboard</a> to activate the channel.</p>`,
    }),
  });
}

async function sendInternalFailureAlert({ businessName, customerEmail, customerId, dialogError, env }) {
  if (!env.RESEND_API_KEY) return;

  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Inference Agents System <hello@inference-agents.com>',
      to: ['hello@inference-agents.com'],
      subject: `WABA provisioning FAILED — ${businessName}`,
      html: `<p><strong>360Dialog WABA provisioning failed.</strong> Manual intervention required.</p>
<ul>
  <li><strong>Business:</strong> ${businessName}</li>
  <li><strong>Customer email:</strong> ${customerEmail}</li>
  <li><strong>Customer ID:</strong> ${customerId}</li>
  <li><strong>Error:</strong> ${dialogError}</li>
</ul>
<p>Supabase <code>agent_configs</code> has been updated with <code>provisioning_status: 'failed'</code>.</p>
<p>Please provision the WABA manually via the <a href="https://hub.360dialog.io">360Dialog dashboard</a> and update Supabase accordingly.</p>`,
    }),
  });
}
