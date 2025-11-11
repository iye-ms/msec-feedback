import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RedditPost {
  id: string;
  author: string;
  title: string;
  selftext: string;
  created_utc: number;
  url: string;
  score: number;
  permalink: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const REDDIT_CLIENT_ID = Deno.env.get("REDDIT_CLIENT_ID");
    const REDDIT_CLIENT_SECRET = Deno.env.get("REDDIT_CLIENT_SECRET");
    
    if (!REDDIT_CLIENT_ID || !REDDIT_CLIENT_SECRET) {
      throw new Error("Reddit API credentials not configured. Please add REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET secrets.");
    }

    // Get Reddit OAuth token
    const authResponse = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (!authResponse.ok) {
      throw new Error("Failed to authenticate with Reddit API");
    }

    const { access_token } = await authResponse.json();

    // Fetch posts from r/Intune
    const redditResponse = await fetch(
      "https://oauth.reddit.com/r/Intune/new.json?limit=50",
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "User-Agent": "IntuneTrackerBot/1.0",
        },
      }
    );

    if (!redditResponse.ok) {
      throw new Error("Failed to fetch Reddit posts");
    }

    const redditData = await redditResponse.json();
    const posts: RedditPost[] = redditData.data.children.map((child: any) => child.data);

    let newPosts = 0;
    let errors = 0;

// Process each post
for (const post of posts) {
  try {
    const content = (post.selftext && post.selftext.trim().length > 0) ? post.selftext : post.title;
    const postUrl = `https://www.reddit.com${post.permalink}`;

    // Check if post already exists by reddit_id
    const { data: existing } = await supabase
      .from("feedback_entries")
      .select("id")
      .eq("reddit_id", post.id)
      .single();

    if (existing) {
      continue; // Skip if already processed
    }

    // Classify the feedback using AI via Lovable AI gateway
    const { data: classification, error: classificationError } = await supabase.functions.invoke(
      "classify-feedback",
      { body: { content } }
    );

    if (classificationError) {
      throw classificationError;
    }

    // Insert into database with required reddit_id
    const { error: insertError } = await supabase.from("feedback_entries").insert({
      reddit_id: post.id,
      source: "Reddit",
      author: `u/${post.author}`,
      timestamp: new Date(post.created_utc * 1000).toISOString(),
      content,
      url: postUrl,
      sentiment: classification?.sentiment ?? "neutral",
      topic: classification?.topic ?? "General",
      feedback_type: classification?.feedback_type ?? "question",
      engagement_score: post.score,
    });

    if (insertError) {
      console.error("Insert error:", insertError);
      errors++;
    } else {
      newPosts++;
    }
  } catch (error) {
    console.error("Error processing post:", error);
    errors++;
  }
}

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${posts.length} posts: ${newPosts} new, ${errors} errors`,
        new_posts: newPosts,
        total_processed: posts.length,
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
