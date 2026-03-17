#!/bin/bash
# Deploy Inference Agents website to Cloudflare Pages

echo "☁️ Deploying to Cloudflare Pages..."

cd "$(dirname "$0")"

# Check if wrangler CLI is installed
if ! command -v wrangler &> /dev/null; then
    echo "Installing Wrangler CLI..."
    npm install -g wrangler
fi

# Deploy
wrangler pages deploy . --project-name=inference-agents

echo ""
echo "✅ Deployment complete!"
echo "Your site is live at https://inference-agents.com"
