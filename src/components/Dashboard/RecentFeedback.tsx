import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";

interface FeedbackEntry {
  id: string;
  source: "Reddit" | "LinkedIn" | "TechCommunity";
  author: string;
  sentiment: "positive" | "neutral" | "negative";
  topic: string;
  snippet: string;
  timestamp: string;
  url: string;
}

const feedbackData: FeedbackEntry[] = [
  {
    id: "1",
    source: "Reddit",
    author: "u/ITAdmin_2024",
    sentiment: "negative",
    topic: "macOS Deployment",
    snippet: "Still experiencing issues with app installation on macOS Sonoma devices...",
    timestamp: "2 hours ago",
    url: "#",
  },
  {
    id: "2",
    source: "LinkedIn",
    author: "Sarah Johnson",
    sentiment: "positive",
    topic: "Conditional Access",
    snippet: "The new conditional access policies are working great! Much easier to configure...",
    timestamp: "4 hours ago",
    url: "#",
  },
  {
    id: "3",
    source: "TechCommunity",
    author: "Mike Anderson",
    sentiment: "neutral",
    topic: "Android Management",
    snippet: "Question about best practices for Android device enrollment in enterprise...",
    timestamp: "6 hours ago",
    url: "#",
  },
  {
    id: "4",
    source: "Reddit",
    author: "u/CloudAdmin",
    sentiment: "positive",
    topic: "Device Enrollment",
    snippet: "The automated enrollment process saved us so much time. Great improvement!",
    timestamp: "8 hours ago",
    url: "#",
  },
  {
    id: "5",
    source: "LinkedIn",
    author: "David Chen",
    sentiment: "negative",
    topic: "App Install Issues",
    snippet: "Facing timeout errors during bulk app deployment to Windows devices...",
    timestamp: "10 hours ago",
    url: "#",
  },
];

const sentimentColors = {
  positive: "bg-success/10 text-success border-success/20",
  neutral: "bg-primary/10 text-primary border-primary/20",
  negative: "bg-destructive/10 text-destructive border-destructive/20",
};

const sourceColors = {
  Reddit: "bg-chart-1/10 text-chart-1 border-chart-1/20",
  LinkedIn: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  TechCommunity: "bg-chart-5/10 text-chart-5 border-chart-5/20",
};

export const RecentFeedback = () => {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Recent Feedback</CardTitle>
        <CardDescription>Latest customer feedback from all sources</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {feedbackData.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={sourceColors[entry.source]}>
                    {entry.source}
                  </Badge>
                  <Badge variant="outline" className={sentimentColors[entry.sentiment]}>
                    {entry.sentiment}
                  </Badge>
                  <span className="text-sm font-medium text-foreground">{entry.topic}</span>
                </div>
                <p className="text-sm text-muted-foreground">{entry.snippet}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{entry.author}</span>
                  <span>•</span>
                  <span>{entry.timestamp}</span>
                  <a
                    href={entry.url}
                    className="flex items-center gap-1 text-primary hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
