import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { topic: "macOS Deployment", mentions: 87 },
  { topic: "Android Management", mentions: 65 },
  { topic: "Conditional Access", mentions: 54 },
  { topic: "App Install Issues", mentions: 48 },
  { topic: "Device Enrollment", mentions: 42 },
];

export const TopicsChart = () => {
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
