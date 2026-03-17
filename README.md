# Dave The Master Agent Website

## Quick Start

### View Locally
```bash
# Open in browser
open websites/davethemasteragent/index.html

# Or serve with Python
cd websites/davethemasteragent
python3 -m http.server 8000
# Then open http://localhost:8000
```

### Deploy to Cloudflare Pages
```bash
cd websites/inference-agents
wrangler pages deploy . --project-name=inference-agents
```

Or use the deploy script:
```bash
./deploy.sh
```

## Files

- `index.html` - Main website (10 products)
- `GTM-STRATEGY.md` - Go-to-market plan
- `YOUTUBE-SETUP.md` - YouTube channel guide
- `README.md` - This file
- `deploy.sh` - Deployment script

## Products (10 Total)

| # | Product | Price | Category |
|---|---------|-------|----------|
| 1 | Sales Agent Pro | $299/mo | Sales |
| 2 | Outreach Automator | $149/mo | Marketing |
| 3 | Security Sentinel | $399/mo | Security |
| 4 | Process Agent | $249/mo | Operations |
| 5 | Support Agent | $199/mo | Support |
| 6 | Content Agent | $179/mo | Content |
| 7 | Recruiter Agent | $349/mo | Recruiting |
| 8 | Finance Agent | $299/mo | Finance |
| 9 | Research Agent | $249/mo | Research |
| 10 | Custom Agent | Custom | Enterprise |

## Customization

Edit `index.html` to change:
- Contact email
- Pricing
- Services
- Colors (CSS variables at top)