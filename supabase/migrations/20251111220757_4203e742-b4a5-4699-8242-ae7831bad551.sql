-- Create feedback_entries table to store Reddit posts with AI classification
CREATE TABLE public.feedback_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reddit_id TEXT UNIQUE NOT NULL,
  author TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  score INTEGER NOT NULL DEFAULT 0,
  url TEXT NOT NULL,
  sentiment TEXT,
  topic TEXT,
  type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups by reddit_id
CREATE INDEX idx_feedback_entries_reddit_id ON public.feedback_entries(reddit_id);

-- Create index for filtering by sentiment and topic
CREATE INDEX idx_feedback_entries_sentiment ON public.feedback_entries(sentiment);
CREATE INDEX idx_feedback_entries_topic ON public.feedback_entries(topic);
CREATE INDEX idx_feedback_entries_created_at ON public.feedback_entries(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.feedback_entries ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for dashboard viewing)
CREATE POLICY "Allow public read access to feedback"
ON public.feedback_entries
FOR SELECT
USING (true);

-- Create weekly_reports table to store automated summaries
CREATE TABLE public.weekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date DATE NOT NULL UNIQUE,
  total_feedback INTEGER NOT NULL DEFAULT 0,
  sentiment_distribution JSONB NOT NULL DEFAULT '{}'::jsonb,
  top_topics JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary TEXT NOT NULL,
  emerging_issues JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups by report_date
CREATE INDEX idx_weekly_reports_date ON public.weekly_reports(report_date DESC);

-- Enable Row Level Security
ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for dashboard viewing)
CREATE POLICY "Allow public read access to reports"
ON public.weekly_reports
FOR SELECT
USING (true);