import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const data = [
  { date: "Mon", positive: 45, neutral: 30, negative: 12 },
  { date: "Tue", positive: 52, neutral: 28, negative: 15 },
  { date: "Wed", positive: 38, neutral: 35, negative: 20 },
  { date: "Thu", positive: 61, neutral: 25, negative: 10 },
  { date: "Fri", positive: 55, neutral: 32, negative: 14 },
  { date: "Sat", positive: 48, neutral: 30, negative: 18 },
  { date: "Sun", positive: 50, neutral: 33, negative: 16 },
];

export const SentimentChart = () => {
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
