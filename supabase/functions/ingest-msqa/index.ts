import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Product to Microsoft Q&A tag mapping
const PRODUCT_TAGS: Record<string, { tagId: string; tagName: string }> = {
  intune: { tagId: "456", tagName: "microsoft-security-intune" },
  entra: { tagId: "455", tagName: "microsoft-security-entra-entra-id" },
  defender: { tagId: "459", tagName: "microsoft-security-defender" },
  azure: { tagId: "827", tagName: "microsoft-security" },
  purview: { tagId: "460", tagName: "microsoft-security-purview" },
};

// Tag patterns to product mapping for auto-categorization
const TAG_TO_PRODUCT: Record<string, string> = {
  "microsoft-security-intune": "intune",
  "microsoft-security-entra": "entra",
  "microsoft-security-entra-entra-id": "entra",
  "microsoft-security-microsoft-entra-id": "entra",
  "microsoft-security-defender": "defender",
  "microsoft-security-defender-for-endpoint": "defender",
  "microsoft-security-defender-for-office-365": "defender",
  "microsoft-security-defender-for-identity": "defender",
  "microsoft-security-defender-for-cloud": "defender",
  "microsoft-security-defender-for-cloud-apps": "defender",
  "microsoft-security-purview": "purview",
  "microsoft-security-microsoft-authenticator": "entra",
  "microsoft-security-conditional-access": "entra",
  "microsoft-security-azure-ad-b2c": "entra",
  "microsoft-security-windows-hello": "entra",
};

interface MSQAQuestion {
  id: string;
  author: string;
  title: string;
  content: string;
  url: string;
  createdAt: string;
  answersCount: number;
  tags: string[];
}

// Parse the HTML to extract questions
function parseQuestionsFromHTML(html: string): MSQAQuestion[] {
  const questions: MSQAQuestion[] = [];
  
  // Match question boxes using regex - updated pattern
  const boxRegex = /<div class="box margin-bottom-xxs">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/g;
  let match;
  
  while ((match = boxRegex.exec(html)) !== null) {
    try {
      const boxContent = match[1];
      
      // Extract question URL and title
      const titleMatch = boxContent.match(/<h2 class="title is-6[^"]*">\s*<a href="([^"]+)">\s*([^<]+)/);
      if (!titleMatch) continue;
      
      const url = titleMatch[1];
      const title = titleMatch[2].trim();
      
      // Extract question ID from URL
      const idMatch = url.match(/questions\/(\d+)\//);
      if (!idMatch) continue;
      const id = idMatch[1];
      
      // Extract content/description
      const contentMatch = boxContent.match(/<p class="has-text-wrap">([^<]+)<\/p>/);
      const content = contentMatch ? contentMatch[1].trim() : title;
      
      // Extract author
      const authorMatch = boxContent.match(/class="profile-url[^"]*"[^>]*>([^<]+)<\/a>/);
      const author = authorMatch ? authorMatch[1].trim() : "Anonymous";
      
      // Extract date
      const dateMatch = boxContent.match(/datetime="([^"]+)"/);
      const createdAt = dateMatch ? dateMatch[1] : new Date().toISOString();
      
      // Extract answer count
      const answerMatch = boxContent.match(/(\d+)\s*answer/);
      const answersCount = answerMatch ? parseInt(answerMatch[1], 10) : 0;
      
      // Extract tags
      const tags: string[] = [];
      const tagMatches = boxContent.matchAll(/data-test-id="question-tag-([^"]+)"/g);
      for (const tagMatch of tagMatches) {
        tags.push(tagMatch[1]);
      }
      
      questions.push({
        id,
        author,
        title,
        content,
        url: url.startsWith("http") ? url : `https://learn.microsoft.com${url}`,
        createdAt,
        answersCount,
        tags,
      });
    } catch (err) {
      console.error("Error parsing question:", err);
    }
  }
  
  return questions;
}

// Determine product from tags
function determineProductFromTags(tags: string[], titleAndContent: string): string {
  // First, try exact tag matching
  for (const tag of tags) {
    if (TAG_TO_PRODUCT[tag]) {
      return TAG_TO_PRODUCT[tag];
    }
  }
  
  // Try partial matching on tags
  for (const tag of tags) {
    const lowerTag = tag.toLowerCase();
    if (lowerTag.includes("intune")) return "intune";
    if (lowerTag.includes("entra") || lowerTag.includes("azure-ad") || lowerTag.includes("authenticator")) return "entra";
    if (lowerTag.includes("defender")) return "defender";
    if (lowerTag.includes("purview")) return "purview";
  }
  
  // Try content-based detection
  const lowerContent = titleAndContent.toLowerCase();
  if (lowerContent.includes("intune") || lowerContent.includes("mdm") || lowerContent.includes("endpoint manager")) return "intune";
  if (lowerContent.includes("entra") || lowerContent.includes("azure ad") || lowerContent.includes("conditional access") || lowerContent.includes("authenticator")) return "entra";
  if (lowerContent.includes("defender") || lowerContent.includes("atp") || lowerContent.includes("threat protection")) return "defender";
  if (lowerContent.includes("purview") || lowerContent.includes("compliance") || lowerContent.includes("dlp")) return "purview";
  
  // Default to azure (general security)
  return "azure";
}

async function fetchPage(pageNum: number): Promise<string> {
  const msqaUrl = `https://learn.microsoft.com/en-us/answers/tags/827/microsoft-security?orderby=createdat&page=${pageNum}`;
  console.log(`Fetching page ${pageNum}: ${msqaUrl}`);
  
  const response = await fetch(msqaUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch page ${pageNum}: ${response.status}`);
  }

  return response.text();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { product, pages = 1, bulkScrape = false } = body;
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    let allQuestions: MSQAQuestion[] = [];
    const pagesToFetch = bulkScrape ? Math.min(pages, 30) : 1; // Limit to 30 pages max for bulk
    
    // Bulk scrape mode - fetch from main security tag
    if (bulkScrape) {
      console.log(`Bulk scraping ${pagesToFetch} pages from Microsoft Security Q&A...`);
      
      for (let page = 1; page <= pagesToFetch; page++) {
        try {
          const html = await fetchPage(page);
          const pageQuestions = parseQuestionsFromHTML(html);
          console.log(`Page ${page}: Found ${pageQuestions.length} questions`);
          
          // Filter to only questions from the past month
          const recentQuestions = pageQuestions.filter(q => {
            const questionDate = new Date(q.createdAt);
            return questionDate >= oneMonthAgo;
          });
          
          allQuestions = allQuestions.concat(recentQuestions);
          
          // If we found questions older than a month, we can stop
          if (recentQuestions.length < pageQuestions.length) {
            console.log(`Reached questions older than 1 month on page ${page}, stopping.`);
            break;
          }
          
          // Small delay between pages to be respectful
          if (page < pagesToFetch) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (pageError) {
          console.error(`Error fetching page ${page}:`, pageError);
          break;
        }
      }
    } else if (product && PRODUCT_TAGS[product]) {
      // Single product mode
      const { tagId, tagName } = PRODUCT_TAGS[product];
      console.log(`Ingesting Microsoft Q&A posts from tag ${tagName} for product: ${product}`);
      
      const msqaUrl = `https://learn.microsoft.com/en-us/answers/tags/${tagId}/${tagName}?orderby=createdat&page=1`;
      const response = await fetch(msqaUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch Microsoft Q&A page: ${response.status}`);
      }

      const html = await response.text();
      allQuestions = parseQuestionsFromHTML(html);
    } else {
      throw new Error(`Invalid request. Provide either 'product' or set 'bulkScrape: true'`);
    }
    
    console.log(`Total questions to process: ${allQuestions.length}`);

    let newPosts = 0;
    let errors = 0;
    let skipped = 0;
    const ingestionStartTime = new Date().toISOString();
    const productCounts: Record<string, number> = {};

    // Process each question
    for (const question of allQuestions) {
      try {
        // Check if question already exists by msqa_id
        const { data: existing } = await supabase
          .from("feedback_entries")
          .select("id")
          .eq("msqa_id", question.id)
          .maybeSingle();

        if (existing) {
          skipped++;
          continue;
        }

        // Determine product from tags or content
        const detectedProduct = bulkScrape 
          ? determineProductFromTags(question.tags, `${question.title} ${question.content}`)
          : product;

        // Classify the feedback using AI
        const { data: classification, error: classificationError } = await supabase.functions.invoke(
          "classify-feedback",
          { body: { content: `${question.title}\n\n${question.content}` } }
        );

        if (classificationError) {
          console.error("Classification error:", classificationError);
        }

        // Insert into database
        const { error: insertError } = await supabase.from("feedback_entries").insert({
          msqa_id: question.id,
          source: "TechCommunity",
          author: question.author,
          title: question.title,
          timestamp: question.createdAt,
          content: question.content,
          url: question.url,
          sentiment: classification?.sentiment ?? "neutral",
          topic: classification?.topic ?? "General",
          feedback_type: classification?.feedback_type ?? "question",
          engagement_score: question.answersCount,
          score: question.answersCount,
          product: detectedProduct,
        });

        if (insertError) {
          console.error("Insert error:", insertError);
          errors++;
        } else {
          newPosts++;
          productCounts[detectedProduct] = (productCounts[detectedProduct] || 0) + 1;
          console.log(`Added [${detectedProduct}]: ${question.title.substring(0, 50)}...`);
        }
      } catch (error) {
        console.error("Error processing question:", error);
        errors++;
      }
    }

    // Record ingestion metadata for each product
    if (bulkScrape) {
      for (const [prod, count] of Object.entries(productCounts)) {
        await supabase.from("ingestion_metadata").insert({
          product: prod,
          last_ingestion_time: ingestionStartTime,
          status: "success",
          new_posts: count,
          total_processed: count,
          errors: 0,
        });
        
        // Generate report for each product that had new data
        if (count > 0) {
          console.log(`Triggering weekly report for ${prod}...`);
          await supabase.functions.invoke("generate-weekly-report", { body: { product: prod } });
        }
      }
    } else {
      await supabase.from("ingestion_metadata").insert({
        product: product,
        last_ingestion_time: ingestionStartTime,
        status: errors > 0 ? "partial_success" : "success",
        new_posts: newPosts,
        total_processed: allQuestions.length,
        errors: errors,
      });
      
      // Generate weekly report
      await supabase.functions.invoke("generate-weekly-report", { body: { product } });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${allQuestions.length} questions: ${newPosts} new, ${skipped} skipped, ${errors} errors`,
        new_posts: newPosts,
        skipped,
        total_processed: allQuestions.length,
        product_breakdown: productCounts,
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
