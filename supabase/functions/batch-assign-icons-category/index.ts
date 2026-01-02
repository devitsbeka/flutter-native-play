import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { categoryId, batchSize = 100, offset = 0 } = await req.json();

    console.log(`Processing batch: categoryId=${categoryId}, batchSize=${batchSize}, offset=${offset}`);

    // Build the query for questions without icons
    let questionsQuery = supabase
      .from('questions')
      .select('id, category_id')
      .eq('is_active', true)
      .is('icon_slug', null)
      .range(offset, offset + batchSize - 1);

    // Filter by category if specified
    if (categoryId && categoryId !== 'all') {
      questionsQuery = questionsQuery.eq('category_id', categoryId);
    }

    const { data: questions, error: questionsError } = await questionsQuery;

    if (questionsError) {
      console.error('Error fetching questions:', questionsError);
      throw questionsError;
    }

    console.log(`Found ${questions?.length || 0} questions without icons`);

    if (!questions || questions.length === 0) {
      return new Response(
        JSON.stringify({ 
          processed: 0, 
          assigned: 0, 
          remaining: 0,
          message: 'No questions without icons found' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all categories with their icon_slug
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('id, name, icon_slug');

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError);
      throw categoriesError;
    }

    console.log(`Loaded ${categories?.length || 0} categories`);

    // Create a map: category UUID (id) -> icon_slug
    const categoryIconMap = new Map<string, string>();
    categories?.forEach(cat => {
      if (cat.icon_slug) {
        categoryIconMap.set(cat.id, cat.icon_slug);
        console.log(`Category mapping: ${cat.name} (${cat.id}) -> ${cat.icon_slug}`);
      }
    });

    // Update questions with their category's icon_slug
    let assignedCount = 0;

    for (const question of questions) {
      const iconSlug = categoryIconMap.get(question.category_id);
      
      if (iconSlug) {
        const { error } = await supabase
          .from('questions')
          .update({ icon_slug: iconSlug })
          .eq('id', question.id);
        
        if (error) {
          console.error(`Error updating question ${question.id}:`, error);
        } else {
          assignedCount++;
        }
      } else {
        console.log(`No icon_slug found for category_id: ${question.category_id}`);
      }
    }

    // Count remaining questions without icons
    let remainingQuery = supabase
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .is('icon_slug', null);

    if (categoryId && categoryId !== 'all') {
      remainingQuery = remainingQuery.eq('category_id', categoryId);
    }

    const { count: remaining } = await remainingQuery;

    console.log(`Batch complete: processed=${questions.length}, assigned=${assignedCount}, remaining=${remaining}`);

    return new Response(
      JSON.stringify({
        processed: questions.length,
        assigned: assignedCount,
        remaining: remaining || 0,
        message: `Assigned ${assignedCount} icons from category icon_slugs`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in batch-assign-icons-category:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
