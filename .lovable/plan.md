
# გეგმა: ჭკვიანი ძიების გაუმჯობესება - Typo Tolerance & Fuzzy Matching

## მიმოხილვა

აიკონების ძიება უკვე აქვს ძლიერი ფუნდამენტი:
- ქართულ-ინგლისური ბილინგვალური ძიება
- ფონეტიკური ვარიანტების გენერაცია
- Levenshtein distance ფუნქცია
- კონტექსტური პატერნების ამოცნობა

ახლა გავაძლიეროთ **typo tolerance** და **fuzzy matching** უფრო დაბალი threshold-ებით.

---

## ცვლილებები

### ფაილი 1: `supabase/functions/smart-icon-search/index.ts`

#### 1.1 Fuzzy Match Threshold-ის დაწევა

**ახლანდელი კოდი (ხაზი 946-954):**
```typescript
function isSimilar(a: string, b: string, threshold = 2): boolean {
  // ...
  const dynamicThreshold = Math.min(threshold, Math.floor(Math.min(a.length, b.length) / 3));
  return levenshteinDistance(aLower, bLower) <= Math.max(1, dynamicThreshold);
}
```

**ახალი კოდი:**
```typescript
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
```

#### 1.2 ახალი Fuzzy Search ფუნქცია - Trigram Similarity

დავამატოთ trigram-based similarity რომელიც უკეთესად აღიქვამს typo-ებს:

```typescript
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

// Check if strings are similar using multiple methods
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
```

#### 1.3 Common Typos Dictionary

```typescript
// Common typos and misspellings
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
};
```

#### 1.4 ძიების ლოგიკაში Fuzzy Matching-ის გაძლიერება

**ხაზი 1057-1070** (Latin query processing) განახლება:

```typescript
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
```

#### 1.5 Database Query-ში Fuzzy Matching დამატება

**ხაზი 1282-1286** - სკორინგში fuzzy bonus გაზრდა:

```typescript
// Enhanced fuzzy match bonus in scoring
const slugFuzzy = isFuzzyMatch(slug, termLower);
const titleFuzzy = isFuzzyMatch(title, termLower);

if (slugFuzzy.match) {
  score += Math.floor(slugFuzzy.score * 0.4); // Up to 40 points for fuzzy slug match
}
if (titleFuzzy.match) {
  score += Math.floor(titleFuzzy.score * 0.3); // Up to 30 points for fuzzy title match
}
```

---

### ფაილი 2: `src/utils/transliteration.ts`

#### 2.1 Fuzzy Match Utility Frontend-სთვის

```typescript
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
```

#### 2.2 buildBilingualSearchTerms-ის გაუმჯობესება

```typescript
// Add fuzzy variants for common typos
const TYPO_CORRECTIONS: Record<string, string> = {
  'cata': 'kata', 'katta': 'kata', 'kataa': 'kata',
  'dogg': 'dog', 'dgo': 'dog',
  'brid': 'bird', 'bidr': 'bird',
  'fich': 'fish', 'fissh': 'fish',
  'loin': 'lion', 'lioon': 'lion',
  'musci': 'music', 'muisc': 'music',
  'moive': 'movie', 'movei': 'movie',
  'pohne': 'phone', 'phoen': 'phone',
};

export function buildBilingualSearchTerms(input: string): string[] {
  if (!input || input.trim().length === 0) return [];
  
  const terms: string[] = [];
  const normalized = input.trim().toLowerCase();
  terms.push(normalized);
  
  // Apply typo corrections
  const corrected = TYPO_CORRECTIONS[normalized];
  if (corrected) {
    terms.push(corrected);
  }
  
  // ... existing bilingual logic ...
  
  return [...new Set(terms)].filter(t => t.length >= 2);
}
```

---

## ახალი ფუნქციონალი - შედეგი

| ძიება | ახლანდელი | განახლებული |
|-------|-----------|-------------|
| "cata" (typo for kata/cat) | ❌ ვერ პოულობს | ✅ პოულობს კატას |
| "katta" (double t typo) | ❌ ვერ პოულობს | ✅ პოულობს კატას |
| "musci" (typo for music) | ❌ ვერ პოულობს | ✅ პოულობს მუსიკას |
| "loin" (typo for lion) | ❌ ვერ პოულობს | ✅ პოულობს ლომს |
| "fexburt" (typo) | ❌ ვერ პოულობს | ✅ პოულობს ფეხბურთს |
| "dzagl" (partial word) | ⚠️ შეზღუდული | ✅ სრული ძაღლის შედეგები |

## ტექნიკური დეტალები

### Fuzzy Matching Algorithms:
1. **Levenshtein Distance** - edit distance ტექსტებს შორის
2. **Trigram Similarity** - 3-გრამებით მსგავსების გამოთვლა
3. **Prefix/Suffix Matching** - პრეფიქსური შესატყვისობა
4. **Common Typos Dictionary** - ხშირი შეცდომების ლექსიკონი

### Thresholds:
- **Exact match**: 100 ქულა
- **Prefix match**: 85 ქულა
- **Contains match**: 70 ქულა
- **Fuzzy match threshold**: 50 ქულა (წინა 60-დან)
- **Levenshtein tolerance**: 1-3 სიმბოლო (სიგრძის მიხედვით)

### Performance:
- Trigram მხოლოდ 3+ სიმბოლოიან სტრინგებზე
- ვარიანტების ლიმიტი: მაქს 16
- მეხსიერების ოპტიმიზაცია Set-ების გამოყენებით

