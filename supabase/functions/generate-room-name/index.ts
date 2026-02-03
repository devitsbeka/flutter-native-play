import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

// Banned inappropriate Georgian words
const BANNED_WORDS = [
  'ტრაკი', 'განავალი', 'ფურთხი', 'ბოზი', 'შევეცი', 'მოვეცი', 
  'ტყვნა', 'მუტელი', 'ყლე', 'ქერა', 'დედა', 'მამა', 'შენი'
];

// Max character limit for room names
const MAX_NAME_LENGTH = 18;

// Fun fallback names for trivia rooms - exciting themes! (30+ unique options)
const FALLBACK_NAMES = [
  // Battle themes
  "ტვინების არენა",   // Brain Arena
  "გონების რინგი",    // Mind Ring
  "IQ დუელი",         // IQ Duel
  "ჭიდაობა გონებით",  // Wrestling with Mind
  "გონების ბრძოლა",   // Mind Battle
  // Team themes  
  "გენიოსთა კლუბი",   // Genius Club
  "ჭკვიანთა ბანდა",   // Smart Gang
  "ნერდთა კლანი",     // Nerd Clan
  "ტრიბა IQ",         // IQ Tribe
  "ერუდიტთა სახლი",   // Erudites House
  // Fun themes
  "გონების რეივი",    // Mind Rave
  "ტვინის დისკო",     // Brain Disco
  "კვიზ ფესტი",       // Quiz Fest
  "გონების ზეიმი",    // Mind Celebration
  // Epic themes
  "დრაკონთა კლუბი",   // Dragon Club
  "ნინჯა ტვინები",    // Ninja Brains
  "ფენიქსის ბრძოლა",  // Phoenix Battle
  "ლომთა ბრძოლა",     // Lions' Battle
  "მგლის ხროვა",      // Wolf Pack
  "არწივის მზერა",    // Eagle's Gaze
  "ვეფხვის გუნდი",    // Tiger Team
  "დათვის ბუნაგი",    // Bear's Den
  // Victory themes
  "ჩემპიონთა რინგი",  // Champions Ring
  "მედლების კლუბი",   // Medals Club
  "გამარჯვებულები",   // Winners
  "თასის მეტოქენი",   // Cup Contenders
  "გვირგვინის მცველი",// Crown Keeper
  // Smart themes
  "ერუდიტების კლანი", // Erudites Clan
  "ინტელექტის ხიდი",  // Bridge of Intellect
  "სიბრძნის კოშკი",   // Tower of Wisdom
];

// Curated keyword-to-slug fallback map for fun trivia themes
const THEME_ICON_FALLBACKS: Record<string, string[]> = {
  // Battle/Competition themes
  'arena': ['arena', 'colosseum', 'stadium', 'ring', 'amphitheater'],
  'duel': ['sword', 'fencing', 'swords', 'fight', 'crossed-swords'],
  'ring': ['boxing', 'ring', 'fight', 'arena', 'wrestling'],
  'battle': ['sword', 'swords', 'fight', 'battle', 'shield'],
  'war': ['shield', 'sword', 'battle', 'helmet', 'warrior'],
  'boxing': ['boxing', 'gloves', 'fight', 'punch'],
  'knight': ['knight', 'armor', 'sword', 'shield', 'helmet'],
  'sword': ['sword', 'swords', 'blade', 'fight', 'crossed-swords'],
  'shield': ['shield', 'defense', 'armor', 'knight'],
  
  // Team/Social themes  
  'club': ['friends', 'group', 'party', 'team', 'people'],
  'gang': ['group', 'friends', 'team', 'squad', 'people'],
  'team': ['team', 'group', 'friends', 'people', 'squad'],
  'friends': ['friends', 'group', 'people', 'team'],
  'party': ['party', 'celebration', 'confetti', 'fireworks', 'balloon'],
  
  // Mythical/Epic themes
  'dragon': ['dragon', 'fire', 'knight', 'monster', 'creature'],
  'phoenix': ['phoenix', 'fire', 'flame', 'bird', 'rebirth'],
  'ninja': ['ninja', 'samurai', 'warrior', 'mask', 'shuriken'],
  'samurai': ['samurai', 'ninja', 'warrior', 'sword', 'katana'],
  'wizard': ['wizard', 'magic', 'wand', 'hat', 'sorcerer'],
  'lion': ['lion', 'crown', 'king', 'beast', 'mane'],
  'tiger': ['tiger', 'stripes', 'wild', 'beast', 'cat'],
  'eagle': ['eagle', 'bird', 'flying', 'hawk', 'wings'],
  'wolf': ['wolf', 'pack', 'wild', 'howl', 'beast'],
  'bear': ['bear', 'beast', 'wild', 'grizzly'],
  
  // Victory/Success themes
  'champion': ['trophy', 'medal', 'crown', 'cup', 'winner'],
  'trophy': ['trophy', 'cup', 'award', 'prize', 'winner'],
  'winner': ['medal', 'trophy', 'star', 'crown', 'champion'],
  'crown': ['crown', 'king', 'queen', 'royal', 'throne'],
  'medal': ['medal', 'award', 'badge', 'gold', 'winner'],
  'olympic': ['medal', 'torch', 'olympic', 'rings', 'flame'],
  
  // Fun/Energy themes
  'fireworks': ['fireworks', 'explosion', 'spark', 'celebration'],
  'lightning': ['lightning', 'bolt', 'thunder', 'flash', 'electric'],
  'fire': ['fire', 'flame', 'hot', 'burning'],
  'explosion': ['explosion', 'boom', 'blast', 'fireworks'],
  'rocket': ['rocket', 'spaceship', 'space', 'launch'],
  'star': ['star', 'stars', 'sparkle', 'shine'],
  
  // Brain/Smart themes
  'brain': ['brain', 'head', 'mind', 'thinking', 'smart'],
  'genius': ['lightbulb', 'brain', 'star', 'smart'],
  'lightbulb': ['lightbulb', 'bulb', 'idea', 'smart'],
};

// Icon library row type
interface IconRow {
  slug: string;
  icon_url: string | null;
  title?: string;
  tags?: string[];
}

// Get random fallback name
function getRandomFallbackName(): string {
  return FALLBACK_NAMES[Math.floor(Math.random() * FALLBACK_NAMES.length)];
}

// Validate and clean generated name
function validateAndCleanName(name: string): string {
  if (!name) return getRandomFallbackName();
  
  // Remove quotes
  let cleaned = name.replace(/^["']|["']$/g, '').trim();
  
  // Remove emojis - comprehensive pattern using Unicode properties + keep only Georgian letters, spaces, and basic Latin
  cleaned = cleaned.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim();
  // Filter to keep only Georgian letters, Latin letters (for IQ etc), digits, spaces, and + symbol
  cleaned = cleaned.replace(/[^\u10A0-\u10FFa-zA-Z0-9\s+]/g, '').trim();
  
  // Check for banned words
  const containsBanned = BANNED_WORDS.some(word => 
    cleaned.toLowerCase().includes(word.toLowerCase())
  );
  
  if (containsBanned) {
    return getRandomFallbackName();
  }
  
  // Ensure max 2 words
  const words = cleaned.split(/\s+/).filter(w => w.length > 0);
  if (words.length > 2) {
    cleaned = words.slice(0, 2).join(' ');
  }
  
  // If too long or empty, use fallback
  if (!cleaned || cleaned.length > MAX_NAME_LENGTH) {
    return getRandomFallbackName();
  }
  
  return cleaned;
}

// Search for icons matching keywords - prioritizes exact matches
async function searchIconByKeyword(
  supabase: SupabaseClient,
  keyword: string
): Promise<string | null> {
  const normalizedKeyword = keyword.toLowerCase().trim();
  
  // First try exact title match (highest priority)
  const { data: exactMatches, error: exactError } = await supabase
    .from('icon_library')
    .select('slug, icon_url, title')
    .not('icon_url', 'is', null)
    .ilike('title', normalizedKeyword)
    .limit(5);
  
  if (!exactError && exactMatches && exactMatches.length > 0) {
    const matches = exactMatches as IconRow[];
    const randomMatch = matches[Math.floor(Math.random() * matches.length)];
    console.log(`Found icon by exact title: "${randomMatch.slug}" for keyword "${keyword}"`);
    return randomMatch.icon_url;
  }
  
  // Second try prefix match (title starts with keyword)
  const { data: prefixMatches, error: prefixError } = await supabase
    .from('icon_library')
    .select('slug, icon_url, title')
    .not('icon_url', 'is', null)
    .ilike('title', `${normalizedKeyword}%`)
    .limit(10);
  
  if (!prefixError && prefixMatches && prefixMatches.length > 0) {
    const matches = prefixMatches as IconRow[];
    const randomMatch = matches[Math.floor(Math.random() * matches.length)];
    console.log(`Found icon by prefix: "${randomMatch.slug}" for keyword "${keyword}"`);
    return randomMatch.icon_url;
  }
  
  // Third try partial match (contains keyword)
  const { data: titleMatches, error: titleError } = await supabase
    .from('icon_library')
    .select('slug, icon_url, title')
    .not('icon_url', 'is', null)
    .ilike('title', `%${normalizedKeyword}%`)
    .limit(10);
  
  if (!titleError && titleMatches && titleMatches.length > 0) {
    const matches = titleMatches as IconRow[];
    const randomMatch = matches[Math.floor(Math.random() * matches.length)];
    console.log(`Found icon by title: "${randomMatch.slug}" for keyword "${keyword}"`);
    return randomMatch.icon_url;
  }
  
  // Try tags search
  const { data: tagMatches, error: tagError } = await supabase
    .from('icon_library')
    .select('slug, icon_url, tags')
    .not('icon_url', 'is', null)
    .contains('tags', [normalizedKeyword])
    .limit(10);
  
  if (!tagError && tagMatches && tagMatches.length > 0) {
    const matches = tagMatches as IconRow[];
    const randomMatch = matches[Math.floor(Math.random() * matches.length)];
    console.log(`Found icon by tag: "${randomMatch.slug}" for keyword "${keyword}"`);
    return randomMatch.icon_url;
  }
  
  // Try fallback keywords from theme map
  const fallbackKeywords = THEME_ICON_FALLBACKS[normalizedKeyword];
  if (fallbackKeywords) {
    for (const fallbackKw of fallbackKeywords) {
      const { data: fallbackMatches, error: fallbackError } = await supabase
        .from('icon_library')
        .select('slug, icon_url, title')
        .not('icon_url', 'is', null)
        .ilike('title', `%${fallbackKw}%`)
        .limit(5);
      
      if (!fallbackError && fallbackMatches && fallbackMatches.length > 0) {
        const matches = fallbackMatches as IconRow[];
        const randomMatch = matches[Math.floor(Math.random() * matches.length)];
        console.log(`Found icon by fallback: "${randomMatch.slug}" for keyword "${keyword}" -> "${fallbackKw}"`);
        return randomMatch.icon_url;
      }
    }
  }
  
  console.log(`No icon found for keyword "${keyword}"`);
  return null;
}

// Get random icon as ultimate fallback
async function getRandomIcon(supabase: SupabaseClient): Promise<string | null> {
  const { data: randomIcon, error } = await supabase
    .from('icon_library')
    .select('slug, icon_url')
    .not('icon_url', 'is', null)
    .order('random()')
    .limit(1);
  
  if (!error && randomIcon && randomIcon.length > 0) {
    const icons = randomIcon as IconRow[];
    console.log(`Using random fallback icon: ${icons[0].slug}`);
    return icons[0].icon_url;
  }
  
  return null;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body for optional icon parameter
    let iconSlug: string | null = null;
    try {
      const body = await req.json();
      iconSlug = body?.iconSlug || null;
    } catch {
      // No body or invalid JSON, use AI generation
    }

    let selectedIconUrl: string | null = null;

    // If specific icon requested, find it by slug
    if (iconSlug) {
      const { data: specificIcon, error: specificError } = await supabase
        .from('icon_library')
        .select('slug, title, icon_url')
        .eq('slug', iconSlug)
        .single();
      
      if (!specificError && specificIcon?.icon_url) {
        selectedIconUrl = specificIcon.icon_url;
        console.log(`Using requested icon: ${iconSlug}`);
        
        // Return early with fallback name if icon is specified
        return new Response(
          JSON.stringify({ 
            name: getRandomFallbackName(), 
            icon_url: selectedIconUrl 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // If no AI key, return fallback name with random icon
    if (!lovableApiKey) {
      selectedIconUrl = await getRandomIcon(supabase);
      return new Response(
        JSON.stringify({ 
          name: getRandomFallbackName(), 
          icon_url: selectedIconUrl 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use AI to generate fun, exciting names with matching icons
    // Add random seed to encourage variety
    const randomSeed = Math.floor(Math.random() * 10000);
    const styleIndex = Math.floor(Math.random() * 6);
    const styles = ['Battle', 'Team', 'Epic', 'Victory', 'Animal', 'Smart'];
    const preferredStyle = styles[styleIndex];
    
    const prompt = `[Seed: ${randomSeed}] Generate a UNIQUE Georgian trivia room name in ${preferredStyle} style.

Styles:
- Battle: გონების რინგი, ჭიდაობა გონებით, IQ დუელი
- Team: ნერდთა კლანი, ტრიბა IQ, ერუდიტთა სახლი
- Epic: ფენიქსის ბრძოლა, დრაკონთა კლუბი, ნინჯა ტვინები
- Victory: ჩემპიონთა რინგი, მედლების კლუბი, თასის მეტოქენი
- Animal: მგლის ხროვა, არწივის მზერა, ლომთა ბრძოლა, ვეფხვის გუნდი
- Smart: სიბრძნის კოშკი, ინტელექტის ხიდი, ერუდიტების კლანი

Rules: max 18 chars, 1-2 words, Georgian only (IQ allowed), NO boring words (კვიზი, ტესტი, საკითხავი)
IMPORTANT: Be creative! Avoid repeating examples. Create something NEW and unique!

Return ONLY valid JSON:
{"name": "ქართული_სახელი", "icon_keyword": "english_word"}

icon_keyword examples: dragon, lion, ninja, sword, trophy, crown, phoenix, wolf, eagle, boxing, arena, medal, shield, tiger, bear, wizard, knight, fire, star, brain`;

    console.log('Generating creative room name with matching icon...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      console.error('AI API error:', response.status);
      selectedIconUrl = await getRandomIcon(supabase);
      return new Response(
        JSON.stringify({ 
          name: getRandomFallbackName(), 
          icon_url: selectedIconUrl 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const rawResponse = data.choices?.[0]?.message?.content?.trim() || '';
    
    // Parse AI response as JSON
    let generatedName = getRandomFallbackName();
    let iconKeyword: string | null = null;

    try {
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        generatedName = validateAndCleanName(parsed.name || '');
        iconKeyword = parsed.icon_keyword?.toLowerCase()?.trim() || null;
        console.log(`Parsed AI response: name="${generatedName}", keyword="${iconKeyword}"`);
      } else {
        // Fallback: treat entire response as name (legacy behavior)
        generatedName = validateAndCleanName(rawResponse);
        console.log(`No JSON found, using raw response as name: "${generatedName}"`);
      }
    } catch (e) {
      console.error('Failed to parse AI JSON:', e);
      generatedName = validateAndCleanName(rawResponse);
    }

    // Search for matching icon based on keyword
    if (iconKeyword) {
      selectedIconUrl = await searchIconByKeyword(supabase, iconKeyword);
    }
    
    // Ultimate fallback to random icon
    if (!selectedIconUrl) {
      selectedIconUrl = await getRandomIcon(supabase);
    }

    console.log(`Final result: name="${generatedName}", icon_url="${selectedIconUrl?.substring(0, 50)}..."`);

    return new Response(
      JSON.stringify({ 
        name: generatedName, 
        icon_url: selectedIconUrl 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating room name:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        name: getRandomFallbackName(), 
        icon_url: null,
        error: errorMessage 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
