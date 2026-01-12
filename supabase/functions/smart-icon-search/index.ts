import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Georgian to Latin phonetic transliteration
const GEORGIAN_TO_LATIN: Record<string, string> = {
  'ა': 'a', 'ბ': 'b', 'გ': 'g', 'დ': 'd', 'ე': 'e',
  'ვ': 'v', 'ზ': 'z', 'თ': 't', 'ი': 'i', 'კ': 'k',
  'ლ': 'l', 'მ': 'm', 'ნ': 'n', 'ო': 'o', 'პ': 'p',
  'ჟ': 'zh', 'რ': 'r', 'ს': 's', 'ტ': 't', 'უ': 'u',
  'ფ': 'f', 'ქ': 'k', 'ღ': 'gh', 'ყ': 'q', 'შ': 'sh',
  'ჩ': 'ch', 'ც': 'ts', 'ძ': 'dz', 'წ': 'ts', 'ჭ': 'ch',
  'ხ': 'kh', 'ჯ': 'j', 'ჰ': 'h'
};

// Common Georgian grammatical suffixes to strip
const GEORGIAN_SUFFIXES = ['ი', 'მა', 'ს', 'ით', 'ად', 'ში', 'ზე', 'თან', 'დან', 'ისა', 'ებ'];

// Strip Georgian grammatical suffixes
function stripGeorgianSuffixes(word: string): string {
  for (const suffix of GEORGIAN_SUFFIXES) {
    if (word.endsWith(suffix) && word.length > suffix.length + 2) {
      return word.slice(0, -suffix.length);
    }
  }
  return word;
}

// Generate phonetic variants (k->c, etc.)
function getPhoneticVariants(transliterated: string): string[] {
  const variants = [transliterated];
  // k -> c variant (კ/ქ can sound like "c" in English words like Oscar)
  if (transliterated.includes('k')) {
    variants.push(transliterated.replace(/k/g, 'c'));
  }
  // Also try c -> k for the reverse
  if (transliterated.includes('c')) {
    variants.push(transliterated.replace(/c/g, 'k'));
  }
  return [...new Set(variants)];
}

// Georgian semantic translations - words to English meanings
const GEORGIAN_TO_ENGLISH: Record<string, string[]> = {
  // Birth/Origin
  'დაბადება': ['birth', 'birthday', 'born'],
  'დაბადების': ['birth', 'birthday', 'born'],
  'ადგილი': ['place', 'location', 'city', 'map', 'pin'],
  'სადაც': ['where', 'place', 'location'],
  'დაიბადა': ['born', 'birth', 'birthplace'],
  'წარმოშობა': ['origin', 'source', 'native'],
  'მშობლიური': ['native', 'home', 'homeland'],
  
  // Cities/Places
  'ქალაქი': ['city', 'town', 'urban', 'skyline', 'building'],
  'დედაქალაქი': ['capital', 'city', 'capitol', 'building'],
  'სოფელი': ['village', 'rural', 'countryside', 'house'],
  'რეგიონი': ['region', 'area', 'map', 'territory'],
  'მხარე': ['region', 'area', 'side', 'territory'],
  'თბილისი': ['tbilisi', 'city', 'capital', 'georgia'],
  'საქართველო': ['georgia', 'country', 'flag', 'map'],
  
  // Geography
  'ქვეყანა': ['country', 'nation', 'flag', 'globe', 'map'],
  'კონტინენტი': ['continent', 'world', 'globe', 'map'],
  'მთა': ['mountain', 'peak', 'summit', 'hill'],
  'მდინარე': ['river', 'water', 'stream', 'flow'],
  'ზღვა': ['sea', 'ocean', 'water', 'wave'],
  'ტბა': ['lake', 'water', 'pond'],
  
  // People/Professions
  'მწერალი': ['writer', 'author', 'pen', 'book', 'quill'],
  'პოეტი': ['poet', 'poetry', 'verse', 'quill', 'pen'],
  'მხატვარი': ['artist', 'painter', 'brush', 'palette', 'art'],
  'მეცნიერი': ['scientist', 'research', 'lab', 'microscope'],
  'მსახიობი': ['actor', 'actress', 'theater', 'stage', 'mask'],
  'მომღერალი': ['singer', 'music', 'microphone', 'voice'],
  'მუსიკოსი': ['musician', 'music', 'instrument', 'note'],
  'პოლიტიკოსი': ['politician', 'politics', 'government', 'capitol'],
  'მეფე': ['king', 'crown', 'royal', 'throne'],
  'დედოფალი': ['queen', 'crown', 'royal', 'throne'],
  
  // Sports
  'სპორტი': ['sport', 'athletics', 'game', 'ball'],
  'ფეხბურთი': ['football', 'soccer', 'ball', 'goal'],
  'კალათბურთი': ['basketball', 'ball', 'hoop', 'court'],
  'ჭიდაობა': ['wrestling', 'sport', 'fight', 'athlete'],
  'ჩოგბურთი': ['tennis', 'ball', 'racket', 'court'],
  
  // History/Culture
  'ისტორია': ['history', 'past', 'ancient', 'book', 'scroll'],
  'კულტურა': ['culture', 'art', 'tradition', 'heritage'],
  'ხელოვნება': ['art', 'culture', 'creative', 'museum'],
  'ტრადიცია': ['tradition', 'culture', 'heritage', 'custom'],
  'ომი': ['war', 'battle', 'military', 'sword', 'shield'],
  'ბრძოლა': ['battle', 'fight', 'war', 'combat'],
  
  // Science/Education
  'მეცნიერება': ['science', 'research', 'lab', 'discovery'],
  'განათლება': ['education', 'school', 'university', 'book'],
  'უნივერსიტეტი': ['university', 'education', 'school', 'graduation'],
  'სკოლა': ['school', 'education', 'student', 'book'],
  
  // Famous Georgians
  'ილია': ['ilia', 'chavchavadze', 'writer', 'poet'],
  'ჭავჭავაძე': ['chavchavadze', 'ilia', 'writer'],
  'აკაკი': ['akaki', 'tsereteli', 'poet'],
  'წერეთელი': ['tsereteli', 'akaki', 'poet'],
  'რუსთაველი': ['rustaveli', 'shota', 'poet', 'knight'],
  'შოთა': ['shota', 'rustaveli', 'poet'],
  'ნიკო': ['niko', 'pirosmani', 'artist', 'painter'],
  'ფიროსმანი': ['pirosmani', 'niko', 'artist', 'painter'],
  'მერაბ': ['merab', 'mamardashvili', 'philosopher'],
  'მამარდაშვილი': ['mamardashvili', 'philosopher'],
  
  // Animals
  'ცხოველი': ['animal', 'creature', 'wildlife', 'fauna'],
  'ძაღლი': ['dog', 'puppy', 'canine', 'pet'],
  'კატა': ['cat', 'kitten', 'feline', 'pet'],
  'ფრინველი': ['bird', 'avian', 'flying', 'wing'],
  'თევზი': ['fish', 'aquatic', 'sea', 'water'],
  'ლომი': ['lion', 'cat', 'king', 'wild'],
  'დათვი': ['bear', 'wild', 'forest', 'animal'],
  'არწივი': ['eagle', 'bird', 'flying', 'predator'],
  'ცხენი': ['horse', 'equine', 'riding', 'animal'],
  'სპილო': ['elephant', 'animal', 'trunk', 'large'],
  'გველი': ['snake', 'serpent', 'reptile'],
  'მგელი': ['wolf', 'canine', 'wild', 'pack'],
  
  // Food/Cuisine
  'საკვები': ['food', 'meal', 'dish', 'cuisine'],
  'ღვინო': ['wine', 'grape', 'drink', 'bottle'],
  'პური': ['bread', 'bakery', 'wheat', 'food'],
  'ხინკალი': ['khinkali', 'dumpling', 'food', 'georgian'],
  'ხაჭაპური': ['khachapuri', 'cheese', 'bread', 'food'],
  'ხორცი': ['meat', 'beef', 'food', 'steak'],
  'ბოსტნეული': ['vegetable', 'veggie', 'food', 'salad'],
  'ხილი': ['fruit', 'apple', 'food', 'fresh'],
  
  // Nature
  'ბუნება': ['nature', 'environment', 'natural', 'green'],
  'ტყე': ['forest', 'tree', 'woods', 'green'],
  'ხე': ['tree', 'plant', 'wood', 'forest'],
  'ყვავილი': ['flower', 'bloom', 'plant', 'nature'],
  'მზე': ['sun', 'solar', 'light', 'sky'],
  'მთვარე': ['moon', 'lunar', 'night', 'sky'],
  'ვარსკვლავი': ['star', 'stellar', 'night', 'sky'],
  
  // Buildings/Architecture
  'შენობა': ['building', 'structure', 'architecture'],
  'სახლი': ['house', 'home', 'building', 'dwelling'],
  'ეკლესია': ['church', 'cathedral', 'religion', 'cross'],
  'მონასტერი': ['monastery', 'church', 'religion', 'ancient'],
  'ციხე': ['fortress', 'castle', 'tower', 'wall'],
  'ხიდი': ['bridge', 'crossing', 'river', 'connection'],
  
  // Time
  'წელი': ['year', 'calendar', 'time', 'date'],
  'თვე': ['month', 'calendar', 'time'],
  'დღე': ['day', 'date', 'calendar', 'sun'],
  'საუკუნე': ['century', 'time', 'era', 'history'],
  
  // Abstract
  'ფული': ['money', 'currency', 'coin', 'cash', 'dollar'],
  'სიყვარული': ['love', 'heart', 'romance', 'valentine'],
  'სიცოცხლე': ['life', 'living', 'alive', 'heart'],
  'სიკვდილი': ['death', 'skull', 'end', 'grave'],
  'ბედნიერება': ['happiness', 'joy', 'smile', 'happy'],
  
  // === NEW: Entertainment/Media ===
  'კინო': ['movie', 'film', 'cinema', 'theater', 'screen', 'camera', 'video'],
  'ფილმი': ['movie', 'film', 'cinema', 'video', 'camera', 'screen'],
  'თეატრი': ['theater', 'stage', 'drama', 'mask', 'curtain', 'play'],
  'სერიალი': ['series', 'tv', 'show', 'episode', 'television'],
  'მულტფილმი': ['cartoon', 'animation', 'animated', 'movie'],
  'აქტიორი': ['actor', 'actress', 'star', 'movie', 'film'],
  'რეჟისორი': ['director', 'film', 'camera', 'movie', 'cinema'],
  'სცენარი': ['script', 'screenplay', 'movie', 'film'],
  'კომედია': ['comedy', 'funny', 'laugh', 'humor', 'movie'],
  'დრამა': ['drama', 'theater', 'movie', 'emotional'],
  'ტელევიზია': ['tv', 'television', 'screen', 'broadcast'],
  
  // === NEW: Technology ===
  'კომპიუტერი': ['computer', 'laptop', 'desktop', 'tech', 'screen'],
  'ტელეფონი': ['phone', 'mobile', 'smartphone', 'call', 'cell'],
  'ინტერნეტი': ['internet', 'web', 'online', 'wifi', 'network'],
  'პროგრამა': ['program', 'software', 'app', 'application'],
  'ტექნოლოგია': ['technology', 'tech', 'digital', 'innovation'],
  'ელექტრო': ['electric', 'electronic', 'power', 'plug'],
  'კამერა': ['camera', 'photo', 'photography', 'film'],
  
  // === NEW: Vehicles/Transport ===
  'მანქანა': ['car', 'vehicle', 'automobile', 'drive', 'auto'],
  'თვითმფრინავი': ['airplane', 'plane', 'flight', 'travel', 'jet'],
  'გემი': ['ship', 'boat', 'vessel', 'sea', 'cruise'],
  'მატარებელი': ['train', 'railway', 'transport', 'locomotive'],
  'ველოსიპედი': ['bicycle', 'bike', 'cycling', 'wheel'],
  'ავტობუსი': ['bus', 'transport', 'vehicle', 'public'],
  'მოტოციკლი': ['motorcycle', 'bike', 'motor', 'vehicle'],
  
  // === NEW: Music ===
  'მუსიკა': ['music', 'song', 'melody', 'note', 'audio'],
  'სიმღერა': ['song', 'music', 'singing', 'melody'],
  'გიტარა': ['guitar', 'music', 'instrument', 'string'],
  'პიანინო': ['piano', 'keyboard', 'music', 'instrument'],
  'კონცერტი': ['concert', 'music', 'show', 'performance'],
  'ალბომი': ['album', 'music', 'record', 'cd'],
  
  // === NEW: Household/Objects ===
  'წიგნი': ['book', 'reading', 'literature', 'library'],
  'კარადა': ['closet', 'wardrobe', 'furniture', 'cabinet'],
  'მაგიდა': ['table', 'desk', 'furniture'],
  'სკამი': ['chair', 'seat', 'furniture'],
  'ლამპა': ['lamp', 'light', 'bulb', 'lighting'],
  'სარკე': ['mirror', 'glass', 'reflection'],
  'ფანჯარა': ['window', 'glass', 'view'],
  'კარი': ['door', 'entrance', 'gate'],
  'საათი': ['clock', 'watch', 'time', 'hour'],
  
  // === NEW: Clothing ===
  'ტანსაცმელი': ['clothing', 'clothes', 'fashion', 'apparel'],
  'ფეხსაცმელი': ['shoes', 'footwear', 'boot', 'sneaker'],
  'ქუდი': ['hat', 'cap', 'head', 'headwear'],
  'პერანგი': ['shirt', 'clothing', 'top', 'blouse'],
  'შარვალი': ['pants', 'trousers', 'jeans'],
  'კაბა': ['dress', 'clothing', 'gown', 'fashion'],
  
  // === NEW: Weather/Climate ===
  'ამინდი': ['weather', 'climate', 'forecast'],
  'წვიმა': ['rain', 'rainy', 'water', 'weather'],
  'თოვლი': ['snow', 'winter', 'cold', 'snowflake'],
  'ქარი': ['wind', 'windy', 'breeze', 'weather'],
  'ღრუბელი': ['cloud', 'cloudy', 'sky', 'weather'],
  
  // === NEW: Common Actions/Verbs ===
  'თამაში': ['game', 'play', 'gaming', 'sport'],
  'სწავლა': ['study', 'learn', 'education', 'school'],
  'მუშაობა': ['work', 'job', 'office', 'business'],
  'მოგზაურობა': ['travel', 'trip', 'journey', 'vacation'],
  'სირბილი': ['running', 'run', 'jog', 'sprint'],
  'ცურვა': ['swimming', 'swim', 'pool', 'water'],
  
  // === NEW: Family ===
  'ოჯახი': ['family', 'home', 'household', 'relatives'],
  'მშობელი': ['parent', 'family', 'mother', 'father'],
  'დედა': ['mother', 'mom', 'parent', 'family'],
  'მამა': ['father', 'dad', 'parent', 'family'],
  'ბავშვი': ['child', 'kid', 'baby', 'children'],
  'ძმა': ['brother', 'sibling', 'family'],
  'და': ['sister', 'sibling', 'family'],
  'ბებია': ['grandmother', 'grandma', 'family'],
  'ბაბუა': ['grandfather', 'grandpa', 'family'],
  
  // === NEW: Colors ===
  'ფერი': ['color', 'colour', 'hue', 'shade'],
  'წითელი': ['red', 'color', 'crimson'],
  'ლურჯი': ['blue', 'color', 'azure'],
  'მწვანე': ['green', 'color', 'nature'],
  'ყვითელი': ['yellow', 'color', 'gold'],
  'შავი': ['black', 'color', 'dark'],
  'თეთრი': ['white', 'color', 'light'],
  
  // === NEW: Numbers/Math ===
  'რიცხვი': ['number', 'digit', 'math', 'count'],
  'მათემატიკა': ['math', 'mathematics', 'calculation'],
  'პროცენტი': ['percent', 'percentage', 'number'],
};

// English synonyms for better English search results
const ENGLISH_SYNONYMS: Record<string, string[]> = {
  // Entertainment
  'movie': ['film', 'cinema', 'video', 'theater', 'screen'],
  'film': ['movie', 'cinema', 'video', 'screen'],
  'cinema': ['movie', 'film', 'theater', 'screen'],
  'tv': ['television', 'screen', 'broadcast', 'show'],
  'music': ['song', 'melody', 'audio', 'sound'],
  
  // Technology
  'computer': ['laptop', 'desktop', 'pc', 'screen'],
  'phone': ['mobile', 'smartphone', 'cell', 'telephone'],
  'car': ['vehicle', 'auto', 'automobile'],
  'plane': ['airplane', 'aircraft', 'jet', 'flight'],
  
  // Animals
  'dog': ['puppy', 'canine', 'pet'],
  'cat': ['kitten', 'feline', 'pet'],
  'bird': ['avian', 'flying', 'wing'],
  
  // People
  'actor': ['actress', 'performer', 'star'],
  'singer': ['vocalist', 'artist', 'performer'],
  'writer': ['author', 'novelist', 'scribe'],
  
  // Places
  'city': ['town', 'urban', 'metropolis'],
  'country': ['nation', 'state', 'land'],
  'house': ['home', 'dwelling', 'building'],
  
  // Nature
  'tree': ['plant', 'forest', 'wood'],
  'flower': ['bloom', 'blossom', 'plant'],
  'sun': ['solar', 'sunny', 'light'],
  'moon': ['lunar', 'night', 'crescent'],
  
  // Food
  'food': ['meal', 'dish', 'cuisine'],
  'drink': ['beverage', 'liquid', 'water'],
  
  // Sports
  'football': ['soccer', 'ball', 'sport'],
  'basketball': ['ball', 'hoop', 'sport'],
  'tennis': ['racket', 'ball', 'court'],
  
  // Abstract
  'love': ['heart', 'romance', 'affection'],
  'money': ['cash', 'currency', 'dollar', 'coin'],
  'time': ['clock', 'watch', 'hour'],
};

// Context patterns - phrases that suggest specific icon categories
const CONTEXT_PATTERNS: Record<string, { triggers: string[], icons: string[] }> = {
  'birthplace': {
    triggers: ['დაბადების ადგილი', 'სადაც დაიბადა', 'დაბადების', 'იშვა', 'დაიბადა'],
    icons: ['city', 'map', 'pin', 'location', 'house', 'flag', 'building', 'skyline']
  },
  'capital': {
    triggers: ['დედაქალაქი', 'სად მდებარეობს', 'მთავარი ქალაქი'],
    icons: ['city', 'capitol', 'building', 'skyline', 'map', 'flag', 'government']
  },
  'country': {
    triggers: ['ქვეყანა', 'რომელ ქვეყანაში', 'რომელი ქვეყნის'],
    icons: ['flag', 'country', 'globe', 'map', 'world', 'nation']
  },
  'author': {
    triggers: ['ვინ დაწერა', 'ავტორი', 'მწერალი', 'შექმნა'],
    icons: ['pen', 'quill', 'book', 'writer', 'author', 'paper', 'scroll']
  },
  'year': {
    triggers: ['რომელ წელს', 'როდის', 'თარიღი', 'წელი'],
    icons: ['calendar', 'date', 'clock', 'time', 'year', 'number']
  },
  'sport': {
    triggers: ['სპორტსმენი', 'მოთამაშე', 'გუნდი', 'ჩემპიონი'],
    icons: ['trophy', 'medal', 'ball', 'sport', 'athlete', 'winner']
  },
  'mountain': {
    triggers: ['მთა', 'მწვერვალი', 'სიმაღლე'],
    icons: ['mountain', 'peak', 'summit', 'snow', 'climb', 'hill']
  },
  'river': {
    triggers: ['მდინარე', 'დინება', 'წყალი'],
    icons: ['river', 'water', 'stream', 'wave', 'flow', 'lake']
  }
};

// Transliterate Georgian text to Latin phonetically
function transliterateGeorgian(text: string): string {
  return text.split('').map(char => GEORGIAN_TO_LATIN[char] || char).join('');
}

// Check if text contains Georgian characters
function isGeorgian(text: string): boolean {
  return /[\u10A0-\u10FF]/.test(text);
}

// Extract Georgian words from text
function extractGeorgianWords(text: string): string[] {
  const words = text.match(/[\u10A0-\u10FF]+/g) || [];
  return words.filter(w => w.length >= 2);
}

// Calculate Levenshtein distance for fuzzy matching
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
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

// Check if two strings are similar (fuzzy match)
function isSimilar(a: string, b: string, threshold = 2): boolean {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();
  // For short strings (3+ chars), allow matching
  if (a.length < 3 || b.length < 3) return aLower === bLower;
  // Dynamic threshold based on string length
  const dynamicThreshold = Math.min(threshold, Math.floor(Math.min(a.length, b.length) / 3));
  return levenshteinDistance(aLower, bLower) <= Math.max(1, dynamicThreshold);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, limit = 50, questionContext, answerContext, correctAnswer } = await req.json();
    
    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ icons: [], keywords: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare correct answer for filtering (transliterate if Georgian)
    let answerTerms: string[] = [];
    if (correctAnswer) {
      const answerLower = correctAnswer.toLowerCase();
      answerTerms.push(answerLower);
      if (isGeorgian(correctAnswer)) {
        answerTerms.push(transliterateGeorgian(correctAnswer).toLowerCase());
      }
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const searchTerms: Set<string> = new Set();
    const contextIcons: Set<string> = new Set();
    
    // If query is Georgian, process it
    if (isGeorgian(query)) {
      const georgianWords = extractGeorgianWords(query);
      
      // 1. Transliterate each Georgian word to Latin (with suffix stripping)
      for (const word of georgianWords) {
        // Try both with and without suffix stripping
        const strippedWord = stripGeorgianSuffixes(word);
        const transliterated = transliterateGeorgian(strippedWord);
        const transliteratedFull = transliterateGeorgian(word);
        
        if (transliterated.length >= 2) {
          // Add all phonetic variants (k->c, etc.)
          getPhoneticVariants(transliterated).forEach(v => searchTerms.add(v));
        }
        if (transliteratedFull.length >= 2 && transliteratedFull !== transliterated) {
          getPhoneticVariants(transliteratedFull).forEach(v => searchTerms.add(v));
        }
      }
      
      // 2. Look up semantic translations
      for (const word of georgianWords) {
        const translations = GEORGIAN_TO_ENGLISH[word];
        if (translations) {
          translations.forEach(t => searchTerms.add(t));
        }
        
        // Also check partial matches for compound words
        for (const [geoWord, translations] of Object.entries(GEORGIAN_TO_ENGLISH)) {
          if (word.includes(geoWord) || geoWord.includes(word)) {
            translations.forEach(t => searchTerms.add(t));
          }
        }
      }
      
      // 3. Check context patterns for full phrase matches
      const fullQuery = query.toLowerCase();
      for (const [, pattern] of Object.entries(CONTEXT_PATTERNS)) {
        for (const trigger of pattern.triggers) {
          if (fullQuery.includes(trigger.toLowerCase())) {
            pattern.icons.forEach(icon => contextIcons.add(icon));
          }
        }
      }
      
      // Also add transliteration of the full query
      const fullTransliteration = transliterateGeorgian(query);
      if (fullTransliteration.length >= 3) {
        searchTerms.add(fullTransliteration);
      }
    } else {
      // For non-Georgian (English) queries, add synonyms for better results
      const queryLower = query.toLowerCase();
      searchTerms.add(queryLower);
      
      // Add English synonyms
      const synonyms = ENGLISH_SYNONYMS[queryLower];
      if (synonyms) {
        synonyms.forEach(s => searchTerms.add(s));
      }
      
      // Also check for partial matches in synonym keys
      for (const [word, syns] of Object.entries(ENGLISH_SYNONYMS)) {
        if (queryLower.includes(word) || word.includes(queryLower)) {
          syns.forEach(s => searchTerms.add(s));
          searchTerms.add(word);
        }
      }
    }

    console.log('Search terms:', [...searchTerms]);
    console.log('Context icons:', [...contextIcons]);

    // Build the search query
    const allSearchTerms = [...searchTerms, ...contextIcons];
    
    if (allSearchTerms.length === 0) {
      return new Response(
        JSON.stringify({ icons: [], keywords: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build OR conditions for search
    const orConditions = allSearchTerms.map(term => 
      `title.ilike.%${term}%,slug.ilike.%${term}%`
    ).join(',');

    // Also search in tags
    const tagsConditions = allSearchTerms.map(term => `tags.cs.{${term}}`).join(',');
    
    const { data: icons, error } = await supabase
      .from('icon_library')
      .select('id, slug, title, icon_url, tags')
      .or(`${orConditions},${tagsConditions}`)
      .limit(limit * 2); // Get more results for scoring

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    // Score and sort icons
    const scoredIcons = (icons || []).map(icon => {
      let score = 0;
      const slug = icon.slug.toLowerCase();
      const title = icon.title.toLowerCase();
      const tags = (icon.tags || []).map((t: string) => t.toLowerCase());
      
      for (const term of allSearchTerms) {
        const termLower = term.toLowerCase();
        
        // Exact slug match
        if (slug === termLower) {
          score += 100;
        } else if (slug.includes(termLower)) {
          score += 70;
        } else if (slug.startsWith(termLower)) {
          score += 60;
        }
        
        // Title match
        if (title === termLower) {
          score += 90;
        } else if (title.includes(termLower)) {
          score += 50;
        }
        
        // Tag match
        if (tags.some((tag: string) => tag === termLower)) {
          score += 80;
        } else if (tags.some((tag: string) => tag.includes(termLower))) {
          score += 40;
        }
        
        // Context icon bonus
        if (contextIcons.has(term) && (slug.includes(termLower) || title.includes(termLower))) {
          score += 30;
        }
        
        // Fuzzy match bonus
        if (isSimilar(slug, termLower)) {
          score += 25;
        }
      }
      
      return { ...icon, score };
    });

    // Sort by score and take top results
    scoredIcons.sort((a, b) => b.score - a.score);
    
    // Filter out icons that would reveal the answer
    const filteredIcons = scoredIcons.filter(icon => {
      if (answerTerms.length === 0) return true;
      const slug = icon.slug.toLowerCase();
      const title = icon.title.toLowerCase();
      
      // Check if icon matches any answer term
      for (const term of answerTerms) {
        if (term.length < 3) continue;
        if (slug.includes(term) || term.includes(slug) || 
            title.includes(term) || term.includes(title) ||
            isSimilar(slug, term) || isSimilar(title, term)) {
          console.log(`Filtering out icon "${icon.slug}" - matches answer "${term}"`);
          return false;
        }
      }
      return true;
    });
    
    const topIcons = filteredIcons
      .filter(icon => icon.score > 0)
      .slice(0, limit)
      .map(({ score, tags, ...icon }) => icon);

    console.log(`Found ${topIcons.length} icons for query "${query}" (filtered ${scoredIcons.length - filteredIcons.length} answer-revealing icons)`);

    return new Response(
      JSON.stringify({ 
        icons: topIcons, 
        keywords: [...searchTerms],
        contextKeywords: [...contextIcons]
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in smart-icon-search:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage, icons: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
