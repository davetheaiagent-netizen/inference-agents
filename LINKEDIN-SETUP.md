# LinkedIn API Setup Guide

This guide walks you through setting up LinkedIn API credentials for the LinkedIn AI Agent.

## Step 1: Create LinkedIn Developer App

1. Go to https://www.linkedin.com/developers/apps
2. Click **"Create App"**
3. Fill in details:
   - **App name**: `DaveTheMasterAgent`
   - **Company**: Select or create a company page
   - **Privacy policy URL**: Your website privacy policy
   - **App logo**: Upload a logo (can use placeholder)

## Step 2: Configure Products

1. Go to **"Products"** tab
2. Select **"Sign In with LinkedIn"** (required for basic access)
3. Select **"Share on LinkedIn"** (for posting)
4. Apply for access and wait for approval (usually 1-2 weeks)

## Step 3: Get Credentials

1. Go to **"Auth"** tab
2. Note:
   - **Client ID** (Application ID)
   - **Client Secret**
3. Add redirect URL:
   - `http://localhost/callback`
   - `https://inference-agents.com/callback`

## Step 4: Configure Environment Variables

```bash
# LinkedIn API Credentials
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret
LINKEDIN_ACCESS_TOKEN=your_access_token
LINKEDIN_COMPANY_ID=your_company_id
```

## Step 5: Generate Access Token

```bash
# Get access token via OAuth
# 1. Visit: https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&scope=r_liteprofile%20r_emailaddress%20w_member_social

# 2. After auth, exchange code for token
# POST to https://www.linkedin.com/oauth/v2/accessToken
```

## Important Notes

### LinkedIn API Limits

| Action | Limit |
|--------|-------|
| Profile reads | 500/day |
| Posts | 100/day |
| Invitations | 100/week |

### LinkedIn Rules
- B2B focus - LinkedIn is professional
- No spam connections
- Authentic engagement only

## Troubleshooting

### "Token expired" error
- Refresh tokens expire in ~60 days
- Implement token refresh flow

### "Permission denied" error
- Check app has required product access
- Verify OAuth scope includes needed permissions

### App not approved
- LinkedIn has strict review process
- Provide detailed use case
- May take 1-2 weeks

## Alternative: Use Third-Party Tools

If LinkedIn API approval is challenging:
- Use **Zapier** for basic automation
- Use **Phantombuster** for data extraction
- Use **MeetAlfred** for outreach automation

## Need Help?

Contact: hello@hello@inferenceagents.com
