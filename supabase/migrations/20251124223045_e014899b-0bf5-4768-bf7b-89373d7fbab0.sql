
-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule daily data ingestion at 6am ET (11am UTC)
SELECT cron.schedule(
  'daily-reddit-ingestion',
  '0 11 * * *', -- 11am UTC = 6am EST / 7am EDT
  $$
  SELECT
    net.http_post(
        url:='https://jcpcxhmmmetkvnmzwtdw.supabase.co/functions/v1/ingest-reddit',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjcGN4aG1tbWV0a3ZubXp3dGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NTQzMjAsImV4cCI6MjA3OTIzMDMyMH0.HCXeHjxY13nzYr9VcPVqaPnETPB3Y1YVmgAG-0174s8"}'::jsonb,
        body:='{"product": "entra"}'::jsonb
    ) as request_id;
  $$
);
