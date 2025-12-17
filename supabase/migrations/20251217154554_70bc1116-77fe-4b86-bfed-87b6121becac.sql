-- Create table to track issue lifecycle events
CREATE TABLE public.issue_lifecycle (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product TEXT NOT NULL,
  topic TEXT NOT NULL,
  became_emerging_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.issue_lifecycle ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access to issue lifecycle"
ON public.issue_lifecycle
FOR SELECT
USING (true);

-- Allow service role to insert/update
CREATE POLICY "Allow service role to insert issue lifecycle"
ON public.issue_lifecycle
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow service role to update issue lifecycle"
ON public.issue_lifecycle
FOR UPDATE
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_issue_lifecycle_product_topic ON public.issue_lifecycle(product, topic);
CREATE INDEX idx_issue_lifecycle_active ON public.issue_lifecycle(is_active) WHERE is_active = true;