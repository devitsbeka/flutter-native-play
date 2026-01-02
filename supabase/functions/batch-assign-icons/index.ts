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
  category_id?: string;
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
  const systemPrompt = `You are an icon matching assistant. Your job is to analyze trivia questions and identify a GENERAL TOPIC icon - NOT the specific answer.

CRITICAL RULES:
- NEVER suggest icons that could hint at the answer
- Focus on the CATEGORY or GENERAL THEME (science, history, geography, animals, sports, etc.)
- For a question about "which animal has the longest tongue?" - suggest "animal", "wildlife", "nature" - NOT the specific animal
- For a question about "who invented the telephone?" - suggest "history", "invention", "technology" - NOT "telephone" or the inventor
- The icon should represent the SUBJECT AREA, not the specific answer

Return ONLY valid JSON with no markdown formatting.`;

  const userPrompt = `Analyze this trivia question and identify a GENERAL TOPIC icon.

Question: "${question}"
${category ? `Category: "${category}"` : ''}

IMPORTANT: The icon must NOT hint at the answer. Focus only on the broad topic/category.

Return JSON in this exact format:
{
  "slugs": ["slug1", "slug2", "slug3"],
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "mainConcept": "broad topic description"
}

Rules:
- slugs: 3-5 GENERAL topic icon slugs (e.g., "animal", "science", "globe", "trophy")
- keywords: 5-10 BROAD category keywords (e.g., "wildlife", "biology", "geography")
- mainConcept: The general topic in 2-4 words (e.g., "Animal Kingdom", "World History")

Examples:
- Question about octopus blood → slugs: ["animal", "marine-life", "ocean"], keywords: ["sea", "wildlife", "creature", "biology"]
- Question about Einstein → slugs: ["science", "physics", "atom"], keywords: ["scientist", "history", "discovery"]
- Question about Eiffel Tower → slugs: ["landmark", "travel", "architecture"], keywords: ["building", "city", "monument"]

WRONG: Suggesting "octopus", "einstein", "eiffel-tower" - these hint at the answer!
CORRECT: Suggesting general category icons like "science", "animal", "landmark"`;

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
  aiResult: AIIconResult,
  brokenSet: Set<string>
): Promise<string | null> {
  // Helper to check if slug is valid (not broken)
  const isValid = (slug: string) => !brokenSet.has(slug);

  // 1. Try exact slug matches first
  for (const slug of aiResult.slugs) {
    if (brokenSet.has(slug)) continue;
    const { data } = await supabase
      .from('icon_library')
      .select('slug')
      .eq('slug', slug)
      .limit(1);
    
    if (data && data.length > 0 && isValid(data[0].slug)) {
      return data[0].slug;
    }
  }

  // 2. Try slug-starts-with match (e.g., "king" → "king-chess-piece")
  for (const slug of aiResult.slugs) {
    const { data } = await supabase
      .from('icon_library')
      .select('slug')
      .ilike('slug', `${slug}-%`)
      .limit(5);
    
    const validMatch = data?.find((d: any) => isValid(d.slug));
    if (validMatch) {
      return validMatch.slug;
    }
  }

  // 3. Try title search (case-insensitive)
  for (const keyword of aiResult.keywords.slice(0, 3)) {
    const { data } = await supabase
      .from('icon_library')
      .select('slug, title')
      .ilike('title', `%${keyword}%`)
      .limit(5);
    
    const validMatch = data?.find((d: any) => isValid(d.slug));
    if (validMatch) {
      return validMatch.slug;
    }
  }

  // 4. Try keyword search in tags
  for (const keyword of aiResult.keywords.slice(0, 5)) {
    const { data } = await supabase
      .from('icon_library')
      .select('slug, tags')
      .contains('tags', [keyword.toLowerCase()])
      .limit(5);
    
    const validMatch = data?.find((d: any) => isValid(d.slug));
    if (validMatch) {
      return validMatch.slug;
    }
  }

  // 5. Try partial slug match as fallback
  for (const slug of aiResult.slugs) {
    const { data } = await supabase
      .from('icon_library')
      .select('slug')
      .ilike('slug', `%${slug}%`)
      .limit(5);
    
    const validMatch = data?.find((d: any) => isValid(d.slug));
    if (validMatch) {
      return validMatch.slug;
    }
  }

  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { categoryId, testMode, brokenSlugs = [] } = await req.json();
    const batchSize = testMode ? TEST_BATCH_SIZE : BATCH_SIZE;
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create set of broken slugs for O(1) lookup
    const brokenSet = new Set<string>(brokenSlugs);
    console.log(`Excluding ${brokenSet.size} broken icons from assignment`);

    // Get ALL categories for fallback lookup
    const { data: allCategories } = await supabase
      .from('categories')
      .select('id, icon_slug');
    
    // Build category icon lookup map (category_id -> icon_slug)
    const categoryIconMap = new Map<string, string>();
    allCategories?.forEach(cat => {
      if (cat.icon_slug && !brokenSet.has(cat.icon_slug)) {
        categoryIconMap.set(cat.id, cat.icon_slug);
      }
    });
    console.log(`Category fallback map has ${categoryIconMap.size} valid icons`);

    // Build query for questions without icons
    let query = supabase
      .from('questions')
      .select(`
        id,
        question_text,
        category_id,
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
      category_id: q.category_id,
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

          let iconSlug: string | null = null;
          let method = 'none';

          if (aiResult) {
            iconSlug = await findBestIcon(supabase, aiResult, brokenSet);
            if (iconSlug) {
              method = 'ai-match';
            }
          }

          // Fallback to category icon if no AI match
          if (!iconSlug && question.category_id) {
            const categoryFallback = categoryIconMap.get(question.category_id);
            if (categoryFallback) {
              iconSlug = categoryFallback;
              method = 'category-fallback';
            }
          }

          return { 
            id: question.id, 
            icon_slug: iconSlug, 
            success: aiResult !== null || iconSlug !== null,
            method
          };
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
