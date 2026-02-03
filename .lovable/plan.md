

# Plan: Fix Non-Host Player Seeing Revealed Answers on Round 2

## Problem Summary

When the second round starts, the non-host player sees:
1. One question from the new round
2. The correct answer is already revealed (green highlight)
3. They can't click any answers
4. Only "შედეგების ნახვა" (View Results) button is active

This effectively freezes the non-host player out of the game.

## Root Causes Identified

### Issue 1: `lastQuestionResult` Not Reset for Non-Host

**Location:** `src/contexts/MultiplayerContextV2.tsx`

When the non-host player transitions to round 2, their local state for `lastQuestionResult` is NOT reset:

```text
Lines 297-303 (initial state clear):
  questions: [],
  currentQuestionIndex: 0,
  myScore: 0,
  opponentAnswers: {},
  currentRoom: updated,
  ❌ MISSING: lastQuestionResult: null
  
Lines 361-368 (after questions loaded):
  questions,
  currentQuestionIndex: 0,
  myScore: 0,
  phase: "playing",
  currentRoom: updated,
  ❌ MISSING: lastQuestionResult: null
```

**Effect in UI:**
```typescript
// In MultiplayerGameScreenV2.tsx
useEffect(() => {
  if (lastQuestionResult) {
    setAnswerRevealed(true);  // ← This fires immediately!
  }
}, [lastQuestionResult]);
```

The stale `lastQuestionResult` from round 1 causes `answerRevealed` to be `true` immediately, showing the correct answer and preventing interaction.

### Issue 2: Database Delete Race Condition (Contributing Factor)

The unique constraint `room_questions_room_id_question_index_key` on `(room_id, question_index)` causes insert failures when:
1. Delete fires
2. Insert fires too quickly (before delete commits)
3. Old rows still exist → duplicate key error
4. Only some questions are inserted

Console evidence from earlier:
```
[MP startGame] Some question inserts failed: [
  {"code": "23505", "message": "duplicate key value violates unique constraint..."}
]
[MP startGame] Question count mismatch: expected 5, got 1
```

This means only 1 question was successfully inserted, causing sync issues.

---

## Technical Fixes

### Fix 1: Reset `lastQuestionResult` in Non-Host State Transitions

**File:** `src/contexts/MultiplayerContextV2.tsx`

**Location 1 - Lines 297-303 (initial clear):**
```typescript
setState(prev => ({
  ...prev,
  questions: [],
  currentQuestionIndex: 0,
  myScore: 0,
  opponentAnswers: {},
  lastQuestionResult: null,  // ADD THIS
  currentRoom: updated,
}));
```

**Location 2 - Lines 361-368 (after questions loaded):**
```typescript
setState(prev => ({
  ...prev,
  questions,
  currentQuestionIndex: 0,
  myScore: 0,
  phase: "playing",
  lastQuestionResult: null,  // ADD THIS
  opponentAnswers: {},       // ADD THIS (also missing)
  currentRoom: updated,
}));
```

### Fix 2: Add Delay After Delete Before Insert

**File:** `src/contexts/MultiplayerContextV2.tsx`

Add a 50ms delay after delete operations to ensure the database commits before insertions start:

**6 locations to fix:**

| Lines | Function | Current Code | Fix |
|-------|----------|--------------|-----|
| 812-813 | `startGame` (user trivia) | Delete, then insert | Add 50ms delay |
| 998-999 | `saveQuestionsAndStartGame` | Delete, then insert | Add 50ms delay |
| 1270-1271 | `startNewRound` (user trivia) | Delete, then insert | Add 50ms delay |
| 1389-1390 | `startNewRound` (library) | Delete, then insert | Add 50ms delay |
| 1549-1550 | `startNextFromQueue` (user trivia) | Delete, then insert | Add 50ms delay |
| 1712-1713 | `startNextFromQueue` (library) | Delete, then insert | Add 50ms delay |

**Pattern to apply:**
```typescript
// Clear old data
await supabase.from("room_questions").delete().eq("room_id", roomId);
await supabase.from("player_answers").delete().eq("room_id", roomId);

// ADD: Wait for delete to commit before inserting
await new Promise(resolve => setTimeout(resolve, 50));

// Then insert new questions...
```

---

## Summary of Changes

| File | Location | Change |
|------|----------|--------|
| `MultiplayerContextV2.tsx` | Line 297-303 | Add `lastQuestionResult: null` |
| `MultiplayerContextV2.tsx` | Line 361-368 | Add `lastQuestionResult: null`, `opponentAnswers: {}` |
| `MultiplayerContextV2.tsx` | After line 813 | Add 50ms delay |
| `MultiplayerContextV2.tsx` | After line 999 | Add 50ms delay |
| `MultiplayerContextV2.tsx` | After line 1271 | Add 50ms delay |
| `MultiplayerContextV2.tsx` | After line 1390 | Add 50ms delay |
| `MultiplayerContextV2.tsx` | After line 1550 | Add 50ms delay |
| `MultiplayerContextV2.tsx` | After line 1713 | Add 50ms delay |

---

## Expected Behavior After Fix

1. **Non-host round transition:** `lastQuestionResult` is cleared → `answerRevealed` starts as `false` → player can answer
2. **Question insertion:** Delete commits before insert → no duplicate key errors → all questions sync correctly
3. **Game flow:** Both host and non-host see the same questions and can play normally through all rounds

