
# Plan: Fix Question Repetition in Category Quiz

## Problem Analysis

Users are seeing repeated questions because of a mismatch between how questions are **fetched** vs. how they are **tracked**.

### Current Flow (Broken)

```text
User plays Level 5
┌──────────────────────────────────────────────────────────────┐
│ FETCH: Query levels 2-10 (range: level-3 to level+5)         │
│        → 100 possible questions from 9 different levels      │
└──────────────────────────────────────────────────────────────┘
          ↓
┌──────────────────────────────────────────────────────────────┐
│ EXCLUDE: Only check tracking for "category_level5"           │
│          → Questions from levels 2,3,4,6,7,8,9,10 are NOT    │
│            excluded even if they were seen before!           │
└──────────────────────────────────────────────────────────────┘
          ↓
┌──────────────────────────────────────────────────────────────┐
│ TRACK: Mark as seen under "category_level5" only             │
│        → Same questions can appear again when playing        │
│          any OTHER level (4,6,7, etc.)                       │
└──────────────────────────────────────────────────────────────┘
```

### Why Repeats Happen

| Scenario | What Happens |
|----------|--------------|
| Play Level 5 | See question Q1 (from DB level 3), tracked under "level5" |
| Play Level 3 | Q1 fetched again (from DB level 3), NOT in "level3" tracking → **REPEAT!** |
| Play Level 5 again | System fetches from levels 2-10, Q1 might be fetched again |

---

## Solution: Category-Wide Tracking

Track ALL seen questions per **category only** (not per level), since the fetch already pulls from multiple levels.

### New Flow (Fixed)

```text
User plays Level 5
┌──────────────────────────────────────────────────────────────┐
│ FETCH: Query levels 2-10 (same as before)                    │
│        → 100 possible questions                              │
└──────────────────────────────────────────────────────────────┘
          ↓
┌──────────────────────────────────────────────────────────────┐
│ EXCLUDE: Check tracking for ENTIRE CATEGORY                  │
│          → ALL previously seen questions excluded            │
└──────────────────────────────────────────────────────────────┘
          ↓
┌──────────────────────────────────────────────────────────────┐
│ TRACK: Mark as seen under CATEGORY (not level)               │
│        → Questions won't repeat regardless of level played   │
└──────────────────────────────────────────────────────────────┘
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/services/questionService.ts` | Use category-wide tracking instead of level-specific |
| `src/services/questionTracker.ts` | Add getCategorySeenIds and markCategorySeen functions |

---

## Technical Implementation

### 1. Add Category-Wide Tracking Functions (questionTracker.ts)

```typescript
// New key format: "cat_{categoryId}" instead of "{categoryId}_{level}"
const CATEGORY_SEEN_KEY_PREFIX = 'cat_';

/**
 * Get all seen question IDs for an entire category
 */
export function getCategorySeenIds(categoryId: string): string[] {
  const data = getTrackerData();
  const key = `${CATEGORY_SEEN_KEY_PREFIX}${categoryId}`;
  return data.categoryLevels?.[key] || [];
}

/**
 * Mark questions as seen for a category (not level-specific)
 */
export function markCategorySeen(categoryId: string, questionIds: string[]): void {
  const data = getTrackerData();
  const key = `${CATEGORY_SEEN_KEY_PREFIX}${categoryId}`;
  
  if (!data.categoryLevels) {
    data.categoryLevels = {};
  }
  
  const existing = data.categoryLevels[key] || [];
  const updated = [...new Set([...existing, ...questionIds])];
  // Keep max 500 per category to limit storage
  data.categoryLevels[key] = updated.slice(-MAX_TRACKED_PER_CATEGORY);
  
  // Also update global seen
  const updatedSeen = [...new Set([...data.seen, ...questionIds])];
  data.seen = updatedSeen.slice(-SEEN_MAX_TRACKED);
  
  saveTrackerData(data);
}

/**
 * Clear category-wide seen questions (when exhausted)
 */
export function clearCategorySeen(categoryId: string): void {
  const data = getTrackerData();
  const key = `${CATEGORY_SEEN_KEY_PREFIX}${categoryId}`;
  if (data.categoryLevels) {
    delete data.categoryLevels[key];
  }
  saveTrackerData(data);
}
```

### 2. Update getCategoryQuestions (questionService.ts)

**Key changes:**
- Use `getCategorySeenIds(categoryUuid)` instead of `getCategoryLevelSeenIds(categoryUuid, levelNumber)`
- Mark with `markCategorySeen(categoryUuid, questionIds)` instead of level-specific
- Calculate `totalAvailable` for the entire category (not just level range)

```typescript
async function getCategoryQuestions(
  categoryUuid: string,
  levelNumber: number,
  count: number,
  language: string,
  additionalExcludeIds?: string[]
): Promise<QuestionResult> {
  // Get TOTAL available in entire category (not just level range)
  const { count: totalCount } = await supabase
    .from('questions')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .eq('in_production', true)
    .eq('language', language)
    .eq('category_id', categoryUuid);
  
  const totalAvailable = totalCount || 0;
  
  // Get ALL seen questions for this CATEGORY (not level-specific)
  const categorySeenIds = getCategorySeenIds(categoryUuid);
  let excludeIds = [...new Set([...categorySeenIds, ...(additionalExcludeIds || [])])];
  
  // Check category-wide exhaustion
  const categoryExhausted = categorySeenIds.length >= totalAvailable;
  
  if (categoryExhausted && totalAvailable > 0) {
    clearCategorySeen(categoryUuid);
    wasReset = true;
    exhausted = true;
    excludeIds = [...(additionalExcludeIds || [])];
  }
  
  // ... rest of query logic (same level range filtering)
  
  // Mark as seen for CATEGORY (not level)
  if (selected.length > 0) {
    markCategorySeen(categoryUuid, selected.map(q => q.id));
  }
}
```

---

## Expected Results

| Before | After |
|--------|-------|
| User sees same question when playing different levels | Each question shows only ONCE until all ~200+ questions exhausted |
| Level tracking fragments questions by level | Category-wide pool ensures maximum variety |
| 5 questions × 20 levels = 100 slots tracked | All 200+ questions tracked together |

### Example Flow After Fix

```text
Category: Geography (296 questions)

Session 1: Play Level 5 → See Q1, Q2, Q3, Q4, Q5
Session 2: Play Level 3 → See Q6, Q7, Q8, Q9, Q10 (NOT Q1-Q5!)
Session 3: Play Level 5 → See Q11, Q12, Q13, Q14, Q15 (NOT Q1-Q10!)
...
Session 59: Play any level → Exhaustion reset, Q1-Q5 can appear again
```

---

## Summary

1. **Add 3 new functions** in `questionTracker.ts` for category-wide tracking
2. **Update `getCategoryQuestions`** in `questionService.ts` to use category-wide tracking
3. **Calculate `totalAvailable`** for entire category (not level range)
4. **Track/exclude by category** instead of by level

This ensures users see ALL unique questions in a category before any repeats occur.
