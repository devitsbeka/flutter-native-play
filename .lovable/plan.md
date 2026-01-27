
# Fix: Poll to Game Transition Failure

## Problem Identified

After completing the poll voting phase and viewing results, clicking the "Start" button fails to start the game. The host is returned to the lobby screen instead of entering gameplay.

### Root Cause

The `finalizePollAndStartGame` function in `src/hooks/useTVPoll.ts` incorrectly uses the **category slug** (e.g., "politics", "geography") stored in poll suggestions when querying the `questions` table. However, the `questions` table requires a **UUID** for its `category_id` column.

**Network Evidence:**
```
GET .../questions?category_id=eq.politics
Status: 400
Error: "invalid input syntax for type uuid: \"politics\""
```

When the query fails, no questions are returned, causing the fallback logic to reset the session to "paired" status and return to the lobby.

---

## Solution

Use the existing `resolveCategoryUuid` utility from `@/services/questionService.ts` to convert the category slug to a UUID before fetching questions. This pattern is already correctly implemented in `TVGameContext.tsx`.

---

## Implementation

### File: `src/hooks/useTVPoll.ts`

**Change 1: Add import for category resolution utility**

At the top of the file (around line 3), add the import:
```typescript
import { resolveCategoryUuid } from '@/services/questionService';
```

**Change 2: Resolve category UUID before querying questions**

In the `finalizePollAndStartGame` function (around lines 682-688), update the category question fetch logic:

**Before:**
```typescript
if (firstSuggestion.source_type === 'category' && firstSuggestion.category_id) {
  const { data: questionsData } = await supabase
    .from('questions')
    .select('id, question_text, correct_answer, incorrect_answers, difficulty, icon_slug')
    .eq('category_id', firstSuggestion.category_id)
    .eq('is_active', true)
    .limit(10);
```

**After:**
```typescript
if (firstSuggestion.source_type === 'category' && firstSuggestion.category_id) {
  // CRITICAL FIX: Resolve category slug to UUID before querying questions
  const categoryUuid = await resolveCategoryUuid(firstSuggestion.category_id);
  
  if (!categoryUuid) {
    console.error('[finalizePollAndStartGame] Failed to resolve category UUID for:', firstSuggestion.category_id);
    // Fall through to fallback logic below
  } else {
    const { data: questionsData } = await supabase
      .from('questions')
      .select('id, question_text, correct_answer, incorrect_answers, difficulty, icon_slug')
      .eq('category_id', categoryUuid)
      .eq('is_active', true)
      .eq('in_production', true)
      .eq('language', 'ka')
      .limit(10);

    if (questionsData && questionsData.length > 0) {
      questions = questionsData.sort(() => Math.random() - 0.5).slice(0, 10);
    }
  }
}
```

---

## Technical Details

### Why This Fix Works

| Component | Before | After |
|-----------|--------|-------|
| Category ID used | `"politics"` (slug) | `"b078f516-..."` (UUID) |
| Query result | 400 error | Valid questions array |
| Game state | Falls back to lobby | Transitions to countdown |

### Existing Pattern Reference

This same pattern is already successfully used in `TVGameContext.tsx`:

```typescript
// src/contexts/TVGameContext.tsx:897-901
const { resolveCategoryUuid } = await import('@/services/questionService');
const categoryUUID = await resolveCategoryUuid(nextItem.category_id);
if (!categoryUUID) return false;
```

### Resolution Flow

```text
Poll Suggestion
     ↓
category_id = "geography" (slug)
     ↓
resolveCategoryUuid("geography")
     ↓
Query: SELECT id FROM categories WHERE category_id = 'geography'
     ↓
Returns: "b352d1cf-a825-48a3-b85b-b916368669a3" (UUID)
     ↓
Query: SELECT * FROM questions WHERE category_id = UUID
     ↓
Returns: Array of questions
     ↓
Game starts successfully
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useTVPoll.ts` | Import `resolveCategoryUuid` and use it to convert category slug to UUID before querying questions |

---

## Expected Outcome

After this fix:
1. Host clicks "Start" on poll results screen
2. Category slug is resolved to UUID
3. Questions are fetched successfully
4. Session transitions to "countdown" phase
5. Game begins with the first round using the top-voted category
