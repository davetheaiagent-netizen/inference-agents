/**
 * Cloudflare Pages Function — /api/admin
 *
 * Internal admin API for Mission Control dashboard.
 * Returns all customers with stats for the internal CRM view.
 *
 * Authentication: x-admin-key header must match env.ADMIN_KEY
 *
 * GET /api/admin?action=customers  — list all customers with MRR + status
 * GET /api/admin?action=stats      — aggregate business metrics
 * POST /api/admin                  — update customer status
 *
 * Environment variables required:
 *   SUPABASE_URL          — https://xyz.supabase.co
 *   SUPABASE_SERVICE_KEY  — service role key
 *   ADMIN_KEY             — secret key for Mission Control auth
 */

const PLAN_MRR = { starter: 99, growth: 199, fullstack: 399 };

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': 'https://inference-agents.com',
};

export async function onRequestGet({ request, env }) {
  if (!authenticate(request, env)) {
    return new Response(JSON.stringify({ error: 'Unauthorised' }), { status: 401, headers: corsHeaders });
  }

  const url = new URL(request.url);
  const action = url.searchParams.get('action') || 'customers';

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    return new Response(JSON.stringify({ error: 'Supabase not configured' }), { status: 500, headers: corsHeaders });
  }

  try {
    if (action === 'customers') {
      return await getCustomers(env);
    }
    if (action === 'stats') {
      return await getStats(env);
    }
    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}

export async function onRequestPost({ request, env }) {
  if (!authenticate(request, env)) {
    return new Response(JSON.stringify({ error: 'Unauthorised' }), { status: 401, headers: corsHeaders });
  }

  let body;
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: corsHeaders });
  }

  const { customerId, status } = body;
  if (!customerId || !status) {
    return new Response(JSON.stringify({ error: 'Missing customerId or status' }), { status: 400, headers: corsHeaders });
  }

  const validStatuses = ['pending', 'onboarding', 'active', 'paused', 'churned'];
  if (!validStatuses.includes(status)) {
    return new Response(JSON.stringify({ error: 'Invalid status' }), { status: 400, headers: corsHeaders });
  }

  try {
    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/customers?id=eq.${customerId}`, {
      method: 'PATCH',
      headers: {
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Supabase update failed: ${err}`);
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'https://inference-agents.com',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-admin-key',
    },
  });
}

// ── Data fetchers ─────────────────────────────────────────────────────────────

async function getCustomers(env) {
  const custRes = await fetch(
    `${env.SUPABASE_URL}/rest/v1/customers?select=id,name,email,business_name,plan,status,portal_token,created_at,sector&order=created_at.desc`,
    {
      headers: {
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      },
    }
  );

  if (!custRes.ok) throw new Error('Failed to fetch customers');
  const customers = await custRes.json();

  // Get this month's conversation counts per customer
  const monthStart = getMonthStart();
  const convoRes = await fetch(
    `${env.SUPABASE_URL}/rest/v1/conversations?created_at=gte.${encodeURIComponent(monthStart)}&select=customer_id`,
    {
      headers: {
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      },
    }
  );
  const convos = convoRes.ok ? await convoRes.json() : [];
  const convoCounts = convos.reduce((acc, c) => {
    acc[c.customer_id] = (acc[c.customer_id] || 0) + 1;
    return acc;
  }, {});

  const enriched = customers.map(c => ({
    ...c,
    mrr: PLAN_MRR[c.plan] || 0,
    conversations_this_month: convoCounts[c.id] || 0,
    portal_url: c.portal_token
      ? `https://inference-agents.com/portal.html?token=${c.portal_token}`
      : null,
  }));

  return new Response(JSON.stringify({ customers: enriched }), { status: 200, headers: corsHeaders });
}

async function getStats(env) {
  const custRes = await fetch(
    `${env.SUPABASE_URL}/rest/v1/customers?select=plan,status`,
    {
      headers: {
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      },
    }
  );

  const customers = custRes.ok ? await custRes.json() : [];
  const active = customers.filter(c => c.status === 'active');
  const mrr = active.reduce((sum, c) => sum + (PLAN_MRR[c.plan] || 0), 0);

  const monthStart = getMonthStart();
  const convoRes = await fetch(
    `${env.SUPABASE_URL}/rest/v1/conversations?created_at=gte.${encodeURIComponent(monthStart)}&select=id,escalated`,
    {
      headers: {
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      },
    }
  );
  const convos = convoRes.ok ? await convoRes.json() : [];
  const escalations = convos.filter(c => c.escalated).length;

  return new Response(JSON.stringify({
    total_customers: customers.length,
    active_customers: active.length,
    onboarding_customers: customers.filter(c => c.status === 'onboarding').length,
    mrr,
    conversations_this_month: convos.length,
    escalations_this_month: escalations,
    automation_rate: convos.length > 0
      ? Math.round(((convos.length - escalations) / convos.length) * 100)
      : 100,
  }), { status: 200, headers: corsHeaders });
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function authenticate(request, env) {
  if (!env.ADMIN_KEY) return false;
  return request.headers.get('x-admin-key') === env.ADMIN_KEY;
}

function getMonthStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}
