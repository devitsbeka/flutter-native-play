import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AI_CHAT_URL, AI_API_KEY, aiModel } from "../_shared/ai.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface QuestionInput {
  id: string;
  question_text: string;
  correct_answer: string;
  incorrect_answers: string[];
  category_id?: string;
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
  is_semantic_duplicate: boolean;
  duplicate_of?: string;
  duplicate_reason?: string;
}

function calculateGrade(score: number): 'A' | 'B' | 'C' | 'D' {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 50) return 'C';
  return 'D';
}

/**
 * Fetch all existing questions for a category (paginated to handle large datasets)
 */
async function fetchExistingQuestions(
  supabase: ReturnType<typeof createClient>,
  categoryId: string
): Promise<{ question_text: string; correct_answer: string }[]> {
  const all: { question_text: string; correct_answer: string }[] = [];
  let offset = 0;
  const batchSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('questions')
      .select('question_text, correct_answer')
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .range(offset, offset + batchSize - 1);

    if (error) {
      console.error('Error fetching existing questions:', error);
      break;
    }
    if (!data || data.length === 0) break;
    all.push(...data);
    offset += data.length;
    if (data.length < batchSize) break;
    if (offset >= 50000) break;
  }

  return all;
}

async function reviewQuestionWithDuplicateCheck(
  question: QuestionInput,
  existingQuestions: { question_text: string; correct_answer: string }[],
  apiKey: string
): Promise<ReviewResult> {
  // Build a sample of existing questions for the AI to compare against.
  // To stay within context limits, send up to 100 existing questions.
  // Prioritize by simple text overlap for relevance.
  const existingSample = existingQuestions.length <= 100
    ? existingQuestions
    : selectRelevantExisting(question.question_text, existingQuestions, 100);

  const existingList = existingSample
    .map((eq, i) => `${i + 1}. Q: ${eq.question_text} | A: ${eq.correct_answer}`)
    .join('\n');

  const systemPrompt = `You are an expert Georgian language trivia question evaluator. You must analyze questions with extreme precision and return a JSON response.

Evaluate each question on three criteria:

1. GRAMMAR (30% weight): Check spelling, verb conjugation, case endings, and proper phrasing. Look for:
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

4. SEMANTIC DUPLICATE CHECK: This is CRITICAL. Compare the new question against the existing questions list below. A question is a semantic duplicate if:
   - It asks about the SAME fact/concept/topic even with different wording
   - It tests the same knowledge point with rephrased text
   - The correct answer is the same AND the questions are about the same subject
   - Example: "What is the capital of France?" and "Which city serves as France's capital?" are semantic duplicates
   - Even if wording is very different, if the underlying knowledge being tested is the same, it IS a duplicate
   - Be STRICT about this - we want zero redundancy in our question pool

You MUST respond with valid JSON in this exact format:
{
  "grammar_score": <0-100>,
  "grammar_issues": ["issue1", "issue2"],
  "uniqueness_score": <0-100>,
  "uniqueness_issues": ["issue1", "issue2"],
  "confusion_score": <0-100>,
  "confusion_issues": ["issue1", "issue2"],
  "recommendations": ["recommendation1", "recommendation2"],
  "is_semantic_duplicate": <true/false>,
  "duplicate_of": "<the existing question text that this is a duplicate of, or null>",
  "duplicate_reason": "<explanation of why this is a semantic duplicate, or null>"
}`;

  const userPrompt = `Analyze this NEW trivia question:

Question: ${question.question_text}
Correct Answer: ${question.correct_answer}
Incorrect Answers: ${JSON.stringify(question.incorrect_answers)}

EXISTING QUESTIONS IN THE SAME CATEGORY (check for semantic duplicates):
${existingList || '(No existing questions in this category)'}

Evaluate grammar, answer uniqueness, clarity, AND check if this question is a semantic duplicate of any existing question. Be VERY strict on duplicate detection - even subtle rephrasing of the same knowledge should be flagged.`;

  try {
    const response = await fetch(AI_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiModel("google/gemini-2.5-flash"),
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
    const isSemanticDuplicate = !!parsed.is_semantic_duplicate;

    // If it's a semantic duplicate, heavily penalize the overall score
    const duplicatePenalty = isSemanticDuplicate ? 0.3 : 1;

    const overallScore = Math.round(
      (grammarScore * 0.3 +
        uniquenessScore * 0.4 +
        confusionScore * 0.3) * duplicatePenalty
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
      is_semantic_duplicate: isSemanticDuplicate,
      duplicate_of: parsed.duplicate_of || undefined,
      duplicate_reason: parsed.duplicate_reason || undefined,
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
      is_semantic_duplicate: false,
    };
  }
}

/**
 * Select the most relevant existing questions by simple keyword overlap
 * to keep AI context focused and within token limits
 */
function selectRelevantExisting(
  newQuestionText: string,
  existing: { question_text: string; correct_answer: string }[],
  limit: number
): { question_text: string; correct_answer: string }[] {
  const words = new Set(
    newQuestionText.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').split(/\s+/).filter(w => w.length > 2)
  );

  const scored = existing.map(eq => {
    const eqWords = eq.question_text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').split(/\s+/);
    let overlap = 0;
    for (const w of eqWords) {
      if (words.has(w)) overlap++;
    }
    return { eq, overlap };
  });

  // Sort by overlap descending, take top `limit`
  scored.sort((a, b) => b.overlap - a.overlap);
  return scored.slice(0, limit).map(s => s.eq);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { questions, categoryId, language } = await req.json() as {
      questions: QuestionInput[];
      categoryId?: string;
      language?: string;
    };

    // Skip semantic duplicate checking for non-Georgian languages
    // since translated questions won't be shown to the same users as Georgian ones
    const skipSemanticDupCheck = language && language !== 'ka';

    if (!questions || questions.length === 0) {
      return new Response(JSON.stringify({ results: [], total: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!AI_API_KEY) {
      throw new Error("AI_API_KEY is not configured");
    }

    // Fetch existing questions for semantic duplicate detection (only for Georgian)
    let existingQuestions: { question_text: string; correct_answer: string }[] = [];
    const existingByCategory: Record<string, { question_text: string; correct_answer: string }[]> = {};

    if (!skipSemanticDupCheck) {
      if (categoryId) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        existingQuestions = await fetchExistingQuestions(supabase, categoryId);
        console.log(`Loaded ${existingQuestions.length} existing questions from category for semantic duplicate check`);
      }

      // If questions span multiple categories, group and fetch per category
      const categoryIds = [...new Set(questions.map(q => q.category_id).filter(Boolean))];

      if (!categoryId && categoryIds.length > 0) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        for (const catId of categoryIds) {
          existingByCategory[catId!] = await fetchExistingQuestions(supabase, catId!);
          console.log(`Loaded ${existingByCategory[catId!].length} existing questions for category ${catId}`);
        }
      }
    } else {
      console.log(`Skipping semantic duplicate check for language: ${language}`);
    }

    // Process in batches of 3 (slightly smaller since prompts are larger with existing questions)
    const batchSize = 3;
    const results: ReviewResult[] = [];

    for (let i = 0; i < questions.length; i += batchSize) {
      const batch = questions.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(q => {
          const existing = categoryId
            ? existingQuestions
            : (q.category_id ? existingByCategory[q.category_id] || [] : []);
          return reviewQuestionWithDuplicateCheck(q, existing, AI_API_KEY);
        })
      );
      results.push(...batchResults);

      if (i + batchSize < questions.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    const duplicateCount = results.filter(r => r.is_semantic_duplicate).length;
    console.log(`Review complete: ${results.length} questions, ${duplicateCount} semantic duplicates found`);

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
