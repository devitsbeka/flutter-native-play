
# Plan: Fix Logo Line Break, Remove Flag Rounding, Hide Flag on Desktop

## Overview

Three issues to fix based on the screenshots:
1. Logo "MyTrivia" and "LIVE" badge are breaking onto two lines - need to keep on single line
2. Flag icon has rounded corners that should be removed  
3. On tablet/desktop, the flag appears next to username but is redundant since it's already shown in the left sidebar

---

## Issue 1: Fix Logo Breaking to Two Lines

### Root Cause
The logo container allows flex wrapping, causing the text and badge to break onto separate lines when space is constrained.

### File: `src/components/shared/MyTriviaLiveLogo.tsx`

**Line 42** - Add `flex-nowrap` and `whitespace-nowrap` to prevent wrapping:

```typescript
// Before:
<div className={`flex items-center gap-2 ${className}`}>

// After:
<div className={`flex items-center gap-2 flex-nowrap ${className}`}>
```

**Line 43-52** - Add `whitespace-nowrap` to the text span:

```typescript
// Before:
<span 
  className={`font-slackey ${colorClass} leading-none`}
  ...
>

// After:
<span 
  className={`font-slackey ${colorClass} leading-none whitespace-nowrap`}
  ...
>
```

---

## Issue 2: Remove Rounded Corners from Flag

### File: `src/components/shared/FlagIcon.tsx`

**Line 22** - Remove `rounded-sm` class:

```typescript
// Before:
className={cn(sizeClasses[size], "rounded-sm object-cover", className)}

// After:
className={cn(sizeClasses[size], "object-cover", className)}
```

---

## Issue 3: Hide Flag on Tablet/Desktop

The flag is shown in the left sidebar on tablet/desktop, so it's redundant next to the username.

### File: `src/pages/Index.tsx`

**Lines 744-747** - Add `md:hidden` to hide flag on tablet and desktop:

```typescript
// Before:
<div className="flex items-center justify-center gap-2.5">
  {profile?.country_code && (
    <FlagIcon countryCode={profile.country_code} size="md" />
  )}
  
// After:
<div className="flex items-center justify-center gap-2.5">
  {profile?.country_code && (
    <FlagIcon countryCode={profile.country_code} size="md" className="md:hidden" />
  )}
```

---

## Summary

| Issue | File | Change |
|-------|------|--------|
| Logo wrapping | `MyTriviaLiveLogo.tsx` | Add `flex-nowrap` and `whitespace-nowrap` |
| Flag rounded corners | `FlagIcon.tsx` | Remove `rounded-sm` class |
| Flag visible on desktop | `Index.tsx` | Add `md:hidden` to FlagIcon |

---

## Visual Result

**Logo - Before:**
```text
MyTrivia
[LIVE]
```

**Logo - After:**
```text
MyTrivia [LIVE]
```

**Flag - Before:**
```text
[🇬🇪] მაკო  ← visible on all screens, with rounded corners
```

**Flag - After:**
```text
მაკო           ← hidden on tablet/desktop (flag in sidebar)
[🇬🇪] მაკო     ← visible on mobile only, no rounded corners
```
