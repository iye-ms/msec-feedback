import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, MessageSquare, ThumbsUp, AlertTriangle } from "lucide-react";

const stats = [
  {
    title: "Total Feedback",
    value: "1,247",
    change: "+12.3%",
    trend: "up",
    icon: MessageSquare,
    color: "text-primary",
  },
  {
    title: "Positive Sentiment",
    value: "68%",
    change: "+5.2%",
    trend: "up",
    icon: ThumbsUp,
    color: "text-success",
  },
  {
    title: "Trending Topics",
    value: "8",
    change: "+2",
    trend: "up",
    icon: TrendingUp,
    color: "text-primary",
  },
  {
    title: "Emerging Issues",
    value: "3",
    change: "New",
    trend: "neutral",
    icon: AlertTriangle,
    color: "text-warning",
  },
];

export const StatsCards = () => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
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
