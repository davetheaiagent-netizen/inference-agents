# Facebook API Setup Guide

This guide walks you through setting up Facebook API credentials for the Facebook AI Agent.

## Step 1: Create Meta Developer App

1. Go to https://developers.facebook.com
2. Click **"My Apps"** → **"Create App"**
3. Select **"Other"** → **"Consumer"**
4. App name: `DaveTheMasterAgent-Facebook`

## Step 2: Configure Products

Add the following products:

### Facebook Login
1. Go to **"Products"** → **"Facebook Login"**
2. Click **"Set Up"**
3. Add redirect URI: `https://yourdomain.com/callback`

### Messenger (for bot)
1. Go to **"Products"** → **"Messenger"**
2. Click **"Set Up"**

### Facebook Marketing API
1. Go to **"Products"** → **"Facebook Marketing API"**
2. Click **"Set Up"**

## Step 3: Get Credentials

1. Go to **"Settings"** → **"Basic"**
2. Note:
   - **App ID**
   - **App Secret**

## Step 4: Get Page Access Token

1. Go to **"Tools"** → **"Graph API Explorer"**
2. Select your app
3. Add permissions:
   - `pages_manage_posts`
   - `pages_read_engagement`
   - `pages_manage_messages`
   - `ads_management`
4. Click **"Get Token"** → **"Get Page Access Token"**
5. Copy the token

## Step 5: Configure Webhooks (Optional)

1. Go to **"Products"** → **"Webhooks"**
2. Add callback URL
3. Verify challenge

## Step 6: Environment Variables

```bash
# Facebook Credentials
FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret
FACEBOOK_ACCESS_TOKEN=your_page_access_token
FACEBOOK_PAGE_ID=your_page_id
MESSENGER_PAGE_ID=your_messenger_page_id
```

## Important Notes

### API Limits
- 200 calls/hour per page (standard)
- Can increase with app review

### Required Permissions
| Feature | Permissions |
|---------|-------------|
| Post to page | `pages_manage_posts` |
| Read engagement | `pages_read_engagement` |
| Manage messages | `pages_manage_messages` |
| Manage ads | `ads_management` |

### Facebook Rules
- No spam or aggressive automation
- Authentic engagement only
- Follow community standards

## Troubleshooting

### "Permission denied"
- Request additional permissions
- Complete app review for advanced features

### "Page not found"
- Verify page ID
- Ensure page is published

### "Rate limited"
- Implement rate limiting
- Reduce automation frequency

## Need Help?

Contact: hello@hello@inferenceagents.com
