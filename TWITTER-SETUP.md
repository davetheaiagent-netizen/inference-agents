# Twitter/X API Setup Guide

This guide walks you through setting up Twitter/X API credentials for the Twitter AI Agent.

## Step 1: Apply for Twitter Developer Account

1. Go to https://developer.twitter.com
2. Sign up for a developer account
3. Select **"Creating a product"** or **"Making automated bot"**
4. Fill in your use case:
   - Name: `DaveTheMasterAgent`
   - Use case: `Automating social media posts and engagement for clients`

## Step 2: Create a Project

1. In the developer portal, click **"Create Project"**
2. Project name: `AI Agent Automation`
3. Select **"Automated"** or **"Free"** tier

## Step 3: Get API Keys

1. Go to your project **Keys and Tokens**
2. Generate:
   - **API Key** (Bearer Token)
   - **API Key Secret**
   - **Access Token**
   - **Access Token Secret**

## Step 4: Configure Environment Variables

```bash
# Twitter API Credentials
TWITTER_API_KEY=your_api_key
TWITTER_API_SECRET=your_api_secret
TWITTER_ACCESS_TOKEN=your_access_token
TWITTER_ACCESS_SECRET=your_access_token_secret
TWITTER_BEARER_TOKEN=your_bearer_token
```

## Step 5: Set Up Webhooks (Optional)

For real-time mentions, set up webhook URL:
- URL: `https://inference-agents.com/api/twitter-webhook`

## Important Notes

### Twitter API Tiers

| Tier | Cost | Rate Limits |
|------|------|-------------|
| Free | $0 | 1,500 tweets/month |
| Basic | $100/mo | 10,000 tweets/month |
| Pro | $5,000/mo | 1M tweets/month |

### Twitter Rules
- Don't spam - aggressive automation leads to bans
- Space out automated actions
- Always add value to conversations

## Troubleshooting

### "Unauthorized" error
- Regenerate your tokens
- Check app permissions

### "Rate limited" error
- Upgrade to paid tier for higher limits
- Implement backoff strategy

### Account suspended
- Reduce automation frequency
- Appeal through developer portal

## Need Help?

Contact: hello@hello@inferenceagents.com
