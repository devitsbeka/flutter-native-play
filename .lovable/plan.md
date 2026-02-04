

# Plan: Fix Player List Cropping & Mixed Category TV Game Start

## Overview
This plan addresses two user-reported issues:
1. **Player/list cropping** in TV Lobby screens - both the category picker and player list are getting cut off
2. **"სხვადასხვა" (Mixed) category can't start game** - clicking "Start Game" doesn't work after selecting the mixed category

---

## Issue 1: Player List Cropping

### Problem
In `TVLobbyScreenV2.tsx`, the player grid uses a fixed grid layout (`grid grid-cols-4`) without proper scroll containment. When there are many players, the list gets cropped instead of scrolling.

Similarly, in `ControllerLobby.tsx`, the player list already has `max-h-[50vh]` and `overflow-y-auto`, but the container structure may still cause cropping on smaller screens.

### Solution

#### File: `src/components/tv/TVLobbyScreenV2.tsx`

Wrap the players grid in a scrollable container with proper flex and overflow handling:

**Current (line 531-536):**
```tsx
<div className="flex-1 flex flex-col min-h-0">
  <h2 className="text-sm font-bold text-purple-200 mb-2 flex items-center gap-2 flex-shrink-0">
    ...
  </h2>

  <div className="grid grid-cols-4 gap-1.5 auto-rows-min">
```

**Changed to:**
```tsx
<div className="flex-1 flex flex-col min-h-0 overflow-hidden">
  <h2 className="text-sm font-bold text-purple-200 mb-2 flex items-center gap-2 flex-shrink-0">
    ...
  </h2>

  <div className="flex-1 overflow-y-auto min-h-0">
    <div className="grid grid-cols-4 gap-1.5 auto-rows-min">
```

Add a closing `</div>` after the grid to properly wrap the scrollable area.

---

## Issue 2: Mixed Category ("სხვადასხვა") Start Game Not Working

### Problem Analysis
Based on console logs, when "__mixed__" category is selected:
- First attempt works: `State category: __mixed__`
- Second attempt fails: `State category: null`

The root cause is in the `startGame` function in `TVGameContext.tsx`. At lines 2276-2280:

```typescript
if (!categoryId && !userTriviaId) {
  tvLogError('startGame', 'No category ID or user trivia ID provided');
  return;
}
```

When queue items have `source_type: "random"`, they have `category_id: null`, so `startGame(null)` returns early without doing anything. This is the correct behavior for random.

However, the actual issue is in `handleStartGame()` in `TVHostController.tsx` when trying to use queue items. Looking at lines 474-477:

```typescript
} else if (firstQueued.category_id) {
  await startGame(firstQueued.category_id);
} else {
  toast.error('არასწორი რაუნდის ტიპი');
```

The problem: When `source_type === "random"`, `category_id` is `null`, so neither the `user_trivia_id` nor `category_id` branch is triggered, causing the toast error.

### Solution

#### File: `src/pages/TVHostController.tsx`

Update `handleStartGame` to properly handle "random" source type by fetching a random category before starting:

**Current logic (around line 467-486):**
```typescript
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
```

**Changed to:**
```typescript
if (hasQueue && queue.length > 0) {
  const firstQueued = queue[0];
  
  if (firstQueued.user_trivia_id) {
    await startGame(undefined, firstQueued.user_trivia_id);
  } else if (firstQueued.category_id) {
    await startGame(firstQueued.category_id);
  } else if (firstQueued.source_type === "random") {
    // Random mode - fetch random category and start
    const randomCat = categories[Math.floor(Math.random() * categories.length)];
    if (randomCat) {
      await startGame(randomCat.id);
    } else {
      toast.error('კატეგორიები ვერ მოიძებნა');
      return;
    }
  } else {
    toast.error('არასწორი რაუნდის ტიპი');
    return;
  }
```

This ensures that when "შემთხვევითი" (random) is in the queue, it picks a random category from the loaded categories list.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/tv/TVLobbyScreenV2.tsx` | Add scroll container around player grid |
| `src/pages/TVHostController.tsx` | Handle "random" source_type in handleStartGame |

---

## Summary

1. **TV Lobby Player Grid**: Wrap the 4-column player grid in a scrollable container with `overflow-y-auto` and `flex-1 min-h-0` to prevent cropping
2. **Mixed Category Start**: Add handling for `source_type === "random"` queue items to pick a random category from the available list when starting the game

