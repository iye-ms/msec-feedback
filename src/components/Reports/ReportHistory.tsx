import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ReactMarkdown from "react-markdown";
import type { Product } from "@/components/ProductSelector";

interface ReportHistoryProps {
  selectedProduct: Product;
}

export const ReportHistory = ({ selectedProduct }: ReportHistoryProps) => {
  const [selectedReport, setSelectedReport] = useState<any>(null);

  const { data: reports, isLoading } = useQuery({
    queryKey: ['report-history', selectedProduct],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_reports')
        .select('*')
        .eq('product', selectedProduct)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="shadow-sm">
            <CardHeader>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  if (!reports || reports.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardContent className="py-12 text-center space-y-4">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
          <div>
            <h3 className="text-lg font-semibold mb-2">No Report History</h3>
            <p className="text-muted-foreground">
              Generate your first report to see it here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {reports.map((report) => (
          <Card key={report.id} className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-lg">
                      Week of {new Date(report.week_start).toLocaleDateString()} - {new Date(report.week_end).toLocaleDateString()}
                    </CardTitle>
                  </div>
                  <CardDescription>
                    Generated on {new Date(report.created_at).toLocaleDateString()} at {new Date(report.created_at).toLocaleTimeString()}
                  </CardDescription>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedReport(report)}
                >
                  View Report
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Feedback</p>
                  <p className="text-2xl font-bold">{report.total_feedback.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Positive</p>
                  <p className="text-2xl font-bold text-success">
                    {Math.round((report.sentiment_breakdown.positive / report.total_feedback) * 100)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Negative</p>
                  <p className="text-2xl font-bold text-destructive">
                    {Math.round((report.sentiment_breakdown.negative / report.total_feedback) * 100)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Top Topics</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {report.top_topics.slice(0, 2).map((topic: string) => (
                      <Badge key={topic} variant="secondary" className="text-xs">
                        {topic}
                      </Badge>
                    ))}
                    {report.top_topics.length > 2 && (
                      <Badge variant="secondary" className="text-xs">
                        +{report.top_topics.length - 2}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Weekly Report - {selectedReport && new Date(selectedReport.week_start).toLocaleDateString()} to {selectedReport && new Date(selectedReport.week_end).toLocaleDateString()}
            </DialogTitle>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-4">
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Feedback
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{selectedReport.total_feedback.toLocaleString()}</div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Positive
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-success">
                      {Math.round((selectedReport.sentiment_breakdown.positive / selectedReport.total_feedback) * 100)}%
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Negative
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-destructive">
                      {Math.round((selectedReport.sentiment_breakdown.negative / selectedReport.total_feedback) * 100)}%
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Issues
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-warning">
                      {selectedReport.emerging_issues?.length || 0}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Top Topics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {selectedReport.top_topics.map((topic: string) => (
                      <Badge key={topic} variant="secondary" className="text-sm py-1 px-3">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {selectedReport.emerging_issues && selectedReport.emerging_issues.length > 0 && (
                <Card className="shadow-sm border-warning">
                  <CardHeader>
                    <CardTitle className="text-warning">Emerging Issues</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {selectedReport.emerging_issues.map((issue: string, index: number) => (
                        <li key={index} className="text-sm p-3 rounded-lg bg-warning/10 border border-warning/20">
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              <Card className="shadow-sm border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
                <CardHeader className="border-b border-primary/10 pb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl">Executive Summary</CardTitle>
                      <CardDescription>AI-generated insights and recommendations</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="prose prose-sm max-w-none dark:prose-invert leading-relaxed text-foreground/90">
                    <ReactMarkdown
                      components={{
                        ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-2 my-4" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal list-inside space-y-2 my-4" {...props} />,
                        li: ({node, ...props}) => <li className="ml-4" {...props} />,
                        p: ({node, ...props}) => <p className="my-3" {...props} />,
                        h1: ({node, ...props}) => <h1 className="text-xl font-bold mt-6 mb-3" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-lg font-bold mt-5 mb-2" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-base font-semibold mt-4 mb-2" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-semibold text-foreground" {...props} />,
                      }}
                    >
                      {selectedReport.summary}
                    </ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
