-- Update weekly_reports table to match frontend expectations
ALTER TABLE public.weekly_reports
ADD COLUMN IF NOT EXISTS week_start DATE,
ADD COLUMN IF NOT EXISTS week_end DATE,
ADD COLUMN IF NOT EXISTS sentiment_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Update existing rows if they have report_date
UPDATE public.weekly_reports 
SET 
  week_start = report_date - INTERVAL '6 days',
  week_end = report_date,
  sentiment_breakdown = sentiment_distribution
WHERE week_start IS NULL;

-- Make week_start and week_end not null after updating existing rows
ALTER TABLE public.weekly_reports
ALTER COLUMN week_start SET NOT NULL,
ALTER COLUMN week_end SET NOT NULL;