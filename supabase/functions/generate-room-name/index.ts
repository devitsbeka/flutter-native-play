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

// Simple fallback names for when AI fails
const FALLBACK_NAMES = [
  "IQ ბრძოლა", "გენიოსები", "ჭკვიანები", "ერუდიტები",
  "მცოდნეები", "მეცნიერები", "კვიზმანიები", "ტვინები",
  "გონიერები", "გამარჯვებულები", "ლიდერები"
];

// Curated keyword-to-slug fallback map for common trivia themes
const THEME_ICON_FALLBACKS: Record<string, string[]> = {
  // Knowledge themes
  'brain': ['brain', 'head', 'mind', 'thinking'],
  'smart': ['brain', 'lightbulb', 'genius'],
  'genius': ['lightbulb', 'brain', 'star'],
  'lightbulb': ['lightbulb', 'bulb', 'idea'],
  'idea': ['lightbulb', 'bulb', 'brain'],
  'think': ['brain', 'head', 'thinking'],
  
  // Competition themes
  'battle': ['sword', 'swords', 'fight', 'battle'],
  'war': ['shield', 'sword', 'battle'],
  'champion': ['trophy', 'medal', 'winner', 'cup'],
  'trophy': ['trophy', 'cup', 'award', 'prize'],
  'winner': ['medal', 'trophy', 'star', 'crown'],
  'crown': ['crown', 'king', 'queen', 'royal'],
  'medal': ['medal', 'award', 'badge'],
  
  // Knowledge/education themes
  'book': ['book', 'books', 'reading', 'library'],
  'science': ['flask', 'beaker', 'atom', 'science'],
  'scientist': ['scientist', 'flask', 'lab'],
  'wizard': ['wizard', 'magic', 'wand', 'hat'],
  'magic': ['wand', 'magic', 'wizard', 'star'],
  'knowledge': ['book', 'brain', 'graduation'],
  
  // Speed/energy themes  
  'lightning': ['lightning', 'bolt', 'thunder', 'flash'],
  'fast': ['rocket', 'lightning', 'speed'],
  'rocket': ['rocket', 'spaceship', 'space'],
  'star': ['star', 'stars', 'sparkle'],
  'fire': ['fire', 'flame', 'hot'],
  
  // Fun/game themes
  'quiz': ['question', 'quiz', 'trivia'],
  'game': ['gamepad', 'controller', 'dice'],
  'puzzle': ['puzzle', 'jigsaw', 'piece'],
  'target': ['target', 'bullseye', 'aim'],
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

// Search for icons matching keywords
async function searchIconByKeyword(
  supabase: SupabaseClient,
  keyword: string
): Promise<string | null> {
  const normalizedKeyword = keyword.toLowerCase().trim();
  
  // First try direct keyword search in title
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

    // Use AI to generate BOTH a creative name AND matching icon keyword
    const prompt = `შექმენი ქართული სახელი ტრივია თამაშის ოთახისთვის და შესაბამისი აიკონის საძიებო სიტყვა.

მოთხოვნები სახელისთვის:
- მაქსიმუმ 18 სიმბოლო (ჩათვლით სფეისი)
- 1-2 სიტყვა მაქსიმუმ
- კრეატიული და სახალისო
- მხოლოდ ქართული (IQ შეიძლება), არანაირი emoji

აიკონის სიტყვა უნდა იყოს:
- ინგლისურად, მხოლოდ 1 სიტყვა
- რომელიც შეესაბამება სახელის თემას
- მაგალითად: brain, trophy, star, book, lightning, rocket, crown, wizard, medal, fire, puzzle

დააბრუნე JSON ფორმატში:
{"name": "სახელი აქ", "icon_keyword": "keyword"}

მაგალითები:
{"name": "ტვინების ომი", "icon_keyword": "brain"}
{"name": "IQ გენიუსები", "icon_keyword": "lightbulb"}
{"name": "მეცნიერები", "icon_keyword": "scientist"}
{"name": "ვარსკვლავები", "icon_keyword": "star"}
{"name": "ჩემპიონები", "icon_keyword": "trophy"}
{"name": "გონების ომი", "icon_keyword": "battle"}`;

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
