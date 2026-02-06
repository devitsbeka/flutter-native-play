
# Plan: Ensure Sticky Headers Have Proper Background Across App

## Problem
The `PageHeader` component has sticky positioning and `backdrop-blur-md` but is missing a background color. This causes content to show through the header when scrolling on pages that use `PageHeader` (like VIP, Profile, Settings pages).

## Solution
Update the `PageHeader` component to include a proper background color that matches the app's design system, similar to how other sticky headers in the app are implemented.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/shared/PageHeader.tsx` | Add background color + border to header |

---

## Technical Details

### Current Code (Line 33)
```tsx
<header className={`sticky top-0 z-20 backdrop-blur-md ${className}`}>
```

### Updated Code
```tsx
<header className={`sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/30 ${className}`}>
```

---

## Changes Explained

| Addition | Purpose |
|----------|---------|
| `bg-background/95` | Semi-transparent background that matches app theme (95% opacity for subtle content visibility) |
| `border-b border-border/30` | Subtle bottom border for visual separation from content |

---

## Pages That Will Benefit

These pages use `PageHeader` and will now have proper sticky headers:

- VIP (`/vip`)
- Profile (`/profile`)
- Settings pages (`/settings/*`)
- Support (`/support`)
- Privacy Policy / Terms pages
- Any other pages using `PageHeader`

---

## Already Working (No Changes Needed)

These pages have custom sticky headers already implemented correctly:

| Page | Implementation |
|------|----------------|
| Leaderboards | Custom sticky header with `bg-background/95 backdrop-blur-md` |
| PowerUps/Shop | Uses `ShopHeader` wrapped in sticky container |
| Discover | Custom sticky header with `bg-white/80 backdrop-blur-md shadow-sm` |
