import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { AI_CHAT_URL, AI_API_KEY, aiModel } from "../_shared/ai.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, title, subject } = await req.json();

    // Get user from auth header
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!AI_API_KEY) {
      throw new Error("AI_API_KEY not configured");
    }

    // Use AI to analyze the image
    const prompt = `Analyze this image and determine if it's suitable as a cover image for a trivia quiz about "${title || 'Quiz'}" with the theme/subject "${subject || 'general trivia'}".

Consider:
1. Does the image visually relate to the quiz topic/theme?
2. Is it appropriate content (no offensive material)?
3. Is it visually appealing for a quiz cover?

Respond with a JSON object only, no other text:
{
  "isValid": true/false,
  "isAppropriate": true/false,
  "relevanceScore": 0-100,
  "reason": "Brief explanation"
}

"isAppropriate" is strictly about content safety: false ONLY for sexual/nude content, graphic violence or gore, hate symbols, or depictions of illegal drug use. An irrelevant but harmless image is isAppropriate: true (and may still be isValid: false for relevance).`;

    console.log("Validating image for:", title, subject);

    const response = await fetch(AI_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiModel("google/gemini-2.5-flash"),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", errorText);
      // Default to valid if AI fails - don't block user uploads
      return new Response(
        JSON.stringify({ isValid: true, isAppropriate: true, relevanceScore: 50, reason: "Could not validate" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await response.json();
    const aiResponse = aiData.choices?.[0]?.message?.content;

    console.log("AI validation response:", aiResponse);

    // Parse the JSON response
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        // Older model outputs may lack the field; missing means "not flagged".
        if (typeof result.isAppropriate !== "boolean") result.isAppropriate = true;
        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
    }

    // Default response if parsing fails
    return new Response(
      JSON.stringify({ isValid: true, isAppropriate: true, relevanceScore: 50, reason: "Image accepted" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    // Default to valid on error - don't block user uploads
    return new Response(
      JSON.stringify({ isValid: true, isAppropriate: true, relevanceScore: 50, reason: "Validation skipped" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
