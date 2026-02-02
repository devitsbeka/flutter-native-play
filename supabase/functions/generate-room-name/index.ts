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

// Simple fallback names for when AI fails
const FALLBACK_NAMES = [
  "IQ ბრძოლა", "გენიოსები", "ჭკვიანები", "ერუდიტები",
  "მცოდნეები", "მეცნიერები", "კვიზმანიები", "ტვინები",
  "გონიერები", "გამარჯვებულები", "ლიდერები"
];

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
      // No body or invalid JSON, use random selection
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
      }
    }

    // If no specific icon, get a random one from the library
    if (!selectedIconUrl) {
      const { data: randomIcon, error: iconError } = await supabase
        .from('icon_library')
        .select('slug, icon_url')
        .not('icon_url', 'is', null)
        .order('random()')
        .limit(1);
      
      if (!iconError && randomIcon && randomIcon.length > 0) {
        selectedIconUrl = randomIcon[0].icon_url;
        console.log(`Using random icon: ${randomIcon[0].slug}`);
      }
    }

    // If no AI key, return fallback name
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ 
          name: getRandomFallbackName(), 
          icon_url: selectedIconUrl 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use AI to generate a creative trivia-themed name
    const prompt = `შექმენი ქართული სახელი ტრივია თამაშის ოთახისთვის.

მოთხოვნები:
- მაქსიმუმ 18 სიმბოლო (ჩათვლით სფეისი)
- 1-2 სიტყვა მაქსიმუმ
- კრეატიული და სახალისო
- მხოლოდ ქართული (IQ შეიძლება), არანაირი emoji

მაგალითები: "გონიერები", "IQ კლუბი", "მეცნიერები", "ჭკვიანთა ბრძოლა", "ტვინების ომი"

დაბრუნე მხოლოდ სახელი, არაფერი სხვა.`;

    console.log('Generating creative room name...');

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
      // Fallback to random name
      return new Response(
        JSON.stringify({ 
          name: getRandomFallbackName(), 
          icon_url: selectedIconUrl 
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
