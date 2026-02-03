import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { Product } from "@/components/ProductSelector";

interface CsvUploadDialogProps {
  selectedProduct: Product;
  onUploadComplete: () => void;
}

export const CsvUploadDialog = ({ selectedProduct, onUploadComplete }: CsvUploadDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    newPosts?: number;
    duplicates?: number;
    errors?: number;
    message?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        toast.error("Please select a CSV file");
        return;
      }
      setSelectedFile(file);
      setUploadResult(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadResult(null);

    try {
      const csvContent = await selectedFile.text();
      
      const { data, error } = await supabase.functions.invoke("upload-sprinklr-csv", {
        body: { csvContent, product: selectedProduct },
      });

      if (error) throw error;

      if (data.success) {
        setUploadResult({
          success: true,
          newPosts: data.new_posts,
          duplicates: data.duplicates,
          errors: data.errors,
        });
        toast.success(`Imported ${data.new_posts} new Twitter posts`);
        onUploadComplete();
      } else {
        throw new Error(data.error || "Upload failed");
      }
    } catch (err) {
      console.error("CSV upload error:", err);
      setUploadResult({
        success: false,
        message: err instanceof Error ? err.message : "Upload failed",
      });
      toast.error("Failed to import CSV");
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setSelectedFile(null);
    setUploadResult(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Upload className="h-4 w-4" />
          Upload CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Sprinklr Data</DialogTitle>
          <DialogDescription>
            Upload a CSV export from Sprinklr containing Twitter/social media data.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* File selection */}
          <div 
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            {selectedFile ? (
              <div className="flex items-center justify-center gap-2 text-foreground">
                <FileText className="h-5 w-5" />
                <span className="font-medium">{selectedFile.name}</span>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Click to select a CSV file
                </p>
              </div>
            )}
          </div>

          {/* Upload result */}
          {uploadResult && (
            <div className={`rounded-lg p-4 ${uploadResult.success ? 'bg-green-500/10' : 'bg-destructive/10'}`}>
              {uploadResult.success ? (
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-green-700">Import successful!</p>
                    <ul className="mt-1 text-green-600 space-y-0.5">
                      <li>✓ {uploadResult.newPosts} new posts imported</li>
                      {uploadResult.duplicates! > 0 && (
                        <li>• {uploadResult.duplicates} duplicates skipped</li>
                      )}
                      {uploadResult.errors! > 0 && (
                        <li>• {uploadResult.errors} rows had errors</li>
                      )}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-destructive">Import failed</p>
                    <p className="mt-1 text-destructive/80">{uploadResult.message}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Expected format info */}
          <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
            <p className="font-medium mb-1">Expected CSV columns:</p>
            <p>message/text/content, author/username, permalink/url, created/date, sentiment, likes, retweets, replies</p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose}>
            {uploadResult?.success ? "Done" : "Cancel"}
          </Button>
          {!uploadResult?.success && (
            <Button 
              onClick={handleUpload} 
              disabled={!selectedFile || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                "Import Data"
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
