

# Plan: Implement Consistent Host Observer Scoring System Across All Game Modes

## Current State Analysis

After analyzing the codebase, here's what I found:

### TV Mode (✅ FULLY IMPLEMENTED)
The TV game experience has a complete observer system:

1. **Observer Detection** (`TVGameContext.tsx`):
   - Tracks `currentRoundSuggesterId` in session state
   - Host is marked as suggester when they select their own trivia (non-blind or already played)

2. **Observer Scoring** (`TVGameContext.tsx` lines 278-337):
   - When revealing answers, calculates bonus points based on player mistakes
   - Awards **100 points per incorrect/unanswered player**
   - Updates observer's score via presence channel

3. **Observer UI** (`TVHostController.tsx` lines 1288-1328):
   - Shows dedicated observer screen with message: "შენი კატეგორიაა! ამიტომ ამ რაუნდში აკვირდები"
   - Displays score prominently with "იღებ ქულებს შეცდომებზე" label
   - Shows question progress and timer

### Regular Multiplayer Rooms (⚠️ PARTIALLY IMPLEMENTED)
The mobile multiplayer experience has:

1. **Warning Modal** (`RoomLobbyV2.tsx` lines 984-1016):
   - Shows warning when host selects their own trivia: "შენ იცი პასუხები!"
   - Mentions they'll get points when others make mistakes: "შენ მაინც მიიღებ ქულებს როცა სხვები შეცდებიან!"

2. **MISSING**: 
   - ❌ No `hostObserverId` or similar field in `MultiplayerContextV2`
   - ❌ No observer scoring logic when answers are revealed
   - ❌ No observer UI on mobile game screen (`MultiplayerGameScreenV2`)
   - ❌ Host can still answer questions even after seeing the warning

### Friend Invite Experience (⚠️ SAME AS MULTIPLAYER)
Uses the same `MultiplayerContextV2` and components, so same gaps apply.

---

## Required Changes

### 1. Database Schema Update

Add a column to `game_rooms` to track when host is in observer mode:

```sql
ALTER TABLE game_rooms 
ADD COLUMN host_is_observer BOOLEAN DEFAULT FALSE;
```

### 2. MultiplayerContextV2 Updates

**A. Add observer state tracking:**

```typescript
// In MultiplayerState interface
hostIsObserver: boolean;

// In initial state
hostIsObserver: false,
```

**B. Update startGame to set host observer status:**

When starting the game with host's own trivia:
1. Check if host owns the trivia AND (not blind OR already played)
2. Set `host_is_observer = true` in game_rooms
3. Update local state `hostIsObserver: true`

**C. Implement observer scoring in answer handling:**

When processing answers (in real-time subscription or answer submission):
1. After all players answer (or time expires)
2. Count incorrect answers from non-host players
3. Award host 100 points per incorrect answer
4. Update host's participant score in database

### 3. Mobile Observer UI (MultiplayerGameScreenV2)

Add conditional rendering for host observer mode:

```tsx
// If host is observer, show observer screen instead of question UI
if (isHost && hostIsObserver) {
  return (
    <div className="observer-screen">
      <Star className="w-16 h-16 text-yellow-400" />
      <h2>შენი ტრივიაა!</h2>
      <p>ამიტომ ამ რაუნდში აკვირდები</p>
      
      {/* Observer score */}
      <div className="observer-score">
        <p>შენი ქულა</p>
        <p className="score">{myScore}</p>
        <p>იღებ ქულებს შეცდომებზე</p>
      </div>
      
      {/* Question progress */}
      <p>კითხვა {currentQuestionIndex + 1}/{questions.length}</p>
      <p>⏱️ {timeRemaining}წ</p>
      
      {/* Leaderboard toggle */}
      ...
    </div>
  );
}
```

### 4. Observer Scoring Logic

Create a shared utility or implement in context:

```typescript
const calculateObserverBonus = (
  incorrectCount: number, 
  totalPlayers: number
): number => {
  // 100 points per incorrect player
  return 100 * incorrectCount;
};
```

Trigger scoring:
- After all players answer or timer expires
- Count players who answered incorrectly or didn't answer
- Award bonus to host's score
- Update participant score in database

---

## Visual Comparison: Before vs After

### Mobile Host Observer Screen (NEW)

```text
┌─────────────────────────┐
│  ←              Q3/10   │
│                         │
│       ⭐                │
│  შენი ტრივიაა!         │
│ ამიტომ ამ რაუნდში      │
│   აკვირდები            │
│                         │
│ ┌─────────────────────┐ │
│ │   შენი ქულა         │ │
│ │      450            │ │
│ │ იღებ ქულებს        │ │
│ │   შეცდომებზე        │ │
│ └─────────────────────┘ │
│                         │
│     ⏱️ 12წ             │
│                         │
│  [Show Leaderboard ▲]   │
│                         │
└─────────────────────────┘
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/contexts/MultiplayerContextV2.tsx` | Add `hostIsObserver` state, set it in `startGame`, implement observer scoring after each question |
| `src/components/team/MultiplayerGameScreenV2.tsx` | Add observer UI for host when `hostIsObserver` is true |
| `src/components/team/GameResultsScreenV2.tsx` | Ensure observer host is properly ranked with their bonus points |
| Database migration | Add `host_is_observer` column to `game_rooms` table |

---

## Consistency Checklist

| Feature | TV Mode | Multiplayer | Friend Invite |
|---------|---------|-------------|---------------|
| Warning modal before game | ✅ | ✅ | ✅ (same code) |
| Host skips answering | ✅ | ⏳ To implement | ⏳ To implement |
| Observer UI during game | ✅ | ⏳ To implement | ⏳ To implement |
| 100 pts per player mistake | ✅ | ⏳ To implement | ⏳ To implement |
| Observer in leaderboard | ✅ | ⏳ To implement | ⏳ To implement |

---

## Technical Notes

1. **Scoring timing**: In TV mode, scoring happens in `advanceToReveal()`. In multiplayer, we need to hook into answer submission flow or create a similar mechanism when all players have answered.

2. **State synchronization**: Use realtime subscriptions to update observer score across all clients when bonus points are awarded.

3. **Edge cases**:
   - If only host is in room (no other players), no bonus can be earned
   - If host leaves mid-game, observer logic should be cleaned up
   - Queue rounds: Each round should re-evaluate if host is observer based on the trivia being played

4. **Reuse from TV mode**: The observer bonus calculation logic (100 pts per incorrect) can be extracted into a shared utility in `src/utils/` for consistency.

