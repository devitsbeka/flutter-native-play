/**
 * Room names: a mood and a creature, e.g. "Sleepy Dragons".
 *
 * The old list was 120 fixed phrases per language — "Shield Wall", "Enchanted
 * Clan" — translated fantasy boilerplate that named nothing anybody was doing
 * and read as filler in Georgian ("მოჯადოე კლანი"). A mood times a creature
 * is funnier, and there are hundreds of them, so the name is rarely one you
 * have seen before.
 *
 * The creature carries its own icon slug, so the picture always matches the
 * name — "Sleepy Dragons" gets a dragon. Every slug here was checked against
 * the production icon_library; a creature whose icon does not exist (fox,
 * penguin, whale, dinosaur) is deliberately absent however good the name.
 *
 * Two pieces of grammar decide the shape:
 *
 *  - Word order. Georgian, English and German put the adjective first
 *    ("Sleepy Dragons"); French, Spanish, Italian and Portuguese put it after
 *    the noun ("Dragons Endormis"). Getting this backwards is what makes a
 *    generated name read as machine output.
 *  - Gender. Romance adjectives agree with their noun, so every creature here
 *    is masculine plural in all four — which is why owls, tigers, monkeys and
 *    frogs are missing: they are feminine in at least one, and would need a
 *    second adjective form each.
 *
 * The edge function generate-room-name carries the same two tables and is the
 * live source; this is the client's fallback for when it cannot be reached.
 * roomNameGenerator.sync.test.ts fails if the two drift apart.
 */

export type LangCode = "ka" | "en" | "fr" | "de" | "es" | "it" | "pt";

const LANGS: LangCode[] = ["ka", "en", "fr", "de", "es", "it", "pt"];

/** Georgian fits fewer characters in the room-name row than Latin script. */
export const MAX_ROOM_NAME_KA = 18;
export const MAX_ROOM_NAME_LATIN = 22;

/** Languages that read adjective-first. The rest put it after the noun. */
const ADJECTIVE_FIRST: LangCode[] = ["ka", "en", "de"];

export const ROOM_MOODS: Record<LangCode, string[]> = {
  ka: ["მძინარე", "მშიერი", "ზარმაცი", "გიჟი", "მხიარული", "ჯიუტი", "ეშმაკური", "ბრაზიანი", "სწრაფი", "მამაცი", "ხმაურიანი", "საიდუმლო"],
  en: ["Sleepy", "Hungry", "Lazy", "Crazy", "Cheerful", "Stubborn", "Sneaky", "Angry", "Speedy", "Brave", "Noisy", "Secret"],
  de: ["Verschlafene", "Hungrige", "Faule", "Verrückte", "Fröhliche", "Sture", "Schlaue", "Wütende", "Schnelle", "Mutige", "Laute", "Geheime"],
  fr: ["Endormis", "Affamés", "Paresseux", "Fous", "Joyeux", "Têtus", "Malins", "Fâchés", "Rapides", "Braves", "Bruyants", "Secrets"],
  es: ["Dormilones", "Hambrientos", "Perezosos", "Locos", "Alegres", "Tercos", "Astutos", "Furiosos", "Veloces", "Valientes", "Ruidosos", "Secretos"],
  it: ["Assonnati", "Affamati", "Pigri", "Pazzi", "Allegri", "Testardi", "Furbi", "Arrabbiati", "Veloci", "Coraggiosi", "Rumorosi", "Segreti"],
  pt: ["Sonolentos", "Famintos", "Preguiçosos", "Loucos", "Alegres", "Teimosos", "Astutos", "Furiosos", "Velozes", "Corajosos", "Barulhentos", "Secretos"],
};

/** `icon` is an icon_library slug that exists in production. */
export const ROOM_CREATURES: Array<{ icon: string } & Record<LangCode, string>> = [
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

function normalizeLang(lang: string | null | undefined): LangCode {
  const l = (lang || "").toLowerCase().trim();
  return (LANGS as string[]).includes(l) ? (l as LangCode) : "en";
}

export function maxRoomNameLength(lang: LangCode): number {
  return lang === "ka" ? MAX_ROOM_NAME_KA : MAX_ROOM_NAME_LATIN;
}

/** "Sleepy Dragons" / "Dragons Endormis", per the language's word order. */
export function composeRoomName(mood: string, creature: string, lang: LangCode): string {
  return ADJECTIVE_FIRST.includes(lang) ? `${mood} ${creature}` : `${creature} ${mood}`;
}

/**
 * Every pairing that fits the row. Georgian words are long, so a handful of
 * combinations ("ხმაურიანი კიბორჩხალები") are too wide to render — they are
 * dropped here rather than truncated with an ellipsis on screen.
 */
export function roomNameCandidates(lang: LangCode): Array<{ name: string; icon: string }> {
  const max = maxRoomNameLength(lang);
  const out: Array<{ name: string; icon: string }> = [];
  for (const mood of ROOM_MOODS[lang]) {
    for (const creature of ROOM_CREATURES) {
      const name = composeRoomName(mood, creature[lang], lang);
      if (name.length <= max) out.push({ name, icon: creature.icon });
    }
  }
  return out;
}

/** A room name and the icon that belongs with it. */
export function generateRoomIdentity(language?: string): { name: string; icon: string } {
  const lang = normalizeLang(language);
  const candidates = roomNameCandidates(lang);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function generateRoomName(language?: string): string {
  return generateRoomIdentity(language).name;
}

/** Language-appropriate default, for when even the tables are unreachable. */
export function getDefaultRoomName(language?: string): string {
  return normalizeLang(language) === "ka" ? "სახალისო გუნდი" : "Fun Squad";
}
