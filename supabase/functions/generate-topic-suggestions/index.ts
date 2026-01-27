import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { categoryName } = await req.json();

    if (!categoryName) {
      return new Response(
        JSON.stringify({ error: 'Category name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `You are a trivia expert. Given the category "${categoryName}", suggest exactly 6 specific, well-known topics/subjects that would make great trivia questions for this category.

Requirements:
- Each suggestion should be a single, specific item (a person's name, place, thing, concept, etc.)
- Choose famous/recognizable topics that people would enjoy guessing
- Make suggestions diverse within the category
- Use English names (they will be used to search for images/info)

Return ONLY a JSON array of 6 strings, nothing else. Example format:
["Topic 1", "Topic 2", "Topic 3", "Topic 4", "Topic 5", "Topic 6"]`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "user", content: prompt }
        ],
        temperature: 0.8, // Higher for variety
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";
    
    // Parse the JSON array from the response
    let suggestions: string[] = [];
    try {
      // Clean up the response - remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      suggestions = JSON.parse(cleanContent);
      
      if (!Array.isArray(suggestions)) {
        suggestions = [];
      }
    } catch (parseError) {
      console.error("Failed to parse suggestions:", parseError, content);
      suggestions = [];
    }

    return new Response(
      JSON.stringify({ suggestions: suggestions.slice(0, 6) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error("Error generating suggestions:", error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate suggestions';
    return new Response(
      JSON.stringify({ error: errorMessage, suggestions: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
