

# Plan: UI Cleanup for Collection Cards

## Overview

Based on the screenshot, the user wants to:
1. Remove the top "+ დაამატე რაუნდი" button - keep only the bottom one
2. Increase icons and stat number font sizes by 15%
3. Remove the duplicate play button on quiz cards - keep only one that opens the game

---

## Technical Changes

### File: `src/components/social/MyTriviaTab.tsx`

#### Change 1: Remove Top "Add Round" Button from Expanded Modal (Lines 327-351)

Replace the "Add Round" button row with just the visibility badge:

**Current (Lines 325-351):**
```typescript
<div className="p-4 border-b border-border">
  <div className="flex items-center gap-3">
    {/* Add Round Button */}
    <button ... >დაამატე რაუნდი</button>
    {/* Visibility badge */}
    <div className="bg-muted ...">
      {roundsCount} რაუნდი
    </div>
  </div>
  {/* Stats Row */}
  ...
</div>
```

**New:**
```typescript
<div className="p-4 border-b border-border">
  <div className="flex items-center justify-between">
    {/* Stats Row - moved up and increased size */}
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <img src={purpleHeart3d} alt="Likes" className="w-5 h-5 object-contain" />
        <span className="font-medium">{collection.likes_count || 0}</span>
      </div>
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <img src={bookmark3d} alt="Saves" className="w-5 h-5 object-contain" />
        <span className="font-medium">{collection.saves_count || 0}</span>
      </div>
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <img src={pushButton3d} alt="Plays" className="w-5 h-5 object-contain" />
        <span className="font-medium">{collection.plays_count || 0}</span>
      </div>
    </div>
    {/* Visibility badge */}
    <div className="bg-muted rounded-full h-8 px-3 text-xs text-muted-foreground flex items-center gap-1.5">
      {collection.is_public ? <Globe /> : <Lock />}
      <span>{roundsCount} რაუნდი</span>
    </div>
  </div>
</div>
```

---

#### Change 2: Remove Top "Add Round" Button from Collapsed Card (Lines 494-518)

Replace the "Add Round" button + chevron with just stats + chevron:

**Current (Lines 494-518):**
```typescript
<div className="p-4">
  <div className="flex items-center gap-3">
    {/* Add Round Button */}
    <button ...>დაამატე რაუნდი</button>
    {/* Chevron */}
    <div className="w-8 h-8 ...">
      <ChevronDown />
    </div>
  </div>
  {/* Stats Row */}
  <div className="flex items-center gap-3 mt-3">...</div>
  ...
</div>
```

**New:**
```typescript
<div className="p-4">
  <div className="flex items-center justify-between">
    {/* Stats Row - increased size */}
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <img src={purpleHeart3d} alt="Likes" className="w-5 h-5 object-contain" />
        <span className="font-medium">{collection.likes_count || 0}</span>
      </div>
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <img src={bookmark3d} alt="Saves" className="w-5 h-5 object-contain" />
        <span className="font-medium">{collection.saves_count || 0}</span>
      </div>
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <img src={pushButton3d} alt="Plays" className="w-5 h-5 object-contain" />
        <span className="font-medium">{collection.plays_count || 0}</span>
      </div>
    </div>
    {/* Chevron */}
    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
      {isExpanded ? <ChevronUp /> : <ChevronDown />}
    </div>
  </div>
  {/* Publish button row */}
  ...
</div>
```

---

#### Change 3: Remove Duplicate Play Button from CollectionQuizCard (Lines 140-186)

Currently there are 2 play buttons:
1. Purple play icon at top right (line 140-150)
2. ChunkyButton with play icon at bottom right (lines 177-186)

Remove the ChunkyButton (second play button) and keep only the top-right purple icon.

**Delete lines 177-186:**
```typescript
// DELETE THIS:
<div onClick={(e) => e.stopPropagation()}>
  <ChunkyButton
    size="sm"
    variant="outline"
    className="text-xs px-2 py-1 h-7"
    onClick={() => navigate(`/trivia/${quiz.id}`)}
  >
    <Play className="w-3 h-3" />
  </ChunkyButton>
</div>
```

**Update the remaining play button to navigate to game** (line 140-150):
```typescript
{/* Play button (purple) - opens game */}
<button
  onClick={(e) => {
    e.stopPropagation();
    onPlay?.(quiz);
  }}
  className="absolute top-0 right-0 p-2 rounded-full hover:bg-muted transition-colors text-purple-500 border border-purple-200 bg-white"
  aria-label="Play trivia"
>
  <Play className="w-4 h-4 fill-current" />
</button>
```

---

#### Change 4: Increase Quiz Card Icon & Font Sizes by 15% (Lines 162-175)

**Current (Lines 162-175):**
- Icons: `w-[19px] h-[19px]`
- Text: `text-[13px]`

**New (15% larger):**
- Icons: `w-[22px] h-[22px]` (19 × 1.15 ≈ 22)
- Text: `text-[15px]` (13 × 1.15 ≈ 15)

```typescript
<div className="flex items-center gap-4 text-[15px]">
  <div className="flex items-center gap-1">
    <img src={purpleHeart3d} alt="Likes" className="w-[22px] h-[22px] object-contain" />
    <span>{quiz.likes_count || 0}</span>
  </div>
  <div className="flex items-center gap-1">
    <img src={bookmark3d} alt="Saves" className="w-[22px] h-[22px] object-contain" />
    <span>{quiz.saves_count || 0}</span>
  </div>
  <div className="flex items-center gap-1">
    <img src={pushButton3d} alt="Plays" className="w-[22px] h-[22px] object-contain" />
    <span>{quiz.plays_count || 0}</span>
  </div>
</div>
```

---

## Summary

| Location | Change |
|----------|--------|
| Expanded modal (desktop) | Remove top "+ დაამატე რაუნდი" button, move stats up, increase sizes |
| Collapsed card (mobile) | Remove top "+ დაამატე რაუნდი" button, move stats up with chevron, increase sizes |
| CollectionQuizCard | Remove duplicate ChunkyButton play button, keep only purple icon |
| CollectionQuizCard stats | Increase icon size: 19px → 22px, font: 13px → 15px |

---

## Expected Result

- Only one "Add Round" button at the bottom of the quizzes list
- Stats (likes, saves, plays) shown prominently with larger icons (22px) and text (15px)
- Single purple play button per quiz card that starts the game
- Cleaner, less cluttered UI

