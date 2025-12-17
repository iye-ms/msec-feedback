import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, MessageSquare, AlertTriangle, Clock, Timer } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import type { Product } from "@/components/ProductSelector";
import { formatDistanceToNow, differenceInDays } from "date-fns";

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

      // Fetch last ingestion time
      const { data: ingestionData } = await supabase
        .from('ingestion_metadata')
        .select('last_ingestion_time')
        .eq('product', selectedProduct)
        .order('last_ingestion_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      const lastIngestionTime = ingestionData?.last_ingestion_time 
        ? formatDistanceToNow(new Date(ingestionData.last_ingestion_time), { addSuffix: true })
        : 'Never';

      // Calculate average issue lifespan from resolved issues
      const { data: resolvedIssues } = await supabase
        .from('issue_lifecycle')
        .select('became_emerging_at, resolved_at')
        .eq('product', selectedProduct)
        .eq('is_active', false)
        .not('resolved_at', 'is', null);

      let avgLifespan = 'No data';
      if (resolvedIssues && resolvedIssues.length > 0) {
        const totalDays = resolvedIssues.reduce((sum, issue) => {
          const days = differenceInDays(
            new Date(issue.resolved_at!),
            new Date(issue.became_emerging_at)
          );
          return sum + Math.max(days, 1); // At least 1 day
        }, 0);
        const avg = Math.round(totalDays / resolvedIssues.length);
        avgLifespan = `${avg} day${avg !== 1 ? 's' : ''}`;
      }

      // Get count of active issues for context
      const { count: activeCount } = await supabase
        .from('issue_lifecycle')
        .select('*', { count: 'exact', head: true })
        .eq('product', selectedProduct)
        .eq('is_active', true);

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
          title: "Avg Issue Lifespan",
          value: avgLifespan,
          change: `${activeCount || 0} active, ${resolvedIssues?.length || 0} resolved`,
          trend: "neutral",
          icon: Timer,
          color: "text-primary",
        },
        {
          title: "Last Ingestion",
          value: lastIngestionTime,
          change: "Data freshness",
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
                {stat.change}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
