
# Bulk Wikipedia Import Tool - Multi-Step Question Generator

## Overview

Build a new "Bulk Generator" tool that allows creating hundreds of image/text/audio questions at once by:
1. User specifies broad categories (e.g., "People", "Cities", "Countries", "Companies")
2. System generates Wikipedia page slugs for each category
3. System parses each page, extracts media and content
4. AI generates questions with contextually similar wrong answers
5. User reviews and bulk imports to selected category

---

## User Flow (4-Step Wizard)

```text
Step 1: Category Selection
┌─────────────────────────────────────────────────────────────────┐
│  Bulk Generator                                                 │
├─────────────────────────────────────────────────────────────────┤
│  აირჩიეთ თემატიკა:                                              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │ ადამიანები │ │ ქალაქები │ │ ქვეყნები │ │ კომპანიები │ │ სხვა     │   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │
│                                                                 │
│  ან ჩაწერეთ საკვანძო სიტყვები (მძიმით გამოყოფილი):             │
│  [Albert Einstein, Elon Musk, Leonardo da Vinci, Bill Gates...]│
│                                                                 │
│  კითხვის ტიპი:                                                  │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                   │
│  │ ტექსტი │ │ სურათი │ │ ვიდეო  │ │ აუდიო  │                   │
│  └────────┘ └────────┘ └────────┘ └────────┘                   │
│                                                                 │
│  [შემდეგი →]                                                    │
└─────────────────────────────────────────────────────────────────┘

Step 2: Topic Resolution (Wikipedia Slugs)
┌─────────────────────────────────────────────────────────────────┐
│  მოიძებნა 25 თემა                                               │
├─────────────────────────────────────────────────────────────────┤
│  ☑ Albert Einstein → Albert_Einstein (Wikipedia)               │
│  ☑ Elon Musk → Elon_Musk (Wikipedia)                            │
│  ☐ Leonardo → Leonardo_da_Vinci (disambiguation - skip?)       │
│  ☑ Bill Gates → Bill_Gates (Wikipedia)                          │
│  ...                                                            │
│                                                                 │
│  [← უკან]  [22 აირჩეული - სკანირება →]                          │
└─────────────────────────────────────────────────────────────────┘

Step 3: Content Parsing & Question Generation
┌─────────────────────────────────────────────────────────────────┐
│  მიმდინარეობს დამუშავება... (8/22)                              │
├─────────────────────────────────────────────────────────────────┤
│  ✓ Albert Einstein - სურათი მოიძებნა, კითხვა დაგენერირდა       │
│  ✓ Elon Musk - სურათი მოიძებნა, კითხვა დაგენერირდა             │
│  ⏳ Bill Gates - მიმდინარეობს...                                │
│  ○ Steve Jobs - მოლოდინში                                       │
│  ...                                                            │
│                                                                 │
│  [პროგრეს ბარი: ████████░░░░░░░░ 36%]                           │
└─────────────────────────────────────────────────────────────────┘

Step 4: Review & Import
┌─────────────────────────────────────────────────────────────────┐
│  22 კითხვა მზადაა                                               │
├─────────────────────────────────────────────────────────────────┤
│  ☑ [სურათი: Einstein] ვინ არის ეს?                             │
│    ✓ ალბერტ აინშტაინი                                          │
│    ✗ ნიკოლა ტესლა • მარი კიური • სტივენ ჰოკინგი               │
│                                                                 │
│  ☑ [სურათი: Musk] ვინ არის ეს?                                 │
│    ✓ ილონ მასკი                                                │
│    ✗ ჯეფ ბეზოსი • მარკ ცუკერბერგი • ბილ გეითსი                │
│  ...                                                            │
├─────────────────────────────────────────────────────────────────┤
│  კატეგორია: [ცნობილი ადამიანები ▼]                              │
│                                                                 │
│  [← უკან]  [ბიბლიოთეკაში დამატება (22)]                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technical Architecture

### New Edge Function: `bulk-resolve-wikipedia-topics`

Converts keywords to Wikipedia page slugs with validation:

```typescript
// Input
{
  keywords: ["Albert Einstein", "Elon Musk", "Bill Gates"],
  language: "en" // or "ka" for Georgian Wikipedia
}

// Output
{
  success: true,
  topics: [
    {
      keyword: "Albert Einstein",
      slug: "Albert_Einstein",
      wikiUrl: "https://en.wikipedia.org/wiki/Albert_Einstein",
      valid: true,
      title: "Albert Einstein"
    },
    {
      keyword: "Some Invalid Topic",
      slug: null,
      valid: false,
      error: "Page not found"
    }
  ]
}
```

**Implementation:**
- Use Wikipedia API to search/validate pages: `https://en.wikipedia.org/w/api.php?action=query&titles=Albert_Einstein&format=json`
- Return resolved slugs with validation status
- Handle disambiguation pages

### New Edge Function: `bulk-parse-wikipedia-pages`

Batch parse multiple Wikipedia pages:

```typescript
// Input
{
  pages: [
    { slug: "Albert_Einstein", language: "en" },
    { slug: "Elon_Musk", language: "en" }
  ],
  questionType: "image" // text | image | video | audio
}

// Output
{
  success: true,
  results: [
    {
      slug: "Albert_Einstein",
      title: "Albert Einstein",
      content: "...",
      imageUrl: "https://upload.wikimedia.org/...",
      success: true
    }
  ]
}
```

**Implementation:**
- Reuse existing `parse-wikipedia-media` logic
- Process in batches of 5 to avoid rate limits
- Use Firecrawl for content extraction

### New Edge Function: `bulk-generate-contextual-questions`

Generate questions with contextually similar wrong answers:

```typescript
// Input
{
  items: [
    {
      title: "Albert Einstein",
      content: "...",
      imageUrl: "...",
      category: "famous_people"
    },
    {
      title: "Elon Musk",
      content: "...",
      imageUrl: "...",
      category: "famous_people"
    }
  ],
  questionType: "image",
  language: "ka"
}

// Output
{
  success: true,
  questions: [
    {
      subject: "Albert Einstein",
      question_text: "ვინ არის ეს?",
      correct_answer: "ალბერტ აინშტაინი",
      incorrect_answers: ["ნიკოლა ტესლა", "მარი კიური", "სტივენ ჰოკინგი"],
      difficulty: "medium",
      image_url: "https://..."
    }
  ]
}
```

**Key AI Logic:**
- For each correct answer, find 3 contextually similar alternatives from the same batch
- For "People" category: other famous people from similar field
- For "Cities": other cities from same country/continent
- For "Countries": neighboring countries or similar size
- For "Companies": competitors or same industry

---

## Frontend Components

### New Files to Create

| File | Purpose |
|------|---------|
| `src/components/admin/studio/BulkGeneratorModal.tsx` | Main 4-step wizard modal |
| `src/components/admin/studio/BulkCategorySelector.tsx` | Preset category cards + custom input |
| `src/components/admin/studio/BulkTopicResolver.tsx` | Step 2: Topic validation UI |
| `src/components/admin/studio/BulkProcessingStatus.tsx` | Step 3: Progress tracking |
| `src/components/admin/studio/BulkQuestionReview.tsx` | Step 4: Review & select questions |
| `supabase/functions/bulk-resolve-wikipedia-topics/index.ts` | Topic → Wikipedia slug resolution |
| `supabase/functions/bulk-parse-wikipedia-pages/index.ts` | Batch page parsing |
| `supabase/functions/bulk-generate-contextual-questions/index.ts` | AI question generation with context |

### Modify Existing Files

| File | Changes |
|------|---------|
| `src/pages/admin/QuestionStudio.tsx` | Add "Bulk Generator" button, integrate modal |

---

## Preset Categories with Sample Keywords

Pre-built category templates for quick selection:

```typescript
const PRESET_CATEGORIES = {
  people: {
    label: "ადამიანები",
    icon: "users",
    keywords: [
      // Scientists
      "Albert Einstein", "Isaac Newton", "Marie Curie", "Nikola Tesla",
      // Tech Leaders
      "Elon Musk", "Bill Gates", "Steve Jobs", "Jeff Bezos", "Mark Zuckerberg",
      // Artists
      "Leonardo da Vinci", "Pablo Picasso", "Vincent van Gogh",
      // Musicians
      "Mozart", "Beethoven", "Michael Jackson", "Freddie Mercury",
      // Leaders
      "Napoleon Bonaparte", "Winston Churchill", "Mahatma Gandhi",
      // Athletes
      "Lionel Messi", "Cristiano Ronaldo", "Michael Jordan",
      // ... 50+ more
    ]
  },
  cities: {
    label: "ქალაქები",
    icon: "building-2",
    keywords: [
      "Paris", "London", "New York City", "Tokyo", "Rome", "Barcelona",
      "Sydney", "Dubai", "Singapore", "Berlin", "Amsterdam", "Vienna",
      // ... 50+ more
    ]
  },
  countries: {
    label: "ქვეყნები",
    icon: "flag",
    keywords: [
      // By continent, include flag references
      "France", "Germany", "Italy", "Spain", "United Kingdom",
      "United States", "Canada", "Brazil", "Argentina",
      "Japan", "China", "India", "Australia",
      // ... all 195 countries
    ]
  },
  companies: {
    label: "კომპანიები",
    icon: "briefcase",
    keywords: [
      "Apple", "Google", "Microsoft", "Amazon", "Tesla", "Netflix",
      "Coca-Cola", "McDonald's", "Nike", "Mercedes-Benz", "BMW",
      // ... 50+ more
    ]
  },
  landmarks: {
    label: "ღირსშესანიშნაობები",
    icon: "landmark",
    keywords: [
      "Eiffel Tower", "Statue of Liberty", "Colosseum", "Taj Mahal",
      "Great Wall of China", "Machu Picchu", "Petra", "Christ the Redeemer",
      // ... 50+ more
    ]
  }
};
```

---

## Contextual Wrong Answer Generation

The key innovation is generating **contextually similar** wrong answers that make questions challenging:

### Strategy by Category

| Category | Correct Answer | Wrong Answer Strategy |
|----------|---------------|----------------------|
| People (Scientists) | Albert Einstein | Other famous scientists: Newton, Tesla, Curie |
| People (Tech) | Elon Musk | Other tech CEOs: Bezos, Gates, Zuckerberg |
| Cities (Europe) | Paris | Other European capitals: London, Berlin, Rome |
| Countries (South America) | Brazil | Other SA countries: Argentina, Colombia, Peru |
| Companies (Tech) | Apple | Other tech giants: Google, Microsoft, Amazon |
| Landmarks (Ancient) | Colosseum | Other ancient wonders: Parthenon, Pyramids |

### AI Prompt for Contextual Answers

```text
Given this list of subjects from the same category:
- Albert Einstein (Scientist)
- Isaac Newton (Scientist)
- Marie Curie (Scientist)
- Nikola Tesla (Scientist)
- Galileo Galilei (Scientist)

For each subject, create a trivia question where:
1. The correct answer is the subject's name (in Georgian)
2. The 3 wrong answers are OTHER subjects from this same list
3. All 4 answers should be similarly famous/recognizable
4. Wrong answers should be from the same "sub-category" if possible

This makes questions challenging because all answers are plausible.
```

---

## Processing Pipeline

### Batch Processing with Progress

```typescript
async function processTopicsInBatches(topics: Topic[], questionType: QuestionType) {
  const BATCH_SIZE = 5;
  const results: ProcessedQuestion[] = [];
  
  for (let i = 0; i < topics.length; i += BATCH_SIZE) {
    const batch = topics.slice(i, i + BATCH_SIZE);
    
    // Parse Wikipedia pages in parallel
    const parsed = await Promise.all(
      batch.map(t => supabase.functions.invoke('parse-wikipedia-media', {
        body: { url: t.wikiUrl, questionType }
      }))
    );
    
    // Update progress
    onProgress((i + BATCH_SIZE) / topics.length);
    
    // Collect successful parses
    results.push(...parsed.filter(p => p.success));
    
    // Rate limit delay
    await sleep(500);
  }
  
  // Generate questions with contextual wrong answers
  const questions = await supabase.functions.invoke('bulk-generate-contextual-questions', {
    body: { items: results, questionType, language: 'ka' }
  });
  
  return questions;
}
```

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| Wikipedia page not found | Mark as invalid, skip in processing |
| No image found for image question | Skip or fallback to text question |
| Rate limit from Firecrawl | Implement exponential backoff |
| AI generation fails | Retry up to 3 times, then skip |
| Partial batch failure | Continue with successful items, report failures |

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/admin/studio/BulkGeneratorModal.tsx` | Main wizard component |
| `src/components/admin/studio/bulk/StepCategorySelect.tsx` | Step 1: Category & keyword input |
| `src/components/admin/studio/bulk/StepTopicValidation.tsx` | Step 2: Wikipedia validation |
| `src/components/admin/studio/bulk/StepProcessing.tsx` | Step 3: Progress UI |
| `src/components/admin/studio/bulk/StepReview.tsx` | Step 4: Review & import |
| `src/components/admin/studio/bulk/PresetCategories.ts` | Preset keyword lists |
| `supabase/functions/bulk-resolve-topics/index.ts` | Wikipedia slug resolution |
| `supabase/functions/bulk-generate-contextual-questions/index.ts` | Contextual Q&A generation |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/admin/QuestionStudio.tsx` | Add "Bulk Generator" button |
| `supabase/config.toml` | Register new edge functions |

---

## Summary

This Bulk Generator enables creating 100+ questions at once by:
1. **Preset Categories** - Quick select from People, Cities, Countries, Companies, Landmarks
2. **Custom Keywords** - Or paste your own list of topics
3. **Wikipedia Resolution** - Validate and convert to Wikipedia page slugs
4. **Batch Processing** - Parse pages and extract media in parallel
5. **Contextual AI** - Generate questions with smart, related wrong answers
6. **Bulk Import** - Review and add all to library at once

The contextually similar wrong answers make questions challenging and educational, not just random guessing.
