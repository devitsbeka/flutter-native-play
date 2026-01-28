
# Plan: Fix Click Interception on "დამატება" Button in InviteFriendsModal

## Problem Identified

The "დამატება" (Add) button in the `InviteFriendsModal` cannot be clicked. The root cause is **the decorative backdrop elements intercept all click events** before they reach the buttons.

## Root Cause Analysis

```text
DOM Structure (current):
┌─────────────────────────────────────────────────────────────┐
│  Modal Container (fixed inset-0, z-[9999])                  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Backdrop (absolute inset-0, NO z-index)             │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  Blur Circle 1 (catches clicks!)              │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  Blur Circle 2 (catches clicks!)              │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Content Area (z-10)                                 │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  Search Results                                │  │  │
│  │  │  ┌───────────────────────────────────────────┐ │  │  │
│  │  │  │  "დამატება" Button (should receive click) │ │  │  │
│  │  │  └───────────────────────────────────────────┘ │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Problem:** The backdrop container has `absolute inset-0` covering the entire screen. Even though it appears "behind" the content visually (because content has `z-10`), the backdrop parent container still captures pointer events and prevents them from reaching the content below.

## Solution

Add `pointer-events-none` to the decorative backdrop container so it only provides visual decoration without intercepting click events.

### File: `src/components/team/InviteFriendsModal.tsx`

**Change at line 295:**

Before:
```tsx
{/* Purple backdrop with soft glow */}
<div className="absolute inset-0">
```

After:
```tsx
{/* Purple backdrop with soft glow */}
<div className="absolute inset-0 pointer-events-none">
```

This single change will make the entire decorative backdrop layer pass through all pointer events to the actual interactive content below.

---

## Summary

| File | Line | Change |
|------|------|--------|
| `src/components/team/InviteFriendsModal.tsx` | 295 | Add `pointer-events-none` to backdrop container |

---

## Why This Works

- `pointer-events-none` makes an element "invisible" to mouse/touch events
- Events will pass through the decorative layer and reach the buttons below
- The visual appearance remains exactly the same (soft purple glow effects)
- Content with `z-10` will properly receive all interactions

---

## Testing Checklist

1. Open the "მეგობრების მოწვევა" modal from team/rooms page
2. Type at least 2 characters in the search box
3. Click the "დამატება" button on any search result
4. Verify the friend request is sent and button changes to "გაგზავნილი"
5. Verify all other buttons work (share options, back button, copy link)
