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
        JSON.stringify({ error: "კატეგორიის ინფორმაცია აკლია" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating ${count} Georgian trivia questions for category: ${category}, level: ${level}`);

    const difficulty = level <= 5 ? "მარტივი" : level <= 15 ? "საშუალო" : "რთული";
    const difficultyEn = level <= 5 ? "easy" : level <= 15 ? "medium" : "hard";

    const prompt = `შექმენი ${count} ტრივია კითხვა თემაზე: "${category}" ქართულ ენაზე.

სირთულე: ${difficulty}
დონე: ${level}

მნიშვნელოვანი ინსტრუქციები:
1. ყველა კითხვა და პასუხი უნდა იყოს ქართულ ენაზე
2. გრამატიკულად სწორი ქართული ენა გამოიყენე
3. კითხვები უნდა იყოს ფაქტობრივად ზუსტი და სანდო
4. არასწორი პასუხები უნდა იყოს დამაჯერებელი, მაგრამ აშკარად არასწორი
5. თავიდან აიცილე გაუგებარი ან ორაზროვანი კითხვები

დააბრუნე მხოლოდ JSON მასივი ზუსტად ამ სტრუქტურით, სხვა ტექსტი არ დაურთო:
[
  {
    "question": "კითხვა ქართულად?",
    "correct_answer": "სწორი პასუხი",
    "incorrect_answers": ["არასწორი 1", "არასწორი 2", "არასწორი 3"],
    "difficulty": "${difficultyEn}"
  }
]`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", errorText);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "ძალიან ბევრი მოთხოვნა, გთხოვთ მოიცადოთ." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "სერვისი დროებით მიუწვდომელია." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
      throw new Error("კითხვების გენერირება ვერ მოხერხდა");
    }

    const questions = JSON.parse(jsonMatch[0]);

    console.log(`Successfully generated ${questions.length} Georgian questions`);

    return new Response(
      JSON.stringify({ questions }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "შეცდომა მოხდა";
    console.error("Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
