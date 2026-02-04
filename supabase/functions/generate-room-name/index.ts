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

// Theme-based room names (15 themes × 8 names each = 120+ options)
const THEMED_ROOM_NAMES: Record<string, { names: string[], iconKeywords: string[] }> = {
  champion: {
    names: [
      "ოქროს თასი",        // Golden Cup
      "ვარსკვლავთა ბრძოლა", // Stars Battle
      "მედლების კლუბი",    // Medals Club
      "ჩემპიონები",        // Champions
      "პირველობის რინგი",   // Championship Ring
      "გამარჯვებულთა ზონა", // Winners Zone
      "ტრიუმფის არენა",     // Triumph Arena
      "პოდიუმის გზა",       // Podium Way
    ],
    iconKeywords: ['trophy', 'medal', 'crown', 'cup', 'winner', 'gold']
  },
  adventure: {
    names: [
      "კოსმოსის მოგზაური",  // Space Traveler
      "ექსპედიცია X",       // Expedition X
      "აღმოჩენის გზა",      // Discovery Path
      "მკვლევართა კლანი",   // Explorers Clan
      "ჰორიზონტის მიღმა",   // Beyond Horizon
      "საზღვრების მიღმა",   // Beyond Borders
      "ძიების ბილიკი",      // Search Trail
      "ახალი ტერიტორია",    // New Territory
    ],
    iconKeywords: ['rocket', 'compass', 'map', 'telescope', 'binoculars']
  },
  creature: {
    names: [
      "ცეცხლის მცველი",     // Fire Guardian
      "მითიური ბუნაგი",     // Mythical Den
      "ლეგენდის კვალი",     // Legend's Trail
      "ჯადოსნური არსება",   // Magical Creature
      "ფანტასტიური კლუბი",  // Fantastic Club
      "მონსტრების ლიგა",    // Monsters League
      "ზღაპრის სამყარო",    // Fairytale World
      "ფრთოსანთა კლანი",    // Winged Clan
    ],
    iconKeywords: ['dragon', 'phoenix', 'unicorn', 'griffin', 'pegasus']
  },
  animal: {
    names: [
      "მტაცებლის ხროვა",    // Predator Pack
      "ბუნაგის მეფე",       // Den King
      "მფრინავი მხედარი",   // Flying Rider
      "ველური კლანი",       // Wild Clan
      "ბუნების ძალა",       // Nature's Power
      "თათების ლიგა",       // Paws League
      "ფოლადის კლანჭა",     // Steel Claw
      "სწრაფი ნადირი",      // Swift Hunter
    ],
    iconKeywords: ['lion', 'wolf', 'eagle', 'bear', 'tiger', 'shark', 'panther']
  },
  battle: {
    names: [
      "ჯავშნის რინგი",      // Armor Ring
      "კლინკის ჟღერა",      // Blade Clang
      "მეომრის ბილიკი",     // Warrior's Path
      "ფარების კედელი",     // Shield Wall
      "გლადიატორები",       // Gladiators
      "რაინდთა კლანი",      // Knights Clan
      "ბრძოლის მოედანი",    // Battle Arena
      "ფოლადის გუნდი",      // Steel Team
    ],
    iconKeywords: ['sword', 'shield', 'boxing', 'knight', 'armor', 'battle']
  },
  magic: {
    names: [
      "ჯადოქართა სახლი",    // Wizards House
      "კრისტალის კოშკი",    // Crystal Tower
      "მოჯადოე კლანი",      // Enchanted Clan
      "შელოცვის წრე",       // Spell Circle
      "მაგიური ბროლი",      // Magic Orb
      "ალქიმიკოსები",       // Alchemists
      "ჯადოს სკოლა",        // Magic School
      "მისტიკის კლუბი",     // Mystic Club
    ],
    iconKeywords: ['wizard', 'wand', 'crystal', 'magic', 'potion', 'hat']
  },
  party: {
    names: [
      "ზეიმის მოედანი",     // Celebration Square
      "ფეიერვერკი",         // Fireworks
      "სახალისო ბუდე",      // Fun Nest
      "წვეულების კლუბი",    // Party Club
      "ბალონების ომი",      // Balloon War
      "კონფეტის წვიმა",     // Confetti Rain
      "დღესასწაული",        // Holiday
      "ფესტივალი",          // Festival
    ],
    iconKeywords: ['balloon', 'confetti', 'cake', 'party', 'gift', 'fireworks']
  },
  nature: {
    names: [
      "მწვერვალის ჯგუფი",   // Summit Group
      "მზის ხეობა",         // Sun Valley
      "ტყის კლანი",         // Forest Clan
      "მთის მგლები",        // Mountain Wolves
      "ბუნების ძალა",       // Nature's Force
      "მწვანე ლიგა",        // Green League
      "ხეობის მცველი",      // Valley Guardian
      "კლდის არწივები",     // Rock Eagles
    ],
    iconKeywords: ['tree', 'mountain', 'sun', 'leaf', 'forest', 'flower']
  },
  tech: {
    names: [
      "კიბერ არენა",        // Cyber Arena
      "პიქსელების ომი",     // Pixel War
      "დიჯიტალ გვარდია",    // Digital Guard
      "კოდის მეომრები",     // Code Warriors
      "ტექნო კლანი",        // Techno Clan
      "რობოტების ლიგა",     // Robots League
      "ჩიპის ჯგუფი",        // Chip Squad
      "მატრიცის რინგი",     // Matrix Ring
    ],
    iconKeywords: ['robot', 'chip', 'gamepad', 'laptop', 'console', 'controller']
  },
  music: {
    names: [
      "რიტმის კლუბი",       // Rhythm Club
      "ნოტების ბრძოლა",     // Notes Battle
      "ჰარმონია",           // Harmony
      "მელოდიის კლანი",     // Melody Clan
      "კონცერტის ზონა",     // Concert Zone
      "ბითების არენა",      // Beats Arena
      "როკის ბუნაგი",       // Rock Den
      "ჯაზის კლუბი",        // Jazz Club
    ],
    iconKeywords: ['guitar', 'piano', 'headphones', 'microphone', 'music', 'drum']
  },
  mystery: {
    names: [
      "საიდუმლო კლუბი",     // Secret Club
      "გამოცანის სახლი",    // Riddle House
      "დეტექტივები",        // Detectives
      "შერლოკის კლანი",     // Sherlock Clan
      "მისტერიის ზონა",     // Mystery Zone
      "გასაღების მფლობელი", // Key Holder
      "ნიღბის უკან",        // Behind the Mask
      "საიდუმლო საზოგადო",  // Secret Society
    ],
    iconKeywords: ['detective', 'mask', 'key', 'magnifier', 'mystery', 'spy']
  },
  speed: {
    names: [
      "მეხის სიჩქარე",      // Thunder Speed
      "ელვის გუნდი",        // Lightning Team
      "თავგადასავალი",      // Thrill
      "რბოლის კლუბი",       // Racing Club
      "ტურბო არენა",        // Turbo Arena
      "სწრაფი და ფოლადი",   // Fast & Steel
      "ნიტროს რინგი",       // Nitro Ring
      "სიჩქარის ეშმაკი",    // Speed Demon
    ],
    iconKeywords: ['racing', 'lightning', 'flame', 'car', 'motorcycle', 'bolt']
  },
  ocean: {
    names: [
      "ზღვის მგლები",       // Sea Wolves
      "ოკეანის კლანი",      // Ocean Clan
      "ტალღის მხედარი",     // Wave Rider
      "მეკობრეები",         // Pirates
      "წყალქვეშა ლიგა",     // Underwater League
      "ზვიგენის კბილი",     // Shark Tooth
      "ნავთსადგური",        // Harbor
      "კაპიტნის ხიდი",      // Captain's Bridge
    ],
    iconKeywords: ['shark', 'anchor', 'wave', 'ship', 'pirate', 'whale', 'octopus']
  },
  food: {
    names: [
      "გემოვნების ბრძოლა",  // Taste Battle
      "შეფთა დუელი",        // Chefs Duel
      "გურმანთა კლუბი",     // Gourmets Club
      "რეცეპტის საიდუმლო",  // Recipe Secret
      "სამზარეულოს ომი",    // Kitchen War
      "დეგუსტაცია",         // Tasting
      "ფლეივერის ზონა",     // Flavor Zone
      "გასტრო არენა",       // Gastro Arena
    ],
    iconKeywords: ['pizza', 'burger', 'chef', 'cooking', 'cake', 'food']
  },
  space: {
    names: [
      "გალაქტიკის რინგი",   // Galaxy Ring
      "ვარსკვლავთა ჯგუფი", // Stars Group
      "კოსმიური კლანი",     // Cosmic Clan
      "ასტრონავტები",       // Astronauts
      "ორბიტის მცველი",     // Orbit Guardian
      "პლანეტების ლიგა",    // Planets League
      "მეტეორის გზა",       // Meteor Path
      "კოსმოსის კაპიტანი",  // Space Captain
    ],
    iconKeywords: ['astronaut', 'planet', 'star', 'moon', 'satellite', 'ufo']
  }
};

// Icon library row type
interface IconRow {
  slug: string;
  icon_url: string | null;
  title?: string;
  tags?: string[];
}

// Generate themed room name and icon keyword
function generateThemedRoomName(): { name: string, iconKeyword: string } {
  const themes = Object.keys(THEMED_ROOM_NAMES);
  const randomTheme = themes[Math.floor(Math.random() * themes.length)];
  const themeData = THEMED_ROOM_NAMES[randomTheme];
  
  const randomName = themeData.names[Math.floor(Math.random() * themeData.names.length)];
  const randomKeyword = themeData.iconKeywords[Math.floor(Math.random() * themeData.iconKeywords.length)];
  
  console.log(`Generated themed name: "${randomName}" from theme "${randomTheme}" with keyword "${randomKeyword}"`);
  
  return { name: randomName, iconKeyword: randomKeyword };
}

// Validate and clean generated name
function validateName(name: string): boolean {
  if (!name || name.length > MAX_NAME_LENGTH) return false;
  
  const containsBanned = BANNED_WORDS.some(word => 
    name.toLowerCase().includes(word.toLowerCase())
  );
  
  return !containsBanned;
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

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body for optional icon parameter
    let iconSlug: string | null = null;
    try {
      const body = await req.json();
      iconSlug = body?.iconSlug || null;
    } catch {
      // No body or invalid JSON, use themed generation
    }

    let selectedIconUrl: string | null = null;

    // If specific icon requested, find it by slug and return with themed name
    if (iconSlug) {
      const { data: specificIcon, error: specificError } = await supabase
        .from('icon_library')
        .select('slug, title, icon_url')
        .eq('slug', iconSlug)
        .single();
      
      if (!specificError && specificIcon?.icon_url) {
        selectedIconUrl = specificIcon.icon_url;
        console.log(`Using requested icon: ${iconSlug}`);
        
        // Return with themed name
        const { name } = generateThemedRoomName();
        return new Response(
          JSON.stringify({ 
            name, 
            icon_url: selectedIconUrl 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Generate themed name and matching icon
    const { name, iconKeyword } = generateThemedRoomName();
    
    // Validate name (should always pass for our curated names)
    if (!validateName(name)) {
      console.error(`Invalid generated name: ${name}`);
      const fallback = generateThemedRoomName();
      selectedIconUrl = await searchIconByKeyword(supabase, fallback.iconKeyword);
      if (!selectedIconUrl) {
        selectedIconUrl = await getRandomIcon(supabase);
      }
      return new Response(
        JSON.stringify({ 
          name: fallback.name, 
          icon_url: selectedIconUrl 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Search for matching icon based on keyword
    selectedIconUrl = await searchIconByKeyword(supabase, iconKeyword);
    
    // Ultimate fallback to random icon
    if (!selectedIconUrl) {
      selectedIconUrl = await getRandomIcon(supabase);
    }

    console.log(`Final result: name="${name}", icon_url="${selectedIconUrl?.substring(0, 50)}..."`);

    return new Response(
      JSON.stringify({ 
        name, 
        icon_url: selectedIconUrl 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating room name:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Even on error, return a themed name
    const { name } = generateThemedRoomName();
    
    return new Response(
      JSON.stringify({ 
        name, 
        icon_url: null,
        error: errorMessage 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
