import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, RefreshCw } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const DataIngestionPanel = () => {
  const [isIngesting, setIsIngesting] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const handleIngestReddit = async () => {
    try {
      setIsIngesting(true);
      toast.info("Fetching Reddit posts...");
      
      const { data, error } = await supabase.functions.invoke('ingest-reddit');
      
      if (error) {
        console.error('Ingestion error:', error);
        throw error;
      }
      
      toast.success(`Success! ${data?.new_posts || 0} new posts added`);
      setTimeout(() => window.location.reload(), 1500);
    } catch (error: any) {
      console.error('Failed to ingest:', error);
      toast.error(error.message || "Failed to ingest Reddit data. Check edge function logs.");
    } finally {
      setIsIngesting(false);
    }
  };

  const handleGenerateReport = async () => {
    try {
      setIsGeneratingReport(true);
      toast.info("Generating weekly report with AI...");
      
      const { data, error } = await supabase.functions.invoke('generate-weekly-report');
      
      if (error) {
        console.error('Report error:', error);
        throw error;
      }
      
      toast.success("Weekly report generated successfully!");
      setTimeout(() => window.location.reload(), 1500);
    } catch (error: any) {
      console.error('Failed to generate report:', error);
      toast.error(error.message || "Failed to generate report. Check edge function logs.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return (
    <Card className="shadow-sm border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Manual Data Operations
        </CardTitle>
        <CardDescription>
          Manually trigger data ingestion and report generation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2">
          <Button
            onClick={handleIngestReddit}
            disabled={isIngesting}
            className="w-full"
            size="lg"
          >
            <Download className="h-4 w-4 mr-2" />
            {isIngesting ? "Ingesting..." : "Ingest Reddit Posts Now"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Fetches latest posts from r/Intune and classifies them with AI
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            onClick={handleGenerateReport}
            disabled={isGeneratingReport}
            variant="outline"
            className="w-full"
            size="lg"
          >
            <FileText className="h-4 w-4 mr-2" />
            {isGeneratingReport ? "Generating..." : "Generate Weekly Report"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Creates an AI-generated summary of the past 7 days
          </p>
        </div>
      </CardContent>
    </Card>
  );
};