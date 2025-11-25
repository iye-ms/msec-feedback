-- Create table to track data ingestion metadata
CREATE TABLE IF NOT EXISTS public.ingestion_metadata (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product text NOT NULL,
  last_ingestion_time timestamp with time zone NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'success',
  new_posts integer DEFAULT 0,
  total_processed integer DEFAULT 0,
  errors integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for faster product lookups
CREATE INDEX IF NOT EXISTS idx_ingestion_metadata_product ON public.ingestion_metadata(product);

-- Create index for timestamp lookups
CREATE INDEX IF NOT EXISTS idx_ingestion_metadata_time ON public.ingestion_metadata(last_ingestion_time DESC);

-- Enable RLS
ALTER TABLE public.ingestion_metadata ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access to ingestion metadata"
ON public.ingestion_metadata
FOR SELECT
USING (true);

-- Allow service role to insert/update
CREATE POLICY "Allow service role to insert ingestion metadata"
ON public.ingestion_metadata
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow service role to update ingestion metadata"
ON public.ingestion_metadata
FOR UPDATE
USING (true);