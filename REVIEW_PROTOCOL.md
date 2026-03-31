# Review Protocol — For Claude (Supervisor Sessions)

This document tells Claude (Dave) how to review OpenClaw agent work when Dave checks in.

---

## When Dave asks you to review agent work

1. **Read WORK_LOG.md** — scan all entries since your last review
2. **Check TASK_BACKLOG.md** — see what was supposed to be done vs what actually got done
3. **Spot-check the HTML files** mentioned in recent work log entries — look for:
   - Pricing errors (must be £99 / £199 / £399 — nothing else)
   - Missing GA4 script in `<head>`
   - Wrong nav links (must be exactly 5: Services, Sectors, Pricing, Blog, Contact)
   - US English spellings (check for "color", "organize", "favorite", "$")
   - Invented statistics (only use numbers from AGENT_BRIEFING.md)
   - Missing deploy (every task should end with a deploy + log entry)
4. **Write feedback to CLAUDE_FEEDBACK.md** — append a new entry with:
   - Overall quality assessment
   - Any specific errors to fix (with file names and line numbers if possible)
   - Corrected priorities for the next work session
   - Any specific guidance the agent needs

---

## Common agent mistakes to watch for

| Error | How to identify | How to fix |
|-------|-----------------|------------|
| Wrong pricing | Search for £149, £299, £499, £599, £799 | Correct to £99/£199/£399 |
| US English | Search for "color:", "organize", "favorite" | Replace with UK equivalents |
| Missing GA4 | Check `<head>` for `G-RQEVHHCQ07` | Add the standard GA4 block |
| Bad nav | Count nav links — must be exactly 5 | Remove extras, use standard 5 |
| Not deployed | WORK_LOG.md says "Deployed: No" | Ask agent to deploy |
| Missing schema | Blog posts need Article + FAQPage JSON-LD | Add both schemas |
| Invented stats | Numbers not in AGENT_BRIEFING.md | Remove or replace with verified numbers |

---

## How to write feedback that agents will follow

- Be specific: say "line 47 of hospitality-ai.html has wrong pricing" not "pricing is wrong somewhere"
- Prioritise: list corrections in order of severity (wrong pricing > missing deploy > style issues)
- Be clear about urgency: prefix critical issues with **[FIX NOW]** and nice-to-haves with **[LOW]**
- Always end with "Next priorities:" so the agent knows exactly what to do next

---

## Reviewing blog post quality

For any new blog posts, check:
- [ ] Word count approximately 1,000–1,800 words
- [ ] Article JSON-LD schema in `<head>`
- [ ] FAQPage JSON-LD schema in `<head>` (3-5 questions)
- [ ] "Related reading" section before the CTA section
- [ ] At least one link to a sector page
- [ ] At least one link to consultation.html or roi-calculator.html
- [ ] datePublished set correctly
- [ ] Added to sitemap.xml
- [ ] Added to blog.html index

---

## Reviewing new sector/landing pages

For any new pages, check:
- [ ] Standard page template used (see AGENT_BRIEFING.md)
- [ ] Canonical URL correct
- [ ] Meta description under 150 chars
- [ ] Favicon included
- [ ] nav.js, analytics.js, cookies.js all loaded
- [ ] Page added to sitemap.xml
- [ ] Footer links all correct

---
