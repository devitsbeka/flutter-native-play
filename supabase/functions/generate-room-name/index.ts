import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

// Banned inappropriate Georgian words
const BANNED_WORDS = [
  'ტრაკი', 'განავალი', 'ფურთხი', 'ბოზი', 'შევეცი', 'მოვეცი', 
  'ტყვნა', 'მუტელი', 'ყლე', 'ქერა', 'დედა', 'მამა', 'შენი'
];

// Max character limit for room names
const MAX_NAME_LENGTH = 18;

// Trivia-themed room names - all ≤18 characters, focused on intelligence/challenge
const TRIVIA_NAMES = [
  // Intelligence/Knowledge (≤18 chars)
  "IQ არენა",           // 8  - IQ Arena
  "ქვიზ არენა",         // 10 - Quiz Arena
  "გონების არენა",      // 13 - Mind Arena
  "ცოდნის არენა",       // 12 - Knowledge Arena
  "ტვინის შტორმი",      // 13 - Brain Storm
  "ბრძენთა კლუბი",      // 13 - Sages Club
  "გენიოსთა კლუბი",     // 14 - Geniuses Club
  "ჭკუის ტესტი",        // 11 - Wit Test
  "ცოდნის ტესტი",       // 12 - Knowledge Test
  
  // Challenge/Duel (≤18 chars)
  "ტრივია დუელი",       // 12 - Trivia Duel
  "ბრძენთა დუელი",      // 13 - Sages Duel
  "გონების დუელი",      // 13 - Mind Duel
  "ქვიზ შეჯიბრი",       // 12 - Quiz Contest
  "ცოდნის ბრძოლა",      // 13 - Knowledge Battle
  "ჭკუის ბრძოლა",       // 12 - Wit Battle
  "IQ ბატალია",         // 10 - IQ Battle
  "გონების რბოლა",      // 13 - Mind Race
  
  // Team/Friends (≤18 chars)
  "გუნდური ქვიზი",      // 13 - Team Quiz
  "მეგობართა ქვიზი",    // 14 - Friends' Quiz
  "ოჯახის ქვიზი",       // 12 - Family Quiz
  "კომპანიის ქვიზი",    // 15 - Company's Quiz
  "გუნდის არენა",       // 12 - Team Arena
  "საოჯახო დუელი",      // 13 - Family Duel
  
  // Short/Universal (≤12 chars)
  "ქვიზ ზონა",          // 9  - Quiz Zone
  "გონება+",            // 7  - Mind+
  "ცოდნა+",             // 6  - Knowledge+
  "ტრივია+",            // 8  - Trivia+
  "IQ ზონა",            // 7  - IQ Zone
  "ბრძენი",             // 6  - Sage
  "გენიოსი",            // 7  - Genius
  "ჭკვიანები",          // 9  - Smart Ones
  "ერუდიტები",          // 9  - Erudites
  "მცოდნეები",          // 9  - Knowers
];

// Get random trivia name
function getRandomTriviaName(): string {
  return TRIVIA_NAMES[Math.floor(Math.random() * TRIVIA_NAMES.length)];
}

// Validate and clean generated name
function validateAndCleanName(name: string): string {
  if (!name) return getRandomTriviaName();
  
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
    return getRandomTriviaName();
  }
  
  // Ensure max 2 words
  const words = cleaned.split(/\s+/).filter(w => w.length > 0);
  if (words.length > 2) {
    cleaned = words.slice(0, 2).join(' ');
  }
  
  // If too long or empty, use fallback
  if (!cleaned || cleaned.length > MAX_NAME_LENGTH) {
    return getRandomTriviaName();
  }
  
  return cleaned;
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
      // No body or invalid JSON, use random icon
    }

    let selectedIcon: { slug: string; title: string; icon_url: string | null } | null = null;

    // If specific icon requested, find it by slug
    if (iconSlug) {
      const { data: specificIcon, error: specificError } = await supabase
        .from('icon_library')
        .select('slug, title, icon_url, category')
        .eq('slug', iconSlug)
        .single();
      
      if (!specificError && specificIcon) {
        selectedIcon = specificIcon;
        console.log(`Using requested icon: ${iconSlug}`);
      }
    }

    // If no specific icon, pick a random one for visual variety
    if (!selectedIcon) {
      const { data: icons, error: iconError } = await supabase
        .from('icon_library')
        .select('slug, title, icon_url, category')
        .not('icon_url', 'is', null)
        .limit(100);

      if (iconError || !icons || icons.length === 0) {
        console.error('Failed to fetch icons:', iconError);
        // Return just a name without icon
        return new Response(
          JSON.stringify({ 
            name: getRandomTriviaName(), 
            icon_url: null 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      selectedIcon = icons[Math.floor(Math.random() * icons.length)];
    }

    console.log(`Selected icon: ${selectedIcon.slug}`);

    // If no AI key, return random trivia name
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ 
          name: getRandomTriviaName(), 
          icon_url: selectedIcon.icon_url 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use AI to generate a short trivia-themed name
    const prompt = `შექმენი ქართული სახელი ტრივია თამაშის ოთახისთვის.

კონტექსტი: მეგობრები/ოჯახი ეჯიბრებიან ერთმანეთს - ვინ უფრო ჭკვიანია, სწრაფი, მცოდნე.

მოთხოვნები:
- მაქსიმუმ 18 სიმბოლო (ჩათვლით სფეისი)
- 1-2 სიტყვა მაქსიმუმ
- თემა: ინტელექტი, ცოდნა, გამოწვევა, სწრაფი აზროვნება
- მხოლოდ ქართული (IQ შეიძლება), არანაირი emoji

კარგი მაგალითები: "ქვიზ არენა", "IQ ტესტი", "ბრძენთა დუელი", "გონების ბრძოლა", "ტვინის შტორმი"
ცუდი მაგალითები: "ვარსკვლავთა კავშირი" (ძალიან გრძელი), "კოსმოსური ხომალდი" (არ არის ტრივია თემაზე)

დაბრუნე მხოლოდ სახელი, არაფერი სხვა.`;

    console.log('Generating trivia-themed room name...');

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
      // Fallback to random trivia name
      return new Response(
        JSON.stringify({ 
          name: getRandomTriviaName(), 
          icon_url: selectedIcon.icon_url 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const rawName = data.choices?.[0]?.message?.content?.trim() || '';
    
    // Validate and clean the generated name
    const generatedName = validateAndCleanName(rawName);

    console.log(`Generated room name: ${generatedName} (raw: ${rawName}, length: ${generatedName.length})`);

    return new Response(
      JSON.stringify({ 
        name: generatedName, 
        icon_url: selectedIcon.icon_url 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating room name:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        name: getRandomTriviaName(), 
        icon_url: null,
        error: errorMessage 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
