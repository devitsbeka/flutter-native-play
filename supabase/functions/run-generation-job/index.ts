import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { factCheckQuestions } from "../_shared/factCheck.ts";
import { AI_CHAT_URL, AI_API_KEY, aiModel } from "../_shared/ai.ts";

const QUESTION_MAX_LENGTH = 70;
const ANSWER_MAX_LENGTH = 35;

interface GeneratedQuestion {
  question_text: string;
  correct_answer: string;
  incorrect_answers: string[];
  difficulty: string;
  icon_slug?: string;
}

interface GenerationJob {
  id: string;
  name: string;
  status: string;
  target_count: number;
  generated_count: number;
  categories: { id: string; name: string; quantity: number }[];
  current_category_index: number;
  current_category_progress: number;
  difficulty_distribution: { easy: number; medium: number; hard: number };
  batch_size: number;
  interval_minutes: number;
  auto_approve: boolean;
  language: string;
  last_run_at: string | null;
  next_run_at: string | null;
  error_log: string[];
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getDifficultyForBatch(distribution: { easy: number; medium: number; hard: number }, batchIndex: number): string {
  const total = distribution.easy + distribution.medium + distribution.hard;
  const rand = (batchIndex * 37) % total; // Pseudo-random based on batch index
  if (rand < distribution.easy) return 'easy';
  if (rand < distribution.easy + distribution.medium) return 'medium';
  return 'hard';
}

function isValidQuestion(q: GeneratedQuestion): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  
  if (!q.question_text || q.question_text.length > QUESTION_MAX_LENGTH) {
    warnings.push(`Question too long: ${q.question_text?.length || 0}/${QUESTION_MAX_LENGTH}`);
  }
  if (!q.correct_answer || q.correct_answer.length > ANSWER_MAX_LENGTH) {
    warnings.push(`Correct answer too long: ${q.correct_answer?.length || 0}/${ANSWER_MAX_LENGTH}`);
  }
  if (!q.incorrect_answers || q.incorrect_answers.length < 1) {
    warnings.push('Missing incorrect answers');
  }
  for (const ans of q.incorrect_answers || []) {
    if (ans.length > ANSWER_MAX_LENGTH) {
      warnings.push(`Incorrect answer too long: ${ans.length}/${ANSWER_MAX_LENGTH}`);
    }
  }
  
  return { valid: warnings.length === 0, warnings };
}

function normalizeText(text: string): string {
  return text.toLowerCase().trim().replace(/[?.!,;:'"()]/g, '');
}

function calculateSimilarity(q1: string, q2: string): number {
  const words1 = new Set(normalizeText(q1).split(/\s+/));
  const words2 = new Set(normalizeText(q2).split(/\s+/));
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  return intersection.size / union.size;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('[run-generation-job] Starting job check...');

  try {
    // Find active running job that's due for next batch
    const now = new Date();
    const { data: jobs, error: jobError } = await supabase
      .from('generation_jobs')
      .select('*')
      .eq('status', 'running')
      .or(`next_run_at.is.null,next_run_at.lte.${now.toISOString()}`)
      .order('created_at', { ascending: true })
      .limit(1);

    if (jobError) {
      console.error('[run-generation-job] Error fetching jobs:', jobError);
      throw jobError;
    }

    if (!jobs || jobs.length === 0) {
      console.log('[run-generation-job] No jobs ready to run');
      return new Response(JSON.stringify({ message: 'No jobs to run' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const job = jobs[0] as GenerationJob;
    console.log(`[run-generation-job] Processing job: ${job.name} (${job.id})`);

    // Check if job is complete
    if (job.generated_count >= job.target_count) {
      console.log('[run-generation-job] Job complete, marking as completed');
      await supabase
        .from('generation_jobs')
        .update({ 
          status: 'completed', 
          completed_at: now.toISOString(),
          updated_at: now.toISOString()
        })
        .eq('id', job.id);
      
      return new Response(JSON.stringify({ message: 'Job completed', job_id: job.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get current category
    const currentCategory = job.categories[job.current_category_index];
    if (!currentCategory) {
      console.log('[run-generation-job] No more categories, completing job');
      await supabase
        .from('generation_jobs')
        .update({ 
          status: 'completed', 
          completed_at: now.toISOString(),
          updated_at: now.toISOString()
        })
        .eq('id', job.id);
      
      return new Response(JSON.stringify({ message: 'Job completed - no more categories' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate batch size (don't exceed category quota or remaining target)
    const remainingForCategory = currentCategory.quantity - job.current_category_progress;
    const remainingTotal = job.target_count - job.generated_count;
    const batchSize = Math.min(job.batch_size, remainingForCategory, remainingTotal);
    
    console.log(`[run-generation-job] Generating ${batchSize} questions for category: ${currentCategory.name}`);
    
    // Get difficulty for this batch
    const difficulty = getDifficultyForBatch(job.difficulty_distribution, job.generated_count);
    
    // Fetch existing questions to avoid duplicates
    const { data: existingQuestions } = await supabase
      .from('questions')
      .select('question_text')
      .eq('category_id', currentCategory.id)
      .limit(500);

    const { data: jobQuestions } = await supabase
      .from('generation_job_questions')
      .select('question_text')
      .eq('job_id', job.id);

    const existingTexts = [
      ...(existingQuestions || []).map(q => q.question_text),
      ...(jobQuestions || []).map(q => q.question_text)
    ];

    // Build prompt for question generation
    const systemPrompt = `შენ ხარ ქართული ტრივიის კითხვების გენერატორი.

გენერირე ${batchSize} უნიკალური კითხვა კატეგორიაში: ${currentCategory.name}
სირთულე: ${difficulty}

⚠️ კრიტიკული სიგრძის წესი:
- კითხვა: მაქსიმუმ ${QUESTION_MAX_LENGTH} სიმბოლო (ძალიან მოკლე!)
- ეს ძალიან მოკლეა - იყავი ლაკონური!
- მაგალითი: "ვინ მოიგო ჩემპიონთა ლიგა 2022-ში?" = 36 სიმბოლო ✓
- თუ კითხვა გრძელია, გადააკეთე მოკლედ!

მკაცრი წესები:
1. კითხვა: მაქსიმუმ ${QUESTION_MAX_LENGTH} სიმბოლო (მკაცრი!)
2. პასუხი: მაქსიმუმ ${ANSWER_MAX_LENGTH} სიმბოლო
3. 3 არასწორი პასუხი, თითოეული მაქს ${ANSWER_MAX_LENGTH} სიმბოლო
4. ქართულ ენაზე
5. ფაქტობრივად სწორი
6. უნიკალური - არ გაიმეორო არსებული კითხვები

დააბრუნე JSON მასივი:
[{
  "question_text": "კითხვა?",
  "correct_answer": "სწორი",
  "incorrect_answers": ["არასწორი1", "არასწორი2", "არასწორი3"]
}]`;

    const userPrompt = existingTexts.length > 0 
      ? `არსებული კითხვები (ნუ გაიმეორებ): ${existingTexts.slice(0, 50).join('; ')}`
      : 'გენერირე ახალი უნიკალური კითხვები.';

    // Call AI API
    if (!AI_API_KEY) {
      console.error('[run-generation-job] AI_API_KEY is not configured');
      throw new Error("AI_API_KEY is not configured");
    }
    
    console.log('[run-generation-job] Calling AI API...');
    const aiResponse = await fetch(AI_CHAT_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: aiModel('google/gemini-2.5-flash'),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[run-generation-job] AI API error:', errorText);
      
      // Log error and schedule retry
      const errorLog = [...(job.error_log || []), `${now.toISOString()}: AI API error - ${aiResponse.status}`];
      await supabase
        .from('generation_jobs')
        .update({ 
          error_log: errorLog.slice(-50),
          error_count: (job as any).error_count + 1,
          last_run_at: now.toISOString(),
          next_run_at: new Date(now.getTime() + job.interval_minutes * 60 * 1000).toISOString(),
          updated_at: now.toISOString()
        })
        .eq('id', job.id);
      
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';
    console.log('[run-generation-job] AI response received');

    // Parse JSON from response
    let questions: GeneratedQuestion[] = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('[run-generation-job] JSON parse error:', parseError);
      const errorLog = [...(job.error_log || []), `${now.toISOString()}: JSON parse error`];
      await supabase
        .from('generation_jobs')
        .update({ 
          error_log: errorLog.slice(-50),
          error_count: (job as any).error_count + 1,
          last_run_at: now.toISOString(),
          next_run_at: new Date(now.getTime() + job.interval_minutes * 60 * 1000).toISOString(),
          updated_at: now.toISOString()
        })
        .eq('id', job.id);
      throw new Error('Failed to parse AI response');
    }

    console.log(`[run-generation-job] Parsed ${questions.length} questions`);

    // Strict fact-check before saving anything
    // NOTE: We keep this strict and will drop uncertain/incorrect items.
    let factCheckMap: Map<number, boolean> | null = null;
    try {
      const { results: fcResults } = await factCheckQuestions({
        req,
        items: questions.map((q) => ({
          question_text: q.question_text,
          correct_answer: q.correct_answer,
          incorrect_answers: q.incorrect_answers || [],
        })),
        context: {
          language: job.language === 'ka' ? 'ka' : 'en',
          mode: 'multiple_choice',
          categoryHint: currentCategory.name,
        },
      });

      factCheckMap = new Map(fcResults.map((r) => [r.index, r.pass]));
      console.log(`[run-generation-job] Fact-check pass: ${fcResults.filter(r => r.pass).length}/${questions.length}`);
    } catch (e) {
      // If fact-check is down/rate-limited, do not save potentially wrong content.
      console.error('[run-generation-job] Fact-check failed (blocking):', e);
      const errorLog = [...(job.error_log || []), `${now.toISOString()}: Fact-check failed`];
      await supabase
        .from('generation_jobs')
        .update({
          error_log: errorLog.slice(-50),
          error_count: (job as any).error_count + 1,
          last_run_at: now.toISOString(),
          next_run_at: new Date(now.getTime() + job.interval_minutes * 60 * 1000).toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', job.id);

      return new Response(JSON.stringify({ error: 'Fact-check failed, will retry later' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process and save questions
    let savedCount = 0;
    let duplicateCount = 0;

    for (let idx = 0; idx < questions.length; idx++) {
      const q = questions[idx];
      const validation = isValidQuestion(q);

      // Drop if fact-check failed
      if (factCheckMap && !factCheckMap.get(idx)) {
        continue;
      }
      
      // Check for duplicates
      let isDuplicate = false;
      let duplicateOf = '';
      for (const existing of existingTexts) {
        if (calculateSimilarity(q.question_text, existing) > 0.7) {
          isDuplicate = true;
          duplicateOf = existing;
          break;
        }
      }

      if (isDuplicate) {
        duplicateCount++;
      }

      // Save to generation_job_questions
      const { error: insertError } = await supabase
        .from('generation_job_questions')
        .insert({
          job_id: job.id,
          question_text: q.question_text,
          correct_answer: q.correct_answer,
          incorrect_answers: q.incorrect_answers,
          difficulty: difficulty,
          category_id: currentCategory.id,
          category_name: currentCategory.name,
          icon_slug: q.icon_slug || null,
          status: job.auto_approve && validation.valid && !isDuplicate ? 'approved' : 'pending',
          is_duplicate: isDuplicate,
          duplicate_of: duplicateOf || null,
          validation_warnings: validation.warnings.length > 0 ? validation.warnings : null,
        });

      if (!insertError) {
        savedCount++;
        existingTexts.push(q.question_text); // Add to existing for next comparison
      } else {
        console.error('[run-generation-job] Insert error:', insertError);
      }
    }

    console.log(`[run-generation-job] Saved ${savedCount} questions, ${duplicateCount} duplicates`);

    // Update job progress
    const newCategoryProgress = job.current_category_progress + savedCount;
    const categoryComplete = newCategoryProgress >= currentCategory.quantity;
    
    const updateData: any = {
      generated_count: job.generated_count + savedCount,
      duplicate_count: (job as any).duplicate_count + duplicateCount,
      current_category_progress: categoryComplete ? 0 : newCategoryProgress,
      current_category_index: categoryComplete ? job.current_category_index + 1 : job.current_category_index,
      last_run_at: now.toISOString(),
      next_run_at: new Date(now.getTime() + job.interval_minutes * 60 * 1000).toISOString(),
      updated_at: now.toISOString()
    };

    // Check if job is now complete
    if (job.generated_count + savedCount >= job.target_count) {
      updateData.status = 'completed';
      updateData.completed_at = now.toISOString();
    }

    await supabase
      .from('generation_jobs')
      .update(updateData)
      .eq('id', job.id);

    console.log(`[run-generation-job] Job updated. Progress: ${job.generated_count + savedCount}/${job.target_count}`);

    return new Response(JSON.stringify({
      success: true,
      job_id: job.id,
      questions_generated: savedCount,
      duplicates_found: duplicateCount,
      total_progress: job.generated_count + savedCount,
      target: job.target_count,
      next_run_at: updateData.next_run_at,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[run-generation-job] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
