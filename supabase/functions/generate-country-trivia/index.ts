import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { AI_CHAT_URL, AI_API_KEY, aiModel } from "../_shared/ai.ts";

// Strict character limits - questions exceeding these will be REJECTED
const QUESTION_MAX_LENGTH = 65;
const ANSWER_MAX_LENGTH = 20;

interface TriviaQuestion {
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
  difficulty: "easy" | "medium" | "hard";
  category: string;
}

// Validation function - returns true only if ALL limits are met
function isValidQuestion(q: TriviaQuestion): boolean {
  if (!q.question || !q.correct_answer || !Array.isArray(q.incorrect_answers)) {
    return false;
  }
  if (q.question.length > QUESTION_MAX_LENGTH) {
    console.log(`Rejecting question (${q.question.length} chars > ${QUESTION_MAX_LENGTH}): ${q.question.substring(0, 50)}...`);
    return false;
  }
  if (q.correct_answer.length > ANSWER_MAX_LENGTH) {
    console.log(`Rejecting answer (${q.correct_answer.length} chars > ${ANSWER_MAX_LENGTH}): ${q.correct_answer}`);
    return false;
  }
  if (q.incorrect_answers.length !== 3) {
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

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { countryName, countryCode, category, categoryName, count = 5 } = await req.json();

    if (!countryName || !category) {
      return new Response(
        JSON.stringify({ error: "Missing countryName or category" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!AI_API_KEY) {
      throw new Error("AI_API_KEY is not configured");
    }

    // Request extra questions to compensate for ones that will be filtered
    const requestCount = count + 5;

    const systemPrompt = `You are a trivia question generator. Generate exactly ${requestCount} trivia questions about ${countryName} in the category of ${categoryName || category}.

🚨🚨🚨 STRICT CHARACTER LIMITS - CRITICAL - QUESTIONS EXCEEDING LIMITS WILL BE REJECTED:

- Question text: MAXIMUM ${QUESTION_MAX_LENGTH} characters (including spaces and "?")
- Each answer: MAXIMUM ${ANSWER_MAX_LENGTH} characters

⚠️ IMPORTANT: If you cannot phrase a question/answer within these limits, SKIP IT and create a different question instead.

✅ Examples of proper length:
- "რომელ წელს დაარსდა NASA?" (25 chars) - GOOD
- "თბილისი" (8 chars) - GOOD answer

❌ Examples of TOO LONG (will be rejected):
- "რომელ წელს დაარსდა ამერიკის კოსმოსური სააგენტო NASA?" (52 chars) - REJECTED
- "საქართველოს დედაქალაქი თბილისი" (32 chars) - REJECTED answer

CRITICAL POLITICAL GUIDELINES - MANDATORY:
- აფხაზეთი (Abkhazia) is a REGION of Georgia, NOT a country - NEVER list it as a country
- სამხრეთ ოსეთი (South Ossetia) is a REGION of Georgia, NOT a country - NEVER list it as a country
- These are occupied territories of Georgia, internationally recognized as part of Georgia
- When asking "which country" questions about locations in Abkhazia or South Ossetia, the correct answer is Georgia (საქართველო)
- Examples of locations in Georgia: Lake Ritsa (რიწის ტბა), Sukhumi, Gagra, Tskhinvali - ALL are in GEORGIA
- NEVER present breakaway regions or occupied territories as independent countries

IMPORTANT RULES:
1. Questions must be specifically about ${countryName}, not general knowledge
2. Questions should be factual and verifiable
3. Include a mix of easy, medium, and hard questions
4. Each question must have exactly 1 correct answer and 3 plausible but incorrect answers
5. Incorrect answers should be believable but clearly wrong
6. Do not repeat similar questions
7. Keep answers SHORT and CONCISE

🚫 ANSWER LENGTH PARITY - CRITICAL ANTI-CHEATING RULE:
- ALL 4 answers MUST be similar in character length (within 5 characters of each other)
- The correct answer must NOT be noticeably longer or shorter than incorrect answers
- NEVER make the correct answer stand out by length - this allows guessing
- Example BAD: Correct: "თბილისი" | Incorrect: "ა", "ბ", "გ"
- Example GOOD: Correct: "თბილისი" | Incorrect: "ბათუმი", "ქუთაისი", "რუსთავი"

Return ONLY a valid JSON array with this exact structure (no markdown, no explanation):
[
  {
    "question": "კითხვა აქ? (მაქს ${QUESTION_MAX_LENGTH} სიმბოლო)",
    "correct_answer": "პასუხი (მაქს ${ANSWER_MAX_LENGTH})",
    "incorrect_answers": ["არასწორი 1", "არასწორი 2", "არასწორი 3"],
    "difficulty": "easy|medium|hard",
    "category": "${category}"
  }
]`;

    const userPrompt = `Generate ${requestCount} trivia questions about ${countryName} (${countryCode}) in the "${categoryName || category}" category. Remember: questions max ${QUESTION_MAX_LENGTH} chars, answers max ${ANSWER_MAX_LENGTH} chars.`;

    console.log(`Generating ${requestCount} trivia questions for ${countryName} - ${category} (will filter to ${count})`);

    const response = await fetch(AI_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiModel("google/gemini-2.5-flash"),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON from the response
    let rawQuestions: TriviaQuestion[];
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanedContent = content.trim();
      
      // Remove ```json ... ``` or ``` ... ``` wrappers
      cleanedContent = cleanedContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
      
      // Try to extract JSON array from the response
      const jsonMatch = cleanedContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        rawQuestions = JSON.parse(jsonMatch[0]);
      } else {
        rawQuestions = JSON.parse(cleanedContent);
      }
    } catch (parseError) {
      console.error("Failed to parse AI response. Raw content:", content);
      console.error("Parse error:", parseError);
      throw new Error("Failed to parse trivia questions");
    }

    // Validate structure
    if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
      throw new Error("Invalid questions format");
    }

    // STRICT VALIDATION: Filter out questions that exceed character limits
    const validQuestions = rawQuestions.filter(isValidQuestion);
    
    // Take only the requested number of valid questions
    const finalQuestions = validQuestions.slice(0, count);

    console.log(`Generated ${rawQuestions.length} questions, ${validQuestions.length} passed validation, returning ${finalQuestions.length} for ${countryName} - ${category}`);

    return new Response(
      JSON.stringify({ questions: finalQuestions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating trivia:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
