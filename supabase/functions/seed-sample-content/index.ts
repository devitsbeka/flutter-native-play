import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AI_CHAT_URL, AI_API_KEY, aiModel } from "../_shared/ai.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// 8 mascot accounts with their content plans
const MASCOT_ACCOUNTS = [
  {
    userId: "71eb3fac-ba7c-4e7e-8b5e-02a21323e76e",
    nickname: "გიორგი",
    standaloneTopics: [
      { title: "ფეხბურთის ვარსკვლავები", subject: "ფეხბურთი", description: "რამდენად კარგად იცნობ ფეხბურთის ლეგენდებს?" },
      { title: "ქართული ფეხბურთი", subject: "ქართული ფეხბურთი", description: "შეამოწმე შენი ცოდნა ქართულ ფეხბურთზე" },
    ],
    collection: {
      title: "სპორტის ვარსკვლავები ⭐",
      description: "სპორტის სამყაროს ლეგენდები",
      gradient: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
      rounds: [
        { title: "ლიონელ მესი", subject: "მესი" },
        { title: "კრისტიანო რონალდუ", subject: "რონალდუ" },
        { title: "NBA ლეგენდები", subject: "NBA" },
      ],
    },
  },
  {
    userId: "06f96912-ddc0-4a02-abc2-21817b4e9d20",
    nickname: "მარიამი",
    standaloneTopics: [
      { title: "სამზარეულოს საიდუმლოებები", subject: "სამზარეულო", description: "რამდენად კარგად იცნობ კულინარიულ სამყაროს?" },
      { title: "მსოფლიო სამზარეულო", subject: "მსოფლიო კერძები", description: "გამოიცანი კერძები მთელი მსოფლიოდან" },
    ],
    collection: {
      title: "ქართული სამზარეულო 🍽️",
      description: "ქართული კულინარიის საუკეთესო კერძები",
      gradient: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
      rounds: [
        { title: "ქართული წინწკლები", subject: "ქართული წინწკლები და სალათები" },
        { title: "მთავარი კერძები", subject: "ქართული მთავარი კერძები" },
        { title: "ქართული ტკბილეული", subject: "ქართული დესერტები და ტკბილეული" },
      ],
    },
  },
  {
    userId: "dbf8dbc0-5e95-4870-8b47-a043ead0fb9f",
    nickname: "ნიკა",
    standaloneTopics: [
      { title: "როკ მუსიკის ისტორია", subject: "როკ მუსიკა", description: "რამდენად კარგად იცნობ როკ მუსიკას?" },
      { title: "ქართული მუსიკა", subject: "ქართული მუსიკა", description: "შეამოწმე ქართული მუსიკის ცოდნა" },
    ],
    collection: {
      title: "მუსიკის ათწლეულები 🎵",
      description: "მუსიკალური მოგზაურობა ათწლეულების მიხედვით",
      gradient: "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)",
      rounds: [
        { title: "80-იანების ჰიტები", subject: "80-იანი წლების მუსიკა" },
        { title: "90-იანების ჰიტები", subject: "90-იანი წლების მუსიკა" },
        { title: "2000-იანების ჰიტები", subject: "2000-იანი წლების მუსიკა" },
      ],
    },
  },
  {
    userId: "2574663a-d951-4475-9feb-60fef89caf9d",
    nickname: "ანა",
    standaloneTopics: [
      { title: "მსოფლიო ხელოვნება", subject: "ხელოვნება", description: "რამდენად კარგად იცნობ ხელოვნების ისტორიას?" },
      { title: "ცნობილი ნახატები", subject: "ცნობილი ნახატები", description: "გამოიცანი მსოფლიო ცნობილი ნამუშევრები" },
    ],
    collection: {
      title: "ცნობილი მხატვრები 🎨",
      description: "მსოფლიოს უდიდესი მხატვრების შემოქმედება",
      gradient: "linear-gradient(135deg, #EC4899 0%, #DB2777 100%)",
      rounds: [
        { title: "რენესანსის ოსტატები", subject: "რენესანსის ხელოვნება და მხატვრები" },
        { title: "თანამედროვე ხელოვნება", subject: "თანამედროვე ხელოვნება და მხატვრები" },
      ],
    },
  },
  {
    userId: "af7699b1-ce81-4c39-8693-624ce0c20ad1",
    nickname: "დავითი",
    standaloneTopics: [
      { title: "კინოს ოსკარები", subject: "ოსკარის დაჯილდოება", description: "რამდენად კარგად იცნობ ოსკარის ისტორიას?" },
      { title: "ქართული კინო", subject: "ქართული კინო", description: "შეამოწმე ქართული კინოს ცოდნა" },
    ],
    collection: {
      title: "კინო ფრენჩაიზები 🎬",
      description: "ყველაზე პოპულარული კინო ფრენჩაიზები",
      gradient: "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)",
      rounds: [
        { title: "Marvel სამყარო", subject: "Marvel კინო სამყარო" },
        { title: "ჰარი პოტერი", subject: "ჰარი პოტერი" },
        { title: "ვარსკვლავური ომები", subject: "Star Wars" },
      ],
    },
  },
  {
    userId: "9b9330ae-740f-4b53-8e40-9202ce3660c9",
    nickname: "ელენე",
    standaloneTopics: [
      { title: "მეცნიერების აღმოჩენები", subject: "მეცნიერება", description: "რამდენად კარგად იცნობ მეცნიერების ისტორიას?" },
      { title: "ადამიანის სხეული", subject: "ადამიანის ანატომია", description: "შეამოწმე ანატომიის ცოდნა" },
    ],
    collection: {
      title: "კოსმოსი და სამყარო 🚀",
      description: "კოსმოსის საიდუმლოებები",
      gradient: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)",
      rounds: [
        { title: "მზის სისტემა", subject: "მზის სისტემა და პლანეტები" },
        { title: "ვარსკვლავები და გალაქტიკები", subject: "ვარსკვლავები და გალაქტიკები" },
      ],
    },
  },
  {
    userId: "7570d628-619b-434c-8d5c-fa6007eaa43f",
    nickname: "ლუკა",
    standaloneTopics: [
      { title: "ესპორტის სამყარო", subject: "ესპორტი", description: "რამდენად კარგად იცნობ ესპორტს?" },
      { title: "რეტრო თამაშები", subject: "რეტრო ვიდეო თამაშები", description: "შეამოწმე კლასიკური თამაშების ცოდნა" },
    ],
    collection: {
      title: "ვიდეო თამაშები 🎮",
      description: "ყველაფერი ვიდეო თამაშებზე",
      gradient: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
      rounds: [
        { title: "Nintendo კლასიკა", subject: "Nintendo თამაშები" },
        { title: "PlayStation ექსკლუზივები", subject: "PlayStation თამაშები" },
        { title: "PC გეიმინგი", subject: "PC თამაშები" },
      ],
    },
  },
  {
    userId: "d11948a8-afc0-4203-8020-0f1c800f17bb",
    nickname: "თამარი",
    standaloneTopics: [
      { title: "მსოფლიო ლიტერატურა", subject: "ლიტერატურა", description: "რამდენად კარგად იცნობ მსოფლიო ლიტერატურას?" },
      { title: "პოეზია", subject: "პოეზია", description: "შეამოწმე პოეზიის ცოდნა" },
    ],
    collection: {
      title: "ლიტერატურის სამყარო 📚",
      description: "ქართული და მსოფლიო ლიტერატურა",
      gradient: "linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)",
      rounds: [
        { title: "ქართველი ავტორები", subject: "ქართული ლიტერატურა და ავტორები" },
        { title: "მსოფლიო კლასიკა", subject: "მსოფლიო კლასიკური ლიტერატურა" },
      ],
    },
  },
];

const STANDALONE_GRADIENTS = [
  "linear-gradient(135deg, #F97316 0%, #EA580C 100%)",
  "linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)",
  "linear-gradient(135deg, #A855F7 0%, #9333EA 100%)",
  "linear-gradient(135deg, #F43F5E 0%, #E11D48 100%)",
  "linear-gradient(135deg, #22C55E 0%, #16A34A 100%)",
  "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
  "linear-gradient(135deg, #EC4899 0%, #DB2777 100%)",
  "linear-gradient(135deg, #EAB308 0%, #CA8A04 100%)",
];

async function generateQuestions(
  apiKey: string,
  subject: string,
  count: number = 7
): Promise<any[]> {
  const prompt = `შექმენი ტრივიას ${count} კითხვა ქართულ ენაზე თემაზე: "${subject}".

თითოეული კითხვისთვის მოგვეცი:
- question_text: კითხვა ქართულად (მოკლე, გასაგები)
- correct_answer: სწორი პასუხი ქართულად (მოკლე, 1-4 სიტყვა)
- incorrect_answers: 3 არასწორი პასუხი ქართულად (მოკლე, 1-4 სიტყვა თითოეული)
- difficulty: "easy", "medium" ან "hard" (მრავალფეროვანი)

მნიშვნელოვანი:
- კითხვები უნდა იყოს ფაქტობრივად ზუსტი
- პასუხები უნდა იყოს მოკლე (არა წინადადებები)
- არასწორი პასუხები უნდა იყოს დამაჯერებელი
- კითხვები არ უნდა განმეორდეს

დააბრუნე მხოლოდ JSON მასივი, სხვა ტექსტის გარეშე.`;

  const response = await fetch(
    AI_CHAT_URL,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiModel("google/gemini-2.5-flash"),
        messages: [
          {
            role: "system",
            content:
              "You are a trivia question generator. Return ONLY valid JSON arrays, no markdown, no explanation.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.8,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`AI generation error for "${subject}":`, response.status, errorText);
    throw new Error(`AI error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  let content = data.choices?.[0]?.message?.content || "";

  // Clean markdown fences if present
  content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  try {
    const questions = JSON.parse(content);
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error("Invalid questions format");
    }
    return questions.map((q: any) => ({
      question_text: q.question_text,
      correct_answer: q.correct_answer,
      incorrect_answers: Array.isArray(q.incorrect_answers)
        ? q.incorrect_answers.slice(0, 3)
        : [],
      difficulty: q.difficulty || "mixed",
    }));
  } catch (e) {
    console.error(`Failed to parse AI response for "${subject}":`, content);
    throw e;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!AI_API_KEY) {
      throw new Error("AI_API_KEY not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const results: any[] = [];
    let gradientIndex = 0;

    for (const account of MASCOT_ACCOUNTS) {
      console.log(`\n=== Seeding content for ${account.nickname} (${account.userId}) ===`);
      const accountResults: any = { nickname: account.nickname, standalones: [], collection: null };

      // 1. Generate standalone trivias
      for (const topic of account.standaloneTopics) {
        try {
          console.log(`  Generating standalone: "${topic.title}"...`);
          const questions = await generateQuestions(AI_API_KEY, topic.subject, 7);
          const gradient = STANDALONE_GRADIENTS[gradientIndex % STANDALONE_GRADIENTS.length];
          gradientIndex++;

          const playsCount = Math.floor(Math.random() * 80) + 20;
          const likesCount = Math.floor(Math.random() * 30) + 5;
          const savesCount = Math.floor(Math.random() * 15) + 2;

          const { data: post, error: postError } = await supabase
            .from("user_quiz_posts")
            .insert({
              user_id: account.userId,
              title: topic.title,
              subject: topic.subject,
              description: topic.description,
              questions: questions,
              question_count: questions.length,
              answer_format: "4_answers",
              cover_gradient: gradient,
              is_public: true,
              is_blind: false,
              plays_count: playsCount,
              likes_count: likesCount,
              saves_count: savesCount,
            })
            .select("id")
            .single();

          if (postError) {
            console.error(`  Error creating standalone "${topic.title}":`, postError);
            accountResults.standalones.push({ title: topic.title, error: postError.message });
          } else {
            console.log(`  ✓ Created standalone "${topic.title}" (${questions.length} questions)`);
            accountResults.standalones.push({ title: topic.title, id: post.id, questions: questions.length });
          }

          // Small delay to avoid rate limiting
          await new Promise((r) => setTimeout(r, 1500));
        } catch (e) {
          console.error(`  Error generating standalone "${topic.title}":`, e);
          accountResults.standalones.push({ title: topic.title, error: String(e) });
        }
      }

      // 2. Generate collection with rounds
      try {
        const coll = account.collection;
        console.log(`  Creating collection: "${coll.title}"...`);

        const collPlays = Math.floor(Math.random() * 120) + 40;
        const collLikes = Math.floor(Math.random() * 50) + 10;
        const collSaves = Math.floor(Math.random() * 25) + 5;

        const { data: collection, error: collError } = await supabase
          .from("quiz_collections")
          .insert({
            user_id: account.userId,
            title: coll.title,
            description: coll.description,
            cover_gradient: coll.gradient,
            is_public: true,
            plays_count: collPlays,
            likes_count: collLikes,
            saves_count: collSaves,
          })
          .select("id")
          .single();

        if (collError) {
          console.error(`  Error creating collection:`, collError);
          accountResults.collection = { title: coll.title, error: collError.message };
        } else {
          console.log(`  ✓ Created collection "${coll.title}" (id: ${collection.id})`);
          accountResults.collection = { title: coll.title, id: collection.id, rounds: [] };

          // Generate rounds
          for (let i = 0; i < coll.rounds.length; i++) {
            const round = coll.rounds[i];
            try {
              console.log(`    Generating round ${i + 1}: "${round.title}"...`);
              const questions = await generateQuestions(AI_API_KEY, round.subject, 7);

              const { data: post, error: roundError } = await supabase
                .from("user_quiz_posts")
                .insert({
                  user_id: account.userId,
                  title: round.title,
                  subject: round.subject,
                  questions: questions,
                  question_count: questions.length,
                  answer_format: "4_answers",
                  cover_gradient: coll.gradient,
                  is_public: true,
                  is_blind: false,
                  collection_id: collection.id,
                  round_number: i + 1,
                  plays_count: Math.floor(Math.random() * 60) + 15,
                  likes_count: Math.floor(Math.random() * 20) + 3,
                  saves_count: Math.floor(Math.random() * 10) + 1,
                })
                .select("id")
                .single();

              if (roundError) {
                console.error(`    Error creating round "${round.title}":`, roundError);
                accountResults.collection.rounds.push({ title: round.title, error: roundError.message });
              } else {
                console.log(`    ✓ Created round "${round.title}" (${questions.length} questions)`);
                accountResults.collection.rounds.push({ title: round.title, id: post.id, questions: questions.length });
              }

              await new Promise((r) => setTimeout(r, 1500));
            } catch (e) {
              console.error(`    Error generating round "${round.title}":`, e);
              accountResults.collection.rounds.push({ title: round.title, error: String(e) });
            }
          }
        }
      } catch (e) {
        console.error(`  Error creating collection:`, e);
        accountResults.collection = { title: account.collection.title, error: String(e) };
      }

      results.push(accountResults);
    }

    return new Response(
      JSON.stringify({ success: true, results }, null, 2),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Seed error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
