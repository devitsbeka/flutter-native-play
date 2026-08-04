/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders } from "../_shared/cors.ts";
import { AI_CHAT_URL, AI_API_KEY, aiModel } from "../_shared/ai.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { categoryId } = await req.json();

    if (!categoryId) {
      return new Response(
        JSON.stringify({ error: "categoryId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch ALL questions for this category (up to 500)
    const { data: questions, error: dbError } = await supabase
      .from("questions")
      .select("question_text, correct_answer")
      .eq("category_id", categoryId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(500);

    if (dbError) throw dbError;

    if (!questions || questions.length === 0) {
      return new Response(
        JSON.stringify({ topics: [], count: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Extracting topics from ${questions.length} questions for category ${categoryId}`);

    // Build a compact list of "question -> answer" pairs for AI summarization
    const questionList = questions
      .map((q, i) => `${i + 1}. ${q.question_text} → ${q.correct_answer}`)
      .join("\n");

    if (!AI_API_KEY) {
      throw new Error("AI_API_KEY is not configured");
    }

    const prompt = `შემდეგი ტრივია კითხვებიდან ამოიღე ძირითადი თემები რომლებიც ტესტირდება.

🚨 მაქსიმუმ 80 თემა! თუ კითხვები 80-ზე მეტია, აგრესიულად გააერთიანე მსგავსი თემები.

წესები:
- თუ 5 კითხვა ეხება "ვახტანგ გორგასალს" - ეს არის 1 თემა, არა 5!
- თუ 3 კითხვა ეხება "თბილისის დაარსებას" - ეს არის 1 თემა!
- ერთი პიროვნება = 1 თემა (მიუხედავად კითხვების რაოდენობისა)
- ერთი მოვლენა = 1 თემა
- ერთი ეპოქა/პერიოდი = 1 თემა

კითხვები:
${questionList}

დააბრუნე JSON მასივი სადაც თითოეული ელემენტი არის მოკლე თემის ლეიბელი (მაქსიმუმ 10 სიტყვა).
თემა უნდა აღწეროს კონკრეტული ფაქტი, პიროვნება ან მოვლენა.

მაგალითები:
- "ვახტანგ გორგასალი - თბილისის დამაარსებელი"
- "ქართლის გაქრისტიანება - წმ. ნინო"
- "თამარ მეფე - ოქროს ხანა"
- "ბაგრატიონთა დინასტია"

🚨 მაქსიმუმ 80 თემა! თუ მეტი გამოვა - გააერთიანე!
არ დაწერო ახსნა, მხოლოდ JSON მასივი.

დააბრუნე: ["თემა 1", "თემა 2", ...]`;

    const response = await fetch(AI_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: aiModel("google/gemini-2.5-pro"),
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3, // Low temperature for accurate extraction
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", errorText);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON array from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("No JSON array found in topic extraction response:", content);
      // Fallback: return empty topics rather than failing
      return new Response(
        JSON.stringify({ topics: [], count: 0, questionsAnalyzed: questions.length }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const topics: string[] = JSON.parse(jsonMatch[0]);
    console.log(`Extracted ${topics.length} unique topics from ${questions.length} questions`);

    // Also return existing answers for dedup in research phase
    const existingAnswers = [...new Set(questions.map(q => q.correct_answer))];

    return new Response(
      JSON.stringify({ topics, count: topics.length, questionsAnalyzed: questions.length, existingAnswers }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error extracting topics:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
