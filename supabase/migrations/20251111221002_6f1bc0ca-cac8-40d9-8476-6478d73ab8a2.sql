-- Add missing columns to feedback_entries table
ALTER TABLE public.feedback_entries
ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'Reddit',
ADD COLUMN IF NOT EXISTS feedback_type TEXT,
ADD COLUMN IF NOT EXISTS engagement_score INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- Create index for timestamp for better query performance
CREATE INDEX IF NOT EXISTS idx_feedback_entries_timestamp ON public.feedback_entries(timestamp DESC);

-- Update existing rows to set timestamp from created_at
UPDATE public.feedback_entries SET timestamp = created_at WHERE timestamp IS NULL;

-- Update feedback_type from type column if it exists
UPDATE public.feedback_entries SET feedback_type = type WHERE feedback_type IS NULL;

-- Update engagement_score from score column
UPDATE public.feedback_entries SET engagement_score = score WHERE engagement_score = 0;