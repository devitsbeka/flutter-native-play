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
 * penguin, whale, dinosaur) is deliberately absent however good the name,
 * and so is any slug a CATEGORY wears — "astronaut" is Astronomy's, so the
 * astronauts wear the suit (utils/categoryIcons).
 *
 * Twenty-four moods by sixty creatures now, up from twelve by thirty: two
 * "Noisy Vampires" sat on the Public list at once out of 360 names (owner:
 * "we have two matching names on public list, we need more random names to
 * avoid repeated room name"). And a name already on a live public room is
 * passed over when dealing — see generateRoomIdentity's `avoid`.
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
  ka: ["მძინარე", "მშიერი", "ზარმაცი", "გიჟი", "მხიარული", "ჯიუტი", "ეშმაკური", "ბრაზიანი", "სწრაფი", "მამაცი", "ხმაურიანი", "საიდუმლო", "ცნობისმოყვარე", "ჭკვიანი", "ველური", "პატარა", "უზარმაზარი", "პირქუში", "თავბრუიანი", "მორცხვი", "იღბლიანი", "უშიშარი", "სულელი", "სამეფო"],
  en: ["Sleepy", "Hungry", "Lazy", "Crazy", "Cheerful", "Stubborn", "Sneaky", "Angry", "Speedy", "Brave", "Noisy", "Secret", "Curious", "Clever", "Wild", "Tiny", "Giant", "Grumpy", "Dizzy", "Shy", "Lucky", "Fearless", "Silly", "Royal"],
  de: ["Verschlafene", "Hungrige", "Faule", "Verrückte", "Fröhliche", "Sture", "Schlaue", "Wütende", "Schnelle", "Mutige", "Laute", "Geheime", "Neugierige", "Kluge", "Wilde", "Winzige", "Riesige", "Mürrische", "Schwindlige", "Schüchterne", "Glückliche", "Furchtlose", "Alberne", "Königliche"],
  fr: ["Endormis", "Affamés", "Paresseux", "Fous", "Joyeux", "Têtus", "Malins", "Fâchés", "Rapides", "Braves", "Bruyants", "Secrets", "Curieux", "Futés", "Sauvages", "Minuscules", "Géants", "Grincheux", "Étourdis", "Timides", "Chanceux", "Intrépides", "Rigolos", "Royaux"],
  es: ["Dormilones", "Hambrientos", "Perezosos", "Locos", "Alegres", "Tercos", "Astutos", "Furiosos", "Veloces", "Valientes", "Ruidosos", "Secretos", "Curiosos", "Listos", "Salvajes", "Diminutos", "Gigantes", "Gruñones", "Mareados", "Tímidos", "Afortunados", "Intrépidos", "Tontos", "Reales"],
  it: ["Assonnati", "Affamati", "Pigri", "Pazzi", "Allegri", "Testardi", "Furbi", "Arrabbiati", "Veloci", "Coraggiosi", "Rumorosi", "Segreti", "Curiosi", "Svegli", "Selvaggi", "Minuscoli", "Giganti", "Brontoloni", "Storditi", "Timidi", "Fortunati", "Impavidi", "Sciocchi", "Reali"],
  pt: ["Sonolentos", "Famintos", "Preguiçosos", "Loucos", "Alegres", "Teimosos", "Astutos", "Furiosos", "Velozes", "Corajosos", "Barulhentos", "Secretos", "Curiosos", "Espertos", "Selvagens", "Minúsculos", "Gigantes", "Rabugentos", "Zonzos", "Tímidos", "Sortudos", "Destemidos", "Bobos", "Reais"],
};

/** `icon` is an icon_library slug that exists in production. */
export const ROOM_CREATURES: Array<{ icon: string } & Record<LangCode, string>> = [
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

/**
 * A room name and the icon that belongs with it.
 *
 * `avoid` is the names already on the list this room is about to join —
 * two rooms called the same thing side by side read as one room listed
 * twice. A name in it is passed over; only when every candidate is taken
 * (a list of hundreds in one language) does the deal fall back to any.
 */
export function generateRoomIdentity(
  language?: string,
  avoid?: Iterable<string | null | undefined>,
): { name: string; icon: string } {
  const lang = normalizeLang(language);
  const candidates = roomNameCandidates(lang);
  const taken = new Set<string>();
  for (const n of avoid ?? []) if (n) taken.add(n.trim().toLowerCase());
  const fresh = taken.size ? candidates.filter((c) => !taken.has(c.name.toLowerCase())) : candidates;
  const pool = fresh.length ? fresh : candidates;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function generateRoomName(language?: string): string {
  return generateRoomIdentity(language).name;
}

/**
 * Is this name still the one the app dealt, rather than one a host typed?
 *
 * Every room is created with a generated name, so "did the host name this
 * room?" cannot be answered by asking whether a name exists. It can be
 * answered by asking whether the name is one this generator could have
 * produced — a mood and a creature out of these tables, in any of the seven
 * languages, since a room made in Georgian may be looked at in English.
 *
 * What it is for: a room built on one of the player's own trivias should be
 * called what the trivia is called, and a host who has since renamed it
 * should keep their name. This is what separates those two cases.
 *
 * A host who types a name that happens to be in the tables ("Brave Lions")
 * loses it to the trivia's title. That is a name they could have been dealt
 * anyway, and the cost of being wrong is the room reading as its own party.
 */
export function isGeneratedRoomName(name: string | null | undefined): boolean {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return false;
  return LANGS.some((lang) =>
    roomNameCandidates(lang).some((candidate) => candidate.name === trimmed),
  );
}

/** Language-appropriate default, for when even the tables are unreachable. */
export function getDefaultRoomName(language?: string): string {
  return normalizeLang(language) === "ka" ? "სახალისო გუნდი" : "Fun Squad";
}
