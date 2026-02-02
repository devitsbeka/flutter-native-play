
# Plan: Replace Avatar/Profile Info with "Add Round" Button

## Overview

Replace the player's avatar and date section with an "Add Round" button ("დაამატე რაუნდი") in collection cards. This affects both the collapsed card view and the expanded modal view.

---

## Technical Changes

### File: `src/components/social/MyTriviaTab.tsx`

#### Change 1: Collapsed Card - Replace Info Row (Lines 493-518)

Replace the avatar + profile + date section with an "Add Round" button:

**Current structure (Lines 493-518):**
- Avatar
- Profile nickname
- Date
- Expand/collapse chevron

**New structure:**
- "დაამატე რაუნდი" button (Add Round)
- Expand/collapse chevron

```typescript
{/* Info Row - BEFORE */}
<div className="p-4">
  <div className="flex items-center gap-3">
    {/* Avatar ... */}
    {/* Profile name + date ... */}
    {/* Expand chevron */}
  </div>
  {/* Stats ... */}
  {/* Publish button ... */}
</div>

{/* Info Row - AFTER */}
<div className="p-4">
  <div className="flex items-center gap-3">
    {/* Add Round Button */}
    <button
      onClick={(e) => {
        e.stopPropagation();
        onAddRound(collection.id, roundsCount + 1);
      }}
      className="flex-1 py-2.5 rounded-xl border-2 border-dashed border-muted-foreground/30 
                 bg-muted/30 hover:bg-muted/50 transition-colors 
                 flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
    >
      <Plus className="w-4 h-4" />
      <span className="text-sm font-medium">დაამატე რაუნდი</span>
    </button>
    {/* Expand/Collapse icon */}
    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
      {isExpanded ? (
        <ChevronUp className="w-5 h-5 text-muted-foreground" />
      ) : (
        <ChevronDown className="w-5 h-5 text-muted-foreground" />
      )}
    </div>
  </div>
  {/* Stats Row */}
  ...
  {/* Publish Button */}
  ...
</div>
```

---

#### Change 2: Expanded Modal (Desktop) - Replace Collection Info (Lines 325-350)

Replace the avatar + profile section in the expanded modal with the "Add Round" button:

**Current structure (Lines 325-350):**
- Avatar
- Profile nickname
- Date  
- Visibility badge with rounds count

**New structure:**
- "დაამატე რაუნდი" button
- Visibility badge with rounds count

```typescript
{/* Collection Info - AFTER */}
<div className="p-4 border-b border-border">
  <div className="flex items-center gap-3">
    {/* Add Round Button */}
    <button
      onClick={(e) => {
        e.stopPropagation();
        onAddRound(collection.id, (quizzes?.length || roundsCount) + 1);
      }}
      className="flex-1 py-2.5 rounded-xl border-2 border-dashed border-muted-foreground/30 
                 bg-muted/30 hover:bg-muted/50 transition-colors 
                 flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
    >
      <Plus className="w-4 h-4" />
      <span className="text-sm font-medium">დაამატე რაუნდი</span>
    </button>
    {/* Visibility badge */}
    <div className="bg-muted rounded-full h-8 px-3 text-xs text-muted-foreground flex items-center gap-1.5">
      {collection.is_public ? (
        <Globe className="w-3.5 h-3.5" aria-hidden />
      ) : (
        <Lock className="w-3.5 h-3.5" aria-hidden />
      )}
      <span>{roundsCount} რაუნდი</span>
    </div>
  </div>
  {/* Stats Row remains */}
  ...
</div>
```

---

## Summary

| Location | Line Range | Change |
|----------|------------|--------|
| Collapsed card info row | Lines 495-518 | Remove avatar/profile/date, add "დაამატე რაუნდი" button |
| Expanded modal info section | Lines 327-350 | Remove avatar/profile/date, add "დაამატე რაუნდი" button |

---

## Expected Result

- **Collapsed cards**: Show "დაამატე რაუნდი" button + expand chevron instead of avatar/name/date
- **Expanded modal (desktop)**: Show "დაამატე რაუნდი" button + rounds count badge instead of avatar/name/date
- Stats row (likes, saves, plays) remains visible below the button
- Publish button remains at the bottom
