export type FeedbackSource = "Reddit" | "LinkedIn" | "TechCommunity";
export type Sentiment = "positive" | "neutral" | "negative";
export type FeedbackType = "bug" | "feature_request" | "praise" | "question";

export interface FeedbackEntry {
  id: string;
  source: FeedbackSource;
  author: string;
  timestamp: string;
  content: string;
  url: string;
  sentiment: Sentiment;
  topic: string;
  feedback_type: FeedbackType;
  engagement_score: number;
  created_at: string;
}

export interface TopicSummary {
  topic: string;
  mention_count: number;
  avg_sentiment: number;
  positive_count: number;
  neutral_count: number;
  negative_count: number;
  sample_posts: FeedbackEntry[];
  trend: "up" | "down" | "stable";
  trend_percentage: number;
}

export interface WeeklyReport {
  id: string;
  week_start: string;
  week_end: string;
  total_feedback: number;
  sentiment_breakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  top_topics: string[];
  emerging_issues: string[];
  summary: string;
  created_at: string;
}
