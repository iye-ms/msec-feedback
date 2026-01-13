import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Products to ingest
const PRODUCTS = ["intune", "entra", "defender", "azure", "purview"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting scheduled ingestion for all products...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results: Record<string, any> = {};

    // Ingest each product sequentially to avoid rate limits
    for (const product of PRODUCTS) {
      console.log(`Ingesting ${product}...`);
      try {
        // Call ingest-reddit for each product
        const { data: redditData, error: redditError } = await supabase.functions.invoke(
          "ingest-reddit",
          { body: { product } }
        );

        if (redditError) {
          console.error(`Reddit ingestion error for ${product}:`, redditError);
          results[product] = { reddit: { error: redditError.message } };
        } else {
          results[product] = { reddit: redditData };
        }

        // Call ingest-msqa for each product
        const { data: msqaData, error: msqaError } = await supabase.functions.invoke(
          "ingest-msqa",
          { body: { product } }
        );

        if (msqaError) {
          console.error(`MSQA ingestion error for ${product}:`, msqaError);
          results[product] = { ...results[product], msqa: { error: msqaError.message } };
        } else {
          results[product] = { ...results[product], msqa: msqaData };
        }

        // Small delay between products to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (productError) {
        console.error(`Error processing ${product}:`, productError);
        results[product] = { error: productError instanceof Error ? productError.message : "Unknown error" };
      }
    }

    console.log("Scheduled ingestion completed:", results);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Scheduled ingestion completed",
        timestamp: new Date().toISOString(),
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Scheduled ingestion error:", error);
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
