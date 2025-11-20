import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content } = await req.json();
    
    if (!content) {
      throw new Error("Content is required for classification");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Call Lovable AI for classification
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: `You are an AI assistant that classifies customer feedback about Microsoft Entra. 
For each piece of feedback, analyze and return a JSON object with:
- sentiment: "positive", "neutral", or "negative"
- topic: the main product area mentioned (e.g., "macOS Deployment", "Android Management", "Conditional Access", "Device Enrollment", "App Install Issues", "iOS Management", "Windows Autopilot", "Security Features", "Compliance Policies", "Policy Management", "Reporting", "Company Portal", "Script Deployment", "Remote Actions")
- feedback_type: "bug", "feature_request", "praise", or "question"

Only return valid JSON, no additional text.`,
          },
          {
            role: "user",
            content: `Classify this feedback: "${content}"`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "classify_feedback",
              description: "Classify customer feedback about Microsoft Entra",
              parameters: {
                type: "object",
                properties: {
                  sentiment: {
                    type: "string",
                    enum: ["positive", "neutral", "negative"],
                    description: "The overall sentiment of the feedback",
                  },
                  topic: {
                    type: "string",
                    description: "The main product area or topic discussed",
                  },
                  feedback_type: {
                    type: "string",
                    enum: ["bug", "feature_request", "praise", "question"],
                    description: "The type of feedback",
                  },
                },
                required: ["sentiment", "topic", "feedback_type"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "classify_feedback" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({
            error: "Payment required, please add funds to your Lovable AI workspace.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI classification failed");
    }

    const data = await response.json();
    
    // Extract the classification from tool call
    const toolCall = data.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No classification returned from AI");
    }

    const classification = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(classification), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Classification error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        // Fallback classification
        sentiment: "neutral",
        topic: "General",
        feedback_type: "question"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
