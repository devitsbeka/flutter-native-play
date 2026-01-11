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

// Curated inspirational fallback names - epic and creative
const INSPIRATIONAL_NAMES = [
  // Cosmic
  "კოსმოსური ხომალდი",      // Cosmic Ship
  "ვარსკვლავთა კავშირი",    // Star Alliance
  "გალაქტიკის მცველები",    // Galaxy Guardians
  "მთვარის მხარე",          // Moon Side
  "კოსმოსური არენა",        // Cosmic Arena
  // Adventure
  "მოგზაურთა ბანაკი",       // Travelers' Camp
  "აღმომჩენთა კლუბი",       // Explorers' Club
  "თავგადასავლის გზა",      // Path of Adventure
  "ჰორიზონტის მიღმა",       // Beyond the Horizon
  // Nature
  "ბუნების მცველები",       // Nature Guardians
  "მწვანე ოაზისი",          // Green Oasis
  "ტყის საიდუმლო",          // Forest Secret
  "მთის მწვერვალი",         // Mountain Peak
  // Fantasy
  "დრაკონთა ბუდე",          // Dragons' Nest
  "ფენიქსის ფრთები",        // Phoenix Wings
  "ჯადოსნური ტყე",          // Magical Forest
  "მოჯადოებული სასახლე",    // Enchanted Palace
  // Wisdom
  "ბრძენთა საბჭო",          // Council of Sages
  "გენიოსების კლუბი",       // Geniuses' Club
  "ცოდნის ციხე",            // Fortress of Knowledge
  "ჭკვიანების ოთახი",       // Smart Ones' Room
  // Legends
  "ლეგენდების ოთახი",       // Room of Legends
  "მითების სამყარო",        // World of Myths
  "გმირთა არენა",           // Heroes' Arena
  "დიდებულთა კლუბი",        // Club of the Great
  // Champions
  "ჩემპიონთა ლიგა",         // Champions' League
  "გამარჯვებულთა კლუბი",    // Winners' Club
  "ტიტანების არენა",        // Titans' Arena
  "ძლევამოსილთა ოთახი",     // Room of the Victorious
  // Friends
  "მეგობრების ოთახი",       // Friends' Room
  "სახალისო კომპანია",      // Fun Company
  "მხიარულთა არენა",        // Arena of the Cheerful
  "ხუმრობების კლუბი",       // Jokes Club
];

// Get random inspirational name
function getRandomInspirationalName(): string {
  return INSPIRATIONAL_NAMES[Math.floor(Math.random() * INSPIRATIONAL_NAMES.length)];
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

    // If specific icon requested, find it by slug
    if (iconSlug) {
      const { data: specificIcon, error: specificError } = await supabase
        .from('icon_library')
        .select('slug, title, icon_url')
        .eq('slug', iconSlug)
        .single();
      
      if (!specificError && specificIcon) {
        selectedIcon = specificIcon;
        console.log(`Using requested icon: ${iconSlug}`);
      }
    }

    // Only pick icons from inspirational categories (no mundane items like spoons, washing machines)
    const INSPIRATIONAL_CATEGORIES = [
      'Space & Science',
      'Fantasy & Imagination',
      'Animals',
      'Nature & Outdoors',
      'Sports',
      'Historical Figures',
      'Entertainment & Leisure',
      'Places & Structures',
      'Vehicles & Transport',
      'Events',
      'History & Culture',
      'Professions',
    ];

    // If no specific icon or not found, get random icons from inspirational categories only
    if (!selectedIcon) {
      const { data: icons, error: iconError } = await supabase
        .from('icon_library')
        .select('slug, title, icon_url, category')
        .not('icon_url', 'is', null)
        .in('category', INSPIRATIONAL_CATEGORIES)
        .limit(200);

      if (iconError || !icons || icons.length === 0) {
        console.error('Failed to fetch icons:', iconError);
        // Fallback to inspirational name
        return new Response(
          JSON.stringify({ 
            name: getRandomInspirationalName(), 
            icon_url: null 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Pick a random icon
      selectedIcon = icons[Math.floor(Math.random() * icons.length)];
    }

    const iconName = selectedIcon.title || selectedIcon.slug.replace(/-/g, ' ');

    console.log(`Selected icon: ${iconName} (${selectedIcon.slug})`);

    // If no AI key, return inspirational name
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ 
          name: getRandomInspirationalName(), 
          icon_url: selectedIcon.icon_url 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use AI to generate an INSPIRATIONAL 2-word name
    const prompt = `შექმენი შთამაგონებელი, კრეატიული ქართული სახელი ტრივია თამაშის ოთახისთვის.

კონტექსტი: მეგობრები იკრიბებიან ერთად სახალისო ტრივიას სათამაშოდ. სახელი უნდა იყოს:
- ეპიკური და შთამაგონებელი
- მაქსიმუმ 2 სიტყვა
- მხიარული და სასიამოვნო

აირჩიე ერთ-ერთი თემატიკა და შექმენი ორიგინალური სახელი:
🚀 კოსმოსი: "კოსმოსური ხომალდი", "ვარსკვლავთა კავშირი", "გალაქტიკის მცველები"
🗺️ თავგადასავალი: "მოგზაურთა ბანაკი", "აღმომჩენთა კლუბი", "ჰორიზონტის მიღმა"
🌲 ბუნება: "ბუნების მცველები", "მწვანე ოაზისი", "ტყის საიდუმლო"
🐉 ფანტაზია: "დრაკონთა ბუდე", "ფენიქსის ფრთები", "ჯადოსნური ტყე"
📚 სიბრძნე: "ბრძენთა საბჭო", "გენიოსების კლუბი", "ცოდნის ციხე"
⚔️ ლეგენდები: "გმირთა არენა", "ლეგენდების ოთახი", "მითების სამყარო"
🏆 ჩემპიონები: "ჩემპიონთა ლიგა", "ტიტანების არენა", "გამარჯვებულთა კლუბი"
👥 მეგობრობა: "მეგობრების ოთახი", "სახალისო კომპანია", "მხიარულთა არენა"

⚠️ მნიშვნელოვანი წესი: მოცემული აიკონია "${iconName}" - ეს მხოლოდ ვიზუალური დეკორაციაა!
- ნუ თარგმნი აიკონს პირდაპირ!
- თუ აიკონი არის ყოველდღიური საგანი (სტეპლერი, ტუალეტი, სარეცხი მანქანა, ჭიქა, კარადა...), სრულად იგნორირება უყავი და შექმენი რაღაც ეპიკური!
- სახელი ყოველთვის უნდა იყოს შთამაგონებელი და სახალისო, არა მოსაწყენი!

დაბრუნე მხოლოდ 2 სიტყვიანი კრეატიული სახელი, არაფერი სხვა.`;

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
      // Fallback to inspirational name
      return new Response(
        JSON.stringify({ 
          name: getRandomInspirationalName(), 
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
