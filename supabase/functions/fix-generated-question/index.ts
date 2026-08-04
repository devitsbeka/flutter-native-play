import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { AI_CHAT_URL, AI_API_KEY, aiModel } from "../_shared/ai.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ReviewData {
  grammar_issues: string[];
  uniqueness_issues: string[];
  confusion_issues: string[];
  recommendations: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question_text, correct_answer, incorrect_answers, reviewData, language } = await req.json() as {
      question_text: string;
      correct_answer: string;
      incorrect_answers: string[];
      reviewData: ReviewData;
      language?: string;
    };

    if (!question_text) {
      return new Response(JSON.stringify({ error: 'question_text is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!AI_API_KEY) {
      throw new Error("AI_API_KEY is not configured");
    }

    const lang = language || 'ka';
    const langName = lang === 'ka' ? 'Georgian' : lang === 'en' ? 'English' : lang;

    // Fix the question
    const fixPrompt = `You are a ${langName} language trivia question expert. Your task is to fix this question to achieve A-grade quality (90%+ score).

ORIGINAL QUESTION:
Question: ${question_text}
Correct Answer: ${correct_answer}
Incorrect Answers: ${incorrect_answers.join(', ')}

IDENTIFIED ISSUES:
Grammar Issues: ${reviewData.grammar_issues?.length ? reviewData.grammar_issues.join('; ') : 'None'}
Answer Uniqueness Issues: ${reviewData.uniqueness_issues?.length ? reviewData.uniqueness_issues.join('; ') : 'None'}
Clarity Issues: ${reviewData.confusion_issues?.length ? reviewData.confusion_issues.join('; ') : 'None'}

RECOMMENDATIONS:
${reviewData.recommendations?.length ? reviewData.recommendations.join('\n') : 'None'}

YOUR TASK:
1. Fix all grammar issues (spelling, verb conjugation, case endings)
2. Ensure only ONE answer is definitively correct with no ambiguity
3. Make incorrect answers clearly wrong but still plausible
4. Improve question clarity and phrasing
5. Keep the same topic and intent of the question

IMPORTANT: All text must be in ${langName} language. Only fix what needs fixing.

Return ONLY a valid JSON object (no markdown, no code blocks):
{
  "question_text": "Fixed question",
  "correct_answer": "Fixed correct answer",
  "incorrect_answers": ["Fixed incorrect 1", "Fixed incorrect 2", "Fixed incorrect 3"],
  "changes_made": ["Change 1", "Change 2"]
}`;

    const aiResponse = await fetch(AI_CHAT_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: aiModel('google/gemini-2.5-flash'),
        messages: [{ role: 'user', content: fixPrompt }],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error('AI fix failed');
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';

    let cleanContent = content.trim();
    if (cleanContent.startsWith('```json')) cleanContent = cleanContent.slice(7);
    if (cleanContent.startsWith('```')) cleanContent = cleanContent.slice(3);
    if (cleanContent.endsWith('```')) cleanContent = cleanContent.slice(0, -3);
    
    const resolved = JSON.parse(cleanContent.trim());

    // Re-review the fixed question
    const reviewPrompt = `You are an expert trivia evaluator. Analyze this ${langName} question and provide quality scores.

Question: ${resolved.question_text}
Correct Answer: ${resolved.correct_answer}
Incorrect Answers: ${resolved.incorrect_answers.join(', ')}

Evaluate based on:
1. GRAMMAR (30% weight): Spelling, verb conjugation, case endings, proper phrasing
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

    const reviewResponse = await fetch(AI_CHAT_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: aiModel('google/gemini-2.5-flash'),
        messages: [{ role: 'user', content: reviewPrompt }],
        temperature: 0.2,
      }),
    });

    let newScore = 0;
    let newGrade: 'A' | 'B' | 'C' | 'D' = 'D';
    let newQualityData = null;

    if (reviewResponse.ok) {
      const reviewData2 = await reviewResponse.json();
      const reviewContent = reviewData2.choices?.[0]?.message?.content || '';
      
      try {
        let cleanReview = reviewContent.trim();
        if (cleanReview.startsWith('```json')) cleanReview = cleanReview.slice(7);
        if (cleanReview.startsWith('```')) cleanReview = cleanReview.slice(3);
        if (cleanReview.endsWith('```')) cleanReview = cleanReview.slice(0, -3);
        
        const scores = JSON.parse(cleanReview.trim());
        newScore = Math.round(
          (scores.grammar_score || 0) * 0.3 +
          (scores.uniqueness_score || 0) * 0.4 +
          (scores.confusion_score || 0) * 0.3
        );
        newGrade = newScore >= 90 ? 'A' : newScore >= 75 ? 'B' : newScore >= 50 ? 'C' : 'D';
        newQualityData = {
          grammar_score: scores.grammar_score || 0,
          grammar_issues: scores.grammar_issues || [],
          uniqueness_score: scores.uniqueness_score || 0,
          uniqueness_issues: scores.uniqueness_issues || [],
          confusion_score: scores.confusion_score || 0,
          confusion_issues: scores.confusion_issues || [],
          recommendations: scores.recommendations || [],
        };
      } catch (e) {
        console.error('Failed to parse review:', e);
      }
    } else {
      await reviewResponse.text(); // consume body
    }

    return new Response(JSON.stringify({
      success: true,
      fixed: {
        question_text: resolved.question_text,
        correct_answer: resolved.correct_answer,
        incorrect_answers: resolved.incorrect_answers,
        changes_made: resolved.changes_made || [],
      },
      qualityScore: newScore,
      qualityGrade: newGrade,
      qualityData: newQualityData,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
