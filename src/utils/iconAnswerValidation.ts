// Utility to validate that icon keywords don't reveal the correct answer

// Georgian to Latin phonetic transliteration map
const GEORGIAN_TO_LATIN: Record<string, string> = {
  'ა': 'a', 'ბ': 'b', 'გ': 'g', 'დ': 'd', 'ე': 'e', 'ვ': 'v', 'ზ': 'z',
  'თ': 't', 'ი': 'i', 'კ': 'k', 'ლ': 'l', 'მ': 'm', 'ნ': 'n', 'ო': 'o',
  'პ': 'p', 'ჟ': 'zh', 'რ': 'r', 'ს': 's', 'ტ': 't', 'უ': 'u', 'ფ': 'f',
  'ქ': 'k', 'ღ': 'gh', 'ყ': 'q', 'შ': 'sh', 'ჩ': 'ch', 'ც': 'ts', 'ძ': 'dz',
  'წ': 'ts', 'ჭ': 'ch', 'ხ': 'kh', 'ჯ': 'j', 'ჰ': 'h'
};

// Semantic groups - icon keywords that directly match Georgian answers
const SEMANTIC_ANSWER_MATCHES: Record<string, string[]> = {
  // Animals
  'chameleon': ['ქამელეონ', 'chameleon', 'kameleoni'],
  'dolphin': ['დელფინ', 'dolphin', 'delfini'],
  'elephant': ['სპილო', 'elephant', 'spilo'],
  'lion': ['ლომ', 'lion', 'lomi'],
  'tiger': ['ვეფხვ', 'tiger', 'vefkhvi'],
  'bear': ['დათვ', 'bear', 'datvi'],
  'wolf': ['მგელ', 'wolf', 'mgeli'],
  'fox': ['მელა', 'fox', 'mela'],
  'eagle': ['არწივ', 'eagle', 'artsivi'],
  'snake': ['გველ', 'snake', 'gveli'],
  'fish': ['თევზ', 'fish', 'tevzi'],
  'cat': ['კატა', 'cat', 'kata'],
  'dog': ['ძაღლ', 'dog', 'dzaghli'],
  'horse': ['ცხენ', 'horse', 'tskheni'],
  'cow': ['ძროხა', 'cow', 'dzrokha'],
  'pig': ['ღორ', 'pig', 'ghori'],
  'chicken': ['ქათამ', 'chicken', 'katami'],
  'rabbit': ['კურდღელ', 'rabbit', 'kurdgheli'],
  'monkey': ['მაიმუნ', 'monkey', 'maimuni'],
  'giraffe': ['ჟირაფ', 'giraffe', 'zhirafi'],
  'penguin': ['პინგვინ', 'penguin', 'pingvini'],
  'owl': ['ბუ', 'owl', 'bu'],
  'butterfly': ['პეპელა', 'butterfly', 'pepela'],
  'bee': ['ფუტკარ', 'bee', 'futkari'],
  'ant': ['ჭიანჭველა', 'ant', 'chianchvela'],
  'spider': ['ობობა', 'spider', 'oboba'],
  'turtle': ['კუ', 'turtle', 'ku'],
  'frog': ['ბაყაყ', 'frog', 'baqaqi'],
  'crocodile': ['ნიანგ', 'crocodile', 'niangi'],
  'shark': ['ზვიგენ', 'shark', 'zvigeni'],
  'whale': ['ვეშაპ', 'whale', 'veshapi'],
  'octopus': ['რვაფეხა', 'octopus', 'rvafekha'],
  
  // Countries & Cities
  'georgia': ['საქართველო', 'georgia', 'sakartvelo'],
  'tbilisi': ['თბილის', 'tbilisi'],
  'batumi': ['ბათუმ', 'batumi'],
  'kutaisi': ['ქუთაის', 'kutaisi'],
  'france': ['საფრანგეთ', 'france'],
  'paris': ['პარიზ', 'paris'],
  'germany': ['გერმან', 'germany'],
  'berlin': ['ბერლინ', 'berlin'],
  'russia': ['რუსეთ', 'russia'],
  'moscow': ['მოსკოვ', 'moscow'],
  'usa': ['ამერიკ', 'america', 'აშშ'],
  'china': ['ჩინეთ', 'china'],
  'japan': ['იაპონ', 'japan'],
  'italy': ['იტალ', 'italy'],
  'rome': ['რომ', 'rome'],
  'spain': ['ესპანეთ', 'spain'],
  'england': ['ინგლის', 'england'],
  'london': ['ლონდონ', 'london'],
  
  // Rivers & Mountains
  'mtkvari': ['მტკვარ', 'mtkvari', 'kura'],
  'rioni': ['რიონ', 'rioni'],
  'kazbegi': ['ყაზბეგ', 'kazbegi', 'kazbek'],
  'elbrus': ['ელბრუს', 'elbrus'],
  
  // Historical figures
  'tamar': ['თამარ', 'tamar'],
  'david': ['დავით', 'david', 'davit'],
  'shota': ['შოთა', 'shota'],
  'rustaveli': ['რუსთაველ', 'rustaveli'],
  
  // Objects
  'sun': ['მზე', 'sun', 'mze'],
  'moon': ['მთვარე', 'moon', 'mtvare'],
  'star': ['ვარსკვლავ', 'star', 'varskvlavi'],
  'water': ['წყალ', 'water', 'tsqali'],
  'fire': ['ცეცხლ', 'fire', 'tsetskhli'],
  'tree': ['ხე', 'tree', 'khe'],
  'flower': ['ყვავილ', 'flower', 'qvavili'],
  'mountain': ['მთა', 'mountain', 'mta'],
  'sea': ['ზღვა', 'sea', 'zghva'],
  'river': ['მდინარე', 'river', 'mdinare'],
  'book': ['წიგნ', 'book', 'tsigni'],
  'heart': ['გულ', 'heart', 'guli'],
  'clock': ['საათ', 'clock', 'saati'],
  'phone': ['ტელეფონ', 'phone', 'telefoni'],
  'car': ['მანქანა', 'car', 'mankana'],
  'house': ['სახლ', 'house', 'sakhli'],
  
  // Colors
  'red': ['წითელ', 'red', 'tsiteli'],
  'blue': ['ლურჯ', 'blue', 'lurji'],
  'green': ['მწვანე', 'green', 'mtsvane'],
  'yellow': ['ყვითელ', 'yellow', 'qviteli'],
  'black': ['შავ', 'black', 'shavi'],
  'white': ['თეთრ', 'white', 'tetri'],
  
  // Numbers
  'one': ['ერთ', 'one', 'erti'],
  'two': ['ორ', 'two', 'ori'],
  'three': ['სამ', 'three', 'sami'],
  'four': ['ოთხ', 'four', 'otkhi'],
  'five': ['ხუთ', 'five', 'khuti'],
};

export interface ValidationResult {
  isValid: boolean;
  warning?: string;
  severity: 'error' | 'warning' | 'ok';
}

/**
 * Transliterate Georgian text to Latin characters
 */
export function transliterateGeorgian(text: string): string {
  return text
    .split('')
    .map(char => GEORGIAN_TO_LATIN[char] || char)
    .join('');
}

/**
 * Calculate Levenshtein distance between two strings
 */
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

/**
 * Check if two strings are similar (Levenshtein distance < 3)
 */
function isSimilar(a: string, b: string): boolean {
  if (a.length < 3 || b.length < 3) return a === b;
  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);
  return distance <= Math.min(3, maxLength * 0.3);
}

/**
 * Validate that an icon keyword doesn't reveal the correct answer
 */
export function validateIconKeyword(
  keyword: string,
  correctAnswer: string,
  incorrectAnswers?: string[]
): ValidationResult {
  if (!keyword || !correctAnswer) {
    return { isValid: true, severity: 'ok' };
  }
  
  const normalizedKeyword = keyword.toLowerCase().trim();
  const normalizedAnswer = correctAnswer.toLowerCase().trim();
  const transliteratedAnswer = transliterateGeorgian(correctAnswer).toLowerCase().trim();
  
  // 1. Check semantic groups - most accurate check
  for (const [iconKey, answerVariants] of Object.entries(SEMANTIC_ANSWER_MATCHES)) {
    // Check if keyword contains this icon key
    if (normalizedKeyword.includes(iconKey) || iconKey.includes(normalizedKeyword)) {
      // Check if any variant matches the answer
      for (const variant of answerVariants) {
        const normalizedVariant = variant.toLowerCase();
        if (
          normalizedAnswer.includes(normalizedVariant) || 
          normalizedVariant.includes(normalizedAnswer.slice(0, 4)) ||
          transliteratedAnswer.includes(normalizedVariant) ||
          normalizedVariant.includes(transliteratedAnswer.slice(0, 4))
        ) {
          return {
            isValid: false,
            severity: 'error',
            warning: `❌ აიკონი "${keyword}" პირდაპირი მინიშნებაა პასუხზე "${correctAnswer}"!`
          };
        }
      }
    }
  }
  
  // 2. Direct transliteration match
  if (
    normalizedKeyword === transliteratedAnswer ||
    transliteratedAnswer.includes(normalizedKeyword) ||
    normalizedKeyword.includes(transliteratedAnswer)
  ) {
    return {
      isValid: false,
      severity: 'error',
      warning: `❌ აიკონი "${keyword}" ემთხვევა პასუხს "${correctAnswer}"!`
    };
  }
  
  // 3. Check similarity (fuzzy match)
  if (isSimilar(normalizedKeyword, transliteratedAnswer)) {
    return {
      isValid: false,
      severity: 'warning',
      warning: `⚠️ აიკონი "${keyword}" ძალიან ჰგავს პასუხს "${correctAnswer}".`
    };
  }
  
  // 4. Check if keyword is too similar to any word in the answer
  const answerWords = normalizedAnswer.split(/\s+/);
  const transliteratedWords = transliteratedAnswer.split(/\s+/);
  
  for (const word of [...answerWords, ...transliteratedWords]) {
    if (word.length >= 4 && normalizedKeyword.includes(word.slice(0, 4))) {
      return {
        isValid: false,
        severity: 'warning',
        warning: `⚠️ აიკონი "${keyword}" შეიძლება იყოს მინიშნება პასუხზე.`
      };
    }
  }
  
  return { isValid: true, severity: 'ok' };
}

/**
 * Filter out keywords that would reveal the answer
 */
export function filterSafeKeywords(
  keywords: string[],
  correctAnswer: string,
  incorrectAnswers?: string[]
): string[] {
  return keywords.filter(kw => {
    const validation = validateIconKeyword(kw, correctAnswer, incorrectAnswers);
    return validation.isValid;
  });
}
