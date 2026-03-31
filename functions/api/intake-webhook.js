/**
 * Cloudflare Pages Function — POST /api/intake-webhook
 *
 * Handles onboarding form submission from onboarding.html.
 * Flow: validate → update Supabase customer + agent_config → generate Claude system prompt
 *       → update agent_config with prompt → send "configuring" email → return 200
 *
 * Environment variables required:
 *   SUPABASE_URL          — https://xyz.supabase.co
 *   SUPABASE_SERVICE_KEY  — service role key
 *   ANTHROPIC_API_KEY     — for system prompt generation
 *   RESEND_API_KEY        — for configuring email
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

  const {
    token,
    plan,
    // Step 1 — contact
    name,
    email,
    phone,
    // Step 2 — business
    businessName,
    sector,
    businessDescription,
    // Sector-specific
    roomCount,
    avgNightlyRate,
    otaChannels,
    storeCount,
    monthlyFootfall,
    ecommerce,
    firmType,
    staffCount,
    practiceType,
    patientCount,
    // Step 3 — agent config
    tone,
    faqs,           // array of {q, a}
    neverSay,
    escalationName,
    escalationPhone,
    // Step 4 — channels
    channels,       // array of strings: 'whatsapp', 'email', 'webchat'
    whatsappNumber,
    emailAddress,
    webchatPage,
  } = data;

  if (!token || !email || !businessName) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers });
  }

  // Basic email format check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: 'Invalid email address' }), { status: 400, headers });
  }

  // UUID format check on token to prevent injection
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 400, headers });
  }

  // Length limits on text fields
  const safeBusinessName = String(businessName).slice(0, 200);
  const safeBusinessDescription = String(businessDescription || '').slice(0, 2000);
  const safeNeverSay = String(neverSay || '').slice(0, 500);
  const safeEscalationName = String(escalationName || '').slice(0, 100);
  const safeFaqs = Array.isArray(faqs)
    ? faqs.slice(0, 20).map(f => ({ q: String(f.q || '').slice(0, 200), a: String(f.a || '').slice(0, 500) }))
    : [];
  const safeChannels = Array.isArray(channels)
    ? channels.filter(c => ['whatsapp', 'email', 'webchat'].includes(c))
    : ['whatsapp'];

  try {
    // 1. Look up customer by portal_token
    const custRes = await fetch(
      `${env.SUPABASE_URL}/rest/v1/customers?portal_token=eq.${token}&select=id,status&limit=1`,
      {
        headers: {
          'apikey': env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        },
      }
    );

    const customers = custRes.ok ? await custRes.json() : [];
    if (!customers.length) {
      return new Response(JSON.stringify({ error: 'Customer not found' }), { status: 404, headers });
    }

    const customerId = customers[0].id;

    // 2. Update customer record with business details
    await fetch(`${env.SUPABASE_URL}/rest/v1/customers?id=eq.${customerId}`, {
      method: 'PATCH',
      headers: {
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        name,
        business_name: businessName,
        phone,
        sector,
        status: 'onboarding',
      }),
    });

    // 3. Generate Claude system prompt
    const faqText = Array.isArray(faqs) && faqs.length
      ? faqs.map((f, i) => `Q${i + 1}: ${f.q}\nA${i + 1}: ${f.a}`).join('\n\n')
      : 'No FAQs provided yet.';

    const sectorContext = buildSectorContext({
      sector, roomCount, avgNightlyRate, otaChannels,
      storeCount, monthlyFootfall, ecommerce,
      firmType, staffCount,
      practiceType, patientCount,
    });

    const promptGenMessages = [
      {
        role: 'user',
        content: `You are building a system prompt for an AI customer-service agent for a UK business. Write a complete, production-ready system prompt for this business.

Business name: ${businessName}
Sector: ${sector}
Description: ${businessDescription || 'Not provided'}
${sectorContext}

Tone: ${tone || 'professional'} — match this exactly throughout
Channels: ${Array.isArray(channels) ? channels.join(', ') : 'not specified'}

FAQ knowledge base:
${faqText}

Never say (avoid these phrases/topics): ${neverSay || 'none specified'}

Escalation: When you cannot help or the customer is distressed, say you'll have ${escalationName || 'a team member'} follow up and end the conversation warmly.

Write the system prompt now. Start with "You are the AI assistant for [Business Name]." Be specific, UK English, no placeholders.`,
      },
    ];

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        system: 'You write precise, production-ready AI system prompts for customer service agents. Output only the system prompt, no preamble.',
        messages: promptGenMessages,
      }),
    });

    let systemPrompt = `You are the AI assistant for ${businessName}. You help customers with enquiries in a ${tone || 'professional'} manner. When you cannot assist, let the customer know that ${escalationName || 'a team member'} will follow up.`;

    if (claudeRes.ok) {
      const claudeData = await claudeRes.json();
      systemPrompt = claudeData?.content?.[0]?.text || systemPrompt;
    }

    // 4. QA — test the system prompt with 5 probe messages
    const qaIssues = await runPromptQA(systemPrompt, neverSay, businessName, env);
    if (qaIssues.length > 0) {
      await sendQAAlertToDave(email, businessName, qaIssues, systemPrompt, env);
    }

    // 5. Upsert agent_config
    const agentConfigPayload = {
      customer_id: customerId,
      agent_type: 'enquiry_handler',
      is_active: true,
      system_prompt: systemPrompt,
      tone: tone || 'professional',
      escalation_name: escalationName || '',
      escalation_phone: escalationPhone || '',
      channels: Array.isArray(channels) ? channels : [],
      whatsapp_number: whatsappNumber || null,
      email_address: emailAddress || null,
      webchat_page: webchatPage || null,
      faqs: Array.isArray(faqs) ? faqs : [],
      never_say: neverSay || '',
    };

    await fetch(`${env.SUPABASE_URL}/rest/v1/agent_configs`, {
      method: 'POST',
      headers: {
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(agentConfigPayload),
    });

    // 5. Send "configuring" email to customer
    await sendConfiguringEmail(email, name, businessName, plan, env);

    // 6. Notify Dave internally
    await sendInternalIntakeAlert(email, name, businessName, plan, sector, channels, env);

    console.log(`✅ Intake processed: ${email} — ${businessName} (${plan})`);
    return new Response(JSON.stringify({ success: true }), { status: 200, headers });

  } catch (err) {
    console.error('Intake webhook error:', err.message);
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

// ── System prompt QA ─────────────────────────────────────────────────────────

async function runPromptQA(systemPrompt, neverSay, businessName, env) {
  if (!env.ANTHROPIC_API_KEY) return [];

  const testMessages = [
    'What are your opening hours?',
    'How much does it cost?',
    'I want to make a complaint',
    'Can I speak to a human please?',
    `Tell me something completely unrelated to ${businessName}`,
  ];

  const issues = [];
  const bannedPhrases = (neverSay || '').split(/[,\n]/).map(p => p.trim().toLowerCase()).filter(Boolean);

  for (const msg of testMessages) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 200,
          system: systemPrompt,
          messages: [{ role: 'user', content: msg }],
        }),
      });

      if (!res.ok) continue;
      const data = await res.json();
      const reply = data?.content?.[0]?.text || '';
      const replyLower = reply.toLowerCase();

      // Check for banned phrases
      for (const phrase of bannedPhrases) {
        if (phrase && replyLower.includes(phrase)) {
          issues.push({ test: msg, reply: reply.slice(0, 120), issue: `Contains banned phrase: "${phrase}"` });
          break;
        }
      }

      // Check reply isn't empty or very short
      if (reply.trim().length < 20) {
        issues.push({ test: msg, reply, issue: 'Response too short — agent may not be answering' });
      }
    } catch (err) {
      // QA is best-effort, don't block onboarding
    }
  }

  return issues;
}

async function sendQAAlertToDave(customerEmail, businessName, issues, systemPrompt, env) {
  if (!env.RESEND_API_KEY) return;
  const issueList = issues.map(i =>
    `<li><strong>Test:</strong> "${i.test}"<br><strong>Issue:</strong> ${i.issue}<br><strong>Reply:</strong> ${i.reply}</li>`
  ).join('');

  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Inference Agents System <hello@inference-agents.com>',
      to: ['hello@inference-agents.com'],
      subject: `⚠️ QA flag: ${businessName} agent prompt needs review`,
      html: `<p><strong>System prompt QA detected ${issues.length} issue(s)</strong> for <strong>${businessName}</strong> (${customerEmail}).</p>
<ul>${issueList}</ul>
<p>Review and update the system prompt in Supabase before setting the customer to active.</p>
<details><summary>Full system prompt</summary><pre style="white-space:pre-wrap;font-size:12px;">${systemPrompt}</pre></details>`,
    }),
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildSectorContext({ sector, roomCount, avgNightlyRate, otaChannels, storeCount, monthlyFootfall, ecommerce, firmType, staffCount, practiceType, patientCount }) {
  switch (sector) {
    case 'hospitality':
      return [
        roomCount ? `Rooms: ${roomCount}` : '',
        avgNightlyRate ? `Average nightly rate: £${avgNightlyRate}` : '',
        otaChannels ? `OTA channels: ${otaChannels}` : '',
      ].filter(Boolean).join('\n');
    case 'retail':
      return [
        storeCount ? `Number of stores: ${storeCount}` : '',
        monthlyFootfall ? `Monthly footfall: ${monthlyFootfall}` : '',
        ecommerce ? `E-commerce: yes` : '',
      ].filter(Boolean).join('\n');
    case 'professional':
      return [
        firmType ? `Firm type: ${firmType}` : '',
        staffCount ? `Staff: ${staffCount}` : '',
      ].filter(Boolean).join('\n');
    case 'healthcare':
      return [
        practiceType ? `Practice type: ${practiceType}` : '',
        patientCount ? `Patients: ${patientCount}` : '',
      ].filter(Boolean).join('\n');
    default:
      return '';
  }
}

async function sendConfiguringEmail(email, name, businessName, plan, env) {
  if (!env.RESEND_API_KEY) return;
  const firstName = name?.split(' ')[0] || 'there';

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
      <p style="margin:0 0 8px;font-size:26px;font-weight:800;color:#f1f5f9;">Setup received, ${firstName}!</p>
      <p style="margin:0 0 28px;font-size:16px;color:#94a3b8;line-height:1.6;">We're now configuring your AI agent for <strong style="color:#818cf8;">${businessName}</strong>. Here's what's happening:</p>

      <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;width:100%;">
        ${[
          ['Right now', 'Your answers are being processed and your agent is being trained', '#10b981'],
          ['Day 1–2', 'We review and fine-tune the configuration', '#6366f1'],
          ['Day 3', 'You receive a preview link to test your agent', '#10b981'],
          ['Day 7', 'Your agent goes live on your chosen channels', '#10b981'],
        ].map(([day, text, color]) => `
        <tr>
          <td width="80" valign="top" style="padding:6px 0;">
            <span style="font-size:11px;font-weight:800;color:${color};text-transform:uppercase;">${day}</span>
          </td>
          <td style="font-size:14px;color:#94a3b8;line-height:1.6;padding:6px 0;">${text}</td>
        </tr>`).join('')}
      </table>

      <p style="margin:0;font-size:13px;color:#64748b;text-align:center;line-height:1.6;">
        Questions? Reply to this email — we respond within a few hours.<br>
        <a href="mailto:hello@inference-agents.com" style="color:#818cf8;">hello@inference-agents.com</a>
      </p>
    </td></tr>
  </td></tr>
  <tr><td style="padding:24px 0;text-align:center;">
    <p style="margin:0;font-size:12px;color:#334155;">© 2026 Inference Agents · UK Business</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Inference Agents <hello@inference-agents.com>',
      to: [email],
      subject: `We're configuring your AI agent — ${businessName}`,
      html,
    }),
  });
}

async function sendInternalIntakeAlert(email, name, businessName, plan, sector, channels, env) {
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
      subject: `📋 Intake received: ${businessName} (${plan})`,
      html: `<p>New onboarding form received:</p>
<ul>
  <li><strong>Name:</strong> ${name}</li>
  <li><strong>Email:</strong> ${email}</li>
  <li><strong>Business:</strong> ${businessName}</li>
  <li><strong>Plan:</strong> ${plan}</li>
  <li><strong>Sector:</strong> ${sector}</li>
  <li><strong>Channels:</strong> ${Array.isArray(channels) ? channels.join(', ') : '—'}</li>
</ul>
<p>Claude has generated their system prompt. Review the agent_configs table in Supabase and set the customer to <em>active</em> when ready.</p>`,
    }),
  });
}
