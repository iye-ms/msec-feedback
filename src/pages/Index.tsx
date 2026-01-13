import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, Tags, TrendingUp, List, FileText, ShieldCheck, BarChart3, ExternalLink } from "lucide-react";
import { SentimentChart } from "@/components/Dashboard/SentimentChart";
import { TopicsChart } from "@/components/Dashboard/TopicsChart";
import { StatsCards } from "@/components/Dashboard/StatsCards";
import { RecentFeedback } from "@/components/Dashboard/RecentFeedback";
import { EmergingIssues } from "@/components/Dashboard/EmergingIssues";
import { TopicsView } from "@/components/Topics/TopicsView";
import { RawFeedView } from "@/components/Feed/RawFeedView";
import { ReportsView } from "@/components/Reports/ReportsView";
import { DataIngestionPanel } from "@/components/Dashboard/DataIngestionPanel";
import { ProductSelector, type Product } from "@/components/ProductSelector";
import { useAutoIngestion } from "@/hooks/useAutoIngestion";
import { RedditPreview } from "@/components/Sprinklr/RedditPreview";

const Index = () => {
  const [selectedProduct, setSelectedProduct] = useState<Product>("intune");
  
  // Auto-fetch new data when the page loads (with 30-minute cooldown)
  useAutoIngestion(selectedProduct);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <ShieldCheck className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Microsoft Security Feedback Tracker</h1>
                <p className="text-sm text-muted-foreground">
                  AI-powered customer feedback analysis and insights
                </p>
              </div>
            </div>
            <ProductSelector 
              selectedProduct={selectedProduct} 
              onProductChange={setSelectedProduct}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="bg-card border border-border shadow-sm">
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="topics" className="gap-2">
              <Tags className="h-4 w-4" />
              Topics
            </TabsTrigger>
            <TabsTrigger value="trends" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Trends
            </TabsTrigger>
            <TabsTrigger value="feed" className="gap-2">
              <List className="h-4 w-4" />
              Raw Feed
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2">
              <FileText className="h-4 w-4" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="sprinklr" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Sprinklr
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <StatsCards selectedProduct={selectedProduct} />
              </div>
              <div>
                <DataIngestionPanel selectedProduct={selectedProduct} />
              </div>
            </div>
            
            <div className="grid gap-6 lg:grid-cols-2">
              <SentimentChart selectedProduct={selectedProduct} />
              <TopicsChart selectedProduct={selectedProduct} />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <RecentFeedback selectedProduct={selectedProduct} />
              </div>
              <div>
                <EmergingIssues selectedProduct={selectedProduct} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="topics">
            <TopicsView selectedProduct={selectedProduct} />
          </TabsContent>

          <TabsContent value="trends">
            <div className="space-y-6">
              <SentimentChart selectedProduct={selectedProduct} />
              <div className="rounded-lg border border-border bg-card p-8 text-center shadow-sm">
                <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Extended Historical Analysis</h3>
                <p className="text-muted-foreground">
                  Multi-month trend comparison coming soon
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="feed">
            <RawFeedView selectedProduct={selectedProduct} />
          </TabsContent>

          <TabsContent value="reports">
            <ReportsView selectedProduct={selectedProduct} />
          </TabsContent>

          <TabsContent value="sprinklr" className="space-y-6">
            <div className="rounded-lg border border-border bg-card shadow-sm p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-primary" />
                <div>
                  <h2 className="font-semibold">Sprinklr Dashboard</h2>
                  <p className="text-sm text-muted-foreground">Social engagement analytics (SSO required)</p>
                </div>
              </div>
              <a
                href="https://space-microsoft.sprinklr.com/social/engagement/dashboard/5fd9736ee20e3d4618cee1fd"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Open Dashboard
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>

            <RedditPreview selectedProduct={selectedProduct} />
          </TabsContent>
        </Tabs>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 py-4 mt-8">
        <p className="text-center text-sm text-muted-foreground">
          Created by Iris Yuning Ye and Lovable
        </p>
      </footer>
    </div>
  );
};

export default Index;
