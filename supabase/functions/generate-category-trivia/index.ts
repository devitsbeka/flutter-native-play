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
    const { category, categoryId, level = 1, count = 5, existingQuestions = [] } = await req.json();

    if (!category) {
      return new Response(
        JSON.stringify({ error: "კატეგორიის ინფორმაცია აკლია" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating ${count} Georgian trivia questions for category: ${category}, level: ${level}, excluding ${existingQuestions.length} existing questions`);

    const difficulty = level <= 5 ? "მარტივი" : level <= 15 ? "საშუალო" : "რთული";
    const difficultyEn = level <= 5 ? "easy" : level <= 15 ? "medium" : "hard";
    
    // Add randomization for variety
    const randomSeed = Math.floor(Math.random() * 100000);
    const focusAreas = [
      'ისტორიული მოვლენები', 'ცნობილი პიროვნებები', 'კულტურა და ტრადიციები',
      'გეოგრაფია და ბუნება', 'ხელოვნება', 'მეცნიერება და აღმოჩენები',
      'სპორტი', 'არქიტექტურა', 'ლიტერატურა', 'მუსიკა', 'კინო და თეატრი',
      'საინტერესო ფაქტები', 'თანამედროვე მოვლენები'
    ];
    const focusArea = focusAreas[Math.floor(Math.random() * focusAreas.length)];

    // Build exclusion list for AI (limit to 50 most recent to keep prompt size manageable)
    const exclusionList = existingQuestions.slice(0, 50);
    const exclusionSection = exclusionList.length > 0 
      ? `

🚫 უკვე არსებული კითხვები - არ გაიმეორო ან მსგავსი არ შექმნა!
${exclusionList.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')}

⚠️ ზემოთ ჩამოთვლილი კითხვები უკვე არსებობს მონაცემთა ბაზაში. 
შექმენი სრულიად ახალი და განსხვავებული კითხვები!
არ გაიმეორო იგივე თემები, პიროვნებები ან მოვლენები!
`
      : '';

    const prompt = `შექმენი ${count} უნიკალური ტრივია კითხვა თემაზე: "${category}" ქართულ ენაზე.

სირთულე: ${difficulty}
დონე: ${level}
Random Seed: ${randomSeed}
ფოკუსირება: ${focusArea}
${exclusionSection}
🚨 კრიტიკულად მნიშვნელოვანი წესები:

1. ✅ კითხვის მაქსიმალური სიგრძე: 65 სიმბოლო (არა მეტი!)
2. ✅ პასუხის მაქსიმალური სიგრძე: 20 სიმბოლო
3. ✅ ყველა კითხვა უნდა დამთავრდეს კითხვის ნიშნით (?)
4. ✅ გრამატიკულად სწორი ქართული ენა

🚫 აკრძალული შეცდომები (ეს კითხვები უარყოფილი იქნება):

5. ❌ კითხვა არ უნდა შეიცავდეს სწორი პასუხის ტექსტს!
   ცუდი მაგალითი: "დიდგორის ბრძოლით რა დაიწყო?" (თუ პასუხია "დიდგორის ბრძოლა")
   კარგი მაგალითი: "რომელმა ბრძოლამ დაიწყო საქართველოს ოქროს ხანა?"
   
6. ❌ არ გამოიყენო ფორმატი "X-ით რა მოხდა?" სადაც X არის პასუხი
7. ❌ არ ჩასვა პასუხის სახელი კითხვაში

📝 დამატებითი ინსტრუქციები:
8. კითხვები უნდა იყოს ფაქტობრივად ზუსტი და სანდო
9. არასწორი პასუხები უნდა იყოს დამაჯერებელი, მაგრამ აშკარად არასწორი
10. გენერირე სრულიად განსხვავებული კითხვები ყოველ ჯერზე
11. ფოკუსირდი "${focusArea}" ასპექტებზე
12. Random seed: ${randomSeed}

დააბრუნე მხოლოდ JSON მასივი:
[
  {
    "question": "კითხვა ქართულად? (მაქს 65 სიმბოლო)",
    "correct_answer": "პასუხი (მაქს 20 სიმბოლო)",
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
        temperature: 0.95,
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
