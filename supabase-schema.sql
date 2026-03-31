-- ============================================================
-- Inference Agents — Supabase PostgreSQL Schema
-- inference-agents.com
-- Run this in the Supabase SQL editor (EU region project)
-- ============================================================

-- Enable UUID extension (usually already enabled on Supabase)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLES
-- ============================================================

-- customers
CREATE TABLE IF NOT EXISTS public.customers (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email                   TEXT NOT NULL UNIQUE,
    name                    TEXT,
    business_name           TEXT,
    phone                   TEXT,
    plan                    TEXT NOT NULL CHECK (plan IN ('starter', 'growth', 'fullstack')),
    status                  TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'onboarding', 'active', 'paused', 'churned')),
    stripe_customer_id      TEXT UNIQUE,
    stripe_subscription_id  TEXT UNIQUE,
    portal_token            UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    sector                  TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- agent_configs
CREATE TABLE IF NOT EXISTS public.agent_configs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id         UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    agent_type          TEXT,                          -- e.g. 'receptionist', 'sales', 'support'
    system_prompt       TEXT,
    business_name       TEXT,
    sector              TEXT,
    tone                TEXT,                          -- e.g. 'professional', 'friendly', 'formal'
    faqs                JSONB DEFAULT '[]'::JSONB,
    escalation_name     TEXT,
    escalation_phone    TEXT,
    whatsapp_number     TEXT,
    waba_id             TEXT,
    provisioning_status TEXT DEFAULT 'not_started',
    email_address       TEXT,
    webchat_page        TEXT,
    website_url         TEXT,
    never_say           TEXT,
    channels            JSONB DEFAULT '["whatsapp"]'::JSONB,
    is_active           BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- conversations
CREATE TABLE IF NOT EXISTS public.conversations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id         UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    agent_type          TEXT,
    channel             TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email', 'webchat')),
    direction           TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    message_content     TEXT,
    contact_name        TEXT,
    contact_identifier  TEXT,                          -- phone number or email address of end-user
    escalated           BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- weekly_stats
CREATE TABLE IF NOT EXISTS public.weekly_stats (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id         UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    week_start          DATE NOT NULL,
    enquiries_handled   INT NOT NULL DEFAULT 0,
    messages_sent       INT NOT NULL DEFAULT 0,
    escalations         INT NOT NULL DEFAULT 0,
    hours_saved         NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (customer_id, week_start)
);

-- change_requests
CREATE TABLE IF NOT EXISTS public.change_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id     UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    contact_name    TEXT,
    contact_email   TEXT,
    business_name   TEXT,
    request_type    TEXT,                              -- e.g. 'swap', 'update_faqs', 'add_channel', 'pause'
    new_agent       TEXT,
    details         TEXT,
    urgency         TEXT DEFAULT 'normal',
    status          TEXT NOT NULL DEFAULT 'open',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_customers_portal_token       ON public.customers(portal_token);
CREATE INDEX IF NOT EXISTS idx_customers_status             ON public.customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_stripe_customer    ON public.customers(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_agent_configs_customer_id    ON public.agent_configs(customer_id);
CREATE INDEX IF NOT EXISTS idx_agent_configs_whatsapp       ON public.agent_configs(whatsapp_number);
CREATE INDEX IF NOT EXISTS idx_agent_configs_is_active      ON public.agent_configs(is_active);

CREATE INDEX IF NOT EXISTS idx_conversations_customer_id    ON public.conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at     ON public.conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_channel        ON public.conversations(channel);

CREATE INDEX IF NOT EXISTS idx_weekly_stats_customer_id     ON public.weekly_stats(customer_id);
CREATE INDEX IF NOT EXISTS idx_weekly_stats_week_start      ON public.weekly_stats(week_start DESC);

CREATE INDEX IF NOT EXISTS idx_change_requests_customer_id  ON public.change_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_change_requests_status       ON public.change_requests(status);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_customers_updated_at
    BEFORE UPDATE ON public.customers
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_agent_configs_updated_at
    BEFORE UPDATE ON public.agent_configs
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.customers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_configs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_stats     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_requests  ENABLE ROW LEVEL SECURITY;

-- Service role bypass (used by n8n and backend workers)
-- The service_role key bypasses RLS automatically in Supabase.
-- The policies below allow the anon/authenticated role to read only their own data
-- via a portal_token JWT claim or direct match.

-- Allow the service role full access (Supabase handles this automatically,
-- but explicit policies make intent clear)

-- customers: anon can read a single row by matching portal_token
-- (used by the client-side portal)
CREATE POLICY "customers_read_by_portal_token"
    ON public.customers
    FOR SELECT
    TO anon
    USING (portal_token = (current_setting('request.jwt.claims', true)::JSONB ->> 'portal_token')::UUID);

-- agent_configs: anon can read configs for their customer_id
CREATE POLICY "agent_configs_read_own"
    ON public.agent_configs
    FOR SELECT
    TO anon
    USING (
        customer_id IN (
            SELECT id FROM public.customers
            WHERE portal_token = (current_setting('request.jwt.claims', true)::JSONB ->> 'portal_token')::UUID
        )
    );

-- conversations: anon can read own conversations
CREATE POLICY "conversations_read_own"
    ON public.conversations
    FOR SELECT
    TO anon
    USING (
        customer_id IN (
            SELECT id FROM public.customers
            WHERE portal_token = (current_setting('request.jwt.claims', true)::JSONB ->> 'portal_token')::UUID
        )
    );

-- weekly_stats: anon can read own stats
CREATE POLICY "weekly_stats_read_own"
    ON public.weekly_stats
    FOR SELECT
    TO anon
    USING (
        customer_id IN (
            SELECT id FROM public.customers
            WHERE portal_token = (current_setting('request.jwt.claims', true)::JSONB ->> 'portal_token')::UUID
        )
    );

-- change_requests: anon can read own and insert new ones
CREATE POLICY "change_requests_read_own"
    ON public.change_requests
    FOR SELECT
    TO anon
    USING (
        customer_id IN (
            SELECT id FROM public.customers
            WHERE portal_token = (current_setting('request.jwt.claims', true)::JSONB ->> 'portal_token')::UUID
        )
    );

CREATE POLICY "change_requests_insert_own"
    ON public.change_requests
    FOR INSERT
    TO anon
    WITH CHECK (
        customer_id IN (
            SELECT id FROM public.customers
            WHERE portal_token = (current_setting('request.jwt.claims', true)::JSONB ->> 'portal_token')::UUID
        )
    );

-- ============================================================
-- SAMPLE / DEMO DATA
-- ============================================================

-- Insert demo customer with known portal_token for testing
-- portal_token is stored as UUID; we cast the string to UUID
INSERT INTO public.customers (
    id,
    email,
    name,
    business_name,
    plan,
    status,
    stripe_customer_id,
    stripe_subscription_id,
    portal_token,
    sector,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'demo@theharbourinn.co.uk',
    'Sarah Mitchell',
    'The Harbour Inn',
    'growth',
    'active',
    'cus_demo_harbour_inn',
    'sub_demo_harbour_inn',
    gen_random_uuid(),
    'hospitality',
    NOW() - INTERVAL '14 days',
    NOW() - INTERVAL '2 days'
) ON CONFLICT (email) DO NOTHING;

-- Insert agent config for demo customer
INSERT INTO public.agent_configs (
    customer_id,
    agent_type,
    system_prompt,
    business_name,
    sector,
    tone,
    faqs,
    escalation_name,
    escalation_phone,
    whatsapp_number,
    email_address,
    website_url,
    channels,
    is_active
)
SELECT
    c.id,
    'receptionist',
    'You are the friendly AI receptionist for The Harbour Inn, a boutique hotel and restaurant on the Cornish coast. You handle table reservations, room enquiries, and general questions. Always be warm, welcoming, and helpful. If someone asks about availability, check what information they need and let them know a team member will confirm within 2 hours. For urgent matters, direct guests to call 01326 555 100.',
    'The Harbour Inn',
    'hospitality',
    'warm and professional',
    '[
        {"q": "Do you have parking?", "a": "Yes, we have free parking for up to 30 cars directly behind the inn."},
        {"q": "Do you allow dogs?", "a": "Absolutely! We are dog-friendly in the bar area and on the terrace. Dogs are not permitted in the restaurant dining room."},
        {"q": "What time is check-in?", "a": "Check-in is from 3pm. Early check-in can sometimes be arranged — just ask when you book."},
        {"q": "Do you have a vegetarian menu?", "a": "Yes, we have an extensive vegetarian and vegan menu. Please let us know about any dietary requirements when booking."}
    ]'::JSONB,
    'James (Manager)',
    '+44 1326 555 100',
    '+44 7700 900 123',
    'hello@theharbourinn.co.uk',
    'https://theharbourinn.co.uk',
    '["whatsapp", "email"]'::JSONB,
    TRUE
FROM public.customers c
WHERE c.email = 'demo@theharbourinn.co.uk'
ON CONFLICT DO NOTHING;

-- Insert sample weekly stats (last 4 weeks)
INSERT INTO public.weekly_stats (customer_id, week_start, enquiries_handled, messages_sent, escalations, hours_saved)
SELECT
    c.id,
    (DATE_TRUNC('week', NOW()) - (n * INTERVAL '7 days'))::DATE,
    (30 + (RANDOM() * 40)::INT),
    (80 + (RANDOM() * 120)::INT),
    (RANDOM() * 5)::INT,
    ROUND((4 + RANDOM() * 8)::NUMERIC, 2)
FROM public.customers c
CROSS JOIN GENERATE_SERIES(1, 4) AS gs(n)
WHERE c.email = 'demo@theharbourinn.co.uk'
ON CONFLICT (customer_id, week_start) DO NOTHING;

-- Insert sample conversations
INSERT INTO public.conversations (customer_id, agent_type, channel, direction, message_content, contact_name, contact_identifier, escalated)
SELECT
    c.id,
    'receptionist',
    'whatsapp',
    'inbound',
    'Hi, do you have a table for 4 this Saturday evening around 7pm?',
    'Mark Thompson',
    '+44 7900 111 222',
    FALSE
FROM public.customers c WHERE c.email = 'demo@theharbourinn.co.uk';

INSERT INTO public.conversations (customer_id, agent_type, channel, direction, message_content, contact_name, contact_identifier, escalated)
SELECT
    c.id,
    'receptionist',
    'whatsapp',
    'outbound',
    'Hi Mark! Thanks for getting in touch with The Harbour Inn. We''d love to have you. Our Saturday 7pm is looking busy but I''m checking availability now — a team member will confirm within the next 2 hours. Can I take your surname to hold a provisional booking?',
    'Mark Thompson',
    '+44 7900 111 222',
    FALSE
FROM public.customers c WHERE c.email = 'demo@theharbourinn.co.uk';

INSERT INTO public.conversations (customer_id, agent_type, channel, direction, message_content, contact_name, contact_identifier, escalated)
SELECT
    c.id,
    'receptionist',
    'email',
    'inbound',
    'Hello, we are looking for a room for 2 nights next weekend, 4th and 5th April. Do you have availability?',
    'Jenny & Paul Davies',
    'jenny.davies@gmail.com',
    FALSE
FROM public.customers c WHERE c.email = 'demo@theharbourinn.co.uk';

-- Insert a sample change request
INSERT INTO public.change_requests (customer_id, request_type, details, status)
SELECT
    c.id,
    'update_faq',
    'Please add a FAQ about our new afternoon tea menu, available Friday to Sunday 2pm-5pm, £24.50 per person.',
    'pending'
FROM public.customers c WHERE c.email = 'demo@theharbourinn.co.uk';

-- ============================================================
-- HELPER VIEW: customer_dashboard
-- Used by the portal to fetch everything in one query
-- ============================================================

CREATE OR REPLACE VIEW public.customer_dashboard AS
SELECT
    c.id,
    c.email,
    c.name,
    c.business_name,
    c.plan,
    c.status,
    c.portal_token,
    c.sector,
    c.created_at                                AS customer_since,
    ac.agent_type,
    ac.is_active,
    ac.channels,
    ws.enquiries_handled                        AS last_week_enquiries,
    ws.hours_saved                              AS last_week_hours_saved,
    ws.messages_sent                            AS last_week_messages_sent,
    ws.escalations                              AS last_week_escalations
FROM public.customers c
LEFT JOIN public.agent_configs ac ON ac.customer_id = c.id AND ac.is_active = TRUE
LEFT JOIN LATERAL (
    SELECT * FROM public.weekly_stats
    WHERE customer_id = c.id
    ORDER BY week_start DESC
    LIMIT 1
) ws ON TRUE;

-- Grant select on the view to anon (portal JS reads this)
GRANT SELECT ON public.customer_dashboard TO anon;
