
# Plan: Smooth TV Poll Category Animation

## Problem Summary
When categories receive votes during the poll phase on the TV screen, the cards animate in a "dizzy" manner. The user wants:
1. **Smooth animations** - No jittery or chaotic movement when cards reorder
2. **Clicked categories slide to top** - Selected items should smoothly move to their new position
3. **Green border on selection** - Selected/voted categories should have a green stroke

## Root Cause Analysis

The current `SuggestionCard` component in `TVPollScreen.tsx` uses:

```typescript
<motion.div
  layout                    // ← Causes layout animations on reorder
  initial={{ opacity: 0, scale: 0.8 }}
  animate={{ 
    scale: isAnimating ? 1.05 : 1,
    transition: { type: 'spring', stiffness: 500, damping: 30 }  // ← Spring is too aggressive
  }}
  ...
/>
```

**Issues identified:**

| Problem | Cause |
|---------|-------|
| "Dizzy" movement | `layout` prop triggers animations on every vote count change, combined with `mode="popLayout"` which repositions elements |
| Spring too bouncy | `stiffness: 500` with `damping: 30` creates visible oscillation |
| No green stroke | Border color only checks `isLeader` (yellow) or default (white), no voted/selected state |
| No smooth slide to top | The reordering happens because suggestions are sorted by `vote_count`, but the animation isn't smooth enough |

## Solution

### 1. Improve Layout Animation Settings

Replace the aggressive spring animation with a smoother transition:

**Current (bouncy):**
```typescript
transition: { type: 'spring', stiffness: 500, damping: 30 }
```

**Fixed (smooth):**
```typescript
layout: { type: 'spring', stiffness: 350, damping: 40, mass: 1.2 }
```

The lower stiffness + higher damping + added mass creates a smoother, more controlled movement.

### 2. Add `layoutId` for Better Tracking

Use `layoutId` instead of just `layout` for proper element identity tracking during reordering:

```typescript
<motion.div
  layoutId={`suggestion-${suggestion.id}`}
  ...
/>
```

### 3. Change AnimatePresence Mode

Replace `mode="popLayout"` with `mode="sync"` to reduce jarring transitions:

```typescript
<AnimatePresence mode="sync">
```

### 4. Add Voted/Selected State with Green Border

Pass vote information to the TV's `SuggestionCard` and add green border styling:

```typescript
// In parent, pass which suggestions have been voted for
const votedSuggestionIds = new Set(/* from useTVPoll */);

// In SuggestionCard, add isVoted prop
interface SuggestionCardProps {
  suggestion: PollSuggestion;
  rank: number;
  isLeader: boolean;
  showVotes: boolean;
  hasVotes?: boolean;  // NEW: true if this suggestion received any votes
}

// Border styling
className={`... border-2 transition-all ${
  hasVotes && showVotes
    ? 'border-green-500 shadow-lg shadow-green-500/20'  // Green for voted
    : isLeader 
      ? 'border-yellow-500 shadow-lg shadow-yellow-500/20'  // Yellow for leader
      : 'border-white/20'  // Default
}`}
```

### 5. Smoother Scale Animation on Vote

Replace the aggressive scale pop with a gentler pulse:

**Current:**
```typescript
scale: isAnimating ? 1.05 : 1,
```

**Fixed:**
```typescript
scale: isAnimating ? 1.02 : 1,  // Subtle scale
```

---

## Technical Changes

### File: `src/components/tv/TVPollScreen.tsx`

| Line Range | Change |
|------------|--------|
| 142-152 | Change `AnimatePresence mode="popLayout"` to `mode="sync"` |
| 143-150 | Add `hasVotes` prop to `SuggestionCard` based on `suggestion.vote_count > 0` |
| 210-215 | Add `hasVotes?: boolean` to `SuggestionCardProps` interface |
| 236-249 | Update motion.div with `layoutId`, smoother layout transition, and green border logic |
| 241 | Change scale from `1.05` to `1.02` for subtler animation |

---

## Code Preview

### AnimatePresence & Card Rendering (lines 141-152)
```typescript
<AnimatePresence mode="sync">
  {suggestions.filter(s => s.category_name && s.category_name.trim()).map((suggestion, index) => (
    <SuggestionCard
      key={suggestion.id}
      suggestion={suggestion}
      rank={index + 1}
      isLeader={index === 0 && pollPhase === 'voting'}
      showVotes={pollPhase === 'voting'}
      hasVotes={suggestion.vote_count > 0}
    />
  ))}
</AnimatePresence>
```

### SuggestionCard Motion Config (lines 235-250)
```typescript
<motion.div
  layoutId={`tv-suggestion-${suggestion.id}`}
  layout
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ 
    opacity: 1, 
    scale: isAnimating ? 1.02 : 1,
  }}
  exit={{ opacity: 0, scale: 0.95 }}
  transition={{
    layout: { type: 'spring', stiffness: 350, damping: 40, mass: 1.2 },
    scale: { duration: 0.2 },
    opacity: { duration: 0.2 },
  }}
  className={`relative overflow-visible bg-white/10 backdrop-blur-sm rounded-xl p-4 border-2 transition-colors duration-300 ${
    hasVotes && showVotes
      ? 'border-green-500 shadow-lg shadow-green-500/20'
      : isLeader 
        ? 'border-yellow-500 shadow-lg shadow-yellow-500/20' 
        : 'border-white/20'
  }`}
>
```

---

## Summary of Changes

| Aspect | Before | After |
|--------|--------|-------|
| Layout animation | Aggressive spring | Smooth spring with higher damping |
| AnimatePresence mode | `popLayout` | `sync` |
| Scale on vote | `1.05` (bouncy) | `1.02` (subtle) |
| Border for voted items | None | Green glow |
| Element tracking | `key` only | `layoutId` + `key` |

---

## Testing Checklist
1. Add categories during poll suggest phase - cards appear smoothly
2. Vote for a category - card moves to new position smoothly (no dizzy jumps)
3. Voted categories show green border during voting phase
4. Leader (most votes) still shows yellow border with crown
5. Multiple rapid votes don't cause jittery animations
