const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { product, account = "MicrosoftIntune" } = await req.json();

    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY') || Deno.env.get('FIRECRAWL_API_KEY_1');
    if (!firecrawlApiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Scraping tweets from @${account}...`);

    // Scrape the Twitter/X profile page
    const twitterUrl = `https://x.com/${account}`;
    
    const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: twitterUrl,
        formats: ['markdown', 'links'],
        waitFor: 3000, // Wait for dynamic content to load
      }),
    });

    const scrapeData = await scrapeResponse.json();

    if (!scrapeResponse.ok) {
      console.error('Firecrawl API error:', scrapeData);
      return new Response(
        JSON.stringify({ success: false, error: scrapeData.error || 'Failed to scrape Twitter' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Scrape successful, parsing tweets...');

    // Parse the markdown content to extract tweets
    const markdown = scrapeData.data?.markdown || scrapeData.markdown || '';
    const tweets = parseTweetsFromMarkdown(markdown, account);

    console.log(`Found ${tweets.length} tweets to process`);

    let newPosts = 0;

    for (const tweet of tweets) {
      // Check if already exists
      const { data: existing } = await supabase
        .from('feedback_entries')
        .select('id')
        .eq('url', tweet.url)
        .single();

      if (existing) {
        console.log(`Tweet already exists: ${tweet.url}`);
        continue;
      }

      // Insert new tweet
      const { error: insertError } = await supabase
        .from('feedback_entries')
        .insert({
          source: 'Twitter',
          author: `@${account}`,
          content: tweet.content,
          url: tweet.url,
          timestamp: tweet.timestamp || new Date().toISOString(),
          product: product || 'intune',
          sentiment: 'neutral', // Default, can be classified later
          topic: 'General',
          score: 0,
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

function parseTweetsFromMarkdown(markdown: string, account: string): { content: string; url: string; timestamp?: string }[] {
  const tweets: { content: string; url: string; timestamp?: string }[] = [];
  
  // Split by common tweet separators and look for tweet-like content
  const lines = markdown.split('\n');
  let currentTweet = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines and navigation elements
    if (!line || line.startsWith('[') && line.endsWith(']') && line.length < 30) {
      if (currentTweet.length > 50) {
        // Save the accumulated tweet
        tweets.push({
          content: currentTweet.trim(),
          url: `https://x.com/${account}/status/${Date.now()}-${tweets.length}`, // Placeholder URL
        });
        currentTweet = '';
      }
      continue;
    }
    
    // Accumulate tweet content
    if (line.length > 20 && !line.startsWith('#') && !line.includes('Following') && !line.includes('Followers')) {
      currentTweet += (currentTweet ? ' ' : '') + line;
    }
  }
  
  // Don't forget the last tweet
  if (currentTweet.length > 50) {
    tweets.push({
      content: currentTweet.trim(),
      url: `https://x.com/${account}/status/${Date.now()}-${tweets.length}`,
    });
  }
  
  // Limit to reasonable number and filter out noise
  return tweets
    .filter(t => t.content.length > 50 && t.content.length < 1000)
    .slice(0, 20);
}
