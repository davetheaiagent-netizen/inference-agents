# Reddit API Setup Guide

This guide walks you through setting up Reddit API credentials for the Reddit AI Agent.

## Step 1: Create a Reddit App

1. Go to https://www.reddit.com/prefs/apps
2. Click **"are you a developer? create an app..."** at the bottom
3. Fill in the details:
   - **name**: `DaveTheMasterAgent` (or your preferred name)
   - **app type**: Select **"script"**
   - **description**: `AI agent for monitoring and engagement`
   - **about url**: `https://inference-agents.com`
   - **redirect uri**: `http://localhost`
4. Click **"create app"**

## Step 2: Get Your Credentials

After creating the app, you'll see:
- **CLIENT ID** - 14-character string (under the app name)
- **CLIENT SECRET** - Shown after creation

## Step 3: Get Your Reddit Username

Note down your Reddit username (the one you used to log in).

## Step 4: Configure Environment Variables

Create a `.env` file in your project root:

```bash
# Reddit API Credentials
REDDIT_CLIENT_ID=your_client_id_here
REDDIT_CLIENT_SECRET=your_client_secret_here
REDDIT_USERNAME=your_reddit_username
REDDIT_PASSWORD=your_reddit_password
```

## Step 5: Test the Agent

```javascript
const RedditAIAgent = require('./workers/reddit-agent');

const agent = new RedditAIAgent({
  subreddits: ['entrepreneur', 'smallbusiness', 'SaaS'],
  keywords: ['ai', 'automation', 'marketing']
});

agent.findLeads().then(leads => {
  console.log(`Found ${leads.length} leads`);
  leads.forEach(lead => {
    console.log(`[${lead.relevance}] ${lead.title}`);
    console.log(`Score: ${lead.leadScore} | ${lead.permalink}\n`);
  });
});
```

## Important Notes

### Rate Limits
- Reddit API allows 60 requests per minute
- The agent includes rate limiting automatically
- For higher limits, apply to Reddit for premium access

### Reddit Rules
- **90/10 rule**: 90% value, 10% promotion
- Don't spam - Reddit will ban you
- Always add value before promoting

### Security
- Never commit `.env` to git
- Store credentials in Cloudflare Workers environment variables
- Rotate secrets periodically

## Troubleshooting

### "Invalid credentials" error
- Double-check your client ID and secret
- Make sure the app is set to "script" type

### "Rate limited" error
- Wait 10 minutes and try again
- Reduce the number of subreddits monitored

### Posts not appearing
- Check that your app has been approved by Reddit
- Ensure you're using OAuth endpoint, not old API

## Need Help?

Contact: hello@hello@inferenceagents.com
