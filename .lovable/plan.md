

## Category Play Limits for Non-PRO Users: 3 Levels in 5 Categories

### Problem

Currently, the category quiz flow (`/category/:id` -> `/play/:categoryId/:levelId`) has **zero play limit enforcement**. Users can:
- Navigate directly to `/play/science/1` and play unlimited levels
- The `PlayGuardContext` only protects VS mode (`/game`) entry points
- Category pages (`CategoryPage.tsx`, `CategoryQuizPage.tsx`) don't check any limits

This is a significant hole in the monetization gating.

### Proposed Limits

- Non-PRO users can play **3 levels per category**
- Non-PRO users can play in **up to 5 different categories**
- PRO users have no limits
- Guests are already blocked by auth requirement on category play (existing behavior)

### Implementation

**1. New hook: `src/hooks/useCategoryPlayLimit.ts`**

A dedicated hook that reads from the existing `user_level_progress` table to calculate:
- How many distinct categories the user has played in
- How many levels the user has completed in each category
- Whether the user can play a specific category/level combination

This uses **existing data** -- no new database tables needed. The `user_level_progress` table already tracks every level played per user per category.

```text
Logic:
- Count distinct category_ids from user_level_progress -> categoriesUsed
- For a given categoryId, count completed levels -> levelsUsedInCategory
- canPlayLevel(categoryId) = isVip 
    OR (levelsUsedInCategory < 3 AND (categoriesUsed < 5 OR categoryAlreadyStarted))
```

**2. Update `CategoryPage.tsx` -- Lock levels beyond limit**

- Import `useCategoryPlayLimit` and `useVipStatus`
- In the level grid, mark levels beyond the 3rd as "PRO locked" (not just "not unlocked")
- Show a small indicator like a crown/lock on levels 4+ for non-PRO users
- When a user taps a PRO-locked level, show `ProRequiredModal` instead of navigating

Changes:
- Add imports for the new hook and `ProRequiredModal`
- In `handleLevelClick`: check `canPlayLevel()` before navigating; if blocked, show PRO modal
- In the level grid rendering: add a visual "PRO" lock state for levels beyond the free limit
- When all 5 categories are used, show a message on new category pages explaining PRO is needed

**3. Update `CategoryQuizPage.tsx` -- Server-side guard on game start**

This is the critical "no holes" protection. Even if someone crafts a URL like `/play/science/4`:

- On mount, before fetching questions, check `useCategoryPlayLimit`
- If the user has exceeded their limit for this category (or exceeded 5 categories), redirect them back to `/category/:id` with a toast message
- This prevents URL-based bypasses

Changes:
- Import `useCategoryPlayLimit` and `useVipStatus`
- Add an early `useEffect` that checks limits before loading questions
- If blocked, `navigate()` back and show a toast

**4. Update `PlayGuardContext.tsx` -- Extend to cover category plays**

Add a new method `guardCategoryPlay(categoryId, onAllow)` alongside the existing `guardPlay`:
- Checks category-specific limits
- Shows `ProRequiredModal` if blocked
- Returns boolean like `guardPlay`

This provides a centralized API that any future entry point can use.

**5. Visual indicators on `CategoryPage.tsx` level grid**

For non-PRO users:
- Levels 1-3: Normal behavior (unlockable via progression)
- Levels 4+: Show a small PRO badge/crown overlay on the tile
- If the category is the 6th+ one the user tries to access: show a "PRO required" message at the top of the page

### Security Considerations (No Holes)

| Attack Vector | Protection |
|---------------|-----------|
| Direct URL `/play/science/4` | `CategoryQuizPage` checks limit on mount, redirects if blocked |
| Browser devtools removing disabled | Server-side check still prevents question loading |
| localStorage manipulation | Limits are based on `user_level_progress` DB table, not localStorage |
| Multiple browser tabs | DB is source of truth, checked on each page load |
| Race condition (rapid navigation) | Questions won't load until limit check passes |

### Files to Change

| File | Change |
|------|--------|
| `src/hooks/useCategoryPlayLimit.ts` | **New** -- hook to check category play limits from existing DB data |
| `src/pages/CategoryPage.tsx` | Add limit checks, PRO lock visuals on levels 4+, ProRequiredModal |
| `src/pages/CategoryQuizPage.tsx` | Add mount-time limit guard, redirect if blocked |
| `src/contexts/PlayGuardContext.tsx` | Add `guardCategoryPlay()` method for centralized gating |

### No Database Changes Required

The existing `user_level_progress` table already contains all the data needed to enforce these limits. We simply count rows per user per category.

