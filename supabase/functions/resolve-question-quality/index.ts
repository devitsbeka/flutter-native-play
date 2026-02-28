import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  if (lang === 'ka') return 'spelling, verb conjugation, case endings in Georgian';
  if (lang === 'en') return 'spelling, grammar, punctuation in English';
  return `spelling, grammar in ${getLanguageName(lang)}`;
}

interface ReviewData {
  grammar_issues: string[];
  uniqueness_issues: string[];
  confusion_issues: string[];
  recommendations: string[];
}

interface ResolvedQuestion {
  question_text: string;
  correct_answer: string;
  incorrect_answers: string[];
  changes_made: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: authData, error: authError } = await supabase.auth.getClaims(token);
    if (authError || !authData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const { questionId, reviewData } = await req.json() as { 
      questionId: string;
      reviewData: ReviewData;
    };

    if (!questionId) {
      return new Response(JSON.stringify({ error: 'questionId is required' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Fetch the question
    const { data: question, error: fetchError } = await supabase
      .from('questions')
      .select('*')
      .eq('id', questionId)
      .single();

    if (fetchError || !question) {
      return new Response(JSON.stringify({ error: 'Question not found' }), { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Build the AI prompt
    const incorrectAnswers = Array.isArray(question.incorrect_answers) 
      ? question.incorrect_answers 
      : JSON.parse(question.incorrect_answers || '[]');

    const langName = getLanguageName(question.language || 'ka');
    const grammarDesc = getGrammarDescription(question.language || 'ka');

    const prompt = `You are a ${langName} language trivia question expert. Your task is to fix this question to achieve A-grade quality (90%+ score).

ORIGINAL QUESTION:
Question: ${question.question_text}
Correct Answer: ${question.correct_answer}
Incorrect Answers: ${incorrectAnswers.join(', ')}

IDENTIFIED ISSUES:
Grammar Issues: ${reviewData.grammar_issues?.length ? reviewData.grammar_issues.join('; ') : 'None'}
Answer Uniqueness Issues: ${reviewData.uniqueness_issues?.length ? reviewData.uniqueness_issues.join('; ') : 'None'}
Clarity Issues: ${reviewData.confusion_issues?.length ? reviewData.confusion_issues.join('; ') : 'None'}

RECOMMENDATIONS:
${reviewData.recommendations?.length ? reviewData.recommendations.join('\n') : 'None'}

YOUR TASK:
1. Fix all grammar issues (${grammarDesc})
2. Ensure only ONE answer is definitively correct with no ambiguity
3. Make incorrect answers clearly wrong but still plausible
4. Improve question clarity and phrasing
5. Keep the same topic and intent of the question

IMPORTANT: All text must be in ${langName} language. Only fix what needs fixing - don't change things that are already correct.

Return ONLY a valid JSON object (no markdown, no code blocks):
{
  "question_text": "Fixed question in ${langName}",
  "correct_answer": "Fixed correct answer in ${langName}",
  "incorrect_answers": ["Fixed incorrect 1", "Fixed incorrect 2", "Fixed incorrect 3"],
  "changes_made": ["Change 1", "Change 2"]
}`;

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      return new Response(JSON.stringify({ error: 'AI resolution failed' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';

    // Parse the AI response
    let resolved: ResolvedQuestion;
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.slice(7);
      }
      if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.slice(0, -3);
      }
      resolved = JSON.parse(cleanContent.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      return new Response(JSON.stringify({ 
        error: 'Failed to parse AI response',
        raw: content 
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Update the question in the database
    const { error: updateError } = await supabase
      .from('questions')
      .update({
        question_text: resolved.question_text,
        correct_answer: resolved.correct_answer,
        incorrect_answers: resolved.incorrect_answers,
        updated_at: new Date().toISOString(),
      })
      .eq('id', questionId);

    if (updateError) {
      console.error('Update error:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update question' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Re-review the question to get new grade
    const reviewLangName = getLanguageName(question.language || 'ka');
    const reviewGrammarDesc = getGrammarDescription(question.language || 'ka');
    
    const reviewPrompt = `You are an expert ${reviewLangName} language trivia evaluator. Analyze this question and provide quality scores.

Question: ${resolved.question_text}
Correct Answer: ${resolved.correct_answer}
Incorrect Answers: ${resolved.incorrect_answers.join(', ')}

Evaluate based on:
1. GRAMMAR (30% weight): ${reviewLangName} ${reviewGrammarDesc}
2. ANSWER UNIQUENESS (40% weight): Only one answer is correct, no ambiguous options
3. CLARITY (30% weight): Question is clear and unambiguous

Return ONLY a valid JSON object:
{
  "grammar_score": <0-100>,
  "grammar_issues": [],
  "uniqueness_score": <0-100>,
  "uniqueness_issues": [],
  "confusion_score": <0-100>,
  "confusion_issues": [],
  "recommendations": []
}`;

    const reviewResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: reviewPrompt }],
        temperature: 0.2,
      }),
    });

    let newReview = null;
    if (reviewResponse.ok) {
      const reviewData = await reviewResponse.json();
      const reviewContent = reviewData.choices?.[0]?.message?.content || '';
      
      try {
        let cleanReview = reviewContent.trim();
        if (cleanReview.startsWith('```json')) cleanReview = cleanReview.slice(7);
        if (cleanReview.startsWith('```')) cleanReview = cleanReview.slice(3);
        if (cleanReview.endsWith('```')) cleanReview = cleanReview.slice(0, -3);
        
        const scores = JSON.parse(cleanReview.trim());
        const overallScore = Math.round(
          (scores.grammar_score || 0) * 0.3 +
          (scores.uniqueness_score || 0) * 0.4 +
          (scores.confusion_score || 0) * 0.3
        );

        const grade = overallScore >= 90 ? 'A' : overallScore >= 75 ? 'B' : overallScore >= 50 ? 'C' : 'D';

        // Update the review data in the database
        await supabase
          .from('questions')
          .update({
            ai_review_score: overallScore,
            ai_review_grade: grade,
            ai_review_data: scores,
            last_ai_review: new Date().toISOString(),
          })
          .eq('id', questionId);

        newReview = {
          id: questionId,
          question_text: resolved.question_text,
          correct_answer: resolved.correct_answer,
          incorrect_answers: resolved.incorrect_answers,
          overall_score: overallScore,
          grade,
          grammar_score: scores.grammar_score || 0,
          grammar_issues: scores.grammar_issues || [],
          uniqueness_score: scores.uniqueness_score || 0,
          uniqueness_issues: scores.uniqueness_issues || [],
          confusion_score: scores.confusion_score || 0,
          confusion_issues: scores.confusion_issues || [],
          recommendations: scores.recommendations || [],
        };
      } catch (e) {
        console.error('Failed to parse review response:', e);
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      resolved,
      newReview,
      changes: resolved.changes_made,
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
