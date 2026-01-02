/**
 * Category-specific keyword to icon slug mappings
 * Used by smart-assign-icons to find the best matching icons per question
 */

export const CATEGORY_ICON_KEYWORDS: Record<string, Record<string, string[]>> = {
  world_history: {
    // Ancient civilizations
    egypt: ['pharaoh-death-mask', 'pyramid', 'egyptian-scarab', 'egyptian-mummy', 'nefertiti', 'tutankhamun', 'sphinx', 'hieroglyph'],
    pharaoh: ['pharaoh-death-mask', 'pyramid', 'egyptian-mummy', 'nefertiti', 'tutankhamun'],
    pyramid: ['pyramid', 'egyptian-scarab', 'sphinx'],
    rome: ['roman-gladiator-helmet', 'roman-laurel-wreath', 'roman-toga', 'roman-fasces', 'colosseum', 'caesar', 'roman-column'],
    roman: ['roman-gladiator-helmet', 'roman-laurel-wreath', 'colosseum', 'caesar'],
    caesar: ['roman-laurel-wreath', 'roman-gladiator-helmet', 'caesar'],
    greece: ['greek-amphitheater', 'greek-amphora', 'greek-lyra', 'parthenon', 'acropolis', 'olympus'],
    greek: ['greek-amphitheater', 'greek-amphora', 'parthenon'],
    athens: ['parthenon', 'greek-amphitheater', 'acropolis'],
    sparta: ['spartan-helmet', 'greek-amphitheater', 'shield'],
    china: ['great-wall-of-china', 'china', 'chinese-dragon', 'pagoda', 'forbidden-city'],
    chinese: ['great-wall-of-china', 'chinese-dragon', 'pagoda'],
    mesopotamia: ['babylonian-lion-relief', 'assyrian-lamassu', 'cuneiform', 'ziggurat'],
    babylon: ['babylonian-lion-relief', 'ziggurat', 'hanging-gardens'],
    persia: ['persian-empire', 'cyrus', 'persepolis'],
    
    // Medieval & European
    viking: ['viking-shield', 'viking-long-boat', 'viking-helmet', 'norse', 'rune'],
    medieval: ['castle', 'crown', 'sword', 'knight', 'shield', 'catapult', 'trebuchet'],
    knight: ['knight', 'armor', 'sword', 'shield', 'castle'],
    crusade: ['crusader-helmet', 'sword', 'cross', 'jerusalem'],
    feudal: ['castle', 'crown', 'peasant', 'lord'],
    
    // American civilizations
    aztec: ['aztec-sun-stone', 'aztec-mask', 'mayan-pyramid', 'tenochtitlan'],
    maya: ['mayan-pyramid', 'mayan-calendar', 'mayan-glyph'],
    inca: ['machu-picchu', 'inca', 'llama'],
    
    // Modern history - Wars
    world_war: ['world-war-ii-sherman-tank', 'world-war-ii-spitfire-fighter', 'pineapple-hand-grenade', 'helmet', 'tank'],
    ww1: ['world-war-ii-spitfire-fighter', 'trench', 'helmet', 'cannon'],
    ww2: ['world-war-ii-sherman-tank', 'world-war-ii-spitfire-fighter', 'tank', 'airplane'],
    nazi: ['world-war-ii-sherman-tank', 'iron-cross', 'bunker'],
    hitler: ['world-war-ii-sherman-tank', 'bunker', 'swastika'],
    holocaust: ['menorah', 'star-of-david', 'auschwitz'],
    cold_war: ['berlin-wall', 'iron-curtain', 'nuclear', 'atom-bomb'],
    nuclear: ['atom-bomb', 'nuclear', 'mushroom-cloud'],
    
    // Revolutions & Politics
    revolution: ['guillotine', 'flag', 'torch', 'barricade'],
    french_revolution: ['guillotine', 'bastille', 'tricolor'],
    napoleon: ['napoleon', 'tricorn-hat', 'french-flag', 'waterloo'],
    independence: ['flag', 'liberty-bell', 'declaration'],
    democracy: ['vote', 'ballot', 'parliament', 'capitol'],
    communism: ['hammer-and-sickle', 'red-star', 'lenin', 'marx'],
    soviet: ['hammer-and-sickle', 'red-star', 'kremlin'],
    
    // Exploration & Discovery
    exploration: ['compass', 'ship', 'telescope', 'map', 'globe'],
    columbus: ['ship', 'compass', 'santa-maria'],
    magellan: ['ship', 'globe', 'compass'],
    discovery: ['compass', 'telescope', 'magnifying-glass'],
    
    // Inventions & Science
    invention: ['lightbulb', 'gear', 'cog', 'machine'],
    industrial: ['factory', 'steam-engine', 'coal', 'gear'],
    printing: ['printing-press', 'gutenberg', 'book'],
    
    // Famous people
    cleopatra: ['nefertiti', 'egyptian-scarab', 'asp'],
    alexander: ['macedonian', 'helmet', 'horse'],
    genghis: ['mongol', 'horse', 'bow'],
    ottoman: ['ottoman', 'crescent', 'sultan'],
    
    // Religions & Culture
    christianity: ['cross', 'church', 'bible', 'cathedral'],
    islam: ['crescent', 'mosque', 'quran'],
    buddhism: ['buddha', 'lotus', 'temple'],
    renaissance: ['mona-lisa', 'vitruvian-man', 'paintbrush'],
  },
  
  military_history: {
    // Ancient warfare
    roman_army: ['roman-gladiator-helmet', 'legion', 'spear', 'shield'],
    spartan: ['spartan-helmet', 'shield', 'spear'],
    macedonian: ['macedonian-phalanx', 'sarissa', 'alexander'],
    
    // Medieval warfare
    knight: ['knight', 'armor', 'sword', 'lance', 'horse'],
    siege: ['catapult', 'trebuchet', 'battering-ram', 'castle'],
    archer: ['bow', 'arrow', 'crossbow', 'longbow'],
    cavalry: ['horse', 'lance', 'saber'],
    
    // Modern warfare
    tank: ['world-war-ii-sherman-tank', 'tank', 'panzer'],
    airplane: ['world-war-ii-spitfire-fighter', 'fighter-jet', 'bomber'],
    submarine: ['submarine', 'torpedo', 'u-boat'],
    artillery: ['cannon', 'howitzer', 'mortar'],
    rifle: ['rifle', 'musket', 'bayonet'],
    machine_gun: ['machine-gun', 'gatling'],
    grenade: ['pineapple-hand-grenade', 'grenade', 'explosive'],
    
    // Naval
    battleship: ['battleship', 'warship', 'destroyer'],
    aircraft_carrier: ['aircraft-carrier', 'carrier'],
    
    // Famous battles
    waterloo: ['napoleon', 'cavalry', 'cannon'],
    stalingrad: ['world-war-ii-sherman-tank', 'soviet-star', 'ruined-city'],
    normandy: ['landing-craft', 'beach', 'd-day'],
  },
  
  georgian_history: {
    // Ancient Georgia
    colchis: ['golden-fleece', 'argonauts', 'ancient-ship'],
    iberia: ['ancient-helmet', 'sword', 'shield'],
    
    // Medieval Georgia
    bagrationi: ['crown', 'lion', 'cross'],
    tamar: ['crown', 'queen', 'scepter'],
    david_builder: ['crown', 'sword', 'church'],
    gelati: ['monastery', 'church', 'cross'],
    
    // Invasions
    mongol: ['mongol-helmet', 'horse', 'bow'],
    timur: ['sword', 'helmet', 'conquest'],
    ottoman: ['crescent', 'sword', 'siege'],
    persian: ['persian', 'shah', 'sword'],
    
    // Modern Georgia
    independence: ['flag', 'freedom', 'parliament'],
    soviet: ['hammer-and-sickle', 'red-star', 'occupation'],
    
    // Culture
    alphabet: ['georgian-alphabet', 'script', 'letter'],
    wine: ['wine', 'qvevri', 'grape', 'vineyard'],
    church: ['cross', 'church', 'monastery', 'cathedral'],
  },
  
  science: {
    physics: ['atom', 'electron', 'particle', 'wave', 'relativity'],
    chemistry: ['molecule', 'flask', 'beaker', 'periodic-table', 'element'],
    biology: ['dna', 'cell', 'microscope', 'bacteria', 'evolution'],
    astronomy: ['telescope', 'star', 'planet', 'galaxy', 'rocket'],
    mathematics: ['pi', 'equation', 'calculator', 'graph', 'geometry'],
    medicine: ['stethoscope', 'pill', 'syringe', 'hospital', 'doctor'],
    technology: ['computer', 'chip', 'robot', 'circuit', 'code'],
    
    // Famous scientists
    einstein: ['relativity', 'atom', 'formula'],
    newton: ['apple', 'gravity', 'prism'],
    darwin: ['evolution', 'finch', 'tree-of-life'],
    curie: ['radioactive', 'radium', 'flask'],
  },
  
  geography: {
    mountain: ['mountain', 'peak', 'summit', 'everest', 'alps'],
    river: ['river', 'waterfall', 'stream', 'amazon', 'nile'],
    ocean: ['ocean', 'wave', 'sea', 'pacific', 'atlantic'],
    desert: ['desert', 'cactus', 'sand', 'sahara', 'camel'],
    forest: ['tree', 'forest', 'jungle', 'rainforest', 'amazon'],
    island: ['island', 'palm-tree', 'beach', 'tropical'],
    volcano: ['volcano', 'lava', 'eruption', 'crater'],
    capital: ['capitol', 'parliament', 'government', 'city'],
    country: ['flag', 'map', 'border', 'nation'],
    continent: ['globe', 'world-map', 'earth', 'continent'],
  },
  
  art: {
    painting: ['paintbrush', 'palette', 'canvas', 'easel', 'frame'],
    sculpture: ['statue', 'marble', 'chisel', 'bust'],
    music: ['music-note', 'piano', 'violin', 'guitar', 'orchestra'],
    architecture: ['building', 'column', 'dome', 'arch', 'cathedral'],
    literature: ['book', 'quill', 'scroll', 'manuscript', 'library'],
    theater: ['mask', 'stage', 'curtain', 'spotlight'],
    dance: ['ballet', 'dancer', 'tutu', 'pirouette'],
    
    // Art movements
    renaissance: ['mona-lisa', 'vitruvian-man', 'sistine-chapel'],
    baroque: ['ornate', 'gold', 'dramatic'],
    impressionism: ['water-lily', 'monet', 'light'],
    modern: ['abstract', 'picasso', 'cubism'],
  },
  
  movies: {
    hollywood: ['film-reel', 'clapperboard', 'camera', 'star', 'oscar'],
    director: ['megaphone', 'directors-chair', 'clapperboard'],
    actor: ['mask', 'star', 'spotlight', 'microphone'],
    oscar: ['trophy', 'oscar-statue', 'award', 'gold'],
    cinema: ['projector', 'screen', 'popcorn', 'ticket'],
    
    // Genres
    horror: ['ghost', 'skull', 'vampire', 'monster'],
    comedy: ['laugh', 'smile', 'clown', 'funny'],
    action: ['explosion', 'gun', 'car-chase', 'hero'],
    scifi: ['alien', 'spaceship', 'robot', 'laser'],
    animation: ['cartoon', 'mouse', 'disney', 'pixar'],
  },
  
  sport: {
    football: ['football', 'soccer-ball', 'goal', 'stadium'],
    basketball: ['basketball', 'hoop', 'court', 'dunk'],
    tennis: ['tennis-ball', 'racket', 'court', 'net'],
    swimming: ['swimmer', 'pool', 'medal', 'goggles'],
    athletics: ['runner', 'track', 'hurdle', 'sprint'],
    boxing: ['boxing-glove', 'ring', 'knockout'],
    olympics: ['olympic-rings', 'medal', 'torch', 'podium'],
    championship: ['trophy', 'medal', 'cup', 'winner'],
  },
  
  music: {
    classical: ['violin', 'piano', 'orchestra', 'conductor', 'symphony'],
    rock: ['electric-guitar', 'drums', 'microphone', 'amplifier'],
    jazz: ['saxophone', 'trumpet', 'piano', 'double-bass'],
    pop: ['microphone', 'star', 'spotlight', 'crowd'],
    opera: ['theater-mask', 'singer', 'stage', 'aria'],
    
    // Instruments
    piano: ['piano', 'keys', 'grand-piano'],
    guitar: ['guitar', 'acoustic-guitar', 'electric-guitar'],
    violin: ['violin', 'bow', 'strings'],
    drums: ['drums', 'drumstick', 'cymbal'],
  },
  
  literature: {
    novel: ['book', 'pages', 'bookmark', 'library'],
    poetry: ['quill', 'scroll', 'ink', 'feather'],
    drama: ['theater-mask', 'stage', 'shakespeare'],
    author: ['quill', 'typewriter', 'manuscript', 'desk'],
    
    // Famous works
    shakespeare: ['skull', 'quill', 'theater-mask', 'globe-theater'],
    homer: ['greek-amphora', 'ship', 'odyssey'],
    dante: ['inferno', 'flame', 'circles'],
  },
};

/**
 * Get priority icon slugs for a keyword within a category
 */
export function getIconsForKeyword(categoryId: string, keyword: string): string[] {
  const categoryMap = CATEGORY_ICON_KEYWORDS[categoryId];
  if (!categoryMap) return [];
  
  const normalizedKeyword = keyword.toLowerCase().replace(/[^a-z0-9]/g, '_');
  return categoryMap[normalizedKeyword] || [];
}

/**
 * Get all keywords for a category
 */
export function getCategoryKeywords(categoryId: string): string[] {
  const categoryMap = CATEGORY_ICON_KEYWORDS[categoryId];
  if (!categoryMap) return [];
  return Object.keys(categoryMap);
}
