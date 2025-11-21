import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import type { Product } from "@/components/ProductSelector";
import type { FeedbackEntry } from "@/types/feedback";

interface EmergingIssuesProps {
  selectedProduct: Product;
}

export const EmergingIssues = ({ selectedProduct }: EmergingIssuesProps) => {
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);

  const { data: emergingIssues, isLoading } = useQuery({
    queryKey: ['emerging-issues', selectedProduct],
    queryFn: async () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data: feedbackData, error } = await supabase
        .from('feedback_entries')
        .select('topic, sentiment')
        .eq('product', selectedProduct)
        .gte('timestamp', weekAgo.toISOString());

      if (error) throw error;

      const topicCounts: Record<string, { total: number; negative: number }> = feedbackData?.reduce((acc, entry) => {
        if (!acc[entry.topic]) {
          acc[entry.topic] = { total: 0, negative: 0 };
        }
        acc[entry.topic].total++;
        if (entry.sentiment === 'negative') {
          acc[entry.topic].negative++;
        }
        return acc;
      }, {} as Record<string, { total: number; negative: number }>) || {};

      return Object.entries(topicCounts)
        .filter(([, counts]) => {
          const negativeRatio = counts.negative / counts.total;
          return negativeRatio > 0.3 && counts.total > 3;
        })
        .map(([topic, counts]) => ({
          topic,
          mentions: counts.total,
          negativePercent: Math.round((counts.negative / counts.total) * 100),
          severity: counts.negative / counts.total > 0.5 ? 'high' as const : 'medium' as const,
        }))
        .sort((a, b) => b.negativePercent - a.negativePercent)
        .slice(0, 3);
    },
  });

  const { data: issueMentions, isLoading: isMentionsLoading } = useQuery({
    queryKey: ['issue-mentions', selectedProduct, selectedIssue],
    queryFn: async () => {
      if (!selectedIssue) return [];

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('feedback_entries')
        .select('*')
        .eq('product', selectedProduct)
        .eq('topic', selectedIssue)
        .gte('timestamp', weekAgo.toISOString())
        .order('timestamp', { ascending: false });

      if (error) throw error;
      return data as FeedbackEntry[];
    },
    enabled: !!selectedIssue,
  });

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Emerging Issues</CardTitle>
          <CardDescription>Topics requiring attention based on sentiment analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 rounded-lg border border-border">
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-full" />
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
        <CardTitle>Emerging Issues</CardTitle>
        <CardDescription>Topics requiring attention based on sentiment analysis</CardDescription>
      </CardHeader>
      <CardContent>
        {emergingIssues && emergingIssues.length > 0 ? (
          <div className="space-y-4">
            {emergingIssues.map((issue) => (
              <div
                key={issue.topic}
                onClick={() => setSelectedIssue(issue.topic)}
                className="flex items-start gap-4 p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/10">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-foreground">{issue.topic}</h4>
                    <Badge 
                      variant="outline" 
                      className={issue.severity === 'high' 
                        ? "bg-destructive/10 text-destructive border-destructive/20"
                        : "bg-warning/10 text-warning border-warning/20"
                      }
                    >
                      {issue.negativePercent}% negative
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    High concentration of negative feedback requiring attention
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{issue.mentions} mentions this week</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            No emerging issues detected. All topics have healthy sentiment.
          </p>
        )}
      </CardContent>

      <Dialog open={!!selectedIssue} onOpenChange={() => setSelectedIssue(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Feedback Mentions: {selectedIssue}</DialogTitle>
          </DialogHeader>
          {isMentionsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-4 mt-4">
              {issueMentions && issueMentions.length > 0 ? (
                issueMentions.map((mention) => (
                  <div
                    key={mention.id}
                    className="p-4 rounded-lg border border-border bg-card space-y-2"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{mention.source}</Badge>
                          <Badge
                            variant="outline"
                            className={
                              mention.sentiment === "positive"
                                ? "bg-green-500/10 text-green-500 border-green-500/20"
                                : mention.sentiment === "negative"
                                ? "bg-destructive/10 text-destructive border-destructive/20"
                                : "bg-muted text-muted-foreground"
                            }
                          >
                            {mention.sentiment}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(mention.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="font-medium mb-1">{mention.title}</h4>
                        {mention.content && (
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {mention.content}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          by {mention.author} • Score: {mention.score}
                        </p>
                      </div>
                      <a
                        href={mention.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No mentions found for this topic.
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};
