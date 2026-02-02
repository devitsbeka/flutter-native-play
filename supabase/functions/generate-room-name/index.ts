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

// Themed room configurations with matching icon slugs
// Each theme has names (plural form) and relevant icon slugs from our 9k library
const THEMED_ROOMS = [
  // Intelligence/Knowledge theme
  {
    category: 'intellect',
    names: ["ერუდიტები", "მცოდნეები", "ბრძენები", "გენიოსები", "მოაზროვნეები", "ჭკვიანები"],
    icons: ["brain", "lightbulb", "idea", "thinking", "graduation-cap", "book", "knowledge"]
  },
  // Famous People theme
  {
    category: 'celebrities',
    names: ["აინშტაინები", "დავინჩები", "ნიუტონები", "პიკასოები", "შექსპირები", "სოკრატეები"],
    icons: ["albert-einstein", "sir-isaac-newton", "marie-curie", "galileo-galilei", "socrates", "leonardo-da-vinci"]
  },
  // Places/Structures theme
  {
    category: 'places',
    names: ["აკადემია", "ობსერვატორია", "ბიბლიოთეკა", "ანტიკა", "ოლიმპო", "პანთეონი"],
    icons: ["library", "observatory", "school", "temple", "castle", "amphitheater", "colosseum"]
  },
  // Challenge/Game theme
  {
    category: 'challenge',
    names: ["ჩემპიონები", "გამარჯვებულები", "ლიდერები", "ნავიგატორები", "მებრძოლები"],
    icons: ["trophy", "gold-medal", "trivia-quiz", "puzzle", "question-mark", "crown", "star"]
  },
  // Smart Animals theme
  {
    category: 'animals',
    names: ["ბუები", "დელფინები", "სპილოები", "მაიმუნები", "ყორნები", "რვაფეხები"],
    icons: ["owl", "dolphin", "elephant", "chimpanzee", "raven", "octopus", "fox"]
  },
  // Science theme
  {
    category: 'science',
    names: ["ასტრონომები", "მეცნიერები", "ფიზიკოსები", "მათემატიკოსები", "ინჟინრები", "ქიმიკოსები"],
    icons: ["scientist", "telescope", "astronaut", "rocket", "microscope", "atom", "flask"]
  },
  // Quiz/Trivia theme
  {
    category: 'quiz',
    names: ["ქვიზერები", "ტრივიელები", "კითხვარები", "გამომცნობები"],
    icons: ["quiz", "question", "answer", "game-controller", "joystick", "puzzle-piece"]
  },
  // Explorers/Adventurers theme
  {
    category: 'explorers',
    names: ["მკვლევარები", "აღმომჩენები", "მოგზაურები", "პიონერები"],
    icons: ["compass", "map", "explorer", "binoculars", "globe", "world-map"]
  }
];

// Get random themed room (name + matching icon slugs)
function getRandomThemedRoom(): { name: string; iconSlugs: string[] } {
  const theme = THEMED_ROOMS[Math.floor(Math.random() * THEMED_ROOMS.length)];
  const name = theme.names[Math.floor(Math.random() * theme.names.length)];
  return { name, iconSlugs: theme.icons };
}

// Flat list of all names for fallback
const ALL_THEMED_NAMES = THEMED_ROOMS.flatMap(theme => theme.names);

// Get random name from all themes
function getRandomTriviaName(): string {
  return ALL_THEMED_NAMES[Math.floor(Math.random() * ALL_THEMED_NAMES.length)];
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
      // No body or invalid JSON, use themed selection
    }

    // Get a themed room (name + matching icon slugs)
    const themedRoom = getRandomThemedRoom();
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

    // If no specific icon, try to find one from the theme's icon list
    if (!selectedIconUrl) {
      // Try each icon slug from the theme until we find one in the library
      for (const slug of themedRoom.iconSlugs) {
        const { data: themeIcon, error: themeError } = await supabase
          .from('icon_library')
          .select('slug, icon_url')
          .ilike('slug', `%${slug}%`)
          .not('icon_url', 'is', null)
          .limit(1)
          .single();
        
        if (!themeError && themeIcon?.icon_url) {
          selectedIconUrl = themeIcon.icon_url;
          console.log(`Found themed icon: ${themeIcon.slug} for theme icons: ${themedRoom.iconSlugs.join(', ')}`);
          break;
        }
      }
    }

    // If still no icon, pick a random one as fallback
    if (!selectedIconUrl) {
      const { data: randomIcon, error: randomError } = await supabase
        .from('icon_library')
        .select('slug, icon_url')
        .not('icon_url', 'is', null)
        .limit(1);
      
      if (!randomError && randomIcon && randomIcon.length > 0) {
        selectedIconUrl = randomIcon[0].icon_url;
        console.log(`Using random fallback icon: ${randomIcon[0].slug}`);
      }
    }

    // If no AI key, return themed name
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ 
          name: themedRoom.name, 
          icon_url: selectedIconUrl 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use AI to generate a creative trivia-themed name
    const prompt = `შექმენი ქართული სახელი ტრივია თამაშის ოთახისთვის.

კონტექსტი: მეგობრები/ოჯახი ეჯიბრებიან ერთმანეთს - ვინ უფრო ჭკვიანია, სწრაფი, მცოდნე.

მოთხოვნები:
- მაქსიმუმ 18 სიმბოლო (ჩათვლით სფეისი)
- 1-2 სიტყვა მაქსიმუმ
- თუ ერთი სიტყვაა, გამოიყენე მრავლობითი რიცხვი (მაგ: "გენიოსები" არა "გენიოსი")
- მხოლოდ ქართული (IQ შეიძლება), არანაირი emoji

თემები (აირჩიე ერთი):
1. ინტელექტი: "ერუდიტები", "მცოდნეები", "ბრძენები", "გენიოსები"
2. ცნობილი პიროვნებები: "აინშტაინები", "დავინჩები", "ნიუტონები"
3. ადგილები: "აკადემია", "ობსერვატორია", "ბიბლიოთეკა"
4. გამოწვევა: "ჩემპიონები", "გამარჯვებულები", "ლიდერები"
5. ჭკვიანი ცხოველები: "ბუები", "დელფინები", "სპილოები"
6. მეცნიერება: "ასტრონომები", "მეცნიერები", "ფიზიკოსები"
7. მკვლევარები: "აღმომჩენები", "მოგზაურები", "პიონერები"

დაბრუნე მხოლოდ სახელი, არაფერი სხვა.`;

    console.log('Generating themed room name...');

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
      // Fallback to themed name
      return new Response(
        JSON.stringify({ 
          name: themedRoom.name, 
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
    const fallback = getRandomThemedRoom();
    return new Response(
      JSON.stringify({ 
        name: fallback.name, 
        icon_url: null,
        error: errorMessage 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
