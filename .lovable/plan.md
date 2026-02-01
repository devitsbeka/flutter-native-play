
## Multiplayer Round Transition Bug Analysis & Fix Plan

### The Problem

When the host finishes playing quickly and starts a new round with a new category, the guest (non-host):
1. Sees the **first round's questions again** instead of the new category
2. Has the **same score from before** (not reset)
3. Match history shows **duplicate entries with identical scores**

---

### Root Causes Identified

#### Bug 1: Missing `game_id` Update in `startNewRound`

**Location:** `src/contexts/MultiplayerContextV2.tsx` lines 1356-1362

When reusing custom questions in `startNewRound`, the code updates `shuffled_answers` but **does NOT update `game_id`**:

```typescript
// Current code (BROKEN):
await Promise.all(questions.map((q, index) => 
  supabase.from("room_questions")
    .update({ shuffled_answers: q.allAnswers }) // Missing game_id!
    .eq("room_id", roomId)
    .eq("question_index", index)
));
```

The non-host's validation logic checks `game_id === expectedGameId`, so it **fails validation** and falls back to using stale questions.

---

#### Bug 2: Only Resets Caller's Score (Not All Participants)

**Location:** `src/contexts/MultiplayerContextV2.tsx` lines 1367-1372

```typescript
// Current code (BROKEN):
await supabase
  .from("room_participants")
  .update({ score: 0, current_question: 0, status: "playing" })
  .eq("room_id", roomId)
  .eq("user_id", user.id); // Only resets caller!
```

This should reset **ALL participants** in the room, not just the caller. This is why beka's score stayed at 844/408 across multiple games.

---

#### Bug 3: Race Condition in Non-Host Question Fetching

**Location:** `src/contexts/MultiplayerContextV2.tsx` lines 311-360

When the host starts a new game rapidly (finishing before non-host), the non-host's realtime subscription triggers but:
1. The initial 500ms delay may not be enough
2. The old `room_questions` may still be present if they weren't deleted (custom trivia path)
3. Fallback validation uses unvalidated stale questions

---

### Fix Strategy

#### Fix 1: Add `game_id` to the shuffled_answers update

```typescript
// FIXED:
await Promise.all(questions.map((q, index) => 
  supabase.from("room_questions")
    .update({ 
      shuffled_answers: q.allAnswers,
      game_id: game?.id, // CRITICAL: Update game_id for validation
    })
    .eq("room_id", roomId)
    .eq("question_index", index)
));
```

---

#### Fix 2: Reset ALL Participants' Scores

```typescript
// FIXED:
await supabase
  .from("room_participants")
  .update({ score: 0, current_question: 0, status: "playing" })
  .eq("room_id", roomId); // Remove user_id filter - reset ALL
```

---

#### Fix 3: Clear Stale Questions for Custom Trivia Path

Before reusing custom questions, explicitly delete and re-insert them with the new `game_id` to ensure the non-host's validation works:

```typescript
// Delete old questions
await supabase.from("room_questions").delete().eq("room_id", roomId);

// Re-insert with new game_id
await Promise.all(questions.map((q, index) => 
  supabase.from("room_questions").insert({
    room_id: roomId,
    question_index: index,
    question_text: q.question,
    correct_answer: q.correctAnswer,
    incorrect_answers: q.incorrectAnswers,
    shuffled_answers: q.allAnswers,
    difficulty: q.difficulty,
    icon_slug: q.iconSlug || null,
    game_id: game?.id,
  })
));
```

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/contexts/MultiplayerContextV2.tsx` | Fix `startNewRound` function (3 fixes) |

---

### Technical Details

**File: `src/contexts/MultiplayerContextV2.tsx`**

**Change 1:** Lines 1356-1362 - Add `game_id` to update query

**Change 2:** Lines 1367-1372 - Reset ALL participants, not just caller

**Change 3:** Lines 1330-1414 - Restructure custom trivia path to delete/re-insert questions with new `game_id` instead of just updating `shuffled_answers`

---

### Expected Outcome

After these fixes:
- Non-host players will correctly see new questions when host starts a new round
- All participant scores will be reset to 0 at the start of each round
- Match history will show accurate scores for each game
- The `game_id` validation in the non-host subscription will work correctly
