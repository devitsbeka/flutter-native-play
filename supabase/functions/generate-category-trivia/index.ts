/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { category, categoryId, level, count = 5 } = await req.json();

    if (!category || !categoryId) {
      return new Response(
        JSON.stringify({ error: "Missing category information" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating ${count} trivia questions for category: ${category}, level: ${level}`);

    const difficulty = level <= 5 ? "easy" : level <= 15 ? "medium" : "hard";

    const prompt = `Generate ${count} trivia questions about ${category}. 
    Difficulty: ${difficulty}
    Level: ${level}
    
    Return ONLY a JSON array with this exact structure, no other text:
    [
      {
        "question": "Question text here?",
        "correct_answer": "Correct answer",
        "incorrect_answers": ["Wrong 1", "Wrong 2", "Wrong 3"],
        "difficulty": "${difficulty}"
      }
    ]`;

    const response = await fetch("https://llm.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", errorText);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("No JSON array found in response:", content);
      throw new Error("Failed to parse trivia questions");
    }

    const questions = JSON.parse(jsonMatch[0]);

    console.log(`Successfully generated ${questions.length} questions`);

    return new Response(
      JSON.stringify({ questions }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message || "An error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
