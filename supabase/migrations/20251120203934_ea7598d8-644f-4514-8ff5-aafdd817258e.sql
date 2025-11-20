-- Add unique constraint on report_date and product columns
ALTER TABLE public.weekly_reports
ADD CONSTRAINT weekly_reports_report_date_product_key UNIQUE (report_date, product);