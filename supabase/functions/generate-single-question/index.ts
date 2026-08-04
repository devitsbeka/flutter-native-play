import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { factCheckQuestions } from "../_shared/factCheck.ts";
import { AI_CHAT_URL, AI_API_KEY, aiModel } from "../_shared/ai.ts";

// App-wide character limits - strict for gameplay display
const QUESTION_MAX_LENGTH = 70;
const ANSWER_MAX_LENGTH = 35;

// Fisher-Yates shuffle for randomizing answer positions
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

interface GeneratedQuestion {
  question_text: string;
  correct_answer: string;
  incorrect_answers: string[];
  difficulty?: string;
  icon_keywords?: string[];
}

// STRICT validation
function isValidQuestion(q: GeneratedQuestion, isTrueFalse: boolean = false): boolean {
  if (!q.question_text || !q.correct_answer || !Array.isArray(q.incorrect_answers)) {
    return false;
  }
  if (q.question_text.length > QUESTION_MAX_LENGTH) {
    console.log(`Rejecting question (${q.question_text.length} chars > ${QUESTION_MAX_LENGTH}): ${q.question_text.substring(0, 50)}...`);
    return false;
  }
  if (q.correct_answer.length > ANSWER_MAX_LENGTH) {
    console.log(`Rejecting answer (${q.correct_answer.length} chars > ${ANSWER_MAX_LENGTH}): ${q.correct_answer}`);
    return false;
  }
  
  const expectedIncorrectCount = isTrueFalse ? 1 : 3;
  if (q.incorrect_answers.length !== expectedIncorrectCount) {
    console.log(`Rejecting question: expected ${expectedIncorrectCount} incorrect answers, got ${q.incorrect_answers.length}`);
    return false;
  }
  
  for (const answer of q.incorrect_answers) {
    if (!answer || answer.length > ANSWER_MAX_LENGTH) {
      console.log(`Rejecting incorrect answer (${(answer || '').length} chars > ${ANSWER_MAX_LENGTH}): ${answer}`);
      return false;
    }
  }
  return true;
}

// Build system prompt for TRIVIA mode (factual questions about topics)
function buildTriviaPrompt(subject: string, difficulty: string, isTrueFalse: boolean): string {
  return `You are an expert trivia question generator for a Georgian quiz app.

🎯 TOPIC: "${subject}"

GENERATE: Factual trivia questions with FACTUAL answers about the topic.

📚 QUESTION STYLES FOR TRIVIA:
1. "რომელმა..." (Which one...)
2. "რა წელს..." (In what year...)
3. "ვინ არის/იყო..." (Who is/was...)
4. "რომელი ქვეყანა..." (Which country...)
5. "რა არის..." (What is...)
6. "სად მდებარეობს..." (Where is located...)

💡 EXAMPLES for trivia topics:
- Topic: "ჩემპიონთა ლიგა" → "ვინ მოიგო ჩემპიონთა ლიგა 2022-ში?" with answers: "რეალ მადრიდი", "მანჩ. სითი", "ლივერპული", "ბაიერნი"
- Topic: "გეოგრაფია" → "რომელი ქვეყნის დედაქალაქია პარიზი?" with answers: "საფრანგეთი", "გერმანია", "იტალია", "ესპანეთი"
- Topic: "ისტორია" → "რა წელს დასრულდა მეორე მსოფლიო ომი?" with answers: "1945", "1944", "1946", "1943"

❌ DO NOT generate personal/family questions like "ვინ არის ყველაზე დრამატული?" or answers like "მამა", "დედა", "ბებია"

⚠️ GRAMMAR RULES - CRITICAL:
- All Georgian text MUST be grammatically correct
- Double-check spelling of all Georgian words
- Use proper Georgian verb conjugations
- Questions must be natural-sounding Georgian sentences

⚠️ LENGTH RULES - VERY STRICT:
- Question: MAX ${QUESTION_MAX_LENGTH} chars (VERY SHORT! Be concise!)
- Answer: MAX ${ANSWER_MAX_LENGTH} chars
- Example good length: "ვინ მოიგო ჩემპიონთა ლიგა 2022-ში?" = 36 chars ✓
- If question is too long, REWRITE it shorter!

LANGUAGE: Georgian only - MUST BE GRAMMATICALLY PERFECT

${isTrueFalse ? `TRUE/FALSE FORMAT - CRITICAL RULES:
- RANDOMLY choose to generate either a TRUE statement or a FALSE statement
- For TRUE statements: write a factually CORRECT statement, correctAnswer = "მართალია"
- For FALSE statements: write a factually INCORRECT/WRONG statement, correctAnswer = "მცდარია"  
- incorrectAnswers is always the OPPOSITE: ["მცდარია"] for true statements, ["მართალია"] for false statements
- FALSE statements should be believable but clearly wrong when you know the facts

EXAMPLES:
✓ TRUE: "საქართველოს დედაქალაქია თბილისი." → correct_answer: "მართალია", incorrect_answers: ["მცდარია"]
✓ FALSE: "საქართველოს დედაქალაქია ბათუმი." → correct_answer: "მცდარია", incorrect_answers: ["მართალია"]
✓ TRUE: "მზის სისტემაში 8 პლანეტაა." → correct_answer: "მართალია", incorrect_answers: ["მცდარია"]
✓ FALSE: "მზის სისტემაში 12 პლანეტაა." → correct_answer: "მცდარია", incorrect_answers: ["მართალია"]` : `4 MULTIPLE CHOICE answers - 1 correct and 3 incorrect`}

JSON FORMAT:
{
  "question_text": "...",
  "correct_answer": "${isTrueFalse ? 'მართალია ან მცდარია' : '...'}",
  "incorrect_answers": ${isTrueFalse ? '["მცდარია ან მართალია"]' : '["...", "...", "..."]'},
  "difficulty": "${difficulty}",
  "icon_keywords": ["relevant", "topic", "keywords"]
}`;
}

// Theme-to-icon mapping for personal questions
const PERSONAL_THEME_ICONS: Record<string, string[]> = {
  // Sleeping/habits
  'ძილი': ['sleeping', 'bed', 'pillow', 'moon', 'owl', 'alarm-clock', 'dream', 'night'],
  'ხვრინავს': ['sleeping', 'bed', 'moon', 'snoring', 'pillow'],
  'იძინებს': ['sleeping', 'bed', 'moon', 'owl', 'night', 'stars'],
  'ძილმოყვარე': ['sloth', 'sleeping', 'bed', 'couch', 'lazy'],
  
  // Time related
  'დააგვიანებს': ['clock', 'alarm', 'running', 'hourglass', 'watch', 'time'],
  'დრო': ['clock', 'watch', 'hourglass', 'time', 'calendar'],
  'წუთი': ['clock', 'stopwatch', 'timer', 'hourglass'],
  
  // Food related
  'მაცივარი': ['refrigerator', 'kitchen', 'food', 'midnight', 'snack'],
  'ხაჭაპური': ['cheese', 'bread', 'food', 'fork', 'plate', 'restaurant'],
  'საჭმელი': ['fork', 'plate', 'chef', 'cooking', 'spoon', 'restaurant'],
  'ჭამა': ['fork', 'plate', 'food', 'eating', 'restaurant'],
  
  // Phone/social
  'ტელეფონი': ['smartphone', 'phone', 'call', 'chat', 'mobile', 'notification'],
  'მესიჯი': ['message', 'chat', 'envelope', 'notification', 'speech-bubble'],
  'ზარი': ['phone', 'call', 'ring', 'mobile'],
  
  // Forgetfulness
  'დაივიწყება': ['question-mark', 'brain', 'keys', 'wallet', 'confused', 'thinking'],
  'საფულე': ['wallet', 'money', 'bag', 'lost'],
  'გასაღები': ['key', 'keys', 'lock', 'door'],
  
  // Personality traits
  'დრამატული': ['theater', 'drama', 'mask', 'stage', 'spotlight', 'star'],
  'მომთმენი': ['meditation', 'calm', 'peace', 'zen', 'patience'],
  'ტირილი': ['tear', 'cry', 'emotion', 'heart', 'movie'],
  'სიცილი': ['laugh', 'smile', 'happy', 'comedy', 'joy'],
  'ბრაზი': ['angry', 'storm', 'fire', 'explosion'],
  
  // Entertainment
  'სერიალი': ['tv', 'movie', 'popcorn', 'couch', 'remote'],
  'ფილმი': ['movie', 'film', 'camera', 'cinema', 'popcorn'],
  'მუსიკა': ['music', 'headphones', 'guitar', 'piano', 'notes'],
  
  // Phrases
  'ფრაზა': ['speech-bubble', 'quote', 'talk', 'chat', 'speaking'],
  'ხუმრობა': ['laugh', 'comedy', 'smile', 'joke', 'fun'],
};

// Build system prompt for PERSONAL mode (family/friends questions)
function buildPersonalPrompt(subject: string, difficulty: string, isTrueFalse: boolean, focusCategory: { theme: string; examples: string[] }): string {
  return `You are a CREATIVE party game question generator for friends & family. Your goal is to create FUN, PERSONAL questions that spark laughter and memories.

🎲 FOCUS THEME FOR THIS QUESTION: "${focusCategory.theme}"
Examples for this theme:
${focusCategory.examples.map(e => `- ${e}`).join('\n')}

🎯 QUESTION STYLES TO USE:
1. "ვინ არის ყველაზე..." (Who is the most...)
2. "ვის უყვარს..." (Who loves...)
3. "ვინ გააკეთებდა..." (Who would do...)
4. "ვინ იტყოდა..." (Who would say...)
5. "ვინ დაივიწყებდა..." (Who would forget...)
6. "ვისთვის არის ტიპიური..." (What's typical for...)

💡 BE CREATIVE! Think about:
- Funny habits people have
- Embarrassing moments
- Personality quirks
- Daily life situations
- Family inside jokes

❌ AVOID:
- Educational/trivia facts
- Celebrity questions
- General knowledge

💡 ANSWERS should be person types:
"დედა", "მამა", "ბებია", "საუკეთესო მეგობარი", "მე თვითონ", "ყველა ერთად", "უმცროსი და/ძმა", "უფროსი და/ძმა"

⚠️ GRAMMAR RULES - CRITICAL:
- All Georgian text MUST be grammatically correct
- Double-check spelling of all Georgian words
- Use proper Georgian verb conjugations (ვინ არის, ვინ იქნებოდა, ვინ გააკეთებდა)
- Questions must be natural-sounding Georgian sentences
- Common correct patterns:
  • "ვინ არის ყველაზე..." + adjective
  • "ვის უყვარს..." + noun
  • "ვინ გააკეთებდა..." + action
  • "ვინ დაივიწყებდა..." + noun
- Before outputting, VERIFY:
  1. All words are spelled correctly
  2. Verb forms match the subject
  3. Case endings are correct
  4. The sentence sounds natural to a Georgian speaker

💎 ICON_KEYWORDS - CRITICAL FOR VARIETY:
- Generate 3-5 UNIQUE visual keywords based on THIS specific question's theme
- DO NOT use generic words like "family" or "friends"
- Think about VISUAL OBJECTS that represent the question's concept
- Use ENGLISH keywords for icon matching

EXAMPLES OF GOOD ICON_KEYWORDS:
- "ვინ ხვრინავს ძილში?" → ["sleeping", "bed", "moon", "pillow", "snoring"]
- "ვის უყვარს ხაჭაპური?" → ["cheese", "bread", "food", "fork", "plate"]
- "ვინ დააგვიანებდა?" → ["clock", "alarm", "running", "watch", "time"]
- "ვინ არის ყველაზე დრამატული?" → ["theater", "drama", "mask", "stage", "star"]
- "ვინ იძინებს ყველაზე გვიან?" → ["owl", "night", "moon", "stars", "lamp"]
- "ვის ტელეფონი მუდამ დამჯდარია?" → ["phone", "battery", "charging", "smartphone"]
- "ვინ მიაკითხავდა მაცივარს შუაღამეს?" → ["refrigerator", "midnight", "food", "snack", "kitchen"]

⚠️ LENGTH RULES - VERY STRICT:
- Question: MAX ${QUESTION_MAX_LENGTH} chars (VERY SHORT! Be concise!)
- Answer: MAX ${ANSWER_MAX_LENGTH} chars  
- Example: "ვინ არის ყველაზე დრამატული?" = 28 chars ✓
- If question is too long, REWRITE it shorter!

LANGUAGE: Georgian only - MUST BE GRAMMATICALLY PERFECT

${isTrueFalse ? `TRUE/FALSE format` : `4 MULTIPLE CHOICE answers`}

JSON FORMAT:
{
  "question_text": "...",
  "correct_answer": "...",
  "incorrect_answers": ["...", "...", "..."],
  "difficulty": "${difficulty}",
  "icon_keywords": ["specific", "visual", "keywords", "for", "this_question"]
}`;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      subject, 
      answerFormat = "4_answers", 
      difficulty = "medium", 
      existingQuestions = [], 
      randomSeed = "",
      mode = "personal" // NEW: "trivia" or "personal"
    } = await req.json();

    if (!subject) {
      return new Response(
        JSON.stringify({ error: "Subject is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!AI_API_KEY) {
      throw new Error("AI_API_KEY is not configured");
    }

    const isTrueFalse = answerFormat === "true_false";
    
    // Personal question categories to rotate through for variety (only used in personal mode)
    const personalCategories = [
      { theme: "ნიშან-თვისებები და ხასიათი", examples: ["ვინ არის ყველაზე დრამატული?", "ვინ არის ყველაზე მომთმენი?", "ვინ ატირდებოდა ფილმზე?"] },
      { theme: "ჩვევები და მანერები", examples: ["ვინ ხვრინავს ძილში?", "ვინ ლაპარაკობს ძილში?", "ვინ თითს წყალში არ ჩაუშვებს?"] },
      { theme: "კულინარია და საჭმელი", examples: ["ვინ მიაკითხავდა მაცივარს შუაღამეს?", "ვის უყვარს ყველაზე მეტად ხაჭაპური?", "ვინ ჭამს ყველაზე ნელა?"] },
      { theme: "ტელეფონი და სოციალური", examples: ["ვის ტელეფონი მუდამ დამჯდარია?", "ვინ გამოაგზავნის ხმოვან მესიჯებს?", "ვინ არ პასუხობს ზარებს?"] },
      { theme: "დაგვიანება და დრო", examples: ["ვინ დააგვიანებდა შეხვედრაზე?", "ვინ მოვიდოდა პირველი?", "ვინ იტყოდა '5 წუთში ვიქნები'?"] },
      { theme: "დავიწყება და შეცდომები", examples: ["ვინ დაივიწყებდა საფულეს სახლში?", "ვინ დაივიწყებდა დაბადების დღეს?", "ვინ დაკარგავდა გასაღებებს?"] },
      { theme: "საყვარელი საქმიანობები", examples: ["ვინ უყურებს ყველაზე მეტ სერიალს?", "ვინ იძინებს ყველაზე გვიან?", "ვინ არის ყველაზე ძილმოყვარე?"] },
      { theme: "ფრაზები და გამონათქვამები", examples: ["ვინ იტყოდა: 'ერთი წუთით'?", "ვინ იტყოდა: 'მე ვიცოდი'?", "ვინ გაიმეორებდა ერთ ხუმრობას?"] },
    ];
    
    // Pick random category based on seed for variety
    const seedNum = randomSeed ? parseInt(randomSeed, 36) : Math.floor(Math.random() * 1000000);
    const categoryIndex = Math.abs(seedNum) % personalCategories.length;
    const focusCategory = personalCategories[categoryIndex];
    
    // Build existing questions context to avoid duplicates
    const existingContext = existingQuestions.length > 0 
      ? `\n\n🚫 QUESTIONS TO AVOID (generate something COMPLETELY DIFFERENT):\n${existingQuestions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')}`
      : '';

    // Choose prompt based on mode
    let systemPrompt: string;
    if (mode === "trivia") {
      systemPrompt = buildTriviaPrompt(subject, difficulty, isTrueFalse);
      console.log(`Generating TRIVIA question about: ${subject}`);
    } else {
      systemPrompt = buildPersonalPrompt(subject, difficulty, isTrueFalse, focusCategory);
      console.log(`Generating PERSONAL question with focus category: ${focusCategory.theme}, seed: ${randomSeed}`);
    }

    // For True/False, randomly decide if we want a true or false statement
    const generateTrueStatement = Math.random() > 0.5;
    const trueFalseInstruction = isTrueFalse 
      ? `\n\n🎲 FOR THIS QUESTION: Generate a ${generateTrueStatement ? 'TRUE (მართალია)' : 'FALSE (მცდარია)'} statement.
${generateTrueStatement 
  ? '- Write a factually CORRECT statement. correct_answer = "მართალია", incorrect_answers = ["მცდარია"]'
  : '- Write a factually INCORRECT statement. correct_answer = "მცდარია", incorrect_answers = ["მართალია"]'}`
      : '';

    const userPrompt = mode === "trivia"
      ? `🎯 Generate 1 UNIQUE, FACTUAL trivia question about: "${subject}"
${existingContext}${trueFalseInstruction}

⚡ IMPORTANT: 
- Generate factual questions with REAL answers about the topic
- DO NOT generate personal/family questions
- Answers should be facts, names, places, dates, etc. - NOT person types like "მამა", "დედა"
- VERIFY Georgian grammar and spelling before responding
Return ONLY valid JSON.`
      : `🎲 Generate 1 UNIQUE, FUN question about: "${subject}"
Focus on theme: ${focusCategory.theme}
${existingContext}${trueFalseInstruction}

⚡ IMPORTANT: 
- Generate something COMPLETELY NEW and DIFFERENT!
- Be creative - think of funny, nostalgic, or slightly embarrassing situations.
- VERIFY Georgian grammar and spelling before responding
- The question MUST be grammatically perfect in Georgian
Return ONLY valid JSON.`;

    console.log(`Mode: ${mode}, Subject: ${subject}, Format: ${answerFormat}`);

    const response = await fetch(AI_CHAT_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiModel("google/gemini-2.5-flash"),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", errorText);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "სისტემა დატვირთულია. სცადეთ მოგვიანებით." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in response");
    }

    let questionData: GeneratedQuestion;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      questionData = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error("Failed to parse question data:", content);
      throw new Error("Failed to parse generated question");
    }

    // Validate the question
    if (!isValidQuestion(questionData, isTrueFalse)) {
      throw new Error("Generated question did not meet requirements");
    }

    // Assign icon from icon_library
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Georgian Grammar Verification
    console.log("Verifying Georgian grammar...");
    try {
      const textsToVerify = [
        questionData.question_text,
        questionData.correct_answer,
        ...questionData.incorrect_answers
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
            questionData.question_text = grammarResult.results[0].corrected;
          }
          if (grammarResult.results[1]?.corrected) {
            questionData.correct_answer = grammarResult.results[1].corrected;
          }
          for (let i = 0; i < questionData.incorrect_answers.length; i++) {
            if (grammarResult.results[i + 2]?.corrected) {
              questionData.incorrect_answers[i] = grammarResult.results[i + 2].corrected;
            }
          }
          if (grammarResult.totalErrors > 0) {
            console.log(`Grammar: Fixed ${grammarResult.totalErrors} errors`);
          }
        }
      }
    } catch (grammarError) {
      console.error("Grammar verification failed (non-blocking):", grammarError);
    }

    // STRICT Fact-check for trivia mode only (personal mode is subjective by design)
    if (mode === "trivia") {
      console.log("Fact-checking trivia question...");
      const { results: fcResults } = await factCheckQuestions({
        req,
        items: [
          {
            question_text: questionData.question_text,
            correct_answer: questionData.correct_answer,
            incorrect_answers: questionData.incorrect_answers || [],
          },
        ],
        context: {
          language: "ka",
          mode: isTrueFalse ? "true_false" : "multiple_choice",
          topicHint: subject,
        },
      });

      if (!fcResults[0]?.pass) {
        console.warn("Fact-check failed for trivia question", fcResults[0]);
        return new Response(
          JSON.stringify({
            error: "AI-მა დააგენერა არაზუსტი კითხვა/პასუხი და გაიფილტრა. სცადეთ თავიდან.",
          }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    let iconSlug: string | null = null;

    if (questionData.icon_keywords?.length) {
      const keywords = questionData.icon_keywords.map((k: string) => k.toLowerCase());
      console.log(`Icon search with keywords: ${keywords.join(', ')}`);
      
      // Tier 1: Try exact slug match with randomization
      const { data: exactMatches } = await supabase
        .from('icon_library')
        .select('slug')
        .in('slug', keywords)
        .limit(5);

      if (exactMatches && exactMatches.length > 0) {
        // Pick random from matches for variety
        iconSlug = exactMatches[Math.floor(Math.random() * exactMatches.length)].slug;
        console.log(`Tier 1 (exact match): Found ${exactMatches.length} icons, picked: ${iconSlug}`);
      }
      
      // Tier 2: Slug contains keyword (ilike search)
      if (!iconSlug) {
        for (const keyword of keywords) {
          if (keyword.length >= 3) {
            const { data: partialMatches } = await supabase
              .from('icon_library')
              .select('slug')
              .ilike('slug', `%${keyword}%`)
              .limit(8);
            
            if (partialMatches && partialMatches.length > 0) {
              // Pick random from matches for variety
              iconSlug = partialMatches[Math.floor(Math.random() * partialMatches.length)].slug;
              console.log(`Tier 2 (partial match for '${keyword}'): Found ${partialMatches.length} icons, picked: ${iconSlug}`);
              break;
            }
          }
        }
      }

      // Tier 3: Tag-based search with randomization
      if (!iconSlug) {
        for (const keyword of keywords) {
          const { data: tagMatches } = await supabase
            .from('icon_library')
            .select('slug')
            .contains('tags', [keyword])
            .limit(10);

          if (tagMatches && tagMatches.length > 0) {
            // Pick random from matches for variety
            iconSlug = tagMatches[Math.floor(Math.random() * tagMatches.length)].slug;
            console.log(`Tier 3 (tag match for '${keyword}'): Found ${tagMatches.length} icons, picked: ${iconSlug}`);
            break;
          }
        }
      }
      
      // Tier 4: Use theme mapping fallback for personal questions
      if (!iconSlug && mode === "personal") {
        // Check question text for Georgian theme keywords
        const questionLower = questionData.question_text.toLowerCase();
        
        for (const [theme, iconOptions] of Object.entries(PERSONAL_THEME_ICONS)) {
          if (questionLower.includes(theme.toLowerCase())) {
            // Try to find one of the theme icons
            const shuffledOptions = shuffleArray(iconOptions);
            for (const iconOption of shuffledOptions) {
              const { data: themeMatch } = await supabase
                .from('icon_library')
                .select('slug')
                .ilike('slug', `%${iconOption}%`)
                .limit(3);
              
              if (themeMatch && themeMatch.length > 0) {
                iconSlug = themeMatch[Math.floor(Math.random() * themeMatch.length)].slug;
                console.log(`Tier 4 (theme '${theme}' -> '${iconOption}'): Found ${themeMatch.length} icons, picked: ${iconSlug}`);
                break;
              }
            }
            if (iconSlug) break;
          }
        }
      }
      
      if (!iconSlug) {
        console.log('No icon found for keywords, will use category fallback');
      }
    }

    // Shuffle incorrect_answers to prevent AI patterns
    const shuffledIncorrect = shuffleArray(questionData.incorrect_answers || []);
    
    const result = {
      question_text: questionData.question_text,
      correct_answer: questionData.correct_answer,
      incorrect_answers: shuffledIncorrect,
      difficulty: questionData.difficulty || difficulty,
      icon_slug: iconSlug,
    };

    console.log(`Successfully generated ${mode} question with icon: ${iconSlug}`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error generating question:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate question";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
