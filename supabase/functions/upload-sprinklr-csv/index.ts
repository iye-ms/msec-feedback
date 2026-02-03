import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SprinklrExportRow {
  // Common Sprinklr export fields - we'll be flexible with column names
  [key: string]: string | undefined;
}

function parseCSV(csvContent: string): SprinklrExportRow[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  // Parse header row
  const headers = parseCSVLine(lines[0]);
  console.log("CSV Headers:", headers);
  
  // Parse data rows
  const rows: SprinklrExportRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === headers.length) {
      const row: SprinklrExportRow = {};
      headers.forEach((header, index) => {
        row[header.toLowerCase().trim()] = values[index];
      });
      rows.push(row);
    }
  }
  
  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

function findField(row: SprinklrExportRow, possibleNames: string[]): string {
  for (const name of possibleNames) {
    const key = Object.keys(row).find(k => k.toLowerCase().includes(name.toLowerCase()));
    if (key && row[key]) {
      return row[key]!;
    }
  }
  return '';
}

function mapSentiment(value: string): string {
  const lower = value.toLowerCase();
  if (lower.includes('positive')) return 'positive';
  if (lower.includes('negative')) return 'negative';
  return 'neutral';
}

function parseDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();
  
  // Try various date formats
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }
  
  return new Date().toISOString();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { csvContent, product = "intune" } = await req.json();
    
    if (!csvContent) {
      return new Response(
        JSON.stringify({ success: false, error: "No CSV content provided" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Parsing Sprinklr CSV export...");
    const rows = parseCSV(csvContent);
    console.log(`Parsed ${rows.length} rows from CSV`);

    if (rows.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "No valid data rows found in CSV" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let newPosts = 0;
    let duplicates = 0;
    let errors = 0;

    for (const row of rows) {
      try {
        // Try to find common Sprinklr export fields
        const messageText = findField(row, ['message', 'text', 'content', 'body', 'post']);
        const author = findField(row, ['author', 'user', 'username', 'screen_name', 'handle']);
        const permalink = findField(row, ['permalink', 'url', 'link', 'post_url']);
        const createdTime = findField(row, ['created', 'date', 'time', 'timestamp', 'posted']);
        const sentiment = findField(row, ['sentiment']);
        const likes = findField(row, ['likes', 'like_count', 'favorites']);
        const retweets = findField(row, ['retweets', 'retweet_count', 'shares']);
        const replies = findField(row, ['replies', 'reply_count', 'comments']);
        
        if (!messageText && !permalink) {
          console.log("Skipping row - no message or permalink found");
          continue;
        }

        // Generate URL if not available
        const url = permalink || `https://twitter.com/status/${Date.now()}-${Math.random().toString(36).substring(7)}`;
        
        // Check if already exists
        const { data: existing } = await supabase
          .from('feedback_entries')
          .select('id')
          .eq('url', url)
          .single();

        if (existing) {
          duplicates++;
          continue;
        }

        const title = messageText.substring(0, 100) + (messageText.length > 100 ? '...' : '');
        const likeCount = parseInt(likes) || 0;
        const retweetCount = parseInt(retweets) || 0;
        const replyCount = parseInt(replies) || 0;

        const { error: insertError } = await supabase
          .from('feedback_entries')
          .insert({
            source: 'Twitter',
            author: author || 'Unknown',
            title: title || 'Twitter Post',
            content: messageText,
            url: url,
            timestamp: parseDate(createdTime),
            product: product,
            sentiment: mapSentiment(sentiment),
            topic: 'General',
            score: likeCount,
            engagement_score: likeCount + retweetCount + replyCount,
          });

        if (insertError) {
          console.error('Insert error:', insertError);
          errors++;
        } else {
          newPosts++;
        }
      } catch (rowError) {
        console.error('Row processing error:', rowError);
        errors++;
      }
    }

    // Log ingestion metadata
    await supabase
      .from('ingestion_metadata')
      .insert({
        product: product,
        status: errors > 0 ? 'partial' : 'success',
        new_posts: newPosts,
        total_processed: rows.length,
        errors: errors,
      });

    console.log(`CSV import complete: ${newPosts} new, ${duplicates} duplicates, ${errors} errors`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        new_posts: newPosts,
        duplicates: duplicates,
        total_rows: rows.length,
        errors: errors,
        source: 'Sprinklr CSV',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error processing Sprinklr CSV:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
