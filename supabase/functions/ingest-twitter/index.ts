import { createHmac } from "node:crypto";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const API_KEY = Deno.env.get("TWITTER_CONSUMER_KEY")?.trim();
const API_SECRET = Deno.env.get("TWITTER_CONSUMER_SECRET")?.trim();
const ACCESS_TOKEN = Deno.env.get("TWITTER_ACCESS_TOKEN")?.trim();
const ACCESS_TOKEN_SECRET = Deno.env.get("TWITTER_ACCESS_TOKEN_SECRET")?.trim();

function validateEnvironmentVariables() {
  if (!API_KEY) throw new Error("Missing TWITTER_CONSUMER_KEY");
  if (!API_SECRET) throw new Error("Missing TWITTER_CONSUMER_SECRET");
  if (!ACCESS_TOKEN) throw new Error("Missing TWITTER_ACCESS_TOKEN");
  if (!ACCESS_TOKEN_SECRET) throw new Error("Missing TWITTER_ACCESS_TOKEN_SECRET");
}

function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string
): string {
  const signatureBaseString = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(
    Object.entries(params)
      .sort()
      .map(([k, v]) => `${k}=${v}`)
      .join("&")
  )}`;
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  const hmacSha1 = createHmac("sha1", signingKey);
  return hmacSha1.update(signatureBaseString).digest("base64");
}

function generateOAuthHeader(method: string, url: string, queryParams: Record<string, string> = {}): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: API_KEY!,
    oauth_nonce: Math.random().toString(36).substring(2),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: ACCESS_TOKEN!,
    oauth_version: "1.0",
  };

  // Merge query params for signature (required for GET requests with params)
  const allParams = { ...oauthParams, ...queryParams };

  const signature = generateOAuthSignature(
    method,
    url,
    allParams,
    API_SECRET!,
    ACCESS_TOKEN_SECRET!
  );

  const signedOAuthParams = {
    ...oauthParams,
    oauth_signature: signature,
  };

  return (
    "OAuth " +
    Object.entries(signedOAuthParams)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
      .join(", ")
  );
}

async function getUserIdByUsername(username: string): Promise<string | null> {
  const baseUrl = "https://api.x.com/2/users/by/username";
  const url = `${baseUrl}/${username}`;
  const oauthHeader = generateOAuthHeader("GET", url);

  console.log(`Fetching user ID for @${username}...`);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: oauthHeader,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();
  console.log("User lookup response:", JSON.stringify(data));

  if (!response.ok || data.errors) {
    console.error("Failed to get user ID:", data);
    return null;
  }

  return data.data?.id || null;
}

async function getUserTweets(userId: string, maxResults: number = 10): Promise<any[]> {
  const baseUrl = `https://api.x.com/2/users/${userId}/tweets`;
  const queryParams: Record<string, string> = {
    max_results: maxResults.toString(),
    "tweet.fields": "created_at,public_metrics,text",
  };

  const queryString = Object.entries(queryParams)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  const fullUrl = `${baseUrl}?${queryString}`;
  const oauthHeader = generateOAuthHeader("GET", baseUrl, queryParams);

  console.log(`Fetching tweets for user ID ${userId}...`);

  const response = await fetch(fullUrl, {
    method: "GET",
    headers: {
      Authorization: oauthHeader,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();
  console.log("Tweets response status:", response.status);

  if (!response.ok || data.errors) {
    console.error("Failed to get tweets:", data);
    return [];
  }

  return data.data || [];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    validateEnvironmentVariables();

    const { product, account = "MicrosoftIntune" } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Fetching tweets from @${account} using Twitter API...`);

    // Get user ID from username
    const userId = await getUserIdByUsername(account);
    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: `Could not find Twitter user @${account}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get recent tweets
    const tweets = await getUserTweets(userId, 20);
    console.log(`Found ${tweets.length} tweets from @${account}`);

    let newPosts = 0;

    for (const tweet of tweets) {
      const tweetUrl = `https://x.com/${account}/status/${tweet.id}`;

      // Check if already exists
      const { data: existing } = await supabase
        .from('feedback_entries')
        .select('id')
        .eq('url', tweetUrl)
        .single();

      if (existing) {
        console.log(`Tweet already exists: ${tweetUrl}`);
        continue;
      }

      // Insert new tweet
      const { error: insertError } = await supabase
        .from('feedback_entries')
        .insert({
          source: 'Twitter',
          author: `@${account}`,
          title: tweet.text.substring(0, 100) + (tweet.text.length > 100 ? '...' : ''),
          content: tweet.text,
          url: tweetUrl,
          timestamp: tweet.created_at || new Date().toISOString(),
          product: product || 'intune',
          sentiment: 'neutral',
          topic: 'General',
          score: tweet.public_metrics?.like_count || 0,
          engagement_score: (tweet.public_metrics?.like_count || 0) + 
                           (tweet.public_metrics?.retweet_count || 0) + 
                           (tweet.public_metrics?.reply_count || 0),
        });

      if (insertError) {
        console.error('Insert error:', insertError);
      } else {
        newPosts++;
      }
    }

    console.log(`Successfully ingested ${newPosts} new tweets from @${account}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        new_posts: newPosts,
        total_found: tweets.length,
        account: account
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error ingesting Twitter data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
