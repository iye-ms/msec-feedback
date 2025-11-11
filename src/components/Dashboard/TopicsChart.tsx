import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";

export const TopicsChart = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['top-topics'],
    queryFn: async () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data: feedbackData, error } = await supabase
        .from('feedback_entries')
        .select('topic')
        .gte('timestamp', weekAgo.toISOString());

      if (error) throw error;

      const topicCounts: Record<string, number> = feedbackData?.reduce((acc, entry) => {
        acc[entry.topic] = (acc[entry.topic] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      return Object.entries(topicCounts)
        .map(([topic, mentions]) => ({ topic, mentions }))
        .sort((a, b) => b.mentions - a.mentions)
        .slice(0, 5);
    },
  });

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Top Topics</CardTitle>
          <CardDescription>Most discussed product areas this week</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full h-[300px]" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Top Topics</CardTitle>
        <CardDescription>Most discussed product areas this week</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
            <YAxis dataKey="topic" type="category" width={150} stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
            />
            <Bar dataKey="mentions" fill="hsl(var(--primary))" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
