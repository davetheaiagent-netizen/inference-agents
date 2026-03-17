# Instagram API Setup Guide

This guide walks you through setting up Instagram API credentials for the Instagram AI Agent.

## Step 1: Create Meta Developer App

1. Go to https://developers.facebook.com
2. Click **"My Apps"** → **"Create App"**
3. Select **"Other"** → **"Consumer"**
4. App name: `DaveTheMasterAgent-Instagram`
5. Add contact email

## Step 2: Configure Products

1. Go to **"Products"** in the left menu
2. Find **"Instagram Graph API"** and click **"Set up"**
3. Also add **"Meta Login"** product

## Step 3: Configure Instagram Basic Display

1. In Products, find **"Instagram Basic Display"**
2. Click **"Add Platform"** → **"Website"**
3. Add your website URL

## Step 4: Get API Credentials

1. Go to **"Settings"** → **"Basic"**
2. Note your:
   - **App ID**
   - **App Secret**
3. Click **"Add Platform"** → **"Website"**
4. Enter your site URL

## Step 5: Get Access Token

```
https://www.facebook.com/v18.0/dialog/oauth?
  client_id=YOUR_APP_ID
  &redirect_uri=YOUR_REDIRECT_URL
  &scope=instagram_basic,instagram_manage_messages,instagram_manage_comments,pages_show_list
```

## Step 6: Configure Environment Variables

```bash
# Instagram/Meta Credentials
INSTAGRAM_APP_ID=your_app_id
INSTAGRAM_APP_SECRET=your_app_secret
INSTAGRAM_ACCESS_TOKEN=your_access_token
INSTAGRAM_ACCOUNT_ID=your_account_id
PAGE_ID=your_page_id
```

## Important Notes

### API Limits
- 200 API calls/hour for basic features
- Higher limits available with app review

### Required Permissions
- `instagram_basic` - Access profile info
- `instagram_manage_messages` - Manage DMs
- `instagram_manage_comments` - Moderate comments
- `pages_show_list` - Access pages

### Instagram Rules
- No automation that violates ToS
- Don't spam likes/comments
- Authentic engagement only

## Troubleshooting

### "Invalid OAuth token"
- Regenerate access token
- Check token expiration

### "Permission denied"
- Request additional permissions
- Complete app review if needed

### "Rate limited"
- Implement exponential backoff
- Reduce automation frequency

## Need Help?

Contact: hello@hello@inferenceagents.com
