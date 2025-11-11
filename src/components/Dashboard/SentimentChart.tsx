import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";

export const SentimentChart = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['sentiment-trends'],
    queryFn: async () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data: feedbackData, error } = await supabase
        .from('feedback_entries')
        .select('sentiment, timestamp')
        .gte('timestamp', weekAgo.toISOString())
        .order('timestamp', { ascending: true });

      if (error) throw error;

      // Group by day
      const dayMap = new Map<string, { positive: number; neutral: number; negative: number }>();
      
      feedbackData?.forEach(entry => {
        const date = new Date(entry.timestamp);
        const dayKey = date.toLocaleDateString('en-US', { weekday: 'short' });
        
        if (!dayMap.has(dayKey)) {
          dayMap.set(dayKey, { positive: 0, neutral: 0, negative: 0 });
        }
        
        const dayCounts = dayMap.get(dayKey)!;
        if (entry.sentiment === 'positive') dayCounts.positive++;
        else if (entry.sentiment === 'neutral') dayCounts.neutral++;
        else if (entry.sentiment === 'negative') dayCounts.negative++;
      });

      return Array.from(dayMap.entries()).map(([date, counts]) => ({
        date,
        ...counts,
      }));
    },
  });

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Sentiment Trends</CardTitle>
          <CardDescription>Weekly sentiment distribution across all sources</CardDescription>
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
        <CardTitle>Sentiment Trends</CardTitle>
        <CardDescription>Weekly sentiment distribution across all sources</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="positive"
              stroke="hsl(var(--success))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--success))" }}
            />
            <Line
              type="monotone"
              dataKey="neutral"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--chart-1))" }}
            />
            <Line
              type="monotone"
              dataKey="negative"
              stroke="hsl(var(--destructive))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--destructive))" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
