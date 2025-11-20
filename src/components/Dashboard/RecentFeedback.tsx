import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import type { Product } from "@/components/ProductSelector";

interface FeedbackEntry {
  id: string;
  source: "Reddit" | "LinkedIn" | "TechCommunity";
  author: string;
  sentiment: "positive" | "neutral" | "negative";
  topic: string;
  content: string;
  timestamp: string;
  url: string;
}

const sentimentColors = {
  positive: "bg-success/10 text-success border-success/20",
  neutral: "bg-primary/10 text-primary border-primary/20",
  negative: "bg-destructive/10 text-destructive border-destructive/20",
};

const sourceColors = {
  Reddit: "bg-chart-1/10 text-chart-1 border-chart-1/20",
  LinkedIn: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  TechCommunity: "bg-chart-5/10 text-chart-5 border-chart-5/20",
};

interface RecentFeedbackProps {
  selectedProduct: Product;
}

export const RecentFeedback = ({ selectedProduct }: RecentFeedbackProps) => {
  const { data: feedbackData, isLoading } = useQuery({
    queryKey: ['recent-feedback', selectedProduct],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedback_entries')
        .select('*')
        .eq('product', selectedProduct)
        .order('timestamp', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data as FeedbackEntry[];
    },
  });

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Recent Feedback</CardTitle>
          <CardDescription>Latest customer feedback from all sources</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-4 rounded-lg border border-border">
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Recent Feedback</CardTitle>
        <CardDescription>Latest customer feedback from all sources</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {feedbackData?.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={sourceColors[entry.source]}>
                    {entry.source}
                  </Badge>
                  <Badge variant="outline" className={sentimentColors[entry.sentiment]}>
                    {entry.sentiment}
                  </Badge>
                  <span className="text-sm font-medium text-foreground">{entry.topic}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {entry.content.substring(0, 150)}...
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{entry.author}</span>
                  <span>•</span>
                  <span>{formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}</span>
                  <a
                    href={entry.url}
                    className="flex items-center gap-1 text-primary hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
