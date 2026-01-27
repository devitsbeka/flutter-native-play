
# Smarter AI Suggestions: Category-Specific Person/Place/Item Recommendations

## Problem Analysis

The current suggestions are **abstract topic themes** (like "Famous Athletes", "Sports Equipment") that aren't directly usable for Wikipedia lookups. What you actually need is:

| Category | Suggestions Should Be | Question Format |
|----------|----------------------|-----------------|
| **Sports** | Specific sportspeople names | "ვინ არის ეს ფეხბურთელი?", "ვინ არის ეს კალათბურთელი?" |
| **Geography** | Cities, flags, landmarks | "რომელი ქალაქია?", "რომელი ქვეყნის დროშაა?" |
| **Art** | Painters, paintings, sculptors | "ვინ დახატა?", "ვინ არის ეს მხატვარი?" |
| **History** | Historical figures | "ვინ არის ეს ისტორიული პიროვნება?" |
| **Science** | Scientists, inventions | "ვინ არის ეს მეცნიერი?" |

## Solution Architecture

### 1. Category-Aware Prompt System

Update the edge function to detect the category type and generate **specific, searchable names**:

```text
Category: "სპორტი" (Sports)
┌─────────────────────────────────────────────────────────────────┐
│  AI რეკომენდაციები  [↻]                                         │
│  ┌────────────────┐ ┌────────────────┐ ┌──────────────────────┐  │
│  │ + Lionel Messi │ │ + Michael Jordan│ │ + Serena Williams   │  │
│  └────────────────┘ └────────────────┘ └──────────────────────┘  │
│  ┌─────────────────┐ ┌──────────────────┐ ┌────────────────────┐ │
│  │ + Usain Bolt    │ │ + Cristiano Ronaldo│ │ + LeBron James   │ │
│  └─────────────────┘ └──────────────────┘ └────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

Preview: "ვინ არის ეს სპორტსმენი?" → Image of athlete → 4 athlete options
```

### 2. Category Type Detection

Create a mapping system that detects the category's primary subject type:

| Category Keywords | Subject Type | Question Template |
|-------------------|--------------|-------------------|
| sport, athlete, football | `athletes` | "ვინ არის ეს სპორტსმენი?" |
| geography, city, country | `places` | "რომელი ქალაქია?" / "რომელი ქვეყანაა?" |
| art, painting, museum | `artworks` | "ვინ დახატა?" / "ვინ არის ეს მხატვარი?" |
| history, war, revolution | `historical_figures` | "ვინ არის ეს ისტორიული პიროვნება?" |
| science, physics, chemistry | `scientists` | "ვინ არის ეს მეცნიერი?" |
| music, singer, composer | `musicians` | "ვინ არის ეს მუსიკოსი?" |
| cinema, actor, director | `entertainers` | "ვინ არის ეს მსახიობი?" |

### 3. Dynamic Question Text

The question format should adapt based on:
- **Category type** (sports → athletes, geography → places)
- **Specific subtopic** within category (footballers vs tennis players)

## Technical Changes

### File 1: `supabase/functions/generate-topic-suggestions/index.ts`

Complete rewrite with smart category detection:

```typescript
// Category type definitions
type CategoryType = 'athletes' | 'places' | 'artworks' | 'historical' | 'scientists' | 'musicians' | 'entertainers' | 'generic';

// Detect category type from name
function detectCategoryType(categoryName: string): CategoryType {
  const name = categoryName.toLowerCase();
  
  if (/sport|athlete|football|basketball|tennis|olympic/.test(name)) return 'athletes';
  if (/geography|city|country|capital|flag|landmark/.test(name)) return 'places';
  if (/art|paint|sculpt|museum|gallery/.test(name)) return 'artworks';
  if (/history|war|revolution|ancient|medieval/.test(name)) return 'historical';
  if (/science|physics|chemistry|biology|math/.test(name)) return 'scientists';
  if (/music|song|singer|composer|band|orchestra/.test(name)) return 'musicians';
  if (/cinema|movie|actor|director|film|hollywood/.test(name)) return 'entertainers';
  
  return 'generic';
}

// Get category-specific prompt
function getPromptForCategory(categoryName: string, categoryType: CategoryType): string {
  const prompts: Record<CategoryType, string> = {
    athletes: `Generate 12 famous athletes and sportspeople. Include:
- 4 football/soccer players (e.g., Lionel Messi, Cristiano Ronaldo)
- 3 basketball players (e.g., Michael Jordan, LeBron James)
- 2 tennis players (e.g., Serena Williams, Roger Federer)
- 3 other sports athletes (e.g., Usain Bolt, Michael Phelps)
Each person must have a Wikipedia page with their photo.`,

    places: `Generate 12 famous places for visual trivia. Include:
- 4 major world cities (e.g., Paris, Tokyo, New York)
- 4 famous landmarks (e.g., Eiffel Tower, Colosseum)
- 4 countries with distinctive flags (e.g., Japan, Brazil)
Each must be visually recognizable.`,

    artworks: `Generate 12 famous art-related subjects. Include:
- 4 famous painters (e.g., Leonardo da Vinci, Van Gogh)
- 4 famous paintings (e.g., Mona Lisa, Starry Night)
- 4 famous sculptors or their works (e.g., Michelangelo, The Thinker)
Each must have Wikipedia images.`,

    // ... other category types
  };
  
  return prompts[categoryType] || prompts.generic;
}
```

### File 2: `src/components/admin/studio/bulk/PresetCategories.ts`

Add extended theme types and question templates:

```typescript
export type ExtendedThemeType = 
  | 'athletes' | 'footballers' | 'basketballers' | 'tennis_players'
  | 'cities' | 'countries' | 'flags' | 'landmarks'
  | 'painters' | 'paintings' | 'sculptors'
  | 'scientists' | 'historical_figures'
  | 'musicians' | 'composers' | 'singers'
  | 'actors' | 'directors'
  | 'generic';

// Extended question templates
const extendedTemplates: Record<ExtendedThemeType, Record<'text' | 'image', string>> = {
  athletes: { image: 'ვინ არის ეს სპორტსმენი?', text: 'ვინ არის ეს სპორტსმენი?' },
  footballers: { image: 'ვინ არის ეს ფეხბურთელი?', text: 'ვინ არის ეს ფეხბურთელი?' },
  basketballers: { image: 'ვინ არის ეს კალათბურთელი?', text: 'ვინ არის ეს კალათბურთელი?' },
  cities: { image: 'რომელი ქალაქია?', text: 'რომელი ქალაქია?' },
  countries: { image: 'რომელი ქვეყანაა?', text: 'რომელი ქვეყანაა?' },
  flags: { image: 'რომელი ქვეყნის დროშაა?', text: 'რომელი ქვეყნის დროშაა?' },
  landmarks: { image: 'რომელი ღირსშესანიშნაობაა?', text: 'რომელი ადგილია?' },
  painters: { image: 'ვინ არის ეს მხატვარი?', text: 'ვინ არის ეს მხატვარი?' },
  paintings: { image: 'ვინ დახატა ეს ნახატი?', text: 'ვინ დახატა?' },
  // ... etc
};
```

### File 3: `supabase/functions/bulk-generate-contextual-questions/index.ts`

Update to use extended themes for more accurate question formatting and distractor generation.

## Implementation Summary

| File | Changes |
|------|---------|
| `generate-topic-suggestions/index.ts` | Complete rewrite with category detection and specific person/place suggestions |
| `PresetCategories.ts` | Add extended theme types and question templates |
| `bulk-generate-contextual-questions/index.ts` | Update theme context and question templates |
| `StepCategorySelect.tsx` | Minor update to pass detected theme type |

## Expected Result

After implementation:

**Sports category:**
- Suggestions: "Lionel Messi", "Michael Jordan", "Serena Williams" (actual names)
- Question: "ვინ არის ეს ფეხბურთელი?" with athlete's image
- Distractors: Other famous athletes

**Geography category:**
- Suggestions: "Paris", "Eiffel Tower", "Japan Flag" (actual places)
- Question: "რომელი ქალაქია?" or "რომელი ქვეყნის დროშაა?"
- Distractors: Other similar places/flags

**Art category:**
- Suggestions: "Leonardo da Vinci", "Mona Lisa", "The Starry Night"
- Question: "ვინ დახატა?" or "ვინ არის ეს მხატვარი?"
- Distractors: Other painters/artworks
