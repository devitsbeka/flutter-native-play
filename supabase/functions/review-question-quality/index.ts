import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AI_CHAT_URL, AI_API_KEY, aiModel } from "../_shared/ai.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const LANGUAGE_NAMES: Record<string, string> = {
  'ka': 'Georgian',
  'en': 'English',
  'fr': 'French',
  'de': 'German',
  'es': 'Spanish',
  'it': 'Italian',
  'pt': 'Portuguese',
  'pt-br': 'Brazilian Portuguese',
};

function getLanguageName(code: string): string {
  return LANGUAGE_NAMES[code] || LANGUAGE_NAMES['ka'];
}

function getGrammarDescription(lang: string): string {
  if (lang === 'ka') return 'Georgian spelling, verb conjugation, case endings, and proper phrasing';
  if (lang === 'en') return 'English spelling, grammar, punctuation, and proper phrasing';
  return `${getLanguageName(lang)} spelling, grammar, and proper phrasing`;
}

interface Question {
  id: string;
  question_text: string;
  correct_answer: string;
  incorrect_answers: string[];
  category_id: string;
  language: string;
}

interface ReviewResult {
  id: string;
  question_text: string;
  correct_answer: string;
  incorrect_answers: string[];
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

async function reviewQuestion(question: Question, apiKey: string): Promise<ReviewResult> {
  const langName = getLanguageName(question.language);
  const grammarDesc = getGrammarDescription(question.language);
  
  const systemPrompt = `You are an expert ${langName} language trivia question evaluator. You must analyze questions with extreme precision and return a JSON response.

Evaluate each question on three criteria:

1. GRAMMAR (30% weight): Check ${grammarDesc}. Look for:
   - Spelling errors
   - Incorrect verb forms
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

  const userPrompt = `Analyze this ${langName} trivia question:

Question: ${question.question_text}
Correct Answer: ${question.correct_answer}
Incorrect Answers: ${JSON.stringify(question.incorrect_answers)}

Evaluate grammar, answer uniqueness, and clarity. Be strict - quality matters.`;

  try {
    const response = await fetch(AI_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiModel("google/gemini-3-flash-preview"),
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
    
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }
    
    const parsed = JSON.parse(jsonStr);
    
    // Calculate weighted overall score
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
      question_text: question.question_text,
      correct_answer: question.correct_answer,
      incorrect_answers: question.incorrect_answers,
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
    // Return a failed review with score 0
    return {
      id: question.id,
      question_text: question.question_text,
      correct_answer: question.correct_answer,
      incorrect_answers: question.incorrect_answers,
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
    const { categoryId, questionIds, onlyProduction, limit = 20, saveResults = true } = await req.json();

    if (!AI_API_KEY) {
      throw new Error("AI_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build query
    let query = supabase
      .from('questions')
      .select('id, question_text, correct_answer, incorrect_answers, category_id, language')
      .eq('is_active', true)
      .limit(limit);

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    if (questionIds && questionIds.length > 0) {
      query = query.in('id', questionIds);
    }

    if (onlyProduction) {
      query = query.eq('in_production', true);
    }

    const { data: questions, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch questions: ${fetchError.message}`);
    }

    if (!questions || questions.length === 0) {
      return new Response(JSON.stringify({ results: [], total: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process questions in batches of 5 for rate limiting
    const batchSize = 5;
    const results: ReviewResult[] = [];
    
    for (let i = 0; i < questions.length; i += batchSize) {
      const batch = questions.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(q => reviewQuestion(q as Question, AI_API_KEY))
      );
      results.push(...batchResults);
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < questions.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Save results to database if requested
    if (saveResults) {
      for (const result of results) {
        await supabase
          .from('questions')
          .update({
            ai_review_score: result.overall_score,
            ai_review_grade: result.grade,
            ai_review_data: {
              grammar_score: result.grammar_score,
              grammar_issues: result.grammar_issues,
              uniqueness_score: result.uniqueness_score,
              uniqueness_issues: result.uniqueness_issues,
              confusion_score: result.confusion_score,
              confusion_issues: result.confusion_issues,
              recommendations: result.recommendations,
            },
            last_ai_review: new Date().toISOString(),
          })
          .eq('id', result.id);
      }
    }

    // Calculate summary
    const summary = {
      A: results.filter(r => r.grade === 'A').length,
      B: results.filter(r => r.grade === 'B').length,
      C: results.filter(r => r.grade === 'C').length,
      D: results.filter(r => r.grade === 'D').length,
    };

    return new Response(JSON.stringify({ results, total: results.length, summary }), {
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
