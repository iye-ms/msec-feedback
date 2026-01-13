import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import type { Product } from "@/components/ProductSelector";

interface FeedbackEntry {
  id: string;
  source: string;
  author: string;
  sentiment: "positive" | "neutral" | "negative";
  topic: string;
  content: string;
  title: string;
  timestamp: string;
  url: string;
  score: number;
}

const sentimentColors = {
  positive: "bg-success/10 text-success border-success/20",
  neutral: "bg-primary/10 text-primary border-primary/20",
  negative: "bg-destructive/10 text-destructive border-destructive/20",
};

interface RedditPreviewProps {
  selectedProduct: Product;
}

export const RedditPreview = ({ selectedProduct }: RedditPreviewProps) => {
  const { data: posts, isLoading } = useQuery({
    queryKey: ['reddit-preview', selectedProduct],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedback_entries')
        .select('*')
        .eq('product', selectedProduct)
        .eq('source', 'Reddit')
        .order('timestamp', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as FeedbackEntry[];
    },
  });

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Recent Reddit Posts</CardTitle>
          <CardDescription>Latest discussions from r/{selectedProduct === "purview" ? "MicrosoftPurview" : selectedProduct}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-4 rounded-lg border border-border">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Recent Reddit Posts</CardTitle>
          <CardDescription>Latest discussions from r/{selectedProduct === "purview" ? "MicrosoftPurview" : selectedProduct}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No Reddit posts found. Click "Ingest Reddit Posts" on the Dashboard to fetch data.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Recent Reddit Posts</CardTitle>
        <CardDescription>
          Latest {posts.length} discussions from r/{selectedProduct === "purview" ? "MicrosoftPurview" : selectedProduct}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {posts.map((post) => (
            <a
              key={post.id}
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 rounded-lg border border-border hover:bg-muted/50 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground line-clamp-2 mb-2">
                    {post.title}
                  </h3>
                  {post.content && post.content !== post.title && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {post.content.substring(0, 150)}...
                    </p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={sentimentColors[post.sentiment] || sentimentColors.neutral}>
                      {post.sentiment || "neutral"}
                    </Badge>
                    <Badge variant="outline" className="bg-chart-4/10 text-chart-4 border-chart-4/20">
                      {post.topic || "General"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {post.author} • {formatDistanceToNow(new Date(post.timestamp), { addSuffix: true })}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      • ⬆ {post.score}
                    </span>
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </div>
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
