import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, TrendingUp, TrendingDown, Minus, ExternalLink } from "lucide-react";
import { mockTopicSummaries } from "@/data/mockFeedback";
import { TopicSummary } from "@/types/feedback";

export const TopicsView = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<TopicSummary | null>(null);

  const filteredTopics = useMemo(() => {
    if (!searchQuery) return mockTopicSummaries;
    return mockTopicSummaries.filter((topic) =>
      topic.topic.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const getSentimentColor = (avgSentiment: number) => {
    if (avgSentiment > 0.3) return "text-success";
    if (avgSentiment < -0.3) return "text-destructive";
    return "text-primary";
  };

  const getSentimentLabel = (avgSentiment: number) => {
    if (avgSentiment > 0.3) return "Positive";
    if (avgSentiment < -0.3) return "Negative";
    return "Neutral";
  };

  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-warning" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-success" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search topics..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Topics Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredTopics.map((topic) => (
          <Card
            key={topic.topic}
            className="shadow-sm hover:shadow-md transition-all cursor-pointer"
            onClick={() => setSelectedTopic(topic)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{topic.topic}</CardTitle>
                  <CardDescription>{topic.mention_count} mentions</CardDescription>
                </div>
                {getTrendIcon(topic.trend)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Sentiment Summary */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Avg. Sentiment</span>
                  <span className={`font-semibold ${getSentimentColor(topic.avg_sentiment)}`}>
                    {getSentimentLabel(topic.avg_sentiment)}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                    {topic.positive_count} positive
                  </Badge>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    {topic.neutral_count} neutral
                  </Badge>
                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                    {topic.negative_count} negative
                  </Badge>
                </div>
              </div>

              {/* Trend Badge */}
              {topic.trend !== "stable" && (
                <Badge
                  variant="outline"
                  className={
                    topic.trend === "up"
                      ? "bg-warning/10 text-warning border-warning/20"
                      : "bg-success/10 text-success border-success/20"
                  }
                >
                  {topic.trend === "up" ? "+" : ""}
                  {topic.trend_percentage}% this week
                </Badge>
              )}

              <Button variant="outline" className="w-full" size="sm">
                View Details
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Topic Detail Modal */}
      {selectedTopic && (
        <Card className="shadow-lg mt-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>{selectedTopic.topic}</CardTitle>
                <CardDescription>
                  {selectedTopic.mention_count} mentions • Avg. sentiment:{" "}
                  <span className={getSentimentColor(selectedTopic.avg_sentiment)}>
                    {getSentimentLabel(selectedTopic.avg_sentiment)}
                  </span>
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedTopic(null)}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Sample Feedback</h4>
              <div className="space-y-3">
                {selectedTopic.sample_posts.map((post) => (
                  <div key={post.id} className="p-4 rounded-lg border border-border bg-muted/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {post.source}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={
                          post.sentiment === "positive"
                            ? "bg-success/10 text-success border-success/20"
                            : post.sentiment === "negative"
                            ? "bg-destructive/10 text-destructive border-destructive/20"
                            : "bg-primary/10 text-primary border-primary/20"
                        }
                      >
                        {post.sentiment}
                      </Badge>
                    </div>
                    <p className="text-sm mb-2">{post.content}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{post.author}</span>
                      <span>•</span>
                      <span>{post.engagement_score} engagement</span>
                      <a
                        href={post.url}
                        className="flex items-center gap-1 text-primary hover:underline ml-auto"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
