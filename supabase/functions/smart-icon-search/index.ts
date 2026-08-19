import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

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

// Direct Latin transliterations to English meanings
// This handles common Georgian words written in Latin script (e.g., "kata" for კატა)
const LATIN_TRANSLITERATIONS: Record<string, string[]> = {
  // ============= ANIMALS =============
  // Cats
  'kata': ['cat', 'kitten', 'pet', 'feline'],
  'katas': ['cat', 'kitten', 'pet', 'feline'],
  'knuti': ['kitten', 'cat', 'pet', 'baby'],
  
  // Dogs
  'dzaghli': ['dog', 'puppy', 'pet', 'canine'],
  'dzaghl': ['dog', 'puppy', 'pet', 'canine'],
  'lekvi': ['puppy', 'dog', 'pet', 'baby'],
  
  // Wild Animals
  'lomi': ['lion', 'cat', 'wild', 'king', 'predator'],
  'datvi': ['bear', 'wild', 'forest', 'animal'],
  'mgeli': ['wolf', 'canine', 'wild', 'pack'],
  'iremi': ['deer', 'animal', 'forest', 'wild'],
  'irmis': ['deer', 'animal', 'forest'],
  'melia': ['fox', 'wild', 'animal', 'forest'],
  'mekvle': ['fox', 'wild', 'animal'],
  'tskupri': ['squirrel', 'rodent', 'animal', 'nut'],
  'cicqana': ['squirrel', 'rodent', 'small'],
  
  // Farm Animals
  'txa': ['goat', 'animal', 'farm'],
  'txis': ['goat', 'animal', 'farm'],
  'tsikani': ['kid', 'goat', 'baby', 'young'],
  'ghori': ['pig', 'swine', 'farm', 'animal'],
  'gori': ['pig', 'swine', 'farm', 'animal'],
  'khrokhi': ['pig', 'swine', 'farm'],
  'tsxvari': ['sheep', 'wool', 'farm', 'lamb'],
  'cxvari': ['sheep', 'wool', 'farm', 'lamb'],
  'batkani': ['lamb', 'sheep', 'baby', 'farm'],
  'dzroxa': ['cow', 'cattle', 'farm', 'milk'],
  'xari': ['bull', 'ox', 'cattle', 'farm'],
  'vira': ['donkey', 'animal', 'farm', 'mule'],
  'virela': ['donkey', 'animal', 'farm'],
  'cxeni': ['horse', 'equine', 'riding', 'animal'],
  'cxen': ['horse', 'equine', 'riding', 'animal'],
  'tskheni': ['horse', 'equine', 'riding', 'animal'],
  'kviriki': ['colt', 'horse', 'baby', 'young'],
  
  // Poultry/Birds
  'qatami': ['chicken', 'poultry', 'meat', 'bird'],
  'katami': ['chicken', 'poultry', 'bird', 'farm'],
  'khatami': ['chicken', 'poultry', 'bird', 'farm'],
  'chaki': ['chicken', 'poultry', 'bird'],
  'chakhi': ['chicken', 'poultry', 'bird'],
  'mamali': ['rooster', 'chicken', 'bird', 'cock'],
  'batka': ['duck', 'bird', 'water', 'poultry'],
  'batkni': ['duckling', 'duck', 'baby', 'bird'],
  'indauri': ['turkey', 'bird', 'poultry', 'farm'],
  'xoxobi': ['pheasant', 'bird', 'georgian', 'hunting'],
  'artsivi': ['eagle', 'bird', 'flying', 'predator'],
  'baykushi': ['owl', 'bird', 'night', 'wise'],
  'bubu': ['owl', 'bird', 'night'],
  'mtsunavi': ['falcon', 'hawk', 'bird', 'predator'],
  'frinveli': ['bird', 'avian', 'flying', 'wing'],
  'chiti': ['bird', 'sparrow', 'small'],
  'chikhvi': ['bird', 'tweet', 'avian'],
  'mtredi': ['dove', 'pigeon', 'bird', 'peace'],
  'yorani': ['crow', 'raven', 'bird', 'black'],
  
  // Sea/Water Animals
  'veshapi': ['whale', 'ocean', 'mammal', 'sea'],
  'veshap': ['whale', 'ocean', 'mammal', 'sea'],
  'zvigeni': ['shark', 'fish', 'ocean', 'predator', 'sea'],
  'zvigen': ['shark', 'fish', 'ocean', 'predator', 'sea'],
  'tevzi': ['fish', 'aquatic', 'sea', 'water'],
  'delfini': ['dolphin', 'ocean', 'mammal', 'sea'],
  'rva': ['octopus', 'sea', 'tentacle', 'ocean'],
  'medusa': ['jellyfish', 'sea', 'ocean', 'marine'],
  'sardafi': ['crab', 'sea', 'shellfish', 'beach'],
  'kreveti': ['shrimp', 'prawn', 'sea', 'food'],
  'ardvi': ['otter', 'animal', 'water', 'river'],
  
  // Reptiles/Amphibians
  'gveli': ['snake', 'serpent', 'reptile'],
  'kurdi': ['turtle', 'reptile', 'shell'],
  'kudba': ['turtle', 'tortoise', 'reptile'],
  'krazana': ['crocodile', 'reptile', 'predator'],
  'xvliki': ['lizard', 'reptile', 'gecko'],
  'baqaqi': ['frog', 'amphibian', 'pond'],
  
  // Small Animals/Pets
  'kurdgheli': ['rabbit', 'bunny', 'pet', 'hare'],
  'kurdgeli': ['rabbit', 'bunny', 'pet'],
  'bocboci': ['hamster', 'rodent', 'pet', 'small'],
  'bughri': ['hamster', 'rodent', 'pet'],
  'tagvi': ['mouse', 'rodent', 'small', 'cheese'],
  'virmeshi': ['rat', 'rodent', 'small'],
  'spilo': ['elephant', 'animal', 'trunk', 'large'],
  'tikani': ['goat', 'kid', 'baby'],
  
  // Insects
  'puti': ['butterfly', 'insect', 'wing', 'colorful'],
  'priangi': ['butterfly', 'insect', 'wing'],
  'futi': ['bee', 'insect', 'honey', 'buzz'],
  'tsigani': ['bee', 'insect', 'honey'],
  'kriani': ['wasp', 'insect', 'sting'],
  'chrikhvi': ['cricket', 'insect', 'bug'],
  'mckhvrepi': ['cricket', 'insect', 'bug'],
  'chianchvela': ['ant', 'insect', 'colony'],
  'oboba': ['spider', 'web', 'insect'],
  'khokhobidzina': ['ladybug', 'insect', 'red', 'bug'],
  
  // ============= ENTERTAINMENT =============
  'tamashi': ['game', 'play', 'gaming', 'entertainment'],
  'tamashebi': ['games', 'gaming', 'play'],
  'satamashoebi': ['games', 'gaming', 'toys'],
  'satamasho': ['toy', 'plaything', 'game'],
  'satamashoe': ['toys', 'games', 'plaything'],
  'tovleba': ['doll', 'toy', 'puppet'],
  'tomi': ['doll', 'toy', 'puppet'],
  'tsekva': ['dance', 'dancing', 'ballet'],
  'cekva': ['dance', 'dancing', 'ballet', 'sport'],
  'cekvaa': ['skating', 'ice', 'sport'],
  'disneylandi': ['disney', 'theme park', 'fun', 'magic'],
  'karnavali': ['carnival', 'festival', 'parade', 'celebration'],
  'cirki': ['circus', 'clown', 'performance', 'acrobat'],
  'teatri': ['theater', 'stage', 'drama', 'performance'],
  'opera': ['opera', 'music', 'theater', 'singing'],
  'baleti': ['ballet', 'dance', 'performance', 'tutu'],
  'koncerti': ['concert', 'music', 'live', 'show'],
  'festivali': ['festival', 'celebration', 'party', 'event'],
  'garti': ['fun', 'entertainment', 'joy', 'play'],
  'gartoba': ['entertainment', 'fun', 'leisure'],
  'xumroba': ['joke', 'humor', 'funny', 'comedy'],
  'anekdoti': ['joke', 'funny', 'humor', 'story'],
  'kino': ['cinema', 'movie', 'film', 'theater'],
  'filmi': ['film', 'movie', 'cinema', 'video'],
  'animacia': ['animation', 'cartoon', 'animated'],
  'multfilmi': ['cartoon', 'animation', 'animated'],
  
  // ============= TECHNOLOGY =============
  'telefoni': ['phone', 'mobile', 'smartphone', 'call'],
  'kompiuteri': ['computer', 'laptop', 'desktop', 'tech'],
  'smartfoni': ['smartphone', 'mobile', 'phone', 'device'],
  'tableti': ['tablet', 'ipad', 'device', 'screen'],
  'kamera': ['camera', 'photo', 'photography', 'lens'],
  'proeqtori': ['projector', 'screen', 'presentation'],
  'monitari': ['monitor', 'screen', 'display', 'computer'],
  'monitori': ['monitor', 'screen', 'display'],
  'klaviatura': ['keyboard', 'typing', 'computer', 'keys'],
  'tauchi': ['mouse', 'computer', 'device', 'click'],
  'tausi': ['mouse', 'computer', 'cursor', 'click'],
  'printeri': ['printer', 'office', 'document', 'print'],
  'skaneri': ['scanner', 'office', 'document', 'scan'],
  'airtagi': ['airtag', 'tracker', 'tech', 'find'],
  'dronei': ['drone', 'flying', 'camera', 'aerial'],
  'droni': ['drone', 'flying', 'camera'],
  'roboti': ['robot', 'ai', 'technology', 'machine'],
  'xelovnuri': ['AI', 'artificial', 'intelligence'],
  'programireba': ['programming', 'code', 'developer', 'coding'],
  'programisti': ['programmer', 'developer', 'coder'],
  'aplikacia': ['app', 'application', 'mobile', 'software'],
  'saiti': ['website', 'site', 'web', 'internet'],
  'softveri': ['software', 'program', 'application'],
  'harti': ['hard drive', 'storage', 'disk', 'hdd'],
  'modemi': ['modem', 'internet', 'wifi', 'router'],
  'routeri': ['router', 'wifi', 'internet', 'network'],
  'naushniki': ['headphones', 'audio', 'music', 'earbuds'],
  'dinamiki': ['speaker', 'audio', 'sound', 'music'],
  'mikrofoni': ['microphone', 'audio', 'recording', 'voice'],
  'interneti': ['internet', 'web', 'online', 'wifi'],
  'telivizori': ['television', 'tv', 'screen', 'watch'],
  'televizori': ['television', 'tv', 'screen'],
  
  // ============= TRANSPORT =============
  'manqana': ['car', 'vehicle', 'automobile', 'drive'],
  'avto': ['car', 'auto', 'vehicle', 'automobile'],
  'avtomobili': ['automobile', 'car', 'vehicle', 'drive'],
  'motocikli': ['motorcycle', 'bike', 'motor', 'riding'],
  'velosipedi': ['bicycle', 'bike', 'cycling', 'pedal'],
  'skuteri': ['scooter', 'vehicle', 'ride', 'electric'],
  'taksii': ['taxi', 'cab', 'ride', 'driver'],
  'taksi': ['taxi', 'cab', 'ride'],
  'avtobusi': ['bus', 'transport', 'public', 'vehicle'],
  'marshutka': ['minibus', 'van', 'transport', 'shuttle'],
  'tramvai': ['tram', 'trolley', 'rail', 'transport'],
  'metro': ['metro', 'subway', 'underground', 'train'],
  'matarebeli': ['train', 'railway', 'transport', 'station'],
  'gemi': ['ship', 'boat', 'vessel', 'sea'],
  'navti': ['boat', 'ship', 'vessel', 'water'],
  'navi': ['boat', 'ship', 'sailing'],
  'iaxta': ['yacht', 'boat', 'luxury', 'sailing'],
  'katamari': ['catamaran', 'boat', 'sailing', 'sea'],
  'katamrani': ['catamaran', 'boat', 'sailing'],
  'tvitmprinavi': ['airplane', 'plane', 'flight', 'travel'],
  'vertmprenei': ['helicopter', 'chopper', 'flying', 'rotor'],
  'vertmpreni': ['helicopter', 'chopper', 'flying'],
  'saraketoe': ['spaceship', 'rocket', 'space', 'launch'],
  'raketa': ['rocket', 'spaceship', 'launch', 'space'],
  'satyepo': ['cargo', 'truck', 'transport', 'freight'],
  'tirai': ['truck', 'lorry', 'transport', 'cargo'],
  'satvirto': ['truck', 'cargo', 'freight'],
  'gadasazidi': ['trailer', 'transport', 'haul'],
  'ambulansi': ['ambulance', 'emergency', 'medical', 'hospital'],
  'saxandzro': ['fire truck', 'emergency', 'rescue', 'fire'],
  'policia': ['police car', 'law', 'patrol', 'cop'],
  'policiis': ['police', 'law', 'patrol'],
  
  // ============= NATURE =============
  'xe': ['tree', 'plant', 'wood', 'forest'],
  'yvavili': ['flower', 'bloom', 'plant', 'nature'],
  'balaki': ['grass', 'lawn', 'green', 'meadow'],
  'bichi': ['beach', 'sand', 'sea', 'coast'],
  'mtsvane': ['green', 'nature', 'plant', 'color'],
  'tye': ['forest', 'tree', 'woods', 'green'],
  'tke': ['forest', 'tree', 'woods'],
  'mta': ['mountain', 'peak', 'summit', 'hill'],
  'tba': ['lake', 'water', 'pond', 'nature'],
  'mdinare': ['river', 'water', 'stream', 'flow'],
  'zghva': ['sea', 'ocean', 'water', 'wave'],
  'ghru': ['cloud', 'sky', 'weather', 'fluffy'],
  'ghrubbeli': ['cloud', 'sky', 'weather'],
  'varskvlavi': ['star', 'night', 'sky', 'stellar'],
  'mze': ['sun', 'solar', 'light', 'sky'],
  'mtvare': ['moon', 'lunar', 'night', 'sky'],
  'wvima': ['rain', 'water', 'weather', 'drop'],
  'tovli': ['snow', 'winter', 'cold', 'white'],
  'qari': ['wind', 'windy', 'breeze', 'weather'],
  'ca': ['sky', 'heaven', 'blue', 'cloud'],
  'cvatana': ['rainbow', 'colors', 'sky', 'weather'],
  'chanchqeri': ['waterfall', 'water', 'nature', 'cascade'],
  'klde': ['rock', 'stone', 'cliff', 'mountain'],
  'kldeebi': ['rocks', 'cliffs', 'mountains'],
  
  // ============= SPORTS =============
  'burti': ['ball', 'sport', 'game', 'round'],
  'sporti': ['sport', 'athletics', 'game', 'fitness'],
  'fexburti': ['football', 'soccer', 'ball', 'goal'],
  'kalatburti': ['basketball', 'ball', 'hoop', 'court'],
  'basketboli': ['basketball', 'ball', 'hoop', 'nba'],
  'volei': ['volleyball', 'ball', 'net', 'sport'],
  'voleiboli': ['volleyball', 'ball', 'net'],
  'golfi': ['golf', 'club', 'ball', 'course'],
  'tenisi': ['tennis', 'racket', 'ball', 'court'],
  'chogburti': ['tennis', 'ball', 'racket', 'court'],
  'biniliaridi': ['billiards', 'pool', 'cue', 'table'],
  'biliardi': ['billiards', 'pool', 'cue'],
  'chidaoba': ['wrestling', 'sport', 'fight', 'athlete'],
  'krivi': ['boxing', 'fight', 'sport', 'punch'],
  'machvi': ['fencing', 'sword', 'sport', 'duel'],
  'khelburti': ['handball', 'ball', 'sport'],
  'tsurfva': ['swimming', 'pool', 'water', 'sport'],
  'tkhilami': ['ski', 'snow', 'winter', 'mountain'],
  'sathxilamuro': ['skiing', 'ski', 'snow'],
  'korpi': ['hockey', 'ice', 'sport', 'puck'],
  'hokei': ['hockey', 'ice', 'puck', 'sport'],
  'reketi': ['racket', 'tennis', 'sport'],
  
  // ============= FOOD =============
  'xachapuri': ['cheese', 'bread', 'food', 'georgian', 'khachapuri'],
  'khachapuri': ['cheese', 'bread', 'food', 'georgian'],
  'xinkali': ['dumpling', 'food', 'georgian', 'meat', 'khinkali'],
  'khinkali': ['dumpling', 'food', 'georgian', 'meat'],
  'shashliki': ['shashlik', 'kebab', 'grill', 'meat'],
  'mtsvadi': ['barbecue', 'grill', 'meat', 'georgian'],
  'lobio': ['beans', 'georgian', 'food', 'dish'],
  'ajapsandali': ['vegetable', 'stew', 'georgian', 'eggplant'],
  'badrijani': ['eggplant', 'vegetable', 'food', 'purple'],
  'churchxela': ['churchkhela', 'candy', 'georgian', 'walnut'],
  'tqemali': ['plum sauce', 'georgian', 'condiment', 'sour'],
  'satsivi': ['walnut sauce', 'georgian', 'chicken', 'dish'],
  'ghvino': ['wine', 'grape', 'drink', 'bottle'],
  'puri': ['bread', 'bakery', 'food', 'loaf'],
  'xorci': ['meat', 'beef', 'food', 'steak'],
  'khorci': ['meat', 'beef', 'food', 'steak'],
  'tapli': ['honey', 'sweet', 'bee', 'golden'],
  'rdze': ['milk', 'dairy', 'drink', 'cow'],
  'kveli': ['cheese', 'dairy', 'food', 'yellow'],
  'xili': ['fruit', 'apple', 'food', 'fresh'],
  'khili': ['fruit', 'apple', 'food', 'fresh'],
  'vashli': ['apple', 'fruit', 'food', 'red'],
  'msxali': ['pear', 'fruit', 'food', 'green'],
  'yurdzeni': ['grape', 'fruit', 'wine', 'vine'],
  'atami': ['peach', 'fruit', 'sweet', 'summer'],
  'nesvi': ['apricot', 'fruit', 'orange', 'summer'],
  'bostneuli': ['vegetable', 'veggie', 'food', 'garden'],
  'sachmleli': ['food', 'meal', 'dish', 'cuisine'],
  'qava': ['coffee', 'drink', 'cafe', 'cup'],
  'yava': ['coffee', 'drink', 'cafe'],
  'chai': ['tea', 'drink', 'cup', 'hot'],
  'tsqali': ['water', 'drink', 'liquid', 'aqua'],
  'ludi': ['beer', 'drink', 'alcohol', 'mug'],
  'torti': ['cake', 'dessert', 'birthday', 'sweet'],
  'namcxvari': ['pastry', 'cake', 'dessert', 'sweet'],
  'shokoladi': ['chocolate', 'sweet', 'candy', 'brown'],
  'nairi': ['ice cream', 'frozen', 'dessert', 'sweet'],
  
  // ============= GEOGRAPHY =============
  'qalaqi': ['city', 'town', 'urban', 'skyline'],
  'saqartvelo': ['georgia', 'country', 'flag', 'map'],
  'tbilisi': ['tbilisi', 'city', 'capital', 'georgia'],
  'batumi': ['batumi', 'city', 'sea', 'beach'],
  'qveyana': ['country', 'nation', 'flag', 'map'],
  'kontinenti': ['continent', 'world', 'globe'],
  
  // ============= PEOPLE/PROFESSIONS =============
  'mtscrali': ['writer', 'author', 'pen', 'book'],
  'poeti': ['poet', 'poetry', 'verse', 'quill'],
  'mxatvari': ['artist', 'painter', 'brush', 'art'],
  'metsntieri': ['scientist', 'research', 'lab'],
  'msakhiobi': ['actor', 'theater', 'stage', 'mask'],
  'momgherali': ['singer', 'music', 'microphone'],
  'musikosi': ['musician', 'music', 'instrument'],
  'mefe': ['king', 'castle', 'royal', 'throne'],
  'dedopali': ['queen', 'palace', 'royal', 'throne'],
  'eqimi': ['doctor', 'medical', 'health', 'hospital'],
  'maswavlebeli': ['teacher', 'school', 'education'],
  
  // ============= MUSIC =============
  'musika': ['music', 'song', 'melody', 'note'],
  'simghera': ['song', 'music', 'singing'],
  'gitara': ['guitar', 'music', 'instrument'],
  'pianino': ['piano', 'keyboard', 'music'],
  'panduri': ['panduri', 'guitar', 'georgian', 'instrument'],
  'daira': ['tambourine', 'drum', 'percussion'],
  'doli': ['drum', 'percussion', 'beat'],
  
  // ============= HOUSEHOLD =============
  'tsigni': ['book', 'reading', 'literature'],
  'wigni': ['book', 'reading', 'literature'],
  'magida': ['table', 'desk', 'furniture'],
  'skami': ['chair', 'seat', 'furniture'],
  'saxli': ['house', 'home', 'building'],
  'eklesia': ['church', 'cathedral', 'religion'],
  'cixe': ['fortress', 'castle', 'tower'],
  'karavi': ['tent', 'camping', 'outdoor'],
  'lojka': ['bed', 'sleep', 'bedroom'],
  'sarke': ['mirror', 'reflection', 'glass'],
  
  // ============= FAMILY =============
  'ojaxi': ['family', 'home', 'household'],
  'deda': ['mother', 'mom', 'parent'],
  'mama': ['father', 'dad', 'parent'],
  'bavshvi': ['child', 'kid', 'baby'],
  'shvili': ['child', 'son', 'daughter'],
  'dzma': ['brother', 'sibling', 'family'],
  'da': ['sister', 'sibling', 'family'],
  'bebia': ['grandmother', 'grandma', 'family'],
  'babua': ['grandfather', 'grandpa', 'family'],
  
  // ============= WEATHER =============
  'amindi': ['weather', 'climate', 'forecast'],
  'sitsive': ['cold', 'freeze', 'winter'],
  'sicxe': ['heat', 'hot', 'summer'],
  'elva': ['lightning', 'thunder', 'storm'],
  'qvirimli': ['thunder', 'storm', 'loud'],
  
  // ============= COLORS =============
  'tsiteli': ['red', 'color', 'crimson'],
  'lurji': ['blue', 'color', 'azure'],
  'yviteli': ['yellow', 'color', 'gold'],
  'shavi': ['black', 'color', 'dark'],
  'tetri': ['white', 'color', 'light'],
  'narinjisferi': ['orange', 'color', 'citrus'],
  'iisferi': ['purple', 'violet', 'color'],
  
  // ============= ABSTRACT/COMMON =============
  'siyvaruli': ['love', 'heart', 'romance'],
  'sicocxle': ['life', 'living', 'alive'],
  'bedniereba': ['happiness', 'joy', 'smile'],
  'swavla': ['study', 'learn', 'education'],
  'mushaoba': ['work', 'job', 'office'],
  'mogzauroba': ['travel', 'trip', 'journey'],
  'dgesaswauli': ['holiday', 'celebration', 'festival'],
  'dabadebis': ['birthday', 'birth', 'celebration'],
  'qorwili': ['wedding', 'marriage', 'celebration'],
};

// Phonetic variants for Latin-to-Georgian conversion
// These map ambiguous Latin letters to all possible Georgian equivalents
const LATIN_PHONETIC_AMBIGUITY: Record<string, string[]> = {
  't': ['თ', 'ტ'],  // t can be თ (soft t) or ტ (hard t)
  'k': ['კ', 'ქ'],  // k can be კ (hard k) or ქ (soft k)
  'p': ['პ', 'ფ'],  // p can be პ (hard p) or ფ (soft p/f)
  'c': ['ც', 'ჩ', 'კ'],  // c can be ც, ჩ, or even კ
  'g': ['გ', 'ღ'],  // g can be გ or ღ (guttural)
};

// Generate all phonetic variants for Latin input -> Georgian possibilities
function generatePhoneticVariants(latinInput: string): string[] {
  const LATIN_TO_GEORGIAN_BASE: Record<string, string> = {
    'a': 'ა', 'b': 'ბ', 'g': 'გ', 'd': 'დ', 'e': 'ე',
    'v': 'ვ', 'z': 'ზ', 'i': 'ი', 'l': 'ლ', 'm': 'მ',
    'n': 'ნ', 'o': 'ო', 'r': 'რ', 's': 'ს', 'u': 'უ',
    'j': 'ჯ', 'h': 'ჰ', 'w': 'წ', 'x': 'ხ', 'q': 'ყ', 'f': 'ფ'
  };
  
  // Start with the base conversion
  const variants: string[] = [];
  
  // Helper to recursively generate all combinations
  function generateCombinations(remaining: string, current: string): void {
    if (remaining.length === 0) {
      if (current.length > 0) {
        variants.push(current);
      }
      return;
    }
    
    // Check for digraphs first
    const twoChar = remaining.substring(0, 2).toLowerCase();
    if (twoChar === 'sh') { 
      generateCombinations(remaining.slice(2), current + 'შ'); 
      return;
    }
    if (twoChar === 'ch') { 
      generateCombinations(remaining.slice(2), current + 'ჩ'); 
      generateCombinations(remaining.slice(2), current + 'ჭ'); // aspirated ch
      return;
    }
    if (twoChar === 'ts') { 
      generateCombinations(remaining.slice(2), current + 'ც'); 
      generateCombinations(remaining.slice(2), current + 'წ'); // aspirated ts
      return;
    }
    if (twoChar === 'dz') { 
      generateCombinations(remaining.slice(2), current + 'ძ'); 
      return;
    }
    if (twoChar === 'kh') { 
      generateCombinations(remaining.slice(2), current + 'ხ'); 
      return;
    }
    if (twoChar === 'gh') { 
      generateCombinations(remaining.slice(2), current + 'ღ'); 
      return;
    }
    if (twoChar === 'zh') { 
      generateCombinations(remaining.slice(2), current + 'ჟ'); 
      return;
    }
    
    const char = remaining[0].toLowerCase();
    const rest = remaining.slice(1);
    
    // Check if this letter has ambiguous mappings
    if (LATIN_PHONETIC_AMBIGUITY[char]) {
      // Generate variant for each possible Georgian letter
      for (const geoChar of LATIN_PHONETIC_AMBIGUITY[char]) {
        generateCombinations(rest, current + geoChar);
      }
    } else {
      // Use base mapping or keep original
      const geoChar = LATIN_TO_GEORGIAN_BASE[char] || char;
      generateCombinations(rest, current + geoChar);
    }
  }
  
  generateCombinations(latinInput.toLowerCase(), '');
  
  // Limit variants to avoid explosion (max 16 combinations)
  return [...new Set(variants)].slice(0, 16);
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
  'მეფე': ['king', 'castle', 'royal', 'throne'],
  'დედოფალი': ['queen', 'palace', 'royal', 'throne'],
  
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
  
  // Food/Cuisine - expanded with common variants
  'საჭმელი': ['food', 'meal', 'dish', 'cuisine', 'eat', 'eating', 'restaurant', 'dinner', 'lunch'],
  'საჭმელის': ['food', 'meal', 'dish', 'cuisine', 'eat'],
  'საკვები': ['food', 'meal', 'dish', 'cuisine', 'nutrition', 'eat'],
  'კერძი': ['dish', 'meal', 'plate', 'food', 'cuisine'],
  'კერძები': ['dishes', 'meals', 'food', 'plate'],
  'სადილი': ['lunch', 'meal', 'food', 'dinner'],
  'ვახშამი': ['dinner', 'supper', 'meal', 'evening', 'food'],
  'საუზმე': ['breakfast', 'morning', 'meal', 'food'],
  'რესტორანი': ['restaurant', 'food', 'dining', 'eat', 'chef'],
  'ღვინო': ['wine', 'grape', 'drink', 'bottle', 'alcohol'],
  'პური': ['bread', 'bakery', 'wheat', 'food', 'loaf'],
  'ხინკალი': ['khinkali', 'dumpling', 'food', 'georgian', 'meat'],
  'ხაჭაპური': ['khachapuri', 'cheese', 'bread', 'food', 'georgian'],
  'ხორცი': ['meat', 'beef', 'food', 'steak', 'pork', 'chicken'],
  'ქათამი': ['chicken', 'poultry', 'meat', 'food', 'bird'],
  'ბოსტნეული': ['vegetable', 'veggie', 'food', 'salad', 'green'],
  'ხილი': ['fruit', 'apple', 'food', 'fresh', 'banana', 'orange'],
  'ტკბილეული': ['dessert', 'sweet', 'candy', 'cake', 'sugar'],
  'ტორტი': ['cake', 'dessert', 'birthday', 'sweet', 'pastry'],
  'ყავა': ['coffee', 'drink', 'cafe', 'cup', 'espresso'],
  'ჩაი': ['tea', 'drink', 'cup', 'hot', 'beverage'],
  'წყალი': ['water', 'drink', 'liquid', 'bottle', 'aqua'],
  'სასმელი': ['drink', 'beverage', 'liquid', 'glass', 'cup'],
  
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
  'shark': ['fish', 'predator', 'ocean', 'sea'],
  'whale': ['ocean', 'sea', 'mammal'],
  'dolphin': ['ocean', 'sea', 'mammal'],
  
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

// English to Georgian semantic mapping (for reverse lookups when searching in English)
const ENGLISH_TO_GEORGIAN: Record<string, string[]> = {
  // Animals
  'shark': ['ზვიგენ', 'ზვიგენი'],
  'whale': ['ვეშაპ', 'ვეშაპი'],
  'dolphin': ['დელფინ', 'დელფინი'],
  'dog': ['ძაღლ', 'ძაღლი'],
  'cat': ['კატ', 'კატა'],
  'bird': ['ფრინველ', 'ფრინველი', 'ჩიტ', 'ჩიტი'],
  'fish': ['თევზ', 'თევზი'],
  'lion': ['ლომ', 'ლომი'],
  'bear': ['დათვ', 'დათვი'],
  'horse': ['ცხენ', 'ცხენი'],
  'elephant': ['სპილ', 'სპილო'],
  'snake': ['გველ', 'გველი'],
  'wolf': ['მგელ', 'მგელი'],
  'eagle': ['არწივ', 'არწივი'],
  
  // Nature
  'sun': ['მზ', 'მზე'],
  'moon': ['მთვარ', 'მთვარე'],
  'star': ['ვარსკვლავ', 'ვარსკვლავი'],
  'mountain': ['მთ', 'მთა'],
  'sea': ['ზღვ', 'ზღვა'],
  'ocean': ['ოკეან', 'ოკეანე'],
  'river': ['მდინარ', 'მდინარე'],
  'forest': ['ტყ', 'ტყე'],
  'tree': ['ხ', 'ხე'],
  'flower': ['ყვავილ', 'ყვავილი'],
  
  // Geography
  'city': ['ქალაქ', 'ქალაქი'],
  'country': ['ქვეყან', 'ქვეყანა'],
  'georgia': ['საქართველ', 'საქართველო'],
  
  // People
  'writer': ['მწერალ', 'მწერალი'],
  'poet': ['პოეტ', 'პოეტი'],
  'artist': ['მხატვარ', 'მხატვარი'],
  'scientist': ['მეცნიერ', 'მეცნიერი'],
  'king': ['მეფ', 'მეფე'],
  'queen': ['დედოფალ', 'დედოფალი'],
  
  // Sports
  'football': ['ფეხბურთ', 'ფეხბურთი'],
  'basketball': ['კალათბურთ', 'კალათბურთი'],
  'sport': ['სპორტ', 'სპორტი'],
  
  // Food
  'food': ['საჭმელ', 'საჭმელი', 'საკვებ', 'საკვები'],
  'wine': ['ღვინ', 'ღვინო'],
  'bread': ['პურ', 'პური'],
  
  // Technology
  'computer': ['კომპიუტერ', 'კომპიუტერი'],
  'phone': ['ტელეფონ', 'ტელეფონი'],
  'internet': ['ინტერნეტ', 'ინტერნეტი'],
  
  // Transport
  'car': ['მანქან', 'მანქანა'],
  'plane': ['თვითმფრინავ', 'თვითმფრინავი'],
  'ship': ['გემ', 'გემი'],
  
  // Culture
  'music': ['მუსიკ', 'მუსიკა'],
  'history': ['ისტორი', 'ისტორია'],
  'culture': ['კულტურ', 'კულტურა'],
  'war': ['ომ', 'ომი'],
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

// Calculate trigram similarity (better for typo detection)
function trigramSimilarity(a: string, b: string): number {
  const getTrigrams = (s: string): Set<string> => {
    const padded = `  ${s.toLowerCase()}  `;
    const trigrams = new Set<string>();
    for (let i = 0; i < padded.length - 2; i++) {
      trigrams.add(padded.substring(i, i + 3));
    }
    return trigrams;
  };

  const trigramsA = getTrigrams(a);
  const trigramsB = getTrigrams(b);
  
  let intersection = 0;
  trigramsA.forEach(t => { if (trigramsB.has(t)) intersection++; });
  
  const union = trigramsA.size + trigramsB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// Check if strings are similar using multiple methods (fuzzy match with scoring)
function isFuzzyMatch(a: string, b: string): { match: boolean; score: number } {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();
  
  // Exact match
  if (aLower === bLower) return { match: true, score: 100 };
  
  // Prefix/suffix match (for partial typing)
  if (aLower.startsWith(bLower) || bLower.startsWith(aLower)) {
    return { match: true, score: 85 };
  }
  
  // Contains match
  if (aLower.includes(bLower) || bLower.includes(aLower)) {
    return { match: true, score: 70 };
  }
  
  // Skip for very short strings
  if (a.length < 3 || b.length < 3) {
    return { match: false, score: 0 };
  }
  
  // Levenshtein distance check
  const distance = levenshteinDistance(aLower, bLower);
  const maxLen = Math.max(a.length, b.length);
  const levenshteinScore = Math.max(0, 100 - (distance / maxLen) * 100);
  
  // Trigram similarity for typo tolerance
  const trigramScore = trigramSimilarity(a, b) * 100;
  
  // Use the better score
  const bestScore = Math.max(levenshteinScore, trigramScore);
  
  // Match if score is above threshold (50% for typo tolerance)
  return { 
    match: bestScore >= 50, 
    score: bestScore 
  };
}

// Check if two strings are similar (fuzzy match) - enhanced with lower threshold
function isSimilar(a: string, b: string, threshold = 3): boolean {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();
  
  // Very short strings (< 3 chars): exact match only
  if (a.length < 3 || b.length < 3) return aLower === bLower;
  
  // For medium strings (3-6 chars): allow 1 typo
  // For longer strings (7+): allow 2-3 typos
  const minLen = Math.min(a.length, b.length);
  const dynamicThreshold = minLen <= 6 
    ? 1 
    : Math.min(threshold, Math.floor(minLen / 3));
  
  return levenshteinDistance(aLower, bLower) <= dynamicThreshold;
}

// Common typos and misspellings dictionary
const COMMON_TYPOS: Record<string, string[]> = {
  // Georgian transliteration variants
  'kata': ['cata', 'katta', 'kataa', 'qata'],
  'dzaghli': ['dzaghl', 'dzagly', 'zaghl', 'dzagli'],
  'lomi': ['lom', 'lomy', 'lome'],
  'tevzi': ['tevz', 'thevzi', 'tevzy'],
  'frinveli': ['frinvel', 'prinveli', 'frinvelly'],
  
  // English common typos
  'cat': ['catt', 'kat', 'kcat', 'cta'],
  'dog': ['dogg', 'dgo', 'god'],
  'bird': ['brid', 'bidr', 'brird'],
  'fish': ['fich', 'fis', 'fissh'],
  'horse': ['hrose', 'hrse', 'horsee'],
  'lion': ['loin', 'lioon', 'lino'],
  'music': ['musci', 'muisc', 'musikc'],
  'movie': ['moive', 'movei', 'mvoie'],
  'phone': ['pohne', 'phoen', 'fone'],
  'computer': ['computre', 'compueter', 'computar'],
  'football': ['footbal', 'fooball', 'fotball'],
  'basketball': ['basketbal', 'bascetball', 'basektball'],
  
  // Georgian Latin typos
  'xachapuri': ['khachapuri', 'hachapuri', 'xachapury'],
  'xinkali': ['khinkali', 'hinkali', 'xinkaly'],
  'ghvino': ['gvino', 'ghvini', 'gvini'],
  'fexburti': ['fexburt', 'fexburti', 'fexburthi'],
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, limit = 50, questionContext, answerContext, correctAnswer, shuffle = false, seed } = await req.json();
    
    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ icons: [], keywords: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Smart icon search: query="${query}", shuffle=${shuffle}, seed=${seed}`);

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
      // For non-Georgian (English/Latin) queries, add synonyms and Georgian equivalents for better results
      const queryLower = query.toLowerCase().trim();
      searchTerms.add(queryLower);
      
      // PRIORITY 1: Check direct Latin transliterations FIRST
      // This handles cases like "kata" -> cat, "dzaghli" -> dog
      const directTranslation = LATIN_TRANSLITERATIONS[queryLower];
      if (directTranslation) {
        console.log(`Direct Latin match: "${queryLower}" -> ${directTranslation.join(', ')}`);
        directTranslation.forEach(t => searchTerms.add(t));
      }
      
      // Enhanced typo-tolerant search in LATIN_TRANSLITERATIONS
      for (const [latinWord, translations] of Object.entries(LATIN_TRANSLITERATIONS)) {
        if (queryLower.length >= 3 && latinWord.length >= 3) {
          // Check prefix/suffix match
          if (latinWord.startsWith(queryLower) || queryLower.startsWith(latinWord)) {
            console.log(`Latin prefix match: "${queryLower}" ~ "${latinWord}"`);
            translations.forEach(t => searchTerms.add(t));
            continue;
          }
          
          // Enhanced fuzzy match with lower threshold
          const fuzzyResult = isFuzzyMatch(queryLower, latinWord);
          if (fuzzyResult.match && fuzzyResult.score >= 50) {
            console.log(`Latin fuzzy match (score=${fuzzyResult.score.toFixed(1)}): "${queryLower}" ~ "${latinWord}"`);
            translations.forEach(t => searchTerms.add(t));
          }
        }
      }
      
      // Check common typos dictionary
      const typoCorrections = COMMON_TYPOS[queryLower];
      if (typoCorrections) {
        typoCorrections.forEach(typo => {
          if (LATIN_TRANSLITERATIONS[typo]) {
            LATIN_TRANSLITERATIONS[typo].forEach(t => searchTerms.add(t));
          }
        });
      }
      
      // Reverse typo lookup (if user typed a typo)
      for (const [correct, typos] of Object.entries(COMMON_TYPOS)) {
        if (typos.some(t => isFuzzyMatch(queryLower, t).match)) {
          if (LATIN_TRANSLITERATIONS[correct]) {
            console.log(`Typo correction: "${queryLower}" -> "${correct}"`);
            LATIN_TRANSLITERATIONS[correct].forEach(t => searchTerms.add(t));
          }
          searchTerms.add(correct);
        }
      }
      
      // Add English synonyms
      const synonyms = ENGLISH_SYNONYMS[queryLower];
      if (synonyms) {
        synonyms.forEach(s => searchTerms.add(s));
      }
      
      // Add Georgian equivalents for English terms (enables bilingual search)
      const georgianEquivalents = ENGLISH_TO_GEORGIAN[queryLower];
      if (georgianEquivalents) {
        // Transliterate Georgian to Latin for icon matching
        georgianEquivalents.forEach(geo => {
          const transliterated = transliterateGeorgian(geo);
          if (transliterated.length >= 2) {
            getPhoneticVariants(transliterated).forEach(v => searchTerms.add(v));
          }
        });
      }
      
      // PRIORITY 2: Generate phonetic variants and check Georgian dictionary
      // This handles ambiguous Latin -> Georgian mappings (t -> თ/ტ, k -> კ/ქ)
      const phoneticVariants = generatePhoneticVariants(queryLower);
      console.log(`Phonetic variants for "${queryLower}":`, phoneticVariants);
      
      // Look up each variant in GEORGIAN_TO_ENGLISH
      for (const variant of phoneticVariants) {
        for (const [geoWord, translations] of Object.entries(GEORGIAN_TO_ENGLISH)) {
          // Check exact match
          if (variant === geoWord) {
            console.log(`Phonetic exact match: variant "${variant}" = "${geoWord}" -> ${translations.join(', ')}`);
            translations.forEach(t => searchTerms.add(t));
          }
          // Check with suffix stripped
          const variantStripped = variant.replace(/ი$/, '');
          const geoWordStripped = geoWord.replace(/ი$/, '');
          if (variantStripped.length >= 3 && geoWordStripped.length >= 3) {
            if (variantStripped === geoWordStripped) {
              console.log(`Phonetic stripped match: "${variantStripped}" = "${geoWordStripped}" -> ${translations.join(', ')}`);
              translations.forEach(t => searchTerms.add(t));
            }
          }
        }
      }
      
      // FALLBACK: Simple Latin to Georgian transliteration (single mapping)
      const LATIN_TO_GEORGIAN_SIMPLE: Record<string, string> = {
        'a': 'ა', 'b': 'ბ', 'g': 'გ', 'd': 'დ', 'e': 'ე',
        'v': 'ვ', 'z': 'ზ', 't': 'თ', 'i': 'ი', 'k': 'კ',
        'l': 'ლ', 'm': 'მ', 'n': 'ნ', 'o': 'ო', 'p': 'პ',
        'r': 'რ', 's': 'ს', 'u': 'უ', 'f': 'ფ', 'q': 'ყ',
        'j': 'ჯ', 'h': 'ჰ', 'c': 'ც', 'w': 'წ', 'x': 'ხ'
      };
      
      // Transliterate Latin to Georgian (simple version)
      const transliterateLatinToGeorgian = (text: string): string => {
        let result = '';
        let i = 0;
        while (i < text.length) {
          const twoChar = text.substring(i, i + 2).toLowerCase();
          if (twoChar === 'sh') { result += 'შ'; i += 2; continue; }
          if (twoChar === 'ch') { result += 'ჩ'; i += 2; continue; }
          if (twoChar === 'ts') { result += 'ც'; i += 2; continue; }
          if (twoChar === 'dz') { result += 'ძ'; i += 2; continue; }
          if (twoChar === 'kh') { result += 'ხ'; i += 2; continue; }
          if (twoChar === 'gh') { result += 'ღ'; i += 2; continue; }
          if (twoChar === 'zh') { result += 'ჟ'; i += 2; continue; }
          
          const char = text[i].toLowerCase();
          result += LATIN_TO_GEORGIAN_SIMPLE[char] || char;
          i++;
        }
        return result;
      };
      
      // Try converting Latin query to Georgian and look up in GEORGIAN_TO_ENGLISH
      const potentialGeorgian = transliterateLatinToGeorgian(queryLower);
      console.log(`Latin "${queryLower}" -> Georgian (simple) "${potentialGeorgian}"`);
      
      // Look for exact or partial matches in Georgian dictionary
      for (const [geoWord, translations] of Object.entries(GEORGIAN_TO_ENGLISH)) {
        if (potentialGeorgian === geoWord || 
            potentialGeorgian.includes(geoWord) || 
            geoWord.includes(potentialGeorgian)) {
          translations.forEach(t => searchTerms.add(t));
          console.log(`Found Georgian match: "${geoWord}" -> ${translations.join(', ')}`);
        }
        
        const potentialWithoutSuffix = potentialGeorgian.replace(/ი$/, '');
        const geoWordWithoutSuffix = geoWord.replace(/ი$/, '');
        if (potentialWithoutSuffix.length >= 3 && geoWordWithoutSuffix.length >= 3) {
          if (potentialWithoutSuffix === geoWordWithoutSuffix || 
              potentialWithoutSuffix.includes(geoWordWithoutSuffix) || 
              geoWordWithoutSuffix.includes(potentialWithoutSuffix)) {
            translations.forEach(t => searchTerms.add(t));
          }
        }
      }
      
      // Also check for partial matches in synonym keys
      for (const [word, syns] of Object.entries(ENGLISH_SYNONYMS)) {
        if (queryLower.includes(word) || word.includes(queryLower)) {
          syns.forEach(s => searchTerms.add(s));
          searchTerms.add(word);
        }
      }
      
      // Check for partial matches in English to Georgian mapping
      for (const [engWord, geoWords] of Object.entries(ENGLISH_TO_GEORGIAN)) {
        if (queryLower.includes(engWord) || engWord.includes(queryLower)) {
          geoWords.forEach(geo => {
            const transliterated = transliterateGeorgian(geo);
            if (transliterated.length >= 2) {
              searchTerms.add(transliterated);
            }
          });
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

    // Sanitize search terms - remove special characters that break PostgREST queries
    // Commas, parentheses, quotes, and other special chars can break the .or() query
    const sanitizeForQuery = (term: string): string => {
      return term
        .replace(/[,(){}[\]'"\\]/g, '') // Remove special chars
        .replace(/\s+/g, '') // Remove spaces (search terms should be single words)
        .trim();
    };

    // Filter and sanitize terms
    const sanitizedTerms = allSearchTerms
      .map(term => sanitizeForQuery(term))
      .filter(term => term.length >= 2); // Only keep meaningful terms

    if (sanitizedTerms.length === 0) {
      return new Response(
        JSON.stringify({ icons: [], keywords: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PRIORITY QUERY: Find exact slug/title matches for the original query term first
    // This ensures that typing "khinkali" always returns the khinkali icon regardless of fuzzy noise
    const queryLowerSanitized = query.toLowerCase().replace(/[,(){}[\]'"\\]/g, '').trim();
    let priorityIconIds = new Set<string>();
    let priorityIcons: any[] = [];
    
    if (queryLowerSanitized.length >= 2) {
      const { data: exactMatches } = await supabase
        .from('icon_library')
        .select('id, slug, title, icon_url, tags')
        .or(`slug.ilike.%${queryLowerSanitized}%,title.ilike.%${queryLowerSanitized}%`)
        .limit(10);
      
      if (exactMatches && exactMatches.length > 0) {
        priorityIcons = exactMatches;
        exactMatches.forEach(icon => priorityIconIds.add(icon.id));
        console.log(`Priority exact matches for "${queryLowerSanitized}": ${exactMatches.map(i => i.slug).join(', ')}`);
      }
    }

    // Build OR conditions for search
    const orConditions = sanitizedTerms.map(term => 
      `title.ilike.%${term}%,slug.ilike.%${term}%`
    ).join(',');

    // Also search in tags
    const tagsConditions = sanitizedTerms.map(term => `tags.cs.{${term}}`).join(',');
    
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
        
        // Enhanced fuzzy match bonus in scoring
        const slugFuzzy = isFuzzyMatch(slug, termLower);
        const titleFuzzy = isFuzzyMatch(title, termLower);
        
        if (slugFuzzy.match) {
          score += Math.floor(slugFuzzy.score * 0.4); // Up to 40 points for fuzzy slug match
        }
        if (titleFuzzy.match) {
          score += Math.floor(titleFuzzy.score * 0.3); // Up to 30 points for fuzzy title match
        }
      }
      
      // Boost score for priority (exact slug/title) matches
      if (priorityIconIds.has(icon.id)) {
        score += 1000;
      }
      
      return { ...icon, score };
    });

    // Merge priority icons that weren't in the main results
    for (const pIcon of priorityIcons) {
      if (!scoredIcons.some(s => s.id === pIcon.id)) {
        scoredIcons.push({ ...pIcon, score: 1000 });
      }
    }

    // Sort by score and take top results
    scoredIcons.sort((a, b) => b.score - a.score);
    
    // Filter out icons that would reveal the answer
    let filteredIcons = scoredIcons.filter(icon => {
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
    
    // If shuffle is enabled, randomize the order of similarly-scored icons
    if (shuffle && seed) {
      // Use seeded pseudo-random shuffle for consistency
      const seededRandom = (s: number) => {
        const x = Math.sin(s) * 10000;
        return x - Math.floor(x);
      };
      
      // Group icons by score ranges and shuffle within groups
      const scoreGroups: Record<number, typeof filteredIcons> = {};
      filteredIcons.forEach(icon => {
        const scoreGroup = Math.floor(icon.score / 20) * 20; // Group by 20-point ranges
        if (!scoreGroups[scoreGroup]) scoreGroups[scoreGroup] = [];
        scoreGroups[scoreGroup].push(icon);
      });
      
      // Shuffle within each group
      Object.values(scoreGroups).forEach(group => {
        for (let i = group.length - 1; i > 0; i--) {
          const j = Math.floor(seededRandom(seed + i) * (i + 1));
          [group[i], group[j]] = [group[j], group[i]];
        }
      });
      
      // Reconstruct the array
      filteredIcons = Object.entries(scoreGroups)
        .sort(([a], [b]) => Number(b) - Number(a))
        .flatMap(([, group]) => group);
    }
    
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
