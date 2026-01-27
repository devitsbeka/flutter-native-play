
# Bulk Generator Redesign: Category-First Flow with AI Suggestions

## Overview

Redesign the Bulk Generator wizard to:
1. **Select Target Category FIRST** - User picks the database category where questions will be imported
2. **AI Topic Suggestions** - Show 6 AI-generated topic suggestions based on selected category
3. **Custom Subject Input with Chips** - Enter subjects one by one (Enter to add), displayed as removable chips
4. **Text & Image Only** - Remove video and audio options
5. **Dynamic Question Text** - Question phrasing adapts based on theme + type

---

## New Workflow (3 Steps Instead of 4)

```text
Step 1: Setup (Category + Topics + Type)
┌─────────────────────────────────────────────────────────────────┐
│  Bulk Generator  ნაბიჯი 1/3                                    │
├─────────────────────────────────────────────────────────────────┤
│  კატეგორია:                                                     │
│  [აირჩიეთ კატეგორია ▼]                                          │
│                                                                 │
│  AI რეკომენდაციები: (based on selected category)               │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                           │
│  │ Einstein │ │ Newton  │ │ Tesla   │                           │
│  └─────────┘ └─────────┘ └─────────┘                           │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                           │
│  │ Curie   │ │ Hawking │ │ Darwin  │                           │
│  └─────────┘ └─────────┘ └─────────┘                           │
│                                                                 │
│  დაამატეთ თემები:                                               │
│  ┌─────────────────────────────────────┐                       │
│  │ Bill Gates × │ Steve Jobs × │ ___  │                        │
│  └─────────────────────────────────────┘                       │
│                                                                 │
│  კითხვის ტიპი:                                                  │
│  ┌────────┐ ┌────────┐                                         │
│  │ ტექსტი │ │ სურათი │ (only 2 options now)                    │
│  └────────┘ └────────┘                                         │
│                                                                 │
│  [შემდეგი →]                                                    │
└─────────────────────────────────────────────────────────────────┘

Step 2: Processing (same as before, but skip validation)

Step 3: Review & Import (category already selected in Step 1)
```

---

## Key Changes

### 1. StepCategorySelect.tsx - Complete Redesign

**New Props:**
```typescript
interface StepCategorySelectProps {
  // Database categories (for import target)
  categories: CategoryWithCounts[];
  selectedCategoryId: string;
  onCategoryChange: (categoryId: string) => void;
  
  // Topics (subjects to generate questions for)
  subjects: string[];
  onSubjectsChange: (subjects: string[]) => void;
  
  // Question type (text or image only)
  questionType: 'text' | 'image';
  onQuestionTypeChange: (type: 'text' | 'image') => void;
  
  onNext: () => void;
}
```

**New Features:**
- **Category Dropdown** - Select from database categories first
- **AI Suggestions** - 6 topic chips based on category (using preset keywords from PRESET_CATEGORIES)
- **Chip Input** - Type subject, press Enter to add as chip. Each chip has X to remove
- **Only Text/Image** - Remove video and audio buttons

### 2. Dynamic Question Text by Category + Type

Add a mapping function to generate appropriate question phrasing:

```typescript
function getQuestionTextForTheme(
  themeType: 'people' | 'cities' | 'countries' | 'companies' | 'landmarks' | 'animals' | 'generic',
  questionType: 'text' | 'image',
  language: 'ka' | 'en'
): string {
  const templates = {
    people: {
      image: { ka: 'ვინ არის ეს?', en: 'Who is this?' },
      text: { ka: 'ვინ არის?', en: 'Who is?' }
    },
    cities: {
      image: { ka: 'რომელი ქალაქია?', en: 'What city is this?' },
      text: { ka: 'რომელი ქალაქია?', en: 'What city is this?' }
    },
    countries: {
      image: { ka: 'რომელი ქვეყანაა?', en: 'What country is this?' },
      text: { ka: 'რომელი ქვეყანაა?', en: 'What country is this?' }
    },
    companies: {
      image: { ka: 'რომელი კომპანიაა?', en: 'What company is this?' },
      text: { ka: 'რომელი კომპანიაა?', en: 'What company is this?' }
    },
    landmarks: {
      image: { ka: 'რომელი ღირსშესანიშნაობაა?', en: 'What landmark is this?' },
      text: { ka: 'რომელი ღირსშესანიშნაობაა?', en: 'What landmark is this?' }
    },
    animals: {
      image: { ka: 'რომელი ცხოველია?', en: 'What animal is this?' },
      text: { ka: 'რომელი ცხოველია?', en: 'What animal is this?' }
    },
    generic: {
      image: { ka: 'რა არის ეს?', en: 'What is this?' },
      text: { ka: 'დაასახელეთ:', en: 'Name:' }
    }
  };
  
  return templates[themeType]?.[questionType]?.[language] || templates.generic[questionType][language];
}
```

### 3. AI Suggestions Logic

When a user selects a category, show 6 random relevant suggestions:

```typescript
function getSuggestionsForCategory(categoryName: string): string[] {
  // Match category name to preset themes
  const lowerName = categoryName.toLowerCase();
  
  if (lowerName.includes('ადამიან') || lowerName.includes('people') || lowerName.includes('person')) {
    return getRandomFromList(PRESET_CATEGORIES.find(c => c.id === 'people')?.keywords || [], 6);
  }
  if (lowerName.includes('ქალაქ') || lowerName.includes('city') || lowerName.includes('cities')) {
    return getRandomFromList(PRESET_CATEGORIES.find(c => c.id === 'cities')?.keywords || [], 6);
  }
  // ... similar for countries, companies, landmarks, animals
  
  // Generic fallback - mix from all categories
  return getRandomFromList(allKeywords, 6);
}
```

### 4. BulkGeneratorModal.tsx Changes

- Pass `selectedCategoryId` from step 1 to step 3 (no category selection needed in review)
- Track `selectedThemeType` for dynamic question text
- Remove video/audio from QuestionType
- Skip validation step (go directly from select → process)

### 5. bulk-generate-contextual-questions Edge Function Update

- Accept `themeType` parameter
- Use dynamic question text based on theme + type
- Pass theme context to AI for better wrong answer generation

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/admin/studio/bulk/StepCategorySelect.tsx` | Complete redesign with category dropdown, AI suggestions, chip input |
| `src/components/admin/studio/BulkGeneratorModal.tsx` | New state management, skip validation step, pass category early |
| `src/components/admin/studio/bulk/StepReview.tsx` | Remove category selection (already chosen in step 1) |
| `src/components/admin/studio/bulk/PresetCategories.ts` | Add theme detection helper functions |
| `supabase/functions/bulk-generate-contextual-questions/index.ts` | Accept themeType, use dynamic question text |

---

## Detailed Component Changes

### StepCategorySelect.tsx - New UI Structure

```tsx
<div className="space-y-6">
  {/* 1. Category Selection (First!) */}
  <div className="space-y-3">
    <Label>კატეგორია</Label>
    <Select value={selectedCategoryId} onValueChange={onCategoryChange}>
      <SelectTrigger>
        <SelectValue placeholder="აირჩიეთ კატეგორია" />
      </SelectTrigger>
      <SelectContent>
        {categories.map(cat => (
          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>

  {/* 2. AI Suggestions (6 clickable chips) */}
  {selectedCategoryId && (
    <div className="space-y-3">
      <Label>AI რეკომენდაციები</Label>
      <div className="flex flex-wrap gap-2">
        {suggestions.map(suggestion => (
          <button
            key={suggestion}
            onClick={() => addSubject(suggestion)}
            disabled={subjects.includes(suggestion)}
            className="px-3 py-1.5 rounded-full border text-sm hover:bg-primary/10"
          >
            + {suggestion}
          </button>
        ))}
      </div>
    </div>
  )}

  {/* 3. Custom Subject Input with Chips */}
  <div className="space-y-3">
    <Label>დაამატეთ თემები</Label>
    <div className="border rounded-lg p-3 flex flex-wrap gap-2 min-h-[60px]">
      {subjects.map(subject => (
        <span key={subject} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-sm">
          {subject}
          <button onClick={() => removeSubject(subject)}>
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && inputValue.trim()) {
            addSubject(inputValue.trim());
            setInputValue('');
          }
        }}
        placeholder="ჩაწერეთ და დააჭირეთ Enter..."
        className="flex-1 min-w-[120px] bg-transparent outline-none text-sm"
      />
    </div>
    <p className="text-xs text-muted-foreground">{subjects.length} თემა დამატებულია</p>
  </div>

  {/* 4. Question Type (Text or Image only) */}
  <div className="space-y-3">
    <Label>კითხვის ტიპი</Label>
    <div className="grid grid-cols-2 gap-3">
      <button onClick={() => onQuestionTypeChange('text')} className={...}>
        <FileText /> ტექსტი
      </button>
      <button onClick={() => onQuestionTypeChange('image')} className={...}>
        <Image /> სურათი
      </button>
    </div>
  </div>

  {/* Footer */}
  <div className="flex justify-between pt-4 border-t">
    <span className="text-sm text-muted-foreground">
      სულ: {subjects.length} თემა
    </span>
    <Button onClick={onNext} disabled={!selectedCategoryId || subjects.length === 0}>
      შემდეგი →
    </Button>
  </div>
</div>
```

---

## Theme Detection Logic (PresetCategories.ts)

Add helper to detect theme from category name:

```typescript
export type ThemeType = 'people' | 'cities' | 'countries' | 'companies' | 'landmarks' | 'animals' | 'generic';

export function detectThemeFromCategoryName(categoryName: string): ThemeType {
  const name = categoryName.toLowerCase();
  
  // Georgian and English keywords for each theme
  const themeKeywords: Record<ThemeType, string[]> = {
    people: ['ადამიან', 'person', 'people', 'ცნობილ', 'famous', 'მეცნიერ', 'scientist', 'მსახიობ', 'actor'],
    cities: ['ქალაქ', 'city', 'cities', 'urban'],
    countries: ['ქვეყან', 'country', 'countries', 'nation', 'დროშ', 'flag'],
    companies: ['კომპანი', 'company', 'companies', 'brand', 'ბრენდ', 'ლოგო', 'logo'],
    landmarks: ['ღირსშესანიშნაობ', 'landmark', 'monument', 'ძეგლ', 'არქიტექტურ'],
    animals: ['ცხოველ', 'animal', 'ფრინველ', 'bird', 'თევზ', 'fish'],
    generic: []
  };
  
  for (const [theme, keywords] of Object.entries(themeKeywords)) {
    if (keywords.some(kw => name.includes(kw))) {
      return theme as ThemeType;
    }
  }
  
  return 'generic';
}

export function getQuestionText(theme: ThemeType, questionType: 'text' | 'image'): string {
  const templates: Record<ThemeType, Record<'text' | 'image', string>> = {
    people: { image: 'ვინ არის ეს?', text: 'ვინ არის?' },
    cities: { image: 'რომელი ქალაქია?', text: 'რომელი ქალაქია?' },
    countries: { image: 'რომელი ქვეყანაა?', text: 'რომელი ქვეყანაა?' },
    companies: { image: 'რომელი კომპანიაა?', text: 'რომელი კომპანიაა?' },
    landmarks: { image: 'რომელი ღირსშესანიშნაობაა?', text: 'რომელი ადგილია?' },
    animals: { image: 'რომელი ცხოველია?', text: 'რომელი ცხოველია?' },
    generic: { image: 'რა არის ეს?', text: 'დაასახელეთ:' }
  };
  
  return templates[theme][questionType];
}
```

---

## Edge Function Update

Modify `bulk-generate-contextual-questions` to accept theme:

```typescript
// New input
{
  items: [...],
  questionType: "image",
  themeType: "people",  // NEW
  language: "ka"
}

// Use themeType in prompt
const questionPrompt = getQuestionText(themeType, questionType);
```

---

## Summary of Changes

1. **Category First** - User selects target database category at the beginning
2. **AI Suggestions** - 6 relevant topic suggestions based on category name matching
3. **Chip Input** - Type subject → Enter → adds chip with X to remove
4. **Text/Image Only** - Remove video and audio buttons
5. **Dynamic Questions** - Question text adapts based on theme (people → "ვინ არის ეს?", cities → "რომელი ქალაქია?", etc.)
6. **Skip Validation Step** - Go directly from selection to processing
7. **No Category in Review** - Category is already selected in step 1, so review step is simpler

