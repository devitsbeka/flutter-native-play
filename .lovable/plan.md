

# Plan: Fix Host Observer Policy and Add Observer Points System

## Problem Summary

Two issues need to be fixed:

1. **Host can still play trivias they created and already played (even though UI shows correct indicators)**
   - The root cause: `startGame` function fetches queue items but doesn't read `suggester_user_id` from them
   - The function then clears `current_round_suggester_id` to `null` for the first round
   - Result: Host is never blocked for the FIRST round, only subsequent rounds

2. **Observer needs points for fairness**
   - When host skips a round (as observer), they get 0 points even if they "knew" the answers
   - User wants: If players answer correctly → points go to players; if players can't answer → points go to the observer (host who suggested)

---

## Root Cause Analysis

### Why the first round doesn't block the host:

```text
Current Flow (BROKEN):
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  1. Host adds trivia to queue (ControllerDirectSelection)       │
│     └─► Correctly sets suggester_user_id = userId               │
│                                                                 │
│  2. Host clicks "Start Game"                                    │
│     └─► startGame() is called                                   │
│                                                                 │
│  3. startGame() fetches queue:                                  │
│     .select('id, category_id, user_trivia_id, position')        │
│     └─► MISSING: suggester_user_id, suggester_nickname, etc.    │
│                                                                 │
│  4. startGame() deletes first queue item (consumed)             │
│     └─► suggester info is LOST forever                          │
│                                                                 │
│  5. startGame() sets session fields:                            │
│     current_round_suggester_id: null  ← ALWAYS NULL!            │
│                                                                 │
│  6. Host can play the first round (isSuggester = false)         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Solution Part 1: Fix First Round Suggester Detection

### File: `src/contexts/TVGameContext.tsx`

**Change 1: Fetch suggester info with queue items**

Location: Line 2153-2156

Before:
```typescript
const { data: queueItems } = await supabase
  .from('tv_session_queue')
  .select('id, category_id, user_trivia_id, position')
  .eq('session_id', state.sessionId);
```

After:
```typescript
const { data: queueItems } = await supabase
  .from('tv_session_queue')
  .select('id, category_id, user_trivia_id, position, suggester_user_id, suggester_nickname, suggester_avatar_url')
  .eq('session_id', state.sessionId);
```

**Change 2: Extract suggester info from first queue item**

Location: Around lines 2162-2201

Add after finding `firstMatchesCurrent`:
```typescript
// Extract suggester info from first queue item BEFORE consuming it
let firstRoundSuggesterId: string | null = null;
let firstRoundSuggesterNickname: string | null = null;
let firstRoundSuggesterAvatarUrl: string | null = null;

if (firstMatchesCurrent && first?.id) {
  // Only honor suggester for user trivias, not library categories
  const isLibraryCategory = first.category_id && !first.user_trivia_id;
  if (!isLibraryCategory) {
    firstRoundSuggesterId = first.suggester_user_id || null;
    firstRoundSuggesterNickname = first.suggester_nickname || null;
    firstRoundSuggesterAvatarUrl = first.suggester_avatar_url || null;
  }
  
  // ... existing consume logic
}
```

**Change 3: Use extracted suggester info in session update**

Location: Lines 2396-2400

Before:
```typescript
current_round_suggester_id: null,
current_round_suggester_nickname: null,
current_round_suggester_avatar_url: null,
```

After:
```typescript
current_round_suggester_id: firstRoundSuggesterId,
current_round_suggester_nickname: firstRoundSuggesterNickname,
current_round_suggester_avatar_url: firstRoundSuggesterAvatarUrl,
```

**Change 4: Adjust player count for suggester skip**

Add after confirmActivePlayers call (around line 2375):
```typescript
// Adjust for suggester skip rule (if suggester is playing, they won't answer)
if (firstRoundSuggesterId) {
  playerCount = Math.max(1, playerCount - 1);
  console.log('[startGame] Adjusted player count for suggester:', playerCount);
}
```

---

## Solution Part 2: Observer Points System (Fair Play)

When the observer (host who knows answers) skips a round, they should earn points based on how many players answered incorrectly.

### Scoring Logic:
```text
For each question:
- If player answers CORRECTLY → player gets points
- If player answers INCORRECTLY → observer gets points (they "knew" it)
- If player doesn't answer (timeout) → observer gets points

Observer points per question = 100 * (incorrect_count / total_players)
```

### Files to Modify:

**File: `src/contexts/TVGameContext.tsx`**

Update the `advanceToReveal` or `advanceToNextQuestion` function to calculate and award observer points.

Location: Around the reveal/scoring logic

Add logic to track and update observer score:
```typescript
// Calculate observer bonus points from incorrect answers
if (state.currentRoundSuggesterId) {
  const activePlayers = state.players.filter(p => p.id !== state.currentRoundSuggesterId);
  const incorrectCount = activePlayers.filter(p => {
    // Check if this player answered incorrectly or didn't answer
    const answered = // ... check from presence or player_answers
    return !answered || answered !== currentQuestion.correct_answer;
  }).length;
  
  const observerBonus = Math.round(100 * (incorrectCount / activePlayers.length));
  // Award bonus to observer
}
```

### UI Updates for Observer Points:

**File: `src/pages/TVHostController.tsx`**

In the observer UI (isSuggester block), show the accumulated observer points:
- Display "თქვენი ქულა: X" (Your score: X) with points earned from wrong answers
- Show a tooltip: "იღებთ ქულებს მოთამაშეების შეცდომებზე" (You earn points from player mistakes)

**File: `src/components/tv/TVQuestionScreenV4.tsx`**

Show observer in the leaderboard with their accumulated points and a special "Observer" badge.

---

## Summary of Changes

| File | Change | Purpose |
|------|--------|---------|
| `src/contexts/TVGameContext.tsx` | Fetch `suggester_*` fields in queue query | Get suggester info for first round |
| `src/contexts/TVGameContext.tsx` | Extract suggester from first queue item | Preserve info before consuming |
| `src/contexts/TVGameContext.tsx` | Use suggester in session update | Block host on first round |
| `src/contexts/TVGameContext.tsx` | Adjust player count for suggester | Correct answer count expectation |
| `src/contexts/TVGameContext.tsx` | Add observer scoring logic | Award points for player mistakes |
| `src/pages/TVHostController.tsx` | Show observer points in UI | Display earned points to observer |
| `src/components/tv/TVQuestionScreenV4.tsx` | Show observer in leaderboard | Include observer in TV display |

---

## UI Indicator Fix

The current UI indicators (lines 262-271 in `MyTriviasPickerModal.tsx`) are already correct:
- Green "ითამაშე" for blind trivias with plays_count=0 (truly playable)
- Amber "უკვე ითამაშე" for blind trivias with plays_count>0 (already played)
- Amber "იცი პასუხები" for non-blind trivias (saw answers during creation)

No changes needed to the picker UI.

---

## Testing Checklist

1. Create a blind trivia (in "play" mode)
2. Don't play it (plays_count = 0)
3. Add to TV game as host → Verify host CAN play (green badge in picker)
4. Play solo once (increments plays_count to 1)
5. Add same trivia to TV game → Verify host sees OBSERVER UI
6. When players answer wrong → Verify host earns points
7. Check leaderboard includes observer with their points
8. Create non-blind trivia → Verify host is ALWAYS observer
9. Library category → Verify host can ALWAYS play

