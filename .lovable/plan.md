

# Plan: Update Play Button Style with Played State Indicator

## Summary

Change the "ითამაშე" (Play) button to show only a play icon, with visual distinction between played and unplayed trivias.

---

## Visual Design

| State | Background | Border | Icon Color |
|-------|------------|--------|------------|
| **Not Played** | Purple filled (`bg-purple-500`) | None | White |
| **Already Played** | Transparent | Purple (`border-purple-500`) | Purple |

**Current:** 
```text
┌──────────────────┐
│ ▷ ითამაშე        │  ← Outlined, with text
└──────────────────┘
```

**After (Not Played):**
```text
┌────┐
│ ▷  │  ← Filled purple, white icon, no text
└────┘
```

**After (Already Played):**
```text
┌────┐
│ ▷  │  ← Outlined, purple icon, no text
└────┘
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/social/PlayerFeedItem.tsx` | Add `isPlayed` prop, update button styling |
| `src/components/social/TriviaPortfolioCard.tsx` | Update button styling based on `isPlayed` |
| `src/components/social/CreatorPortfolioCard.tsx` | Pass `userPlays` to `TriviaPortfolioCard` |
| `src/components/social/ExplorePortfolioFeed.tsx` | Get `userPlays` from hook and pass to components |

---

## Technical Implementation

### 1. ExplorePortfolioFeed.tsx

Extract `userPlays` from `useSocialFeed` hook and pass it to child components:

```typescript
const { userLikes, userSaves, userPlays, toggleLike, toggleSave } = useSocialFeed();
```

Pass to `PlayerFeedItem`:
```typescript
isPlayed={userPlays.includes(feedItem.item.id)}
```

Pass to `CreatorPortfolioCard`:
```typescript
userPlays={userPlays}
```

### 2. PlayerFeedItem.tsx

Add `isPlayed` prop:
```typescript
interface PlayerFeedItemProps {
  // ... existing props
  isPlayed?: boolean;
}
```

Update button to icon-only with dynamic styling:
```typescript
<button 
  onClick={handlePlayClick}
  className={cn(
    "w-9 h-9 rounded-full flex items-center justify-center transition-colors",
    isPlayed 
      ? "bg-transparent border-2 border-purple-500" 
      : "bg-purple-500 hover:bg-purple-600"
  )}
>
  <Play className={cn(
    "w-4 h-4",
    isPlayed ? "text-purple-500" : "text-white"
  )} />
</button>
```

### 3. TriviaPortfolioCard.tsx

Update the existing button styling (already has `isPlayed` prop):
```typescript
<button 
  onClick={handlePlayClick}
  className={cn(
    "w-9 h-9 rounded-full flex items-center justify-center transition-colors",
    isPlayed 
      ? "bg-transparent border-2 border-purple-500" 
      : "bg-purple-500 hover:bg-purple-600"
  )}
>
  <Play className={cn(
    "w-4 h-4",
    isPlayed ? "text-purple-500" : "text-white"
  )} />
</button>
```

### 4. CreatorPortfolioCard.tsx

Add `userPlays` prop to interface:
```typescript
interface CreatorPortfolioCardProps {
  // ... existing props
  userPlays?: string[];
}
```

Pass to `TriviaPortfolioCard`:
```typescript
isPlayed={userPlays.includes(trivia.id)}
```

---

## Data Flow

```text
useSocialFeed() hook
    ↓
Returns userPlays[] (list of played trivia IDs)
    ↓
ExplorePortfolioFeed
    ↓
┌─────────────────────────────────────┐
│ PlayerFeedItem                      │  ← isPlayed={userPlays.includes(id)}
│ CreatorPortfolioCard                │  ← userPlays={userPlays}
│   └─ TriviaPortfolioCard            │  ← isPlayed={userPlays.includes(id)}
└─────────────────────────────────────┘
```

---

## Expected Result

When scrolling through the Explore feed:
- **Unplayed trivias**: Purple filled circle with white play icon (inviting action)
- **Played trivias**: Purple outlined circle with purple play icon (indicates already played)

This provides instant visual feedback for users to identify which trivias they've already completed.

