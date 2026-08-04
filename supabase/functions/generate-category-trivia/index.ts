/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getCorsHeaders } from "../_shared/cors.ts";
import { factCheckQuestions } from "../_shared/factCheck.ts";
import { AI_CHAT_URL, AI_API_KEY } from "../_shared/ai.ts";

// Quality constants - must match frontend
const QUESTION_MAX_LENGTH = 65;
const ANSWER_MAX_LENGTH = 20;
const SIMILARITY_THRESHOLD = 0.55;

// Semantic duplicate detection utilities
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[?.!,;:'"()]/g, '')
    .replace(/\s+/g, ' ');
}

function extractKeywords(text: string): Set<string> {
  const normalized = normalizeText(text);
  const numbers = text.match(/\d+/g) || [];
  const words = normalized.split(' ').filter(w => w.length > 3);
  return new Set([...numbers, ...words]);
}

function calculateSimilarity(text1: string, text2: string): number {
  const s1 = normalizeText(text1);
  const s2 = normalizeText(text2);
  
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;
  
  // Check if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) {
    const shorter = Math.min(s1.length, s2.length);
    const longer = Math.max(s1.length, s2.length);
    return shorter / longer;
  }
  
  // Keyword-based similarity (Jaccard index)
  const keywords1 = extractKeywords(text1);
  const keywords2 = extractKeywords(text2);
  
  if (keywords1.size === 0 || keywords2.size === 0) return 0;
  
  const intersection = [...keywords1].filter(k => keywords2.has(k));
  const union = new Set([...keywords1, ...keywords2]);
  
  return intersection.length / union.size;
}

function removeDuplicatesFromBatch<T extends { question: string }>(
  questions: T[],
  threshold: number = SIMILARITY_THRESHOLD
): T[] {
  const unique: T[] = [];
  
  for (const q of questions) {
    const isDuplicate = unique.some(existing => 
      calculateSimilarity(q.question, existing.question) > threshold
    );
    
    if (!isDuplicate) {
      unique.push(q);
    }
  }
  
  return unique;
}

function isSimilarToExisting(question: string, existingQuestions: string[], threshold: number = SIMILARITY_THRESHOLD): boolean {
  return existingQuestions.some(existing => 
    calculateSimilarity(question, existing) > threshold
  );
}

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

// Icon keyword mappings for Georgian words - CONTEXT-AWARE
const iconKeywordMappings = `
🏷️ აიკონის საკვანძო სიტყვა (icon_keyword):

ყველა კითხვას უნდა ჰქონდეს ინგლისური საკვანძო სიტყვა აიკონის მინიჭებისთვის.

🚨🚨🚨 უმთავრესი წესი - აიკონმა არ უნდა გამოამჟღავნოს პასუხი!

❌ აკრძალულია: აიკონის keyword რომელიც ემთხვევა ან მინიშნებას იძლევა სწორ პასუხზე!

მაგალითები:
- კითხვა: "რომელ ცხოველს შეუძლია ფერის შეცვლა?"
- სწორი პასუხი: "ქამელეონი"
- ❌ არასწორი keyword: "chameleon" (ემთხვევა პასუხს!)
- ✅ სწორი keyword: "animal" ან "color" ან "nature"

- კითხვა: "რომელია საქართველოს ყველაზე გრძელი მდინარე?"
- სწორი პასუხი: "მტკვარი"  
- ❌ არასწორი keyword: "river" ან "mtkvari"
- ✅ სწორი keyword: "map" ან "geography" ან "water"

- კითხვა: "რომელ ცხოველს ეწოდება ტყის მეფე?"
- სწორი პასუხი: "ლომი"
- ❌ არასწორი keyword: "lion" (ემთხვევა პასუხს!)
- ✅ სწორი keyword: "animal" ან "forest" ან "crown"

აიკონი უნდა იყოს კითხვის ᲙᲝᲜᲢᲔᲥᲡᲢᲘᲡ შესახებ, არა პასუხის!

📚 კონტექსტების ტიპები და შესაბამისი keywords:

ბრძოლა/ომი/შეტევა/გამარჯვება → battle, sword, attack, war, victory, shield, two-swords
მეფე/ტახტი/სამეფო/გვირგვინი → king, crown, throne, scepter, royal, castle
ქალაქი/დედაქალაქი/ადგილი → city, building, map, location, skyline
მათემატიკა/გამოთვლა/რიცხვი → calculator, math, percent, number, equation
თარიღი/წელი/საუკუნე → calendar, date, history, clock, time
მეცნიერება/ფიზიკა/ქიმია → science, atom, flask, microscope, lab
გეოგრაფია/მთა/მდინარე → mountain, geography, map, globe, terrain
ცხოველების შესახებ → animal, nature, paw, wildlife (არა კონკრეტული ცხოველი!)
ფრინველების შესახებ → bird, wing, feather, nature (არა კონკრეტული ფრინველი!)
`;

// Build a fact-based prompt when researched facts are available
function buildFactBasedPrompt(
  facts: Array<{ fact: string; source_hint?: string; suggested_answer?: string }>,
  category: string,
  categoryDescription: string | undefined,
  difficulty: string,
  difficultyEn: string,
  excludedTopics: string[],
  allowedTopics: string[],
  topicExclusionSection: string
): string {
  const factsSection = facts
    .map((f, i) => `${i + 1}. ფაქტი: ${f.fact}${f.suggested_answer ? ` (პასუხი: ${f.suggested_answer})` : ''}`)
    .join('\n');

  return `შენ ხარ ტრივია კითხვების შემქმნელი. შენ მოცემული გაქვს კონკრეტული ფაქტები და შენი ამოცანაა გადააკეთო ისინი ტრივია კითხვებად.

📌 კატეგორია: "${category}"
${categoryDescription ? `📝 კატეგორიის აღწერა: "${categoryDescription}"` : ''}
სირთულე: ${difficulty}

🎯 ქვემოთ მოცემულია ${facts.length} ფაქტი. თითოეული ფაქტი უნდა გახდეს ერთი ტრივია კითხვა:

${factsSection}

🚨 წესები:
1. ყოველი ფაქტიდან შექმენი ზუსტად ერთი კითხვა
2. კითხვა: მაქს 65 სიმბოლო (კითხვის ნიშნის ჩათვლით)
3. სწორი პასუხი: მაქს 20 სიმბოლო
4. 3 არასწორი პასუხი: მაქს 20 სიმბოლო თითოეული
5. არასწორი პასუხები უნდა იყოს დამაჯერებელი მაგრამ არასწორი
6. ყველა 4 პასუხი მსგავსი სიგრძის (5 სიმბოლოს ფარგლებში)
7. კითხვა არ უნდა შეიცავდეს სწორ პასუხს
8. ფაქტობრივად ზუსტი - არ შეცვალო ფაქტები!

${iconKeywordMappings}

დააბრუნე მხოლოდ JSON მასივი:
[
  {
    "question": "კითხვა ქართულად? (მაქს 65 სიმბოლო)",
    "correct_answer": "პასუხი (მაქს 20 სიმბოლო)",
    "incorrect_answers": ["არასწორი 1", "არასწორი 2", "არასწორი 3"],
    "difficulty": "${difficultyEn}",
    "icon_keyword": "ინგლისურად keyword აიკონისთვის"
  }
]`;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
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
      coveredTopics = [],
      researchedFacts = []
    } = await req.json();

    if (!category || !categoryId) {
      return new Response(
        JSON.stringify({ error: "კატეგორიის ინფორმაცია აკლია" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Server-side: fetch ALL existing questions from DB (no client dependency)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Look up the actual UUID for this category_id string
    const { data: catRow } = await supabaseClient
      .from("categories")
      .select("id")
      .eq("category_id", categoryId)
      .single();

    const categoryUuid = catRow?.id;
    if (!categoryUuid) {
      return new Response(
        JSON.stringify({ error: "კატეგორია ვერ მოიძებნა" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: dbQuestions } = await supabaseClient
      .from("questions")
      .select("question_text, correct_answer")
      .eq("category_id", categoryUuid)
      .eq("is_active", true)
      .limit(1000);

    const existingTexts = (dbQuestions || []).map(q => q.question_text);
    const existingAnswers = new Set((dbQuestions || []).map(q => q.correct_answer.trim().toLowerCase()));

    console.log(`Generating ${count} questions for ${category} (${categoryId}). DB has ${existingTexts.length} existing questions, ${existingAnswers.size} unique answers, ${coveredTopics.length} covered topics`);

    const difficulty = level <= 5 ? "მარტივი" : level <= 15 ? "საშუალო" : "რთული";
    const difficultyEn = level <= 5 ? "easy" : level <= 15 ? "medium" : "hard";
    
    // Get category-specific topics for guidance
    const allowedTopics = categoryTopics[categoryId] || categoryTopics['default'];
    const excludedTopics = categoryExclusions[categoryId] || [];
    
    // Use provided topic or pick from allowed topics
    const focusArea = topic || allowedTopics[Math.floor(Math.random() * allowedTopics.length)];

    // Build topic-aware exclusion section (primary method)
    const topicFingerprintSection = coveredTopics.length > 0
      ? `
🚫🚫🚫 უკვე დაფარული თემები - არ გაიმეორო!

ამ კატეგორიაში უკვე ${coveredTopics.length} თემა/ფაქტი არის დაფარული:
${coveredTopics.map((t: string, i: number) => `${i + 1}. ${t}`).join('\n')}

⚠️⚠️⚠️ ყველა ზემოთ ჩამოთვლილი თემა უკვე არსებობს მონაცემთა ბაზაში!
შექმენი კითხვები რომლებიც ეხება სრულიად ახალ ფაქტებს, პიროვნებებს, მოვლენებს ან თარიღებს!
არ გაიმეორო იგივე თემები სხვა ფორმულირებით!
იფიქრე ნაკლებად ცნობილ, უჩვეულო ფაქტებზე რომლებიც არ არის ზემოთ ჩამოთვლილ სიაში!
`
      : '';

    // Fallback: raw question exclusion (only used when no topic fingerprint)
    const exclusionList = existingTexts.slice(0, 50);
    const exclusionSection = coveredTopics.length === 0 && exclusionList.length > 0 
      ? `
🚫 უკვე არსებული კითხვები - არ გაიმეორო ან მსგავსი არ შექმნა!
${exclusionList.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')}

⚠️ ზემოთ ჩამოთვლილი კითხვები უკვე არსებობს მონაცემთა ბაზაში. 
შექმენი სრულიად ახალი და განსხვავებული კითხვები!
არ გაიმეორო იგივე თემები, პიროვნებები ან მოვლენები!
`
      : '';

    // Answer exclusion list - prevent same-fact questions
    const existingAnswersList = [...existingAnswers].slice(0, 200);
    const answerExclusionSection = existingAnswersList.length > 0
      ? `
🚫🚫🚫 უკვე არსებული პასუხები - ეს ფაქტები უკვე დაფარულია!
არ შექმნა კითხვა რომლის სწორი პასუხი იქნება ქვემოთ ჩამოთვლილი:
${existingAnswersList.join(', ')}

⚠️ თუ რომელიმე ზემოთ ჩამოთვლილი სიტყვა/ფრაზა შენი კითხვის სწორ პასუხს ემთხვევა - ეს კითხვა უკვე არსებობს!
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

    // If researched facts are provided, use a completely different prompt strategy
    const hasResearchedFacts = researchedFacts.length > 0;

    const prompt = hasResearchedFacts ? buildFactBasedPrompt(researchedFacts, category, categoryDescription, difficulty, difficultyEn, excludedTopics, allowedTopics, topicExclusionSection) : `შექმენი ${count} უნიკალური ტრივია კითხვა ქართულ ენაზე.

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

🚫 კრიტიკულად მნიშვნელოვანი - არ გაიმეორო კონტექსტი:

თითოეული კითხვა უნდა ეხებოდეს სრულიად განსხვავებულ ფაქტს!

❌ არასწორი მაგალითი (იგივე კონტექსტი, სხვადასხვა ფორმა):
- "ვინ იყო საქართველოს პირველი მეფე?"
- "რომელი იყო ქართლის პირველი მეფე?"  
- "ვინ გამეფდა საქართველოში პირველად?"

✅ სწორი მაგალითი (სხვადასხვა ფაქტები):
- "რომელ წელს დაარსდა თბილისი?"
- "რა ეწოდება უძველეს ქართულ ანბანს?"
- "რომელ მდინარეზე მდებარეობს მცხეთა?"

არ გაიმეორო:
- იგივე პიროვნება სხვადასხვა კუთხით
- იგივე მოვლენა სხვადასხვა ფორმულირებით
- იგივე თარიღი სხვადასხვა კითხვით

${topicFingerprintSection}
${exclusionSection}
${answerExclusionSection}

🚨🚨🚨 სავალდებულო სიგრძის ლიმიტები - კრიტიკულად მნიშვნელოვანი!

კითხვა: მაქსიმუმ 65 სიმბოლო (კითხვის ნიშნის ჩათვლით)
სწორი პასუხი: მაქსიმუმ 20 სიმბოლო  
არასწორი პასუხები: მაქსიმუმ 20 სიმბოლო თითოეული

⚠️ კითხვა/პასუხი რომელიც აჭარბებს ლიმიტს - უარყოფილი იქნება!
თუ ვერ ეტევა - შექმენი სხვა კითხვა!

კომპაქტური ფორმულირების მაგალითები:
❌ "რომელმა ქართველმა მეფემ ააშენა გელათის მონასტერი?" (47 სიმბოლო) - უარყოფილი
✅ "ვინ ააშენა გელათის მონასტერი?" (30 სიმბოლო) - კარგია

❌ "საქართველოს დედაქალაქი თბილისი" (32 სიმბოლო) - უარყოფილი პასუხი
✅ "თბილისი" (8 სიმბოლო) - კარგია

🚫 ANSWER LENGTH PARITY - CRITICAL ANTI-CHEATING RULE:
1. ყველა 4 პასუხი უნდა იყოს მსგავსი სიგრძის (5 სიმბოლოს ფარგლებში)
2. სწორი პასუხი არ უნდა იყოს შესამჩნევად გრძელი ან მოკლე
3. თუ სწორი პასუხი დეტალურია, არასწორებიც იყოს დეტალური
4. არასდროს გამოარჩიო სწორი პასუხი სიგრძით!

მაგალითები:
❌ ცუდი: სწორი: "პირველი მსოფლიო ომი" | არასწორი: "ომი", "ბრძოლა", "კონფლიქტი"
✅ კარგი: სწორი: "პირველი მსოფლიო ომი" | არასწორი: "მეორე მსოფლიო ომი", "კორეის ომი", "ვიეტნამის ომი"

📚 პროგრამირების კატეგორიისთვის სპეციალური წესები:
- გამოიყენე აბრევიატურები: API, HTML, CSS, SQL, IDE, Git და ა.შ.
- მოკლე ფორმები: "რა არის X?" ნაცვლად "რომელი ტექნოლოგია წარმოადგენს X-ს?"
- ერთსიტყვიანი პასუხები: "Python", "Git", "კომპილერი", "ფუნქცია"
- არასდროს გამოიყენო სრული განმარტებები პასუხად!

❌ ცუდი: "კომპილერი მთელ კოდს თარგმნის მანქანურ ენაზე" (ძალიან გრძელი)
✅ კარგი: "კომპილერი" ან "კომპილაცია"

🚨 კრიტიკულად მნიშვნელოვანი წესები:

1. ✅ კითხვის მაქსიმალური სიგრძე: 65 სიმბოლო (არა მეტი!)
2. ✅ პასუხის მაქსიმალური სიგრძე: 20 სიმბოლო (არა მეტი!)
3. ✅ ყველა კითხვა უნდა დამთავრდეს კითხვის ნიშნით (?)
4. ✅ გრამატიკულად სწორი ქართული ენა
5. ✅ მხოლოდ "${category}" თემატიკის კითხვები!
6. ✅ თითოეული კითხვა - ახალი, უნიკალური ფაქტი!

🚫 აკრძალული შეცდომები:

7. ❌ კითხვა არ უნდა შეიცავდეს სწორი პასუხის ტექსტს!
8. ❌ არ გამოიყენო ფორმატი "X-ით რა მოხდა?" სადაც X არის პასუხი
9. ❌ არ ჩასვა პასუხის სახელი კითხვაში
10. ❌ არ გაიმეორო იგივე კონტექსტი სხვადასხვა ფორმულირებით!

📝 დამატებითი ინსტრუქციები:
11. კითხვები უნდა იყოს ფაქტობრივად ზუსტი და სანდო - გამოიყენე მხოლოდ კარგად დადასტურებული, ფართოდ ცნობილი ფაქტები!
12. არასწორი პასუხები უნდა იყოს დამაჯერებელი, მაგრამ აშკარად არასწორი

🔬 ფაქტობრივი სიზუსტის წესები:
- გამოიყენე მხოლოდ ისეთი ფაქტები რომლებიც ენციკლოპედიებში და სანდო წყაროებში არის დადასტურებული
- თავი აარიდე სადავო, არადადასტურებულ ან ნაკლებად ცნობილ ფაქტებს
- თარიღები და რიცხვები უნდა იყოს ზუსტი - თუ ეჭვი გეპარება, ნუ გამოიყენებ
- არ გამოიგონო ფაქტები - მხოლოდ რეალური, დადასტურებული ინფორმაცია
13. გენერირე სრულიად განსხვავებული კითხვები ყოველ ჯერზე
14. კითხვები უნდა იყოს საინტერესო და შემეცნებითი

${iconKeywordMappings}

დააბრუნე მხოლოდ JSON მასივი:
[
  {
    "question": "კითხვა ქართულად? (მაქს 65 სიმბოლო)",
    "correct_answer": "პასუხი (მაქს 20 სიმბოლო)",
    "incorrect_answers": ["არასწორი 1", "არასწორი 2", "არასწორი 3"],
    "difficulty": "${difficultyEn}",
    "icon_keyword": "ინგლისურად keyword აიკონისთვის"
  }
]`;

    if (!AI_API_KEY) {
      throw new Error("AI_API_KEY is not configured");
    }

    // Use gemini-2.5-pro for better instruction following (especially with researched facts)
    const modelToUse = hasResearchedFacts ? "google/gemini-2.5-pro" : "google/gemini-2.5-pro";

    const response = await fetch(AI_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: modelToUse,
        messages: [{ role: "user", content: prompt }],
        temperature: hasResearchedFacts ? 0.5 : (coveredTopics.length > 0 ? 0.95 : 0.9),
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

    const rawQuestions = JSON.parse(jsonMatch[0]);

    // Step 1: Server-side STRICT validation - reject questions exceeding limits
    const validQuestions = rawQuestions.filter((q: any) => {
      const questionText = q.question || '';
      const correctAnswer = q.correct_answer || '';
      const incorrectAnswers = q.incorrect_answers || [];
      
      // Reject if question is too long
      if (questionText.length > QUESTION_MAX_LENGTH) {
        console.log(`Rejecting question (${questionText.length} chars > ${QUESTION_MAX_LENGTH}): ${questionText.substring(0, 50)}...`);
        return false;
      }
      
      // Reject if correct answer is too long
      if (correctAnswer.length > ANSWER_MAX_LENGTH) {
        console.log(`Rejecting answer (${correctAnswer.length} chars > ${ANSWER_MAX_LENGTH}): ${correctAnswer}`);
        return false;
      }
      
      // Reject if any incorrect answer is too long
      if (incorrectAnswers.length !== 3) {
        console.log(`Rejecting question: incorrect_answers count is not 3`);
        return false;
      }
      
      for (const answer of incorrectAnswers) {
        if (!answer || answer.length > ANSWER_MAX_LENGTH) {
          console.log(`Rejecting incorrect answer (${(answer || '').length} chars > ${ANSWER_MAX_LENGTH}): ${answer}`);
          return false;
        }
      }
      
      // Reject if missing required fields
      if (!questionText || !correctAnswer) {
        console.log(`Rejecting malformed question: missing required fields`);
        return false;
      }
      
      return true;
    });

    console.log(`Step 1 - Length validation: ${rawQuestions.length} -> ${validQuestions.length} questions`);

    // Step 2: Deduplicate within the generated batch
    const batchDeduped = removeDuplicatesFromBatch(validQuestions, SIMILARITY_THRESHOLD);
    console.log(`Step 2 - Batch deduplication: ${validQuestions.length} -> ${batchDeduped.length} questions`);

    // Step 3: Answer-based dedup (catches same-fact questions)
    const answerDeduped = batchDeduped.filter((q: any) => {
      const answer = (q.correct_answer || '').trim().toLowerCase();
      if (answer.length >= 3 && existingAnswers.has(answer)) {
        console.log(`Filtered same-answer duplicate: "${q.question.substring(0, 40)}..." -> answer: "${q.correct_answer}"`);
        return false;
      }
      return true;
    });
    console.log(`Step 3 - Answer dedup: ${batchDeduped.length} -> ${answerDeduped.length} questions`);

    // Step 4: Filter against existing database questions using text similarity
    const uniqueQuestions = answerDeduped.filter((q: any) => {
      const isSimilar = isSimilarToExisting(q.question, existingTexts, SIMILARITY_THRESHOLD);
      if (isSimilar) {
        console.log(`Filtered text duplicate: "${q.question.substring(0, 50)}..."`);
      }
      return !isSimilar;
    });

    console.log(`Step 4 - Text dedup: ${answerDeduped.length} -> ${uniqueQuestions.length} questions`);

    // Step 5: Georgian Grammar Verification
    console.log("Step 5 - Verifying Georgian grammar...");
    
    const grammarVerifiedQuestions = await Promise.all(
      uniqueQuestions.map(async (q: any) => {
        try {
          const textsToVerify = [
            q.question,
            q.correct_answer,
            ...(q.incorrect_answers || [])
          ];
          
          const grammarResponse = await fetch(`${supabaseUrl}/functions/v1/verify-georgian-grammar`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({ texts: textsToVerify }),
          });

          if (grammarResponse.ok) {
            const grammarResult = await grammarResponse.json();
            if (grammarResult.results && grammarResult.results.length > 0) {
              // Apply corrections
              if (grammarResult.results[0]?.corrected) {
                q.question = grammarResult.results[0].corrected;
              }
              if (grammarResult.results[1]?.corrected) {
                q.correct_answer = grammarResult.results[1].corrected;
              }
              for (let i = 0; i < (q.incorrect_answers || []).length; i++) {
                if (grammarResult.results[i + 2]?.corrected) {
                  q.incorrect_answers[i] = grammarResult.results[i + 2].corrected;
                }
              }
              if (grammarResult.totalErrors > 0) {
                console.log(`Grammar fixed for: "${q.question.substring(0, 30)}..."`);
              }
            }
          }
        } catch (grammarError) {
          console.error("Grammar verification failed (non-blocking):", grammarError);
        }
        return q;
      })
    );

    // Step 6: FACT CHECK (strict) - reject questions with wrong correct answers / unreliable facts
    console.log("Step 6 - Fact-checking questions...");
    const { results: fcResults } = await factCheckQuestions({
      req,
      items: grammarVerifiedQuestions.map((q: any) => ({
        question_text: q.question,
        correct_answer: q.correct_answer,
        incorrect_answers: q.incorrect_answers || [],
      })),
      context: {
        language: "ka",
        mode: "multiple_choice",
        topicHint: topic || focusArea,
        categoryHint: category,
      },
      minConfidence: 0.95,
    });

    const fcByIndex = new Map(fcResults.map((r) => [r.index, r]));
    const factChecked = grammarVerifiedQuestions.filter((_: any, idx: number) => fcByIndex.get(idx)?.pass);
    console.log(`Step 5 - Fact-check: ${grammarVerifiedQuestions.length} -> ${factChecked.length} passed`);

    console.log(`Final: Generated ${rawQuestions.length} raw, ${factChecked.length} passed fact-check for ${category}`);

    return new Response(
      JSON.stringify({ questions: factChecked }),
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
