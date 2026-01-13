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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subject, answerFormat = "4_answers", difficulty = "medium", existingQuestions = [] } = await req.json();

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
    
    // Build existing questions context to avoid duplicates
    const existingContext = existingQuestions.length > 0 
      ? `\n\nEXISTING QUESTIONS TO AVOID DUPLICATING:\n${existingQuestions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')}`
      : '';

const systemPrompt = `You are a FUN party game question generator for a Georgian app where friends & family create custom quizzes for each other.

🎯 QUESTION CATEGORIES TO USE (pick randomly):
1. POP CULTURE: Movies, music, celebrities, memes, viral trends
2. FOOD & DRINKS: Cuisine facts, recipes, restaurant culture  
3. TRAVEL & GEOGRAPHY: Funny country facts, landmarks, traditions
4. RELATIONSHIPS: Friendship, dating, family dynamics (appropriate!)
5. TECHNOLOGY: Social media, apps, gadgets, internet culture
6. SPORTS & GAMES: Fun sports facts, video games, board games
7. RANDOM FUN: Weird world records, unusual laws, surprising facts

❌ AVOID THESE BORING TOPICS:
- Generic animal facts (which animal does X)
- School-style science questions
- Historical dates and boring history
- Math or technical questions

✅ QUESTION STYLE EXAMPLES:
- "რომელ ქალაქში დაიბადა კოკა-კოლა?" (pop culture)
- "რა არის TikTok-ის მაქსიმალური ვიდეოს ხანგრძლივობა?" (tech)
- "რომელი ფილმი მოიგო ყველაზე მეტი ოსკარი?" (movies)
- "რომელ ქვეყანაში სვამენ ყველაზე მეტ ყავას?" (food/travel)

CRITICAL CHARACTER LIMITS:
- Question: MAX ${QUESTION_MAX_LENGTH} characters
- Each answer: MAX ${ANSWER_MAX_LENGTH} characters

LANGUAGE: ALL text in Georgian (ქართული)

${isTrueFalse ? `TRUE/FALSE: correctAnswer = "მართალია" or "მცდარია"` : `
MULTIPLE CHOICE:
- 4 options (1 correct, 3 incorrect)
- Similar length answers
- Make wrong answers funny but believable
`}

RETURN ONLY valid JSON:
{
  "question_text": "კითხვა",
  "correct_answer": "სწორი",
  "incorrect_answers": ["არასწორი 1", "არასწორი 2", "არასწორი 3"],
  "difficulty": "${difficulty}",
  "icon_keywords": ["keyword1", "keyword2"]
}`;

    const userPrompt = `Generate 1 UNIQUE trivia question about: "${subject}"
Difficulty: ${difficulty}
${existingContext}

CRITICAL: Create a DIFFERENT question from any listed above.
ALL text in Georgian. Questions max ${QUESTION_MAX_LENGTH} chars, answers max ${ANSWER_MAX_LENGTH} chars.
Return ONLY valid JSON.`;

    console.log(`Generating single ${answerFormat} question about: ${subject}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
      }),
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

    let iconSlug: string | null = null;

    if (questionData.icon_keywords?.length) {
      const keywords = questionData.icon_keywords.map((k: string) => k.toLowerCase());
      
      // Try exact slug match
      const { data: exactMatch } = await supabase
        .from('icon_library')
        .select('slug')
        .in('slug', keywords)
        .limit(1);

      if (exactMatch && exactMatch.length > 0) {
        iconSlug = exactMatch[0].slug;
      } else {
        // Try tag search
        const { data: tagMatch } = await supabase
          .from('icon_library')
          .select('slug')
          .or(keywords.map((k: string) => `tags.cs.{${k}}`).join(','))
          .limit(1);

        if (tagMatch && tagMatch.length > 0) {
          iconSlug = tagMatch[0].slug;
        }
      }
    }

    const result = {
      question_text: questionData.question_text,
      correct_answer: questionData.correct_answer,
      incorrect_answers: questionData.incorrect_answers,
      difficulty: questionData.difficulty || difficulty,
      icon_slug: iconSlug,
    };

    console.log(`Successfully generated question with icon: ${iconSlug}`);

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
