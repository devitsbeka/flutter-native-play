

# Plan: Replace Stats with Collection Badge

## Overview

Replace the stats icons and numbers (likes, saves, plays) at the top of collection cards with a collection badge that displays the Layers icon and "კოლექცია" text, similar to the badge already shown on the cover image.

---

## Technical Changes

### File: `src/components/social/MyTriviaTab.tsx`

#### Change 1: Expanded Modal (Desktop) - Replace Stats with Collection Badge (Lines 314-339)

Replace the stats row with a collection badge:

**Current (Lines 314-339):**
```typescript
<div className="p-4 border-b border-border">
  <div className="flex items-center justify-between">
    {/* Stats Row */}
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <img src={purpleHeart3d} ... />
        <span>{collection.likes_count || 0}</span>
      </div>
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <img src={bookmark3d} ... />
        <span>{collection.saves_count || 0}</span>
      </div>
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <img src={pushButton3d} ... />
        <span>{collection.plays_count || 0}</span>
      </div>
    </div>
    {/* Visibility badge */}
    <div className="bg-muted rounded-full h-8 px-3 ...">
      {roundsCount} რაუნდი
    </div>
  </div>
</div>
```

**New:**
```typescript
<div className="p-4 border-b border-border">
  <div className="flex items-center justify-between">
    {/* Collection Badge */}
    <div className="flex items-center gap-2 bg-purple-500 text-white rounded-full px-3 py-1.5">
      <Layers className="w-4 h-4" />
      <span className="text-sm font-medium">კოლექცია</span>
    </div>
    {/* Visibility badge - unchanged */}
    <div className="bg-muted rounded-full h-8 px-3 text-xs text-muted-foreground flex items-center gap-1.5">
      {collection.is_public ? <Globe /> : <Lock />}
      <span>{roundsCount} რაუნდი</span>
    </div>
  </div>
</div>
```

---

#### Change 2: Collapsed Card (Mobile) - Replace Stats with Collection Badge (Lines 467-492)

Replace the stats row with a collection badge:

**Current (Lines 467-492):**
```typescript
<div className="p-4">
  <div className="flex items-center justify-between">
    {/* Stats Row */}
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1.5 ...">
        <img src={purpleHeart3d} ... />
        <span>{collection.likes_count || 0}</span>
      </div>
      <div className="flex items-center gap-1.5 ...">
        <img src={bookmark3d} ... />
        <span>{collection.saves_count || 0}</span>
      </div>
      <div className="flex items-center gap-1.5 ...">
        <img src={pushButton3d} ... />
        <span>{collection.plays_count || 0}</span>
      </div>
    </div>
    {/* Chevron */}
    <div className="w-8 h-8 rounded-full bg-muted ...">
      <ChevronUp/Down />
    </div>
  </div>
  ...
</div>
```

**New:**
```typescript
<div className="p-4">
  <div className="flex items-center justify-between">
    {/* Collection Badge */}
    <div className="flex items-center gap-2 bg-purple-500 text-white rounded-full px-3 py-1.5">
      <Layers className="w-4 h-4" />
      <span className="text-sm font-medium">კოლექცია</span>
    </div>
    {/* Chevron - unchanged */}
    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
      {isExpanded ? <ChevronUp /> : <ChevronDown />}
    </div>
  </div>
  ...
</div>
```

---

## Summary

| Location | Change |
|----------|--------|
| Expanded modal info row (Lines 316-328) | Replace stats icons/numbers with purple "კოლექცია" badge |
| Collapsed card info row (Lines 470-482) | Replace stats icons/numbers with purple "კოლექცია" badge |

---

## Expected Result

- Instead of showing 💜 0 🔖 0 🔘 0 stats at the top of collection cards
- Show a purple badge with the Layers icon and "კოლექცია" text
- The visibility badge (🔒 2 რაუნდი) and expand chevron remain unchanged
- Matches the design shown in the screenshot with the purple "კოლექცია" badge

