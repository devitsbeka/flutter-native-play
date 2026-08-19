import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface KeywordSuggestionsProps {
  question: string;
  answer?: string;
  onSelect: (keyword: string) => void;
  className?: string;
}

// Context-based keyword mapping - Georgian word patterns → English icon keywords
const CONTEXT_KEYWORD_MAP: Record<string, string[]> = {
  // Battle/War context
  'ბრძოლ': ['battle', 'attack', 'two-swords', 'sword', 'shield'],
  'ომ': ['war', 'battle', 'tank', 'soldier', 'military'],
  'შეტევ': ['attack', 'sword', 'explosion', 'target'],
  'თავდასხმ': ['attack', 'target', 'explosion'],
  'გამარჯვებ': ['victory', 'trophy', 'medal'],
  'დამარცხებ': ['defeat', 'broken', 'surrender'],
  'ლაშქრობ': ['army', 'soldier', 'march', 'war'],
  'შეტაკებ': ['battle', 'clash', 'conflict'],
  'დაპყრობ': ['conquest', 'empire', 'sword'],
  
  // Historical figures - Royalty
  'მეფ': ['king', 'castle', 'throne', 'scepter', 'royal'],
  'დედოფ': ['queen', 'palace', 'tiara', 'royal'],
  'თამარ': ['queen', 'castle', 'georgia', 'royal'],
  'დავით': ['king', 'castle', 'church', 'builder'],
  'აღმაშენებ': ['builder', 'church', 'construction', 'king'],
  'გიორგი': ['king', 'saint', 'cross', 'georgia'],
  'ბაგრატ': ['king', 'castle', 'dynasty'],
  'სამეფო': ['kingdom', 'castle', 'royal'],
  'იმპერია': ['empire', 'globe', 'world'],
  'ტახტ': ['throne', 'king', 'royal'],
  'გვირგვინ': ['king', 'royal', 'jewel'],
  
  // Places & Geography
  'თბილის': ['city', 'capital', 'building', 'georgia'],
  'საქართველ': ['flag', 'map', 'country', 'georgia'],
  'ევროპ': ['europe', 'map', 'eu', 'continent'],
  'ქალაქ': ['city', 'building', 'urban', 'skyline'],
  'დედაქალაქ': ['capital', 'city', 'government', 'building'],
  'სოფ': ['village', 'house', 'rural', 'farm'],
  'რეგიონ': ['map', 'region', 'territory', 'area'],
  'მთ': ['mountain', 'peak', 'nature', 'landscape'],
  'მდინარ': ['river', 'water', 'stream', 'nature'],
  'ზღვ': ['sea', 'ocean', 'water', 'wave'],
  'ტბ': ['lake', 'water', 'nature', 'fish'],
  'კუნძულ': ['island', 'beach', 'palm', 'tropical'],
  'კონტინენტ': ['continent', 'world', 'map', 'globe'],
  
  // Math & Science
  'გამოთვ': ['calculator', 'math', 'equation', 'number'],
  'რიცხვ': ['number', 'math', 'calculator', 'digit'],
  'პროცენტ': ['percent', 'chart', 'graph', 'statistics'],
  'ფორმულ': ['formula', 'math', 'equation', 'science'],
  'განტოლებ': ['equation', 'math', 'formula', 'algebra'],
  'ჯამ': ['sum', 'plus', 'addition', 'math'],
  'სხვაობ': ['difference', 'minus', 'subtraction', 'math'],
  'ნამრავლ': ['product', 'multiply', 'math', 'calculator'],
  'გაყოფ': ['division', 'divide', 'math', 'fraction'],
  'კვადრატ': ['square', 'geometry', 'shape', 'math'],
  'წრე': ['circle', 'geometry', 'shape', 'round'],
  'სამკუთხედ': ['triangle', 'geometry', 'shape', 'pyramid'],
  'გეომეტრ': ['geometry', 'shape', 'compass', 'ruler'],
  'ალგებრ': ['algebra', 'equation', 'formula', 'x'],
  
  // Science
  'მეცნიერ': ['science', 'scientist', 'lab', 'research'],
  'ფიზიკ': ['physics', 'atom', 'energy', 'formula'],
  'ქიმი': ['chemistry', 'flask', 'molecule', 'lab'],
  'ბიოლოგ': ['biology', 'cell', 'dna', 'microscope'],
  'ატომ': ['atom', 'nuclear', 'physics', 'particle'],
  'მოლეკულ': ['molecule', 'chemistry', 'bond', 'atom'],
  'ენერგი': ['energy', 'lightning', 'power', 'electricity'],
  'გენ': ['gene', 'dna', 'genetics', 'helix'],
  'უჯრედ': ['cell', 'biology', 'microscope', 'organism'],
  'ვირუს': ['virus', 'disease', 'microscope', 'health'],
  'ვაქცინ': ['vaccine', 'syringe', 'health', 'medicine'],
  'კოსმოს': ['space', 'rocket', 'planet', 'star'],
  'პლანეტ': ['planet', 'space', 'orbit', 'solar'],
  'ვარსკვლავ': ['star', 'space', 'astronomy', 'night'],
  'გალაქტიკ': ['galaxy', 'space', 'stars', 'cosmos'],
  
  // Time/History
  'საუკუნ': ['calendar', 'history', 'clock', 'time'],
  'წელ': ['calendar', 'year', 'date', 'time'],
  'თარიღ': ['calendar', 'date', 'clock', 'time'],
  'ეპოქ': ['era', 'history', 'time', 'ancient'],
  'ისტორ': ['history', 'scroll', 'book', 'ancient'],
  'უძველეს': ['ancient', 'history', 'ruins', 'archaeology'],
  'შუა საუკუნ': ['medieval', 'castle', 'knight', 'sword'],
  
  // Religion & Culture
  'ეკლესი': ['church', 'cross', 'religion', 'cathedral'],
  'მონასტ': ['monastery', 'church', 'religion', 'monk'],
  'ტაძარ': ['temple', 'church', 'religion', 'shrine'],
  'რელიგი': ['religion', 'prayer', 'church', 'faith'],
  'ქრისტ': ['christian', 'cross', 'church', 'jesus'],
  'ანბან': ['alphabet', 'letter', 'writing', 'text'],
  'ენ': ['language', 'speech', 'translate', 'text'],
  'წერ': ['writing', 'pen', 'book', 'document'],
  'წიგნ': ['book', 'library', 'reading', 'education'],
  'ლიტერატურ': ['literature', 'book', 'writing', 'author'],
  'პოეზი': ['poetry', 'quill', 'writing', 'verse'],
  'მწერ': ['writer', 'pen', 'book', 'author'],
  'პოეტ': ['poet', 'quill', 'verse', 'writing'],
  
  // Arts & Culture
  'ხელოვნებ': ['art', 'palette', 'brush', 'painting'],
  'მხატვარ': ['artist', 'palette', 'brush', 'painting'],
  'ნახატ': ['painting', 'canvas', 'art', 'gallery'],
  'სურათ': ['picture', 'image', 'photo', 'frame'],
  'მუზეუმ': ['museum', 'gallery', 'art', 'exhibition'],
  'არქიტექტურ': ['architecture', 'building', 'design', 'structure'],
  'ძეგლ': ['monument', 'statue', 'memorial', 'sculpture'],
  'სკულპტურ': ['sculpture', 'statue', 'art', 'chisel'],
  
  // Music
  'მუსიკ': ['music', 'note', 'melody', 'instrument'],
  'სიმღერ': ['song', 'microphone', 'singing', 'music'],
  'მომღერ': ['singer', 'microphone', 'music', 'star'],
  'კომპოზიტორ': ['composer', 'music', 'piano', 'note'],
  'ინსტრუმენტ': ['instrument', 'music', 'guitar', 'piano'],
  'კონცერტ': ['concert', 'stage', 'music', 'microphone'],
  
  // Sports
  'სპორტ': ['sports', 'trophy', 'medal', 'athlete'],
  'ფეხბურთ': ['football', 'soccer', 'ball', 'goal'],
  'კალათბურთ': ['basketball', 'ball', 'hoop', 'court'],
  'ტენის': ['tennis', 'racket', 'ball', 'court'],
  'ჩემპიონ': ['champion', 'trophy', 'medal', 'winner'],
  'ოლიმპიად': ['olympic', 'rings', 'medal', 'torch'],
  'მედალ': ['medal', 'trophy', 'winner', 'gold'],
  'თასი': ['cup', 'trophy', 'winner', 'champion'],
  'რეკორდ': ['record', 'trophy', 'first', 'best'],
  
  // Economics & Finance
  'ეკონომიკ': ['economics', 'chart', 'money', 'graph'],
  'ფინანს': ['finance', 'money', 'bank', 'chart'],
  'ფულ': ['money', 'cash', 'currency', 'coin'],
  'ბანკ': ['bank', 'money', 'vault', 'safe'],
  'ვალუტ': ['currency', 'money', 'exchange', 'dollar'],
  'ინვესტ': ['investment', 'chart', 'growth', 'money'],
  'ბიზნეს': ['business', 'briefcase', 'office', 'company'],
  'გადასახად': ['tax', 'money', 'government', 'calculator'],
  
  // Technology
  'ტექნოლოგ': ['technology', 'computer', 'chip', 'digital'],
  'კომპიუტერ': ['computer', 'laptop', 'screen', 'digital'],
  'ინტერნეტ': ['internet', 'wifi', 'globe', 'network'],
  'პროგრამ': ['programming', 'code', 'computer', 'software'],
  'რობოტ': ['robot', 'ai', 'machine', 'technology'],
  'ხელოვნურ': ['artificial', 'ai', 'robot', 'smart'],
  
  // Nature & Animals
  'ცხოველ': ['animal', 'wildlife', 'nature', 'creature'],
  'ფრინველ': ['bird', 'wing', 'fly', 'feather'],
  'თევზ': ['fish', 'water', 'sea', 'aquarium'],
  'ცხენ': ['horse', 'equestrian', 'ride', 'stable'],
  'ლომ': ['lion', 'king', 'wild', 'safari'],
  'ვეფხვ': ['tiger', 'stripes', 'wild', 'jungle'],
  'სპილო': ['elephant', 'trunk', 'safari', 'large'],
  'მცენარ': ['plant', 'leaf', 'green', 'nature'],
  'ყვავილ': ['flower', 'bloom', 'petal', 'garden'],
  'ხე': ['tree', 'forest', 'leaf', 'nature'],
  'ტყე': ['forest', 'trees', 'nature', 'woods'],
  
  // Food & Drink
  'საჭმ': ['food', 'meal', 'dish', 'restaurant'],
  'კერძ': ['dish', 'food', 'meal', 'cuisine'],
  'ხორც': ['meat', 'steak', 'food', 'grill'],
  'პურ': ['bread', 'bakery', 'wheat', 'loaf'],
  'ღვინ': ['wine', 'grape', 'glass', 'vineyard'],
  'ყველ': ['cheese', 'dairy', 'food', 'slice'],
  'ხილ': ['fruit', 'apple', 'fresh', 'healthy'],
  'ბოსტნეულ': ['vegetable', 'carrot', 'fresh', 'healthy'],
  'რესტორან': ['restaurant', 'dining', 'food', 'chef'],
  
  // Greek Mythology
  'ზევს': ['zeus', 'lightning', 'olympus', 'god'],
  'ჰერას': ['hera', 'goddess', 'peacock', 'queen'],
  'აპოლონ': ['apollo', 'sun', 'music', 'god'],
  'პოსეიდონ': ['poseidon', 'trident', 'sea', 'god'],
  'ათენას': ['athena', 'owl', 'wisdom', 'goddess'],
  'აფროდიტ': ['aphrodite', 'love', 'beauty', 'goddess'],
  'არეს': ['ares', 'war', 'sword', 'god'],
  'ჰადეს': ['hades', 'underworld', 'death', 'god'],
  'ჰერმეს': ['hermes', 'wings', 'messenger', 'god'],
  'დიონისე': ['dionysus', 'wine', 'grape', 'god'],
  'მითოლოგ': ['mythology', 'gods', 'legend', 'ancient'],
  'ღმერთ': ['god', 'deity', 'divine', 'mythology'],
  'ქალღმერთ': ['goddess', 'deity', 'divine', 'mythology'],
  'ოლიმპოს': ['olympus', 'mountain', 'gods', 'greek'],
};

export function KeywordSuggestions({ question, answer, onSelect, className }: KeywordSuggestionsProps) {
  const suggestedKeywords = useMemo(() => {
    const keywords: string[] = [];
    const text = `${question} ${answer || ''}`.toLowerCase();
    
    // Check each pattern against the combined text
    for (const [pattern, iconKeywords] of Object.entries(CONTEXT_KEYWORD_MAP)) {
      if (text.includes(pattern)) {
        // Add first 2 keywords from this pattern (most relevant)
        keywords.push(...iconKeywords.slice(0, 2));
      }
    }
    
    // Return unique keywords, max 6
    return [...new Set(keywords)].slice(0, 6);
  }, [question, answer]);

  if (suggestedKeywords.length === 0) return null;

  return (
    <div className={cn("flex gap-1 flex-wrap", className)}>
      {suggestedKeywords.map(kw => (
        <button 
          key={kw}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(kw);
          }}
          className="px-1.5 py-0.5 text-[10px] bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition-colors dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50"
          title={`მინიჭება: ${kw}`}
        >
          {kw}
        </button>
      ))}
    </div>
  );
}

// Export the mapping for use in other components
export { CONTEXT_KEYWORD_MAP };
