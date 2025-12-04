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
  
  // Match question boxes using regex
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { product = "entra" } = await req.json();
    
    // Validate product
    if (!PRODUCT_TAGS[product]) {
      throw new Error(`Invalid product: ${product}. Valid options: ${Object.keys(PRODUCT_TAGS).join(", ")}`);
    }

    const { tagId, tagName } = PRODUCT_TAGS[product];
    console.log(`Ingesting Microsoft Q&A posts from tag ${tagName} for product: ${product}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch Microsoft Q&A page
    const msqaUrl = `https://learn.microsoft.com/en-us/answers/tags/${tagId}/${tagName}?orderby=createdat&page=1`;
    console.log(`Fetching: ${msqaUrl}`);
    
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
    const questions = parseQuestionsFromHTML(html);
    
    console.log(`Found ${questions.length} questions on the page`);

    let newPosts = 0;
    let errors = 0;
    const ingestionStartTime = new Date().toISOString();

    // Process each question
    for (const question of questions) {
      try {
        // Check if question already exists by msqa_id
        const { data: existing } = await supabase
          .from("feedback_entries")
          .select("id")
          .eq("msqa_id", question.id)
          .single();

        if (existing) {
          console.log(`Skipping existing question: ${question.id}`);
          continue; // Skip if already processed
        }

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
          product: product,
        });

        if (insertError) {
          console.error("Insert error:", insertError);
          errors++;
        } else {
          newPosts++;
          console.log(`Added new question: ${question.title}`);
        }
      } catch (error) {
        console.error("Error processing question:", error);
        errors++;
      }
    }

    // Record ingestion metadata
    const { error: metadataError } = await supabase
      .from("ingestion_metadata")
      .insert({
        product: product,
        last_ingestion_time: ingestionStartTime,
        status: errors > 0 ? "partial_success" : "success",
        new_posts: newPosts,
        total_processed: questions.length,
        errors: errors,
      });

    if (metadataError) {
      console.error("Error recording ingestion metadata:", metadataError);
    }

    // Automatically generate weekly report after successful ingestion
    console.log(`Triggering weekly report generation for ${product}...`);
    try {
      const { data: reportData, error: reportError } = await supabase.functions.invoke(
        "generate-weekly-report",
        { body: { product } }
      );

      if (reportError) {
        console.error("Error generating weekly report:", reportError);
      } else {
        console.log(`Weekly report generated successfully for ${product}`);
      }
    } catch (reportGenError) {
      console.error("Failed to trigger report generation:", reportGenError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${questions.length} questions from Microsoft Q&A: ${newPosts} new, ${errors} errors`,
        product,
        tag: tagName,
        new_posts: newPosts,
        total_processed: questions.length,
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
