-- Make reddit_id nullable to support other sources like Microsoft Q&A
ALTER TABLE public.feedback_entries ALTER COLUMN reddit_id DROP NOT NULL;

-- Add msqa_id column for Microsoft Q&A question IDs
ALTER TABLE public.feedback_entries ADD COLUMN IF NOT EXISTS msqa_id TEXT;

-- Create index for msqa_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_feedback_entries_msqa_id ON public.feedback_entries(msqa_id);

-- Add comment for clarity
COMMENT ON COLUMN public.feedback_entries.msqa_id IS 'Microsoft Q&A question ID for deduplication';