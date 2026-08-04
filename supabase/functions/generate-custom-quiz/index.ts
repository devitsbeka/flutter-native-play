import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { factCheckQuestions } from "../_shared/factCheck.ts";
import { AI_CHAT_URL, AI_API_KEY, aiModel } from "../_shared/ai.ts";

// App-wide character limits
const QUESTION_MAX_LENGTH = 65;
const ANSWER_MAX_LENGTH = 20;

// Fisher-Yates shuffle for randomizing answer positions
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Duplicate detection helpers
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
  const words = normalized.split(' ').filter(w => w.length > 2);
  return new Set([...numbers, ...words]);
}

function calculateSimilarity(text1: string, text2: string): number {
  const s1 = normalizeText(text1);
  const s2 = normalizeText(text2);
  
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;
  
  if (s1.includes(s2) || s2.includes(s1)) {
    const shorter = Math.min(s1.length, s2.length);
    const longer = Math.max(s1.length, s2.length);
    return shorter / longer;
  }
  
  const keywords1 = extractKeywords(text1);
  const keywords2 = extractKeywords(text2);
  
  if (keywords1.size === 0 || keywords2.size === 0) return 0;
  
  const intersection = [...keywords1].filter(k => keywords2.has(k));
  const union = new Set([...keywords1, ...keywords2]);
  
  return intersection.length / union.size;
}

interface GeneratedQuestion {
  question_text: string;
  correct_answer: string;
  incorrect_answers: string[];
  difficulty?: string;
  icon_keywords?: string[];
}

// STRICT validation - returns true only if ALL limits are met
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
  
  // True/False questions have 1 incorrect answer, multiple choice has 3
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

function removeDuplicateQuestions(questions: GeneratedQuestion[]): GeneratedQuestion[] {
  const unique: GeneratedQuestion[] = [];
  
  for (const q of questions) {
    const isDuplicate = unique.some(existing => 
      calculateSimilarity(q.question_text, existing.question_text) > 0.55
    );
    
    if (!isDuplicate) {
      unique.push(q);
    }
  }
  
  return unique;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subject, questionCount = 10, answerFormat = "4_answers", difficulty = "mixed" } = await req.json();

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
    // Request extra questions to account for duplicates that will be filtered
    const requestCount = questionCount + 5;
    
const systemPrompt = `You are an expert trivia question generator for a Georgian quiz app. You create fun, accurate, and engaging trivia questions.

🚨 FACTUAL ACCURACY - ABSOLUTELY CRITICAL - READ CAREFULLY:

1. ONLY include facts you are 100% CERTAIN about
2. If you have ANY doubt about a fact, DO NOT include that question
3. Verify character names, actor names, dates, and events VERY CAREFULLY
4. For TV shows/movies:
   - Use EXACT official character names (e.g., "Phil Dunphy" not "Philip")
   - Use CORRECT actor names
   - Verify episode/season details
   - Double-check relationship details (who is married to whom, etc.)
5. For historical facts: Ensure dates and events are 100% accurate
6. For sports: Verify records, scores, and statistics
7. NEVER guess or hallucinate - only use information you are CERTAIN about
8. When in doubt, choose a different fact you ARE certain about

EXAMPLES OF COMMON ERRORS TO AVOID:
❌ Wrong character names in TV shows (e.g., wrong names for Modern Family characters)
❌ Incorrect release dates for movies
❌ Wrong historical dates or events
❌ Incorrect sports records or statistics
❌ Mixing up actor names with character names

🚫 UNIQUE QUESTIONS - NO DUPLICATES - MANDATORY:

1. Each question MUST test a DIFFERENT and UNIQUE fact
2. DO NOT ask about the same person, event, or thing twice
3. DO NOT rephrase the same question in different words
4. Before generating each question, mentally verify it's completely different from all previous ones
5. Cover DIVERSE aspects of the topic (different characters, different events, different facts)

CRITICAL POLITICAL GUIDELINES - MANDATORY:
- აფხაზეთი (Abkhazia) is a REGION of Georgia, NOT a country - NEVER list it as a country
- სამხრეთ ოსეთი (South Ossetia) is a REGION of Georgia, NOT a country - NEVER list it as a country
- These are occupied territories of Georgia, internationally recognized as part of Georgia

CRITICAL CHARACTER LIMITS - STRICT:
- Question text: MAXIMUM ${QUESTION_MAX_LENGTH} characters (including spaces)
- Each answer: MAXIMUM ${ANSWER_MAX_LENGTH} characters

LANGUAGE RULES:
- Generate ALL questions and answers in Georgian (ქართული)
- The subject/topic may be in English - translate concepts to Georgian
- Use proper Georgian grammar and spelling

QUESTION QUALITY:
- Make questions interesting and fun
${difficulty === "mixed" 
  ? "- Mix difficulty: 30% easy, 50% medium, 20% hard" 
  : difficulty === "easy"
    ? "- Generate ALL questions at EASY difficulty level - suitable for beginners"
    : difficulty === "medium"
      ? "- Generate ALL questions at MEDIUM difficulty level - requires some knowledge"
      : "- Generate ALL questions at HARD difficulty level - for experts only"
}
- Avoid obscure facts nobody would know

${isTrueFalse ? `
TRUE/FALSE FORMAT - CRITICAL RULES:
- Generate a MIX of TRUE and FALSE statements (approximately 50% each)
- For TRUE statements: write factually CORRECT statements, correctAnswer = "მართალია"
- For FALSE statements: write factually INCORRECT/WRONG statements, correctAnswer = "მცდარია"
- incorrectAnswers is always the OPPOSITE: ["მცდარია"] for true, ["მართალია"] for false
- FALSE statements should be believable but clearly wrong when you know the facts
- VARY THE TRUTH VALUE - don't make all questions true or all false!

EXAMPLES:
✓ TRUE: "საქართველოს დედაქალაქია თბილისი." → correct_answer: "მართალია", incorrect_answers: ["მცდარია"]
✓ FALSE: "საქართველოს დედაქალაქია ბათუმი." → correct_answer: "მცდარია", incorrect_answers: ["მართალია"]
✓ TRUE: "წყალი 100°C-ზე დუღს." → correct_answer: "მართალია", incorrect_answers: ["მცდარია"]
✓ FALSE: "მზე დედამიწის გარშემო ბრუნავს." → correct_answer: "მცდარია", incorrect_answers: ["მართალია"]
` : `
MULTIPLE CHOICE FORMAT:
- Provide exactly 4 options (1 correct, 3 incorrect)
- Make incorrect answers plausible but clearly wrong
- IMPORTANT: The position of the correct answer in your response doesn't matter - it will be randomized later

🚫 ANSWER LENGTH PARITY - CRITICAL ANTI-CHEATING RULE:
1. ALL 4 answers MUST be similar in character length (within 5 characters of each other)
2. The correct answer must NOT be noticeably longer or shorter than incorrect answers
3. If the correct answer is detailed, make ALL incorrect answers equally detailed
4. If the answer is short, make ALL answers equally short
5. NEVER make the correct answer stand out by length - this allows players to guess without knowing

EXAMPLES:
❌ BAD: Correct: "პირველი მსოფლიო ომი" | Incorrect: "ომი", "ბრძოლა", "კონფლიქტი"
✓ GOOD: Correct: "პირველი მსოფლიო ომი" | Incorrect: "მეორე მსოფლიო ომი", "კორეის ომი 1950", "ვიეტნამის ომი"
`}

ICON KEYWORDS RULES:
- icon_keywords MUST be specific to the question topic, NOT generic
- NEVER use generic words: country, place, thing, person, object, item, location
- Include the actual subject/entity mentioned in the question

RETURN FORMAT - JSON only:
{
  "suggestedTitle": "catchy Georgian title for this quiz",
  "questions": [
    {
      "question_text": "კითხვა აქ (max ${QUESTION_MAX_LENGTH} chars)",
      "correct_answer": "სწორი (max ${ANSWER_MAX_LENGTH} chars)",
      "incorrect_answers": ["არასწორი 1", "არასწორი 2", "არასწორი 3"],
      "difficulty": "easy|medium|hard",
      "icon_keywords": ["specific", "relevant", "keywords"]
    }
  ]
}`;

    const userPrompt = `Generate ${requestCount} UNIQUE trivia questions about: "${subject}"

CRITICAL REMINDERS:
1. ⚠️ FACTUAL ACCURACY: Only include facts you are 100% certain about. If unsure, skip that question.
2. ⚠️ NO DUPLICATES: Each question must cover a COMPLETELY DIFFERENT fact. No repetition!
3. ALL text must be in Georgian
4. Questions max ${QUESTION_MAX_LENGTH} chars, answers max ${ANSWER_MAX_LENGTH} chars
5. ${isTrueFalse 
  ? `TRUE/FALSE FORMAT - CRITICAL: Generate approximately 50% TRUE statements (correct_answer: "მართალია") and 50% FALSE statements (correct_answer: "მცდარია"). Do NOT make all statements true!` 
  : '4 unique answer options per question'}
6. Include icon_keywords (2-3 English words) for each question

Return ONLY valid JSON.`;

    console.log(`Generating ${requestCount} ${answerFormat} questions (${difficulty}) about: ${subject} (will filter to ${questionCount})`);

    // Retry logic with timeout
    let response: Response | null = null;
    let lastError: Error | null = null;
    const MAX_RETRIES = 2;
    const TIMEOUT_MS = 55000; // 55 seconds to stay under edge function limit

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        response = await fetch(AI_CHAT_URL, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${AI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: aiModel("google/gemini-2.5-flash"), // Using faster model
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt }
            ],
            response_format: { type: "json_object" },
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          break; // Success, exit retry loop
        }
      } catch (fetchError) {
        lastError = fetchError instanceof Error ? fetchError : new Error(String(fetchError));
        console.error(`Attempt ${attempt + 1} failed:`, lastError.message);
        
        if (attempt < MAX_RETRIES - 1) {
          console.log(`Retrying... (attempt ${attempt + 2}/${MAX_RETRIES})`);
          await new Promise(r => setTimeout(r, 1000)); // Wait 1 second before retry
        }
      }
    }

    if (!response) {
      throw lastError || new Error("Failed to get AI response after retries");
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", errorText);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "სისტემა დატვირთულია. სცადეთ მოგვიანებით." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI კრედიტები ამოიწურა." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in response");
    }

    let quizData;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      quizData = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error("Failed to parse quiz data:", content);
      throw new Error("Failed to parse generated quiz");
    }

    if (!quizData.questions || !Array.isArray(quizData.questions)) {
      throw new Error("Invalid quiz format");
    }

    // STRICT validation: Filter out questions that exceed character limits
    const validQuestions = quizData.questions.filter((q: GeneratedQuestion) => isValidQuestion(q, isTrueFalse));
    console.log(`Validation: ${quizData.questions.length} generated, ${validQuestions.length} passed strict limits`);

    // Remove duplicates from the valid questions
    const uniqueQuestions = removeDuplicateQuestions(validQuestions);
    console.log(`Duplicate removal: ${validQuestions.length} valid, ${uniqueQuestions.length} unique`);

    // Take a slightly larger pool, then fact-check + slice
    const candidateQuestions = uniqueQuestions.slice(0, questionCount + 5);

    // Assign icons from icon_library
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Georgian Grammar Verification
    console.log("Verifying Georgian grammar...");
    for (const q of candidateQuestions) {
      try {
        const textsToVerify = [
          q.question_text,
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
              q.question_text = grammarResult.results[0].corrected;
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
              console.log(`Grammar fixed for: "${q.question_text.substring(0, 30)}..."`);
            }
          }
        }
      } catch (grammarError) {
        console.error("Grammar verification failed (non-blocking):", grammarError);
      }
    }

    // STRICT Fact-check: reject questions with wrong correct answers / unreliable facts
    console.log("Fact-checking generated questions...");
    const { results: fcResults } = await factCheckQuestions({
      req,
      items: candidateQuestions.map((q: GeneratedQuestion) => ({
        question_text: q.question_text,
        correct_answer: q.correct_answer,
        incorrect_answers: q.incorrect_answers || [],
      })),
      context: {
        language: "ka",
        mode: isTrueFalse ? "true_false" : "multiple_choice",
        topicHint: subject,
      },
    });

    const fcByIndex = new Map(fcResults.map((r) => [r.index, r]));
    const factCheckedQuestions = candidateQuestions.filter((_, idx) => fcByIndex.get(idx)?.pass);

    const finalQuestions = factCheckedQuestions.slice(0, questionCount);
    
    // Only fail if we got ZERO questions - be very lenient for collections
    if (finalQuestions.length === 0) {
      console.warn(
        `Fact-check filtered ALL questions: requested ${questionCount}, got 0.`,
      );
      return new Response(
        JSON.stringify({
          error: "კითხვები ვერ დაგენერირდა. სცადეთ სხვა თემა.",
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    
    // Log if we're returning fewer than requested (but still have some)
    if (finalQuestions.length < questionCount) {
      console.log(`Returning ${finalQuestions.length}/${questionCount} questions after fact-check filtering.`);
    }

    // Blocked generic keywords that match random icons
    const BLOCKED_GENERIC_KEYWORDS = [
      'country', 'place', 'thing', 'person', 'object', 'item', 
      'location', 'area', 'region', 'world', 'global', 'international',
      'flag', 'nation', 'land', 'territory', 'state', 'kingdom'
    ];

    // Georgian to Latin transliteration for answer matching
    const transliterateGeorgian = (text: string): string => {
      const map: Record<string, string> = {
        'ა': 'a', 'ბ': 'b', 'გ': 'g', 'დ': 'd', 'ე': 'e', 'ვ': 'v',
        'ზ': 'z', 'თ': 't', 'ი': 'i', 'კ': 'k', 'ლ': 'l', 'მ': 'm',
        'ნ': 'n', 'ო': 'o', 'პ': 'p', 'ჟ': 'zh', 'რ': 'r', 'ს': 's',
        'ტ': 't', 'უ': 'u', 'ფ': 'f', 'ქ': 'q', 'ღ': 'gh', 'ყ': 'y',
        'შ': 'sh', 'ჩ': 'ch', 'ც': 'ts', 'ძ': 'dz', 'წ': 'w', 'ჭ': 'ch',
        'ხ': 'kh', 'ჯ': 'j', 'ჰ': 'h'
      };
      return text.split('').map(c => map[c] || c).join('').toLowerCase();
    };

    const questionsWithIcons = await Promise.all(
      finalQuestions.map(async (q: GeneratedQuestion) => {
        let iconSlug: string | null = null;

        // Get all answers for validation
        const allAnswers = [
          q.correct_answer,
          ...(q.incorrect_answers || [])
        ].map(a => transliterateGeorgian(a || ''));

        // Try to find icon by keywords
        if (q.icon_keywords?.length) {
          // Filter out generic/blocked keywords
          const keywords = q.icon_keywords
            .map((k: string) => k.toLowerCase())
            .filter((k: string) => !BLOCKED_GENERIC_KEYWORDS.includes(k));
          
          if (keywords.length > 0) {
            // Try exact slug match first
            const { data: exactMatch } = await supabase
              .from('icon_library')
              .select('slug')
              .in('slug', keywords)
              .limit(5);

            if (exactMatch && exactMatch.length > 0) {
              // Find first icon that doesn't match any answer
              for (const match of exactMatch) {
                const slug = match.slug.toLowerCase();
                const matchesAnswer = allAnswers.some(answer => 
                  slug.includes(answer) || answer.includes(slug)
                );
                if (!matchesAnswer) {
                  iconSlug = match.slug;
                  break;
                }
              }
            }
            
            if (!iconSlug) {
              // Try tag search
              const { data: tagMatch } = await supabase
                .from('icon_library')
                .select('slug')
                .or(keywords.map((k: string) => `tags.cs.{${k}}`).join(','))
                .limit(5);

              if (tagMatch && tagMatch.length > 0) {
                // Find first icon that doesn't match any answer
                for (const match of tagMatch) {
                  const slug = match.slug.toLowerCase();
                  const matchesAnswer = allAnswers.some(answer => 
                    slug.includes(answer) || answer.includes(slug)
                  );
                  if (!matchesAnswer) {
                    iconSlug = match.slug;
                    break;
                  }
                }
              }
            }
          }
        }

        // Shuffle incorrect_answers to prevent AI patterns
        // The correct_answer is kept separate and shuffled on client side
        const shuffledIncorrect = shuffleArray(q.incorrect_answers || []);
        
        return {
          question_text: q.question_text,
          correct_answer: q.correct_answer,
          incorrect_answers: shuffledIncorrect,
          difficulty: q.difficulty || 'medium',
          icon_slug: iconSlug,
        };
      })
    );

    console.log(`Successfully generated ${questionsWithIcons.length} unique questions with icons`);

    return new Response(
      JSON.stringify({
        suggestedTitle: quizData.suggestedTitle || `${subject} ტრივია`,
        questions: questionsWithIcons,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate quiz";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
