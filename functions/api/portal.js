/**
 * Cloudflare Pages Function — /api/portal
 * Serves customer portal data from Supabase.
 *
 * Environment variables required (set in Cloudflare Pages dashboard):
 *   SUPABASE_URL          — e.g. https://xyzxyz.supabase.co
 *   SUPABASE_SERVICE_KEY  — service role key from Supabase project settings
 *
 * Usage: GET /api/portal?token=CUSTOMER_PORTAL_TOKEN
 */

export async function onRequestGet({ request, env }) {
  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': 'https://inference-agents.com',
    'Cache-Control': 'no-store',
  };

  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return new Response(JSON.stringify({ error: 'Missing token' }), { status: 400, headers });
  }

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    // Return demo data if Supabase is not yet configured
    return new Response(JSON.stringify(getDemoData()), { status: 200, headers });
  }

  try {
    // 1. Fetch customer by portal_token
    const customerRes = await fetch(
      `${env.SUPABASE_URL}/rest/v1/customers?portal_token=eq.${token}&select=*&limit=1`,
      {
        headers: {
          'apikey': env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
        }
      }
    );

    if (!customerRes.ok) throw new Error('Supabase customer query failed');
    const customers = await customerRes.json();

    if (!customers.length) {
      return new Response(JSON.stringify({ error: 'Customer not found' }), { status: 404, headers });
    }

    const customer = customers[0];
    const customerId = customer.id;

    // 2. Fetch agent configs
    const agentRes = await fetch(
      `${env.SUPABASE_URL}/rest/v1/agent_configs?customer_id=eq.${customerId}&is_active=eq.true&select=*`,
      {
        headers: {
          'apikey': env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        }
      }
    );
    const agentConfigs = agentRes.ok ? await agentRes.json() : [];

    // 3. Fetch recent conversations (last 50)
    const convoRes = await fetch(
      `${env.SUPABASE_URL}/rest/v1/conversations?customer_id=eq.${customerId}&order=created_at.desc&limit=50&select=*`,
      {
        headers: {
          'apikey': env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        }
      }
    );
    const conversations = convoRes.ok ? await convoRes.json() : [];

    // 4. Fetch weekly stats (last 8 weeks)
    const statsRes = await fetch(
      `${env.SUPABASE_URL}/rest/v1/weekly_stats?customer_id=eq.${customerId}&order=week_start.desc&limit=8&select=*`,
      {
        headers: {
          'apikey': env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        }
      }
    );
    const weeklyStats = statsRes.ok ? await statsRes.json() : [];

    // 5. Aggregate stats
    const monthEnquiries = conversations.filter(c => {
      const d = new Date(c.created_at);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    const thisWeekStart = getWeekStart();
    const weekConvos = conversations.filter(c => new Date(c.created_at) >= thisWeekStart);
    const escalations = conversations.filter(c => c.escalated).length;
    const hoursEstimate = Math.round(monthEnquiries * 0.17); // ~10 min per enquiry

    // 6. Activity chart — last 7 days
    const activity = getLast7DaysActivity(conversations);

    // 7. Format conversations for portal
    const formattedConvos = conversations.slice(0, 20).map(c => ({
      name: c.contact_name || 'Customer',
      avatar: '👤',
      channel: c.channel,
      message: c.message_content?.slice(0, 80) + (c.message_content?.length > 80 ? '...' : '') || '',
      time: timeAgo(c.created_at),
      handled: !c.escalated,
      escalated: c.escalated,
    }));

    // 8. Format agents
    const agentIconMap = {
      enquiry_handler: { icon: '💬', color: 'green', desc: 'Handles all inbound enquiries 24/7' },
      invoice_chaser:  { icon: '💰', color: 'amber', desc: 'Sends payment reminders automatically' },
      review_requester:{ icon: '⭐', color: 'indigo', desc: 'Requests reviews after each interaction' },
      booking_followup:{ icon: '📅', color: 'indigo', desc: 'Follows up with enquiries that didn\'t convert' },
      appointment_reminder: { icon: '🔔', color: 'green', desc: 'Sends appointment reminders via SMS/WhatsApp' },
    };

    const agents = agentConfigs.map(a => {
      const meta = agentIconMap[a.agent_type] || { icon: '🤖', color: 'green', desc: a.agent_type };
      const agentConvos = conversations.filter(c => c.agent_type === a.agent_type).length;
      return {
        name: a.agent_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        icon: meta.icon,
        color: meta.color,
        desc: meta.desc,
        stats: { enquiries: agentConvos, label: 'interactions this month' }
      };
    });

    const payload = {
      customerName: `${customer.name}`,
      businessName: customer.business_name,
      plan: customer.plan,
      sector: customer.sector,
      stats: {
        enquiries: monthEnquiries,
        hours: hoursEstimate,
        week: weekConvos.length,
        escalations
      },
      agents,
      conversations: formattedConvos,
      activity,
    };

    return new Response(JSON.stringify(payload), { status: 200, headers });

  } catch (err) {
    console.error('Portal API error:', err);
    return new Response(JSON.stringify({ error: 'Internal error', demo: getDemoData() }), { status: 500, headers });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'https://inference-agents.com',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getLast7DaysActivity(conversations) {
  const counts = Array(7).fill(0);
  const now = new Date();
  conversations.forEach(c => {
    const d = new Date(c.created_at);
    const daysAgo = Math.floor((now - d) / (1000 * 60 * 60 * 24));
    if (daysAgo < 7) counts[6 - daysAgo]++;
  });
  return counts;
}

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + ' min ago';
  if (diff < 86400) return Math.floor(diff / 3600) + ' hr ago';
  if (diff < 172800) return 'Yesterday';
  return Math.floor(diff / 86400) + ' days ago';
}

function getDemoData() {
  return {
    customerName: 'Demo Customer',
    businessName: 'Your Business',
    plan: 'growth',
    stats: { enquiries: 0, hours: 0, week: 0, escalations: 0 },
    agents: [],
    conversations: [],
    activity: [0,0,0,0,0,0,0],
    _demo: true,
  };
}
