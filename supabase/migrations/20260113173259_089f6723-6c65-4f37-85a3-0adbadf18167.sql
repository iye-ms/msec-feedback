-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the ingestion to run every 6 hours
-- This calls the scheduled-ingestion edge function
SELECT cron.schedule(
  'scheduled-feedback-ingestion',
  '0 */6 * * *',  -- Every 6 hours (at minute 0)
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/scheduled-ingestion',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);