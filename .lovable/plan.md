
# Plan: Fix "Start Game" Button Not Working After First Round

## Problem Summary

After the first round ends and the host adds 2 more categories via `ControllerDirectSelection`, clicking "თამაშის დაწყება" (Start Game) button doesn't work. The button appears clickable with correct text ("თამაშის დაწყება (2 რაუნდი)") but nothing happens when clicked.

## Root Cause

There are **two separate instances** of `useTVSessionQueue` with potential sync issues:

1. **ControllerDirectSelection** (line 61): `useTVSessionQueue(sessionId, roomId)`
2. **TVHostController** (line 82): `useTVSessionQueue(sessionId || null, roomId)`

When the user clicks "Start Game":

1. `ControllerDirectSelection.handleStartGame()` checks its own `queue.length > 0` ✓ (passes)
2. It calls `onStartGame()` → `TVHostController.handleStartGame()`
3. `TVHostController.handleStartGame()` checks its own `hasQueue && queue.length > 0`
4. If TVHostController's hook has **stale data or hasn't synced yet**, `hasQueue` may be `false` or `queue.length === 0`
5. The function falls through to line 451-454 which checks for `selectedCategory?.id`
6. Since `selectedCategory` is `null` (not used in queue mode), a toast appears but NO toast is shown because it returns early

The real issue: **stale closure** in the `handleStartGame` callback and **duplicate hook instances** with potential async mismatches.

```text
┌────────────────────────────────┐      ┌─────────────────────────────────┐
│ ControllerDirectSelection      │      │ TVHostController                │
│ queue = [მეცნიერება, სპორტი]  │      │ queue = [] (stale/not synced)   │
│ queue.length = 2 ✓             │──────│ hasQueue = false ✗              │
│ calls onStartGame()            │      │ falls through to selectedCategory│
│                                │      │ selectedCategory = null → exits │
└────────────────────────────────┘      └─────────────────────────────────┘
```

## Solution

Change the callback pattern to pass the first queue item directly, eliminating the dual-hook dependency:

### Option A (Recommended): Pass Queue Item to Callback

Modify `ControllerDirectSelection` to pass the first queue item to `onStartGame`, and update `TVHostController` to use this passed value instead of its own hook.

---

## Technical Changes

### File 1: `src/components/controller/ControllerDirectSelection.tsx`

**Change 1**: Update the props interface (line 41)

```typescript
// Before
onStartGame: () => void;

// After
onStartGame: (firstQueueItem: { categoryId?: string; userTriviaId?: string }) => void;
```

**Change 2**: Update `handleStartGame` function (lines 201-208)

```typescript
// Before
const handleStartGame = () => {
  if (queue.length === 0) {
    toast.error('აირჩიე მინიმუმ 1 კატეგორია');
    return;
  }
  onStartGame();
};

// After
const handleStartGame = () => {
  if (queue.length === 0) {
    toast.error('აირჩიე მინიმუმ 1 კატეგორია');
    return;
  }
  
  const firstQueued = queue[0];
  onStartGame({
    categoryId: firstQueued.category_id || undefined,
    userTriviaId: firstQueued.user_trivia_id || undefined,
  });
};
```

### File 2: `src/pages/TVHostController.tsx`

**Change 1**: Update `handleStartGame` function (lines 421-462)

Remove the dual-validation and use the passed parameters directly:

```typescript
// Before
const handleStartGame = async () => {
  if (!sessionId) return;

  tvLog('Host starting game', { sessionId, selectedCategory, hasQueue, queue });

  try {
    // If queue has items, start from the first item
    if (hasQueue && queue.length > 0) {
      const firstQueued = queue[0];
      // ... uses its own queue
    }
    // ... fallback to selectedCategory
  }
};

// After
const handleStartGame = async (firstQueueItem?: { categoryId?: string; userTriviaId?: string }) => {
  if (!sessionId) return;

  tvLog('Host starting game', { sessionId, firstQueueItem, selectedCategory });

  try {
    // If called from ControllerDirectSelection with queue item
    if (firstQueueItem) {
      if (firstQueueItem.userTriviaId) {
        await startGame(undefined, firstQueueItem.userTriviaId);
      } else if (firstQueueItem.categoryId) {
        await startGame(firstQueueItem.categoryId);
      } else {
        toast.error('არასწორი რაუნდის ტიპი');
        return;
      }
      return;
    }

    // Fallback: If queue has items (for other call sites)
    if (hasQueue && queue.length > 0) {
      const firstQueued = queue[0];
      if (firstQueued.user_trivia_id) {
        await startGame(undefined, firstQueued.user_trivia_id);
      } else if (firstQueued.category_id) {
        await startGame(firstQueued.category_id);
      } else {
        toast.error('არასწორი რაუნდის ტიპი');
        return;
      }
      
      if (!firstQueued.id.startsWith('initial-')) {
        await removeFromQueue(firstQueued.id);
      }
      return;
    }

    // Otherwise use selected category
    if (!selectedCategory?.id) {
      toast.error('გთხოვთ აირჩიოთ კატეგორია');
      return;
    }

    await startGame(selectedCategory.id);
  } catch (error) {
    tvLogError('handleStartGame', error);
    toast.error('თამაშის დაწყება ვერ მოხერხდა');
  }
};
```

**Change 2**: Update the callback passed to ControllerDirectSelection (line 604)

```typescript
// Before
onStartGame={handleStartGame}

// After  
onStartGame={handleStartGame}
// (No change needed - the signature update makes it compatible)
```

---

## Summary of Changes

| File | Line(s) | Change |
|------|---------|--------|
| `src/components/controller/ControllerDirectSelection.tsx` | 41 | Update `onStartGame` prop type to accept queue item parameter |
| `src/components/controller/ControllerDirectSelection.tsx` | 201-208 | Pass first queue item when calling `onStartGame` |
| `src/pages/TVHostController.tsx` | 421-462 | Accept and prioritize the passed queue item parameter |

---

## Why This Fixes the Bug

1. **Eliminates dual-hook dependency**: The queue item is passed directly from the component that has the freshest data
2. **No stale closures**: The callback receives the actual data at call time, not captured values
3. **Maintains backward compatibility**: Fallback logic still works for other call sites

---

## Testing Checklist

1. Complete a game round
2. When "აირჩიე კატეგორიები" screen appears, add 2+ categories
3. Click "თამაშის დაწყება (2 რაუნდი)" button
4. Verify game countdown starts immediately
5. Verify the correct first category is loaded
