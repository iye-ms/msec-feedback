import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";

const issues = [
  {
    id: "1",
    topic: "macOS Deployment",
    spike: "+35%",
    mentions: 87,
    description: "Increased reports of app installation failures on macOS Sonoma",
  },
  {
    id: "2",
    topic: "Conditional Access",
    spike: "+28%",
    mentions: 54,
    description: "Questions about new policy configuration options",
  },
  {
    id: "3",
    topic: "Android Management",
    spike: "+22%",
    mentions: 65,
    description: "Discussion around BYOD enrollment improvements",
  },
];

export const EmergingIssues = () => {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Emerging Issues</CardTitle>
        <CardDescription>Topics with significant activity spikes</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {issues.map((issue) => (
            <div
              key={issue.id}
              className="flex items-start gap-4 p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/10">
                <TrendingUp className="h-5 w-5 text-warning" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-foreground">{issue.topic}</h4>
                  <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                    {issue.spike}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{issue.description}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{issue.mentions} mentions this week</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
