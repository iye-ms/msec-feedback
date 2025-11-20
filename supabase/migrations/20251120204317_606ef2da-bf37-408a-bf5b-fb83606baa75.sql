-- Drop old unique constraint that enforced one report per date only
ALTER TABLE public.weekly_reports
DROP CONSTRAINT IF EXISTS weekly_reports_report_date_key;