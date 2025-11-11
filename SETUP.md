# Intune Feedback Tracker - Setup Guide

## Overview

This application tracks and analyzes customer feedback about Microsoft Intune from multiple sources using AI-powered classification and automated data ingestion.

## Prerequisites

1. **Lovable Cloud** - For database and edge functions
2. **Reddit API Access** - For ingesting posts from r/Intune
3. **Lovable AI** - For automated feedback classification

## Setup Steps

### 1. Enable Lovable Cloud

1. Click on the Cloud tab in your Lovable project
2. Enable Cloud if not already enabled
3. Wait for the Cloud instance to be provisioned

### 2. Set Up Database

The database schema will be automatically created when you run the migration:

```sql
-- Tables created:
- feedback_entries: Stores all feedback with AI classification
- weekly_reports: Stores automated weekly summaries
```

To apply the migration:
1. Go to Cloud → Database → Migrations
2. The migration file will be automatically detected and applied

### 3. Configure API Secrets

You need to add the following secrets in Cloud → Secrets:

#### Required Secrets:

1. **LOVABLE_API_KEY** (Auto-configured)
   - Automatically provided by Lovable Cloud
   - Used for AI classification

2. **REDDIT_CLIENT_ID** (Required)
   - Go to https://www.reddit.com/prefs/apps
   - Create a new app (type: script)
   - Copy the client ID (under the app name)

3. **REDDIT_CLIENT_SECRET** (Required)
   - Copy the secret from your Reddit app

#### Optional Secrets (for LinkedIn integration):

4. **LINKEDIN_ACCESS_TOKEN**
   - For LinkedIn API access (if implementing LinkedIn ingestion)

### 4. Deploy Edge Functions

The following edge functions are included:

1. **classify-feedback** - AI-powered classification of feedback
   - Path: `supabase/functions/classify-feedback`
   - Purpose: Classifies sentiment, topic, and feedback type

2. **ingest-reddit** - Reddit data ingestion
   - Path: `supabase/functions/ingest-reddit`
   - Purpose: Fetches posts from r/Intune and stores them

3. **generate-weekly-report** - Weekly report generation
   - Path: `supabase/functions/generate-weekly-report`
   - Purpose: Creates AI-generated weekly summaries

Edge functions are automatically deployed when you commit to your repository.

### 5. Set Up Scheduled Data Ingestion

To automatically fetch new feedback every 6 hours:

1. Go to Cloud → Functions
2. Find the `ingest-reddit` function
3. Set up a cron schedule: `0 */6 * * *` (every 6 hours)

For weekly reports (every Monday at 9 AM):

1. Find the `generate-weekly-report` function
2. Set up a cron schedule: `0 9 * * 1` (every Monday at 9 AM)

### 6. Test the Integration

#### Manual Test - Reddit Ingestion:

```bash
# Call the edge function manually
curl -X POST https://[your-project-id].supabase.co/functions/v1/ingest-reddit \
  -H "Authorization: Bearer [your-anon-key]"
```

#### Manual Test - Classification:

```bash
# Test AI classification
curl -X POST https://[your-project-id].supabase.co/functions/v1/classify-feedback \
  -H "Authorization: Bearer [your-anon-key]" \
  -H "Content-Type: application/json" \
  -d '{"content": "Having issues with macOS app deployment"}'
```

## Data Flow

```
┌─────────────────┐
│  Reddit API     │
│  r/Intune       │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│ ingest-reddit       │
│ Edge Function       │
│ (Runs every 6hrs)   │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ classify-feedback   │
│ (Lovable AI)        │
│ - Sentiment         │
│ - Topic             │
│ - Feedback Type     │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ feedback_entries    │
│ Database Table      │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ generate-weekly     │
│ -report             │
│ (Runs Mon 9 AM)     │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ weekly_reports      │
│ Database Table      │
└─────────────────────┘
```

## Frontend Integration

The app automatically displays:
- **Dashboard**: Real-time sentiment trends and stats
- **Topics**: Detailed topic analysis with search
- **Raw Feed**: Filterable table of all feedback
- **Reports**: AI-generated weekly summaries with export

Data is fetched from your Supabase database using the Supabase client.

## Extending the Application

### Add LinkedIn Integration

1. Create a new edge function `ingest-linkedin`
2. Use LinkedIn API or RSS feeds to fetch posts mentioning "Intune"
3. Follow the same pattern as `ingest-reddit`

### Add More Data Sources

1. TechCommunity forums
2. Twitter/X mentions
3. GitHub issues
4. Stack Overflow questions

### Customize AI Classification

Edit the system prompt in `classify-feedback/index.ts` to:
- Add more topics
- Change sentiment criteria
- Add custom categories

## Monitoring & Maintenance

### Check Edge Function Logs

1. Go to Cloud → Functions
2. Select the function
3. View logs for errors or issues

### Monitor AI Usage

1. Go to Settings → Workspace → Usage
2. Check Lovable AI request count
3. Top up credits if needed

### Database Maintenance

```sql
-- Check feedback count
SELECT COUNT(*) FROM feedback_entries;

-- Check recent ingestion
SELECT source, COUNT(*), MAX(timestamp) 
FROM feedback_entries 
GROUP BY source;

-- View sentiment distribution
SELECT sentiment, COUNT(*) 
FROM feedback_entries 
GROUP BY sentiment;
```

## Troubleshooting

### Reddit API Rate Limits

If you hit rate limits:
- Reduce ingestion frequency
- Add delay between requests
- Use Reddit's rate limit headers

### AI Classification Errors

If classification fails:
- Check LOVABLE_API_KEY is set
- Verify AI usage credits
- Check edge function logs

### Missing Data

If no data appears:
- Verify edge functions are deployed
- Check if cron jobs are running
- Review Reddit API credentials
- Check database permissions

## Cost Considerations

### Lovable AI Pricing

- Free tier: Limited requests per month
- Paid tier: Per-request pricing
- Estimate: ~$0.001-0.01 per classification

### Reddit API

- Free for reasonable use
- Rate limits: 60 requests/minute

### Lovable Cloud

- Included free usage
- Scales with database size and function calls

## Support

For issues or questions:
- Check Lovable documentation: https://docs.lovable.dev/
- Join Lovable Discord: https://discord.gg/lovable
- Contact support: support@lovable.dev
