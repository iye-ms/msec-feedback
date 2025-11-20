import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, RefreshCw } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { Product } from "@/components/ProductSelector";

interface DataIngestionPanelProps {
  selectedProduct: Product;
}

export const DataIngestionPanel = ({ selectedProduct }: DataIngestionPanelProps) => {
  const [isIngesting, setIsIngesting] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const handleIngestReddit = async () => {
    try {
      setIsIngesting(true);
      toast.info(`Fetching Reddit posts for ${selectedProduct}...`);
      
      const { data, error } = await supabase.functions.invoke('ingest-reddit', {
        body: { product: selectedProduct },
      });
      
      if (error) {
        console.error('Ingestion error:', error);
        throw error;
      }
      
      toast.success(`Success! ${data?.new_posts || 0} new posts added for ${selectedProduct.toUpperCase()}`);
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
      toast.info(`Generating weekly report for ${selectedProduct.toUpperCase()}...`);
      
      const { data, error } = await supabase.functions.invoke('generate-weekly-report', {
        body: { product: selectedProduct },
      });
      
      if (error) {
        console.error('Report error:', error);
        throw error;
      }
      
      toast.success(`Weekly report for ${selectedProduct.toUpperCase()} generated successfully!`);
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
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <RefreshCw className="h-4 w-4" />
          Manual Data Operations
        </CardTitle>
        <CardDescription className="text-xs">
          Trigger data ingestion and reports
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col gap-1.5">
          <Button
            onClick={handleIngestReddit}
            disabled={isIngesting}
            className="w-full"
            size="sm"
          >
            <Download className="h-3 w-3 mr-2" />
            {isIngesting ? "Ingesting..." : `Ingest ${selectedProduct.toUpperCase()} Posts`}
          </Button>
          <p className="text-xs text-muted-foreground">
            Fetch r/{selectedProduct === "purview" ? "MicrosoftPurview" : selectedProduct} posts
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Button
            onClick={handleGenerateReport}
            disabled={isGeneratingReport}
            variant="outline"
            className="w-full"
            size="sm"
          >
            <FileText className="h-3 w-3 mr-2" />
            {isGeneratingReport ? "Generating..." : "Generate Report"}
          </Button>
          <p className="text-xs text-muted-foreground">
            AI summary of past 7 days
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
