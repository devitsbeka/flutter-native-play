import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mapping from quiz category names to icon library categories
const QUIZ_TO_ICON_CATEGORY: Record<string, string[]> = {
  // Georgian categories
  'სპორტი': ['Sports'],
  'კინო': ['Entertainment & Leisure'],
  'მუსიკა': ['Entertainment & Leisure'],
  'გეოგრაფია': ['Places & Structures', 'Countries'],
  'ისტორია': ['History & Culture', 'Historical Figures'],
  'მეცნიერება': ['Space & Science'],
  'ლიტერატურა': ['History & Culture'],
  'ხელოვნება': ['Fashion & Style'],
  'ტექნოლოგია': ['Space & Science'],
  'საჭმელი': ['Food & Cooking'],
  'ბიოლოგია': ['Animals', 'Space & Science'],
  'ქიმია': ['Space & Science'],
  'მათემატიკა': ['Space & Science'],
  'ფიზიკა': ['Space & Science'],
  'ასტროლოგია': ['Space & Science'],
  'ეკოლოგია': ['Animals', 'Space & Science'],
  'ეკონომიკა': ['Business & Money'],
  'ფსიქოლოგია': ['Space & Science'],
  'მედიცინა': ['Space & Science'],
  'არქეოლოგია': ['History & Culture'],
  'რობოტიკა და AI': ['Space & Science'],
  'თანამედროვე ტექნოლოგიები': ['Space & Science'],
  'მემები': ['Entertainment & Leisure'],
  'სახალისო ფაქტები': ['Entertainment & Leisure'],
  'მითი თუ რეალობა': ['Entertainment & Leisure'],
  'სერიალები': ['Entertainment & Leisure'],
  'ანიმე': ['Entertainment & Leisure'],
  'სოციალური მედია': ['Entertainment & Leisure'],
  'პაპარაცი': ['Entertainment & Leisure'],
  'მოდა': ['Fashion & Style'],
  'რელიგია': ['History & Culture'],
  'ცხოველები': ['Animals'],
  'ბუნება': ['Animals', 'Places & Structures'],
  'ფერწერა': ['Fashion & Style'],
  'არქიტექტურა': ['Places & Structures'],
  'სამხედრო ისტორია': ['History & Culture', 'Historical Figures'],
  'გეო-ისტორია': ['History & Culture', 'Countries'],
};

function getIconCategoriesForQuiz(categoryName: string): string[] {
  const normalized = categoryName.toLowerCase().trim();
  
  if (QUIZ_TO_ICON_CATEGORY[categoryName]) {
    return QUIZ_TO_ICON_CATEGORY[categoryName];
  }
  
  if (QUIZ_TO_ICON_CATEGORY[normalized]) {
    return QUIZ_TO_ICON_CATEGORY[normalized];
  }
  
  for (const [key, value] of Object.entries(QUIZ_TO_ICON_CATEGORY)) {
    if (normalized.includes(key.toLowerCase()) || key.toLowerCase().includes(normalized)) {
      return value;
    }
  }
  
  return ['Entertainment & Leisure'];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { categoryId, batchSize = 100, offset = 0 } = await req.json();

    console.log(`Processing batch: categoryId=${categoryId}, batchSize=${batchSize}, offset=${offset}`);

    // Get questions without icons
    let query = supabase
      .from('questions')
      .select('id, question_text, category_id')
      .eq('is_active', true)
      .is('icon_slug', null)
      .range(offset, offset + batchSize - 1);

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data: questions, error: questionsError } = await query;

    if (questionsError) {
      console.error('Error fetching questions:', questionsError);
      throw questionsError;
    }

    if (!questions || questions.length === 0) {
      return new Response(JSON.stringify({ 
        processed: 0, 
        assigned: 0, 
        remaining: 0,
        message: 'No questions to process' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all categories for mapping
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name');

    const categoryMap = new Map(categories?.map(c => [c.id, c.name]) || []);

    // Get all icons from library grouped by category
    const { data: allIcons, error: iconsError } = await supabase
      .from('icon_library')
      .select('slug, category');

    if (iconsError) {
      console.error('Error fetching icons:', iconsError);
      throw iconsError;
    }

    // Group icons by category
    const iconsByCategory = new Map<string, string[]>();
    allIcons?.forEach(icon => {
      if (!iconsByCategory.has(icon.category)) {
        iconsByCategory.set(icon.category, []);
      }
      iconsByCategory.get(icon.category)!.push(icon.slug);
    });

    console.log(`Loaded ${allIcons?.length || 0} icons across ${iconsByCategory.size} categories`);

    // Process each question
    const updates: { id: string; icon_slug: string }[] = [];

    for (const question of questions) {
      const categoryName = categoryMap.get(question.category_id) || '';
      const iconCategories = getIconCategoriesForQuiz(categoryName);
      
      // Collect all icons from matching categories
      const availableIcons: string[] = [];
      for (const iconCat of iconCategories) {
        const icons = iconsByCategory.get(iconCat);
        if (icons) {
          availableIcons.push(...icons);
        }
      }

      if (availableIcons.length > 0) {
        // Pick a random icon from available ones
        const randomIcon = availableIcons[Math.floor(Math.random() * availableIcons.length)];
        updates.push({ id: question.id, icon_slug: randomIcon });
      }
    }

    console.log(`Assigning icons to ${updates.length} questions`);

    // Batch update questions with icons
    let assignedCount = 0;
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('questions')
        .update({ icon_slug: update.icon_slug })
        .eq('id', update.id);

      if (!updateError) {
        assignedCount++;
      } else {
        console.error(`Failed to update question ${update.id}:`, updateError);
      }
    }

    // Get remaining count
    let remainingQuery = supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .is('icon_slug', null);

    if (categoryId) {
      remainingQuery = remainingQuery.eq('category_id', categoryId);
    }

    const { count: remaining } = await remainingQuery;

    console.log(`Batch complete: processed=${questions.length}, assigned=${assignedCount}, remaining=${remaining}`);

    return new Response(JSON.stringify({ 
      processed: questions.length,
      assigned: assignedCount,
      remaining: remaining || 0,
      message: `Assigned ${assignedCount} icons`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in batch-assign-icons-category:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
