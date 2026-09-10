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
  ka: ["მძინარე", "მშიერი", "ზარმაცი", "გიჟი", "მხიარული", "ჯიუტი", "ეშმაკური", "ბრაზიანი", "სწრაფი", "მამაცი", "ხმაურიანი", "საიდუმლო", "ცნობისმოყვარე", "ჭკვიანი", "ველური", "პატარა", "უზარმაზარი", "პირქუში", "თავბრუიანი", "მორცხვი", "იღბლიანი", "უშიშარი", "სულელი", "სამეფო"],
  en: ["Sleepy", "Hungry", "Lazy", "Crazy", "Cheerful", "Stubborn", "Sneaky", "Angry", "Speedy", "Brave", "Noisy", "Secret", "Curious", "Clever", "Wild", "Tiny", "Giant", "Grumpy", "Dizzy", "Shy", "Lucky", "Fearless", "Silly", "Royal"],
  de: ["Verschlafene", "Hungrige", "Faule", "Verrückte", "Fröhliche", "Sture", "Schlaue", "Wütende", "Schnelle", "Mutige", "Laute", "Geheime", "Neugierige", "Kluge", "Wilde", "Winzige", "Riesige", "Mürrische", "Schwindlige", "Schüchterne", "Glückliche", "Furchtlose", "Alberne", "Königliche"],
  fr: ["Endormis", "Affamés", "Paresseux", "Fous", "Joyeux", "Têtus", "Malins", "Fâchés", "Rapides", "Braves", "Bruyants", "Secrets", "Curieux", "Futés", "Sauvages", "Minuscules", "Géants", "Grincheux", "Étourdis", "Timides", "Chanceux", "Intrépides", "Rigolos", "Royaux"],
  es: ["Dormilones", "Hambrientos", "Perezosos", "Locos", "Alegres", "Tercos", "Astutos", "Furiosos", "Veloces", "Valientes", "Ruidosos", "Secretos", "Curiosos", "Listos", "Salvajes", "Diminutos", "Gigantes", "Gruñones", "Mareados", "Tímidos", "Afortunados", "Intrépidos", "Tontos", "Reales"],
  it: ["Assonnati", "Affamati", "Pigri", "Pazzi", "Allegri", "Testardi", "Furbi", "Arrabbiati", "Veloci", "Coraggiosi", "Rumorosi", "Segreti", "Curiosi", "Svegli", "Selvaggi", "Minuscoli", "Giganti", "Brontoloni", "Storditi", "Timidi", "Fortunati", "Impavidi", "Sciocchi", "Reali"],
  pt: ["Sonolentos", "Famintos", "Preguiçosos", "Loucos", "Alegres", "Teimosos", "Astutos", "Furiosos", "Velozes", "Corajosos", "Barulhentos", "Secretos", "Curiosos", "Espertos", "Selvagens", "Minúsculos", "Gigantes", "Rabugentos", "Zonzos", "Tímidos", "Sortudos", "Destemidos", "Bobos", "Reais"],
};

const ROOM_CREATURES: Array<{ icon: string } & Record<LangCode, string>> = [
  { icon: "dragon",          ka: "დრაკონები",      en: "Dragons",     de: "Drachen",       fr: "Dragons",       es: "Dragones",     it: "Draghi",      pt: "Dragões" },
  { icon: "panda",           ka: "პანდები",        en: "Pandas",      de: "Pandas",        fr: "Pandas",        es: "Pandas",       it: "Panda",       pt: "Pandas" },
  { icon: "shark",           ka: "ზვიგენები",      en: "Sharks",      de: "Haie",          fr: "Requins",       es: "Tiburones",    it: "Squali",      pt: "Tubarões" },
  { icon: "lion",            ka: "ლომები",         en: "Lions",       de: "Löwen",         fr: "Lions",         es: "Leones",       it: "Leoni",       pt: "Leões" },
  { icon: "cat",             ka: "კატები",         en: "Cats",        de: "Katzen",        fr: "Chats",         es: "Gatos",        it: "Gatti",       pt: "Gatos" },
  { icon: "wizard",          ka: "ჯადოქრები",      en: "Wizards",     de: "Zauberer",      fr: "Sorciers",      es: "Magos",        it: "Maghi",       pt: "Magos" },
  { icon: "robot",           ka: "რობოტები",       en: "Robots",      de: "Roboter",       fr: "Robots",        es: "Robots",       it: "Robot",       pt: "Robôs" },
  { icon: "zombie",          ka: "ზომბები",        en: "Zombies",     de: "Zombies",       fr: "Zombies",       es: "Zombis",       it: "Zombie",      pt: "Zumbis" },
  { icon: "ninja",           ka: "ნინძები",        en: "Ninjas",      de: "Ninjas",        fr: "Ninjas",        es: "Ninjas",       it: "Ninja",       pt: "Ninjas" },
  { icon: "wolf",            ka: "მგლები",         en: "Wolves",      de: "Wölfe",         fr: "Loups",         es: "Lobos",        it: "Lupi",        pt: "Lobos" },
  { icon: "pirate",          ka: "მეკობრეები",     en: "Pirates",     de: "Piraten",       fr: "Pirates",       es: "Piratas",      it: "Pirati",      pt: "Piratas" },
  { icon: "bear",            ka: "დათვები",        en: "Bears",       de: "Bären",         fr: "Ours",          es: "Osos",         it: "Orsi",        pt: "Ursos" },
  { icon: "ghost",           ka: "მოჩვენებები",    en: "Ghosts",      de: "Geister",       fr: "Fantômes",      es: "Fantasmas",    it: "Fantasmi",    pt: "Fantasmas" },
  { icon: "dolphin",         ka: "დელფინები",      en: "Dolphins",    de: "Delfine",       fr: "Dauphins",      es: "Delfines",     it: "Delfini",     pt: "Golfinhos" },
  { icon: "dog",             ka: "ძაღლები",        en: "Dogs",        de: "Hunde",         fr: "Chiens",        es: "Perros",       it: "Cani",        pt: "Cães" },
  { icon: "elephant",        ka: "სპილოები",       en: "Elephants",   de: "Elefanten",     fr: "Éléphants",     es: "Elefantes",    it: "Elefanti",    pt: "Elefantes" },
  { icon: "rabbit",          ka: "კურდღლები",      en: "Rabbits",     de: "Hasen",         fr: "Lapins",        es: "Conejos",      it: "Conigli",     pt: "Coelhos" },
  { icon: "hedgehog",        ka: "ზღარბები",       en: "Hedgehogs",   de: "Igel",          fr: "Hérissons",     es: "Erizos",       it: "Ricci",       pt: "Ouriços" },
  { icon: "samurai",         ka: "სამურაები",      en: "Samurai",     de: "Samurai",       fr: "Samouraïs",     es: "Samuráis",     it: "Samurai",     pt: "Samurais" },
  { icon: "vampire",         ka: "ვამპირები",      en: "Vampires",    de: "Vampire",       fr: "Vampires",      es: "Vampiros",     it: "Vampiri",     pt: "Vampiros" },
  { icon: "troll",           ka: "ტროლები",        en: "Trolls",      de: "Trolle",        fr: "Trolls",        es: "Trols",        it: "Troll",       pt: "Trolls" },
  { icon: "goblin",          ka: "გობლინები",      en: "Goblins",     de: "Kobolde",       fr: "Gobelins",      es: "Goblins",      it: "Goblin",      pt: "Goblins" },
  { icon: "yeti",            ka: "იეტები",         en: "Yetis",       de: "Yetis",         fr: "Yétis",         es: "Yetis",        it: "Yeti",        pt: "Yetis" },
  { icon: "astronaut-suit",  ka: "კოსმონავტები",   en: "Astronauts",  de: "Astronauten",   fr: "Astronautes",   es: "Astronautas",  it: "Astronauti",  pt: "Astronautas" },
  { icon: "knight-in-armor", ka: "რაინდები",       en: "Knights",     de: "Ritter",        fr: "Chevaliers",    es: "Caballeros",   it: "Cavalieri",   pt: "Cavaleiros" },
  { icon: "octopus",         ka: "რვაფეხები",      en: "Octopuses",   de: "Kraken",        fr: "Poulpes",       es: "Pulpos",       it: "Polpi",       pt: "Polvos" },
  { icon: "crab",            ka: "კიბორჩხალები",   en: "Crabs",       de: "Krabben",       fr: "Crabes",        es: "Cangrejos",    it: "Granchi",     pt: "Caranguejos" },
  { icon: "koala",           ka: "კოალები",        en: "Koalas",      de: "Koalas",        fr: "Koalas",        es: "Koalas",       it: "Koala",       pt: "Coalas" },
  { icon: "raccoon",         ka: "ენოტები",        en: "Raccoons",    de: "Waschbären",    fr: "Ratons",        es: "Mapaches",     it: "Procioni",    pt: "Guaxinins" },
  { icon: "hamster",         ka: "ზაზუნები",       en: "Hamsters",    de: "Hamster",       fr: "Hamsters",      es: "Hámsters",     it: "Criceti",     pt: "Hamsters" },
  { icon: "crocodile",       ka: "კროკოდილები",    en: "Crocodiles",  de: "Krokodile",     fr: "Crocodiles",    es: "Cocodrilos",   it: "Coccodrilli", pt: "Crocodilos" },
  { icon: "parrot",          ka: "თუთიყუშები",     en: "Parrots",     de: "Papageien",     fr: "Perroquets",    es: "Loros",        it: "Pappagalli",  pt: "Papagaios" },
  { icon: "alien",           ka: "ალიენები",       en: "Aliens",      de: "Aliens",        fr: "Aliens",        es: "Aliens",       it: "Alieni",      pt: "Aliens" },
  { icon: "gorilla",         ka: "გორილები",       en: "Gorillas",    de: "Gorillas",      fr: "Gorilles",      es: "Gorilas",      it: "Gorilla",     pt: "Gorilas" },
  { icon: "rhinoceros",      ka: "მარტორქები",     en: "Rhinos",      de: "Nashörner",     fr: "Rhinocéros",    es: "Rinocerontes", it: "Rinoceronti", pt: "Rinocerontes" },
  { icon: "flamingo",        ka: "ფლამინგოები",    en: "Flamingos",   de: "Flamingos",     fr: "Flamants",      es: "Flamencos",    it: "Fenicotteri", pt: "Flamingos" },
  { icon: "hippo",           ka: "ბეჰემოთები",     en: "Hippos",      de: "Nilpferde",     fr: "Hippopotames",  es: "Hipopótamos",  it: "Ippopotami",  pt: "Hipopótamos" },
  { icon: "chameleon",       ka: "ქამელეონები",    en: "Chameleons",  de: "Chamäleons",    fr: "Caméléons",     es: "Camaleones",   it: "Camaleonti",  pt: "Camaleões" },
  { icon: "beaver",          ka: "თახვები",        en: "Beavers",     de: "Biber",         fr: "Castors",       es: "Castores",     it: "Castori",     pt: "Castores" },
  { icon: "peacock",         ka: "ფარშევანგები",   en: "Peacocks",    de: "Pfauen",        fr: "Paons",         es: "Pavos",        it: "Pavoni",      pt: "Pavões" },
  { icon: "toucan",          ka: "ტუკანები",       en: "Toucans",     de: "Tukane",        fr: "Toucans",       es: "Tucanes",      it: "Tucani",      pt: "Tucanos" },
  { icon: "camel",           ka: "აქლემები",       en: "Camels",      de: "Kamele",        fr: "Chameaux",      es: "Camellos",     it: "Cammelli",    pt: "Camelos" },
  { icon: "donkey",          ka: "ვირები",         en: "Donkeys",     de: "Esel",          fr: "Ânes",          es: "Burros",       it: "Asini",       pt: "Burros" },
  { icon: "bull",            ka: "ხარები",         en: "Bulls",       de: "Stiere",        fr: "Taureaux",      es: "Toros",        it: "Tori",        pt: "Touros" },
  { icon: "elf",             ka: "ელფები",         en: "Elves",       de: "Elfen",         fr: "Elfes",         es: "Elfos",        it: "Elfi",        pt: "Elfos" },
  { icon: "ogre",            ka: "ოგრები",         en: "Ogres",       de: "Oger",          fr: "Ogres",         es: "Ogros",        it: "Orchi",       pt: "Ogros" },
  { icon: "cyclops",         ka: "ციკლოპები",      en: "Cyclopes",    de: "Zyklopen",      fr: "Cyclopes",      es: "Cíclopes",     it: "Ciclopi",     pt: "Ciclopes" },
  { icon: "scorpion",        ka: "მორიელები",      en: "Scorpions",   de: "Skorpione",     fr: "Scorpions",     es: "Escorpiones",  it: "Scorpioni",   pt: "Escorpiões" },
  { icon: "badger",          ka: "მაჩვები",        en: "Badgers",     de: "Dachse",        fr: "Blaireaux",     es: "Tejones",      it: "Tassi",       pt: "Texugos" },
  { icon: "moose",           ka: "ლოსები",         en: "Moose",       de: "Elche",         fr: "Élans",         es: "Alces",        it: "Alci",        pt: "Alces" },
  { icon: "pilot",           ka: "პილოტები",       en: "Pilots",      de: "Piloten",       fr: "Pilotes",       es: "Pilotos",      it: "Piloti",      pt: "Pilotos" },
  { icon: "chef",            ka: "მზარეულები",     en: "Chefs",       de: "Köche",         fr: "Chefs",         es: "Chefs",        it: "Chef",        pt: "Chefs" },
  { icon: "clown",           ka: "კლოუნები",       en: "Clowns",      de: "Clowns",        fr: "Clowns",        es: "Payasos",      it: "Pagliacci",   pt: "Palhaços" },
  { icon: "scientist",       ka: "მეცნიერები",     en: "Scientists",  de: "Forscher",      fr: "Scientifiques", es: "Científicos",  it: "Scienziati",  pt: "Cientistas" },
  { icon: "farmer",          ka: "ფერმერები",      en: "Farmers",     de: "Bauern",        fr: "Fermiers",      es: "Granjeros",    it: "Contadini",   pt: "Fazendeiros" },
  { icon: "cyborg",          ka: "კიბორგები",      en: "Cyborgs",     de: "Cyborgs",       fr: "Cyborgs",       es: "Cíborgs",      it: "Cyborg",      pt: "Ciborgues" },
  { icon: "swan",            ka: "გედები",         en: "Swans",       de: "Schwäne",       fr: "Cygnes",        es: "Cisnes",       it: "Cigni",       pt: "Cisnes" },
  { icon: "rooster",         ka: "მამლები",        en: "Roosters",    de: "Hähne",         fr: "Coqs",          es: "Gallos",       it: "Galli",       pt: "Galos" },
  { icon: "pig",             ka: "ღორები",         en: "Pigs",        de: "Schweine",      fr: "Cochons",       es: "Cerdos",       it: "Maiali",      pt: "Porcos" },
  { icon: "doctor",          ka: "ექიმები",        en: "Doctors",     de: "Ärzte",         fr: "Docteurs",      es: "Doctores",     it: "Dottori",     pt: "Doutores" },
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
// `avoid` is the names already on live public rooms: a name in it is passed
// over, so two rooms called the same thing do not sit side by side on the
// Public list (owner: "we have two matching names on public list").
function generateThemedRoomName(language: LangCode, avoid: Set<string> = new Set()): { name: string, iconKeyword: string } {
  const max = language === 'ka' ? MAX_NAME_LENGTH_KA : MAX_NAME_LENGTH_LATIN;
  const candidates: Array<{ name: string, iconKeyword: string }> = [];

  for (const mood of ROOM_MOODS[language]) {
    for (const creature of ROOM_CREATURES) {
      const noun = creature[language];
      const name = ADJECTIVE_FIRST.includes(language) ? `${mood} ${noun}` : `${noun} ${mood}`;
      if (name.length <= max) candidates.push({ name, iconKeyword: creature.icon });
    }
  }

  const fresh = candidates.filter((c) => !avoid.has(c.name.toLowerCase()));
  const pool = fresh.length > 0 ? fresh : candidates;
  const pick = pool[Math.floor(Math.random() * pool.length)];
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

/**
 * The icons a room may NOT wear: every one a category wears, plus the
 * mystery box every undecided round wears. A room wearing Astronomy's
 * astronaut reads as Astronomy on the card that draws both (owner: "we
 * shouldn't use icons on rooms if we use that icon in our category
 * library"). The client keeps the same list in src/utils/categoryIcons.ts,
 * and the strip_category_room_icon trigger on game_rooms is the same rule
 * in the database.
 */
const RESERVED_CATEGORY_ICON_SLUGS = ['mystery-box'];

/** The names on live public rooms, lower-cased — what a new name steers clear of. */
async function fetchRoomNamesInUse(supabase: SupabaseClient): Promise<Set<string>> {
  const names = new Set<string>();
  const { data, error } = await supabase
    .from('game_rooms')
    .select('room_name')
    .eq('is_public', true)
    .in('status', ['waiting', 'playing'])
    .limit(300);
  if (!error && data) {
    for (const r of data as Array<{ room_name: string | null }>) {
      if (r.room_name) names.add(r.room_name.trim().toLowerCase());
    }
  }
  return names;
}

async function fetchCategoryIconSlugs(supabase: SupabaseClient): Promise<Set<string>> {
  const slugs = new Set<string>(RESERVED_CATEGORY_ICON_SLUGS);
  const { data, error } = await supabase.from('categories').select('icon_slug, icon');
  if (!error && data) {
    for (const c of data as Array<{ icon_slug: string | null; icon: string | null }>) {
      if (c.icon_slug) slugs.add(String(c.icon_slug));
      if (c.icon) slugs.add(String(c.icon));
    }
  }
  return slugs;
}

/** One of the matches a room may wear, at random, or null when none may be. */
function pickWearable(rows: IconRow[] | null | undefined, categoryIcons: Set<string>): IconRow | null {
  const wearable = (rows ?? []).filter((r) => r.icon_url && !categoryIcons.has(r.slug));
  if (wearable.length === 0) return null;
  return wearable[Math.floor(Math.random() * wearable.length)];
}

// Search for icons matching keywords - prioritizes exact matches. Never a
// category's icon: "astronaut" is a creature here and Astronomy's face there.
async function searchIconByKeyword(
  supabase: SupabaseClient,
  keyword: string,
  categoryIcons: Set<string>,
): Promise<string | null> {
  const normalizedKeyword = keyword.toLowerCase().trim();
  
  const { data: exactMatches, error: exactError } = await supabase
    .from('icon_library')
    .select('slug, icon_url, title')
    .not('icon_url', 'is', null)
    .ilike('title', normalizedKeyword)
    .limit(5);
  
  const exact = exactError ? null : pickWearable(exactMatches as IconRow[], categoryIcons);
  if (exact) {
    console.log(`Found icon by exact title: "${exact.slug}" for keyword "${keyword}"`);
    return exact.icon_url;
  }
  
  const { data: prefixMatches, error: prefixError } = await supabase
    .from('icon_library')
    .select('slug, icon_url, title')
    .not('icon_url', 'is', null)
    .ilike('title', `${normalizedKeyword}%`)
    .limit(10);
  
  const prefix = prefixError ? null : pickWearable(prefixMatches as IconRow[], categoryIcons);
  if (prefix) {
    console.log(`Found icon by prefix: "${prefix.slug}" for keyword "${keyword}"`);
    return prefix.icon_url;
  }
  
  const { data: titleMatches, error: titleError } = await supabase
    .from('icon_library')
    .select('slug, icon_url, title')
    .not('icon_url', 'is', null)
    .ilike('title', `%${normalizedKeyword}%`)
    .limit(10);
  
  const title = titleError ? null : pickWearable(titleMatches as IconRow[], categoryIcons);
  if (title) {
    console.log(`Found icon by title: "${title.slug}" for keyword "${keyword}"`);
    return title.icon_url;
  }
  
  const { data: tagMatches, error: tagError } = await supabase
    .from('icon_library')
    .select('slug, icon_url, tags')
    .not('icon_url', 'is', null)
    .contains('tags', [normalizedKeyword])
    .limit(10);
  
  const tag = tagError ? null : pickWearable(tagMatches as IconRow[], categoryIcons);
  if (tag) {
    console.log(`Found icon by tag: "${tag.slug}" for keyword "${keyword}"`);
    return tag.icon_url;
  }
  
  console.log(`No icon found for keyword "${keyword}"`);
  return null;
}

// Get random icon as ultimate fallback — a handful, so one is left after
// the category strike.
async function getRandomIcon(supabase: SupabaseClient, categoryIcons: Set<string>): Promise<string | null> {
  const { data: randomIcons, error } = await supabase
    .from('icon_library')
    .select('slug, icon_url')
    .not('icon_url', 'is', null)
    .order('random()')
    .limit(10);
  
  const pick = error ? null : pickWearable(randomIcons as IconRow[], categoryIcons);
  if (pick) {
    console.log(`Using random fallback icon: ${pick.slug}`);
    return pick.icon_url;
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
    const categoryIcons = await fetchCategoryIconSlugs(supabase);
    const takenNames = await fetchRoomNamesInUse(supabase);

    // If specific icon requested, find it by slug and return with themed name
    // — unless a category wears it, in which case the name comes without it
    // and the room is dealt a face like any room with none.
    if (iconSlug && !categoryIcons.has(iconSlug)) {
      const { data: specificIcon, error: specificError } = await supabase
        .from('icon_library')
        .select('slug, title, icon_url')
        .eq('slug', iconSlug)
        .single();
      
      if (!specificError && specificIcon?.icon_url) {
        selectedIconUrl = specificIcon.icon_url;
        console.log(`Using requested icon: ${iconSlug}`);
        
        const { name } = generateThemedRoomName(language, takenNames);
        return new Response(
          JSON.stringify({ name, icon_url: selectedIconUrl }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Generate themed name and matching icon
    const { name, iconKeyword } = generateThemedRoomName(language, takenNames);
    
    // Validate name
    if (!validateName(name, language)) {
      console.error(`Invalid generated name: ${name}`);
      const fallback = generateThemedRoomName(language, takenNames);
      selectedIconUrl = await searchIconByKeyword(supabase, fallback.iconKeyword, categoryIcons);
      if (!selectedIconUrl) {
        selectedIconUrl = await getRandomIcon(supabase, categoryIcons);
      }
      return new Response(
        JSON.stringify({ name: fallback.name, icon_url: selectedIconUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Search for matching icon based on keyword
    selectedIconUrl = await searchIconByKeyword(supabase, iconKeyword, categoryIcons);
    
    if (!selectedIconUrl) {
      selectedIconUrl = await getRandomIcon(supabase, categoryIcons);
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
