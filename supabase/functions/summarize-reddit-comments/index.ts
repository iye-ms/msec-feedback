import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RedditComment {
  author: string;
  body: string;
  score: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { redditUrl } = await req.json();

    if (!redditUrl) {
      throw new Error("Reddit URL is required");
    }

    // Extract the Reddit post ID from the URL
    const urlMatch = redditUrl.match(/\/comments\/([a-zA-Z0-9]+)/);
    if (!urlMatch) {
      throw new Error("Invalid Reddit URL format");
    }

    const postId = urlMatch[1];
    console.log(`Fetching comments for post: ${postId}`);

    const REDDIT_CLIENT_ID = Deno.env.get("REDDIT_CLIENT_ID");
    const REDDIT_CLIENT_SECRET = Deno.env.get("REDDIT_CLIENT_SECRET");

    if (!REDDIT_CLIENT_ID || !REDDIT_CLIENT_SECRET) {
      throw new Error("Reddit API credentials not configured");
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

    // Fetch comments from Reddit
    const commentsResponse = await fetch(
      `https://oauth.reddit.com/comments/${postId}.json?limit=20&depth=1&sort=top`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "User-Agent": "FeedbackTrackerBot/1.0",
        },
      }
    );

    if (!commentsResponse.ok) {
      throw new Error("Failed to fetch comments from Reddit");
    }

    const commentsData = await commentsResponse.json();
    
    // Extract comments from the response (second element contains comments)
    const comments: RedditComment[] = [];
    if (commentsData[1]?.data?.children) {
      for (const child of commentsData[1].data.children) {
        if (child.kind === "t1" && child.data?.body) {
          comments.push({
            author: child.data.author,
            body: child.data.body,
            score: child.data.score,
          });
        }
      }
    }

    if (comments.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          summary: "No comments found on this post yet.",
          commentCount: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare comments text for summarization
    const commentsText = comments
      .slice(0, 15) // Limit to top 15 comments
      .map((c, i) => `[${i + 1}] u/${c.author} (${c.score} upvotes): ${c.body}`)
      .join("\n\n");

    // Use Lovable AI to summarize comments
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      // Return raw comment summary if no AI available
      return new Response(
        JSON.stringify({
          success: true,
          summary: `${comments.length} comments discussing this issue. Top themes include responses from the community.`,
          commentCount: comments.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages: [
          {
            role: "system",
            content: `You are a helpful assistant that summarizes Reddit discussion threads. 
Provide a concise 2-3 sentence summary of the main themes, solutions suggested, and community sentiment.
Focus on: key solutions or workarounds mentioned, common experiences, and overall community response (helpful, frustrated, etc.).
Keep it brief and actionable.`
          },
          {
            role: "user",
            content: `Summarize this Reddit discussion:\n\n${commentsText}`
          }
        ],
        max_tokens: 200,
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI summarization failed:", await aiResponse.text());
      return new Response(
        JSON.stringify({
          success: true,
          summary: `${comments.length} comments in discussion. Community is actively engaged with this topic.`,
          commentCount: comments.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const summary = aiData.choices?.[0]?.message?.content || "Unable to generate summary.";

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        commentCount: comments.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error summarizing comments:", error);
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
