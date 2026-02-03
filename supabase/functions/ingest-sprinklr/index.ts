import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SPRINKLR_API_KEY = Deno.env.get("SPRINKLR_API_KEY")?.trim();
const SPRINKLR_API_SECRET = Deno.env.get("SPRINKLR_API_SECRET")?.trim();

// Sprinklr API base URL - adjust based on your environment (prod2, prod3, etc.)
const SPRINKLR_BASE_URL = "https://api2.sprinklr.com";

interface SprinklrMessage {
  id: string;
  snCreatedTime: number;
  messageText?: string;
  authorName?: string;
  permalink?: string;
  snType?: string;
  sentiment?: string;
  likes?: number;
  comments?: number;
  shares?: number;
}

function validateEnvironmentVariables() {
  if (!SPRINKLR_API_KEY) throw new Error("Missing SPRINKLR_API_KEY");
  if (!SPRINKLR_API_SECRET) throw new Error("Missing SPRINKLR_API_SECRET");
}

async function getAccessToken(): Promise<string> {
  console.log("Requesting Sprinklr access token...");
  
  const response = await fetch(`${SPRINKLR_BASE_URL}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: SPRINKLR_API_KEY!,
      client_secret: SPRINKLR_API_SECRET!,
    }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    console.error("Failed to get access token:", data);
    throw new Error(`Sprinklr auth failed: ${data.error_description || data.error || 'Unknown error'}`);
  }

  console.log("Successfully obtained Sprinklr access token");
  return data.access_token;
}

async function fetchTwitterMessages(accessToken: string, startTime?: number): Promise<SprinklrMessage[]> {
  // Default to last 7 days if no start time provided
  const since = startTime || Date.now() - (7 * 24 * 60 * 60 * 1000);
  
  console.log(`Fetching Twitter messages from Sprinklr since ${new Date(since).toISOString()}...`);

  // Using Sprinklr's Message Search API
  const response = await fetch(`${SPRINKLR_BASE_URL}/api/v2/message/search`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Key": SPRINKLR_API_KEY!,
    },
    body: JSON.stringify({
      page: 0,
      size: 100,
      sort: {
        field: "snCreatedTime",
        order: "DESC",
      },
      filters: [
        {
          field: "snType",
          operator: "IN",
          values: ["TWITTER"],
        },
        {
          field: "snCreatedTime",
          operator: "GTE",
          values: [since],
        },
      ],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Failed to fetch messages:", data);
    throw new Error(`Sprinklr message fetch failed: ${JSON.stringify(data)}`);
  }

  console.log(`Found ${data.data?.length || 0} Twitter messages from Sprinklr`);
  return data.data || [];
}

function mapSentiment(sprinklrSentiment: string | undefined): string {
  const sentimentMap: Record<string, string> = {
    "POSITIVE": "positive",
    "NEGATIVE": "negative",
    "NEUTRAL": "neutral",
    "MIXED": "neutral",
  };
  return sentimentMap[sprinklrSentiment?.toUpperCase() || ""] || "neutral";
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    validateEnvironmentVariables();

    const body = await req.json().catch(() => ({}));
    const { product = "intune", days = 7 } = body;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Fetching Intune Twitter data from Sprinklr for the last ${days} days...`);

    // Get access token
    const accessToken = await getAccessToken();

    // Calculate start time
    const startTime = Date.now() - (days * 24 * 60 * 60 * 1000);

    // Fetch messages
    const messages = await fetchTwitterMessages(accessToken, startTime);

    let newPosts = 0;
    let errors = 0;

    for (const message of messages) {
      const tweetUrl = message.permalink || `https://twitter.com/i/status/${message.id}`;

      // Check if already exists
      const { data: existing } = await supabase
        .from('feedback_entries')
        .select('id')
        .eq('url', tweetUrl)
        .single();

      if (existing) {
        console.log(`Message already exists: ${tweetUrl}`);
        continue;
      }

      const title = (message.messageText || "").substring(0, 100) + 
                    ((message.messageText?.length || 0) > 100 ? '...' : '');

      // Insert new message
      const { error: insertError } = await supabase
        .from('feedback_entries')
        .insert({
          source: 'Twitter',
          author: message.authorName || 'Unknown',
          title: title || 'Twitter Post',
          content: message.messageText || '',
          url: tweetUrl,
          timestamp: new Date(message.snCreatedTime).toISOString(),
          product: product,
          sentiment: mapSentiment(message.sentiment),
          topic: 'General',
          score: message.likes || 0,
          engagement_score: (message.likes || 0) + (message.comments || 0) + (message.shares || 0),
        });

      if (insertError) {
        console.error('Insert error:', insertError);
        errors++;
      } else {
        newPosts++;
      }
    }

    // Log ingestion metadata
    await supabase
      .from('ingestion_metadata')
      .insert({
        product: product,
        status: errors > 0 ? 'partial' : 'success',
        new_posts: newPosts,
        total_processed: messages.length,
        errors: errors,
      });

    console.log(`Successfully ingested ${newPosts} new Twitter posts from Sprinklr`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        new_posts: newPosts,
        total_found: messages.length,
        errors: errors,
        source: 'Sprinklr',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error ingesting Sprinklr data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
