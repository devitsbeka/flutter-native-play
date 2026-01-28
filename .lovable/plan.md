

# Plan: Fix "დაწყება" Button Not Working in Lobby

## Problem Summary

When clicking the "დაწყება" (Start Game) button in the lobby, nothing happens. The button appears active with correct text ("დაწყება (1 რაუნდი)") but clicking it doesn't start the game.

## Root Cause

This is a **function signature mismatch** bug introduced by the previous fix for `ControllerDirectSelection`.

The `handleStartGame` function signature was changed to accept an optional object:

```typescript
const handleStartGame = async (firstQueueItem?: { categoryId?: string; userTriviaId?: string }) => {
```

But the lobby button still uses:
```tsx
onClick={handleStartGame}
```

When a button's onClick fires, React passes the **MouseEvent** as the first argument. So `handleStartGame(event)` is called where `event` is a mouse event object.

Inside `handleStartGame`:
1. `firstQueueItem` receives the mouse event (which is truthy)
2. The check `if (firstQueueItem)` passes
3. `firstQueueItem.userTriviaId` is undefined (mouse events don't have this property)
4. `firstQueueItem.categoryId` is also undefined
5. Falls through to `toast.error('არასწორი რაუნდის ტიპი')` and returns early

The toast might be missed by the user, or the click happens so fast they don't see it.

## Solution

Wrap the onClick handler to call `handleStartGame()` without arguments, ensuring the mouse event is not passed:

### File: `src/pages/TVHostController.tsx`

**Line 1055 - Change:**

```tsx
// Before
onClick={handleStartGame}

// After
onClick={() => handleStartGame()}
```

This ensures that when the button is clicked:
1. The arrow function receives the mouse event but ignores it
2. `handleStartGame()` is called with no arguments
3. `firstQueueItem` is `undefined`
4. The fallback logic using `hasQueue && queue.length > 0` is executed correctly

---

## Technical Details

The `ChunkyButton` component types `onClick` as `() => void`, but the underlying `motion.button` still passes the event. The function signature mismatch causes the event to be interpreted as the first parameter.

By using an arrow function wrapper `() => handleStartGame()`, we explicitly call the function with zero arguments, bypassing this issue.

---

## Summary of Changes

| File | Line | Change |
|------|------|--------|
| `src/pages/TVHostController.tsx` | 1055 | Change `onClick={handleStartGame}` to `onClick={() => handleStartGame()}` |

---

## Why This Works Everywhere

After this fix:

1. **Lobby screen**: Button calls `handleStartGame()` → uses fallback logic with `hasQueue && queue.length > 0`
2. **ControllerDirectSelection**: Calls `onStartGame({ categoryId, userTriviaId })` → uses the passed object directly
3. **Category-select after round**: Same as DirectSelection
4. **Room creation flow**: Inherits the fix since it uses the same lobby logic

---

## Testing Checklist

1. Create new room with 1 category → Click "დაწყება" → Game starts
2. Complete a round → Add 2 more categories → Click "დაწყება" → Game starts
3. Use ControllerDirectSelection screen → Add categories → Click start → Game starts
4. Verify no toast error appears when clicking start button

