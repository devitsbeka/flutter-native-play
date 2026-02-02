
# Plan: Fix Logo Alignment + Convert Search Bar to Button

## Overview

Based on the screenshots, there are two issues to fix:
1. **Logo alignment** - The "MyTrivia" text and "LIVE" badge are not aligned horizontally (badge appears slightly lower)
2. **Search bar → Search button** - Replace the full search bar with just a search icon button, which expands to full search when clicked

---

## Issue 1: Fix Logo Horizontal Alignment

### Root Cause
The `LiveBadge` component has `boxShadow: '0 2px 0 #B91C1C'` which adds 2px visual offset at the bottom, making it appear lower than the text.

### Solution
Adjust the `MyTriviaLiveLogo` component to use `items-baseline` instead of `items-center`, and tweak the LiveBadge positioning.

### File: `src/components/shared/MyTriviaLiveLogo.tsx`

**Line 42** - Change alignment from `items-center` to `items-baseline` and add vertical adjustment:

```typescript
// Before:
<div className={`flex items-center gap-1.5 ${className}`}>

// After:
<div className={`flex items-center gap-1.5 ${className}`}>
  // ...text remains same
  <span className="self-center">
    <LiveBadge size={config.badgeSize} />
  </span>
```

Alternative approach - offset the badge slightly upward using a wrapper or margin.

### File: `src/components/social/LiveBadge.tsx`

Adjust the wrapper to compensate for the bottom shadow offset:

**Lines 18-21** - Add margin or transform to shift up:

```typescript
// Before:
<motion.span
  initial={{ opacity: 0, scale: 0.8 }}
  animate={{ opacity: 1, scale: 1 }}
  className="inline-flex items-center"
>

// After: Add slight negative margin to compensate for shadow
<motion.span
  initial={{ opacity: 0, scale: 0.8 }}
  animate={{ opacity: 1, scale: 1 }}
  className="inline-flex items-center"
  style={{ marginBottom: '2px' }}
>
```

---

## Issue 2: Convert Search Bar to Search Button

### Current Behavior
Full search bar is always visible on tablet/desktop

### Desired Behavior
- Show only a search icon button (like the notification bell)
- When clicked, open the full search dialog (CommandDialog)

### File: `src/components/search/SpotlightSearch.tsx`

Add a `variant` prop to support both modes:
- `"bar"` - current behavior (full search bar)
- `"button"` - just an icon button that opens the dialog

**Lines 35-37** - Add variant prop:

```typescript
interface SpotlightSearchProps {
  className?: string;
  variant?: "bar" | "button";
}
```

**Lines 189-213** - Conditionally render based on variant:

```typescript
return (
  <>
    {variant === "button" ? (
      // Button mode - just an icon
      <motion.button
        className={`relative p-2 rounded-full bg-white/40 backdrop-blur-sm border border-purple-900/10 hover:bg-white/50 transition-colors ${className}`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(true)}
      >
        <Search className="w-5 h-5 text-muted-foreground" />
        <kbd className="hidden lg:inline-flex absolute -bottom-1 -right-1 items-center gap-0.5 px-1 py-0.5 rounded bg-muted/80 text-[8px] font-medium text-muted-foreground border border-border/50">
          <Command className="w-2 h-2" />K
        </kbd>
      </motion.button>
    ) : (
      // Bar mode - current full search bar
      <motion.div
        className={`relative flex items-center gap-3 px-4 py-2 rounded-full h-[42px] w-full max-w-[750px] bg-white/40 backdrop-blur-sm border border-purple-900/10 ${className}`}
        whileHover={{ backgroundColor: "rgba(255,255,255,0.5)" }}
      >
        ...existing bar content...
      </motion.div>
    )}
    
    {/* Command Dialog - same as before */}
    <CommandDialog ...>
```

### File: `src/pages/Index.tsx`

Update the header to use the button variant for search:

**Lines 439-442** - Change SpotlightSearch usage:

```typescript
// Before:
{/* Spotlight Search Bar - Hidden on mobile */}
<div className="hidden md:flex flex-1">
  <SpotlightSearch />
</div>

// After: Use button variant positioned before notification bell
// Remove this from center section
```

**Lines 446-448** - Add search button before notification bell:

```typescript
{/* Right side: Search button + Notification */}
{user && (
  <div className="flex items-center gap-1">
    {/* Search button - tablet/desktop only */}
    <div className="hidden md:block">
      <SpotlightSearch variant="button" />
    </div>
    
    {/* Bell icon with unread badge */}
    <motion.button
      ...
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/components/social/LiveBadge.tsx` | Add 2px bottom margin to compensate for shadow offset |
| `src/components/search/SpotlightSearch.tsx` | Add `variant` prop supporting `"bar"` and `"button"` modes |
| `src/pages/Index.tsx` | Remove search bar from center, add search button before notification bell |

---

## Visual Result

**Before:**
```text
[Menu] | MyTrivia [LIVE↓] | [========= ძებნა... ⌘K =========] | [🔔]
                 ↑ badge lower
```

**After:**
```text
[Menu] | MyTrivia [LIVE] | [flex-1 empty space] | [🔍] [🔔]
                 ↑ aligned                         ↑ search button
```

When search button is clicked → Full CommandDialog opens (existing behavior)
