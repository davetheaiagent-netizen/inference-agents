# Inference Agents — Agent Briefing Document
**Read this file in full before starting any task on this project.**
Last updated: 2026-03-27

---

## What This Project Is

`inference-agents.com` is a static HTML website for a UK AI automation agency. The business sells AI agent subscriptions (£99–£399/month) to UK SMEs in hospitality, retail, professional services, and healthcare. The owner is Dave.

The site is hosted on **Cloudflare Pages**. All pages are plain HTML files. There is no CMS, no framework, no build step.

---

## Your Working Directory

```
/Users/davetheaiagent/websites/inference-agents/
```

All website files live here. This is also where you read and write your work log.

---

## How to Deploy Changes

After editing any HTML or JS/CSS file, deploy with:

```bash
cd /Users/davetheaiagent/websites/inference-agents
wrangler pages deploy . --project-name=inference-agents
```

Always deploy after completing a task. Log that you deployed in WORK_LOG.md.

---

## Tech Stack

- **HTML files** — every page is a standalone `.html` file, no templating
- **`styles-dark.css`** — shared dark theme stylesheet. Do NOT add global rules here without careful consideration.
- **`nav.js`** — dynamically injects hamburger mobile nav. Already works on all pages.
- **`analytics.js`** — GA4 consent-gated analytics. Already works on all pages.
- **`cookies.js`** — GDPR cookie consent banner. Already works on all pages.
- **Cloudflare Pages Functions** — serverless functions in `/functions/api/`
- **Formspree** — all forms submit to `https://formspree.io/f/xpwzgvzl`

---

## Design System — MUST FOLLOW

All pages use a dark theme. CSS variables (defined in `styles-dark.css`):

```css
--primary: #6366f1       /* indigo — main brand colour */
--primary-light: #818cf8 /* lighter indigo */
--primary-dark: #4f46e5  /* darker indigo */
--accent: #10b981        /* emerald green — success/highlights */
--bg: #05050f            /* very dark background */
--bg-card: rgba(255,255,255,0.055)  /* card background */
--text: #f1f5f9          /* primary text */
--text-muted: #94a3b8    /* secondary text */
--border: rgba(255,255,255,0.1)  /* borders */
```

---

## Standard Page Template

Every page MUST have this exact structure. Copy it precisely.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <!-- Google tag (gtag.js) — Consent Mode v2 -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-RQEVHHCQ07"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', wait_for_update: 500 });
    gtag('js', new Date());
    gtag('config', 'G-RQEVHHCQ07');
  </script>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PAGE TITLE | Inference Agents</title>
  <meta name="description" content="META DESCRIPTION — 150 chars max">
  <link rel="canonical" href="https://inference-agents.com/FILENAME.html">
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles-dark.css">
  <!-- page-specific styles here if needed -->
</head>
<body>
  <header>
    <div class="container">
      <nav>
        <a href="/" class="logo"><img src="logo.svg" alt="Inference Agents"></a>
        <ul class="nav-links">
          <li><a href="index.html#services">Services</a></li>
          <li><a href="index.html#sectors">Sectors</a></li>
          <li><a href="pricing.html">Pricing</a></li>
          <li><a href="blog.html">Blog</a></li>
          <li><a href="contact.html">Contact</a></li>
        </ul>
        <a href="consultation.html" class="btn">Book Free Call</a>
      </nav>
    </div>
  </header>

  <!-- PAGE CONTENT -->

  <section class="cta">
    <div class="container">
      <h2>Ready to [relevant CTA]?</h2>
      <p>[supporting line]</p>
      <a href="consultation.html" class="btn" style="padding:16px 40px; font-size:18px;">Book Free Call →</a>
    </div>
  </section>

  <footer>
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <a href="/" class="logo"><img src="logo.svg" alt="Inference Agents"></a>
          <p>AI automation agency helping UK businesses deploy autonomous AI agents that work 24/7.</p>
        </div>
        <div class="footer-col">
          <h4>Sectors</h4>
          <a href="hospitality-ai.html">Hospitality AI</a>
          <a href="retail-ai.html">Retail AI</a>
          <a href="professional-services-ai.html">Professional Services AI</a>
          <a href="healthcare-ai.html">Healthcare AI</a>
        </div>
        <div class="footer-col">
          <h4>Company</h4>
          <a href="blog.html">Blog</a>
          <a href="roi-calculator.html">ROI Calculator</a>
          <a href="case-studies.html">Case Studies</a>
          <a href="affiliate.html">Partner Program</a>
        </div>
        <div class="footer-col">
          <h4>Legal</h4>
          <a href="privacy.html">Privacy &amp; Cookie Policy</a>
          <a href="contact.html">Contact</a>
          <a href="consultation.html">Book Free Call</a>
          <a href="mailto:hello@inference-agents.com">hello@inference-agents.com</a>
        </div>
      </div>
      <div class="footer-bottom">© 2026 Inference Agents. All rights reserved. UK Business.</div>
    </div>
  </footer>

  <script src="nav.js"></script>
  <script src="analytics.js"></script>
  <script src="cookies.js"></script>
</body>
</html>
```

---

## Pricing — CRITICAL, Never Get This Wrong

| Plan | Price | Agents |
|------|-------|--------|
| Starter | £99/month | 1 AI agent |
| Growth Package | £199/month | 3 AI agents (most popular) |
| Full Stack | £399/month | All sector agents |

**Agent Rotation** — customers can swap agents each billing cycle:
- Starter: 1 swap per quarter
- Growth: 1 swap per agent per month
- Full Stack: Unlimited swaps
- Old agent configs saved 90 days when swapped

No setup fees. No contracts. Cancel any time.

---

## The Four Sectors

| Sector | Page | Key pain points |
|--------|------|-----------------|
| Hospitality | `hospitality-ai.html` | Staff turnover 30-40%, NLW rising, 24/7 guest enquiries |
| Retail | `retail-ai.html` | Customer query volume, cart abandonment, returns |
| Professional Services | `professional-services-ai.html` | Billable time lost to admin, late invoices |
| Healthcare | `healthcare-ai.html` | DNA rates (~18%), booking admin, patient comms |

---

## Key Stats (Use in Content)

- £2.1M+ saved for clients
- 97% cost saving vs equivalent staffing
- Live in 7 days
- 50+ UK businesses served
- Average client saves £3,000–£4,200/month

**Case study numbers (verified):**
- Cotswolds hotel: 31% more direct bookings, 4.8★, £2,100/month saved
- Manchester retailer: 70% queries handled by AI, £940/month cart recovery
- Birmingham law firm: £6,400 invoices recovered in 30 days
- South London dental: DNA rate 18%→4%, £4,700/month recovered

---

## Content Tone & Style

- **UK English** always (colour, organise, neighbour, £ not $)
- Warm, direct, no jargon, no corporate speak
- Short sentences. Short paragraphs. Scannable.
- Talk to the business owner, not a technical audience
- Avoid: "leverage", "utilise", "synergy", "cutting-edge", "game-changing"
- Use: "save", "handle", "cut", "recover", "automate", "free up"

---

## Blog Post Standards

Every blog post must have:
1. `Article` JSON-LD schema in `<head>`
2. `FAQPage` JSON-LD schema (3-5 questions) in `<head>`
3. Standard nav and footer
4. A "Related reading" section before the `<section class="cta">`
5. At least one internal link to a sector page
6. At least one internal link to `consultation.html` or `roi-calculator.html`
7. Word count: 1,000–1,800 words
8. Published date: 2026-03-27

**Blog article schema template:**
```html
<script type="application/ld+json">{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "TITLE",
  "description": "DESCRIPTION",
  "author": {"@type": "Organization", "name": "Inference Agents"},
  "publisher": {
    "@type": "Organization",
    "name": "Inference Agents",
    "logo": {"@type": "ImageObject", "url": "https://inference-agents.com/logo.svg"}
  },
  "datePublished": "2026-03-27",
  "dateModified": "2026-03-27",
  "url": "https://inference-agents.com/FILENAME.html"
}</script>
```

---

## Sitemap

After creating new pages, add them to `sitemap.xml`. Use this format:
```xml
<url>
  <loc>https://inference-agents.com/FILENAME.html</loc>
  <changefreq>monthly</changefreq>
  <priority>0.8</priority>
  <lastmod>2026-03-27</lastmod>
</url>
```

---

## Things You Must NEVER Do

1. **Never change pricing** — £99/£199/£399 are correct. Any other numbers are wrong.
2. **Never remove the GA4 script** from any page header.
3. **Never modify `styles-dark.css` global rules** without checking impact across all pages.
4. **Never use `console.log` in production JS** without wrapping in `try/catch`.
5. **Never use inline `position: relative` on `header`** — it already has `position: sticky`.
6. **Never create new CSS files** — all styles go inline in `<style>` blocks on the page or in `styles-dark.css`.
7. **Never use US English spellings.**
8. **Never invent statistics** — only use the verified numbers in this document.
9. **Never add nav links beyond** the standard 5: Services, Sectors, Pricing, Blog, Contact.
10. **Never deploy without logging what you did** in `WORK_LOG.md`.

---

## How to Update the Mission Control Kanban

When you complete a task, you must also update its status in `mission-control.html` so the visual board stays in sync.

In `mission-control.html`, find the `websiteTasks` array (search for `const websiteTasks`). Find the card matching your task by `id` or `title`, and change its `status` field:
- `'backlog'` → `'done'` when the task is complete
- `'backlog'` → `'in-progress'` if you start a task but don't finish it in this session
- Also add `date: 'DD Mon'` (e.g. `date: '27 Mar'`) to the done card

Example — marking w6 done:
```
{ id: 'w6', title: 'Internal links: blog.html → posts', ..., status: 'done', date: '28 Mar' },
```

Do this at the same time as marking `[DONE]` in `TASK_BACKLOG.md`. Both must be updated together.

---

## How to Log Your Work

After every completed task, append to `WORK_LOG.md`:

```
## [DATE] [TIME] — [TASK NAME]
**What I did:** [1-3 sentence description]
**Files changed:** [list of files]
**Deployed:** Yes / No
**Notes / Issues:** [anything unusual or uncertain]
---
```

---

## When You Are Unsure

If a task is ambiguous, do the most conservative interpretation. Write your uncertainty in `WORK_LOG.md` under "Notes / Issues" so Claude can review it.

Do not guess at pricing, statistics, or business facts. Refer only to this document for those.
