import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Product to Feedback Portal forum mapping
// Only Intune has a dedicated forum on the Feedback Portal
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
  tags: string[];
  comments: number;
}

// Parse the HTML to extract feedback items from Feedback Portal
function parseFeedbackFromHTML(html: string): FeedbackItem[] {
  const items: FeedbackItem[] = [];
  
  // Match feedback links with their content
  // The format is: Vote count, author initials, author name, date, title, content, status, tags, comments
  const feedbackRegex = /\[__(\d+)\\[\s\S]*?Vote[\s\S]*?\\[\s\S]*?([A-Z]{2})[\s\S]*?\\[\s\S]*?([^\\]+)\\[\s\S]*?\\[\s\S]*?·[\s\S]*?\\[\s\S]*?(\d+\s+(?:months?|years?|days?|weeks?)\s+ago)[\s\S]*?\\[\s\S]*?\*\*([^*]+)\*\*[\s\S]*?\\[\s\S]*?([^\\]+)[\s\S]*?(Open|Planned|Under Review|Closed|Completed)[\s\S]*?__\s*(\d+)\s*comments[\s\S]*?\]\(([^)]+)\)/g;

  let match;
  let index = 0;

  while ((match = feedbackRegex.exec(html)) !== null && index < 50) {
    try {
      const votes = parseInt(match[1], 10);
      const authorInitials = match[2];
      const authorName = match[3].trim();
      const timeAgo = match[4].trim();
      const title = match[5].trim();
      const content = match[6].trim();
      const status = match[7];
      const comments = parseInt(match[8], 10);
      const url = match[9];

      // Extract the idea ID from URL
      const idMatch = url.match(/idea\/([a-f0-9-]+)/);
      if (!idMatch) continue;
      const id = idMatch[1];

      // Convert "X months ago" to approximate date
      const createdAt = parseRelativeDate(timeAgo);

      // Extract tags from content - look for category labels
      const tags: string[] = [];
      const tagPatterns = [
        /Linux/i, /iOS/i, /macOS/i, /Windows/i, /Android/i,
        /Enrollment/i, /Configuration/i, /Application/i, /Compliance/i,
        /Security/i, /Device/i, /Tenant/i, /Policy/i
      ];
      for (const pattern of tagPatterns) {
        if (pattern.test(content) || pattern.test(title)) {
          tags.push(pattern.source.replace(/\\i$/, ""));
        }
      }

      items.push({
        id,
        author: authorName || `User ${authorInitials}`,
        title,
        content,
        url: url.startsWith("http") ? url : `https://feedbackportal.microsoft.com${url}`,
        createdAt,
        votes,
        status,
        tags,
        comments,
      });
      
      index++;
    } catch (err) {
      console.error("Error parsing feedback item:", err);
    }
  }

  // Alternative parsing - simpler regex for the markdown structure
  if (items.length === 0) {
    console.log("Primary parsing failed, trying alternative method...");
    
    // Split by feedback entries (starts with vote count pattern)
    const lines = html.split("\n");
    let currentItem: Partial<FeedbackItem> | null = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Vote line
      const voteMatch = line.match(/^__(\d+)$/);
      if (voteMatch && lines[i+2]?.includes("Vote")) {
        if (currentItem && currentItem.id) {
          items.push(currentItem as FeedbackItem);
        }
        currentItem = {
          votes: parseInt(voteMatch[1], 10),
          tags: [],
          comments: 0,
        };
        continue;
      }
      
      // Author line (format: Name\n)
      if (currentItem && !currentItem.author && line.match(/^[A-Za-z\s]+$/) && line.length > 2 && line.length < 50) {
        // Check if this looks like an author name (not a status or tag)
        if (!["Open", "Planned", "Closed", "Under Review", "Completed", "Vote", "Follow", "Share"].includes(line)) {
          currentItem.author = line;
          continue;
        }
      }
      
      // Date line
      const dateMatch = line.match(/^(\d+)\s+(months?|years?|days?|weeks?)\s+ago$/);
      if (dateMatch && currentItem) {
        currentItem.createdAt = parseRelativeDate(line);
        continue;
      }
      
      // Title line (bold format)
      const titleMatch = line.match(/^\*\*(.+)\*\*\s*$/);
      if (titleMatch && currentItem) {
        currentItem.title = titleMatch[1].trim();
        continue;
      }
      
      // URL line
      const urlMatch = line.match(/\(https:\/\/feedbackportal\.microsoft\.com\/feedback\/idea\/([a-f0-9-]+)\)/);
      if (urlMatch && currentItem) {
        currentItem.id = urlMatch[1];
        currentItem.url = `https://feedbackportal.microsoft.com/feedback/idea/${urlMatch[1]}`;
      }
      
      // Comments line
      const commentsMatch = line.match(/__\s*(\d+)\s*comments/);
      if (commentsMatch && currentItem) {
        currentItem.comments = parseInt(commentsMatch[1], 10);
      }
      
      // Status line
      if (["Open", "Planned", "Under Review", "Closed", "Completed"].includes(line) && currentItem) {
        currentItem.status = line;
      }
      
      // Content - lines between title and status that aren't special
      if (currentItem && currentItem.title && !currentItem.content) {
        if (line.length > 20 && !line.startsWith("__") && !line.startsWith("[") && 
            !["Open", "Planned", "Under Review", "Closed", "Completed"].includes(line)) {
          currentItem.content = line;
        }
      }
    }
    
    // Add last item
    if (currentItem && currentItem.id) {
      items.push(currentItem as FeedbackItem);
    }
  }

  return items;
}

function parseRelativeDate(relativeStr: string): string {
  const now = new Date();
  const match = relativeStr.match(/(\d+)\s+(months?|years?|days?|weeks?)/);
  
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
    }
  }
  
  return now.toISOString();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { product = "intune", pages = 1 } = body;
    
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
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { forumId, forumName } = PRODUCT_FORUMS[product];
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    let allItems: FeedbackItem[] = [];
    const pagesToFetch = Math.min(pages, 10); // Limit to 10 pages

    console.log(`Fetching ${pagesToFetch} pages from Microsoft Feedback Portal for ${forumName}...`);

    for (let page = 1; page <= pagesToFetch; page++) {
      try {
        // The feedback portal uses a different pagination approach
        const portalUrl = `https://feedbackportal.microsoft.com/feedback/forum/${forumId}`;
        console.log(`Fetching page ${page}: ${portalUrl}`);
        
        const response = await fetch(portalUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
          },
        });

        if (!response.ok) {
          console.error(`Failed to fetch page ${page}: ${response.status}`);
          break;
        }

        const html = await response.text();
        const pageItems = parseFeedbackFromHTML(html);
        console.log(`Page ${page}: Found ${pageItems.length} feedback items`);
        
        // Filter to only items from the past month
        const recentItems = pageItems.filter(item => {
          const itemDate = new Date(item.createdAt);
          return itemDate >= oneMonthAgo;
        });
        
        allItems = allItems.concat(recentItems);
        
        // If all items on page are older than a month, stop
        if (recentItems.length === 0 && pageItems.length > 0) {
          console.log(`All items on page ${page} are older than 1 month, stopping.`);
          break;
        }
        
        // Small delay between pages
        if (page < pagesToFetch) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (pageError) {
        console.error(`Error fetching page ${page}:`, pageError);
        break;
      }
    }

    console.log(`Total feedback items to process: ${allItems.length}`);

    let newPosts = 0;
    let errors = 0;
    let skipped = 0;
    const ingestionStartTime = new Date().toISOString();

    // Process each feedback item
    for (const item of allItems) {
      try {
        // Check if item already exists by URL (feedback portal ID)
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

        // Map status to sentiment if classification failed
        let sentiment = classification?.sentiment ?? "neutral";
        if (!classification?.sentiment) {
          // Use status as a hint for sentiment
          if (item.status === "Closed" || item.status === "Completed") {
            sentiment = "positive";
          } else if (item.votes > 50) {
            sentiment = "negative"; // High-voted items are often pain points
          }
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
      total_processed: allItems.length,
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
        message: `Processed ${allItems.length} feedback items: ${newPosts} new, ${skipped} skipped, ${errors} errors`,
        new_posts: newPosts,
        skipped,
        total_processed: allItems.length,
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
