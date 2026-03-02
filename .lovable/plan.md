

## Fix: TV Mode Game Start Stuck on "GO" Screen

### Root Cause

When a player joins a TV session via code entry (mytrivia.io/join), they become the host and see the Controller Lobby with a "Start Game" button. Clicking it does **nothing** because of a silent failure:

1. The default category selection is "Random Mix" which sets `selectedCategory = null`
2. `ControllerLobby` calls `startGame(selectedCategory?.id)` which passes `undefined`
3. `startGame()` has a guard: `if (!categoryId && !userTriviaId) { return; }` -- silently exits
4. The game never transitions from lobby to countdown -- stuck on "GO" screen

The `__mixed__` sentinel value (`"__mixed__"`) is used everywhere else in the app for "random from all categories" mode, but the TV Controller Lobby doesn't use it.

### Fix

**File: `src/components/controller/ControllerLobby.tsx`**

Change the start game handler to pass `"__mixed__"` when no specific category is selected:

```text
Current:  startGame(selectedCategory?.id)
Fixed:    startGame(selectedCategory?.id || '__mixed__')
```

This single change makes "Random Mix" actually work. The `startGame` function in `TVGameContext` already handles `__mixed__` correctly (lines 2479-2522) -- it fetches random questions from all categories.

### Secondary Fix: Prevent Silent Failures

**File: `src/contexts/TVGameContext.tsx`**

Add a toast notification when `startGame` fails so the host gets feedback instead of the button appearing broken:

```text
if (!categoryId && !userTriviaId) {
  tvLogError('startGame', 'No category ID or user trivia ID provided');
  return;  // Currently silent -- user sees nothing
}
```

Change to import `toast` and show an error message so this class of bug is immediately visible during testing.

### Files to Modify

| File | Change |
|------|--------|
| `src/components/controller/ControllerLobby.tsx` | Pass `'__mixed__'` as fallback when no category selected |
| `src/contexts/TVGameContext.tsx` | Add toast feedback on `startGame` failure for debugging visibility |

### Result

- Clicking "Start Game" with "Random Mix" selected will actually start the game
- Any future `startGame` failures will show a visible error instead of silently doing nothing
- No changes to TV session creation, room management, or pairing flow needed -- those work correctly

