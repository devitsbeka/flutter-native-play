

# Fix Back Button Navigation in ControllerPollScreen

## Problem

The back button in the poll-suggest phase (shown in the screenshot with categories like "ქართული ლიტერატურა", "მეცნიერება", etc.) does not navigate to the rooms page (`/team`) when clicked.

**Root Cause**: The current implementation uses `window.history.state && window.history.state.idx > 0` to check if there's navigation history. This check can fail because:
1. When users enter via notifications, QR codes, or direct links, `window.history.state.idx` is often 0 or undefined
2. Different browsers and navigation patterns handle history state inconsistently

## Solution

Replace the unreliable history state check with direct navigation to `/team`. Since the user's expected behavior is always to go back to the rooms page when clicking the back button in the TV Host Controller, we should navigate directly there instead of relying on browser history.

---

## Technical Changes

### File: `src/components/controller/ControllerPollScreen.tsx`

**Lines 68-74** - Replace the `handleBack` function:

**Current:**
```tsx
const handleBack = () => {
  if (window.history.state && window.history.state.idx > 0) {
    window.history.back();
  } else {
    navigate('/team', { replace: true });
  }
};
```

**Change to:**
```tsx
const handleBack = () => {
  // Always navigate to /team - the rooms page
  // Using replace: true prevents building up navigation history
  navigate('/team', { replace: true });
};
```

This simplifies the logic and ensures consistent behavior - clicking back always takes the host to the rooms page.

---

### File: `src/pages/TVHostController.tsx`

**Lines 867-872** - Also update the lobby phase back button for consistency:

**Current:**
```tsx
onClick={() => {
  if (window.history.state && window.history.state.idx > 0) {
    window.history.back();
  } else {
    navigate('/team', { replace: true });
  }
}}
```

**Change to:**
```tsx
onClick={() => navigate('/team', { replace: true })}
```

---

## Summary

| File | Location | Change |
|------|----------|--------|
| `src/components/controller/ControllerPollScreen.tsx` | Lines 68-74 | Simplify `handleBack` to always navigate to `/team` |
| `src/pages/TVHostController.tsx` | Lines 867-872 | Simplify lobby back button to always navigate to `/team` |

## Expected Outcome

After this change:
- Clicking the back button (chevron left) in the poll-suggest screen will reliably navigate to `/team` (rooms page)
- The same applies to the lobby phase back button
- No more failed navigation attempts when history state is missing or invalid

