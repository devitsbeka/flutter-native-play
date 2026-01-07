/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Category-specific topic guidance to ensure relevance
const categoryTopics: Record<string, string[]> = {
  'georgian_history': ['ომები', 'ბრძოლები', 'მეფეები', 'დედოფლები', 'სამეფოები', 'ხელშეკრულებები', 'თარიღები', 'ტერიტორიები', 'პოლიტიკური მოვლენები', 'რევოლუციები', 'დამოუკიდებლობა'],
  'history': ['ისტორიული მოვლენები', 'მსოფლიო ომები', 'იმპერიები', 'ცივილიზაციები', 'რევოლუციები', 'მეფეები', 'პრეზიდენტები', 'პოლიტიკური ლიდერები'],
  'sports': ['ფეხბურთი', 'რაგბი', 'ჭიდაობა', 'ოლიმპიადა', 'ჩემპიონატი', 'სპორტსმენები', 'მწვრთნელები', 'გუნდები', 'რეკორდები', 'ტურნირები'],
  'pop_culture': ['ცნობილი პიროვნებები', 'სელებრითები', 'სოციალური მედია', 'ტრენდები', 'ვირუსული კონტენტი', 'ინფლუენსერები', 'მოდა'],
  'music': ['მომღერლები', 'ბენდები', 'სიმღერები', 'ალბომები', 'კონცერტები', 'მუსიკალური ჟანრები', 'კომპოზიტორები'],
  'movies': ['ფილმები', 'მსახიობები', 'რეჟისორები', 'ოსკარი', 'კინოსტუდიები', 'ანიმაციები', 'სერიალები'],
  'science': ['ფიზიკა', 'ქიმია', 'ბიოლოგია', 'ასტრონომია', 'მათემატიკა', 'მეცნიერები', 'აღმოჩენები', 'გამოგონებები'],
  'geography': ['ქვეყნები', 'დედაქალაქები', 'მთები', 'მდინარეები', 'ოკეანეები', 'კონტინენტები', 'მოსახლეობა'],
  'art': ['მხატვრები', 'ნახატები', 'სკულპტურები', 'მუზეუმები', 'არქიტექტურა', 'ხელოვნების მიმდინარეობები'],
  'literature': ['მწერლები', 'პოეტები', 'წიგნები', 'რომანები', 'ლექსები', 'ნობელის პრემია'],
  'technology': ['პროგრამირება', 'კომპიუტერები', 'ინტერნეტი', 'სმარტფონები', 'სოციალური ქსელები', 'ინოვაციები'],
  'food': ['სამზარეულო', 'რეცეპტები', 'ინგრედიენტები', 'რესტორნები', 'ეროვნული კერძები', 'დესერტები'],
  'nature': ['ცხოველები', 'მცენარეები', 'ეკოსისტემები', 'კლიმატი', 'ბუნებრივი მოვლენები'],
  'default': ['ძირითადი თემები', 'საინტერესო ფაქტები', 'ცნობილი მოვლენები']
};

// Category-specific exclusion keywords to avoid cross-contamination
const categoryExclusions: Record<string, string[]> = {
  'georgian_history': ['სპორტი', 'ფეხბურთი', 'ჩემპიონატი', 'ოლიმპიადა', 'მომღერალი', 'ფილმი', 'სერიალი', 'ანიმე'],
  'history': ['სპორტი', 'ფეხბურთი', 'მომღერალი', 'ფილმი'],
  'sports': ['მეფე', 'სამეფო', 'ომი', 'ბრძოლა', 'პრეზიდენტი', 'მთავრობა', 'ისტორიული'],
  'pop_culture': ['ომი', 'ბრძოლა', 'სამეფო', 'მეფე'],
  'music': ['სპორტი', 'ფეხბურთი', 'ომი', 'პოლიტიკა'],
  'movies': ['სპორტი', 'პოლიტიკა', 'ომები'],
  'science': ['სპორტი', 'მუსიკა', 'ფილმები', 'სელებრითი'],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      category, 
      categoryId, 
      categoryDescription,
      level = 1, 
      count = 5, 
      topic,
      existingQuestions = [] 
    } = await req.json();

    if (!category) {
      return new Response(
        JSON.stringify({ error: "კატეგორიის ინფორმაცია აკლია" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating ${count} Georgian trivia questions for category: ${category} (${categoryId}), level: ${level}, topic: ${topic || 'none'}, excluding ${existingQuestions.length} existing questions`);

    const difficulty = level <= 5 ? "მარტივი" : level <= 15 ? "საშუალო" : "რთული";
    const difficultyEn = level <= 5 ? "easy" : level <= 15 ? "medium" : "hard";
    
    // Get category-specific topics for guidance
    const allowedTopics = categoryTopics[categoryId] || categoryTopics['default'];
    const excludedTopics = categoryExclusions[categoryId] || [];
    
    // Use provided topic or pick from allowed topics
    const focusArea = topic || allowedTopics[Math.floor(Math.random() * allowedTopics.length)];

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

    // Build exclusion section for topics
    const topicExclusionSection = excludedTopics.length > 0
      ? `
⛔ აკრძალული თემები "${category}" კატეგორიისთვის:
${excludedTopics.map(t => `- ${t}`).join('\n')}
არ შექმნა კითხვები ამ თემებზე!
`
      : '';

    const prompt = `შექმენი ${count} უნიკალური ტრივია კითხვა ქართულ ენაზე.

📌 კატეგორია: "${category}"
${categoryDescription ? `📝 კატეგორიის აღწერა: "${categoryDescription}"` : ''}
${topic ? `🎯 კონკრეტული თემა: "${topic}"` : `🎯 ფოკუსირება: "${focusArea}"`}
სირთულე: ${difficulty}
დონე: ${level}

🚨🚨🚨 კრიტიკულად მნიშვნელოვანი - კატეგორიის რელევანტურობა:

⛔ ყველა კითხვა უნდა იყოს ᲛᲮᲝᲚᲝᲓ "${category}" კატეგორიის შესახებ!
⛔ არ შექმნა კითხვები სხვა კატეგორიებიდან!

✅ დაშვებული თემები "${category}" კატეგორიისთვის:
${allowedTopics.map(t => `- ${t}`).join('\n')}

${topicExclusionSection}

მაგალითი რა არის არასწორი:
- თუ კატეგორიაა "საქართველოს ისტორია", არ უნდა იყოს კითხვები:
  • სპორტის შესახებ (ოლიმპიადა, ჩემპიონატები, სპორტსმენები)
  • მუსიკის შესახებ (მომღერლები, სიმღერები)
  • კინოს შესახებ (ფილმები, მსახიობები)
  • სხვა ქვეყნების შესახებ (თუ საქართველოს ისტორიას არ უკავშირდება)

- თუ კატეგორიაა "სპორტი", არ უნდა იყოს კითხვები:
  • ისტორიის შესახებ (ომები, მეფეები)
  • პოლიტიკის შესახებ

${exclusionSection}

🚨 კრიტიკულად მნიშვნელოვანი წესები:

1. ✅ კითხვის მაქსიმალური სიგრძე: 65 სიმბოლო (არა მეტი!)
2. ✅ პასუხის მაქსიმალური სიგრძე: 20 სიმბოლო
3. ✅ ყველა კითხვა უნდა დამთავრდეს კითხვის ნიშნით (?)
4. ✅ გრამატიკულად სწორი ქართული ენა
5. ✅ მხოლოდ "${category}" თემატიკის კითხვები!

🚫 აკრძალული შეცდომები:

6. ❌ კითხვა არ უნდა შეიცავდეს სწორი პასუხის ტექსტს!
7. ❌ არ გამოიყენო ფორმატი "X-ით რა მოხდა?" სადაც X არის პასუხი
8. ❌ არ ჩასვა პასუხის სახელი კითხვაში

📝 დამატებითი ინსტრუქციები:
9. კითხვები უნდა იყოს ფაქტობრივად ზუსტი და სანდო
10. არასწორი პასუხები უნდა იყოს დამაჯერებელი, მაგრამ აშკარად არასწორი
11. გენერირე სრულიად განსხვავებული კითხვები ყოველ ჯერზე

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
        temperature: 0.9,
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

    console.log(`Successfully generated ${questions.length} Georgian questions for ${category}`);

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
