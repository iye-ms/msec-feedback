import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Calendar, TrendingUp } from "lucide-react";
import { mockWeeklyReport, mockFeedbackData } from "@/data/mockFeedback";
import { toast } from "sonner";

export const ReportsView = () => {
  const report = mockWeeklyReport;

  const exportToCSV = () => {
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

    const rows = mockFeedbackData.map((entry) => [
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
    link.setAttribute("download", `intune-feedback-${report.week_start}-to-${report.week_end}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("CSV exported successfully!");
  };

  const exportToPDF = () => {
    // In production, use a library like jsPDF
    toast.info("PDF export coming soon! Use CSV export for now.");
  };

  return (
    <div className="space-y-6">
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
              {report.sentiment_breakdown.positive}%
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Neutral Sentiment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {report.sentiment_breakdown.neutral}%
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
              {report.sentiment_breakdown.negative}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Topics */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Top Topics</CardTitle>
          <CardDescription>Most discussed areas this week</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {report.top_topics.map((topic, index) => (
              <Badge key={topic} variant="outline" className="text-sm py-2 px-4">
                #{index + 1} {topic}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Emerging Issues */}
      <Card className="shadow-sm border-warning">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-warning" />
            Emerging Issues
          </CardTitle>
          <CardDescription>Topics requiring immediate attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {report.emerging_issues.map((issue, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-4 rounded-lg border border-warning/20 bg-warning/5"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-warning/10 text-warning font-semibold text-sm flex-shrink-0">
                  {index + 1}
                </div>
                <p className="text-sm">{issue}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI-Generated Summary */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>AI-Generated Summary</CardTitle>
          <CardDescription>Automated analysis and insights</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <div className="whitespace-pre-wrap text-sm leading-relaxed">{report.summary}</div>
          </div>
        </CardContent>
      </Card>

      {/* Historical Reports */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Previous Reports</CardTitle>
          <CardDescription>Access historical weekly summaries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { week: "Nov 4-11, 2025", status: "current" },
              { week: "Oct 28 - Nov 4, 2025", status: "archived" },
              { week: "Oct 21-28, 2025", status: "archived" },
              { week: "Oct 14-21, 2025", status: "archived" },
            ].map((item) => (
              <div
                key={item.week}
                className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{item.week}</p>
                    {item.status === "current" && (
                      <Badge variant="outline" className="mt-1">
                        Current Report
                      </Badge>
                    )}
                  </div>
                </div>
                <Button variant="outline" size="sm" disabled={item.status === "archived"}>
                  {item.status === "current" ? "Viewing" : "View Report"}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
