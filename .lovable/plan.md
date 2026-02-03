
# Plan: Fix Results Screen Button Display for Host/Non-Host

## Problem Summary

After the first round ends, both host and non-host players see the same "გაგრძელება" (Continue) button with the queue preview. The expected behavior is:
- **Host**: Should see "კატეგორიის დამატება" button that opens the category picker
- **Non-host**: Should see "ველოდებით ჰოსტს" (Waiting for host) message

## Root Cause Analysis

The code in `GameResultsScreenV2.tsx` (lines 508-539) has the correct conditional structure:

```tsx
{isHost ? (
  // Host buttons
) : (
  // Non-host waiting message
)}
```

However, there are two issues:

1. **Button logic issue**: The host currently sees "გაგრძელება" when queue has items, but user wants "კატეგორიის დამატება" (open picker) always
2. **isHost detection issue**: The `isHost` value might be returning `true` for non-host users due to a potential state timing issue

## Solution

### Change 1: Update Host Button to Always Show "კატეგორიის დამატება"

Modify the host section to always show the category picker button instead of auto-continuing:

```tsx
// Before (lines 508-533)
{isHost ? (
  queue.length > 0 ? (
    <ChunkyButton onClick={handlePlayAgain}>გაგრძელება</ChunkyButton>
  ) : (
    <ChunkyButton onClick={() => setShowCategoryPicker(true)}>აირჩიე კატეგორია</ChunkyButton>
  )
) : (...)}

// After
{isHost ? (
  <ChunkyButton onClick={() => setShowCategoryPicker(true)}>
    კატეგორიის დამატება
  </ChunkyButton>
) : (...)}
```

### Change 2: Add Debug Logging for isHost Detection

To diagnose why non-host might see the wrong button, add temporary console logging in the component to verify values:

```tsx
// Temporary debug (can be removed after fix verified)
console.log('[Results] isHost:', isHost, 'currentRoom?.host_user_id:', currentRoom?.host_user_id, 'user?.id:', user?.id);
```

### Change 3: Ensure isHost is Properly Computed

The context computes `isHost` as:
```tsx
const isHost = state.currentRoom?.host_user_id === user?.id;
```

This relies on `user?.id` from AuthContext being available. If auth state is loading or temporarily undefined, `isHost` could incorrectly be `false` (or if both are `undefined`, it might be `true`).

Add a fallback check to ensure proper comparison:

```tsx
// In GameResultsScreenV2.tsx, add explicit host check
const { user } = useAuth();
const effectiveIsHost = isHost && user?.id && currentRoom?.host_user_id === user.id;
```

---

## File Changes

| File | Changes |
|------|---------|
| `src/components/team/GameResultsScreenV2.tsx` | 1. Remove queue-based button logic for host, always show "კატეგორიის დამატება"<br>2. Add explicit `user` check for host detection<br>3. Simplify the button conditional |

---

## Updated Button Logic

```text
Host:
  → "კატეგორიის დამატება" button → opens CategoryPickerModal

Non-Host:
  → "ველოდებით ჰოსტს" waiting message (already correct in code)
```

---

## Queue Preview Section

The "შემდეგი რაუნდი:" (Next round) preview can remain visible for both users if desired, as it shows what's coming up. Only the action button differs.

---

## Testing Checklist

- Host sees "კატეგორიის დამატება" button on results screen
- Non-host sees "ველოდებით ჰოსტს" waiting message
- Host can click button to open category picker
- Non-host cannot start a game from results screen
- Both can still use "ოთახში დაბრუნება" (Back to room) button

