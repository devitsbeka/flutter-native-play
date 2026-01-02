import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// FAST MODE: 5x batch size, no AI calls
const BATCH_SIZE = 250;
const TEST_BATCH_SIZE = 25;
const PARALLEL_LIMIT = 10;
const CHUNK_DELAY_MS = 50;
const OVERUSE_THRESHOLD = 50; // Icons used more than this are considered overused

interface Question {
  id: string;
  question_text: string;
  category_id?: string;
  category_name?: string;
  icon_slug?: string | null;
}

interface IconWithTags {
  slug: string;
  title: string;
  tags: string[];
  category: string;
}

// Topic to icon mappings for keyword-based matching
const TOPIC_TO_ICONS: Record<string, string[]> = {
  // Ancient civilizations
  egypt: ['pharaoh-death-mask', 'pyramid', 'egyptian-scarab', 'egyptian-mummy', 'nefertiti', 'sphinx'],
  pharaoh: ['pharaoh-death-mask', 'pyramid', 'egyptian-mummy', 'nefertiti'],
  rome: ['roman-gladiator-helmet', 'roman-laurel-wreath', 'colosseum', 'roman-toga'],
  roman: ['roman-gladiator-helmet', 'roman-laurel-wreath', 'colosseum'],
  greece: ['greek-amphitheater', 'greek-amphora', 'parthenon', 'greek-lyra'],
  greek: ['greek-amphitheater', 'greek-amphora', 'parthenon'],
  china: ['great-wall-of-china', 'chinese-dragon', 'pagoda', 'forbidden-city'],
  chinese: ['great-wall-of-china', 'chinese-dragon', 'pagoda'],
  viking: ['viking-shield', 'viking-long-boat', 'viking-helmet'],
  medieval: ['castle', 'crown', 'sword', 'knight', 'shield'],
  aztec: ['aztec-sun-stone', 'aztec-mask', 'mayan-pyramid'],
  maya: ['mayan-pyramid', 'mayan-calendar'],
  inca: ['machu-picchu'],
  
  // Wars
  war: ['world-war-ii-sherman-tank', 'world-war-ii-spitfire-fighter', 'pineapple-hand-grenade', 'helmet'],
  battle: ['sword', 'shield', 'helmet', 'cannon'],
  military: ['tank', 'rifle', 'helmet', 'medal'],
  army: ['helmet', 'rifle', 'tank', 'soldier'],
  navy: ['battleship', 'submarine', 'anchor', 'ship'],
  ww1: ['trench', 'helmet', 'cannon', 'biplane'],
  ww2: ['world-war-ii-sherman-tank', 'world-war-ii-spitfire-fighter', 'tank'],
  
  // Politics & Revolution
  revolution: ['guillotine', 'flag', 'torch', 'fist'],
  napoleon: ['napoleon', 'tricorn-hat', 'cannon'],
  independence: ['flag', 'liberty-bell', 'torch'],
  communist: ['hammer-and-sickle', 'red-star'],
  soviet: ['hammer-and-sickle', 'red-star', 'kremlin'],
  democracy: ['vote', 'ballot', 'parliament'],
  
  // Exploration
  explorer: ['compass', 'ship', 'telescope', 'map'],
  discovery: ['compass', 'magnifying-glass', 'ship'],
  columbus: ['ship', 'compass'],
  voyage: ['ship', 'anchor', 'compass'],
  
  // Culture & Religion
  church: ['cross', 'church', 'cathedral'],
  christianity: ['cross', 'bible', 'church'],
  islam: ['crescent', 'mosque'],
  buddhism: ['buddha', 'lotus', 'temple'],
  renaissance: ['mona-lisa', 'paintbrush', 'palette'],
  
  // Science & Invention
  invention: ['lightbulb', 'gear', 'cog'],
  science: ['atom', 'flask', 'microscope'],
  industrial: ['factory', 'gear', 'steam-engine'],
  
  // Historical figures
  cleopatra: ['nefertiti', 'egyptian-scarab', 'crown'],
  alexander: ['macedonian', 'helmet', 'sword'],
  genghis: ['mongol', 'horse', 'bow'],
  ottoman: ['crescent', 'sword', 'sultan'],
  king: ['crown', 'throne', 'scepter'],
  queen: ['crown', 'tiara', 'throne'],
  emperor: ['crown', 'scepter', 'throne'],
  
  // Georgian specific
  georgia: ['cross', 'church', 'sword'],
  bagrationi: ['crown', 'cross', 'lion'],
  tamar: ['crown', 'cross', 'scepter'],
  david: ['sword', 'crown', 'church'],
  mongol: ['mongol', 'horse', 'bow'],
  wine: ['wine', 'grape', 'vineyard'],
  alphabet: ['letter', 'script', 'book'],
  
  // Programming & Technology
  code: ['code', 'terminal', 'laptop'],
  programming: ['code', 'terminal', 'laptop', 'developer'],
  computer: ['computer', 'laptop', 'desktop', 'monitor'],
  software: ['code', 'app', 'software'],
  algorithm: ['flowchart', 'code', 'algorithm'],
  database: ['database', 'server', 'storage'],
  web: ['globe', 'browser', 'internet'],
  python: ['snake', 'code', 'python'],
  javascript: ['code', 'browser', 'web'],
  
  // Geography
  mountain: ['mountain', 'peak', 'summit'],
  ocean: ['ocean', 'wave', 'sea'],
  river: ['river', 'water', 'stream'],
  desert: ['desert', 'cactus', 'sand'],
  forest: ['forest', 'tree', 'nature'],
  island: ['island', 'palm', 'beach'],
  continent: ['globe', 'map', 'world'],
  country: ['flag', 'map', 'globe'],
  capital: ['building', 'city', 'capitol'],
  
  // Sports
  football: ['football', 'soccer', 'goal'],
  basketball: ['basketball', 'hoop', 'court'],
  tennis: ['tennis', 'racket', 'ball'],
  olympics: ['medal', 'torch', 'rings'],
  athlete: ['runner', 'medal', 'trophy'],
  
  // Music & Art
  music: ['music', 'note', 'headphones'],
  art: ['palette', 'brush', 'canvas'],
  painting: ['paint', 'brush', 'canvas'],
  sculpture: ['statue', 'art', 'museum'],
  film: ['film', 'camera', 'movie'],
  theater: ['mask', 'stage', 'drama'],
};

// Georgian to English keyword mapping
const GEORGIAN_KEYWORDS: Record<string, string> = {
  'ეგვიპტე': 'egypt', 'ფარაონ': 'pharaoh', 'პირამიდა': 'pyramid',
  'რომ': 'rome', 'იმპერატორ': 'emperor', 'კეისარ': 'caesar',
  'საბერძნეთ': 'greece', 'ათენ': 'athens', 'სპარტ': 'sparta',
  'ჩინეთ': 'china', 'კედელ': 'wall',
  'ვიკინგ': 'viking', 'შუასაუკუნ': 'medieval',
  'ომ': 'war', 'ბრძოლა': 'battle', 'ჯარ': 'army',
  'რევოლუცია': 'revolution', 'დამოუკიდებლობ': 'independence',
  'მეფე': 'king', 'დედოფალ': 'queen', 'გვირგვინ': 'crown',
  'ეკლესია': 'church', 'მონასტ': 'monastery',
  'აღმოჩენა': 'discovery', 'გეოგრაფ': 'geography',
  'გამოგონება': 'invention', 'მეცნიერ': 'science',
  'ნაპოლეონ': 'napoleon', 'ჰიტლერ': 'hitler',
  'ალექსანდრე': 'alexander', 'კლეოპატრა': 'cleopatra',
  'თამარ': 'tamar', 'დავით': 'david', 'ბაგრატ': 'bagrationi',
  'მსოფლიო': 'world', 'საქართველო': 'georgia',
  'თურქ': 'ottoman', 'სპარს': 'persia', 'მონღოლ': 'mongol',
  'ხმალ': 'sword', 'ფარ': 'shield', 'ჯავშან': 'armor',
  'პროგრამირება': 'programming', 'კოდ': 'code', 'კომპიუტერ': 'computer',
  'ალგორითმ': 'algorithm', 'მონაცემთა': 'database',
  'მთა': 'mountain', 'ზღვა': 'ocean', 'მდინარე': 'river',
  'ფეხბურთ': 'football', 'კალათბურთ': 'basketball',
  'მუსიკა': 'music', 'ხელოვნება': 'art', 'ფილმ': 'film',
};

// Extract keywords from question text
function extractKeywords(text: string): string[] {
  const keywords: string[] = [];
  const lowerText = text.toLowerCase();

  // Check Georgian keywords
  for (const [ge, en] of Object.entries(GEORGIAN_KEYWORDS)) {
    if (lowerText.includes(ge.toLowerCase())) {
      keywords.push(en);
    }
  }

  // Extract potential English words (4+ chars)
  const englishWords = text.match(/[a-zA-Z]{4,}/g) || [];
  keywords.push(...englishWords.map(w => w.toLowerCase()));

  return [...new Set(keywords)];
}

// Match icon for question using keywords (NO AI)
function matchIconForQuestion(
  questionText: string,
  categoryId: string | undefined,
  iconSlugs: Set<string>,
  categoryIconMap: Map<string, string>
): { slug: string | null; method: string } {
  // 1. Extract keywords from question (no AI)
  const keywords = extractKeywords(questionText);
  
  // 2. Check topic mappings (FAST, RELIABLE)
  for (const keyword of keywords) {
    const normalizedKw = keyword.toLowerCase().replace(/[^a-z0-9]/g, '');
    const topicIcons = TOPIC_TO_ICONS[normalizedKw];
    if (topicIcons) {
      const validIcon = topicIcons.find(slug => iconSlugs.has(slug));
      if (validIcon) {
        return { slug: validIcon, method: 'topic-mapping' };
      }
    }
  }
  
  // 3. Check exact slug match
  for (const keyword of keywords) {
    const normalizedKw = keyword.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (iconSlugs.has(normalizedKw)) {
      return { slug: normalizedKw, method: 'exact-slug' };
    }
  }
  
  // 4. Use category default (RELIABLE)
  if (categoryId) {
    const categoryFallback = categoryIconMap.get(categoryId);
    if (categoryFallback) {
      return { slug: categoryFallback, method: 'category-fallback' };
    }
  }
  
  return { slug: null, method: 'none' };
}

// Find better icon match using icon library titles and tags
function findBetterIconMatch(
  questionText: string,
  currentIcon: string,
  iconLibrary: IconWithTags[],
  categoryDefaultIcon: string | undefined,
  iconSlugs: Set<string>
): { slug: string | null; method: string } {
  const keywords = extractKeywords(questionText);
  const lowerText = questionText.toLowerCase();
  
  // Skip if current icon is already the category default
  if (currentIcon === categoryDefaultIcon) {
    return { slug: null, method: 'already-optimal' };
  }
  
  // 1. Check for exact icon title match in question
  for (const icon of iconLibrary) {
    if (icon.slug === currentIcon) continue;
    const titleWords = icon.title.toLowerCase().split(/[\s-]+/);
    for (const word of titleWords) {
      if (word.length >= 4 && lowerText.includes(word)) {
        return { slug: icon.slug, method: 'title-match' };
      }
    }
  }
  
  // 2. Check icon tags for keyword match
  for (const icon of iconLibrary) {
    if (icon.slug === currentIcon) continue;
    for (const tag of icon.tags) {
      const normalizedTag = tag.toLowerCase();
      if (keywords.includes(normalizedTag) && normalizedTag.length >= 3) {
        return { slug: icon.slug, method: 'tag-match' };
      }
    }
  }
  
  // 3. Use topic mappings (expanded)
  for (const keyword of keywords) {
    const normalizedKw = keyword.toLowerCase().replace(/[^a-z0-9]/g, '');
    const topicIcons = TOPIC_TO_ICONS[normalizedKw];
    if (topicIcons) {
      const validIcon = topicIcons.find(slug => iconSlugs.has(slug) && slug !== currentIcon);
      if (validIcon) {
        return { slug: validIcon, method: 'topic-diversify' };
      }
    }
  }
  
  // 4. No better match - return category default
  if (categoryDefaultIcon) {
    return { slug: categoryDefaultIcon, method: 'diversify-to-default' };
  }
  
  return { slug: null, method: 'no-better-match' };
}

// Chunk array into smaller arrays
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { categoryId, testMode, brokenSlugs = [], mode = 'assign' } = await req.json();
    const batchSize = testMode ? TEST_BATCH_SIZE : BATCH_SIZE;
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create set of broken slugs for O(1) lookup
    const brokenSet = new Set<string>(brokenSlugs);
    console.log(`Excluding ${brokenSet.size} broken icons from assignment`);

    // Get ALL categories for fallback lookup
    const { data: allCategories } = await supabase
      .from('categories')
      .select('id, name, icon_slug');
    
    // Build category icon lookup map (category_id -> icon_slug)
    const categoryIconMap = new Map<string, string>();
    const categoryNameMap = new Map<string, string>();
    allCategories?.forEach(cat => {
      if (cat.icon_slug && !brokenSet.has(cat.icon_slug)) {
        categoryIconMap.set(cat.id, cat.icon_slug);
      }
      categoryNameMap.set(cat.id, cat.name);
    });
    console.log(`Category fallback map has ${categoryIconMap.size} valid icons`);

    // Get all valid icons from library (with tags for diversify mode)
    const { data: iconLibraryData } = await supabase
      .from('icon_library')
      .select('slug, title, tags, category');
    
    const iconLibrary: IconWithTags[] = (iconLibraryData || [])
      .filter(i => !brokenSet.has(i.slug))
      .map(i => ({ slug: i.slug, title: i.title, tags: i.tags || [], category: i.category }));
    
    const validIconSlugs = new Set<string>(iconLibrary.map(i => i.slug));
    console.log(`${validIconSlugs.size} valid icons in library`);

    // DIVERSIFY MODE: Find overused icons and try to assign better matches
    if (mode === 'diversify') {
      console.log('Running DIVERSIFY mode...');
      
      // Find overused icons (used more than threshold times)
      // Need to fetch all questions with icons to count manually
      const allIconQuestions: { icon_slug: string }[] = [];
      let page = 0;
      const pageSize = 1000;
      
      while (true) {
        const { data: batch } = await supabase
          .from('questions')
          .select('icon_slug')
          .eq('is_active', true)
          .not('icon_slug', 'is', null)
          .range(page * pageSize, (page + 1) * pageSize - 1);
        
        if (!batch || batch.length === 0) break;
        allIconQuestions.push(...batch.filter(q => q.icon_slug));
        page++;
        if (batch.length < pageSize) break;
      }
      
      console.log(`Fetched ${allIconQuestions.length} questions with icons for counting`);
      
      // Count icon usage
      const usageCount = new Map<string, number>();
      allIconQuestions.forEach(q => {
        if (q.icon_slug) {
          usageCount.set(q.icon_slug, (usageCount.get(q.icon_slug) || 0) + 1);
        }
      });
      
      // Get overused icons
      const overusedIcons = Array.from(usageCount.entries())
        .filter(([_, count]) => count > OVERUSE_THRESHOLD)
        .sort((a, b) => b[1] - a[1])
        .map(([slug, count]) => ({ slug, count }));
      
      console.log(`Found ${overusedIcons.length} overused icons: ${overusedIcons.slice(0, 5).map(i => `${i.slug}(${i.count})`).join(', ')}`);
      
      if (overusedIcons.length === 0) {
        return new Response(
          JSON.stringify({ 
            processed: 0, 
            diversified: 0,
            overusedIcons: [],
            done: true,
            message: 'No overused icons found'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Process questions with overused icons
      const results: { id: string; old_icon: string; new_icon: string | null; method: string }[] = [];
      const methodBreakdown: Record<string, number> = {};
      let totalDiversified = 0;
      
      // Process one overused icon at a time (the most overused first)
      const targetIcon = overusedIcons[0];
      console.log(`Processing overused icon: ${targetIcon.slug} (${targetIcon.count} uses)`);
      
      // Get questions with this icon
      let query = supabase
        .from('questions')
        .select('id, question_text, category_id, icon_slug')
        .eq('icon_slug', targetIcon.slug)
        .eq('is_active', true)
        .limit(batchSize);
      
      if (categoryId && categoryId !== 'all') {
        query = query.eq('category_id', categoryId);
      }
      
      const { data: questions } = await query;
      
      if (!questions || questions.length === 0) {
        return new Response(
          JSON.stringify({ 
            processed: 0, 
            diversified: 0,
            overusedIcons,
            done: false
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log(`Processing ${questions.length} questions with icon ${targetIcon.slug}`);
      
      // Process in chunks
      const chunks = chunkArray(questions, PARALLEL_LIMIT);
      
      for (const chunk of chunks) {
        const chunkResults = await Promise.all(
          chunk.map(async (question) => {
            const categoryDefault = question.category_id ? categoryIconMap.get(question.category_id) : undefined;
            
            const match = findBetterIconMatch(
              question.question_text,
              question.icon_slug!,
              iconLibrary,
              categoryDefault,
              validIconSlugs
            );
            
            return {
              id: question.id,
              category_id: question.category_id,
              question_text: question.question_text,
              old_icon: question.icon_slug!,
              new_icon: match.slug,
              method: match.method
            };
          })
        );
        
        // Update questions with new icons
        for (const result of chunkResults) {
          methodBreakdown[result.method] = (methodBreakdown[result.method] || 0) + 1;
          
          if (result.new_icon && result.new_icon !== result.old_icon) {
            await supabase
              .from('questions')
              .update({ icon_slug: result.new_icon })
              .eq('id', result.id);
            
            // Log to assignment history
            await supabase
              .from('icon_assignment_history')
              .insert({
                question_id: result.id,
                question_text: result.question_text?.substring(0, 200),
                old_icon_slug: result.old_icon,
                new_icon_slug: result.new_icon,
                assignment_method: `diversify:${result.method}`,
                category_id: result.category_id,
                category_name: categoryNameMap.get(result.category_id || ''),
                assigned_by: null
              });
            
            totalDiversified++;
          }
          
          results.push({
            id: result.id,
            old_icon: result.old_icon,
            new_icon: result.new_icon,
            method: result.method
          });
        }
        
        if (chunks.indexOf(chunk) < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, CHUNK_DELAY_MS));
        }
      }
      
      // Get remaining count for this icon
      const { count: remaining } = await supabase
        .from('questions')
        .select('id', { count: 'exact', head: true })
        .eq('icon_slug', targetIcon.slug)
        .eq('is_active', true);
      
      console.log(`Diversify batch complete: ${totalDiversified} icons changed, ${remaining} remaining for ${targetIcon.slug}`);
      
      return new Response(
        JSON.stringify({
          processed: results.length,
          diversified: totalDiversified,
          remaining: remaining || 0,
          targetIcon: targetIcon.slug,
          overusedIcons,
          methodBreakdown,
          done: (remaining || 0) === 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build query for questions without icons
    let query = supabase
      .from('questions')
      .select('id, question_text, category_id')
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

    console.log(`Processing ${questions.length} questions (fast mode, no AI)`);

    // Process questions in parallel chunks
    const chunks = chunkArray(questions, PARALLEL_LIMIT);
    const results: { id: string; icon_slug: string | null; method: string }[] = [];

    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map(async (question) => {
          const match = matchIconForQuestion(
            question.question_text,
            question.category_id,
            validIconSlugs,
            categoryIconMap
          );

          return { 
            id: question.id, 
            category_id: question.category_id,
            question_text: question.question_text,
            icon_slug: match.slug, 
            method: match.method
          };
        })
      );

      results.push(...chunkResults.map(r => ({ id: r.id, icon_slug: r.icon_slug, method: r.method })));

      // Bulk update and log history
      for (const result of chunkResults) {
        if (result.icon_slug) {
          await supabase
            .from('questions')
            .update({ icon_slug: result.icon_slug })
            .eq('id', result.id);
          
          // Log to assignment history
          await supabase
            .from('icon_assignment_history')
            .insert({
              question_id: result.id,
              question_text: result.question_text?.substring(0, 200),
              old_icon_slug: null,
              new_icon_slug: result.icon_slug,
              assignment_method: result.method,
              category_id: result.category_id,
              category_name: categoryNameMap.get(result.category_id || ''),
              assigned_by: null
            });
        }
      }

      // Small delay between chunks
      if (chunks.indexOf(chunk) < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, CHUNK_DELAY_MS));
      }
    }

    // Count successful assignments
    const successfulResults = results.filter(r => r.icon_slug !== null);

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

    // Calculate method breakdown
    const methodBreakdown = results.reduce((acc, r) => {
      acc[r.method] = (acc[r.method] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('Method breakdown:', methodBreakdown);

    return new Response(
      JSON.stringify({
        processed: results.length,
        assigned: successfulResults.length,
        remaining: remaining || 0,
        methodBreakdown,
        results: results.map(r => ({ id: r.id, icon_slug: r.icon_slug, method: r.method })),
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
