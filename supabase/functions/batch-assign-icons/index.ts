import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

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
  medieval: ['castle', 'sword', 'knight', 'shield'],
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
  cleopatra: ['nefertiti', 'egyptian-scarab'],
  alexander: ['macedonian', 'helmet', 'sword'],
  genghis: ['mongol', 'horse', 'bow'],
  ottoman: ['crescent', 'sword', 'sultan'],
  king: ['castle', 'throne', 'scepter'],
  queen: ['queen', 'tiara', 'throne'],
  emperor: ['palace', 'scepter', 'throne'],
  
  // Georgian specific
  georgia: ['cross', 'church', 'sword'],
  bagrationi: ['castle', 'cross', 'lion'],
  tamar: ['castle', 'cross', 'scepter'],
  david: ['sword', 'castle', 'church'],
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

// Georgian to English keyword mapping - includes EXACT icon slug names
const GEORGIAN_KEYWORDS: Record<string, string> = {
  // Exact icon slug matches (highest priority)
  'პირამიდ': 'pyramid', 'კოლიზეუმ': 'colosseum', 'სფინქს': 'sphinx',
  'პანთეონ': 'pantheon', 'აკროპოლ': 'acropolis', 'პართენონ': 'parthenon',
  'ნეფერტიტი': 'nefertiti', 'გილიოტინ': 'guillotine', 'კრემლ': 'kremlin',
  'მაჩუ': 'machu-picchu', 'პაგოდ': 'pagoda', 'ტაჯ': 'taj-mahal',
  'სტოუნჰენჯ': 'stonehenge', 'ბიგბენ': 'big-ben', 'ეიფელ': 'eiffel-tower',
  'კოლოს': 'colossus', 'მოაი': 'moai', 'ზიგურატ': 'ziggurat',
  // General topic keywords  
  'ეგვიპტე': 'egypt', 'ფარაონ': 'pharaoh',
  'რომ': 'rome', 'იმპერატორ': 'emperor', 'კეისარ': 'caesar',
  'საბერძნეთ': 'greece', 'ათენ': 'athens', 'სპარტ': 'sparta',
  'ჩინეთ': 'china', 'კედელ': 'wall',
  'ვიკინგ': 'viking', 'შუასაუკუნ': 'medieval',
  'ომ': 'war', 'ბრძოლა': 'battle', 'ჯარ': 'army',
  'რევოლუცია': 'revolution', 'დამოუკიდებლობ': 'independence',
  'მეფე': 'king', 'დედოფალ': 'queen', 'გვირგვინ': 'castle',
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
  
  // 2. FIRST: Check EXACT slug match (HIGHEST PRIORITY!)
  // This ensures "pyramid" question gets "pyramid" icon, not "pharaoh-death-mask"
  for (const keyword of keywords) {
    const normalizedKw = keyword.toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (iconSlugs.has(normalizedKw)) {
      return { slug: normalizedKw, method: 'exact-slug' };
    }
    // Also try without hyphens
    const noHyphenKw = keyword.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (noHyphenKw !== normalizedKw && iconSlugs.has(noHyphenKw)) {
      return { slug: noHyphenKw, method: 'exact-slug' };
    }
  }
  
  // 3. SECOND: Check topic mappings (for related concepts)
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
  
  // 4. Use category default (RELIABLE)
  if (categoryId) {
    const categoryFallback = categoryIconMap.get(categoryId);
    if (categoryFallback) {
      return { slug: categoryFallback, method: 'category-fallback' };
    }
  }
  
  return { slug: null, method: 'none' };
}

// Find better icon match by scanning icon library for relevance to question text
function findBetterIconMatch(
  questionText: string,
  currentIcon: string,
  iconLibrary: IconWithTags[],
  categoryDefaultIcon: string | undefined,
  iconSlugs: Set<string>
): { slug: string | null; method: string; score: number } {
  const keywords = extractKeywords(questionText);
  const lowerText = questionText.toLowerCase();
  
  let bestMatch: { slug: string; method: string; score: number } | null = null;
  let currentScore = 0;
  
  // Calculate score for current icon first
  const currentIconData = iconLibrary.find(i => i.slug === currentIcon);
  if (currentIconData) {
    currentScore = calculateIconScore(currentIconData, keywords, lowerText);
  }
  
  // Find the best matching icon from library
  for (const icon of iconLibrary) {
    if (icon.slug === currentIcon) continue;
    
    const score = calculateIconScore(icon, keywords, lowerText);
    
    // Only consider if score is better than current
    if (score > currentScore && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { slug: icon.slug, method: determineMethod(icon, keywords, lowerText), score };
    }
  }
  
  // Return best match if found
  if (bestMatch && bestMatch.score > currentScore) {
    return bestMatch;
  }
  
  return { slug: null, method: 'no-better-match', score: currentScore };
}

// Calculate relevance score for an icon against question text
function calculateIconScore(
  icon: IconWithTags,
  keywords: string[],
  lowerText: string
): number {
  let score = 0;
  
  // HIGHEST PRIORITY: Exact slug match (25 points!)
  // If keyword exactly matches icon slug, it's the perfect match
  for (const keyword of keywords) {
    const normalizedKw = keyword.toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (icon.slug === normalizedKw) {
      score += 25; // Exact match is highest priority
    }
    // Also check without hyphens
    const noHyphenKw = keyword.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (icon.slug === noHyphenKw) {
      score += 25;
    }
  }
  
  // Check title words (high weight - very specific match)
  const titleWords = icon.title.toLowerCase().split(/[\s-]+/);
  for (const word of titleWords) {
    if (word.length >= 4 && lowerText.includes(word)) {
      score += 10; // Title match is very strong
    }
  }
  
  // Check slug parts
  const slugParts = icon.slug.split('-');
  for (const part of slugParts) {
    if (part.length >= 4 && lowerText.includes(part)) {
      score += 8;
    }
  }
  
  // Check tags (medium weight)
  for (const tag of icon.tags) {
    const normalizedTag = tag.toLowerCase();
    if (keywords.includes(normalizedTag)) {
      score += 5;
    }
    if (normalizedTag.length >= 4 && lowerText.includes(normalizedTag)) {
      score += 4;
    }
  }
  
  // Check topic mappings (reliable)
  for (const keyword of keywords) {
    const normalizedKw = keyword.toLowerCase().replace(/[^a-z0-9]/g, '');
    const topicIcons = TOPIC_TO_ICONS[normalizedKw];
    if (topicIcons && topicIcons.includes(icon.slug)) {
      score += 6;
    }
  }
  
  return score;
}

// Determine the matching method for logging
function determineMethod(
  icon: IconWithTags,
  keywords: string[],
  lowerText: string
): string {
  const titleWords = icon.title.toLowerCase().split(/[\s-]+/);
  for (const word of titleWords) {
    if (word.length >= 4 && lowerText.includes(word)) {
      return 'title-match';
    }
  }
  
  const slugParts = icon.slug.split('-');
  for (const part of slugParts) {
    if (part.length >= 4 && lowerText.includes(part)) {
      return 'slug-match';
    }
  }
  
  for (const tag of icon.tags) {
    if (keywords.includes(tag.toLowerCase())) {
      return 'tag-match';
    }
  }
  
  return 'topic-match';
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
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { categoryId, testMode, brokenSlugs = [], mode = 'assign', offset = 0 } = await req.json();
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

    // DIVERSIFY MODE: Scan ALL questions with icons and find better matches
    if (mode === 'diversify') {
      console.log(`Running DIVERSIFY mode - scanning questions with offset ${offset}...`);
      
      // Get questions that already have icons (paginated by offset)
      const { data: questions, error: queryError } = await supabase
        .from('questions')
        .select('id, question_text, category_id, icon_slug')
        .eq('is_active', true)
        .not('icon_slug', 'is', null)
        .range(offset, offset + batchSize - 1);
      
      if (queryError) {
        console.error(`Query error:`, queryError.message);
        return new Response(
          JSON.stringify({ 
            processed: 0, 
            diversified: 0,
            error: queryError.message,
            done: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (!questions || questions.length === 0) {
        console.log(`No more questions to process at offset ${offset}`);
        return new Response(
          JSON.stringify({ 
            processed: 0, 
            diversified: 0,
            nextOffset: offset,
            done: true,
            message: 'All questions scanned'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log(`Processing ${questions.length} questions starting from offset ${offset}`);
      
      // Process questions and find better icon matches
      const results: { id: string; old_icon: string; new_icon: string | null; method: string }[] = [];
      const methodBreakdown: Record<string, number> = {};
      let totalDiversified = 0;
      
      // Process in chunks
      const chunks = chunkArray(questions, PARALLEL_LIMIT);
      
      for (const chunk of chunks) {
        const chunkResults = await Promise.all(
          chunk.map(async (question) => {
            const categoryDefault = question.category_id ? categoryIconMap.get(question.category_id) : undefined;
            
            // Find better match by analyzing question text against ALL icons
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
              method: match.method,
              score: match.score
            };
          })
        );
        
        // Update questions with better icons
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
            console.log(`Diversified: "${result.question_text.substring(0, 50)}..." ${result.old_icon} → ${result.new_icon} (${result.method})`);
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
      
      // Get total count of questions with icons
      const { count: totalWithIcons } = await supabase
        .from('questions')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true)
        .not('icon_slug', 'is', null);
      
      const nextOffset = offset + questions.length;
      const isDone = questions.length < batchSize;
      
      console.log(`Diversify batch complete: ${totalDiversified} icons improved out of ${results.length} scanned. Next offset: ${nextOffset}, Done: ${isDone}`);
      
      return new Response(
        JSON.stringify({
          processed: results.length,
          diversified: totalDiversified,
          nextOffset,
          totalWithIcons: totalWithIcons || 0,
          methodBreakdown,
          done: isDone
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
