import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Product to Feedback Portal forum mapping
const PRODUCT_FORUMS: Record<string, { forumId: string; forumName: string }> = {
  intune: { forumId: "ef1d6d38-fd1b-ec11-b6e7-0022481f8472", forumName: "Microsoft Intune" },
};

interface FeedbackItem {
  id: string;
  author: string;
  title: string;
  content: string;
  url: string;
  createdAt: string;
  votes: number;
  status: string;
  comments: number;
}

// Parse the scraped markdown content to extract feedback items
function parseFeedbackFromMarkdown(markdown: string, forumId: string): FeedbackItem[] {
  const items: FeedbackItem[] = [];
  
  // The markdown format from Firecrawl looks like:
  // [__213\\n\\nVote](url)
  // [CS\\n\\nCarlos Gonzalez Silva\\n\\n·\\n\\n2 months ago\\n\\n**Title**](url)
  // [Content...](url)
  
  // Find all feedback entries using regex
  // Pattern: Vote count link followed by author/title link
  const votePattern = /\[__(\d+)\\\\n\\\\n\\\\nVote\]\(https:\/\/feedbackportal\.microsoft\.com\/feedback\/idea\/([a-f0-9-]+)\)/g;
  const detailPattern = /\[([A-Z]{1,2})\\\\n\\\\n([^\\]+)\\\\n\\\\n·\\\\n\\\\n(\d+\s+(?:months?|years?|days?|weeks?|hours?)\s+ago)\\\\n\\\\n\*\*([^*]+)\*\*\]\(https:\/\/feedbackportal\.microsoft\.com\/feedback\/idea\/([a-f0-9-]+)\)/g;
  
  // Alternative simpler approach: split by feedback idea URLs and parse each section
  const sections = markdown.split(/\[__\d+/);
  
  for (const section of sections) {
    if (!section.trim()) continue;
    
    // Extract vote count
    const voteMatch = section.match(/^(\d+)/);
    if (!voteMatch) continue;
    const votes = parseInt(voteMatch[1]);
    
    // Extract idea ID from URL
    const idMatch = section.match(/feedback\/idea\/([a-f0-9-]+)/);
    if (!idMatch) continue;
    const id = idMatch[1];
    
    // Extract author initials and name
    const authorMatch = section.match(/\[([A-Z]{1,2})\\\\n\\\\n([A-Za-z\s]+)\\\\n/);
    const author = authorMatch ? authorMatch[2].trim() : "Anonymous";
    
    // Extract date
    const dateMatch = section.match(/(\d+)\s+(months?|years?|days?|weeks?|hours?)\s+ago/i);
    const createdAt = dateMatch ? parseRelativeDate(`${dateMatch[1]} ${dateMatch[2]} ago`) : new Date().toISOString();
    
    // Extract title (bold text)
    const titleMatch = section.match(/\*\*([^*]+)\*\*/);
    if (!titleMatch) continue;
    const title = titleMatch[1].trim();
    
    // Extract content - text after the title before next section
    const contentMatch = section.match(/\*\*[^*]+\*\*\]\([^)]+\)\s*\n?\s*\[?([^\]]*)/);
    let content = contentMatch ? contentMatch[1].replace(/\\n/g, ' ').trim() : title;
    // Clean up content
    content = content.replace(/\[.*?\]\([^)]+\)/g, '').trim();
    if (content.length < 10) content = title;
    
    // Extract status
    const statusMatch = section.match(/(Open|Planned|Under Review|Closed|Completed)/);
    const status = statusMatch ? statusMatch[1] : "Open";
    
    // Extract comments count
    const commentsMatch = section.match(/__\s*(\d+)\s*comments?/i);
    const comments = commentsMatch ? parseInt(commentsMatch[1]) : 0;
    
    items.push({
      id,
      author,
      title,
      content: content.substring(0, 500),
      url: `https://feedbackportal.microsoft.com/feedback/idea/${id}`,
      createdAt,
      votes,
      status,
      comments,
    });
  }
  
  // If the above parsing didn't work, try a more lenient approach
  if (items.length === 0) {
    console.log("Primary parsing failed, trying alternative method...");
    
    // Look for any idea URLs and extract surrounding context
    const ideaUrlPattern = /https:\/\/feedbackportal\.microsoft\.com\/feedback\/idea\/([a-f0-9-]+)/g;
    const seenIds = new Set<string>();
    let match;
    
    while ((match = ideaUrlPattern.exec(markdown)) !== null) {
      const id = match[1];
      if (seenIds.has(id)) continue;
      seenIds.add(id);
      
      // Get context around this URL (500 chars before and after)
      const start = Math.max(0, match.index - 500);
      const end = Math.min(markdown.length, match.index + 500);
      const context = markdown.substring(start, end);
      
      // Extract vote count
      const voteMatch = context.match(/__(\d+)/);
      const votes = voteMatch ? parseInt(voteMatch[1]) : 0;
      
      // Extract title - get only the bold text, clean it
      const titleMatch = context.match(/\*\*([^*]{10,}?)\*\*/);
      if (!titleMatch) continue;
      let title = titleMatch[1].trim();
      // Clean the title - remove markdown artifacts and truncate
      title = title.replace(/\\+n/g, ' ').replace(/\\+/g, '').replace(/\s+/g, ' ').trim();
      if (title.length > 150) title = title.substring(0, 150) + "...";
      
      // Extract date
      const dateMatch = context.match(/(\d+)\s+(months?|years?|days?|weeks?|hours?)\s+ago/i);
      const createdAt = dateMatch ? parseRelativeDate(`${dateMatch[1]} ${dateMatch[2]} ago`) : new Date().toISOString();
      
      // Extract author - look for name pattern after initials
      const authorMatch = context.match(/([A-Z][a-z]+(?:[\s,]+[A-Z][a-z]+)*)\s*\\\\n\\\\n·/);
      const author = authorMatch ? authorMatch[1].trim() : "Anonymous";
      
      items.push({
        id,
        author,
        title,
        content: title,
        url: `https://feedbackportal.microsoft.com/feedback/idea/${id}`,
        createdAt,
        votes,
        status: "Open",
        comments: 0,
      });
    }
  }
  
  // Deduplicate by title to avoid near-duplicates
  const uniqueItems: FeedbackItem[] = [];
  const seenTitles = new Set<string>();
  for (const item of items) {
    const normalizedTitle = item.title.toLowerCase().trim();
    if (!seenTitles.has(normalizedTitle)) {
      seenTitles.add(normalizedTitle);
      uniqueItems.push(item);
    }
  }
  
  return uniqueItems;
}

function parseRelativeDate(relativeStr: string): string {
  const now = new Date();
  const match = relativeStr.match(/(\d+)\s+(months?|years?|days?|weeks?|hours?)/i);
  
  if (match) {
    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    
    if (unit.startsWith("month")) {
      now.setMonth(now.getMonth() - value);
    } else if (unit.startsWith("year")) {
      now.setFullYear(now.getFullYear() - value);
    } else if (unit.startsWith("week")) {
      now.setDate(now.getDate() - (value * 7));
    } else if (unit.startsWith("day")) {
      now.setDate(now.getDate() - value);
    } else if (unit.startsWith("hour")) {
      now.setHours(now.getHours() - value);
    }
  }
  
  return now.toISOString();
}

// Firecrawl REST API call
async function scrapeWithFirecrawl(url: string, apiKey: string): Promise<{ markdown: string } | null> {
  const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: url,
      formats: ["markdown"],
      waitFor: 5000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Firecrawl API error: ${response.status} - ${errorText}`);
    return null;
  }

  const data = await response.json();
  console.log("Firecrawl response status:", data.success);
  
  if (data.success && data.data) {
    return { markdown: data.data.markdown || "" };
  }
  
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { product = "intune" } = body;
    
    if (!PRODUCT_FORUMS[product]) {
      return new Response(
        JSON.stringify({
          error: `Product '${product}' not available on Feedback Portal. Only 'intune' is supported.`,
          available_products: Object.keys(PRODUCT_FORUMS),
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    const firecrawlApiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlApiKey) {
      return new Response(
        JSON.stringify({ error: "FIRECRAWL_API_KEY not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { forumId, forumName } = PRODUCT_FORUMS[product];
    // Sort by newest to get recent posts first
    const portalUrl = `https://feedbackportal.microsoft.com/feedback/forum/${forumId}?sort=newest`;
    
    console.log(`Scraping ${forumName} from ${portalUrl} using Firecrawl...`);

    // Use Firecrawl REST API to scrape the JavaScript-rendered page
    const scrapeResult = await scrapeWithFirecrawl(portalUrl, firecrawlApiKey);
    
    if (!scrapeResult) {
      return new Response(
        JSON.stringify({ error: "Failed to scrape Feedback Portal via Firecrawl" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const markdownContent = scrapeResult.markdown || "";
    console.log(`Firecrawl returned ${markdownContent.length} characters of markdown`);
    
    // Log a sample of the markdown for debugging
    console.log("Markdown sample (first 1000 chars):", markdownContent.substring(0, 1000));
    
    // Parse the markdown content
    const allItems = parseFeedbackFromMarkdown(markdownContent, forumId);
    console.log(`Parsed ${allItems.length} feedback items`);

    // Filter to recent items (past month)
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    const recentItems = allItems.filter(item => {
      const itemDate = new Date(item.createdAt);
      return itemDate >= oneMonthAgo;
    });
    
    console.log(`${recentItems.length} items from past month`);

    let newPosts = 0;
    let errors = 0;
    let skipped = 0;
    const ingestionStartTime = new Date().toISOString();

    // Process each feedback item
    for (const item of recentItems) {
      try {
        // Check if item already exists by URL
        const { data: existing } = await supabase
          .from("feedback_entries")
          .select("id")
          .eq("url", item.url)
          .maybeSingle();

        if (existing) {
          skipped++;
          continue;
        }

        // Classify the feedback using AI
        const { data: classification, error: classificationError } = await supabase.functions.invoke(
          "classify-feedback",
          { body: { content: `${item.title}\n\n${item.content}` } }
        );

        if (classificationError) {
          console.error("Classification error:", classificationError);
        }

        // Use votes to help determine sentiment
        let sentiment = classification?.sentiment ?? "neutral";
        if (!classification?.sentiment && item.votes > 50) {
          sentiment = "negative"; // High-voted items are often pain points
        }

        // Insert into database
        const { error: insertError } = await supabase.from("feedback_entries").insert({
          source: "FeedbackPortal",
          author: item.author,
          title: item.title,
          timestamp: item.createdAt,
          content: item.content,
          url: item.url,
          sentiment: sentiment,
          topic: classification?.topic ?? "Feature Request",
          feedback_type: classification?.feedback_type ?? "feature_request",
          engagement_score: item.votes,
          score: item.votes,
          product: product,
        });

        if (insertError) {
          console.error("Insert error:", insertError);
          errors++;
        } else {
          newPosts++;
          console.log(`Added: ${item.title.substring(0, 50)}... (${item.votes} votes)`);
        }
      } catch (error) {
        console.error("Error processing feedback item:", error);
        errors++;
      }
    }

    // Record ingestion metadata
    await supabase.from("ingestion_metadata").insert({
      product: product,
      last_ingestion_time: ingestionStartTime,
      status: errors > 0 ? "partial_success" : "success",
      new_posts: newPosts,
      total_processed: recentItems.length,
      errors: errors,
    });

    // Generate weekly report if we have new data
    if (newPosts > 0) {
      console.log(`Triggering weekly report for ${product}...`);
      await supabase.functions.invoke("generate-weekly-report", { body: { product } });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${recentItems.length} feedback items: ${newPosts} new, ${skipped} skipped, ${errors} errors`,
        new_posts: newPosts,
        skipped,
        total_processed: recentItems.length,
        total_scraped: allItems.length,
        source: "FeedbackPortal",
        forum: forumName,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Ingestion error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
