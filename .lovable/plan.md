

# ორენოვანი ძებნის სისტემა (Bilingual Search)

## მიმოხილვა

მომხმარებელმა შეძლოს ზვიგენი, zvigeni, სჰარკ, shark - ნებისმიერი ამ ვარიანტით მოძებნოს და მიიღოს ერთნაირი შედეგები.

---

## არსებული ინფრასტრუქტურა

აპლიკაციაში უკვე არსებობს ნაწილობრივი ორენოვანი ძებნის მხარდაჭერა:

| კომპონენტი | ფუნქცია | ორენოვანი მხარდაჭერა |
|------------|---------|----------------------|
| `src/utils/transliteration.ts` | Latin→Georgian transliteration + სემანტიკური მაპინგი | English→Georgian მხოლოდ |
| `smart-icon-search` edge function | აიკონების ძებნა | Georgian→English სრული |
| `iconAnswerValidation.ts` | პასუხის ვალიდაცია | ორმხრივი მაპინგი |
| `QuestionIconPicker.tsx` | აიკონების არჩევა | იყენებს smart-icon-search |
| `FlowIconPicker.tsx` | ადმინ აიკონების არჩევა | მხოლოდ .ilike() ძებნა |

---

## პრობლემა

1. **FlowIconPicker** და სხვა კომპონენტები იყენებენ მარტივ `.ilike()` ძებნას:
```typescript
.or(`title.ilike.%${searchQuery}%,slug.ilike.%${searchQuery}%,tags.cs.{${searchQuery}}`)
```

2. **icon_library** ცხრილი შეიცავს მხოლოდ ინგლისურ tags-ებს:
```
slug: "shark", title: "Shark", tags: ["animal", "ocean", "predator"]
```
არ არის Georgian tags: "ზვიგენი", "zvigeni"

3. **transliteration.ts** არ მხარს უჭერს Georgian→English მიმართულებას (მხოლოდ English→Georgian)

---

## გადაწყვეტა: ცენტრალიზებული ორენოვანი ძებნის უტილიტი

### 1. გაფართოებული transliteration.ts

დაემატება:
- `GEORGIAN_TO_LATIN` მაპი (უკუ transliteration)
- `GEORGIAN_TO_ENGLISH` სემანტიკური მაპი 
- `buildBilingualSearchTerms()` ფუნქცია რომელიც:
  - ზვიგენი → ["ზვიგენი", "zvigeni", "shark"]
  - shark → ["shark", "შარკ", "ზვიგენი"]
  - zvigeni → ["zvigeni", "ზვიგენი", "shark"]

```text
+-------------------+
|  მომხმარებლის     |
|  შეყვანა          |
+--------+----------+
         |
         v
+--------+----------+
| buildBilingual-   |
| SearchTerms()     |
+--------+----------+
         |
         v
+--------+----------+-------+--------+
| ორიგინალი | ტრანსლიტ. | სემანტიკ. |
| "ზვიგენი" | "zvigeni" | "shark"   |
+-----------+-----------+-----------+
```

### 2. კომპონენტების განახლება

| კომპონენტი | ცვლილება |
|------------|----------|
| `FlowIconPicker.tsx` | buildBilingualSearchTerms()-ის გამოყენება .or() query-სთვის |
| `CategorySelectorModal.tsx` | კატეგორიების ფილტრაციისთვის ორენოვანი matching |
| `FeedFiltersBar.tsx` + related | თუ საჭიროა - content search-ში |

### 3. smart-icon-search გაფართოება

Edge function უკვე კარგად მუშაობს Georgian→English-ზე. დაემატება:
- English→Georgian სემანტიკური lookup (shark → ზვიგენი)
- რათა ინგლისურით ძებნისას Georgian keywords-ც აღმოაჩინოს

---

## ტექნიკური ცვლილებები

### ფაილი 1: `src/utils/transliteration.ts`

**დაემატება:**

```typescript
// Georgian to Latin phonetic map (reverse)
const GEORGIAN_TO_LATIN: Record<string, string> = {
  'ა': 'a', 'ბ': 'b', 'გ': 'g', 'დ': 'd', 'ე': 'e',
  // ... სრული მაპი
};

// Georgian to English semantic map
const GEORGIAN_TO_ENGLISH: Record<string, string[]> = {
  'ზვიგენ': ['shark', 'fish'],
  'ვეშაპ': ['whale'],
  'დელფინ': ['dolphin'],
  // ... 100+ სიტყვა (გადმოყვანა smart-icon-search-დან)
};

// Transliterate Georgian to Latin
export function transliterateGeorgian(text: string): string;

// Check if text is Georgian
export function isGeorgianScript(text: string): boolean;

// Build bilingual search terms (main function)
export function buildBilingualSearchTerms(input: string): string[];
```

**buildBilingualSearchTerms ლოგიკა:**

```typescript
export function buildBilingualSearchTerms(input: string): string[] {
  const terms: string[] = [input.toLowerCase().trim()];
  
  if (isGeorgianScript(input)) {
    // Georgian input
    // 1. Transliterate to Latin: ზვიგენი → zvigeni
    terms.push(transliterateGeorgian(input));
    
    // 2. Get English semantic: ზვიგენი → shark
    const englishWords = getEnglishEquivalents(input);
    terms.push(...englishWords);
  } else if (isLatinScript(input)) {
    // Latin/English input
    // 1. Transliterate to Georgian: zvigeni → ზვიგენი
    terms.push(transliterateLatin(input));
    
    // 2. Get Georgian semantic: shark → ზვიგენი
    const georgianWords = getGeorgianEquivalents(input);
    terms.push(...georgianWords);
  }
  
  return [...new Set(terms)].filter(t => t.length >= 2);
}
```

### ფაილი 2: `src/components/admin/flow/FlowIconPicker.tsx`

**ცვლილება searchIcons ფუნქციაში:**

```typescript
import { buildBilingualSearchTerms } from '@/utils/transliteration';

const searchIcons = async () => {
  // Build all search terms from user input
  const searchTerms = buildBilingualSearchTerms(searchQuery);
  
  // Build OR conditions for all terms
  const orConditions = searchTerms.flatMap(term => [
    `title.ilike.%${term}%`,
    `slug.ilike.%${term}%`,
    `tags.cs.{${term}}`
  ]).join(',');
  
  const { data, error } = await supabase
    .from('icon_library')
    .select('id, slug, title, icon_url')
    .or(orConditions)
    .limit(50);
  
  // Score and sort results...
};
```

### ფაილი 3: `src/components/team/CategorySelectorModal.tsx`

**ცვლილება filteredCategories-ში:**

```typescript
import { buildBilingualSearchTerms } from '@/utils/transliteration';

const filteredCategories = useMemo(() => {
  if (!searchQuery.trim()) return categories;
  
  const searchTerms = buildBilingualSearchTerms(searchQuery);
  
  return categories.filter((cat) => {
    const catName = cat.name.toLowerCase();
    return searchTerms.some(term => catName.includes(term));
  });
}, [categories, searchQuery]);
```

### ფაილი 4: `supabase/functions/smart-icon-search/index.ts`

**დაემატება ENGLISH_TO_GEORGIAN მაპი:**

```typescript
const ENGLISH_TO_GEORGIAN: Record<string, string[]> = {
  'shark': ['ზვიგენ', 'ზვიგენი'],
  'whale': ['ვეშაპ', 'ვეშაპი'],
  'dolphin': ['დელფინ', 'დელფინი'],
  // ... reverse mapping
};
```

---

## შესაცვლელი ფაილები

| ფაილი | ცვლილება |
|-------|----------|
| `src/utils/transliteration.ts` | GEORGIAN_TO_LATIN, GEORGIAN_TO_ENGLISH, buildBilingualSearchTerms() |
| `src/components/admin/flow/FlowIconPicker.tsx` | ორენოვანი search terms-ის გენერაცია |
| `src/components/team/CategorySelectorModal.tsx` | ორენოვანი ფილტრაცია |
| `supabase/functions/smart-icon-search/index.ts` | ENGLISH_TO_GEORGIAN დამატება |

---

## შედეგი

| ძებნის input | მოიძებნება |
|--------------|------------|
| ზვიგენი | shark, zvigeni-დან |
| zvigeni | shark, ზვიგენი-დან |
| სჰარკ | shark (transliteration) |
| shark | shark, ზვიგენი, შარკ |

---

## ტესტირება

ძებნის ტესტები:
1. აიკონების ძებნა (QuestionIconPicker) - "ზვიგენი" → shark icons
2. ადმინ აიკონების ძებნა (FlowIconPicker) - "shark" → მოძებნის shark-ს
3. კატეგორიების ძებნა - "sports" → სპორტი კატეგორია

