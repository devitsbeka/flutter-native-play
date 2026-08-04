/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { getCorsHeaders } from "../_shared/cors.ts";
import { AI_CHAT_URL, AI_API_KEY, aiModel } from "../_shared/ai.ts";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { category, coveredTopics = [], existingAnswers = [], count = 25 } = await req.json();

    if (!category) {
      return new Response(
        JSON.stringify({ error: "category is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!AI_API_KEY) {
      throw new Error("AI_API_KEY is not configured");
    }

    console.log(`Researching ${count} fresh facts for "${category}". Avoiding ${coveredTopics.length} topics and ${existingAnswers.length} existing answers.`);

    // Build the covered material section
    const coveredSection = coveredTopics.length > 0
      ? `
უკვე დაფარული თემები (${coveredTopics.length} ცალი) - ამათ ნუ გაიმეორებ:
${coveredTopics.map((t: string, i: number) => `${i + 1}. ${t}`).join('\n')}
`
      : '';

    const answersSection = existingAnswers.length > 0
      ? `
უკვე არსებული პასუხები (${existingAnswers.length} ცალი) - ამ ფაქტებზე კითხვები უკვე გვაქვს:
${existingAnswers.join(', ')}
`
      : '';

    const prompt = `შენ ხარ "${category}" კატეგორიის ექსპერტი მკვლევარი. შენი ამოცანაა იპოვო ${count} ახალი, ნაკლებად ცნობილი, მაგრამ ფაქტობრივად ზუსტი და დადასტურებული ფაქტი.

${coveredSection}
${answersSection}

🎯 მოძებნე სრულიად ახალი ფაქტები რომლებიც არ არის ზემოთ ჩამოთვლილ სიებში!

ფოკუსირდი ამ მიმართულებებზე:
- ნაკლებად ცნობილი ისტორიული პიროვნებები და მათი საქმიანობა
- რეგიონული მოვლენები და ადგილობრივი ისტორია
- არქეოლოგიური აღმოჩენები და კულტურული არტეფაქტები
- დიპლომატიური ურთიერთობები და ხელშეკრულებები
- ეკონომიკური ისტორია, ვაჭრობა, მრეწველობა
- განათლების, მეცნიერების და ტექნოლოგიის ისტორია
- არქიტექტურული ძეგლები და მათი ისტორია
- ეთნოგრაფია, ტრადიციები, ხალხური კულტურა
- სამხედრო ისტორია - ნაკლებად ცნობილი ბრძოლები
- საეკლესიო ისტორია და რელიგიური ძეგლები

🚨 მნიშვნელოვანი წესები:
1. ყველა ფაქტი უნდა იყოს ზუსტი და დადასტურებული - არ გამოიგონო!
2. ფაქტი უნდა იყოს კონკრეტული (თარიღები, სახელები, ადგილები) - არა ზოგადი
3. ფაქტი უნდა იყოს საკმარისად საინტერესო ტრივია კითხვისთვის
4. ყველა ფაქტი უნდა იყოს განსხვავებული - არ გაიმეორო ერთი თემა
5. პრიორიტეტი მიეცი ნაკლებად ცნობილ, მაგრამ რეალურ ფაქტებს

დააბრუნე JSON მასივი:
[
  {
    "fact": "კონკრეტული ფაქტი ქართულად - ვინ, რა, სად, როდის",
    "source_hint": "მოკლე მინიშნება წყაროზე (მაგ: 'ქართული ენციკლოპედია', 'ისტორიული დოკუმენტი')",
    "suggested_answer": "მოკლე პასუხი (მაქს 20 სიმბოლო) - ძირითადი ფაქტი"
  }
]

მხოლოდ JSON მასივი, არ დაწერო ახსნა.`;

    const response = await fetch(AI_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: aiModel("google/gemini-2.5-pro"),
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8, // Higher temperature for more creative/diverse fact finding
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

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("No JSON array found in research response:", content);
      return new Response(
        JSON.stringify({ facts: [], count: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const facts = JSON.parse(jsonMatch[0]);
    
    // Filter out any facts whose suggested_answer matches existing answers
    const existingAnswerSet = new Set(existingAnswers.map((a: string) => a.trim().toLowerCase()));
    const freshFacts = facts.filter((f: any) => {
      const suggestedAnswer = (f.suggested_answer || '').trim().toLowerCase();
      return !existingAnswerSet.has(suggestedAnswer);
    });

    console.log(`Researched ${facts.length} facts, ${freshFacts.length} are truly fresh after answer filtering`);

    return new Response(
      JSON.stringify({ facts: freshFacts, count: freshFacts.length, totalResearched: facts.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error researching facts:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
