import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// App-wide character limits
const QUESTION_MAX_LENGTH = 65;
const ANSWER_MAX_LENGTH = 20;

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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subject, questionCount = 10, answerFormat = "4_answers" } = await req.json();

    if (!subject) {
      return new Response(
        JSON.stringify({ error: "Subject is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
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
- Mix difficulty: 30% easy, 50% medium, 20% hard
- Avoid obscure facts nobody would know

${isTrueFalse ? `
TRUE/FALSE FORMAT:
- Question should be a statement that is either true or false
- correctAnswer must be "მართალია" (True) or "მცდარია" (False)
- incorrectAnswers should be the opposite of correctAnswer
` : `
MULTIPLE CHOICE FORMAT:
- Provide exactly 4 options (1 correct, 3 incorrect)
- Make incorrect answers plausible but clearly wrong
- Answers should be similar in length/format
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
5. ${isTrueFalse ? 'True/False format - correctAnswer is "მართალია" or "მცდარია"' : '4 unique answer options per question'}
6. Include icon_keywords (2-3 English words) for each question

Return ONLY valid JSON.`;

    console.log(`Generating ${requestCount} ${answerFormat} questions about: ${subject} (will filter to ${questionCount})`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", errorText);
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

    // Remove duplicates from the generated questions
    const uniqueQuestions = removeDuplicateQuestions(quizData.questions);
    console.log(`Filtered ${quizData.questions.length} questions to ${uniqueQuestions.length} unique questions`);

    // Take only the requested number of questions
    const finalQuestions = uniqueQuestions.slice(0, questionCount);

    // Assign icons from icon_library
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

        // Clean up and ensure limits
        const questionText = (q.question_text || '').slice(0, QUESTION_MAX_LENGTH);
        const correctAnswer = (q.correct_answer || '').slice(0, ANSWER_MAX_LENGTH);
        const incorrectAnswers = (q.incorrect_answers || []).map((a: string) => 
          (a || '').slice(0, ANSWER_MAX_LENGTH)
        );

        return {
          question_text: questionText,
          correct_answer: correctAnswer,
          incorrect_answers: incorrectAnswers,
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
