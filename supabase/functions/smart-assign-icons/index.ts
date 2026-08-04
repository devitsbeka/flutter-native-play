import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { AI_CHAT_URL, AI_API_KEY, aiModel } from "../_shared/ai.ts";

interface Question {
  id: string;
  question_text: string;
  category_id: string;
  correct_answer: string;
}

interface AIAnalysisResult {
  keywords: string[];
  topics: string[];
  era?: string;
  region?: string;
}

// Keyword mappings for better icon matching
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
  
  // Specific historical figures/topics
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
};

// Icons that should NOT be assigned when answer contains related terms
const ANSWER_ICON_BLOCKLIST: Record<string, string[]> = {
  'sun': ['მზე', 'მზის', 'სინათლე', 'sunlight', 'sunshine', 'solar'],
  'moon': ['მთვარე', 'მთვარის', 'lunar', 'moonlight'],
  'blood': ['სისხლ', 'სისხლი', 'სისხლით', 'blood'],
  'water': ['წყალ', 'წყალი', 'water'],
  'fire': ['ცეცხლ', 'ცეცხლი', 'fire', 'flame'],
  'crown': ['გვირგვინ', 'გვირგვინი', 'crown'],
  'sword': ['ხმალ', 'ხმალი', 'sword'],
  'cross': ['ჯვარ', 'ჯვარი', 'cross'],
  'heart': ['გულ', 'გული', 'heart'],
  'gold': ['ოქრო', 'ოქროს', 'gold', 'golden'],
  'lion': ['ლომ', 'ლომი'],
  'eagle': ['არწივ', 'არწივი'],
  'church': ['ეკლესია', 'ეკლესიის', 'church'],
  'wine': ['ღვინო', 'ღვინის', 'wine'],
};

// Check if an icon would reveal the answer
function iconRevealsAnswer(slug: string, answer: string): boolean {
  if (!answer) return false;
  
  const normalizedSlug = slug.toLowerCase();
  const normalizedAnswer = answer.toLowerCase();
  
  // Georgian transliteration
  const GEORGIAN_TO_ENGLISH: Record<string, string> = {
    'ა': 'a', 'ბ': 'b', 'გ': 'g', 'დ': 'd', 'ე': 'e',
    'ვ': 'v', 'ზ': 'z', 'თ': 't', 'ი': 'i', 'კ': 'k',
    'ლ': 'l', 'მ': 'm', 'ნ': 'n', 'ო': 'o', 'პ': 'p',
    'ჟ': 'zh', 'რ': 'r', 'ს': 's', 'ტ': 't', 'უ': 'u',
    'ფ': 'f', 'ქ': 'k', 'ღ': 'gh', 'ყ': 'q', 'შ': 'sh',
    'ჩ': 'ch', 'ც': 'ts', 'ძ': 'dz', 'წ': 'ts', 'ჭ': 'ch',
    'ხ': 'kh', 'ჯ': 'j', 'ჰ': 'h'
  };
  
  let transliteratedAnswer = '';
  for (const char of answer) {
    transliteratedAnswer += GEORGIAN_TO_ENGLISH[char] || char;
  }
  transliteratedAnswer = transliteratedAnswer.toLowerCase();
  
  // Check blocklist
  for (const [iconKey, answerVariants] of Object.entries(ANSWER_ICON_BLOCKLIST)) {
    if (normalizedSlug.includes(iconKey)) {
      for (const variant of answerVariants) {
        if (normalizedAnswer.includes(variant.toLowerCase()) || 
            transliteratedAnswer.includes(variant.toLowerCase())) {
          console.log(`Blocked icon "${slug}" - reveals answer "${answer}"`);
          return true;
        }
      }
    }
  }
  
  // Direct match check
  if (transliteratedAnswer.includes(normalizedSlug) && normalizedSlug.length >= 4) {
    return true;
  }
  
  return false;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { categoryId, batchSize = 20, offset = 0, resetFirst = false, brokenSlugs = [] } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Create set of broken slugs for O(1) lookup
    const brokenSet = new Set<string>(brokenSlugs);
    console.log(`Excluding ${brokenSet.size} broken icons from assignment`);

    // Get ALL categories for fallback lookup (we need icon_slug for each)
    const { data: allCategories, error: allCatError } = await supabase
      .from('categories')
      .select('id, category_id, name, icon_slug');
    
    if (allCatError) {
      console.error('Error fetching categories:', allCatError);
      throw new Error('Failed to fetch categories');
    }

    // Build category icon lookup map (category_id -> icon_slug)
    const categoryIconMap = new Map<string, string>();
    allCategories?.forEach(cat => {
      if (cat.icon_slug && !brokenSet.has(cat.icon_slug)) {
        categoryIconMap.set(cat.id, cat.icon_slug);
      }
    });
    console.log(`Category fallback map has ${categoryIconMap.size} valid icons`);

    // Find target category if filtering
    let targetCategory = null;
    if (categoryId) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(categoryId);
      targetCategory = allCategories?.find(c => 
        isUuid ? c.id === categoryId : c.category_id === categoryId
      );
      if (!targetCategory) {
        throw new Error(`Category not found: ${categoryId}`);
      }
    }

    // Reset icons if requested
    if (resetFirst && targetCategory) {
      console.log(`Resetting icons for category: ${targetCategory.name}`);
      const { error: resetError } = await supabase
        .from('questions')
        .update({ icon_slug: null })
        .eq('category_id', targetCategory.id);
      
      if (resetError) {
        console.error('Error resetting icons:', resetError);
      }
    }

    // Fetch questions without icons (include correct_answer for validation)
    let questionsQuery = supabase
      .from('questions')
      .select('id, question_text, category_id, correct_answer')
      .is('icon_slug', null)
      .eq('is_active', true)
      .range(offset, offset + batchSize - 1);

    if (targetCategory) {
      questionsQuery = questionsQuery.eq('category_id', targetCategory.id);
    }

    const { data: questions, error: questionsError } = await questionsQuery;

    if (questionsError) {
      console.error('Error fetching questions:', questionsError);
      throw new Error('Failed to fetch questions');
    }

    if (!questions || questions.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        processed: 0,
        assigned: 0,
        remaining: 0,
        message: 'No questions to process'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Processing ${questions.length} questions for smart icon assignment`);

    // Get all available icons from icon_library
    const { data: icons, error: iconsError } = await supabase
      .from('icon_library')
      .select('slug, title, tags, category');

    if (iconsError) {
      console.error('Error fetching icons:', iconsError);
      throw new Error('Failed to fetch icon library');
    }

    // Filter out broken icons
    const validIcons = icons?.filter(i => !brokenSet.has(i.slug)) || [];
    console.log(`${validIcons.length} valid icons after excluding ${brokenSet.size} broken`);

    const iconSlugs = new Set(validIcons.map(i => i.slug));
    const iconsByTag: Record<string, string[]> = {};
    
    // Build tag-to-slug index (only valid icons)
    validIcons.forEach(icon => {
      const allTags = [...(icon.tags || []), icon.title?.toLowerCase(), icon.category?.toLowerCase()].filter(Boolean);
      allTags.forEach(tag => {
        const normalizedTag = tag.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!iconsByTag[normalizedTag]) iconsByTag[normalizedTag] = [];
        if (!iconsByTag[normalizedTag].includes(icon.slug)) {
          iconsByTag[normalizedTag].push(icon.slug);
        }
      });
    });

    let assigned = 0;
    const results: { id: string; icon_slug: string | null; method: string }[] = [];

    for (const question of questions) {
      let matchedIcon: string | null = null;
      let matchMethod = 'none';

      // Step 1: Use AI to analyze question if API key available
      let aiKeywords: string[] = [];
      if (AI_API_KEY) {
        try {
          const aiResult = await analyzeQuestionWithAI(question.question_text, AI_API_KEY);
          if (aiResult) {
            aiKeywords = [...aiResult.keywords, ...aiResult.topics];
            if (aiResult.era) aiKeywords.push(aiResult.era);
            if (aiResult.region) aiKeywords.push(aiResult.region);
          }
        } catch (e) {
          console.log(`AI analysis failed for question ${question.id}, using fallback`);
        }
      }

      // Step 2: Extract keywords from question text (fallback/supplement)
      const textKeywords = extractKeywords(question.question_text);
      const allKeywords = [...new Set([...aiKeywords, ...textKeywords])];

      console.log(`Question: "${question.question_text.substring(0, 50)}..." Keywords: ${allKeywords.slice(0, 5).join(', ')}`);

      // Step 3: Try to find matching icon
      for (const keyword of allKeywords) {
        const normalizedKw = keyword.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        // Check topic mappings first
        const topicIcons = TOPIC_TO_ICONS[normalizedKw];
        if (topicIcons) {
          for (const slug of topicIcons) {
            // Skip if this icon reveals the answer
            if (iconRevealsAnswer(slug, question.correct_answer)) {
              continue;
            }
            if (iconSlugs.has(slug)) {
              matchedIcon = slug;
              matchMethod = 'topic-mapping';
              break;
            }
          }
          if (matchedIcon) break;
        }

        // Check exact slug match (but validate it doesn't reveal answer)
        if (iconSlugs.has(normalizedKw) && !iconRevealsAnswer(normalizedKw, question.correct_answer)) {
          matchedIcon = normalizedKw;
          matchMethod = 'exact-slug';
          break;
        }

        // REMOVED: partial-slug and tag-match - too weak/generic, causes wrong assignments
        // These were matching icons like "vinyl-record" to unrelated categories
      }

      // Step 4: Use category default as fallback (works for ALL questions, not just filtered category)
      if (!matchedIcon) {
        const categoryFallback = categoryIconMap.get(question.category_id);
        if (categoryFallback) {
          matchedIcon = categoryFallback;
          matchMethod = 'category-fallback';
        }
      }

      results.push({ id: question.id, icon_slug: matchedIcon, method: matchMethod });

      if (matchedIcon) {
        const { error: updateError } = await supabase
          .from('questions')
          .update({ icon_slug: matchedIcon })
          .eq('id', question.id);

        if (!updateError) {
          assigned++;
          console.log(`Assigned ${matchedIcon} to question (${matchMethod})`);
          
          // Log to assignment history
          const categoryName = allCategories?.find(c => c.id === question.category_id)?.name;
          await supabase
            .from('icon_assignment_history')
            .insert({
              question_id: question.id,
              question_text: question.question_text.substring(0, 200),
              old_icon_slug: null,
              new_icon_slug: matchedIcon,
              assignment_method: matchMethod,
              category_id: question.category_id,
              category_name: categoryName || null,
              assigned_by: null
            });
        } else {
          console.error(`Failed to update question ${question.id}:`, updateError);
        }
      }

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Count remaining
    let remainingQuery = supabase
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .is('icon_slug', null)
      .eq('is_active', true);

    if (targetCategory) {
      remainingQuery = remainingQuery.eq('category_id', targetCategory.id);
    }

    const { count: remaining } = await remainingQuery;

    // Calculate icon variety stats
    let varietyQuery = supabase
      .from('questions')
      .select('icon_slug')
      .eq('is_active', true)
      .not('icon_slug', 'is', null);

    if (targetCategory) {
      varietyQuery = varietyQuery.eq('category_id', targetCategory.id);
    }

    const { data: assignedIcons } = await varietyQuery;
    const uniqueIcons = new Set(assignedIcons?.map(q => q.icon_slug) || []);

    return new Response(JSON.stringify({
      success: true,
      processed: questions.length,
      assigned,
      remaining: remaining || 0,
      uniqueIcons: uniqueIcons.size,
      totalWithIcons: assignedIcons?.length || 0,
      methodBreakdown: results.reduce((acc, r) => {
        acc[r.method] = (acc[r.method] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      category: targetCategory?.name || 'all',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in smart-assign-icons:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function analyzeQuestionWithAI(questionText: string, apiKey: string): Promise<AIAnalysisResult | null> {
  try {
    const response = await fetch(AI_CHAT_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: aiModel('google/gemini-2.5-flash'),
        messages: [
          {
            role: 'system',
            content: `You are an icon keyword extractor. Given a trivia question (often in Georgian), extract keywords that would help find a relevant icon.

Return JSON with:
- keywords: 3-5 English words for visual concepts (e.g., "pyramid", "sword", "crown")
- topics: 1-3 topic categories (e.g., "egypt", "medieval", "war")
- era: historical period if applicable (e.g., "ancient", "ww2", "renaissance")
- region: geographic region if applicable (e.g., "rome", "china", "greece")

Focus on VISUAL and CONCRETE concepts that would make good icons.`
          },
          {
            role: 'user',
            content: questionText
          }
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      console.log('AI API error:', response.status);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) return null;

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      keywords: parsed.keywords || [],
      topics: parsed.topics || [],
      era: parsed.era,
      region: parsed.region,
    };
  } catch (e) {
    console.error('AI analysis error:', e);
    return null;
  }
}

function extractKeywords(text: string): string[] {
  // Georgian to English keyword mapping
  const georgianKeywords: Record<string, string> = {
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
  };

  const keywords: string[] = [];
  const lowerText = text.toLowerCase();

  // Check Georgian keywords
  for (const [ge, en] of Object.entries(georgianKeywords)) {
    if (lowerText.includes(ge.toLowerCase())) {
      keywords.push(en);
    }
  }

  // Extract potential English words
  const englishWords = text.match(/[a-zA-Z]{4,}/g) || [];
  keywords.push(...englishWords.map(w => w.toLowerCase()));

  return [...new Set(keywords)];
}
