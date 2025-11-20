import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, TrendingUp, TrendingDown, Minus, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import type { Product } from "@/components/ProductSelector";

interface TopicSummary {
  topic: string;
  mention_count: number;
  avg_sentiment: number;
  positive_count: number;
  neutral_count: number;
  negative_count: number;
  trend: "up" | "down" | "stable";
  sample_posts: Array<{
    author: string;
    content: string;
    url: string;
    timestamp: string;
  }>;
}

interface TopicsViewProps {
  selectedProduct: Product;
}

export const TopicsView = ({ selectedProduct }: TopicsViewProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<TopicSummary | null>(null);

  const { data: topicSummaries, isLoading } = useQuery({
    queryKey: ['topic-summaries', selectedProduct],
    queryFn: async () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data: currentData, error } = await supabase
        .from('feedback_entries')
        .select('*')
        .eq('product', selectedProduct)
        .gte('timestamp', weekAgo.toISOString());

      if (error) throw error;

      // Group by topic
      const topicMap = new Map<string, any>();
      
      currentData?.forEach(entry => {
        if (!topicMap.has(entry.topic)) {
          topicMap.set(entry.topic, {
            topic: entry.topic,
            mention_count: 0,
            positive_count: 0,
            neutral_count: 0,
            negative_count: 0,
            sample_posts: [],
          });
        }

        const topicData = topicMap.get(entry.topic);
        topicData.mention_count++;
        
        if (entry.sentiment === 'positive') topicData.positive_count++;
        else if (entry.sentiment === 'neutral') topicData.neutral_count++;
        else if (entry.sentiment === 'negative') topicData.negative_count++;

        if (topicData.sample_posts.length < 3) {
          topicData.sample_posts.push({
            author: entry.author,
            content: entry.content,
            url: entry.url,
            timestamp: entry.timestamp,
          });
        }
      });

      return Array.from(topicMap.values()).map(topic => ({
        ...topic,
        avg_sentiment: (topic.positive_count - topic.negative_count) / topic.mention_count,
        trend: topic.positive_count > topic.negative_count ? 'up' as const : 
               topic.negative_count > topic.positive_count ? 'down' as const : 'stable' as const,
      })) as TopicSummary[];
    },
  });

  const filteredTopics = useMemo(() => {
    if (!searchQuery || !topicSummaries) return topicSummaries || [];
    return topicSummaries.filter((topic) =>
      topic.topic.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, topicSummaries]);

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

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="shadow-sm">
              <CardHeader>
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
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

                  <Button 
                    variant="outline" 
                    className="w-full" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTopic(topic);
                    }}
                  >
                    View Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Topic Detail Dialog */}
          <Dialog open={!!selectedTopic} onOpenChange={(open) => !open && setSelectedTopic(null)}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              {selectedTopic && (
                <>
                  <DialogHeader>
                    <DialogTitle className="text-2xl">{selectedTopic.topic}</DialogTitle>
                    <p className="text-muted-foreground">
                      {selectedTopic.mention_count} mentions • Avg. sentiment:{" "}
                      <span className={getSentimentColor(selectedTopic.avg_sentiment)}>
                        {getSentimentLabel(selectedTopic.avg_sentiment)}
                      </span>
                    </p>
                  </DialogHeader>
                  
                  <div className="space-y-4 mt-4">
                    {/* Sentiment Breakdown */}
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                        {selectedTopic.positive_count} positive
                      </Badge>
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        {selectedTopic.neutral_count} neutral
                      </Badge>
                      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                        {selectedTopic.negative_count} negative
                      </Badge>
                    </div>

                    {/* Sample Feedback */}
                    <div>
                      <h4 className="font-semibold mb-3">Sample Feedback</h4>
                      <div className="space-y-3">
                        {selectedTopic.sample_posts.map((post, idx) => (
                          <div key={idx} className="p-4 rounded-lg border border-border bg-muted/50">
                            <p className="text-sm mb-3">{post.content.substring(0, 200)}...</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{post.author}</span>
                              <span>•</span>
                              <span>{formatDistanceToNow(new Date(post.timestamp), { addSuffix: true })}</span>
                              <a
                                href={post.url}
                                className="flex items-center gap-1 text-primary hover:underline ml-auto"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                View on Reddit <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
};
