
# Plan: Show Flag on All Screen Sizes & Make Username Bolder

## Overview

Based on the screenshots:
1. **Show FlagIcon on all screens** - Remove `md:hidden` so the rectangular flag shows on mobile, tablet, and desktop
2. **Make username font the boldest** - Change from `font-bold` (700) to `font-black` (900)

---

## File: `src/pages/Index.tsx`

### Location 1: Lines 744-750 (User with power-ups section)

```typescript
// Before:
{profile?.country_code && (
  <FlagIcon countryCode={profile.country_code} size="md" className="md:hidden" />
)}
<span className="font-sans text-gray-800 capitalize font-bold" style={{ fontSize: 28 }}>
  {profile?.nickname || t("game.guest")}
</span>

// After:
{profile?.country_code && (
  <FlagIcon countryCode={profile.country_code} size="md" />
)}
<span className="font-sans text-gray-800 capitalize font-black" style={{ fontSize: 28 }}>
  {profile?.nickname || t("game.guest")}
</span>
```

### Location 2: Lines 834-840 (Desktop/tablet section)

```typescript
// Before:
{profile?.country_code && (
  <FlagIcon countryCode={profile.country_code} size="md" className="md:hidden" />
)}
<span className="font-sans text-gray-800 capitalize font-bold" style={{ fontSize: 32 }}>
  {profile?.nickname || t("game.guest")}
</span>

// After:
{profile?.country_code && (
  <FlagIcon countryCode={profile.country_code} size="md" />
)}
<span className="font-sans text-gray-800 capitalize font-black" style={{ fontSize: 32 }}>
  {profile?.nickname || t("game.guest")}
</span>
```

### Location 3: Lines 1109-1115 (Another user section)

```typescript
// Before:
{profile?.country_code && (
  <FlagIcon countryCode={profile.country_code} size="md" className="md:hidden" />
)}
<span className="font-slackey text-gray-800 capitalize" style={{ fontSize: 32 }}>
  {profile?.nickname || t("game.guest")}
</span>

// After:
{profile?.country_code && (
  <FlagIcon countryCode={profile.country_code} size="md" />
)}
<span className="font-slackey text-gray-800 capitalize font-black" style={{ fontSize: 32 }}>
  {profile?.nickname || t("game.guest")}
</span>
```

---

## Summary of Changes

| Change | Before | After |
|--------|--------|-------|
| FlagIcon visibility | `className="md:hidden"` (hidden on tablet/desktop) | No className (visible everywhere) |
| Username font weight | `font-bold` (700) | `font-black` (900) - the boldest |

---

## Visual Result

**Before:**
```text
Mobile:    [🇬🇪] მაკო   ← flag visible, font-bold
Tablet:    მაკო         ← flag hidden, font-bold  
Desktop:   მაკო         ← flag hidden, font-bold
```

**After:**
```text
Mobile:    [🇬🇪] მაკო   ← flag visible, font-black (boldest)
Tablet:    [🇬🇪] მაკო   ← flag visible, font-black (boldest)
Desktop:   [🇬🇪] მაკო   ← flag visible, font-black (boldest)
```

The rectangular flag icon will now appear consistently across all screen sizes, matching the menu page style.
