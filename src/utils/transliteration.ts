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
};

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
 * Get Georgian equivalents for an English word
 */
export function getGeorgianEquivalents(englishWord: string): string[] {
  const normalized = englishWord.toLowerCase().trim();
  return ENGLISH_TO_GEORGIAN[normalized] || [];
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
 * Build search terms array from input (handles both Latin and Georgian)
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
