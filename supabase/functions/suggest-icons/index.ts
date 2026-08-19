import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

// Georgian to English transliteration map (phonetic)
const GEORGIAN_TO_ENGLISH: Record<string, string> = {
  'ა': 'a', 'ბ': 'b', 'გ': 'g', 'დ': 'd', 'ე': 'e',
  'ვ': 'v', 'ზ': 'z', 'თ': 't', 'ი': 'i', 'კ': 'k',
  'ლ': 'l', 'მ': 'm', 'ნ': 'n', 'ო': 'o', 'პ': 'p',
  'ჟ': 'zh', 'რ': 'r', 'ს': 's', 'ტ': 't', 'უ': 'u',
  'ფ': 'f', 'ქ': 'k', 'ღ': 'gh', 'ყ': 'q', 'შ': 'sh',
  'ჩ': 'ch', 'ც': 'ts', 'ძ': 'dz', 'წ': 'ts', 'ჭ': 'ch',
  'ხ': 'kh', 'ჯ': 'j', 'ჰ': 'h'
};

// Georgian to English SEMANTIC translation (meaning-based, not phonetic)
const GEORGIAN_TO_ENGLISH_MEANING: Record<string, string[]> = {
  // Economics & Finance
  'ეკონომიკ': ['economics', 'economy', 'economic'],
  'ეკონომიკური': ['economics', 'economic'],
  'ფულ': ['money', 'cash', 'currency'],
  'ფულის': ['money', 'cash'],
  'ინფლაცია': ['inflation', 'price'],
  'თეორია': ['theory', 'theorem'],
  'მონეტარიზმ': ['monetary', 'monetarism', 'money'],
  'ფინანს': ['finance', 'financial'],
  'ბანკ': ['bank', 'banking'],
  'ვალუტა': ['currency', 'exchange'],
  'ინვესტ': ['investment', 'invest'],
  'ბიზნეს': ['business', 'company'],
  'კაპიტალ': ['capital', 'capitalism'],
  'ბაზარ': ['market', 'trading'],
  'მიწოდება': ['supply', 'delivery'],
  'მოთხოვნა': ['demand', 'request'],
  'გადასახად': ['tax', 'taxation'],
  'ბიუჯეტ': ['budget', 'financial'],
  'აქცია': ['stock', 'share', 'action'],
  'ობლიგაცია': ['bond', 'obligation'],
  'კრედიტ': ['credit', 'loan'],
  'სესხ': ['loan', 'borrow'],
  'პროცენტ': ['interest', 'percent'],
  
  // Science & Education
  'მეცნიერ': ['science', 'scientist', 'scientific'],
  'ფიზიკა': ['physics', 'physical'],
  'ქიმია': ['chemistry', 'chemical'],
  'ბიოლოგია': ['biology', 'biological'],
  'მათემატიკა': ['math', 'mathematics'],
  'ტექნოლოგია': ['technology', 'tech'],
  'კომპიუტერ': ['computer', 'computing'],
  'პროგრამ': ['program', 'programming', 'software'],
  'ინტერნეტ': ['internet', 'web', 'online'],
  'ელექტრ': ['electric', 'electricity', 'electronic'],
  'ენერგია': ['energy', 'power'],
  'ატომ': ['atom', 'atomic', 'nuclear'],
  'მოლეკულა': ['molecule', 'molecular'],
  'გენ': ['gene', 'genetic', 'genetics'],
  'უჯრედ': ['cell', 'cellular'],
  'ვირუს': ['virus', 'viral'],
  'ბაქტერია': ['bacteria', 'bacterial'],
  'ვაქცინა': ['vaccine', 'vaccination'],
  'მედიცინ': ['medicine', 'medical'],
  'ექიმ': ['doctor', 'physician'],
  'საავადმყოფო': ['hospital', 'clinic'],
  
  // Geography & Nature
  'მთა': ['mountain', 'peak', 'mount'],
  'ზღვა': ['sea', 'ocean', 'marine'],
  'მდინარე': ['river', 'stream'],
  'ტყე': ['forest', 'tree', 'woods'],
  'უდაბნო': ['desert', 'arid'],
  'კუნძული': ['island', 'isle'],
  'კონტინენტ': ['continent', 'continental'],
  'ქვეყანა': ['country', 'nation'],
  'დედაქალაქ': ['capital', 'city'],
  'სახელმწიფო': ['state', 'government'],
  'ევროპა': ['europe', 'european'],
  'აზია': ['asia', 'asian'],
  'აფრიკა': ['africa', 'african'],
  'ამერიკა': ['america', 'american'],
  'კლიმატ': ['climate', 'weather'],
  'ატმოსფერო': ['atmosphere', 'air'],
  'ეკოლოგია': ['ecology', 'environment'],
  'ბუნება': ['nature', 'natural'],
  
  // History & Culture
  'ისტორია': ['history', 'historical'],
  'მეფე': ['king', 'royal', 'monarch'],
  'დედოფალ': ['queen', 'royal'],
  'ომი': ['war', 'battle', 'conflict'],
  'რევოლუცია': ['revolution', 'revolutionary'],
  'იმპერია': ['empire', 'imperial'],
  'ცივილიზაცია': ['civilization', 'civilized'],
  'კულტურა': ['culture', 'cultural'],
  'ხელოვნება': ['art', 'artistic'],
  'მუზეუმ': ['museum', 'gallery'],
  'არქიტექტურა': ['architecture', 'building'],
  'ძეგლ': ['monument', 'memorial'],
  'რელიგია': ['religion', 'religious'],
  'ეკლესია': ['church', 'cathedral'],
  'მეჩეთ': ['mosque', 'islamic'],
  'ტაძარ': ['temple', 'shrine'],
  
  // Sports
  'ფეხბურთ': ['football', 'soccer'],
  'კალათბურთ': ['basketball', 'basket'],
  'ტენის': ['tennis', 'racket'],
  'ჩემპიონ': ['champion', 'championship'],
  'ოლიმპ': ['olympic', 'olympics'],
  'სპორტ': ['sport', 'sports', 'athletic'],
  'გუნდ': ['team', 'squad'],
  'მოთამაშე': ['player', 'athlete'],
  'მწვრთნელ': ['coach', 'trainer'],
  'სტადიონ': ['stadium', 'arena'],
  'ფინალ': ['final', 'finals'],
  'თასი': ['cup', 'trophy'],
  'მედალ': ['medal', 'medallion'],
  
  // Food & Cooking
  'საჭმელ': ['food', 'meal', 'dish'],
  'ხორც': ['meat', 'beef'],
  'პურ': ['bread', 'bakery'],
  'ყველ': ['cheese', 'dairy'],
  'ღვინო': ['wine', 'grape'],
  'ხილ': ['fruit', 'fruity'],
  'ბოსტნეულ': ['vegetable', 'veggie'],
  'რესტორან': ['restaurant', 'dining'],
  'სამზარეულო': ['kitchen', 'cooking'],
  'რეცეპტ': ['recipe', 'cooking'],
  'ფონდიუ': ['fondue', 'cheese'],
  'შვეიცარ': ['swiss', 'switzerland'],
  'იტალ': ['italian', 'italy'],
  'საფრანგეთ': ['france', 'french'],
  'გერმან': ['german', 'germany'],
  'ესპანეთ': ['spain', 'spanish'],
  
  // Music & Entertainment
  'მუსიკა': ['music', 'musical'],
  'სიმღერა': ['song', 'singing'],
  'კონცერტ': ['concert', 'performance'],
  'ინსტრუმენტ': ['instrument', 'musical'],
  'პიანინო': ['piano', 'keyboard'],
  'გიტარა': ['guitar', 'string'],
  'ფილმ': ['film', 'movie', 'cinema'],
  'თეატრ': ['theater', 'theatre', 'drama'],
  'მსახიობ': ['actor', 'actress', 'acting'],
  'რეჟისორ': ['director', 'directing'],
  
  // Animals
  'ცხოველ': ['animal', 'creature'],
  'ძაღლ': ['dog', 'canine'],
  'კატა': ['cat', 'feline'],
  'ფრინველ': ['bird', 'avian'],
  'თევზ': ['fish', 'aquatic'],
  'ცხენ': ['horse', 'equine'],
  'ძროხა': ['cow', 'cattle'],
  'ლომ': ['lion', 'big-cat'],
  'ვეფხვ': ['tiger', 'big-cat'],
  'სპილო': ['elephant', 'mammal'],
  
  // Transportation
  'მანქანა': ['car', 'vehicle', 'automobile'],
  'თვითმფრინავ': ['airplane', 'aircraft', 'aviation'],
  'მატარებელ': ['train', 'railway'],
  'გემი': ['ship', 'boat', 'vessel'],
  'ველოსიპედ': ['bicycle', 'bike', 'cycling'],
  'აეროპორტ': ['airport', 'aviation'],
  'სადგურ': ['station', 'terminal'],
  
  // Technology & Innovation
  'ხელოვნურ': ['artificial', 'ai'],
  'ინტელექტ': ['intelligence', 'ai', 'smart'],
  'რობოტ': ['robot', 'robotic'],
  'კოსმოს': ['space', 'cosmos', 'cosmic'],
  'სატელიტ': ['satellite', 'space'],
  'რაკეტა': ['rocket', 'missile'],
  'თანამგზავრ': ['satellite', 'moon'],
};

// Context patterns for deeper semantic analysis
// When these Georgian patterns appear, suggest related icon keywords
const CONTEXT_PATTERNS: Record<string, { keywords: string[], icons: string[] }> = {
  'battle': {
    keywords: ['ბრძოლ', 'შეტევ', 'თავდასხმ', 'ლაშქრობ', 'შეტაკებ'],
    icons: ['attack', 'two-swords', 'sword', 'shield', 'helmet', 'war', 'battle']
  },
  'king_royal': {
    keywords: ['მეფ', 'გამეფ', 'ტახტ', 'სამეფო', 'გვირგვინ'],
    icons: ['king', 'throne', 'scepter', 'royal', 'castle']
  },
  'queen': {
    keywords: ['დედოფ', 'თამარ'],
    icons: ['queen', 'tiara', 'royal']
  },
  'city_place': {
    keywords: ['ქალაქ', 'დედაქალაქ', 'სოფელ', 'რეგიონ', 'ტერიტორი'],
    icons: ['city', 'building', 'map', 'pin', 'location', 'skyline']
  },
  'math_calculation': {
    keywords: ['გამოთვ', 'რიცხვ', 'ჯამ', 'სხვაობ', 'ნამრავლ', 'განტოლება', 'პროცენტ', 'ფორმულ'],
    icons: ['calculator', 'math', 'equation', 'pi', 'formula', 'percent', 'number']
  },
  'science': {
    keywords: ['მეცნიერ', 'ფიზიკ', 'ქიმი', 'ბიოლოგ', 'ატომ', 'მოლეკულ'],
    icons: ['science', 'atom', 'flask', 'microscope', 'lab', 'dna']
  },
  'history_time': {
    keywords: ['საუკუნ', 'თარიღ', 'წელ', 'ეპოქ', 'ისტორ'],
    icons: ['calendar', 'history', 'clock', 'time', 'scroll', 'ancient']
  },
  'religion_church': {
    keywords: ['ეკლესი', 'მონასტ', 'ტაძარ', 'რელიგი', 'ქრისტ'],
    icons: ['church', 'cross', 'monastery', 'cathedral', 'religion']
  },
  'geography': {
    keywords: ['მთ', 'მდინარ', 'ზღვ', 'ტბ', 'კუნძულ', 'კონტინენტ'],
    icons: ['mountain', 'river', 'sea', 'ocean', 'lake', 'island', 'map']
  },
  'sports': {
    keywords: ['სპორტ', 'ფეხბურთ', 'კალათბურთ', 'ჩემპიონ', 'ოლიმპ', 'მედალ'],
    icons: ['sports', 'football', 'basketball', 'trophy', 'medal', 'olympic']
  },
  'music': {
    keywords: ['მუსიკ', 'სიმღერ', 'მომღერ', 'კომპოზიტორ', 'კონცერტ'],
    icons: ['music', 'note', 'microphone', 'guitar', 'piano']
  },
  'art': {
    keywords: ['ხელოვნებ', 'მხატვარ', 'ნახატ', 'სურათ', 'სკულპტურ'],
    icons: ['art', 'palette', 'brush', 'painting', 'sculpture', 'gallery']
  },
  'literature': {
    keywords: ['წიგნ', 'ლიტერატურ', 'მწერ', 'პოეტ', 'პოეზი'],
    icons: ['book', 'writing', 'pen', 'quill', 'library', 'author']
  },
  'mythology': {
    keywords: ['ზევს', 'ჰერ', 'პოსეიდონ', 'ათენ', 'აპოლონ', 'მითოლოგ', 'ღმერთ'],
    icons: ['zeus', 'lightning', 'trident', 'olympus', 'god', 'mythology']
  }
};

// Icons that should NOT be shown when the answer contains related terms
// This prevents icons from acting as hints that reveal the answer
const ANSWER_ICON_BLOCKLIST: Record<string, string[]> = {
  // Nature elements
  'sun': ['მზე', 'მზის', 'სინათლე', 'sunlight', 'sunshine', 'solar'],
  'moon': ['მთვარე', 'მთვარის', 'lunar', 'moonlight'],
  'star': ['ვარსკვლავ', 'ვარსკვლავი'],
  'water': ['წყალ', 'წყალი', 'water'],
  'fire': ['ცეცხლ', 'ცეცხლი', 'fire', 'flame'],
  'blood': ['სისხლ', 'სისხლი', 'სისხლით', 'blood'],
  
  // Animals
  'lion': ['ლომ', 'ლომი'],
  'cat': ['კატა', 'კატის'],
  'dog': ['ძაღლ', 'ძაღლი'],
  'horse': ['ცხენ', 'ცხენი'],
  'eagle': ['არწივ', 'არწივი'],
  'snake': ['გველ', 'გველი'],
  'fish': ['თევზ', 'თევზი'],
  'wolf': ['მგელ', 'მგელი'],
  'bear': ['დათვ', 'დათვი'],
  'elephant': ['სპილო'],
  'tiger': ['ვეფხვ', 'ვეფხვი'],
  
  // Objects
  'sword': ['ხმალ', 'ხმალი', 'sword'],
  'cross': ['ჯვარ', 'ჯვარი', 'cross'],
  'heart': ['გულ', 'გული', 'heart'],
  'gold': ['ოქრო', 'ოქროს', 'gold', 'golden'],
  'silver': ['ვერცხლ', 'ვერცხლი', 'silver'],
  'diamond': ['ბრილიანტ', 'ალმას', 'diamond'],
  'book': ['წიგნ', 'წიგნი', 'book'],
  'wine': ['ღვინო', 'ღვინის', 'wine'],
  'bread': ['პურ', 'პური', 'bread'],
  'cheese': ['ყველ', 'ყველი', 'cheese'],
  
  // Buildings/Places
  'church': ['ეკლესია', 'ეკლესიის', 'church'],
  'castle': ['ციხე', 'ციხის', 'castle'],
  'pyramid': ['პირამიდა', 'pyramid'],
  'temple': ['ტაძარ', 'ტაძარი', 'temple'],
  'mosque': ['მეჩეთ', 'მეჩეთი', 'mosque'],
  
  // People/Roles
  'king': ['მეფე', 'მეფის', 'king'],
  'queen': ['დედოფალ', 'დედოფალი', 'queen'],
  'soldier': ['ჯარისკაც', 'soldier'],
  'doctor': ['ექიმ', 'ექიმი', 'doctor'],
  
  // Geography
  'mountain': ['მთა', 'მთის', 'mountain'],
  'river': ['მდინარე', 'river'],
  'sea': ['ზღვა', 'ზღვის', 'sea', 'ocean'],
  'island': ['კუნძულ', 'კუნძული', 'island'],
};

// Check if an icon would reveal the answer
function iconRevealsAnswer(slug: string, title: string, answer: string): boolean {
  if (!answer) return false;
  
  const normalizedSlug = slug.toLowerCase();
  const normalizedTitle = title.toLowerCase();
  const normalizedAnswer = answer.toLowerCase();
  const transliteratedAnswer = transliterateGeorgian(answer).toLowerCase();
  
  // Check blocklist
  for (const [iconKey, answerVariants] of Object.entries(ANSWER_ICON_BLOCKLIST)) {
    // Check if icon matches the blocklist key
    if (normalizedSlug.includes(iconKey) || normalizedTitle.includes(iconKey)) {
      for (const variant of answerVariants) {
        if (normalizedAnswer.includes(variant.toLowerCase()) || 
            transliteratedAnswer.includes(variant.toLowerCase())) {
          console.log(`Blocked icon "${slug}" - reveals answer containing "${variant}"`);
          return true;
        }
      }
    }
  }
  
  // Direct match check - if slug/title appears in answer
  if (transliteratedAnswer.includes(normalizedSlug) && normalizedSlug.length >= 4) {
    console.log(`Blocked icon "${slug}" - directly matches answer`);
    return true;
  }
  
  // Check if answer contains the icon title
  if (normalizedAnswer.includes(normalizedTitle) && normalizedTitle.length >= 4) {
    console.log(`Blocked icon "${slug}" - title appears in answer`);
    return true;
  }
  
  return false;
}

// Translate Georgian word to English meanings
function translateGeorgianToEnglish(word: string): string[] {
  const translations: string[] = [];
  const wordLower = word.toLowerCase();
  
  // Check exact match first
  if (GEORGIAN_TO_ENGLISH_MEANING[wordLower]) {
    translations.push(...GEORGIAN_TO_ENGLISH_MEANING[wordLower]);
  }
  
  // Check prefix/root matches (Georgian word variations)
  for (const [georgianRoot, englishWords] of Object.entries(GEORGIAN_TO_ENGLISH_MEANING)) {
    // Skip if already matched exactly
    if (georgianRoot === wordLower) continue;
    
    // Check if word starts with root or root starts with word (min 4 chars for accuracy)
    if (georgianRoot.length >= 4 && wordLower.length >= 4) {
      if (wordLower.startsWith(georgianRoot) || georgianRoot.startsWith(wordLower)) {
        translations.push(...englishWords);
      }
    }
  }
  
  return [...new Set(translations)];
}

// Levenshtein distance for fuzzy matching
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

// Check if two strings are similar (within edit distance based on length)
function isSimilar(a: string, b: string): boolean {
  if (a.length < 4 || b.length < 4) return false;
  const distance = levenshteinDistance(a, b);
  const maxLen = Math.max(a.length, b.length);
  const threshold = maxLen <= 5 ? 1 : maxLen <= 8 ? 2 : 3;
  return distance <= threshold;
}

function transliterateGeorgian(text: string): string {
  let result = '';
  for (const char of text) {
    result += GEORGIAN_TO_ENGLISH[char] || char;
  }
  return result;
}

// Common Georgian words to ignore (stop words)
const GEORGIAN_STOP_WORDS = [
  'რა', 'არის', 'ეს', 'რომ', 'და', 'ან', 'თუ', 'რომელი', 'რომელია',
  'როგორ', 'როდის', 'სად', 'ვინ', 'რატომ', 'რამდენი', 'რომლის',
  'მისი', 'ჩვენი', 'თქვენი', 'მათი', 'ყველა', 'ერთი', 'ორი', 'სამი',
  'იწვევს', 'ამტკიცებს', 'გამოიყენება', 'წარმოადგენს', 'შეიძლება'
];

function extractGeorgianWords(text: string): string[] {
  const georgianPattern = /[\u10A0-\u10FF]+/g;
  const matches = text.match(georgianPattern) || [];
  return matches.filter(word => 
    word.length >= 3 && 
    !GEORGIAN_STOP_WORDS.includes(word.toLowerCase())
  );
}

function extractEnglishWords(text: string): string[] {
  const englishPattern = /[a-zA-Z]{4,}/g;
  const matches = text.match(englishPattern) || [];
  return matches.map(w => w.toLowerCase());
}

function extractQuotedText(text: string): string[] {
  const quotePattern = /["""''](.*?)["""'']/g;
  const results: string[] = [];
  let match;
  while ((match = quotePattern.exec(text)) !== null) {
    if (match[1] && match[1].length >= 2) {
      results.push(match[1]);
    }
  }
  return results;
}

interface KeywordSource {
  keyword: string;
  transliterated: string;
  source: 'question_georgian' | 'question_english' | 'answer_georgian' | 'answer_english' | 'quoted';
}

interface IconSuggestion {
  slug: string;
  title: string;
  icon_url: string | null;
  score: number;
  matchReason: string;
  matchedKeyword: string;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question_text, correct_answer, question_id } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let questionText = question_text;
    let correctAnswer = correct_answer;

    // If question_id provided, fetch the question
    if (question_id && !questionText) {
      const { data: question } = await supabase
        .from('questions')
        .select('question_text, correct_answer')
        .eq('id', question_id)
        .single();
      
      if (question) {
        questionText = question.question_text;
        correctAnswer = question.correct_answer;
      }
    }

    if (!questionText) {
      return new Response(
        JSON.stringify({ error: 'No question text provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analyzing question:', questionText);
    console.log('Correct answer:', correctAnswer);

    // Extract keywords from all sources
    const keywordSources: KeywordSource[] = [];

    // 1. Georgian words from question - add ONLY semantic translations (not useless phonetic)
    const georgianFromQuestion = extractGeorgianWords(questionText);
    for (const word of georgianFromQuestion) {
      // Add semantic translations (ეკონომიკური → economics)
      const semanticTranslations = translateGeorgianToEnglish(word);
      if (semanticTranslations.length > 0) {
        for (const translation of semanticTranslations) {
          keywordSources.push({
            keyword: word,
            transliterated: translation,
            source: 'question_georgian'
          });
        }
      }
      // Skip useless phonetic transliteration - it doesn't match real English words
    }

    // 2. English words from question
    const englishFromQuestion = extractEnglishWords(questionText);
    for (const word of englishFromQuestion) {
      keywordSources.push({
        keyword: word,
        transliterated: word.toLowerCase(),
        source: 'question_english'
      });
    }

    // 3. Quoted text from question
    const quotedFromQuestion = extractQuotedText(questionText);
    for (const text of quotedFromQuestion) {
      const transliterated = transliterateGeorgian(text).toLowerCase();
      keywordSources.push({
        keyword: text,
        transliterated,
        source: 'quoted'
      });
    }

    // REMOVED: Answer keyword extraction - we should NOT use answer to find icons
    // as this creates hints that reveal the answer (e.g., sun icon for "sunlight" answer)
    // The correctAnswer is only used for VALIDATION to filter OUT hint icons

    console.log('Extracted keywords:', keywordSources);

    // Get unique transliterated keywords
    const uniqueKeywords = [...new Set(keywordSources.map(k => k.transliterated))];
    
    // Detect context patterns and add their icons to keywords
    // IMPORTANT: Only use question text, NOT the answer (to avoid revealing answer)
    const fullText = questionText.toLowerCase();
    for (const [contextName, data] of Object.entries(CONTEXT_PATTERNS)) {
      for (const keyword of data.keywords) {
        if (fullText.includes(keyword)) {
          // Add context icons as keywords for matching
          for (const icon of data.icons) {
            if (!uniqueKeywords.includes(icon)) {
              uniqueKeywords.push(icon);
            }
          }
          break; // Found this context, move to next
        }
      }
    }
    
    console.log('Keywords including context:', uniqueKeywords);
    
    // Fetch icons in batches to overcome 1000 row limit
    const allIcons: { slug: string; title: string; tags: string[]; icon_url: string | null }[] = [];
    let offset = 0;
    const batchSize = 1000;
    let hasMore = true;
    
    while (hasMore) {
      const { data: batch, error: batchError } = await supabase
        .from('icon_library')
        .select('slug, title, tags, icon_url')
        .range(offset, offset + batchSize - 1);
      
      if (batchError) {
        console.error('Error fetching icons batch:', batchError);
        throw batchError;
      }
      
      if (batch && batch.length > 0) {
        allIcons.push(...batch);
        offset += batch.length;
        hasMore = batch.length === batchSize;
      } else {
        hasMore = false;
      }
      
      // Safety limit
      if (offset >= 15000) break;
    }

    console.log(`Loaded ${allIcons.length} icons for matching`);

    // Score each icon against keywords
    const suggestions: IconSuggestion[] = [];
    const seenSlugs = new Set<string>();

    for (const keyword of uniqueKeywords) {
      if (keyword.length < 3) continue;

      for (const icon of allIcons || []) {
        if (seenSlugs.has(icon.slug)) continue;

        let score = 0;
        let matchReason = '';

        const slugLower = icon.slug.toLowerCase();
        const titleLower = icon.title.toLowerCase();
        const tags = (icon.tags || []).map((t: string) => t.toLowerCase());

        // Exact slug match (highest priority)
        if (slugLower === keyword) {
          score = 100;
          matchReason = `Exact slug match: "${keyword}"`;
        }
        // Slug starts with keyword OR keyword matches a complete word in hyphenated slug
        else if (keyword.length >= 4) {
          const isStartMatch = slugLower.startsWith(keyword);
          const slugParts = slugLower.split('-');
          const isWordMatch = slugParts.some(part => part === keyword);
          
          if (isStartMatch) {
            score = 85;
            matchReason = `Slug starts with: "${keyword}"`;
          } else if (isWordMatch) {
            score = 80;
            matchReason = `Slug word match: "${keyword}"`;
          }
        }
        // Keyword contains complete slug (e.g., "economics" contains "econ")
        else if (keyword.includes(slugLower) && slugLower.length >= 5) {
          score = 70;
          matchReason = `Keyword contains slug: "${slugLower}"`;
        }
        // Title exact match
        else if (titleLower === keyword) {
          score = 90;
          matchReason = `Exact title match: "${keyword}"`;
        }
        // Title contains keyword
        else if (titleLower.includes(keyword) && keyword.length >= 4) {
          score = 75;
          matchReason = `Title contains: "${keyword}"`;
        }
        // Tag exact match
        else if (tags.includes(keyword)) {
          score = 70;
          matchReason = `Tag match: "${keyword}"`;
        }
        // Tag partial match
        else if (tags.some((tag: string) => tag.includes(keyword) || keyword.includes(tag))) {
          score = 50;
          matchReason = `Partial tag match: "${keyword}"`;
        }
        // Fuzzy matching using Levenshtein distance (handles transliteration variations like fondiu ≈ fondue)
        else if (isSimilar(keyword, slugLower)) {
          score = 75;
          matchReason = `Fuzzy match: "${keyword}" ≈ "${slugLower}"`;
        }
        // Fuzzy match against title
        else if (isSimilar(keyword, titleLower)) {
          score = 65;
          matchReason = `Fuzzy title match: "${keyword}" ≈ "${titleLower}"`;
        }
        // Prefix matching as fallback
        else if (keyword.length >= 4) {
          const keywordPrefix = keyword.substring(0, Math.min(5, keyword.length));
          if (slugLower.startsWith(keywordPrefix) || keywordPrefix.startsWith(slugLower.substring(0, 4))) {
            score = 55;
            matchReason = `Prefix match: "${keywordPrefix}"`;
          }
        }

        if (score > 0) {
          seenSlugs.add(icon.slug);
          suggestions.push({
            slug: icon.slug,
            title: icon.title,
            icon_url: icon.icon_url,
            score,
            matchReason,
            matchedKeyword: keyword
          });
        }
      }
    }

    // Sort by score descending
    suggestions.sort((a, b) => b.score - a.score);

    // Filter out icons that would reveal the answer
    const filteredSuggestions = correctAnswer 
      ? suggestions.filter(s => !iconRevealsAnswer(s.slug, s.title, correctAnswer))
      : suggestions;

    // Take top 10 suggestions
    const topSuggestions = filteredSuggestions.slice(0, 10);

    console.log('Top suggestions:', topSuggestions.map(s => `${s.slug} (${s.score})`));

    return new Response(
      JSON.stringify({
        keywords: keywordSources,
        suggestions: topSuggestions,
        totalMatches: suggestions.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in suggest-icons:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
