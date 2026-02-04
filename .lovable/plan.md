

# Played Indicator & Play Mode Selection for Trivias

## Overview

This plan addresses two related features:
1. **Played Indicator**: Show users which trivias they've already played vs. new ones
2. **Play Mode Selection Modal**: When clicking "Play" on a locked (დახურული) trivia, show options for how to play instead of immediately starting

## Current State Analysis

### Existing Infrastructure
- **`quiz_post_plays` table**: Already tracks when users play trivias (user_id, post_id, score, played_at)
- **`useSocialFeed` hook**: Already provides `userPlays` array with IDs of played trivias
- **`FeedPost` component**: Already shows "played" visual state with checkmark for explore feed
- **`is_blind` field**: Indicates "locked" (დახურული) trivias where creator hasn't seen answers

### Current Gaps
- My Trivia tab cards (`StandaloneQuizCard`, `PersonalTriviaCard`, `CollectionQuizCard`) don't show played status
- No modal asking how user wants to play locked trivias - it just starts immediately
- Portfolio cards (`TriviaPortfolioCard`) don't show played status

---

## Technical Implementation

### Part 1: Played Indicator on Trivia Cards

#### Files to Modify

| File | Changes |
|------|---------|
| `src/components/social/MyTriviaTab.tsx` | Add played indicator to `StandaloneQuizCard`, `PersonalTriviaCard`, `CollectionQuizCard` |
| `src/components/social/TriviaPortfolioCard.tsx` | Add played indicator prop and badge |
| `src/components/social/PlayerFeedItem.tsx` | Add played indicator (if not already present) |
| `src/hooks/useSocialFeed.ts` | Ensure `userPlays` is exported and available |

#### Visual Design

For played trivias, show a small badge/indicator:
- **Played**: Checkmark badge with "ითამაშე" text in green/muted style
- **New/Unplayed**: No special indicator (or optionally "ახალი" badge in purple)

**Badge placement options:**
1. Top-left corner overlay on cover image
2. Next to the play button
3. Small indicator near stats row

**Recommended approach:** Small pill badge in top-left corner of cover:
```text
┌──────────────────────────┐
│ ✓ ნათამაშები            │  ← Played badge
│                          │
│     Trivia Title         │
│                          │
└──────────────────────────┘
```

#### Code Changes for MyTriviaTab.tsx

1. Import `userPlays` from `useSocialFeed` in the parent component
2. Pass `isPlayed` prop to card components
3. Add visual indicator in card render

```tsx
// In StandaloneQuizCard / CollectionQuizCard
// Add prop: isPlayed?: boolean

// In cover section, add badge:
{isPlayed && (
  <div className="absolute top-3 left-14 z-10 flex items-center gap-1 bg-green-500/90 text-white px-2 py-0.5 rounded-full text-xs font-medium">
    <Check className="w-3 h-3" />
    <span>ნათამაშები</span>
  </div>
)}
```

---

### Part 2: Play Mode Selection Modal for Locked Trivias

#### New Component: `TriviaPlayModeModal.tsx`

Create a new modal that appears when user clicks "Play" on a locked (is_blind=true) trivia they own.

**Modal Options:**
1. **ითამაშე მარტო** (Play Solo) - Starts solo game immediately
2. **შექმენი ოთახი** (Create Room) - Creates multiplayer room
3. **TV რეჟიმში** (TV Mode) - Starts TV mode with friends

#### File Structure

```
src/components/social/TriviaPlayModeModal.tsx (new)
```

#### Modal Design

```text
┌────────────────────────────────────┐
│              ×                     │
│                                    │
│         🎮 (trivia icon)          │
│                                    │
│    "90-იანი წლების მუსიკა"        │
│    5 კითხვა • დახურული             │
│                                    │
│  ┌────────────────────────────┐   │
│  │ 🎯  ითამაშე მარტო          │   │
│  │     პირადად, სწრაფად        │   │
│  └────────────────────────────┘   │
│                                    │
│  ┌────────────────────────────┐   │
│  │ 👥  ოთახის შექმნა          │   │
│  │     მეგობრებთან ერთად       │   │
│  └────────────────────────────┘   │
│                                    │
│  ┌────────────────────────────┐   │
│  │ 📺  TV რეჟიმი              │   │
│  │     დიდ ეკრანზე            │   │
│  └────────────────────────────┘   │
│                                    │
└────────────────────────────────────┘
```

#### Props Interface

```tsx
interface TriviaPlayModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  trivia: {
    id: string;
    title: string;
    questionCount: number;
    coverImage?: string;
    coverGradient?: string;
    isBlind?: boolean;
  };
  onPlaySolo: () => void;
  onCreateRoom: () => void;
  onPlayTV: () => void;
}
```

#### Integration Points

1. **MyTriviaTab.tsx** - For user's own trivias:
   - When clicking Play on a locked trivia, show modal instead of navigating
   - Check `post.is_blind === true` condition

2. **TriviaPreviewModal.tsx** - For explore feed:
   - When clicking Play on locked trivia from other users, show play mode modal
   - This gives user choice before "using up" the locked trivia

3. **TriviaPortfolioCard.tsx** - Portfolio card play button:
   - Same logic as above

#### Logic Flow

```text
User clicks "ითამაშე" on trivia
        │
        ▼
Is trivia locked (is_blind = true)?
        │
    ┌───┴───┐
    No      Yes
    │       │
    ▼       ▼
Navigate   Show TriviaPlayModeModal
directly   │
to solo    ├─► Solo: Navigate to /trivia/{id}
game       ├─► Room: Create room & navigate
           └─► TV: Create room with TV mode
```

---

### Part 3: Files to Create/Modify

#### New File: `src/components/social/TriviaPlayModeModal.tsx`

```tsx
// Key structure:
- Uses GameModal or custom animated modal
- Shows trivia info (title, question count, cover)
- Three chunky button options:
  1. Play Solo - navigates to /trivia/{id}
  2. Create Room - calls createRoom from MultiplayerContextV2
  3. TV Mode - calls createRoom with TV parameter

// Uses existing icons or custom 3D icons for each option
```

#### Modified: `src/components/social/MyTriviaTab.tsx`

Changes to make:
1. Add state for play mode modal: `const [playModeTrivia, setPlayModeTrivia] = useState<any>(null)`
2. Modify play button handlers to check `is_blind` before action
3. Add `TriviaPlayModeModal` component at bottom of render
4. Pass `userPlays` to child cards for played indicator

#### Modified: `src/components/social/TriviaPortfolioCard.tsx`

1. Add `isPlayed` prop
2. Show played indicator badge on card
3. Integrate play mode modal for locked trivias

#### Modified: `src/components/social/TriviaPreviewModal.tsx`

1. Add play mode selection when trivia is locked
2. Pass through handlers for different play modes

---

## Implementation Order

1. **Create TriviaPlayModeModal.tsx** - New modal component
2. **Add played indicator to TriviaPortfolioCard** - Simple badge addition
3. **Update MyTriviaTab.tsx** - Add modal integration + played indicators
4. **Update TriviaPreviewModal.tsx** - Add play mode selection for locked trivias
5. **Test end-to-end** - Verify flow works correctly

---

## Visual Assets Needed

The modal can use existing Lucide icons or 3D icons from the assets library:
- **Solo**: `User` or `Gamepad2` icon
- **Room**: `Users` icon  
- **TV Mode**: `Monitor` or `Tv` icon

Alternatively, could use emoji-style icons: 🎯 👥 📺

---

## Edge Cases to Handle

1. **Already played locked trivia**: Still show modal but maybe indicate it's been played
2. **Non-logged-in user**: Standard login prompt before any action
3. **Open (ღია) trivias**: Skip modal, go directly to solo play (creator already knows answers)
4. **Collection trivias**: Apply same logic per-round within collections

