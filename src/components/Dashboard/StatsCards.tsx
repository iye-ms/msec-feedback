import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, MessageSquare, ThumbsUp, AlertTriangle, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import type { Product } from "@/components/ProductSelector";
import { formatDistanceToNow } from "date-fns";

interface StatsCardsProps {
  selectedProduct: Product;
}

export const StatsCards = ({ selectedProduct }: StatsCardsProps) => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats', selectedProduct],
    queryFn: async () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      // Fetch current week data
      const { data: currentData, error: currentError } = await supabase
        .from('feedback_entries')
        .select('sentiment, topic')
        .eq('product', selectedProduct)
        .gte('timestamp', weekAgo.toISOString());

      if (currentError) throw currentError;

      // Fetch previous week data for comparison
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const { data: previousData, error: previousError } = await supabase
        .from('feedback_entries')
        .select('sentiment')
        .eq('product', selectedProduct)
        .gte('timestamp', twoWeeksAgo.toISOString())
        .lt('timestamp', weekAgo.toISOString());

      if (previousError) throw previousError;

      const totalCurrent = currentData?.length || 0;
      const totalPrevious = previousData?.length || 0;
      const changePercent = totalPrevious > 0 
        ? (((totalCurrent - totalPrevious) / totalPrevious) * 100).toFixed(1)
        : '0';

      const positiveCurrent = currentData?.filter(f => f.sentiment === 'positive').length || 0;
      const positivePercent = totalCurrent > 0 ? Math.round((positiveCurrent / totalCurrent) * 100) : 0;
      
      const positivePrevious = previousData?.filter(f => f.sentiment === 'positive').length || 0;
      const previousPositivePercent = totalPrevious > 0 ? Math.round((positivePrevious / totalPrevious) * 100) : 0;
      const positiveChange = (positivePercent - previousPositivePercent).toFixed(1);

      const topicCounts = currentData?.reduce((acc, entry) => {
        acc[entry.topic] = (acc[entry.topic] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const trendingTopics = Object.keys(topicCounts).length;

      // Identify emerging issues (topics with high negative sentiment)
      const emergingIssues = Object.entries(topicCounts)
        .filter(([topic]) => {
          const topicFeedback = currentData?.filter(f => f.topic === topic) || [];
          const negativeRatio = topicFeedback.filter(f => f.sentiment === 'negative').length / topicFeedback.length;
          return negativeRatio > 0.3 && topicFeedback.length > 3;
        }).length;

      // Calculate next 6am ET ingestion
      const now = new Date();
      const etOffset = -5; // ET is UTC-5 (EST) or UTC-4 (EDT), using EST for simplicity
      const nowET = new Date(now.getTime() + (etOffset * 60 * 60 * 1000));
      
      let nextIngestion = new Date(nowET);
      nextIngestion.setHours(6, 0, 0, 0);
      
      // If it's already past 6am ET today, schedule for tomorrow
      if (nowET.getHours() >= 6) {
        nextIngestion.setDate(nextIngestion.getDate() + 1);
      }
      
      const nextIngestionFormatted = nextIngestion.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });

      return [
        {
          title: "Total Feedback",
          value: totalCurrent.toLocaleString(),
          change: `${changePercent > '0' ? '+' : ''}${changePercent}%`,
          trend: Number(changePercent) >= 0 ? "up" : "down",
          icon: MessageSquare,
          color: "text-primary",
        },
        {
          title: "Positive Sentiment",
          value: `${positivePercent}%`,
          change: `${positiveChange > '0' ? '+' : ''}${positiveChange}%`,
          trend: Number(positiveChange) >= 0 ? "up" : "down",
          icon: ThumbsUp,
          color: "text-success",
        },
        {
          title: "Trending Topics",
          value: trendingTopics.toString(),
          change: "Active",
          trend: "neutral",
          icon: TrendingUp,
          color: "text-primary",
        },
        {
          title: "Emerging Issues",
          value: emergingIssues.toString(),
          change: "Requires attention",
          trend: "neutral",
          icon: AlertTriangle,
          color: "text-warning",
        },
        {
          title: `Auto-refresh at 6am ET ${nextIngestionFormatted}`,
          value: "Scheduled",
          change: "Daily automated ingestion",
          trend: "neutral",
          icon: Clock,
          color: "text-primary",
        },
      ];
    },
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {stats?.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title} className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <Icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className={stat.trend === "up" ? "text-success" : "text-muted-foreground"}>
                  {stat.change}
                </span>{" "}
                from last week
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
