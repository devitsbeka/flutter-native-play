
# Fix TV Screens Category Icon Display

## Problem
On TV screens before a round begins (Countdown and Round Intro screens), category icons sometimes display as raw text (e.g., "khachapuri ქართული სამზარეულო") instead of the actual icon graphic. This happens because:

1. **TVCountdownScreenV2** renders `categoryIcon` as plain text inside a `<span>`
2. **TVRoundIntroScreen** doesn't render any icon at all

## Solution
Replace raw text rendering with the `AppIcon` component that properly handles icon slugs and shows nothing when no valid icon exists.

---

## Changes

### 1. TVCountdownScreenV2.tsx

**Current code (line 62-65):**
```tsx
<div className="flex items-center gap-3 text-white text-2xl font-bold">
  {categoryIcon && <span className="text-3xl">{categoryIcon}</span>}
  <span>{categoryName}</span>
</div>
```

**Updated code:**
```tsx
<div className="flex items-center gap-3 text-white text-2xl font-bold">
  <AppIcon slug={categoryIcon} size={40} hideIfEmpty />
  <span>{categoryName}</span>
</div>
```

- Import `AppIcon` from `@/components/shared/AppIcon`
- Use `hideIfEmpty` so if no valid icon slug exists, nothing is shown (not even a placeholder)

---

### 2. TVRoundIntroScreen.tsx

**Current code (lines 17-22):**
```tsx
const { 
  players, 
  categoryName, 
  roundNumber,
  totalRounds,
} = useTVGame();
```

**Updated to include categoryIcon:**
```tsx
const { 
  players, 
  categoryName, 
  categoryIcon,
  roundNumber,
  totalRounds,
} = useTVGame();
```

**Current category display (lines 59-69):**
```tsx
<motion.div
  initial={{ opacity: 0, scale: 0.8 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
  className="mb-10 flex flex-col items-center"
>
  <h2 className="text-2xl sm:text-3xl font-bold text-white text-center">
    {categoryName || 'კატეგორია'}
  </h2>
</motion.div>
```

**Updated with icon:**
```tsx
<motion.div
  initial={{ opacity: 0, scale: 0.8 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
  className="mb-10 flex flex-col items-center gap-4"
>
  <AppIcon slug={categoryIcon} size={80} hideIfEmpty />
  <h2 className="text-2xl sm:text-3xl font-bold text-white text-center">
    {categoryName || 'კატეგორია'}
  </h2>
</motion.div>
```

- Import `AppIcon` from `@/components/shared/AppIcon`
- Add `categoryIcon` to destructured context values
- Add `gap-4` to container for spacing between icon and text
- Display icon above the category name with `hideIfEmpty` to show nothing if invalid

---

## File Changes Summary

| File | Change |
|------|--------|
| `src/components/tv/TVCountdownScreenV2.tsx` | Import AppIcon, replace `<span>{categoryIcon}</span>` with `<AppIcon>` |
| `src/components/tv/TVRoundIntroScreen.tsx` | Import AppIcon, add `categoryIcon` from context, add icon above category name |

---

## Result

After these changes:
- Valid icon slugs (e.g., "khachapuri", "sports") will render as proper graphics from the icon library
- Invalid or missing icons will show nothing (clean UI, no text fallback)
- Both Countdown and Round Intro screens will have consistent icon rendering behavior
