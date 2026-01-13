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
    const { subject, answerFormat = "4_answers", difficulty = "medium", existingQuestions = [], randomSeed = "" } = await req.json();

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
    
    // Personal question categories to rotate through for variety
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

    console.log(`Generating with focus category: ${focusCategory.theme}, seed: ${randomSeed}`);

const systemPrompt = `You are a CREATIVE party game question generator for friends & family. Your goal is to create FUN, PERSONAL questions that spark laughter and memories.

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

LIMITS: Question ≤${QUESTION_MAX_LENGTH} chars, Answer ≤${ANSWER_MAX_LENGTH} chars
LANGUAGE: Georgian only

${isTrueFalse ? `TRUE/FALSE format` : `4 MULTIPLE CHOICE answers`}

JSON FORMAT:
{
  "question_text": "...",
  "correct_answer": "...",
  "incorrect_answers": ["...", "...", "..."],
  "difficulty": "${difficulty}",
  "icon_keywords": ["family", "friends"]
}`;

    const userPrompt = `🎲 Generate 1 UNIQUE, FUN question about: "${subject}"
Focus on theme: ${focusCategory.theme}
${existingContext}

⚡ IMPORTANT: Generate something COMPLETELY NEW and DIFFERENT!
Be creative - think of funny, nostalgic, or slightly embarrassing situations.
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
