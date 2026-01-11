import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Banned inappropriate Georgian words
const BANNED_WORDS = [
  'ტრაკი', 'განავალი', 'ფურთხი', 'ბოზი', 'შევეცი', 'მოვეცი', 
  'ტყვნა', 'მუტელი', 'ყლე', 'ქერა', 'დედა', 'მამა', 'შენი'
];

// Theme-matched configuration - icons and names are paired by theme
const THEME_CONFIG: Record<string, { categories: string[]; names: string[] }> = {
  cosmic: {
    categories: ['Space & Science'],
    names: [
      "კოსმოსური ხომალდი",      // Cosmic Ship
      "ვარსკვლავთა კავშირი",    // Star Alliance
      "გალაქტიკის მცველები",    // Galaxy Guardians
      "მთვარის მხარე",          // Moon Side
      "კოსმოსური არენა",        // Cosmic Arena
      "ვარსკვლავთა რბოლა",      // Star Race
      "ნისლეულის საიდუმლო",     // Nebula Secret
    ]
  },
  nature: {
    categories: ['Nature & Outdoors', 'Animals'],
    names: [
      "ბუნების მცველები",       // Nature Guardians
      "მწვანე ოაზისი",          // Green Oasis
      "ტყის საიდუმლო",          // Forest Secret
      "მთის მწვერვალი",         // Mountain Peak
      "ველური სამყარო",         // Wild World
      "ბუნების ძალა",           // Nature's Power
    ]
  },
  fantasy: {
    categories: ['Fantasy & Imagination'],
    names: [
      "დრაკონთა ბუდე",          // Dragons' Nest
      "ფენიქსის ფრთები",        // Phoenix Wings
      "ჯადოსნური ტყე",          // Magical Forest
      "მოჯადოებული სასახლე",    // Enchanted Palace
      "ჯადოქართა კლუბი",        // Wizards' Club
      "მითიური სამყარო",        // Mythical World
    ]
  },
  champions: {
    categories: ['Sports'],
    names: [
      "ჩემპიონთა ლიგა",         // Champions' League
      "გამარჯვებულთა კლუბი",    // Winners' Club
      "ტიტანების არენა",        // Titans' Arena
      "ძლევამოსილთა ოთახი",     // Room of the Victorious
      "სპორტული არენა",         // Sports Arena
      "ჩემპიონთა დარბაზი",      // Champions' Hall
    ]
  },
  adventure: {
    categories: ['Places & Structures', 'Vehicles & Transport'],
    names: [
      "მოგზაურთა ბანაკი",       // Travelers' Camp
      "აღმომჩენთა კლუბი",       // Explorers' Club
      "თავგადასავლის გზა",      // Path of Adventure
      "ჰორიზონტის მიღმა",       // Beyond the Horizon
      "მოგზაურთა გილდია",       // Travelers' Guild
      "აღმოჩენის გზა",          // Path of Discovery
    ]
  },
  legends: {
    categories: ['Historical Figures', 'History & Culture'],
    names: [
      "გმირთა არენა",           // Heroes' Arena
      "ლეგენდების ოთახი",       // Room of Legends
      "მითების სამყარო",        // World of Myths
      "დიდებულთა კლუბი",        // Club of the Great
      "ბრძენთა საბჭო",          // Council of Sages
      "ცოდნის ციხე",            // Fortress of Knowledge
    ]
  },
  entertainment: {
    categories: ['Entertainment & Leisure', 'Events'],
    names: [
      "სახალისო კომპანია",      // Fun Company
      "მხიარულთა არენა",        // Arena of the Cheerful
      "მეგობრების ოთახი",       // Friends' Room
      "ხუმრობების კლუბი",       // Jokes Club
      "წვეულების ოთახი",        // Party Room
      "სიცილის კლუბი",          // Laughter Club
    ]
  },
};

// Get all names flattened for fallback
const ALL_INSPIRATIONAL_NAMES = Object.values(THEME_CONFIG).flatMap(t => t.names);

// Get random inspirational name
function getRandomInspirationalName(): string {
  return ALL_INSPIRATIONAL_NAMES[Math.floor(Math.random() * ALL_INSPIRATIONAL_NAMES.length)];
}

// Validate and clean generated name
function validateAndCleanName(name: string): string {
  if (!name) return getRandomInspirationalName();
  
  // Remove quotes
  let cleaned = name.replace(/^["']|["']$/g, '').trim();
  
  // Remove emojis
  cleaned = cleaned.replace(/[\u{1F600}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu, '').trim();
  
  // Check for banned words
  const containsBanned = BANNED_WORDS.some(word => 
    cleaned.toLowerCase().includes(word.toLowerCase())
  );
  
  if (containsBanned) {
    return getRandomInspirationalName();
  }
  
  // Ensure max 2 words
  const words = cleaned.split(/\s+/).filter(w => w.length > 0);
  if (words.length > 2) {
    cleaned = words.slice(0, 2).join(' ');
  }
  
  // If too long or empty, use fallback
  if (!cleaned || cleaned.length > 35) {
    return getRandomInspirationalName();
  }
  
  return cleaned;
}

serve(async (req) => {
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
    let selectedThemeName: string | null = null;

    // If specific icon requested, find it by slug
    if (iconSlug) {
      const { data: specificIcon, error: specificError } = await supabase
        .from('icon_library')
        .select('slug, title, icon_url, category')
        .eq('slug', iconSlug)
        .single();
      
      if (!specificError && specificIcon) {
        selectedIcon = specificIcon;
        // Find matching theme for the icon's category
        for (const [themeName, config] of Object.entries(THEME_CONFIG)) {
          if (config.categories.includes(specificIcon.category)) {
            selectedThemeName = themeName;
            break;
          }
        }
        console.log(`Using requested icon: ${iconSlug}, theme: ${selectedThemeName}`);
      }
    }

    // If no specific icon, pick a random THEME first, then get matching icon
    if (!selectedIcon) {
      // 1. Pick a random theme
      const themes = Object.keys(THEME_CONFIG);
      selectedThemeName = themes[Math.floor(Math.random() * themes.length)];
      const themeConfig = THEME_CONFIG[selectedThemeName];

      console.log(`Selected theme: ${selectedThemeName}, categories: ${themeConfig.categories.join(', ')}`);

      // 2. Get icons only from this theme's categories
      const { data: icons, error: iconError } = await supabase
        .from('icon_library')
        .select('slug, title, icon_url, category')
        .not('icon_url', 'is', null)
        .in('category', themeConfig.categories)
        .limit(100);

      if (iconError || !icons || icons.length === 0) {
        console.error('Failed to fetch icons for theme:', iconError);
        // Fallback to theme name without icon
        const themeName = themeConfig.names[Math.floor(Math.random() * themeConfig.names.length)];
        return new Response(
          JSON.stringify({ 
            name: themeName, 
            icon_url: null 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 3. Pick a random icon from matching category
      selectedIcon = icons[Math.floor(Math.random() * icons.length)];
    }

    const iconName = selectedIcon.title || selectedIcon.slug.replace(/-/g, ' ');

    console.log(`Selected icon: ${iconName} (${selectedIcon.slug})`);

    // Get the theme config for name selection
    const themeConfig = selectedThemeName ? THEME_CONFIG[selectedThemeName] : null;
    const getThemeMatchedName = () => {
      if (themeConfig) {
        return themeConfig.names[Math.floor(Math.random() * themeConfig.names.length)];
      }
      return getRandomInspirationalName();
    };

    // If no AI key, return theme-matched inspirational name
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ 
          name: getThemeMatchedName(), 
          icon_url: selectedIcon.icon_url 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build theme-specific examples for the AI prompt
    const themeExamples = themeConfig ? themeConfig.names.slice(0, 4).map(n => `"${n}"`).join(', ') : '';
    const themeLabel = selectedThemeName || 'random';

    // Use AI to generate a theme-matched 2-word name
    const prompt = `შექმენი შთამაგონებელი, კრეატიული ქართული სახელი ტრივია თამაშის ოთახისთვის.

კონტექსტი: მეგობრები იკრიბებიან ერთად სახალისო ტრივიას სათამაშოდ.

🎯 არჩეული თემატიკა: ${themeLabel}
📌 მაგალითები ამ თემატიკიდან: ${themeExamples}
🎨 არჩეული აიკონი: "${iconName}"

სახელი უნდა იყოს:
- ეპიკური და შთამაგონებელი
- მაქსიმუმ 2 სიტყვა
- ამ თემატიკის შესაბამისი
- აიკონთან თანხვედრაში

დაბრუნე მხოლოდ 2 სიტყვიანი კრეატიული სახელი, არაფერი სხვა.`;

    console.log(`Generating name for theme: ${themeLabel}, icon: ${iconName}`);

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
      // Fallback to theme-matched inspirational name
      return new Response(
        JSON.stringify({ 
          name: getThemeMatchedName(), 
          icon_url: selectedIcon.icon_url 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const rawName = data.choices?.[0]?.message?.content?.trim() || '';
    
    // Validate and clean the generated name
    const generatedName = validateAndCleanName(rawName);

    console.log(`Generated room name: ${generatedName} (raw: ${rawName})`);

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
        name: getRandomInspirationalName(), 
        icon_url: null,
        error: errorMessage 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
