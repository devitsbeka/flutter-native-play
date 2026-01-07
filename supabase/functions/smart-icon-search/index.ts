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
  
  // Food/Cuisine
  'საკვები': ['food', 'meal', 'dish', 'cuisine'],
  'ღვინო': ['wine', 'grape', 'drink', 'bottle'],
  'პური': ['bread', 'bakery', 'wheat', 'food'],
  'ხინკალი': ['khinkali', 'dumpling', 'food', 'georgian'],
  'ხაჭაპური': ['khachapuri', 'cheese', 'bread', 'food'],
  
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
  if (a.length < 4 || b.length < 4) return a === b;
  return levenshteinDistance(a.toLowerCase(), b.toLowerCase()) <= threshold;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, limit = 50, questionContext, answerContext } = await req.json();
    
    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ icons: [], keywords: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
      
      // 1. Transliterate each Georgian word to Latin
      for (const word of georgianWords) {
        const transliterated = transliterateGeorgian(word);
        if (transliterated.length >= 2) {
          searchTerms.add(transliterated);
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
      // For non-Georgian (English) queries, just use the query directly
      searchTerms.add(query.toLowerCase());
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
    const topIcons = scoredIcons
      .filter(icon => icon.score > 0)
      .slice(0, limit)
      .map(({ score, tags, ...icon }) => icon);

    console.log(`Found ${topIcons.length} icons for query "${query}"`);

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
