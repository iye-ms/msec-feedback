import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { product = "entra" } = await req.json();
    
    console.log(`Generating weekly report for product: ${product}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get feedback from the past 7 days for the specific product
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    // Calculate week start and end dates
    const weekEnd = new Date().toISOString().split("T")[0];
    const weekStart = weekAgo.toISOString().split("T")[0];

    const { data: feedbackData, error: fetchError } = await supabase
      .from("feedback_entries")
      .select("*")
      .eq("product", product)
      .gte("timestamp", weekAgo.toISOString())
      .order("timestamp", { ascending: false });

    if (fetchError) throw fetchError;

    if (!feedbackData || feedbackData.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `No feedback data found for ${product} in the past 7 days` 
        }), 
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Calculate statistics
    const totalFeedback = feedbackData.length;
    const sentimentCounts = feedbackData.reduce(
      (acc, entry) => {
        acc[entry.sentiment]++;
        return acc;
      },
      { positive: 0, neutral: 0, negative: 0 }
    );

    const topicCounts = feedbackData.reduce((acc, entry) => {
      acc[entry.topic] = (acc[entry.topic] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topTopics = Object.entries(topicCounts)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([topic]) => topic);

    // Prepare data for AI summarization
    const summaryData = {
      product: product.toUpperCase(),
      total_feedback: totalFeedback,
      sentiment_breakdown: {
        positive: Math.round((sentimentCounts.positive / totalFeedback) * 100),
        neutral: Math.round((sentimentCounts.neutral / totalFeedback) * 100),
        negative: Math.round((sentimentCounts.negative / totalFeedback) * 100),
      },
      top_topics: topTopics,
      sample_feedback: feedbackData.slice(0, 20).map((f) => ({
        topic: f.topic,
        sentiment: f.sentiment,
        type: f.feedback_type,
        snippet: f.content.substring(0, 200),
      })),
    };

    // Generate AI summary
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const productNames: Record<string, string> = {
      intune: "Microsoft Intune",
      entra: "Microsoft Entra",
      defender: "Microsoft Defender",
      azure: "Microsoft Azure",
      purview: "Microsoft Purview",
    };

    const productName = productNames[product] || product.toUpperCase();

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an AI assistant that generates executive summaries of customer feedback for ${productName} product managers.
Generate a comprehensive weekly report in markdown format that includes:
- Overall sentiment trend for ${productName}
- Key highlights (positive feedback and praise)
- Critical issues requiring immediate attention (with specific details)
- Emerging patterns or spikes in mentions
- Top feature requests
- Actionable recommendations for the product team

Use professional business language. Be specific and data-driven. Highlight urgent issues clearly.
IMPORTANT: Include the reporting period dates (${new Date(weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${new Date(weekEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}) at the start of the summary.`,
          },
          {
            role: "user",
            content: `Generate a weekly report for ${productName} for the period ${weekStart} to ${weekEnd} based on this data:\n${JSON.stringify(summaryData, null, 2)}`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);

      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Rate limits exceeded, please try again later.",
            details: errorText,
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({
            error: "Payment required, please add funds to your Lovable AI workspace.",
            details: errorText,
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      throw new Error(`AI summary generation failed: ${aiResponse.status} ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const summary = aiData.choices[0]?.message?.content || "Summary generation failed";

    // Identify emerging issues (topics with high negative sentiment)
    // Using same logic as dashboard: negativeRatio > 0.3 AND total > 3, sorted by negative %
    const currentEmergingTopics = Object.entries(topicCounts)
      .map(([topic, count]) => {
        const topicFeedback = feedbackData.filter((f) => f.topic === topic);
        const negativeCount = topicFeedback.filter((f) => f.sentiment === "negative").length;
        const negativeRatio = negativeCount / topicFeedback.length;
        return { topic, count: count as number, negativeRatio, negativePercent: Math.round(negativeRatio * 100) };
      })
      .filter((item) => item.negativeRatio > 0.3 && item.count > 3)
      .sort((a, b) => b.negativePercent - a.negativePercent);

    const emergingIssues = currentEmergingTopics
      .slice(0, 3)
      .map((item) => `${item.topic} (${item.count} mentions, ${item.negativePercent}% negative)`);

    // Track issue lifecycle - update existing and create new
    console.log(`Tracking lifecycle for ${currentEmergingTopics.length} emerging topics`);
    
    // Get currently active issues for this product
    const { data: activeIssues } = await supabase
      .from("issue_lifecycle")
      .select("*")
      .eq("product", product)
      .eq("is_active", true);

    const currentTopicNames = currentEmergingTopics.map(t => t.topic);
    const activeTopicNames = (activeIssues || []).map(i => i.topic);

    // Mark resolved issues (were active, no longer emerging)
    const resolvedTopics = (activeIssues || []).filter(i => !currentTopicNames.includes(i.topic));
    for (const issue of resolvedTopics) {
      console.log(`Marking issue resolved: ${issue.topic}`);
      await supabase
        .from("issue_lifecycle")
        .update({ 
          is_active: false, 
          resolved_at: new Date().toISOString() 
        })
        .eq("id", issue.id);
    }

    // Create new issues (emerging now, weren't active before)
    const newTopics = currentEmergingTopics.filter(t => !activeTopicNames.includes(t.topic));
    for (const topic of newTopics) {
      console.log(`Creating new emerging issue: ${topic.topic}`);
      await supabase
        .from("issue_lifecycle")
        .insert({
          product,
          topic: topic.topic,
          became_emerging_at: new Date().toISOString(),
          is_active: true
        });
    }

    // Save report to database with product
    const { data: reportData, error: upsertError } = await supabase
      .from("weekly_reports")
      .upsert({
        report_date: weekEnd,
        week_start: weekStart,
        week_end: weekEnd,
        total_feedback: totalFeedback,
        sentiment_breakdown: sentimentCounts,
        top_topics: topTopics,
        emerging_issues: emergingIssues,
        summary,
        product: product,
      }, {
        onConflict: 'report_date,product'
      })
      .select()
      .single();

    if (upsertError) throw upsertError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        report: reportData,
        message: `Report generated for ${productName}`
      }), 
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Report generation error:", error);
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
