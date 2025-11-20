-- Add product column to weekly_reports table
ALTER TABLE public.weekly_reports 
ADD COLUMN product text NOT NULL DEFAULT 'entra';

-- Create index for better query performance
CREATE INDEX idx_weekly_reports_product ON public.weekly_reports(product);

-- Add check constraint for valid products
ALTER TABLE public.weekly_reports
ADD CONSTRAINT valid_report_product CHECK (product IN ('intune', 'entra', 'defender', 'azure', 'purview'));