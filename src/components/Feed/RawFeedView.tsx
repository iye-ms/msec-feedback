import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, ExternalLink, Calendar, Filter } from "lucide-react";
import { mockFeedbackData } from "@/data/mockFeedback";
import { FeedbackEntry, FeedbackSource, Sentiment, FeedbackType } from "@/types/feedback";

export const RawFeedView = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<FeedbackSource | "all">("all");
  const [sentimentFilter, setSentimentFilter] = useState<Sentiment | "all">("all");
  const [typeFilter, setTypeFilter] = useState<FeedbackType | "all">("all");
  const [sortBy, setSortBy] = useState<"timestamp" | "engagement">("timestamp");
  const [selectedEntry, setSelectedEntry] = useState<FeedbackEntry | null>(null);

  const filteredAndSortedData = useMemo(() => {
    let filtered = mockFeedbackData;

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(
        (entry) =>
          entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          entry.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
          entry.topic.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply filters
    if (sourceFilter !== "all") {
      filtered = filtered.filter((entry) => entry.source === sourceFilter);
    }
    if (sentimentFilter !== "all") {
      filtered = filtered.filter((entry) => entry.sentiment === sentimentFilter);
    }
    if (typeFilter !== "all") {
      filtered = filtered.filter((entry) => entry.feedback_type === typeFilter);
    }

    // Sort
    return filtered.sort((a, b) => {
      if (sortBy === "timestamp") {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      }
      return b.engagement_score - a.engagement_score;
    });
  }, [searchQuery, sourceFilter, sentimentFilter, typeFilter, sortBy]);

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search content, author, or topic..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filter Row */}
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Source</label>
              <Select value={sourceFilter} onValueChange={(value: any) => setSourceFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="Reddit">Reddit</SelectItem>
                  <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                  <SelectItem value="TechCommunity">TechCommunity</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Sentiment</label>
              <Select
                value={sentimentFilter}
                onValueChange={(value: any) => setSentimentFilter(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sentiments</SelectItem>
                  <SelectItem value="positive">Positive</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="negative">Negative</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Type</label>
              <Select value={typeFilter} onValueChange={(value: any) => setTypeFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="bug">Bug</SelectItem>
                  <SelectItem value="feature_request">Feature Request</SelectItem>
                  <SelectItem value="praise">Praise</SelectItem>
                  <SelectItem value="question">Question</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Sort By</label>
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="timestamp">Most Recent</SelectItem>
                  <SelectItem value="engagement">Most Engaged</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">
              Showing {filteredAndSortedData.length} of {mockFeedbackData.length} entries
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setSourceFilter("all");
                setSentimentFilter("all");
                setTypeFilter("all");
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Feedback Entries</CardTitle>
          <CardDescription>Complete list of customer feedback with all metadata</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Topic</TableHead>
                  <TableHead>Sentiment</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Engagement</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedData.map((entry) => (
                  <TableRow
                    key={entry.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedEntry(entry)}
                  >
                    <TableCell>
                      <Badge variant="outline" className={sourceColors[entry.source]}>
                        {entry.source}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{entry.author}</TableCell>
                    <TableCell>{entry.topic}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={sentimentColors[entry.sentiment]}>
                        {entry.sentiment}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {entry.feedback_type.replace("_", " ")}
                    </TableCell>
                    <TableCell>{entry.engagement_score}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(entry.timestamp)}
                    </TableCell>
                    <TableCell>
                      <a
                        href={entry.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {selectedEntry && (
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={sourceColors[selectedEntry.source]}>
                    {selectedEntry.source}
                  </Badge>
                  <Badge variant="outline" className={sentimentColors[selectedEntry.sentiment]}>
                    {selectedEntry.sentiment}
                  </Badge>
                  <Badge variant="outline">{selectedEntry.feedback_type.replace("_", " ")}</Badge>
                </div>
                <CardTitle>{selectedEntry.topic}</CardTitle>
                <CardDescription>
                  {selectedEntry.author} • {formatDate(selectedEntry.timestamp)} •{" "}
                  {selectedEntry.engagement_score} engagement
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedEntry(null)}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Full Content</h4>
              <p className="text-sm leading-relaxed">{selectedEntry.content}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <a
                  href={selectedEntry.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Original Post
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
