# YouTube API Setup Guide

This guide walks you through setting up YouTube API credentials for the YouTube AI Agent.

## Step 1: Create Google Cloud Project

1. Go to https://console.cloud.google.com
2. Click **"New Project"**
3. Name: `DaveTheMasterAgent-YouTube`
4. Click **"Create"**

## Step 2: Enable YouTube APIs

1. Go to **"APIs & Services"** → **"Library"**
2. Search and enable:
   - **YouTube Data API v3**
   - **YouTube Analytics API**
   - **YouTube Reporting API**

## Step 3: Create Credentials

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. Application type: **"Web application"**
4. Add authorized redirect URIs:
   - `http://localhost`
   - `https://yourdomain.com/callback`
5. Click **"Create"**
6. Note your:
   - **Client ID**
   - **Client Secret**

## Step 4: Configure OAuth Consent

1. Go to **"OAuth consent screen"**
2. User Type: **"External"**
3. Fill in:
   - App name
   - Support email
   - Developer contact
4. Add scopes:
   - `https://www.googleapis.com/auth/youtube`
   - `https://www.googleapis.com/auth/youtube.force-ssl`
   - `https://www.googleapis.com/auth/yt-analytics.readonly`
5. Add test users (for development)

## Step 5: Get Access Token

```bash
# Exchange authorization code for tokens
curl -X POST https://oauth2.googleapis.com/token \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "redirect_uri=YOUR_REDIRECT_URI" \
  -d "grant_type=authorization_code" \
  -d "code=AUTHORIZATION_CODE"
```

## Step 6: Configure Environment Variables

```bash
# YouTube API Credentials
YOUTUBE_CLIENT_ID=your_client_id
YOUTUBE_CLIENT_SECRET=your_client_secret
YOUTUBE_REDIRECT_URI=your_redirect_uri
YOUTUBE_ACCESS_TOKEN=your_access_token
YOUTUBE_REFRESH_TOKEN=your_refresh_token
YOUTUBE_CHANNEL_ID=your_channel_id
```

## Important Notes

### API Quotas
- Default: 10,000 units/day
- Can request higher quota

### Key Quota Costs
| Operation | Units |
|-----------|-------|
| video.insert | 1,600 |
| video.update | 50 |
| video.list | 1 |
| channel.list | 1 |

### YouTube Rules
- No fake engagement
- Authentic content only
- Follow community guidelines

## Troubleshooting

### "Quota exceeded"
- Apply for higher quota
- Optimize API calls

### "Video not found"
- Check video ID
- Verify channel ownership

### "OAuth token expired"
- Use refresh token to get new access token

## Need Help?

Contact: hello@hello@inferenceagents.com
