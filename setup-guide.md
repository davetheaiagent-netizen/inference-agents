# Inference Agents — System Setup Guide

Complete step-by-step guide for Dave to get the full Inference Agents stack running from scratch.

**Stack:** Supabase (database) · n8n (orchestration) · 360Dialog (WhatsApp) · Resend (email) · Stripe (payments) · Claude API (LLM) · Cloudflare Pages + Workers (hosting)

---

## Prerequisites

- A VPS or cloud server (Ubuntu 22.04 recommended, minimum 2GB RAM) — DigitalOcean, Hetzner, or AWS Lightsail all work fine
- A domain pointed at that server (or use n8n.cloud to skip self-hosting)
- Node.js 18+ installed locally (for Cloudflare Wrangler CLI)
- Accounts already created or ready to create at: Supabase, Stripe, Resend, 360Dialog, Anthropic, Cloudflare

---

## Step 1 — Set Up Supabase (Database)

### 1.1 Create the project

1. Go to [supabase.com](https://supabase.com) and sign in / create an account.
2. Click **New project**.
3. Choose **Organisation** (create one if needed).
4. Set **Project name**: `inference-agents-prod`
5. Set a strong **Database Password** — save this somewhere secure.
6. Set **Region**: `eu-west-2` (London) or `eu-central-1` (Frankfurt) — keep it EU for UK GDPR compliance.
7. Click **Create new project** and wait ~2 minutes for it to provision.

### 1.2 Run the schema SQL

1. In your Supabase project, go to **SQL Editor** (left sidebar).
2. Click **New query**.
3. Open `supabase-schema.sql` from this repo, copy the entire contents, paste it into the editor.
4. Click **Run** (or press Cmd+Enter).
5. You should see "Success. No rows returned" for most statements — that's correct.
6. Navigate to **Table Editor** and confirm these tables exist: `customers`, `agent_configs`, `conversations`, `weekly_stats`, `change_requests`.
7. Check **customers** table — you should see the demo row for `demo@theharbourinn.co.uk`.

### 1.3 Grab your credentials

1. Go to **Settings → API** in your Supabase project.
2. Copy and save:
   - **Project URL** — looks like `https://abcdefghijklm.supabase.co`
   - **anon public** key — safe to use in frontend code
   - **service_role** key — **keep this secret**, never expose in frontend. Used by n8n.

---

## Step 2 — Set Up n8n

### Option A: Self-hosted on a VPS (recommended for production)

SSH into your VPS and run:

```bash
# Install Docker and Docker Compose if not already installed
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Create n8n data directory
mkdir -p ~/n8n-data

# Run n8n with Docker (replace N8N_HOST with your domain or server IP)
docker run -d \
  --name n8n \
  --restart unless-stopped \
  -p 5678:5678 \
  -e N8N_HOST="n8n.inference-agents.com" \
  -e N8N_PORT=5678 \
  -e N8N_PROTOCOL=https \
  -e WEBHOOK_URL="https://n8n.inference-agents.com" \
  -e GENERIC_TIMEZONE="Europe/London" \
  -e TZ="Europe/London" \
  -e N8N_ENCRYPTION_KEY="$(openssl rand -hex 32)" \
  -e SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co" \
  -e SUPABASE_SERVICE_KEY="YOUR_SERVICE_ROLE_KEY" \
  -e RESEND_API_KEY="re_YOUR_RESEND_KEY" \
  -e ANTHROPIC_API_KEY="sk-ant-YOUR_ANTHROPIC_KEY" \
  -e DIALOG360_API_KEY="YOUR_360DIALOG_KEY" \
  -v ~/n8n-data:/home/node/.n8n \
  n8nio/n8n
```

Then set up a reverse proxy (Nginx + Certbot recommended):

```bash
# Install Nginx and Certbot
sudo apt install -y nginx certbot python3-certbot-nginx

# Create nginx config for n8n
sudo nano /etc/nginx/sites-available/n8n

# Paste this into the file:
server {
    server_name n8n.inference-agents.com;
    location / {
        proxy_pass http://localhost:5678;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

sudo ln -s /etc/nginx/sites-available/n8n /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d n8n.inference-agents.com
```

### Option B: n8n Cloud (easier, no server management)

1. Go to [app.n8n.cloud](https://app.n8n.cloud) and sign up.
2. Choose the **Starter** or **Pro** plan.
3. Your n8n instance URL will be something like `https://your-name.app.n8n.cloud`.
4. Set environment variables via **Settings → Environment Variables** in the n8n UI.

---

## Step 3 — Import the n8n Workflow JSON

1. Open your n8n instance in a browser.
2. Click the **+** button or go to **Workflows → New**.
3. Click the three-dot menu (top right) → **Import from file**.
4. Select `n8n-workflow.json` from this repo.
5. n8n will import both workflows:
   - `Inference Agents — Master Onboarding & Agent Loop`
   - `WhatsApp Message Handler`
6. Review each workflow — nodes will show as having missing credentials until you connect them (Step 4).
7. Click **Save** for each workflow.

---

## Step 4 — Set n8n Environment Variables

If self-hosted via Docker, you set these in the `docker run` command (Step 2). If using n8n Cloud or you need to update them:

1. In n8n, go to **Settings → Environment Variables**.
2. Add the following:

| Variable | Where to get it |
|---|---|
| `SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `SUPABASE_SERVICE_KEY` | Supabase → Settings → API → service_role key |
| `RESEND_API_KEY` | Resend → API Keys (Step 6) |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |
| `DIALOG360_API_KEY` | 360Dialog Partner Hub (Step 5) |

3. After saving, go back to each workflow and verify the HTTP Request nodes no longer show credential errors.

**Activate the workflows:**
- Open each workflow and toggle the **Active** switch in the top right to ON.

---

## Step 5 — Set Up 360Dialog (WhatsApp)

1. Go to [360dialog.com](https://www.360dialog.com) and sign up for a **Partner account** (required to manage multiple client numbers).
2. Complete the partner verification process (Meta Business verification required — takes 1–3 days).
3. Once approved, go to the **Partner Hub** and create your first WABA (WhatsApp Business Account) for testing.
4. Navigate to **API Keys** in the Partner Hub and generate an API key. Save it as `DIALOG360_API_KEY`.
5. Note your WhatsApp Business phone number — this goes into `agent_configs.whatsapp_number` in Supabase for each customer.
6. Set the **webhook URL** for inbound messages to your n8n webhook:
   - URL: `https://n8n.inference-agents.com/webhook/whatsapp-inbound`
   - Method: POST
   - (This is the URL of the "360Dialog Webhook" node in the WhatsApp Handler workflow.)

**For each new customer:**
- They need their own WhatsApp Business number. You can provision these through the 360Dialog Partner Hub.
- Add their number to `agent_configs.whatsapp_number` in Supabase.

---

## Step 6 — Set Up Resend (Email)

1. Go to [resend.com](https://resend.com) and sign up.
2. Click **Add Domain** and enter `inference-agents.com`.
3. Resend will give you DNS records to add — go to your Cloudflare DNS panel and add them:
   - An SPF TXT record
   - A DKIM TXT record
   - (Optional) A DMARC record — recommended for deliverability
4. Back in Resend, click **Verify** — takes a few minutes. You'll see green ticks when done.
5. Go to **API Keys** and click **Create API Key**.
   - Name: `n8n-production`
   - Permission: **Sending access** (not full access)
6. Copy the key and set it as `RESEND_API_KEY` in n8n.
7. In Resend, confirm the **From address** `hello@inference-agents.com` is verified.

**Testing emails:**
- You can use the Resend dashboard to see all sent emails and their delivery status.
- Before going live, send a test by manually triggering the welcome email node in n8n.

---

## Step 7 — Set Up Stripe Webhook

1. Log into the [Stripe Dashboard](https://dashboard.stripe.com).
2. Ensure your products are set up:
   - **Starter** — £99/month recurring
   - **Growth** — £199/month recurring
   - **Fullstack** — £399/month recurring
3. Go to **Developers → Webhooks**.
4. Click **Add endpoint**.
5. Set the endpoint URL to your n8n Stripe Trigger webhook URL. To find this:
   - In n8n, open the `Master Onboarding & Agent Loop` workflow.
   - Click the **Stripe Trigger** node.
   - The webhook URL is shown there — copy it.
6. Under **Select events**, choose: `checkout.session.completed`.
7. Click **Add endpoint**.
8. Copy the **Signing secret** (starts with `whsec_`) — you'll need this if you add Stripe signature verification to n8n later.
9. Run a **test** by using Stripe's "Send test webhook" button and verify n8n receives it.

---

## Step 8 — Deploy the Customer Portal (Cloudflare)

The customer portal (`portal.html`) is already deployed to Cloudflare Pages. The portal needs access to Supabase.

### 8.1 Deploy the Cloudflare Worker (if using a Worker for the portal API)

If you have a `portal.js` Cloudflare Worker that proxies Supabase:

```bash
# Install Wrangler CLI
npm install -g wrangler

# Authenticate
wrangler auth login

# Navigate to the worker directory
cd /path/to/your/worker

# Set environment secrets (these are encrypted at rest in Cloudflare)
wrangler secret put SUPABASE_URL
# Paste: https://YOUR_PROJECT_REF.supabase.co

wrangler secret put SUPABASE_SERVICE_KEY
# Paste: your service_role key

# Deploy
wrangler deploy
```

### 8.2 Set Cloudflare Pages environment variables

For the static site on Cloudflare Pages:

1. Go to Cloudflare Dashboard → **Pages** → `inference-agents`.
2. Go to **Settings → Environment variables**.
3. Add:
   - `SUPABASE_URL` = your Supabase project URL
   - `SUPABASE_ANON_KEY` = your Supabase anon/public key (safe for frontend)
4. Redeploy the site (push a commit or trigger a manual deploy).

---

## Step 9 — End-to-End Test

Run through this complete test checklist before taking live payments:

### Test the onboarding flow

1. **Simulate a Stripe payment:**
   - In Stripe test mode, go to **Developers → Webhooks** and click **Send test webhook**.
   - Select `checkout.session.completed`.
   - Check n8n execution log — you should see the workflow trigger.
   - Check Supabase `customers` table — a new row should appear.
   - Check your email inbox — you should receive the welcome email.

2. **Submit the onboarding form:**
   - The welcome email contains a link to `https://inference-agents.com/onboarding.html?token=XXX`.
   - Fill in the Tally form (you should have set the form's webhook URL to your n8n `Wait for Form Submission` node URL).
   - Check n8n — the `Update Agent Config` and `Generate System Prompt` nodes should fire.
   - Check Supabase `agent_configs` — a new row should appear with a generated system prompt.
   - Check your email — you should receive the "agent live" email.

3. **Test the WhatsApp handler:**
   - Send a WhatsApp message to your test business number.
   - Check n8n — the WhatsApp Handler workflow should trigger.
   - Check Supabase `conversations` — two rows should appear (inbound + outbound).
   - Confirm you receive a reply on WhatsApp.

4. **Test the weekly digest:**
   - In n8n, open the `Master Onboarding & Agent Loop` workflow.
   - Click the **Schedule: Weekly Digest** node and click **Execute node** to run it manually.
   - Check that all active customers (at least the demo customer) receive a digest email.

5. **Test the portal:**
   - Navigate to `https://inference-agents.com/portal.html?token=a1b2c3d4-e5f6-7890-abcd-ef1234560000`.
   - Confirm the demo customer's data loads correctly.

---

## Step 10 — Managing Customer Data Manually in Supabase

### Adding a new customer manually (e.g. if onboarded offline)

1. Go to Supabase → **Table Editor** → `customers`.
2. Click **Insert row**.
3. Fill in: `email`, `name`, `business_name`, `plan` (starter/growth/fullstack), `status` (start with `onboarding`).
4. Leave `portal_token` blank — it will auto-generate.
5. Click **Save**.
6. Note the `portal_token` UUID that was generated — this is the customer's portal link token.

### Updating a customer's agent config

1. Go to **Table Editor** → `agent_configs`.
2. Find the row with the matching `customer_id`.
3. Click the row to edit it inline, or click the pencil icon.
4. Update fields like `system_prompt`, `faqs`, `tone` as needed.
5. Click **Save**.
6. Changes take effect immediately on the next WhatsApp/email message the agent receives.

### Adding weekly stats manually (if not auto-generated)

1. Go to **Table Editor** → `weekly_stats`.
2. Click **Insert row**.
3. Fill in `customer_id`, `week_start` (date of Monday that week, e.g. `2026-03-23`), and the stat fields.
4. Click **Save**.

### Viewing conversations

1. Go to **Table Editor** → `conversations`.
2. Use the filter icon to filter by `customer_id` or `created_at` date range.
3. You can also run a SQL query in the SQL Editor for more detailed analysis:

```sql
SELECT
    cu.business_name,
    co.direction,
    co.channel,
    co.contact_name,
    co.message_content,
    co.escalated,
    co.created_at
FROM conversations co
JOIN customers cu ON cu.id = co.customer_id
WHERE co.created_at > NOW() - INTERVAL '7 days'
ORDER BY co.created_at DESC;
```

### Changing a customer's plan or status

1. Go to **Table Editor** → `customers`.
2. Find the customer row.
3. Edit `plan` or `status` inline.
4. Valid status values: `pending`, `onboarding`, `active`, `paused`, `churned`.
5. Setting status to `paused` or `churned` will exclude them from the weekly digest.

---

## Environment Variables Quick Reference

| Variable | Used In | Where to get it |
|---|---|---|
| `SUPABASE_URL` | n8n, Cloudflare Worker | Supabase → Settings → API |
| `SUPABASE_SERVICE_KEY` | n8n, Cloudflare Worker | Supabase → Settings → API |
| `SUPABASE_ANON_KEY` | Frontend JS | Supabase → Settings → API |
| `RESEND_API_KEY` | n8n | Resend → API Keys |
| `ANTHROPIC_API_KEY` | n8n | console.anthropic.com |
| `DIALOG360_API_KEY` | n8n | 360Dialog Partner Hub |
| `STRIPE_WEBHOOK_SECRET` | n8n (optional) | Stripe → Webhooks → Signing secret |

---

## Useful URLs (once live)

| Resource | URL |
|---|---|
| n8n dashboard | https://n8n.inference-agents.com |
| Supabase dashboard | https://app.supabase.com/project/YOUR_REF |
| Resend dashboard | https://resend.com/emails |
| Stripe dashboard | https://dashboard.stripe.com |
| 360Dialog Partner Hub | https://hub.360dialog.com |
| Customer portal (demo) | https://inference-agents.com/portal.html?token=a1b2c3d4-e5f6-7890-abcd-ef1234560000 |

---

## Troubleshooting

**n8n workflow not triggering on Stripe events:**
- Check the Stripe webhook is pointing to the correct URL.
- Check n8n is publicly accessible (not behind localhost).
- Check the workflow is set to Active in n8n.

**Supabase RLS blocking requests:**
- If n8n gets 401 errors from Supabase, confirm you're using the `service_role` key (not the anon key) in n8n HTTP Request headers.
- The service_role key bypasses RLS entirely.

**WhatsApp messages not triggering the workflow:**
- Confirm the 360Dialog webhook URL is set to the n8n webhook URL.
- Check the `agent_configs` table — the `whatsapp_number` must match exactly what 360Dialog sends in the `to` field of the webhook payload.
- Check n8n execution logs for errors in the "Extract WhatsApp Message" node.

**Emails going to spam:**
- Verify all DNS records in Resend are showing as verified (green ticks).
- Make sure DMARC is set up for `inference-agents.com`.
- Avoid spam-trigger words in subject lines.

**Claude API returning errors:**
- Check `ANTHROPIC_API_KEY` is set correctly and has credit.
- Check you're using a valid model name — update `claude-opus-4-5` in the HTTP Request node if needed.
