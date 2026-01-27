

# Fix Trivia Card Button Styling & Question Count

## Issues Identified

### Issue 1: Button Styling Inconsistency
The three buttons on trivia cards have inconsistent styling:
- **"ითამაშე მეგობრებთან"** (purple): Uses `ChunkyButton` with `rounded-xl` (from sm size)
- **"გამოაქვეყნე"** (green outline): Uses plain `<button>` with `rounded-full` (more rounded)
- **"ითამაშე"** (purple outline): Uses `ChunkyButton` with `rounded-xl`

The green button uses `rounded-full` while others use `rounded-xl`, causing visual mismatch.

### Issue 2: Wrong Question Count
Database query confirms the bug:

| title | question_count (displayed) | actual_count (in JSONB) |
|-------|---------------------------|-------------------------|
| ტიკტოკი | 5 | 2 |

The `question_count` column is stale (not updated when questions are edited). The card displays this incorrect value instead of the actual number of questions in the JSONB array.

---

## Solution

### 1. Standardize Button Styling (MyTriviaTab.tsx)

Change the green "გამოაქვეყნე" button from `rounded-full` to `rounded-xl` to match the ChunkyButtons.

**In `PersonalTriviaCard` (line ~535):** The primary button already uses ChunkyButton - no changes needed.

**In `StandaloneQuizCard` (lines 647-669):** Change the green button from:
```tsx
className={`flex-1 h-10 ... rounded-full ...`}
```
To:
```tsx
className={`flex-1 h-10 ... rounded-xl ...`}
```

**In `CollectionCard` (lines 306-330):** Same fix for the collection's green button.

### 2. Fix Question Count Display (MyTriviaTab.tsx)

Instead of displaying `post.question_count`, calculate the actual count from the JSONB questions array.

**Change in `PersonalTriviaCard` (line 490):**
```tsx
// Before
<span>{post.question_count} კითხვა</span>

// After - use actual questions array length
<span>{(Array.isArray(post.questions) ? post.questions.length : post.question_count) || 0} კითხვა</span>
```

**Same change in `StandaloneQuizCard` (line 603).**

---

## Technical Changes Summary

| File | Location | Change |
|------|----------|--------|
| `src/components/social/MyTriviaTab.tsx` | PersonalTriviaCard, line ~490 | Use actual questions array length instead of question_count |
| `src/components/social/MyTriviaTab.tsx` | StandaloneQuizCard, line ~603 | Use actual questions array length instead of question_count |
| `src/components/social/MyTriviaTab.tsx` | StandaloneQuizCard, line ~650 | Change green button from `rounded-full` to `rounded-xl` |
| `src/components/social/MyTriviaTab.tsx` | CollectionCard, line ~310 | Change green button from `rounded-full` to `rounded-xl` |

---

## Result

After these changes:
- All three buttons will have consistent `rounded-xl` edges and `h-10` heights
- The question count badge will show the actual number of questions (2 for "ტიკტოკი") from the JSONB array, not the stale `question_count` column value

