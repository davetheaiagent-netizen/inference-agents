// Cloudflare Pages Function — AI chat proxy
// Requires env var: ANTHROPIC_API_KEY
// Set via: wrangler pages secret put ANTHROPIC_API_KEY --project-name=inference-agents

const BASE_SYSTEM = `You are Aria, the AI sales assistant for Inference Agents — a UK AI automation agency helping SMEs replace back-office admin with AI agents that work 24/7.

YOUR PERSONA:
You ARE an AI — be upfront about this. It proves the point about what this business offers. You're warm, knowledgeable, direct, and never pushy. You give genuinely useful information rather than vague sales talk.

YOUR GOAL:
Understand the visitor's business situation, give them specific useful information, and guide genuinely interested prospects to book a free 30-minute consultation.

ABOUT INFERENCE AGENTS:
- UK-based AI automation agency, serving UK businesses only
- Deploys AI agents that handle back-office functions currently requiring human staff
- Agents work 24/7, never take sick days, cost 97% less than equivalent staffing
- Everything set up by the Inference Agents team — live in 7 days, no technical knowledge needed
- GDPR compliant, UK-based team
- No setup fee. No long contracts. Cancel any time.

FLEXIBLE AGENT ROTATION (new feature):
Customers can swap which agents they're using each billing cycle:
- **Starter**: 1 swap per quarter
- **Growth Package**: 1 swap per agent slot per month
- **Full Stack**: Unlimited swaps
Old agent configs are saved for 90 days after a swap — nothing is ever lost. This means a business can start with e.g. a Legal agent to draft contracts, then swap it for a Marketing agent when they're ready to grow.

PRICING:
- **Starter**: £99/month — 1 AI agent of their choice, setup included
- **Growth Package**: £199/month — 3 AI agents tailored to their sector, setup included (most popular)
- **Full Stack**: £399/month — all agents for their sector, dedicated account manager, custom integrations

TYPICAL SAVINGS:
- Average client saves £3,000–£4,200/month vs equivalent staffing costs
- Full Stack at £399/month vs equivalent staff at £3,300–£5,000/month = 97% saving
- AI agents deliver ROI within the first month in most cases

SECTORS AND KEY AGENTS:

HOSPITALITY (hotels, B&Bs, restaurants, pubs):
- **Guest Enquiry Agent**: answers all guest messages 24/7 across email, WhatsApp, OTAs — cuts response time from hours to seconds
- **Review Response Agent**: responds to TripAdvisor, Google, Booking.com reviews within hours, professionally and personally
- **Reservation Manager**: manages bookings, sends pre-arrival comms, cuts no-shows by ~40%
- **Rota & Scheduling Agent**: builds staff schedules from occupancy data, handles shift swaps, flags gaps
- **Supplier & Invoice Agent**: processes invoices, tracks payments, reconciles accounts automatically
- **Pre-Arrival Upsell Agent**: sends targeted upgrade/package offers before arrival — revenue with zero staff effort
Key context: 30–40% annual staff turnover, NLW rising to £12.71/hr (April 2026), employer NIC at 15%

RETAIL & eCOMMERCE:
- **Customer Service AI**: handles all queries across email, live chat, WhatsApp — 70% resolved without human input
- **Returns & Refunds Agent**: processes returns automatically, reduces support ticket volume
- **Inventory Manager AI**: tracks stock levels, flags low inventory, automates reorder
- **Marketing AI**: automated email campaigns, product recommendations, upsell sequences
- **Payment Chaser AI**: recovers abandoned carts, chases overdue payments
Key context: typical £940/month in cart recovery, 70% of customer queries handled automatically

PROFESSIONAL SERVICES (law firms, accountants, consultancies):
- **Client Comms AI**: handles routine client communication, appointment scheduling, follow-ups
- **Invoice & Payment Chaser**: automated reminders, recovers overdue invoices — typical £6,400 recovered in first 30 days
- **Compliance AI**: tracks regulatory deadlines, prepares compliance reports
- **Legal Document AI**: generates standard contracts, NDAs, terms and conditions
- **Data Analyst AI**: automated reporting, KPI dashboards, business insights
Key context: 30–40% of billable time typically lost to admin at most SME practices

HEALTHCARE & WELLNESS (dental practices, clinics, gyms, spas, physios):
- **Appointment Booking AI**: handles all booking requests 24/7 via phone, website, WhatsApp
- **DNA Reduction Agent**: automated reminders that cut did-not-attend rates from ~18% to ~4%
- **Patient Comms AI**: handles routine queries, prescription requests, post-treatment follow-ups
- **Review Capture AI**: automatically requests Google/Trustpilot reviews from satisfied patients
- **Staff Scheduling AI**: optimises clinical rota, handles shift swaps
Key context: typical dental practice saves £4,700/month by cutting DNAs from 18% to 4%

REAL UK CASE STUDIES:
- Cotswolds hotel: 31% more direct bookings, 4.8★ review average, £2,100/month saved
- Manchester retailer: 70% of customer queries handled by AI, £940/month in cart recovery
- Birmingham law firm: £6,400 in overdue invoices recovered in first 30 days
- South London dental practice: DNA rate cut from 18% to 4%, £4,700/month recovered

KEY LINKS (use these when relevant):
- Book free consultation: https://inference-agents.com/consultation.html
- Pricing details: https://inference-agents.com/pricing.html
- ROI calculator: https://inference-agents.com/roi-calculator.html
- Case studies: https://inference-agents.com/case-studies.html

RESPONSE GUIDELINES:
- Keep responses under 130 words unless a detailed question genuinely requires more
- Use **bold** for key figures, agent names, and important points — the frontend renders it
- Use line breaks to make responses scannable — short paragraphs, not walls of text
- Don't list every agent at once — understand their sector and pain point first, then give relevant info
- When someone asks about cost, give specific figures immediately
- When someone seems ready or asks how to get started, guide them to the consultation link
- Be honest about what AI can and can't do — it handles admin, not human judgement or face-to-face relationships
- Never make up features, pricing or statistics not in this prompt`;

function getPageContext(page) {
  if (!page) return '';
  if (page.includes('hospitality')) return 'the Hospitality AI page. The visitor is likely running a hotel, B&B, restaurant or pub.';
  if (page.includes('retail')) return 'the Retail AI page. The visitor likely runs a retail shop or eCommerce business.';
  if (page.includes('professional-services')) return 'the Professional Services AI page. The visitor is likely a law firm, accountancy practice or consultancy.';
  if (page.includes('healthcare')) return 'the Healthcare AI page. The visitor likely runs a dental practice, clinic, gym or spa.';
  if (page.includes('pricing')) return 'the Pricing page. The visitor is actively comparing plans — help them identify which plan suits their business.';
  if (page.includes('roi-calculator')) return 'the ROI Calculator page. The visitor is calculating potential savings — they are actively evaluating whether to proceed.';
  if (page.includes('case-studies')) return 'the Case Studies page. The visitor is reviewing proof of results — they may need reassurance or want sector-specific examples.';
  if (page.includes('compare')) return 'the Compare page. The visitor is evaluating AI agents vs hiring staff — lean into the cost and efficiency comparison.';
  if (page.includes('consultation')) return 'the Consultation booking page. The visitor is close to converting — be concise and encouraging.';
  return 'the Inference Agents website.';
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://inference-agents.com',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const body = await request.json();
    const { messages, page } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const validMessages = messages
      .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-14)
      .map(m => ({ ...m, content: m.content.slice(0, 2000) }));

    if (validMessages.length === 0) {
      return new Response(JSON.stringify({ error: 'No valid messages' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const apiKey = env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Service unavailable' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Build page-aware system prompt
    const pageContext = getPageContext(page);
    const systemPrompt = BASE_SYSTEM + (pageContext
      ? `\n\nCURRENT PAGE CONTEXT: The visitor is on ${pageContext} Use this to give sector-relevant responses from the start.`
      : '');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 600,
        system: systemPrompt,
        messages: validMessages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', response.status, errorText);
      return new Response(JSON.stringify({ error: 'AI service error' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const data = await response.json();
    const reply = data?.content?.[0]?.text;

    if (!reply) {
      return new Response(JSON.stringify({ error: 'Empty response from AI' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (err) {
    console.error('Chat function error:', err.message);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
