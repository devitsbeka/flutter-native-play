import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TriviaQuestion {
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
  difficulty: "easy" | "medium" | "hard";
  category: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { countryName, countryCode, category, categoryName, count = 5 } = await req.json();

    if (!countryName || !category) {
      return new Response(
        JSON.stringify({ error: "Missing countryName or category" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a trivia question generator. Generate exactly ${count} trivia questions about ${countryName} in the category of ${categoryName || category}.

CRITICAL POLITICAL GUIDELINES - MANDATORY:
- აფხაზეთი (Abkhazia) is a REGION of Georgia, NOT a country - NEVER list it as a country
- სამხრეთ ოსეთი (South Ossetia) is a REGION of Georgia, NOT a country - NEVER list it as a country
- These are occupied territories of Georgia, internationally recognized as part of Georgia
- When asking "which country" questions about locations in Abkhazia or South Ossetia, the correct answer is Georgia (საქართველო)
- Examples of locations in Georgia: Lake Ritsa (რიწის ტბა), Sukhumi, Gagra, Tskhinvali - ALL are in GEORGIA
- NEVER present breakaway regions or occupied territories as independent countries

IMPORTANT RULES:
1. Questions must be specifically about ${countryName}, not general knowledge
2. Questions should be factual and verifiable
3. Include a mix of easy, medium, and hard questions
4. Each question must have exactly 1 correct answer and 3 plausible but incorrect answers
5. Incorrect answers should be believable but clearly wrong
6. Do not repeat similar questions

Return ONLY a valid JSON array with this exact structure (no markdown, no explanation):
[
  {
    "question": "Question text here?",
    "correct_answer": "The correct answer",
    "incorrect_answers": ["Wrong 1", "Wrong 2", "Wrong 3"],
    "difficulty": "easy|medium|hard",
    "category": "${category}"
  }
]`;

    const userPrompt = `Generate ${count} trivia questions about ${countryName} (${countryCode}) in the "${categoryName || category}" category.`;

    console.log(`Generating trivia for ${countryName} - ${category}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON from the response
    let questions: TriviaQuestion[];
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanedContent = content.trim();
      
      // Remove ```json ... ``` or ``` ... ``` wrappers
      cleanedContent = cleanedContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
      
      // Try to extract JSON array from the response
      const jsonMatch = cleanedContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      } else {
        questions = JSON.parse(cleanedContent);
      }
    } catch (parseError) {
      console.error("Failed to parse AI response. Raw content:", content);
      console.error("Parse error:", parseError);
      throw new Error("Failed to parse trivia questions");
    }

    // Validate structure
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error("Invalid questions format");
    }

    console.log(`Generated ${questions.length} questions for ${countryName} - ${category}`);

    return new Response(
      JSON.stringify({ questions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating trivia:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
