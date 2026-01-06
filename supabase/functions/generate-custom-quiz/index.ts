import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// App-wide character limits
const QUESTION_MAX_LENGTH = 65;
const ANSWER_MAX_LENGTH = 16;

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
    
    const systemPrompt = `You are a trivia question generator for a Georgian quiz app. Generate fun, engaging trivia questions.

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
- Ensure factual accuracy
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

RETURN FORMAT - JSON only:
{
  "suggestedTitle": "catchy Georgian title for this quiz",
  "questions": [
    {
      "question_text": "კითხვა აქ (max ${QUESTION_MAX_LENGTH} chars)",
      "correct_answer": "სწორი (max ${ANSWER_MAX_LENGTH} chars)",
      "incorrect_answers": ["არასწორი 1", "არასწორი 2", "არასწორი 3"],
      "difficulty": "easy|medium|hard",
      "icon_keywords": ["english", "keywords", "for_icon"]
    }
  ]
}`;

    const userPrompt = `Generate ${questionCount} trivia questions about: "${subject}"

Remember:
- ALL text in Georgian
- Questions max ${QUESTION_MAX_LENGTH} chars, answers max ${ANSWER_MAX_LENGTH} chars
- ${isTrueFalse ? 'True/False format - correctAnswer is "მართალია" or "მცდარია"' : '4 answer options per question'}
- Include icon_keywords (2-3 English words) for each question
- Make it fun and engaging!

Return ONLY valid JSON.`;

    console.log(`Generating ${questionCount} ${answerFormat} questions about: ${subject}`);

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

    // Assign icons from icon_library
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const questionsWithIcons = await Promise.all(
      quizData.questions.map(async (q: any) => {
        let iconSlug: string | null = null;

        // Try to find icon by keywords
        if (q.icon_keywords?.length > 0) {
          const keywords = q.icon_keywords.map((k: string) => k.toLowerCase());
          
          // Try exact slug match first
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

    console.log(`Successfully generated ${questionsWithIcons.length} questions with icons`);

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
