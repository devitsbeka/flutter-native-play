import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface QuestionInput {
  id: string;
  question_text: string;
  correct_answer: string;
  incorrect_answers: string[];
}

interface ReviewResult {
  id: string;
  overall_score: number;
  grade: 'A' | 'B' | 'C' | 'D';
  grammar_score: number;
  grammar_issues: string[];
  uniqueness_score: number;
  uniqueness_issues: string[];
  confusion_score: number;
  confusion_issues: string[];
  recommendations: string[];
}

function calculateGrade(score: number): 'A' | 'B' | 'C' | 'D' {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 50) return 'C';
  return 'D';
}

async function reviewQuestion(question: QuestionInput, apiKey: string): Promise<ReviewResult> {
  const systemPrompt = `You are an expert Georgian language trivia question evaluator. You must analyze questions with extreme precision and return a JSON response.

Evaluate each question on three criteria:

1. GRAMMAR (30% weight): Check Georgian spelling, verb conjugation, case endings, and proper phrasing. Look for:
   - Spelling errors
   - Incorrect verb forms
   - Wrong case endings
   - Punctuation issues
   - Sentence structure problems

2. ANSWER UNIQUENESS (40% weight): This is the MOST important criterion. Verify:
   - Only ONE answer is definitively correct
   - Incorrect answers are clearly wrong but plausible
   - No ambiguity where multiple answers could be correct
   - Answers are not too similar to each other
   - The correct answer is factually accurate

3. CLARITY (30% weight): Assess overall question quality:
   - Is the question phrasing clear and unambiguous?
   - Are answer options distinguishable from each other?
   - Would a knowledgeable person be able to answer confidently?
   - Is the difficulty appropriate?

You MUST respond with valid JSON in this exact format:
{
  "grammar_score": <0-100>,
  "grammar_issues": ["issue1", "issue2"],
  "uniqueness_score": <0-100>,
  "uniqueness_issues": ["issue1", "issue2"],
  "confusion_score": <0-100>,
  "confusion_issues": ["issue1", "issue2"],
  "recommendations": ["recommendation1", "recommendation2"]
}`;

  const userPrompt = `Analyze this trivia question:

Question: ${question.question_text}
Correct Answer: ${question.correct_answer}
Incorrect Answers: ${JSON.stringify(question.incorrect_answers)}

Evaluate grammar, answer uniqueness, and clarity. Be strict - quality matters.`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }
    
    const parsed = JSON.parse(jsonStr);
    
    const grammarScore = Math.min(100, Math.max(0, parsed.grammar_score || 0));
    const uniquenessScore = Math.min(100, Math.max(0, parsed.uniqueness_score || 0));
    const confusionScore = Math.min(100, Math.max(0, parsed.confusion_score || 0));
    
    const overallScore = Math.round(
      grammarScore * 0.3 + 
      uniquenessScore * 0.4 + 
      confusionScore * 0.3
    );

    return {
      id: question.id,
      overall_score: overallScore,
      grade: calculateGrade(overallScore),
      grammar_score: grammarScore,
      grammar_issues: parsed.grammar_issues || [],
      uniqueness_score: uniquenessScore,
      uniqueness_issues: parsed.uniqueness_issues || [],
      confusion_score: confusionScore,
      confusion_issues: parsed.confusion_issues || [],
      recommendations: parsed.recommendations || [],
    };
  } catch (error) {
    console.error("Error reviewing question:", question.id, error);
    return {
      id: question.id,
      overall_score: 0,
      grade: 'D',
      grammar_score: 0,
      grammar_issues: ["Review failed - could not analyze"],
      uniqueness_score: 0,
      uniqueness_issues: [],
      confusion_score: 0,
      confusion_issues: [],
      recommendations: ["Re-run review"],
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { questions } = await req.json() as { questions: QuestionInput[] };

    if (!questions || questions.length === 0) {
      return new Response(JSON.stringify({ results: [], total: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Process in batches of 5
    const batchSize = 5;
    const results: ReviewResult[] = [];
    
    for (let i = 0; i < questions.length; i += batchSize) {
      const batch = questions.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(q => reviewQuestion(q, LOVABLE_API_KEY))
      );
      results.push(...batchResults);
      
      if (i + batchSize < questions.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return new Response(JSON.stringify({ results, total: results.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Review error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
