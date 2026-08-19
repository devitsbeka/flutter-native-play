// Latin to Georgian phonetic map
const LATIN_TO_GEORGIAN: Record<string, string> = {
  'a': 'ა', 'b': 'ბ', 'g': 'გ', 'd': 'დ', 'e': 'ე', 'v': 'ვ', 'z': 'ზ',
  't': 'თ', 'i': 'ი', 'k': 'კ', 'l': 'ლ', 'm': 'მ', 'n': 'ნ', 'o': 'ო',
  'p': 'პ', 'r': 'რ', 's': 'ს', 'u': 'უ', 'f': 'ფ', 'q': 'ყ', 'j': 'ჯ',
  'h': 'ჰ', 'w': 'ვ', 'y': 'ი', 'c': 'ც', 'x': 'ხ',
  // Georgian-specific combinations
  'sh': 'შ', 'ch': 'ჩ', 'ts': 'ც', 'dz': 'ძ', 'gh': 'ღ', 'kh': 'ხ',
  'zh': 'ჟ', 'th': 'თ'
};

// Georgian to Latin phonetic map (reverse transliteration)
const GEORGIAN_TO_LATIN: Record<string, string> = {
  'ა': 'a', 'ბ': 'b', 'გ': 'g', 'დ': 'd', 'ე': 'e',
  'ვ': 'v', 'ზ': 'z', 'თ': 't', 'ი': 'i', 'კ': 'k',
  'ლ': 'l', 'მ': 'm', 'ნ': 'n', 'ო': 'o', 'პ': 'p',
  'ჟ': 'zh', 'რ': 'r', 'ს': 's', 'ტ': 't', 'უ': 'u',
  'ფ': 'f', 'ქ': 'k', 'ღ': 'gh', 'ყ': 'q', 'შ': 'sh',
  'ჩ': 'ch', 'ც': 'ts', 'ძ': 'dz', 'წ': 'ts', 'ჭ': 'ch',
  'ხ': 'kh', 'ჯ': 'j', 'ჰ': 'h'
};

// Common English to Georgian word mappings for semantic search
const ENGLISH_TO_GEORGIAN: Record<string, string[]> = {
  // Animals
  'milk': ['რძე', 'რძის'],
  'cow': ['ძროხა', 'ძროხის'],
  'dog': ['ძაღლი', 'ძაღლის'],
  'cat': ['კატა', 'კატის'],
  'horse': ['ცხენი', 'ცხენის'],
  'bird': ['ფრინველი', 'ფრინველის', 'ჩიტი', 'ჩიტის'],
  'fish': ['თევზი', 'თევზის'],
  'lion': ['ლომი', 'ლომის'],
  'elephant': ['სპილო', 'სპილოს'],
  'bear': ['დათვი', 'დათვის'],
  'wolf': ['მგელი', 'მგლის'],
  'snake': ['გველი', 'გველის'],
  'chameleon': ['ქამელეონი', 'ქამელეონის'],
  'dolphin': ['დელფინი', 'დელფინის'],
  'whale': ['ვეშაპი', 'ვეშაპის'],
  'monkey': ['მაიმუნი', 'მაიმუნის'],
  'tiger': ['ვეფხვი', 'ვეფხვის'],
  'deer': ['ირემი', 'ირმის'],
  'rabbit': ['კურდღელი', 'კურდღლის'],
  'fox': ['მელა', 'მელის'],
  'eagle': ['არწივი', 'არწივის'],
  'owl': ['ბუ', 'ბუს'],
  'shark': ['ზვიგენი', 'ზვიგენის'],
  
  // Nature
  'water': ['წყალი', 'წყლის'],
  'fire': ['ცეცხლი', 'ცეცხლის'],
  'sun': ['მზე', 'მზის'],
  'moon': ['მთვარე', 'მთვარის'],
  'star': ['ვარსკვლავი', 'ვარსკვლავის'],
  'earth': ['დედამიწა', 'მიწა', 'მიწის'],
  'sky': ['ცა', 'ცის'],
  'mountain': ['მთა', 'მთის'],
  'river': ['მდინარე', 'მდინარის'],
  'sea': ['ზღვა', 'ზღვის'],
  'ocean': ['ოკეანე', 'ოკეანის'],
  'forest': ['ტყე', 'ტყის'],
  'tree': ['ხე', 'ხის'],
  'flower': ['ყვავილი', 'ყვავილის'],
  'rain': ['წვიმა', 'წვიმის'],
  'snow': ['თოვლი', 'თოვლის'],
  'wind': ['ქარი', 'ქარის'],
  'cloud': ['ღრუბელი', 'ღრუბლის'],
  
  // People & Society
  'king': ['მეფე', 'მეფის'],
  'queen': ['დედოფალი', 'დედოფლის'],
  'prince': ['უფლისწული', 'პრინცი'],
  'princess': ['პრინცესა', 'უფლისწული'],
  'man': ['კაცი', 'კაცის', 'მამაკაცი'],
  'woman': ['ქალი', 'ქალის'],
  'child': ['ბავშვი', 'ბავშვის'],
  'soldier': ['ჯარისკაცი', 'მეომარი'],
  'doctor': ['ექიმი', 'ექიმის'],
  'teacher': ['მასწავლებელი'],
  'scientist': ['მეცნიერი', 'მეცნიერის'],
  'artist': ['მხატვარი', 'მხატვრის'],
  'writer': ['მწერალი', 'მწერლის'],
  'poet': ['პოეტი', 'პოეტის'],
  
  // History & War
  'battle': ['ბრძოლა', 'ბრძოლის'],
  'war': ['ომი', 'ომის'],
  'peace': ['მშვიდობა', 'მშვიდობის'],
  'sword': ['ხმალი', 'ხმლის'],
  'shield': ['ფარი', 'ფარის'],
  'castle': ['ციხე', 'ციხის', 'სასახლე'],
  'kingdom': ['სამეფო', 'სამეფოს'],
  'empire': ['იმპერია', 'იმპერიის'],
  'army': ['ჯარი', 'არმია'],
  'victory': ['გამარჯვება', 'გამარჯვების'],
  
  // Geography
  'city': ['ქალაქი', 'ქალაქის'],
  'country': ['ქვეყანა', 'ქვეყნის'],
  'georgia': ['საქართველო', 'საქართველოს'],
  'tbilisi': ['თბილისი', 'თბილისის'],
  'europe': ['ევროპა', 'ევროპის'],
  'asia': ['აზია', 'აზიის'],
  'africa': ['აფრიკა', 'აფრიკის'],
  'america': ['ამერიკა', 'ამერიკის'],
  'world': ['მსოფლიო', 'სამყარო'],
  
  // Science
  'science': ['მეცნიერება', 'მეცნიერების'],
  'physics': ['ფიზიკა', 'ფიზიკის'],
  'chemistry': ['ქიმია', 'ქიმიის'],
  'biology': ['ბიოლოგია', 'ბიოლოგიის'],
  'math': ['მათემატიკა', 'მათემატიკის'],
  'atom': ['ატომი', 'ატომის'],
  'planet': ['პლანეტა', 'პლანეტის'],
  'space': ['კოსმოსი', 'კოსმოსის'],
  'galaxy': ['გალაქტიკა', 'გალაქტიკის'],
  
  // Food & Drink
  'bread': ['პური', 'პურის'],
  'wine': ['ღვინო', 'ღვინის'],
  'cheese': ['ყველი', 'ყველის'],
  'meat': ['ხორცი', 'ხორცის'],
  'fruit': ['ხილი', 'ხილის'],
  'apple': ['ვაშლი', 'ვაშლის'],
  'grape': ['ყურძენი', 'ყურძნის'],
  'food': ['საჭმელი', 'საკვები'],
  
  // Colors
  'red': ['წითელი', 'წითელ'],
  'blue': ['ლურჯი', 'ლურჯ', 'ცისფერი'],
  'green': ['მწვანე', 'მწვან'],
  'yellow': ['ყვითელი', 'ყვითელ'],
  'black': ['შავი', 'შავ'],
  'white': ['თეთრი', 'თეთრ'],
  'gold': ['ოქრო', 'ოქროს', 'ოქროსფერი'],
  'silver': ['ვერცხლი', 'ვერცხლის'],
  
  // Time
  'year': ['წელი', 'წლის'],
  'month': ['თვე', 'თვის'],
  'day': ['დღე', 'დღის'],
  'night': ['ღამე', 'ღამის'],
  'century': ['საუკუნე', 'საუკუნის'],
  'history': ['ისტორია', 'ისტორიის'],
  'ancient': ['უძველესი', 'ძველი'],
  
  // Religion & Culture
  'church': ['ეკლესია', 'ეკლესიის'],
  'god': ['ღმერთი', 'ღმერთის', 'ღვთის'],
  'saint': ['წმინდა', 'წმინდანი'],
  'religion': ['რელიგია', 'რელიგიის'],
  'culture': ['კულტურა', 'კულტურის'],
  'tradition': ['ტრადიცია', 'ტრადიციის'],
  'art': ['ხელოვნება', 'ხელოვნების'],
  'music': ['მუსიკა', 'მუსიკის'],
  'dance': ['ცეკვა', 'ცეკვის'],
  'book': ['წიგნი', 'წიგნის'],
  'language': ['ენა', 'ენის'],
  
  // Body
  'heart': ['გული', 'გულის'],
  'brain': ['ტვინი', 'ტვინის'],
  'eye': ['თვალი', 'თვალის'],
  'hand': ['ხელი', 'ხელის'],
  'blood': ['სისხლი', 'სისხლის'],
  
  // Sports
  'football': ['ფეხბურთი', 'ფეხბურთის'],
  'basketball': ['კალათბურთი', 'კალათბურთის'],
  'tennis': ['ჩოგბურთი', 'ჩოგბურთის'],
  'sport': ['სპორტი', 'სპორტის'],
  
  // Technology
  'computer': ['კომპიუტერი', 'კომპიუტერის'],
  'phone': ['ტელეფონი', 'ტელეფონის'],
  'internet': ['ინტერნეტი', 'ინტერნეტის'],
  
  // Transport
  'car': ['მანქანა', 'მანქანის'],
  'plane': ['თვითმფრინავი', 'თვითმფრინავის'],
  'ship': ['გემი', 'გემის'],
  'train': ['მატარებელი', 'მატარებლის'],
};

// Georgian to English semantic map (reverse mapping)
const GEORGIAN_TO_ENGLISH: Record<string, string[]> = {
  // Animals
  'ზვიგენ': ['shark', 'fish'],
  'ზვიგენი': ['shark', 'fish'],
  'ძაღლ': ['dog', 'puppy', 'pet'],
  'ძაღლი': ['dog', 'puppy', 'pet'],
  'კატ': ['cat', 'kitten', 'pet'],
  'კატა': ['cat', 'kitten', 'pet'],
  'ფრინველ': ['bird', 'avian'],
  'ფრინველი': ['bird', 'avian'],
  'თევზ': ['fish', 'aquatic'],
  'თევზი': ['fish', 'aquatic'],
  'ლომ': ['lion', 'cat', 'wild'],
  'ლომი': ['lion', 'cat', 'wild'],
  'დათვ': ['bear', 'wild'],
  'დათვი': ['bear', 'wild'],
  'ცხენ': ['horse', 'equine'],
  'ცხენი': ['horse', 'equine'],
  'სპილ': ['elephant', 'trunk'],
  'სპილო': ['elephant', 'trunk'],
  'გველ': ['snake', 'serpent'],
  'გველი': ['snake', 'serpent'],
  'მგელ': ['wolf', 'canine'],
  'მგელი': ['wolf', 'canine'],
  'ვეშაპ': ['whale', 'ocean'],
  'ვეშაპი': ['whale', 'ocean'],
  'დელფინ': ['dolphin', 'ocean'],
  'დელფინი': ['dolphin', 'ocean'],
  'არწივ': ['eagle', 'bird'],
  'არწივი': ['eagle', 'bird'],
  
  // Nature
  'მზ': ['sun', 'solar'],
  'მზე': ['sun', 'solar'],
  'მთვარ': ['moon', 'lunar'],
  'მთვარე': ['moon', 'lunar'],
  'ვარსკვლავ': ['star', 'stellar'],
  'ვარსკვლავი': ['star', 'stellar'],
  'მთ': ['mountain', 'peak'],
  'მთა': ['mountain', 'peak'],
  'ზღვ': ['sea', 'ocean'],
  'ზღვა': ['sea', 'ocean'],
  'მდინარ': ['river', 'stream'],
  'მდინარე': ['river', 'stream'],
  'ტყ': ['forest', 'tree'],
  'ტყე': ['forest', 'tree'],
  'ყვავილ': ['flower', 'bloom'],
  'ყვავილი': ['flower', 'bloom'],
  
  // Geography
  'ქალაქ': ['city', 'town', 'urban'],
  'ქალაქი': ['city', 'town', 'urban'],
  'ქვეყან': ['country', 'nation'],
  'ქვეყანა': ['country', 'nation'],
  'საქართველ': ['georgia', 'country'],
  'საქართველო': ['georgia', 'country'],
  'თბილის': ['tbilisi', 'capital'],
  'თბილისი': ['tbilisi', 'capital'],
  
  // People
  'მწერალ': ['writer', 'author', 'pen'],
  'მწერალი': ['writer', 'author', 'pen'],
  'პოეტ': ['poet', 'poetry', 'quill'],
  'პოეტი': ['poet', 'poetry', 'quill'],
  'მხატვარ': ['artist', 'painter', 'brush'],
  'მხატვარი': ['artist', 'painter', 'brush'],
  'მეცნიერ': ['scientist', 'research', 'lab'],
  'მეცნიერი': ['scientist', 'research', 'lab'],
  'მეფ': ['king', 'castle', 'royal'],
  'მეფე': ['king', 'castle', 'royal'],
  'დედოფალ': ['queen', 'palace', 'royal'],
  'დედოფალი': ['queen', 'palace', 'royal'],
  
  // Sports
  'ფეხბურთ': ['football', 'soccer', 'ball'],
  'ფეხბურთი': ['football', 'soccer', 'ball'],
  'კალათბურთ': ['basketball', 'ball', 'hoop'],
  'კალათბურთი': ['basketball', 'ball', 'hoop'],
  'სპორტ': ['sport', 'athletics', 'game'],
  'სპორტი': ['sport', 'athletics', 'game'],
  
  // Food
  'საჭმელ': ['food', 'meal', 'dish'],
  'საჭმელი': ['food', 'meal', 'dish'],
  'ღვინ': ['wine', 'grape', 'drink'],
  'ღვინო': ['wine', 'grape', 'drink'],
  'პურ': ['bread', 'bakery', 'food'],
  'პური': ['bread', 'bakery', 'food'],
  'ხაჭაპურ': ['khachapuri', 'cheese', 'bread'],
  'ხაჭაპური': ['khachapuri', 'cheese', 'bread'],
  'ხინკალ': ['khinkali', 'dumpling', 'food'],
  'ხინკალი': ['khinkali', 'dumpling', 'food'],
  
  // Technology
  'კომპიუტერ': ['computer', 'laptop', 'tech'],
  'კომპიუტერი': ['computer', 'laptop', 'tech'],
  'ტელეფონ': ['phone', 'mobile', 'call'],
  'ტელეფონი': ['phone', 'mobile', 'call'],
  'ინტერნეტ': ['internet', 'web', 'online'],
  'ინტერნეტი': ['internet', 'web', 'online'],
  
  // Transport
  'მანქან': ['car', 'vehicle', 'auto'],
  'მანქანა': ['car', 'vehicle', 'auto'],
  'თვითმფრინავ': ['airplane', 'plane', 'flight'],
  'თვითმფრინავი': ['airplane', 'plane', 'flight'],
  'გემ': ['ship', 'boat', 'vessel'],
  'გემი': ['ship', 'boat', 'vessel'],
  
  // History/Culture
  'ისტორი': ['history', 'past', 'ancient'],
  'ისტორია': ['history', 'past', 'ancient'],
  'კულტურ': ['culture', 'art', 'tradition'],
  'კულტურა': ['culture', 'art', 'tradition'],
  'ომ': ['war', 'battle', 'military'],
  'ომი': ['war', 'battle', 'military'],
  
  // Music
  'მუსიკ': ['music', 'song', 'melody'],
  'მუსიკა': ['music', 'song', 'melody'],
  'სიმღერ': ['song', 'music', 'singing'],
  'სიმღერა': ['song', 'music', 'singing'],
  
  // Colors
  'წითელ': ['red', 'color', 'crimson'],
  'წითელი': ['red', 'color', 'crimson'],
  'ლურჯ': ['blue', 'color', 'azure'],
  'ლურჯი': ['blue', 'color', 'azure'],
  'მწვან': ['green', 'color', 'nature'],
  'მწვანე': ['green', 'color', 'nature'],
  'ყვითელ': ['yellow', 'color', 'gold'],
  'ყვითელი': ['yellow', 'color', 'gold'],
  'შავ': ['black', 'color', 'dark'],
  'შავი': ['black', 'color', 'dark'],
  'თეთრ': ['white', 'color', 'light'],
  'თეთრი': ['white', 'color', 'light'],
};

// Common Georgian grammatical suffixes to strip for better matching
const GEORGIAN_SUFFIXES = ['ი', 'მა', 'ს', 'ით', 'ად', 'ში', 'ზე', 'თან', 'დან', 'ისა', 'ებ', 'ის'];

// Common typo corrections for frontend fuzzy matching
const TYPO_CORRECTIONS: Record<string, string> = {
  'cata': 'kata', 'katta': 'kata', 'kataa': 'kata', 'qata': 'kata',
  'dogg': 'dog', 'dgo': 'dog',
  'brid': 'bird', 'bidr': 'bird',
  'fich': 'fish', 'fissh': 'fish',
  'loin': 'lion', 'lioon': 'lion', 'lino': 'lion',
  'musci': 'music', 'muisc': 'music', 'musikc': 'music',
  'moive': 'movie', 'movei': 'movie', 'mvoie': 'movie',
  'pohne': 'phone', 'phoen': 'phone', 'fone': 'phone',
  'computre': 'computer', 'compueter': 'computer', 'computar': 'computer',
  'footbal': 'football', 'fooball': 'football', 'fotball': 'football',
  'basketbal': 'basketball', 'bascetball': 'basketball', 'basektball': 'basketball',
  'fexburt': 'fexburti', 'fexburthi': 'fexburti',
};

/**
 * Calculate Levenshtein distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Check if two strings are similar (typo-tolerant)
 * Returns similarity score 0-100
 */
export function fuzzyMatch(a: string, b: string): number {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();
  
  if (aLower === bLower) return 100;
  if (aLower.startsWith(bLower) || bLower.startsWith(aLower)) return 85;
  if (aLower.includes(bLower) || bLower.includes(aLower)) return 70;
  
  if (a.length < 3 || b.length < 3) return 0;
  
  const distance = levenshteinDistance(aLower, bLower);
  const maxLen = Math.max(a.length, b.length);
  return Math.max(0, 100 - (distance / maxLen) * 100);
}

/**
 * Get typo correction for a term
 */
export function getTypoCorrection(term: string): string | null {
  return TYPO_CORRECTIONS[term.toLowerCase()] || null;
}

/**
 * Strip Georgian grammatical suffixes for better matching
 */
function stripGeorgianSuffixes(word: string): string {
  for (const suffix of GEORGIAN_SUFFIXES) {
    if (word.endsWith(suffix) && word.length > suffix.length + 2) {
      return word.slice(0, -suffix.length);
    }
  }
  return word;
}

/**
 * Transliterate Latin text to Georgian phonetically
 */
export function transliterateLatin(text: string): string {
  let result = text.toLowerCase();
  
  // First handle multi-character combinations
  const combinations = ['sh', 'ch', 'ts', 'dz', 'gh', 'kh', 'zh', 'th'];
  for (const combo of combinations) {
    if (LATIN_TO_GEORGIAN[combo]) {
      result = result.replace(new RegExp(combo, 'g'), LATIN_TO_GEORGIAN[combo]);
    }
  }
  
  // Then handle single characters
  let output = '';
  for (const char of result) {
    output += LATIN_TO_GEORGIAN[char] || char;
  }
  
  return output;
}

/**
 * Transliterate Georgian text to Latin phonetically
 */
export function transliterateGeorgian(text: string): string {
  let output = '';
  for (const char of text) {
    output += GEORGIAN_TO_LATIN[char] || char;
  }
  return output.toLowerCase();
}

/**
 * Get Georgian equivalents for an English word
 */
export function getGeorgianEquivalents(englishWord: string): string[] {
  const normalized = englishWord.toLowerCase().trim();
  return ENGLISH_TO_GEORGIAN[normalized] || [];
}

/**
 * Get English equivalents for a Georgian word
 */
export function getEnglishEquivalents(georgianWord: string): string[] {
  const normalized = georgianWord.toLowerCase().trim();
  
  // Try exact match first
  if (GEORGIAN_TO_ENGLISH[normalized]) {
    return GEORGIAN_TO_ENGLISH[normalized];
  }
  
  // Try with stripped suffixes
  const stripped = stripGeorgianSuffixes(normalized);
  if (GEORGIAN_TO_ENGLISH[stripped]) {
    return GEORGIAN_TO_ENGLISH[stripped];
  }
  
  // Try partial match (prefix)
  for (const [key, values] of Object.entries(GEORGIAN_TO_ENGLISH)) {
    if (normalized.startsWith(key) || key.startsWith(normalized)) {
      return values;
    }
  }
  
  return [];
}

/**
 * Check if text contains primarily Latin characters
 */
export function isLatinScript(text: string): boolean {
  if (!text) return false;
  const latinChars = text.match(/[a-zA-Z]/g) || [];
  const georgianChars = text.match(/[\u10A0-\u10FF]/g) || [];
  return latinChars.length > georgianChars.length;
}

/**
 * Check if text contains primarily Georgian characters
 */
export function isGeorgianScript(text: string): boolean {
  if (!text) return false;
  const georgianChars = text.match(/[\u10A0-\u10FF]/g) || [];
  return georgianChars.length > 0;
}

/**
 * Build search terms array from input (handles both Latin and Georgian)
 * This is the legacy function for backward compatibility
 */
export function buildSearchTerms(input: string): string[] {
  if (!input || input.trim().length === 0) return [];
  
  const terms: string[] = [];
  const normalized = input.trim().toLowerCase();
  
  // Always include original input
  terms.push(normalized);
  
  if (isLatinScript(input)) {
    // Add transliterated version
    const transliterated = transliterateLatin(normalized);
    if (transliterated !== normalized) {
      terms.push(transliterated);
    }
    
    // Add Georgian semantic equivalents
    const georgianWords = getGeorgianEquivalents(normalized);
    terms.push(...georgianWords);
  }
  
  // Remove duplicates
  return [...new Set(terms)];
}

/**
 * Build bilingual search terms array from input
 * Handles Georgian, Latin transliteration, and semantic equivalents in both directions
 * 
 * Examples:
 * - "ზვიგენი" → ["ზვიგენი", "zvigeni", "shark", "fish"]
 * - "shark" → ["shark", "შარკ", "ზვიგენი", "ზვიგენის"]
 * - "zvigeni" → ["zvigeni", "ზვიგენი", "shark"]
 */
export function buildBilingualSearchTerms(input: string): string[] {
  if (!input || input.trim().length === 0) return [];
  
  const terms: string[] = [];
  const normalized = input.trim().toLowerCase();
  
  // Always include original input
  terms.push(normalized);
  
  // Apply typo corrections first
  const corrected = TYPO_CORRECTIONS[normalized];
  if (corrected) {
    terms.push(corrected);
  }
  
  if (isGeorgianScript(input)) {
    // Georgian input
    // 1. Transliterate to Latin: ზვიგენი → zvigeni
    const transliterated = transliterateGeorgian(normalized);
    if (transliterated !== normalized) {
      terms.push(transliterated);
    }
    
    // 2. Get English semantic equivalents: ზვიგენი → shark
    const englishWords = getEnglishEquivalents(normalized);
    terms.push(...englishWords);
    
    // 3. Also try with stripped suffixes
    const stripped = stripGeorgianSuffixes(normalized);
    if (stripped !== normalized) {
      terms.push(stripped);
      const strippedTransliterated = transliterateGeorgian(stripped);
      terms.push(strippedTransliterated);
      terms.push(...getEnglishEquivalents(stripped));
    }
  } else if (isLatinScript(input)) {
    // Latin/English input
    // 1. Transliterate to Georgian: zvigeni → ზვიგენი
    const transliterated = transliterateLatin(normalized);
    if (transliterated !== normalized) {
      terms.push(transliterated);
    }
    
    // 2. Get Georgian semantic equivalents: shark → ზვიგენი
    const georgianWords = getGeorgianEquivalents(normalized);
    terms.push(...georgianWords);
    
    // 3. Also get English synonyms that might have Georgian mappings
    // For example, if user types "film", also try "movie"
    const synonymMappings: Record<string, string[]> = {
      'movie': ['film', 'cinema'],
      'film': ['movie', 'cinema'],
      'car': ['auto', 'vehicle'],
      'phone': ['mobile', 'telephone'],
      'football': ['soccer'],
      'soccer': ['football'],
    };
    
    const synonyms = synonymMappings[normalized] || [];
    for (const syn of synonyms) {
      const synGeorgian = getGeorgianEquivalents(syn);
      terms.push(...synGeorgian);
    }
  }
  
  // Remove duplicates and filter short terms
  return [...new Set(terms)].filter(t => t.length >= 2);
}
