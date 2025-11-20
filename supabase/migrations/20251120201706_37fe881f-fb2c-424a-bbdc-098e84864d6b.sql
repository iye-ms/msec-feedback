-- Add product column to feedback_entries table
ALTER TABLE public.feedback_entries 
ADD COLUMN product text NOT NULL DEFAULT 'entra';

-- Create index for better query performance
CREATE INDEX idx_feedback_entries_product ON public.feedback_entries(product);

-- Add check constraint for valid products
ALTER TABLE public.feedback_entries
ADD CONSTRAINT valid_product CHECK (product IN ('intune', 'entra', 'defender', 'azure', 'purview'));