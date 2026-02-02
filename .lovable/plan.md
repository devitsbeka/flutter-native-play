
# Plan: Fix Logo, Flag Display, and Screen-Specific Visibility

## Overview

Based on the screenshots and analysis, there are 3 distinct issues to fix:

1. **Logo breaks to two lines** - Ensure "MyTrivia LIVE" always stays on one line
2. **Remove flags from desktop/tablet username sections** - Flags should NOT appear next to username on tablet and desktop screens
3. **Keep flag on mobile only** - Mobile should show the rectangular FlagIcon (same style as sidebar bottom)

---

## Screen Breakdown

Understanding the Tailwind breakpoints used in `Index.tsx`:
- **Mobile**: `md:hidden` (screens < 768px)
- **Tablet**: `hidden md:flex xl:hidden` (768px ≤ screen < 1280px)
- **Desktop**: `hidden xl:flex` (screens ≥ 1280px)

---

## Technical Changes

### File 1: `src/pages/Index.tsx`

#### Change 1: Remove FlagIcon from tablet section (md to xl)

**Lines 834-841** - Remove the FlagIcon from the tablet user info section:

```typescript
// BEFORE (Lines 834-841):
<div className="flex items-center justify-center gap-2.5">
  {profile?.country_code && (
    <FlagIcon countryCode={profile.country_code} size="md" />
  )}
  <span className="font-sans text-gray-800 capitalize font-black" style={{ fontSize: 32 }}>
    {profile?.nickname || t("game.guest")}
  </span>
</div>

// AFTER:
<div className="flex items-center justify-center gap-2.5">
  <span className="font-sans text-gray-800 capitalize font-black" style={{ fontSize: 32 }}>
    {profile?.nickname || t("game.guest")}
  </span>
</div>
```

#### Change 2: Remove FlagIcon from another tablet-ish section (with power-ups)

**Lines 744-751** - This section is for `md to xl` with `lg:hidden` action buttons (smaller tablets):

```typescript
// BEFORE (Lines 744-751):
<div className="flex items-center justify-center gap-2.5">
  {profile?.country_code && (
    <FlagIcon countryCode={profile.country_code} size="md" />
  )}
  <span className="font-sans text-gray-800 capitalize font-black" style={{ fontSize: 28 }}>
    {profile?.nickname || t("game.guest")}
  </span>
</div>

// AFTER:
<div className="flex items-center justify-center gap-2.5">
  <span className="font-sans text-gray-800 capitalize font-black" style={{ fontSize: 28 }}>
    {profile?.nickname || t("game.guest")}
  </span>
</div>
```

#### Change 3: Remove FlagIcon from desktop section (xl+)

**Lines 1109-1116** - Remove the FlagIcon from the desktop (xl+) user info section:

```typescript
// BEFORE (Lines 1109-1116):
<div className="flex items-center justify-center gap-2.5">
  {profile?.country_code && (
    <FlagIcon countryCode={profile.country_code} size="md" />
  )}
  <span className="font-slackey text-gray-800 capitalize font-black" style={{ fontSize: 32 }}>
    {profile?.nickname || t("game.guest")}
  </span>
</div>

// AFTER:
<div className="flex items-center justify-center gap-2.5">
  <span className="font-slackey text-gray-800 capitalize font-black" style={{ fontSize: 32 }}>
    {profile?.nickname || t("game.guest")}
  </span>
</div>
```

#### Change 4: Keep FlagIcon on mobile section (md:hidden)

The mobile section at lines around 1100 already has a mobile-only layout with `md:hidden`. We need to verify there IS a FlagIcon here for the mobile username. Looking at the code, the mobile section is at lines 885-1070 with class `md:hidden`.

Need to add FlagIcon to the mobile section if it doesn't exist in the user info area for mobile.

---

### File 2: `src/components/shared/MyTriviaLiveLogo.tsx`

#### Change: Ensure logo never wraps

The component already has `flex-nowrap` on the container. Add `shrink-0` to prevent the badge from shrinking and causing a wrap:

```typescript
// BEFORE (Line 54):
<span className="flex items-center" style={{ marginTop: '-2px' }}>

// AFTER:
<span className="flex items-center shrink-0" style={{ marginTop: '-2px' }}>
```

Also ensure the entire container has `shrink-0`:

```typescript
// BEFORE (Line 42):
<div className={`flex items-center gap-2 flex-nowrap ${className}`}>

// AFTER:
<div className={`flex items-center gap-2 flex-nowrap shrink-0 ${className}`}>
```

---

## Summary Table

| Screen | Flag Display | Location |
|--------|--------------|----------|
| Mobile (<768px) | ✅ Show FlagIcon | Next to username in mobile section |
| Tablet (768px-1279px) | ❌ Remove | Was showing, now removed |
| Desktop (≥1280px) | ❌ Remove | Was showing, now removed |

| Logo Fix | Change |
|----------|--------|
| Prevent wrapping | Add `shrink-0` to container and badge span |

---

## Visual Result

**Desktop/Tablet (After):**
```text
      [Avatar Circle]
      
         მაკო          ← Just username, no flag
      1.4M   167       ← Coins and gems
```

**Mobile (After):**
```text
      [Avatar Circle]
      
    [🇬🇪] მაკო         ← Rectangular flag + username
      1.4M   167       ← Coins and gems
```

**Logo (After):**
```text
MyTrivia [LIVE]        ← Always stays on one line, never wraps
```
