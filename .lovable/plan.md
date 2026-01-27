
# AI Topic Suggestions Redesign: Theme-Based Suggestions with Refresh

## Problem
Currently, the AI suggests **specific items** (e.g., "Michael Jordan", "Lionel Messi") but you want **broader topic themes** (e.g., "Famous Athletes", "Sports Equipment", "Team Logos") that can each generate multiple related questions.

## Solution

### 1. Update AI Prompt for Topic Themes

Change the edge function to generate **topic themes/subtopics** instead of specific items.

**Current Approach:**
```
"Michael Jordan", "Lionel Messi", "Serena Williams"
```

**New Approach:**
```
"Famous Athletes", "Sports Equipment", "Team Uniforms", "Olympic Games", "Sports Stadiums"
```

### 2. Add Refresh Button

Add a refresh button next to "AI რეკომენდაციები" label to fetch a new batch of suggestions.

```text
┌─────────────────────────────────────────────────────────────────┐
│  AI რეკომენდაციები  [↻ Refresh]                                 │
│  ┌──────────────────┐ ┌──────────────────┐ ┌─────────────────┐  │
│  │ + Famous Athletes│ │ + Sports Stadiums│ │ + Team Logos    │  │
│  └──────────────────┘ └──────────────────┘ └─────────────────┘  │
│  ┌──────────────────┐ ┌──────────────────┐ ┌─────────────────┐  │
│  │ + Sports Equipment│ │ + Olympic Sports │ │ + Team Uniforms │  │
│  └──────────────────┘ └──────────────────┘ └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Technical Changes

### File 1: `supabase/functions/generate-topic-suggestions/index.ts`

Update the AI prompt to generate topic themes:

```typescript
const prompt = `You are a trivia question designer. Given the category "${categoryName}", 
suggest exactly 12 TOPIC THEMES (subtopics) that would be great for generating visual trivia questions.

Requirements:
- Each suggestion should be a THEME/SUBTOPIC, not a specific item
- Themes should be visually identifiable (good for image-based questions)
- Examples for "Sports" category:
  • "Famous Athletes" (images of sportspeople)
  • "Sports Equipment" (baseball bats, tennis rackets, etc.)
  • "Team Logos" (recognizable sports team emblems)
  • "Sports Stadiums" (iconic arenas)
  • "Olympic Sports" (various disciplines)
  • "Sports Uniforms" (jerseys, gear)
  
- For other categories, think similarly about visual themes
- Keep suggestions broad enough to generate 5-10 questions each
- Use English for searchability

Return ONLY a JSON array of 12 strings. Example:
["Famous Athletes", "Sports Equipment", "Team Logos", ...]`;
```

### File 2: `src/components/admin/studio/bulk/StepCategorySelect.tsx`

Add refresh functionality:

```typescript
// Add RefreshCw icon import
import { RefreshCw } from 'lucide-react';

// Add refresh function
const refreshSuggestions = async () => {
  if (!selectedCategory) return;
  
  setIsLoadingSuggestions(true);
  try {
    const { data, error } = await supabase.functions.invoke('generate-topic-suggestions', {
      body: { categoryName: selectedCategory.name }
    });
    
    if (error) throw error;
    setAllSuggestions(data?.suggestions || []);
  } catch (err) {
    console.error('Failed to refresh suggestions:', err);
  } finally {
    setIsLoadingSuggestions(false);
  }
};

// Update UI - add refresh button next to label
<Label className="text-base font-medium flex items-center gap-2">
  <Sparkles className="h-4 w-4 text-primary" />
  AI რეკომენდაციები
  <button
    onClick={refreshSuggestions}
    disabled={isLoadingSuggestions}
    className="ml-auto p-1.5 rounded-md hover:bg-accent transition-colors disabled:opacity-50"
    title="ახალი რეკომენდაციები"
  >
    <RefreshCw className={cn(
      "h-4 w-4",
      isLoadingSuggestions && "animate-spin"
    )} />
  </button>
</Label>
```

### Processing Flow Consideration

When a user selects a topic theme like "Famous Athletes", the processing step will:
1. Use AI to expand the theme into specific items (e.g., "Michael Jordan", "Serena Williams")
2. Then look up each item on Wikipedia as before

This requires an additional step in `StepProcessing.tsx` or a new edge function to expand themes into items. However, if you want simpler behavior where the user enters the specific items manually after seeing the theme suggestions, we can keep the current processing flow.

## Summary of Changes

| File | Changes |
|------|---------|
| `supabase/functions/generate-topic-suggestions/index.ts` | Update prompt to generate topic themes instead of specific items |
| `src/components/admin/studio/bulk/StepCategorySelect.tsx` | Add RefreshCw icon, add `refreshSuggestions` function, add refresh button to UI |

## Optional Enhancement

If you want the processing to automatically expand themes into specific items, we would need to add an intermediate step or modify `bulk-resolve-topics` to handle theme expansion. Let me know if you want this included in the implementation.
