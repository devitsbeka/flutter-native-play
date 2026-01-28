

# Plan: Strict Host Participation Policy for TV Mode

## Problem Summary

Currently, the game blocks the host from playing trivias where `is_blind = false` (host saw answers during creation). However, there's a gap: if the host creates a "blind" trivia and then plays it (solo or with others), they now know the answers, but the system still considers it "playable" for them.

The user wants a stricter policy:
- **Block host** from playing trivias where they KNOW the answers (created non-blind OR already played)
- **Allow host** to play library categories and truly blind trivias they haven't played yet

## Current Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                     Observer Detection Flow                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Queue Item / Poll Suggestion                                    │
│       │                                                          │
│       ▼                                                          │
│  Check: is_blind = false AND source_type = 'trivia'?            │
│       │                                                          │
│       ├── YES → Set suggester_user_id = trivia OWNER's user_id  │
│       │                                                          │
│       └── NO → suggester_user_id = null (everyone plays)        │
│                                                                  │
│  During gameplay:                                                │
│       │                                                          │
│       ▼                                                          │
│  Check: myPlayerId === currentRoundSuggesterId?                 │
│       │                                                          │
│       ├── YES → Show observer UI (skip round)                   │
│       │                                                          │
│       └── NO → Show question UI (can answer)                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Solution: Add "Has Played" Check

Enhance the suggester logic to also check if the trivia owner has **already played** this trivia (via `plays_count > 0` or a dedicated tracking table).

### Approach A: Simple plays_count Check (Recommended)

If `plays_count > 0` for a user's own blind trivia, treat it as "spoiled" for them.

**Pros:** No DB schema changes, uses existing data
**Cons:** Only works for trivias the owner has played at least once

### Approach B: Dedicated Play Tracking Table

Track exactly which users have played which trivias.

**Pros:** Precise tracking, covers all scenarios
**Cons:** Requires new table, more complex queries

---

## Recommended Implementation (Approach A)

### Change 1: Update `ControllerDirectSelection.tsx`

When adding a user trivia to the queue, check:
- `is_blind = false` → Owner is blocked (current behavior)
- `is_blind = true` BUT `plays_count > 0` AND trivia belongs to current user → Owner is blocked (new behavior)

**Location:** `src/components/controller/ControllerDirectSelection.tsx` lines 155-178

**Current Logic:**
```typescript
if (!trivia.is_blind) {
  // Fetch profile and set suggester
  suggester_user_id = userId;
}
```

**New Logic:**
```typescript
// Block host if: non-blind OR (blind but already played by owner)
const hostKnowsAnswers = !trivia.is_blind || (trivia.is_blind && trivia.plays_count > 0);
if (hostKnowsAnswers) {
  suggester_user_id = userId;
}
```

---

### Change 2: Update `useTVPoll.ts` - Queue Building

When building the queue from poll suggestions, apply the same logic.

**Location:** `src/hooks/useTVPoll.ts` lines 660-708

**Current Logic:**
```typescript
if (triviaInfo && !triviaInfo.is_blind) {
  suggester_user_id = triviaInfo.user_id;
}
```

**New Logic:**
```typescript
// Also fetch plays_count to check if owner has already played
.select('id, user_id, is_blind, plays_count')

// Check: non-blind OR (blind but already played)
const ownerKnowsAnswers = !triviaInfo.is_blind || (triviaInfo.plays_count > 0);
if (triviaInfo && ownerKnowsAnswers) {
  suggester_user_id = triviaInfo.user_id;
}
```

---

### Change 3: Update `useTVPoll.ts` - First Round Start

Same logic for the first round when finalizing poll.

**Location:** `src/hooks/useTVPoll.ts` lines 841-850

**Current Logic:**
```typescript
if (triviaInfo && !triviaInfo.is_blind) {
  suggesterUserId = triviaInfo.user_id;
}
```

**New Logic:**
```typescript
const ownerKnowsAnswers = !triviaInfo.is_blind || (triviaInfo.plays_count > 0);
if (triviaInfo && ownerKnowsAnswers) {
  suggesterUserId = triviaInfo.user_id;
}
```

---

### Change 4: Update `startNextRoundFromQueueIfAny` in TVGameContext

When starting subsequent rounds from the queue, the suggester info is already stored in `tv_session_queue`. No changes needed here since the queue is populated correctly by Changes 1-3.

---

### Change 5: Update UI Indicators in MyTriviasPickerModal

Show clearer indicators about whether the host can play each trivia.

**Location:** `src/components/team/MyTriviasPickerModal.tsx` lines 262-271

**Current Logic:**
```typescript
{trivia.is_blind ? (
  <span className="...bg-green-500...">ითამაშე</span>
) : (
  <span className="...">👀 იცი პასუხები</span>
)}
```

**New Logic:**
```typescript
{trivia.is_blind && trivia.plays_count === 0 ? (
  // Truly blind - never played
  <span className="...bg-green-500...">
    <Gamepad2 /> ითამაშე
  </span>
) : (
  // Either non-blind or already played
  <span className="...text-amber-500...">
    👀 {!trivia.is_blind ? 'იცი პასუხები' : 'უკვე ითამაშე'}
  </span>
)}
```

---

## Summary of Changes

| File | Lines | Change |
|------|-------|--------|
| `ControllerDirectSelection.tsx` | 155-178 | Add `plays_count` check to suggester logic |
| `useTVPoll.ts` | 660-708 | Fetch `plays_count`, add to owner block condition |
| `useTVPoll.ts` | 841-850 | Apply same logic for first round start |
| `MyTriviasPickerModal.tsx` | 262-271 | Update UI badges to show "already played" state |

---

## Policy Summary

| Scenario | Host Can Play? |
|----------|----------------|
| Library category | Yes |
| Own trivia, created blind, never played | Yes |
| Own trivia, created blind, already played (plays_count > 0) | No |
| Own trivia, created non-blind | No |
| Someone else's blind trivia | Yes |
| Someone else's non-blind trivia | Yes (only OWNER is blocked) |

---

## Testing Checklist

1. Create a blind trivia (in "play" mode)
2. Add it to TV game queue - verify host CAN play
3. Play the game once (increments plays_count)
4. Start new TV game, add same trivia - verify host is NOW observer
5. Create a non-blind trivia - verify host is always observer
6. Add library category - verify host can always play
7. Have another player suggest YOUR trivia in poll - verify correct blocking

