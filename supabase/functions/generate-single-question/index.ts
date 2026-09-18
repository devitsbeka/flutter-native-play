import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { factCheckQuestions } from "../_shared/factCheck.ts";
import { AI_CHAT_URL, AI_API_KEY, aiModel } from "../_shared/ai.ts";
import {
  CONTENT_SAFETY_PROMPT,
  containsBlockedText,
  firstBlockedText,
} from "../_shared/contentFilter.ts";
import {
  grammarRules,
  knownLanguage,
  languageName,
  trueFalseWords,
  writeInLanguage,
} from "../_shared/questionLanguage.ts";

// App-wide character limits - strict for gameplay display
const QUESTION_MAX_LENGTH = 70;
const ANSWER_MAX_LENGTH = 35;

/**
 * How a question may open, as a shape rather than as text.
 *
 * Georgian keeps the patterns it was tuned with. Every other language gets
 * the same six shapes in English, with the instruction above them that the
 * OUTPUT is not English — a model writes "¿Qué año…" perfectly well from
 * "In what year…", and one list per language would be six lists to keep
 * right.
 */
function triviaStyles(lang: string): string {
  if (lang === "ka") {
    return `1. "რომელმა..." (Which one...)
2. "რა წელს..." (In what year...)
3. "ვინ არის/იყო..." (Who is/was...)
4. "რომელი ქვეყანა..." (Which country...)
5. "რა არის..." (What is...)
6. "სად მდებარეობს..." (Where is located...)`;
  }
  return `1. "Which one..."
2. "In what year..."
3. "Who is/was..."
4. "Which country..."
5. "What is..."
6. "Where is located..."`;
}

function personalStyles(lang: string): string {
  if (lang === "ka") {
    return `1. "ვინ არის ყველაზე..." (Who is the most...)
2. "ვის უყვარს..." (Who loves...)
3. "ვინ გააკეთებდა..." (Who would do...)
4. "ვინ იტყოდა..." (Who would say...)
5. "ვინ დაივიწყებდა..." (Who would forget...)
6. "ვისთვის არის ტიპიური..." (What's typical for...)`;
  }
  return `1. "Who is the most..."
2. "Who loves..."
3. "Who would do..."
4. "Who would say..."
5. "Who would forget..."
6. "What's typical for..."`;
}

/** The people a party answer names. */
function personTypes(lang: string): string {
  if (lang === "ka") {
    return `"დედა", "მამა", "ბებია", "საუკეთესო მეგობარი", "მე თვითონ", "ყველა ერთად", "უმცროსი და/ძმა", "უფროსი და/ძმა"`;
  }
  return `mum, dad, grandma, best friend, me, everyone, little brother/sister, big brother/sister — written in ${languageName(lang)}`;
}

/** Grammar rules worth naming. Georgian's are the ones that went wrong. */
// Build system prompt for TRIVIA mode (factual questions about topics)
function buildTriviaPrompt(subject: string, difficulty: string, isTrueFalse: boolean, lang: string): string {
  const name = languageName(lang);
  const tf = trueFalseWords(lang);
  return `You are an expert trivia question generator for a quiz app.

${writeInLanguage(lang, `The question, the correct answer and every incorrect answer are read by a player whose app is in ${name}, and a question in any other language is unusable to them.`)}

${CONTENT_SAFETY_PROMPT}

🎯 TOPIC: "${subject}"

GENERATE: Factual trivia questions with FACTUAL answers about the topic.

📚 QUESTION STYLES FOR TRIVIA:
${triviaStyles(lang)}

💡 EXAMPLES for trivia topics:
- Topic: "ჩემპიონთა ლიგა" → "ვინ მოიგო ჩემპიონთა ლიგა 2022-ში?" with answers: "რეალ მადრიდი", "მანჩ. სითი", "ლივერპული", "ბაიერნი"
- Topic: "გეოგრაფია" → "რომელი ქვეყნის დედაქალაქია პარიზი?" with answers: "საფრანგეთი", "გერმანია", "იტალია", "ესპანეთი"
- Topic: "ისტორია" → "რა წელს დასრულდა მეორე მსოფლიო ომი?" with answers: "1945", "1944", "1946", "1943"

❌ DO NOT generate personal/family questions like "ვინ არის ყველაზე დრამატული?" or answers like "მამა", "დედა", "ბებია"

⚠️ GRAMMAR RULES - CRITICAL:
${grammarRules(lang)}

⚠️ LENGTH RULES - VERY STRICT:
- Question: MAX ${QUESTION_MAX_LENGTH} chars (VERY SHORT! Be concise!)
- Answer: MAX ${ANSWER_MAX_LENGTH} chars
- Example good length: "ვინ მოიგო ჩემპიონთა ლიგა 2022-ში?" = 36 chars ✓
- If question is too long, REWRITE it shorter!

LANGUAGE: ${name} only - MUST BE GRAMMATICALLY PERFECT

${isTrueFalse ? `TRUE/FALSE FORMAT - CRITICAL RULES:
- RANDOMLY choose to generate either a TRUE statement or a FALSE statement
- The two answer words are FIXED: "${tf.yes}" and "${tf.no}". Use them exactly,
  whatever language the statement itself is in — every screen that draws a
  true/false card matches on these two words.
- For TRUE statements: write a factually CORRECT statement, correctAnswer = "${tf.yes}"
- For FALSE statements: write a factually INCORRECT/WRONG statement, correctAnswer = "${tf.no}"
- incorrectAnswers is always the OPPOSITE: ["${tf.no}"] for true statements, ["${tf.yes}"] for false statements
- FALSE statements should be believable but clearly wrong when you know the facts

EXAMPLES (shape only — write yours in ${name}):
✓ TRUE: "The capital of Georgia is Tbilisi." → correct_answer: "${tf.yes}", incorrect_answers: ["${tf.no}"]
✓ FALSE: "The capital of Georgia is Batumi." → correct_answer: "${tf.no}", incorrect_answers: ["${tf.yes}"]
✓ TRUE: "The solar system has 8 planets." → correct_answer: "${tf.yes}", incorrect_answers: ["${tf.no}"]
✓ FALSE: "The solar system has 12 planets." → correct_answer: "${tf.no}", incorrect_answers: ["${tf.yes}"]` : `4 MULTIPLE CHOICE answers - 1 correct and 3 incorrect`}

JSON FORMAT:
{
  "question_text": "...",
  "correct_answer": "${isTrueFalse ? `${tf.yes} or ${tf.no}` : '...'}",
  "incorrect_answers": ${isTrueFalse ? `["${tf.no} or ${tf.yes}"]` : '["...", "...", "..."]'},
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
function buildPersonalPrompt(subject: string, difficulty: string, isTrueFalse: boolean, focusCategory: { theme: string; examples: string[] }, lang: string): string {
  const name = languageName(lang);
  return `You are a CREATIVE party game question generator for friends & family. Your goal is to create FUN, PERSONAL questions that spark laughter and memories.

${writeInLanguage(lang, `The question and all four answers are read out at a table where the app is in ${name}.`)}

${CONTENT_SAFETY_PROMPT}

⚠️ THIS MODE IN PARTICULAR: the questions below are ABOUT REAL PEOPLE sitting
in the room — somebody's mother, somebody's little brother. "Embarrassing" here
means a burnt cake or a late arrival, never anything about a person's body,
sex life, weight, appearance, intelligence or mental health, and never
anything a person would be humiliated to have read out loud about them. If a
funny question would only be funny at someone's expense, write a different one.

🎲 FOCUS THEME FOR THIS QUESTION: "${focusCategory.theme}"
Examples for this theme:
${focusCategory.examples.map(e => `- ${e}`).join('\n')}

🎯 QUESTION STYLES TO USE:
${personalStyles(lang)}

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
${personTypes(lang)}

⚠️ GRAMMAR RULES - CRITICAL:
${grammarRules(lang)}
- Before outputting, VERIFY:
  1. All words are spelled correctly
  2. Verb forms match the subject
  3. The sentence sounds natural to a native ${name} speaker

💎 ICON_KEYWORDS - CRITICAL FOR VARIETY:
- Generate 3-5 UNIQUE visual keywords based on THIS specific question's theme
- DO NOT use generic words like "family" or "friends"
- Think about VISUAL OBJECTS that represent the question's concept
- Use ENGLISH keywords for icon matching

EXAMPLES OF GOOD ICON_KEYWORDS (the questions are examples of shape, not of language):
- "ვინ ხვრინავს ძილში?" (who snores?) → ["sleeping", "bed", "moon", "pillow", "snoring"]
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

LANGUAGE: ${name} only - MUST BE GRAMMATICALLY PERFECT

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
      mode = "personal", // NEW: "trivia" or "personal"
      language: requestedLanguage,
    } = await req.json();

    // The player's own language. Absent (an old client) means Georgian, which
    // is what every caller got before this parameter existed.
    const lang = knownLanguage(requestedLanguage);

    if (!subject) {
      return new Response(
        JSON.stringify({ error: "Subject is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Free text from any signed-in player, handed straight to a model. The
    // client screens it too; the client is not the thing an attacker runs.
    if (containsBlockedText(String(subject))) {
      console.warn("Refusing generation for blocked subject");
      return new Response(
        JSON.stringify({ error: "ეს თემა არ არის დაშვებული. სცადეთ სხვა თემა.", refused: true }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!AI_API_KEY) {
      throw new Error("AI_API_KEY is not configured");
    }

    const isTrueFalse = answerFormat === "true_false";
    
    // Personal question categories to rotate through for variety (only used
    // in personal mode). The Georgian set is the one these were tuned with;
    // every other language gets the same eight themes in English, and the
    // prompt says in capitals that the OUTPUT is not English. Eight themes in
    // seven languages would be seven lists to keep in step, and a theme is
    // only ever read by the model.
    const personalCategories = lang === "ka" ? [
      { theme: "ნიშან-თვისებები და ხასიათი", examples: ["ვინ არის ყველაზე დრამატული?", "ვინ არის ყველაზე მომთმენი?", "ვინ ატირდებოდა ფილმზე?"] },
      { theme: "ჩვევები და მანერები", examples: ["ვინ ხვრინავს ძილში?", "ვინ ლაპარაკობს ძილში?", "ვინ თითს წყალში არ ჩაუშვებს?"] },
      { theme: "კულინარია და საჭმელი", examples: ["ვინ მიაკითხავდა მაცივარს შუაღამეს?", "ვის უყვარს ყველაზე მეტად ხაჭაპური?", "ვინ ჭამს ყველაზე ნელა?"] },
      { theme: "ტელეფონი და სოციალური", examples: ["ვის ტელეფონი მუდამ დამჯდარია?", "ვინ გამოაგზავნის ხმოვან მესიჯებს?", "ვინ არ პასუხობს ზარებს?"] },
      { theme: "დაგვიანება და დრო", examples: ["ვინ დააგვიანებდა შეხვედრაზე?", "ვინ მოვიდოდა პირველი?", "ვინ იტყოდა '5 წუთში ვიქნები'?"] },
      { theme: "დავიწყება და შეცდომები", examples: ["ვინ დაივიწყებდა საფულეს სახლში?", "ვინ დაივიწყებდა დაბადების დღეს?", "ვინ დაკარგავდა გასაღებებს?"] },
      { theme: "საყვარელი საქმიანობები", examples: ["ვინ უყურებს ყველაზე მეტ სერიალს?", "ვინ იძინებს ყველაზე გვიან?", "ვინ არის ყველაზე ძილმოყვარე?"] },
      { theme: "ფრაზები და გამონათქვამები", examples: ["ვინ იტყოდა: 'ერთი წუთით'?", "ვინ იტყოდა: 'მე ვიცოდი'?", "ვინ გაიმეორებდა ერთ ხუმრობას?"] },
    ] : [
      { theme: "personality and character", examples: ["Who is the most dramatic?", "Who is the most patient?", "Who would cry at a film?"] },
      { theme: "habits and quirks", examples: ["Who snores in their sleep?", "Who talks in their sleep?", "Who never touches cold water?"] },
      { theme: "cooking and food", examples: ["Who raids the fridge at midnight?", "Who loves pizza the most?", "Who eats the slowest?"] },
      { theme: "phones and social media", examples: ["Whose phone is always dead?", "Who sends voice messages?", "Who never answers calls?"] },
      { theme: "being late and time", examples: ["Who would be late to dinner?", "Who would arrive first?", "Who says 'five more minutes'?"] },
      { theme: "forgetting things", examples: ["Who would leave their wallet at home?", "Who would forget a birthday?", "Who would lose the keys?"] },
      { theme: "favourite things to do", examples: ["Who watches the most series?", "Who goes to bed the latest?", "Who loves a lie-in the most?"] },
      { theme: "catchphrases", examples: ["Who says 'just a second'?", "Who says 'I knew it'?", "Who repeats the same joke?"] },
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
      systemPrompt = buildTriviaPrompt(subject, difficulty, isTrueFalse, lang);
      console.log(`Generating TRIVIA question in ${lang} about: ${subject}`);
    } else {
      systemPrompt = buildPersonalPrompt(subject, difficulty, isTrueFalse, focusCategory, lang);
      console.log(`Generating PERSONAL question in ${lang}, focus category: ${focusCategory.theme}, seed: ${randomSeed}`);
    }

    // For True/False, randomly decide if we want a true or false statement
    const generateTrueStatement = Math.random() > 0.5;
    const tf = trueFalseWords(lang);
    const trueFalseInstruction = isTrueFalse 
      ? `\n\n🎲 FOR THIS QUESTION: Generate a ${generateTrueStatement ? `TRUE (${tf.yes})` : `FALSE (${tf.no})`} statement.
${generateTrueStatement 
  ? `- Write a factually CORRECT statement. correct_answer = "${tf.yes}", incorrect_answers = ["${tf.no}"]`
  : `- Write a factually INCORRECT statement. correct_answer = "${tf.no}", incorrect_answers = ["${tf.yes}"]`}`
      : '';

    const userPrompt = mode === "trivia"
      ? `🎯 Generate 1 UNIQUE, FACTUAL trivia question about: "${subject}"
${existingContext}${trueFalseInstruction}

⚡ IMPORTANT: 
- Generate factual questions with REAL answers about the topic
- DO NOT generate personal/family questions
- Answers should be facts, names, places, dates, etc. - NOT person types like "dad", "mum"
- Write the question and every answer in ${languageName(lang)}
- VERIFY grammar and spelling before responding
Return ONLY valid JSON.`
      : `🎲 Generate 1 UNIQUE, FUN question about: "${subject}"
Focus on theme: ${focusCategory.theme}
${existingContext}${trueFalseInstruction}

⚡ IMPORTANT: 
- Generate something COMPLETELY NEW and DIFFERENT!
- Be creative - think of funny, nostalgic, or slightly embarrassing situations.
- Write the question and every answer in ${languageName(lang)}
- VERIFY grammar and spelling before responding
- The question MUST be grammatically perfect in ${languageName(lang)}
Return ONLY valid JSON.`;

    console.log(`Mode: ${mode}, Language: ${lang}, Subject: ${subject}, Format: ${answerFormat}`);

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

    // The model was told to refuse an unsafe topic in this exact shape.
    if ((questionData as { refused?: boolean }).refused === true) {
      console.warn("Model refused the topic");
      return new Response(
        JSON.stringify({ error: "ეს თემა არ არის დაშვებული. სცადეთ სხვა თემა.", refused: true }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // MODERATION, SERVER SIDE. Same blocklist the client screens nicknames
    // and room names with (`_shared/contentFilter.ts`), run over what the
    // model actually wrote. There is only one question here, so a hit is a
    // refusal rather than a filter — and the caller retries, which asks for
    // a different question rather than the same one again.
    const offending = firstBlockedText([
      questionData.question_text,
      questionData.correct_answer,
      ...(questionData.incorrect_answers || []),
    ]);
    if (offending !== null) {
      console.warn("Generated question failed the content screen; refusing");
      return new Response(
        JSON.stringify({ error: "კითხვა ვერ დაგენერირდა. სცადეთ თავიდან.", refused: true }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate the question
    if (!isValidQuestion(questionData, isTrueFalse)) {
      throw new Error("Generated question did not meet requirements");
    }

    // Assign icon from icon_library
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Georgian Grammar Verification — for Georgian. `verify-georgian-grammar`
    // is a Georgian proofreader; handed a Spanish question it would "correct"
    // it into Georgian, which is the bug this whole change is about, arriving
    // one step later.
    if (lang === "ka") {
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
          language: lang,
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
      
      // Tier 4: Use theme mapping fallback for personal questions.
      // PERSONAL_THEME_ICONS is keyed by Georgian words, so it only ever
      // matches a Georgian question — the tiers above it search on the
      // model's icon_keywords, which are English in every language.
      if (!iconSlug && mode === "personal" && lang === "ka") {
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
