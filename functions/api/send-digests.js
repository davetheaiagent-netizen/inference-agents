// Cloudflare Pages Function — Weekly digest sender
// Triggered by external cron (e.g. cron-job.org) every Monday at 9am
// POST with header: x-cron-secret

function getMondayMidnight() {
  const now = new Date();
  const day = now.getUTCDay(); // 0 = Sunday, 1 = Monday ...
  const diffToMonday = (day === 0 ? -6 : 1 - day);
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + diffToMonday);
  monday.setUTCHours(0, 0, 0, 0);
  return monday.toISOString();
}

function getSevenDaysAgo() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 7);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function formatWeekEnd() {
  const now = new Date();
  return now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function buildEmailHtml({ customerName, businessName, enquiries, hoursSaved, messagesSent, escalations, digestSummary, dashboardUrl }) {
  const weekEnd = formatWeekEnd();

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Your AI agent weekly report</title>
</head>
<body style="margin:0;padding:0;background-color:#05050f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#05050f;min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom:32px;" align="center">
              <p style="margin:0 0 8px 0;font-size:13px;color:#6366f1;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;">Inference Agents</p>
              <h1 style="margin:0;font-size:28px;font-weight:700;color:#ffffff;line-height:1.2;">Your week with AI ✨</h1>
              <p style="margin:10px 0 0 0;font-size:14px;color:#6b7280;">Week ending ${weekEnd}</p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding-bottom:28px;">
              <p style="margin:0;font-size:16px;color:#d1d5db;line-height:1.6;">Hi ${customerName},</p>
            </td>
          </tr>

          <!-- Stats 2x2 grid -->
          <tr>
            <td style="padding-bottom:28px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <!-- Enquiries Handled -->
                  <td width="48%" style="background-color:#0f0f2a;border:1px solid #1e1e4a;border-radius:12px;padding:24px 20px;text-align:center;vertical-align:top;">
                    <p style="margin:0 0 6px 0;font-size:36px;font-weight:700;color:#6366f1;">${enquiries}</p>
                    <p style="margin:0;font-size:13px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;font-weight:500;">Enquiries Handled</p>
                  </td>
                  <td width="4%"></td>
                  <!-- Hours Saved -->
                  <td width="48%" style="background-color:#0f0f2a;border:1px solid #1e1e4a;border-radius:12px;padding:24px 20px;text-align:center;vertical-align:top;">
                    <p style="margin:0 0 6px 0;font-size:36px;font-weight:700;color:#10b981;">${hoursSaved}</p>
                    <p style="margin:0;font-size:13px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;font-weight:500;">Hours Saved</p>
                  </td>
                </tr>
                <tr><td colspan="3" style="padding-top:16px;"></td></tr>
                <tr>
                  <!-- Messages Sent -->
                  <td width="48%" style="background-color:#0f0f2a;border:1px solid #1e1e4a;border-radius:12px;padding:24px 20px;text-align:center;vertical-align:top;">
                    <p style="margin:0 0 6px 0;font-size:36px;font-weight:700;color:#6366f1;">${messagesSent}</p>
                    <p style="margin:0;font-size:13px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;font-weight:500;">Messages Sent</p>
                  </td>
                  <td width="4%"></td>
                  <!-- Escalations -->
                  <td width="48%" style="background-color:#0f0f2a;border:1px solid #1e1e4a;border-radius:12px;padding:24px 20px;text-align:center;vertical-align:top;">
                    <p style="margin:0 0 6px 0;font-size:36px;font-weight:700;color:#f59e0b;">${escalations}</p>
                    <p style="margin:0;font-size:13px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;font-weight:500;">Escalations</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Digest Summary -->
          <tr>
            <td style="background-color:#0f0f2a;border:1px solid #1e1e4a;border-radius:12px;padding:24px 28px;margin-bottom:28px;">
              <p style="margin:0;font-size:15px;color:#d1d5db;line-height:1.7;">${digestSummary}</p>
            </td>
          </tr>

          <!-- Spacer -->
          <tr><td style="padding-top:28px;"></td></tr>

          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <a href="${dashboardUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;letter-spacing:0.02em;">View Full Dashboard</a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid #1e1e4a;padding-top:24px;" align="center">
              <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">Want to add an agent or make changes? Reply to this email or visit your dashboard.</p>
              <p style="margin:12px 0 0 0;font-size:12px;color:#4b5563;">Inference Agents &bull; <a href="https://inference-agents.com" style="color:#6366f1;text-decoration:none;">inference-agents.com</a></p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  // Verify cron secret
  const cronSecret = request.headers.get('x-cron-secret');
  if (!cronSecret || cronSecret !== env.CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorised' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const weekStart = getMondayMidnight();
  const sevenDaysAgo = getSevenDaysAgo();
  const weekEnd = formatWeekEnd();

  let processed = 0;
  const errors = [];

  try {
    // Fetch all active customers
    const customersRes = await fetch(
      `${env.SUPABASE_URL}/rest/v1/customers?status=eq.active&select=id,name,email,business_name,plan,portal_token`,
      {
        headers: {
          'apikey': env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        },
      }
    );

    if (!customersRes.ok) {
      const err = await customersRes.text();
      console.error('Failed to fetch customers:', customersRes.status, err);
      return new Response(JSON.stringify({ success: false, error: 'Failed to fetch customers' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const customers = await customersRes.json();

    for (const customer of customers) {
      try {
        const { id: customerId, name, email, business_name: businessName, plan, portal_token: portalToken } = customer;

        // Fetch conversations in the last 7 days
        const convsRes = await fetch(
          `${env.SUPABASE_URL}/rest/v1/conversations?customer_id=eq.${customerId}&created_at=gte.${encodeURIComponent(sevenDaysAgo)}&select=direction,escalated`,
          {
            headers: {
              'apikey': env.SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            },
          }
        );

        const conversations = convsRes.ok ? await convsRes.json() : [];

        const totalEnquiries = conversations.length;
        const escalations = conversations.filter(c => c.escalated === true).length;
        const messagesSent = conversations.filter(c => c.direction === 'outbound').length;
        const hoursSaved = Math.round(totalEnquiries * 0.17);

        // Upsert weekly stats
        const statsRes = await fetch(`${env.SUPABASE_URL}/rest/v1/weekly_stats`, {
          method: 'POST',
          headers: {
            'apikey': env.SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates,return=minimal',
          },
          body: JSON.stringify({
            customer_id: customerId,
            week_start: weekStart,
            enquiries_handled: totalEnquiries,
            messages_sent: messagesSent,
            escalations,
            hours_saved: hoursSaved,
          }),
        });

        if (!statsRes.ok) {
          const err = await statsRes.text();
          console.error(`Stats upsert failed for customer ${customerId}:`, statsRes.status, err);
        }

        // Generate digest summary via Claude
        const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 500,
            system: 'You write concise, friendly business performance summaries in UK English.',
            messages: [
              {
                role: 'user',
                content: `Write a 2-sentence friendly summary of this week's AI agent performance for ${businessName}. Stats: ${totalEnquiries} enquiries handled, ${hoursSaved} hours saved, ${escalations} escalations. Tone: warm, positive, UK English. Start with the business name. Keep it under 60 words.`,
              },
            ],
          }),
        });

        let digestSummary = `${businessName}'s AI agent had a productive week, handling ${totalEnquiries} enquiries and saving approximately ${hoursSaved} hours of staff time.`;

        if (claudeRes.ok) {
          const claudeData = await claudeRes.json();
          digestSummary = claudeData?.content?.[0]?.text || digestSummary;
        } else {
          const err = await claudeRes.text();
          console.error(`Claude error for customer ${customerId}:`, claudeRes.status, err);
        }

        // Build dashboard URL with portal token if available
        const dashboardUrl = portalToken
          ? `https://inference-agents.com/portal.html?token=${encodeURIComponent(portalToken)}`
          : 'https://inference-agents.com/portal.html';

        // Build email HTML
        const emailHtml = buildEmailHtml({
          customerName: name,
          businessName,
          enquiries: totalEnquiries,
          hoursSaved,
          messagesSent,
          escalations,
          digestSummary,
          dashboardUrl,
        });

        // Send email via Resend
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Inference Agents <hello@inference-agents.com>',
            to: [email],
            subject: `Your AI agent weekly report — w/e ${weekEnd}`,
            html: emailHtml,
          }),
        });

        if (!emailRes.ok) {
          const err = await emailRes.text();
          throw new Error(`Email send failed (${emailRes.status}): ${err}`);
        }

        processed++;

        // Small delay to avoid rate limits
        await new Promise(r => setTimeout(r, 200));

      } catch (customerErr) {
        console.error(`Error processing customer ${customer.id}:`, customerErr.message);
        errors.push({ customer_id: customer.id, email: customer.email, error: customerErr.message });
      }
    }

    return new Response(JSON.stringify({ success: true, processed, errors }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Digest sender fatal error:', err.message);
    return new Response(JSON.stringify({ success: false, error: err.message, processed, errors }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestGet() {
  return new Response(
    JSON.stringify({
      status: 'Digest endpoint ready',
      message: 'POST with x-cron-secret header to trigger',
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
