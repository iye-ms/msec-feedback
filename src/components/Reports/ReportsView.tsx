import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Download, Calendar, TrendingUp, History } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { ReportHistory } from "./ReportHistory";
import type { Product } from "@/components/ProductSelector";

interface ReportsViewProps {
  selectedProduct: Product;
}

export const ReportsView = ({ selectedProduct }: ReportsViewProps) => {
  const { data: report, isLoading } = useQuery({
    queryKey: ['weekly-report', selectedProduct],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_reports')
        .select('*')
        .eq('product', selectedProduct)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        // If no reports exist, return null
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return data;
    },
  });

  const { data: allFeedback } = useQuery({
    queryKey: ['all-feedback-for-export', selectedProduct],
    queryFn: async () => {
      if (!report) return [];
      
      const { data, error } = await supabase
        .from('feedback_entries')
        .select('*')
        .eq('product', selectedProduct)
        .gte('timestamp', report.week_start)
        .lte('timestamp', report.week_end)
        .order('timestamp', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!report,
  });

  const exportToCSV = () => {
    if (!allFeedback || allFeedback.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = [
      "ID",
      "Source",
      "Author",
      "Timestamp",
      "Topic",
      "Sentiment",
      "Type",
      "Engagement",
      "Content",
    ];

    const rows = allFeedback.map((entry: any) => [
      entry.id,
      entry.source,
      entry.author,
      entry.timestamp,
      entry.topic,
      entry.sentiment,
      entry.feedback_type,
      entry.engagement_score.toString(),
      `"${entry.content.replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${selectedProduct}-feedback-${report?.week_start}-to-${report?.week_end}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("CSV exported successfully!");
  };

  const exportToPDF = () => {
    toast.info("PDF export coming soon! Use CSV export for now.");
  };

  const generateNewReport = async () => {
    try {
      toast.info(`Generating new weekly report for ${selectedProduct.toUpperCase()}...`);
      
      const { data, error } = await supabase.functions.invoke('generate-weekly-report', {
        body: { product: selectedProduct },
      });
      
      if (error) throw error;
      
      toast.success(`Report for ${selectedProduct.toUpperCase()} generated successfully!`);
      window.location.reload();
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate report. Please check the edge function logs.");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="shadow-sm">
          <CardHeader>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
        </Card>
        <div className="grid gap-6 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="shadow-sm">
              <CardHeader>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <Card className="shadow-sm">
        <CardContent className="py-12 text-center space-y-4">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
          <div>
            <h3 className="text-lg font-semibold mb-2">No Reports Yet</h3>
            <p className="text-muted-foreground mb-4">
              Weekly reports for {selectedProduct.toUpperCase()} are generated automatically every Monday at 9 AM, or you can generate one manually.
            </p>
            <Button onClick={generateNewReport}>
              Generate Report Now
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="latest" className="space-y-6">
      <TabsList className="bg-card border border-border shadow-sm">
        <TabsTrigger value="latest" className="gap-2">
          <FileText className="h-4 w-4" />
          Latest Report
        </TabsTrigger>
        <TabsTrigger value="history" className="gap-2">
          <History className="h-4 w-4" />
          All Reports
        </TabsTrigger>
      </TabsList>

      <TabsContent value="latest" className="space-y-6">
      {/* Report Header */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl">Weekly Feedback Report</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {new Date(report.week_start).toLocaleDateString()} -{" "}
                {new Date(report.week_end).toLocaleDateString()}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={exportToPDF}>
                <FileText className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <Button variant="outline" size="sm" onClick={generateNewReport}>
                Generate New
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Feedback
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{report.total_feedback.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Positive Sentiment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">
              {Math.round((report.sentiment_breakdown.positive / report.total_feedback) * 100)}%
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Negative Sentiment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">
              {Math.round((report.sentiment_breakdown.negative / report.total_feedback) * 100)}%
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Emerging Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-warning">
              {report.emerging_issues?.length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Topics */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Top Topics
          </CardTitle>
          <CardDescription>Most discussed areas this week</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {report.top_topics.map((topic: string) => (
              <Badge key={topic} variant="secondary" className="text-sm py-1 px-3">
                {topic}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Emerging Issues */}
      {report.emerging_issues && report.emerging_issues.length > 0 && (
        <Card className="shadow-sm border-warning">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <TrendingUp className="h-5 w-5" />
              Emerging Issues (Requires Attention)
            </CardTitle>
            <CardDescription>Topics with high negative sentiment</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {report.emerging_issues.map((issue: string, index: number) => (
                <li key={index} className="text-sm p-3 rounded-lg bg-warning/10 border border-warning/20">
                  {issue}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* AI Summary */}
      <Card className="shadow-sm border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardHeader className="border-b border-primary/10 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">Executive Summary</CardTitle>
              <CardDescription>
                AI-generated insights and recommendations for {new Date(report.week_start).toLocaleDateString()} - {new Date(report.week_end).toLocaleDateString()}
              </CardDescription>
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
              {report.summary}
            </ReactMarkdown>
          </div>
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="history">
        <ReportHistory selectedProduct={selectedProduct} />
      </TabsContent>
    </Tabs>
  );
};
