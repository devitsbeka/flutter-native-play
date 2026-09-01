import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

// Banned inappropriate Georgian words
const BANNED_WORDS = [
  'ტრაკი', 'განავალი', 'ფურთხი', 'ბოზი', 'შევეცი', 'მოვეცი',
  'ტყვნა', 'მუტელი', 'ყლე', 'ქერა', 'დედა', 'მამა', 'შენი'
];

// Max character limit for room names per script type
const MAX_NAME_LENGTH_KA = 18;
const MAX_NAME_LENGTH_LATIN = 22;

type LangCode = 'ka' | 'en' | 'fr' | 'de' | 'es' | 'it' | 'pt';

// Room names are a mood and a creature, e.g. "Sleepy Dragons" — see
// src/utils/roomNameGenerator.ts for why (word order and gender agreement),
// which carries these same two tables as the client's offline fallback.
// roomNameGenerator.sync.test.ts fails if the two ever drift apart.

/** Languages that read adjective-first. The rest put it after the noun. */
const ADJECTIVE_FIRST: LangCode[] = ["ka", "en", "de"];

const ROOM_MOODS: Record<LangCode, string[]> = {
  ka: ["მძინარე", "მშიერი", "ზარმაცი", "გიჟი", "მხიარული", "ჯიუტი", "ეშმაკური", "ბრაზიანი", "სწრაფი", "მამაცი", "ხმაურიანი", "საიდუმლო"],
  en: ["Sleepy", "Hungry", "Lazy", "Crazy", "Cheerful", "Stubborn", "Sneaky", "Angry", "Speedy", "Brave", "Noisy", "Secret"],
  de: ["Verschlafene", "Hungrige", "Faule", "Verrückte", "Fröhliche", "Sture", "Schlaue", "Wütende", "Schnelle", "Mutige", "Laute", "Geheime"],
  fr: ["Endormis", "Affamés", "Paresseux", "Fous", "Joyeux", "Têtus", "Malins", "Fâchés", "Rapides", "Braves", "Bruyants", "Secrets"],
  es: ["Dormilones", "Hambrientos", "Perezosos", "Locos", "Alegres", "Tercos", "Astutos", "Furiosos", "Veloces", "Valientes", "Ruidosos", "Secretos"],
  it: ["Assonnati", "Affamati", "Pigri", "Pazzi", "Allegri", "Testardi", "Furbi", "Arrabbiati", "Veloci", "Coraggiosi", "Rumorosi", "Segreti"],
  pt: ["Sonolentos", "Famintos", "Preguiçosos", "Loucos", "Alegres", "Teimosos", "Astutos", "Furiosos", "Velozes", "Corajosos", "Barulhentos", "Secretos"],
};

const ROOM_CREATURES: Array<{ icon: string } & Record<LangCode, string>> = [
  { icon: "dragon",          ka: "დრაკონები",   en: "Dragons",    de: "Drachen",     fr: "Dragons",      es: "Dragones",   it: "Draghi",     pt: "Dragões" },
  { icon: "panda",           ka: "პანდები",     en: "Pandas",     de: "Pandas",      fr: "Pandas",       es: "Pandas",     it: "Panda",      pt: "Pandas" },
  { icon: "shark",           ka: "ზვიგენები",   en: "Sharks",     de: "Haie",        fr: "Requins",      es: "Tiburones",  it: "Squali",     pt: "Tubarões" },
  { icon: "lion",            ka: "ლომები",      en: "Lions",      de: "Löwen",       fr: "Lions",        es: "Leones",     it: "Leoni",      pt: "Leões" },
  { icon: "cat",             ka: "კატები",      en: "Cats",       de: "Katzen",      fr: "Chats",        es: "Gatos",      it: "Gatti",      pt: "Gatos" },
  { icon: "wizard",          ka: "ჯადოქრები",   en: "Wizards",    de: "Zauberer",    fr: "Sorciers",     es: "Magos",      it: "Maghi",      pt: "Magos" },
  { icon: "robot",           ka: "რობოტები",    en: "Robots",     de: "Roboter",     fr: "Robots",       es: "Robots",     it: "Robot",      pt: "Robôs" },
  { icon: "zombie",          ka: "ზომბები",     en: "Zombies",    de: "Zombies",     fr: "Zombies",      es: "Zombis",     it: "Zombie",     pt: "Zumbis" },
  { icon: "ninja",           ka: "ნინძები",     en: "Ninjas",     de: "Ninjas",      fr: "Ninjas",       es: "Ninjas",     it: "Ninja",      pt: "Ninjas" },
  { icon: "wolf",            ka: "მგლები",      en: "Wolves",     de: "Wölfe",       fr: "Loups",        es: "Lobos",      it: "Lupi",       pt: "Lobos" },
  { icon: "pirate",          ka: "მეკობრეები",  en: "Pirates",    de: "Piraten",     fr: "Pirates",      es: "Piratas",    it: "Pirati",     pt: "Piratas" },
  { icon: "bear",            ka: "დათვები",     en: "Bears",      de: "Bären",       fr: "Ours",         es: "Osos",       it: "Orsi",       pt: "Ursos" },
  { icon: "ghost",           ka: "მოჩვენებები", en: "Ghosts",     de: "Geister",     fr: "Fantômes",     es: "Fantasmas",  it: "Fantasmi",   pt: "Fantasmas" },
  { icon: "dolphin",         ka: "დელფინები",   en: "Dolphins",   de: "Delfine",     fr: "Dauphins",     es: "Delfines",   it: "Delfini",    pt: "Golfinhos" },
  { icon: "dog",             ka: "ძაღლები",     en: "Dogs",       de: "Hunde",       fr: "Chiens",       es: "Perros",     it: "Cani",       pt: "Cães" },
  { icon: "elephant",        ka: "სპილოები",    en: "Elephants",  de: "Elefanten",   fr: "Éléphants",    es: "Elefantes",  it: "Elefanti",   pt: "Elefantes" },
  { icon: "rabbit",          ka: "კურდღლები",   en: "Rabbits",    de: "Hasen",       fr: "Lapins",       es: "Conejos",    it: "Conigli",    pt: "Coelhos" },
  { icon: "hedgehog",        ka: "ზღარბები",    en: "Hedgehogs",  de: "Igel",        fr: "Hérissons",    es: "Erizos",     it: "Ricci",      pt: "Ouriços" },
  { icon: "samurai",         ka: "სამურაები",   en: "Samurai",    de: "Samurai",     fr: "Samouraïs",    es: "Samuráis",   it: "Samurai",    pt: "Samurais" },
  { icon: "vampire",         ka: "ვამპირები",   en: "Vampires",   de: "Vampire",     fr: "Vampires",     es: "Vampiros",   it: "Vampiri",    pt: "Vampiros" },
  { icon: "troll",           ka: "ტროლები",     en: "Trolls",     de: "Trolle",      fr: "Trolls",       es: "Trols",      it: "Troll",      pt: "Trolls" },
  { icon: "goblin",          ka: "გობლინები",   en: "Goblins",    de: "Kobolde",     fr: "Gobelins",     es: "Goblins",    it: "Goblin",     pt: "Goblins" },
  { icon: "yeti",            ka: "იეტები",      en: "Yetis",      de: "Yetis",       fr: "Yétis",        es: "Yetis",      it: "Yeti",       pt: "Yetis" },
  { icon: "astronaut",       ka: "კოსმონავტები", en: "Astronauts", de: "Astronauten", fr: "Astronautes",  es: "Astronautas", it: "Astronauti", pt: "Astronautas" },
  { icon: "knight-in-armor", ka: "რაინდები",    en: "Knights",    de: "Ritter",      fr: "Chevaliers",   es: "Caballeros", it: "Cavalieri",  pt: "Cavaleiros" },
  { icon: "octopus",         ka: "რვაფეხები",   en: "Octopuses",  de: "Kraken",      fr: "Poulpes",      es: "Pulpos",     it: "Polpi",      pt: "Polvos" },
  { icon: "crab",            ka: "კიბორჩხალები", en: "Crabs",      de: "Krabben",     fr: "Crabes",       es: "Cangrejos",  it: "Granchi",    pt: "Caranguejos" },
  { icon: "koala",           ka: "კოალები",     en: "Koalas",     de: "Koalas",      fr: "Koalas",       es: "Koalas",     it: "Koala",      pt: "Coalas" },
  { icon: "raccoon",         ka: "ენოტები",     en: "Raccoons",   de: "Waschbären",  fr: "Ratons",       es: "Mapaches",   it: "Procioni",   pt: "Guaxinins" },
  { icon: "hamster",         ka: "ზაზუნები",    en: "Hamsters",   de: "Hamster",     fr: "Hamsters",     es: "Hámsters",   it: "Criceti",    pt: "Hamsters" },
];


// Icon library row type
interface IconRow {
  slug: string;
  icon_url: string | null;
  title?: string;
  tags?: string[];
}

function normalizeLang(lang: string | null | undefined): LangCode {
  if (!lang) return 'ka';
  const l = lang.toLowerCase().trim();
  if (['ka', 'en', 'fr', 'de', 'es', 'it', 'pt'].includes(l)) return l as LangCode;
  // Fallback: non-KA unknown languages get EN
  return 'en';
}

// A mood and a creature, in the language's own word order, short enough for
// the room-name row. The icon keyword is the creature's own slug, so the
// picture always matches the words.
function generateThemedRoomName(language: LangCode): { name: string, iconKeyword: string } {
  const max = language === 'ka' ? MAX_NAME_LENGTH_KA : MAX_NAME_LENGTH_LATIN;
  const candidates: Array<{ name: string, iconKeyword: string }> = [];

  for (const mood of ROOM_MOODS[language]) {
    for (const creature of ROOM_CREATURES) {
      const noun = creature[language];
      const name = ADJECTIVE_FIRST.includes(language) ? `${mood} ${noun}` : `${noun} ${mood}`;
      if (name.length <= max) candidates.push({ name, iconKeyword: creature.icon });
    }
  }

  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  console.log(`Generated name: "${pick.name}" (lang=${language}) with icon "${pick.iconKeyword}"`);
  return pick;
}

// Validate and clean generated name
function validateName(name: string, language: LangCode): boolean {
  const maxLen = language === 'ka' ? MAX_NAME_LENGTH_KA : MAX_NAME_LENGTH_LATIN;
  if (!name || name.length > maxLen) return false;
  
  // Only check banned words for Georgian
  if (language === 'ka') {
    const containsBanned = BANNED_WORDS.some(word => 
      name.toLowerCase().includes(word.toLowerCase())
    );
    return !containsBanned;
  }
  
  return true;
}

// Search for icons matching keywords - prioritizes exact matches
async function searchIconByKeyword(
  supabase: SupabaseClient,
  keyword: string
): Promise<string | null> {
  const normalizedKeyword = keyword.toLowerCase().trim();
  
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
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body for optional parameters
    let iconSlug: string | null = null;
    let language: LangCode = 'ka';
    try {
      const body = await req.json();
      iconSlug = body?.iconSlug || null;
      language = normalizeLang(body?.language);
    } catch {
      // No body or invalid JSON, use defaults
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
        
        const { name } = generateThemedRoomName(language);
        return new Response(
          JSON.stringify({ name, icon_url: selectedIconUrl }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Generate themed name and matching icon
    const { name, iconKeyword } = generateThemedRoomName(language);
    
    // Validate name
    if (!validateName(name, language)) {
      console.error(`Invalid generated name: ${name}`);
      const fallback = generateThemedRoomName(language);
      selectedIconUrl = await searchIconByKeyword(supabase, fallback.iconKeyword);
      if (!selectedIconUrl) {
        selectedIconUrl = await getRandomIcon(supabase);
      }
      return new Response(
        JSON.stringify({ name: fallback.name, icon_url: selectedIconUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Search for matching icon based on keyword
    selectedIconUrl = await searchIconByKeyword(supabase, iconKeyword);
    
    if (!selectedIconUrl) {
      selectedIconUrl = await getRandomIcon(supabase);
    }

    console.log(`Final result: name="${name}", icon_url="${selectedIconUrl?.substring(0, 50)}..."`);

    return new Response(
      JSON.stringify({ name, icon_url: selectedIconUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating room name:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate room name', name: 'Fun Squad' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
