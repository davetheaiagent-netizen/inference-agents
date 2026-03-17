# OpenClaw Setup: The Larry Loop

This guide shows you how to build the viral TikTok automation system that generated 500K+ views in one week.

## What Is OpenClaw?

OpenClaw is an open-source agentic framework that turns AI into a digital employee. It can:
- Research niches and trends
- Generate content (images, videos, text)
- Analyze performance data
- Learn and iterate from feedback

## The Larry Loop Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Research   │ → │   Create    │ → │   Draft     │
│  (Browser)  │    │  (Images)   │    │  (TikTok)   │
└─────────────┘    └─────────────┘    └─────────────┘
       ↑                                        │
       │            ┌─────────────┐             │
       └────────────│  Analyze    │←────────────┘
                    │  (Data)     │
                    └─────────────┘
```

## Step 1: Install OpenClaw

```bash
# Clone the repository
git clone https://github.com/StormyAI/OpenClaw.git
cd OpenClaw

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env
```

## Step 2: Configure Environment

Edit `.env` file:

```bash
# OpenAI (for reasoning)
OPENAI_API_KEY=sk-...

# TikTok Credentials
TIKTOK_SESSION_ID=your_session_id

# Brave Search (for research)
BRAVE_API_KEY=your_brave_key

# Optional: Image Generation
ANTHROPIC_API_KEY=sk-ant-...

# WhatsApp (for control)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...
```

## Step 3: Create the Larry Skill

Create `skills/larry/skill.md`:

```markdown
# Larry - Viral TikTok Agent

## Role
You are Larry, an AI agent that creates viral TikTok content. Your goal is to find niches, create engaging slideshow videos, analyze performance, and iterate until content goes viral.

## Capabilities
- Research trending topics using Brave browser
- Generate images using DALL-E or Leonardo.ai
- Create slideshow videos
- Post to TikTok (as drafts)
- Analyze TikTok analytics data
- Learn from performance feedback

## The Loop
1. RESEARCH: Use browser to find trending niches and topics
2. CREATE: Generate images and create video content
3. DRAFT: Save to TikTok as draft (never auto-publish)
4. ANALYZE: Check performance metrics
5. ITERATE: Improve based on what works
6. REPEAT

## Rules
- Always save as draft first - never auto-publish
- Test multiple formats: slideshows, reactions, voiceovers
- Focus on high-engagement niches (wallpaper, motivation, apps)
- A/B test hooks and styles
- Never give up on first failure - iterate!

## Niche Research
Popular niches that work:
- App features (before/after)
- Productivity tips
- Wallpapers
- Life hacks
- Trending sounds + visual concepts
```

## Step 4: Configure Skills

Edit `config.yaml`:

```yaml
skills:
  enabled:
    - larry
  
skill_directory: ./skills

default_skill: larry
```

## Step 5: Run Larry

```bash
# Start the agent
python -m openclaw

# Or with a specific skill
python -m openclaw --skill larry
```

## Step 6: Control Via WhatsApp

Configure Twilio for WhatsApp control:

```python
# The agent responds to WhatsApp messages
# Just message it like a colleague!
```

Example commands:
- "What's trending in [niche]?"
- "Create 5 TikToks about [topic]"
- "Show me the analytics"
- "What worked best this week?"

## Key Lessons from Larry

### What Worked
1. **Slideshow format** - Highest engagement
2. **Real images, not AI-generated** - More authentic
3. **Multiple hooks** - Test, test, test
4. **Consistency** - Post daily, iterate fast

### What Failed (And How Larry Fixed It)
1. **AI-generated images** → Switched to stock + real photos
2. **AI faces detected** → Avoided AI faces entirely
3. **Wrong aspect ratio** → Fixed to 9:16 TikTok format
4. **Bad hooks** → A/B tested 100+ hooks

## Performance Metrics to Track

| Metric | Target |
|--------|--------|
| Views | 10K+ per video |
| Watch time | 50%+ completion |
| Engagement | 5%+ |
| Shares | 1%+ |

## Troubleshooting

### "Videos not getting traction"
- Try different niches
- Test new hooks
- Check trending sounds
- Improve thumbnail

### "Account restricted"
- Don't post too frequently
- Always use drafts first
- Avoid banned hashtags

### "Images look AI-generated"
- Use real stock photos
- Apply filters/effects
- Mix in user-generated content

## Next Steps

1. Start with one niche
2. Create 10-20 video drafts
3. Publish and track performance
4. Let Larry analyze and iterate
5. Scale to multiple niches

## Need Help?

Contact: hello@hello@inferenceagents.com
