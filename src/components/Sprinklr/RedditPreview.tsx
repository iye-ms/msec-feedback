import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, ChevronDown, ChevronUp, MessageSquare, Loader2, Clock, TrendingUp, Hash, ThumbsDown, RefreshCw, Twitter } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import type { Product } from "@/components/ProductSelector";

type SortOption = "time" | "activeness" | "topic" | "negative";
type SourceFilter = "all" | "reddit" | "twitter";

const sortOptions: { value: SortOption; label: string; icon: React.ReactNode }[] = [
  { value: "time", label: "Most Recent", icon: <Clock className="h-3 w-3" /> },
  { value: "activeness", label: "Most Active", icon: <TrendingUp className="h-3 w-3" /> },
  { value: "topic", label: "By Topic", icon: <Hash className="h-3 w-3" /> },
  { value: "negative", label: "Most Negative", icon: <ThumbsDown className="h-3 w-3" /> },
];

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

interface RedditPreviewProps {
  selectedProduct: Product;
}

const SocialPostItem = ({ post }: { post: FeedbackEntry }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [commentSummary, setCommentSummary] = useState<string | null>(null);
  const [commentCount, setCommentCount] = useState<number | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  
  const isReddit = post.source === "Reddit";
  const isTwitter = post.source === "Twitter";
  
  // Generate a brief summary (first 100 chars or first sentence)
  const getSummary = (content: string, title: string) => {
    if (!content || content === title) return title;
    const firstSentence = content.split(/[.!?]/)[0];
    if (firstSentence.length < 150) return firstSentence + "...";
    return content.substring(0, 100) + "...";
  };

  // Fetch comment summary when expanded (only for Reddit)
  useEffect(() => {
    if (isOpen && isReddit && !commentSummary && !isLoadingSummary && !summaryError) {
      const fetchSummary = async () => {
        setIsLoadingSummary(true);
        setSummaryError(null);
        try {
          const { data, error } = await supabase.functions.invoke("summarize-reddit-comments", {
            body: { redditUrl: post.url },
          });

          if (error) {
            throw error;
          }

          setCommentSummary(data.summary);
          setCommentCount(data.commentCount);
        } catch (err) {
          console.error("Failed to fetch comment summary:", err);
          setSummaryError("Unable to load discussion summary.");
        } finally {
          setIsLoadingSummary(false);
        }
      };

      fetchSummary();
    }
  }, [isOpen, isReddit, commentSummary, isLoadingSummary, summaryError, post.url]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-lg border border-border hover:border-primary/30 transition-colors overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full p-4 text-left hover:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge 
                    variant="outline" 
                    className={isTwitter 
                      ? "bg-blue-500/10 text-blue-600 border-blue-500/20" 
                      : "bg-orange-500/10 text-orange-600 border-orange-500/20"
                    }
                  >
                    {isTwitter ? (
                      <><Twitter className="h-3 w-3 mr-1" />Twitter</>
                    ) : (
                      "Reddit"
                    )}
                  </Badge>
                  <Badge variant="outline" className="bg-chart-4/10 text-chart-4 border-chart-4/20">
                    {post.topic || "General"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {post.author} • {formatDistanceToNow(new Date(post.timestamp), { addSuffix: true })}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    • {isTwitter ? "❤️" : "⬆"} {post.score}
                  </span>
                </div>
                <h3 className="font-medium text-foreground line-clamp-2 mb-1">
                  {post.title}
                </h3>
                {!isOpen && (
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {getSummary(post.content, post.title)}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4 animate-accordion-down">
            {/* Full Post Content */}
            <div className="bg-muted/30 rounded-lg p-4">
              <h4 className="text-sm font-medium mb-2 text-foreground">Post Content</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {post.content || post.title}
              </p>
            </div>
            
            {/* Comment Summary - only for Reddit */}
            {isReddit && (
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-medium text-foreground">
                    Discussion Summary
                    {commentCount !== null && commentCount > 0 && (
                      <span className="font-normal text-muted-foreground ml-1">
                        ({commentCount} comments)
                      </span>
                    )}
                  </h4>
                </div>
                
                {isLoadingSummary ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Analyzing discussion...</span>
                  </div>
                ) : summaryError ? (
                  <p className="text-sm text-muted-foreground italic">{summaryError}</p>
                ) : commentSummary ? (
                  <p className="text-sm text-muted-foreground">{commentSummary}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Loading...</p>
                )}
              </div>
            )}
            
            {/* Link to source */}
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              View full post on {post.source}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export const RedditPreview = ({ selectedProduct }: RedditPreviewProps) => {
  const [sortBy, setSortBy] = useState<SortOption>("time");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [isSyncingSprinklr, setIsSyncingSprinklr] = useState(false);
  const queryClient = useQueryClient();

  const handleSyncSprinklr = async () => {
    setIsSyncingSprinklr(true);
    try {
      const { data, error } = await supabase.functions.invoke("ingest-sprinklr", {
        body: { product: selectedProduct, days: 7 },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`Synced ${data.new_posts} new Twitter posts from Sprinklr`);
        queryClient.invalidateQueries({ queryKey: ['social-posts', selectedProduct] });
      } else {
        throw new Error(data.error || "Unknown error");
      }
    } catch (err) {
      console.error("Sprinklr sync error:", err);
      toast.error("Failed to sync from Sprinklr. Check your API credentials.");
    } finally {
      setIsSyncingSprinklr(false);
    }
  };

  const { data: posts, isLoading } = useQuery({
    queryKey: ['social-posts', selectedProduct],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feedback_entries')
        .select('*')
        .eq('product', selectedProduct)
        .in('source', ['Reddit', 'Twitter'])
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as FeedbackEntry[];
    },
  });

  const filteredAndSortedPosts = useMemo(() => {
    if (!posts) return [];
    
    // Filter by source
    let filtered = posts;
    if (sourceFilter === "reddit") {
      filtered = posts.filter(p => p.source === "Reddit");
    } else if (sourceFilter === "twitter") {
      filtered = posts.filter(p => p.source === "Twitter");
    }
    
    // Sort
    const sorted = [...filtered];
    switch (sortBy) {
      case "time":
        return sorted.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      case "activeness":
        return sorted.sort((a, b) => b.score - a.score);
      case "topic":
        return sorted.sort((a, b) => (a.topic || "").localeCompare(b.topic || ""));
      case "negative":
        const sentimentOrder = { negative: 0, neutral: 1, positive: 2 };
        return sorted.sort((a, b) => sentimentOrder[a.sentiment] - sentimentOrder[b.sentiment]);
      default:
        return sorted;
    }
  }, [posts, sortBy, sourceFilter]);

  const redditCount = posts?.filter(p => p.source === "Reddit").length || 0;
  const twitterCount = posts?.filter(p => p.source === "Twitter").length || 0;

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Recent Issues Reported in Social</CardTitle>
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
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Social Media Feed</CardTitle>
              <CardDescription>Twitter and Reddit discussions about {selectedProduct}</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncSprinklr}
              disabled={isSyncingSprinklr}
              className="gap-2"
            >
              {isSyncingSprinklr ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Twitter className="h-4 w-4" />
              )}
              Sync from Sprinklr
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No social posts found. Click "Sync from Sprinklr" to fetch Twitter data or "Ingest Reddit Posts" on the Dashboard.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Social Media Feed</CardTitle>
            <CardDescription>
              {filteredAndSortedPosts.length} posts from Twitter ({twitterCount}) and Reddit ({redditCount})
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncSprinklr}
            disabled={isSyncingSprinklr}
            className="gap-2"
          >
            {isSyncingSprinklr ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Sync Sprinklr
          </Button>
        </div>
        
        {/* Source filter */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            variant={sourceFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSourceFilter("all")}
          >
            All ({posts.length})
          </Button>
          <Button
            variant={sourceFilter === "twitter" ? "default" : "outline"}
            size="sm"
            onClick={() => setSourceFilter("twitter")}
            className="gap-1.5"
          >
            <Twitter className="h-3 w-3" />
            Twitter ({twitterCount})
          </Button>
          <Button
            variant={sourceFilter === "reddit" ? "default" : "outline"}
            size="sm"
            onClick={() => setSourceFilter("reddit")}
          >
            Reddit ({redditCount})
          </Button>
        </div>
        
        {/* Sort buttons */}
        <div className="flex flex-wrap gap-2 mt-2">
          {sortOptions.map((option) => (
            <Button
              key={option.value}
              variant={sortBy === option.value ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setSortBy(option.value)}
              className="gap-1.5"
            >
              {option.icon}
              {option.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {filteredAndSortedPosts.map((post) => (
            <SocialPostItem key={post.id} post={post} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
