import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BATCH_SIZE = 50;
const TEST_BATCH_SIZE = 10;
const PARALLEL_LIMIT = 5;

interface Question {
  id: string;
  question_text: string;
  category_name?: string;
}

interface AIIconResult {
  slugs: string[];
  keywords: string[];
  mainConcept: string;
}

// Chunk array into smaller arrays
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Analyze a single question using AI
async function analyzeQuestion(
  question: string,
  category: string | undefined,
  apiKey: string
): Promise<AIIconResult | null> {
  const systemPrompt = `You are an icon matching assistant. Your job is to analyze trivia questions (often in Georgian language) and identify the VISUAL subject that would make the best icon representation.

Focus on:
- The main VISUAL subject of the question (animals, objects, places, people, concepts)
- Concrete, drawable things rather than abstract concepts
- The most specific identifiable subject

Return ONLY valid JSON with no markdown formatting.`;

  const userPrompt = `Analyze this trivia question and identify the best visual icon subject.

Question: "${question}"
${category ? `Category: "${category}"` : ''}

Return JSON in this exact format:
{
  "slugs": ["slug1", "slug2", "slug3"],
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "mainConcept": "brief description"
}

Rules:
- slugs: 3-5 specific icon slugs in kebab-case (e.g., "octopus", "blue-whale", "dna-helix")
- keywords: 5-10 English keywords for icon search (nouns, not adjectives)
- mainConcept: The primary visual subject in 2-4 words`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.warn('Rate limited, will retry');
        return null;
      }
      console.error('AI gateway error:', response.status);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) return null;

    const cleanContent = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    return JSON.parse(cleanContent);
  } catch (error) {
    console.error('Error analyzing question:', error);
    return null;
  }
}

// Find best matching icon from library with improved matching
async function findBestIcon(
  supabase: any,
  aiResult: AIIconResult
): Promise<string | null> {
  // 1. Try exact slug matches first
  for (const slug of aiResult.slugs) {
    const { data } = await supabase
      .from('icon_library')
      .select('slug')
      .eq('slug', slug)
      .limit(1);
    
    if (data && data.length > 0) {
      return data[0].slug;
    }
  }

  // 2. Try slug-starts-with match (e.g., "king" → "king-chess-piece")
  for (const slug of aiResult.slugs) {
    const { data } = await supabase
      .from('icon_library')
      .select('slug')
      .ilike('slug', `${slug}-%`)
      .limit(1);
    
    if (data && data.length > 0) {
      return data[0].slug;
    }
  }

  // 3. Try title search (case-insensitive)
  for (const keyword of aiResult.keywords.slice(0, 3)) {
    const { data } = await supabase
      .from('icon_library')
      .select('slug, title')
      .ilike('title', `%${keyword}%`)
      .limit(1);
    
    if (data && data.length > 0) {
      return data[0].slug;
    }
  }

  // 4. Try keyword search in tags
  for (const keyword of aiResult.keywords.slice(0, 5)) {
    const { data } = await supabase
      .from('icon_library')
      .select('slug, tags')
      .contains('tags', [keyword.toLowerCase()])
      .limit(1);
    
    if (data && data.length > 0) {
      return data[0].slug;
    }
  }

  // 5. Try partial slug match as fallback
  for (const slug of aiResult.slugs) {
    const { data } = await supabase
      .from('icon_library')
      .select('slug')
      .ilike('slug', `%${slug}%`)
      .limit(1);
    
    if (data && data.length > 0) {
      return data[0].slug;
    }
  }

  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { categoryId, testMode } = await req.json();
    const batchSize = testMode ? TEST_BATCH_SIZE : BATCH_SIZE;
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build query for questions without icons
    let query = supabase
      .from('questions')
      .select(`
        id,
        question_text,
        category:categories!inner(name)
      `)
      .or('icon_slug.is.null,icon_slug.eq.')
      .eq('is_active', true)
      .limit(batchSize);

    if (categoryId && categoryId !== 'all') {
      query = query.eq('category_id', categoryId);
    }

    const { data: questions, error: fetchError } = await query;

    if (fetchError) {
      throw fetchError;
    }

    if (!questions || questions.length === 0) {
      // Get total remaining count
      let countQuery = supabase
        .from('questions')
        .select('id', { count: 'exact', head: true })
        .or('icon_slug.is.null,icon_slug.eq.')
        .eq('is_active', true);
      
      if (categoryId && categoryId !== 'all') {
        countQuery = countQuery.eq('category_id', categoryId);
      }
      
      const { count } = await countQuery;

      return new Response(
        JSON.stringify({ 
          processed: 0, 
          remaining: count || 0,
          results: [],
          done: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format questions for processing
    const formattedQuestions: Question[] = questions.map((q: any) => ({
      id: q.id,
      question_text: q.question_text,
      category_name: q.category?.name
    }));

    // Process in parallel chunks
    const chunks = chunkArray(formattedQuestions, PARALLEL_LIMIT);
    const results: { id: string; icon_slug: string | null; success: boolean }[] = [];
    let rateLimited = false;

    for (const chunk of chunks) {
      if (rateLimited) break;

      const chunkResults = await Promise.all(
        chunk.map(async (question) => {
          const aiResult = await analyzeQuestion(
            question.question_text,
            question.category_name,
            LOVABLE_API_KEY
          );

          if (!aiResult) {
            return { id: question.id, icon_slug: null, success: false };
          }

          const iconSlug = await findBestIcon(supabase, aiResult);
          return { id: question.id, icon_slug: iconSlug, success: true };
        })
      );

      // Check for rate limiting
      const failedCount = chunkResults.filter(r => !r.success).length;
      if (failedCount === chunk.length) {
        rateLimited = true;
        console.warn('All requests in chunk failed, likely rate limited');
      }

      results.push(...chunkResults);

      // Small delay between chunks to avoid rate limiting
      if (chunks.indexOf(chunk) < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Bulk update successful results
    const successfulResults = results.filter(r => r.success && r.icon_slug);
    
    for (const result of successfulResults) {
      await supabase
        .from('questions')
        .update({ icon_slug: result.icon_slug })
        .eq('id', result.id);
    }

    // Get remaining count
    let remainingQuery = supabase
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .or('icon_slug.is.null,icon_slug.eq.')
      .eq('is_active', true);
    
    if (categoryId && categoryId !== 'all') {
      remainingQuery = remainingQuery.eq('category_id', categoryId);
    }
    
    const { count: remaining } = await remainingQuery;

    console.log(`Batch complete: ${successfulResults.length} icons assigned, ${remaining} remaining`);

    return new Response(
      JSON.stringify({
        processed: results.length,
        assigned: successfulResults.length,
        remaining: remaining || 0,
        rateLimited,
        results: results.map(r => ({ id: r.id, icon_slug: r.icon_slug })),
        done: (remaining || 0) === 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('batch-assign-icons error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
