import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";

export const EmergingIssues = () => {
  const { data: emergingIssues, isLoading } = useQuery({
    queryKey: ['emerging-issues'],
    queryFn: async () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data: feedbackData, error } = await supabase
        .from('feedback_entries')
        .select('topic, sentiment')
        .gte('timestamp', weekAgo.toISOString());

      if (error) throw error;

      const topicCounts = feedbackData?.reduce((acc, entry) => {
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
                className="flex items-start gap-4 p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
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
    </Card>
  );
};
