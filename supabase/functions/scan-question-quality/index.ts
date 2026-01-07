import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BATCH_SIZE = 50;
const MAX_QUESTION_LENGTH = 65;
const MAX_ANSWER_LENGTH = 20;

interface QualityIssue {
  type: string;
  description: string;
}

interface ScanResult {
  id: string;
  question_text: string;
  issues: QualityIssue[];
  status: 'good' | 'needs_review' | 'needs_rewrite';
}

// Check if answer text appears in question
function hasAnswerInQuestion(questionText: string, correctAnswer: string): boolean {
  const normalizedQuestion = questionText.toLowerCase().replace(/[?!.,]/g, '').trim();
  const normalizedCorrect = correctAnswer.toLowerCase().replace(/[?!.,]/g, '').trim();
  
  if (normalizedCorrect.length >= 4 && normalizedQuestion.includes(normalizedCorrect)) {
    return true;
  }
  
  const answerWords = normalizedCorrect.split(/\s+/);
  if (answerWords.length >= 2) {
    const partialAnswer = answerWords.slice(0, 2).join(' ');
    if (partialAnswer.length >= 6 && normalizedQuestion.includes(partialAnswer)) {
      return true;
    }
  }
  
  return false;
}

function analyzeQuestion(question: {
  id: string;
  question_text: string;
  correct_answer: string;
  incorrect_answers: string[];
}): ScanResult {
  const issues: QualityIssue[] = [];
  
  // Check question length
  if (question.question_text.length > MAX_QUESTION_LENGTH) {
    issues.push({
      type: 'too_long',
      description: `კითხვა ძალიან გრძელია (${question.question_text.length}/${MAX_QUESTION_LENGTH})`
    });
  }
  
  // Check if question ends with question mark
  if (!question.question_text.trim().endsWith('?')) {
    issues.push({
      type: 'no_question_mark',
      description: 'კითხვა არ მთავრდება კითხვის ნიშნით'
    });
  }
  
  // Check answer in question (critical)
  if (hasAnswerInQuestion(question.question_text, question.correct_answer)) {
    issues.push({
      type: 'answer_in_question',
      description: 'სწორი პასუხი შეიცავს კითხვის ტექსტს'
    });
  }
  
  // Check correct answer length
  if (question.correct_answer.length > MAX_ANSWER_LENGTH) {
    issues.push({
      type: 'answer_too_long',
      description: `სწორი პასუხი ძალიან გრძელია (${question.correct_answer.length}/${MAX_ANSWER_LENGTH})`
    });
  }
  
  // Check incorrect answers
  const incorrectAnswers = Array.isArray(question.incorrect_answers) 
    ? question.incorrect_answers as string[]
    : [];
    
  incorrectAnswers.forEach((ans, idx) => {
    if (typeof ans === 'string' && ans.length > MAX_ANSWER_LENGTH) {
      issues.push({
        type: 'incorrect_answer_too_long',
        description: `არასწორი პასუხი ${idx + 1} ძალიან გრძელია (${ans.length}/${MAX_ANSWER_LENGTH})`
      });
    }
  });
  
  // Determine status
  let status: 'good' | 'needs_review' | 'needs_rewrite' = 'good';
  
  if (issues.some(i => i.type === 'answer_in_question')) {
    status = 'needs_rewrite';
  } else if (issues.length > 0) {
    status = 'needs_review';
  }
  
  return {
    id: question.id,
    question_text: question.question_text,
    issues,
    status
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { categoryId, scanAll, limit = BATCH_SIZE } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build query
    let query = supabase
      .from("questions")
      .select("id, question_text, correct_answer, incorrect_answers, quality_status")
      .eq("is_active", true);

    // Filter by category if specified
    if (categoryId && categoryId !== "all") {
      query = query.eq("category_id", categoryId);
    }

    // Only scan questions not yet checked (unless scanAll is true)
    if (!scanAll) {
      query = query.is("quality_status", null);
    }

    query = query.limit(limit);

    const { data: questions, error: fetchError } = await query;
    
    if (fetchError) {
      console.error("Error fetching questions:", fetchError);
      throw fetchError;
    }

    if (!questions || questions.length === 0) {
      return new Response(
        JSON.stringify({
          done: true,
          processed: 0,
          good: 0,
          needsReview: 0,
          needsRewrite: 0,
          results: [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: ScanResult[] = [];
    let good = 0;
    let needsReview = 0;
    let needsRewrite = 0;

    // Process questions
    for (const question of questions) {
      const result = analyzeQuestion({
        id: question.id,
        question_text: question.question_text,
        correct_answer: question.correct_answer,
        incorrect_answers: question.incorrect_answers as string[]
      });
      
      results.push(result);
      
      // Update database
      await supabase
        .from("questions")
        .update({
          quality_status: result.status,
          quality_issues: result.issues.length > 0 ? JSON.stringify(result.issues) : null,
          last_quality_check: new Date().toISOString()
        })
        .eq("id", question.id);
      
      if (result.status === 'good') good++;
      else if (result.status === 'needs_review') needsReview++;
      else if (result.status === 'needs_rewrite') needsRewrite++;
    }

    // Count remaining
    let remainingQuery = supabase
      .from("questions")
      .select("id", { count: 'exact', head: true })
      .eq("is_active", true)
      .is("quality_status", null);
      
    if (categoryId && categoryId !== "all") {
      remainingQuery = remainingQuery.eq("category_id", categoryId);
    }
    
    const { count: remaining } = await remainingQuery;

    return new Response(
      JSON.stringify({
        done: (remaining || 0) === 0,
        processed: questions.length,
        good,
        needsReview,
        needsRewrite,
        remaining: remaining || 0,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in scan-question-quality function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});