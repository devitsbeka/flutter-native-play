
# Plan: Implement Host Play/Skip Policy in Regular Multiplayer Rooms

## Overview

Implement a strict "fair play" policy for regular (non-TV) multiplayer rooms that determines whether the host should observe or play each round, plus enable any player to add categories to the queue.

## Policy Rules

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           HOST PLAY POLICY                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. LIBRARY CATEGORIES → Host PLAYS ✅                                      │
│     - Source: categories table                                              │
│     - Reason: Host doesn't know answers                                     │
│                                                                             │
│  2. MY TRIVIA (non-blind) → Host SKIPS (Observer) 👁️                        │
│     - Source: user_quiz_posts where is_blind = false                        │
│     - Reason: Host knows all questions/answers                              │
│                                                                             │
│  3. BLIND TRIVIA (plays_count = 0) → Host PLAYS ✅                          │
│     - Source: user_quiz_posts where is_blind = true AND plays_count = 0     │
│     - Reason: Questions are locked, host hasn't seen them yet               │
│                                                                             │
│  4. BLIND TRIVIA (plays_count > 0) → Host SKIPS (Observer) 👁️               │
│     - Source: user_quiz_posts where is_blind = true AND plays_count > 0     │
│     - Reason: Trivia is now "revealed" - host has seen questions            │
│                                                                             │
│  5. RANDOM → Host PLAYS ✅                                                  │
│     - Source: random selection from categories                              │
│     - Reason: Random means unpredictable                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Observer Mode Behavior

When host skips a round (Observer mode):
1. Host sees a special UI showing "შენი კატეგორიაა!" with question progress
2. Host CANNOT answer questions
3. Host earns **100 points per player mistake** (incorrect answer or timeout)
4. Host is included in final leaderboard with observer points
5. Game flow continues smoothly without host's answers being counted

---

## Technical Implementation

### Phase 1: Database Schema Update

**Add `host_observer_id` column to `game_rooms`** to track when the host is in observer mode for the current round:

```sql
ALTER TABLE game_rooms ADD COLUMN host_observer_id uuid REFERENCES auth.users(id);
```

This column stores the host's user_id when they should observe the current round (null means host plays).

### Phase 2: Context Changes

**File: `src/contexts/MultiplayerContextV2.tsx`**

1. **Add `hostIsObserver` to state:**
```typescript
interface MultiplayerState {
  // ... existing fields
  hostIsObserver: boolean;  // NEW: whether host is in observer mode
}
```

2. **Export `hostIsObserver` from context**

3. **Modify `startGame()` and `startNextFromQueue()` to determine observer status:**

```typescript
// Helper function to check if host should observe
const shouldHostObserve = async (
  sourceType: string, 
  userTriviaId: string | null,
  hostUserId: string
): Promise<boolean> => {
  // Library categories - host plays
  if (sourceType === "category" || sourceType === "random") {
    return false;
  }
  
  // User trivia - check ownership and blind status
  if (sourceType === "user_trivia" && userTriviaId) {
    const { data: trivia } = await supabase
      .from("user_quiz_posts")
      .select("user_id, is_blind, plays_count")
      .eq("id", userTriviaId)
      .single();
    
    if (!trivia) return false;
    
    // Only host's own trivias trigger observer mode
    if (trivia.user_id !== hostUserId) return false;
    
    // Non-blind trivia - host knows answers
    if (!trivia.is_blind) return true;
    
    // Blind trivia with plays > 0 - host has seen it
    if (trivia.is_blind && (trivia.plays_count || 0) > 0) return true;
    
    // Blind trivia with plays = 0 - host can play
    return false;
  }
  
  return false;
};
```

4. **Increment `plays_count` when game starts:**

```typescript
// In startGame() and startNextFromQueue(), after questions are loaded:
if (userTriviaId) {
  await supabase.rpc('increment_quiz_plays', { post_id: userTriviaId });
}
```

5. **Update `game_rooms.host_observer_id` when starting:**

```typescript
await supabase
  .from("game_rooms")
  .update({
    status: "playing",
    host_observer_id: hostIsObserver ? user.id : null,
    // ... other fields
  })
  .eq("id", roomId);
```

6. **Load observer status in realtime subscription:**

```typescript
// When room status changes to "playing", also read host_observer_id
const isObserver = updated.host_observer_id === user?.id;
setState(prev => ({ ...prev, hostIsObserver: isObserver }));
```

### Phase 3: Observer Scoring Logic

**File: `src/contexts/MultiplayerContextV2.tsx`**

Add observer scoring when answers are submitted:

```typescript
// In the player_answers subscription or after all answers are in:
// When a player answers incorrectly and host is observer, award bonus

const calculateObserverBonus = async () => {
  if (!state.currentRoom?.host_observer_id) return;
  
  // Get all answers for current question
  const { data: answers } = await supabase
    .from("player_answers")
    .select("user_id, is_correct")
    .eq("room_id", state.currentRoom.id)
    .eq("question_index", state.currentQuestionIndex);
  
  // Count incorrect/missing answers (excluding host)
  const nonHostParticipants = participants.filter(
    p => p.user_id !== state.currentRoom?.host_observer_id
  );
  
  const answeredUserIds = new Set(answers?.map(a => a.user_id) || []);
  let incorrectCount = 0;
  
  nonHostParticipants.forEach(p => {
    const answer = answers?.find(a => a.user_id === p.user_id);
    if (!answer || !answer.is_correct) {
      incorrectCount++;
    }
  });
  
  if (incorrectCount > 0) {
    const bonus = incorrectCount * 100;
    // Update host's score
    await supabase
      .from("room_participants")
      .update({ score: supabase.raw(`score + ${bonus}`) })
      .eq("room_id", state.currentRoom.id)
      .eq("user_id", state.currentRoom.host_observer_id);
  }
};
```

### Phase 4: Game Screen UI Changes

**File: `src/components/team/MultiplayerGameScreenV2.tsx`**

Add observer UI when host is in observer mode:

```typescript
const { hostIsObserver, currentRoom, currentQuestionIndex, questions } = useMultiplayerV2();
const isObserving = hostIsObserver && currentRoom?.host_user_id === user?.id;

// At the start of render:
if (isObserving) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4 flex flex-col items-center justify-center">
      <div className="text-center">
        <Star className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
        <p className="text-white text-xl font-bold mb-2">შენი კატეგორიაა!</p>
        <p className="text-purple-300 mb-4">ამიტომ ამ რაუნდში აკვირდები</p>
        <div className="bg-white/10 rounded-xl p-4 mb-6">
          <p className="text-white font-semibold text-center text-sm">
            კითხვა {currentQuestionIndex + 1}/{questions.length}
          </p>
        </div>
        <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl px-6 py-3">
          <p className="text-yellow-300 text-sm font-medium">
            იღებ ქულებს სხვების შეცდომებზე! 💰
          </p>
        </div>
      </div>
    </div>
  );
}
```

### Phase 5: Queue UI - Allow Any Player to Add

**File: `src/components/team/RoomLobbyV2.tsx`**

Currently the CategoryPickerSection is shown. We need to ensure ANY player (not just host) can add to queue. 

The hook `useRoomCategoryQueue` doesn't restrict by host - any authenticated user in the room can add items. We just need to ensure the UI is visible to all players.

Check and verify that:
1. The "კატეგორიის დამატება" section is visible to all participants
2. The `addToQueue` function works for non-hosts

**Required RLS Policy Update:**

```sql
-- Allow any room participant to insert into queue
CREATE POLICY "Room participants can add to queue"
ON room_category_queue
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM room_participants 
    WHERE room_id = room_category_queue.room_id 
    AND user_id = auth.uid()
  )
);
```

### Phase 6: Results Screen - Add More Rounds Button

**File: `src/components/team/GameResultsScreenV2.tsx`**

The current implementation shows:
- **Has queue:** "გაგრძელება" button (host only can start)
- **No queue, host:** "კატეგორიის დამატება" button
- **No queue, non-host:** "ველოდებით მასპინძელს..." message

Update to allow any player to add rounds:

```typescript
{queue.length > 0 ? (
  // Has queue - only host can start, others see waiting
  isHost ? (
    <ChunkyButton onClick={handlePlayAgain}>
      გაგრძელება: {nextQueueItem?.category_name}
    </ChunkyButton>
  ) : (
    <div className="text-center py-4 ...">
      <p className="text-white font-medium">შემდეგი რაუნდი მზადაა</p>
      <p className="text-white/50 text-sm">ველოდებით მასპინძელს...</p>
    </div>
  )
) : (
  // No queue - any player can add categories
  <ChunkyButton onClick={handleBackToRoom} icon={<Plus />}>
    კატეგორიის დამატება
  </ChunkyButton>
)}
```

---

## Summary of Changes

| File | Changes |
|------|---------|
| `migrations/*.sql` | Add `host_observer_id` column to `game_rooms` |
| `migrations/*.sql` | Add RLS policy for any participant to add to queue |
| `MultiplayerContextV2.tsx` | Add `hostIsObserver` state, observer detection logic, observer scoring |
| `MultiplayerContextV2.tsx` | Increment `plays_count` when blind trivia is played |
| `MultiplayerGameScreenV2.tsx` | Add observer UI for host when observing |
| `GameResultsScreenV2.tsx` | Allow any player to add categories, show clearer queue status |
| `RoomLobbyV2.tsx` | Ensure category picker is visible to all players |

---

## Flow Diagrams

### Game Start Flow with Observer Check:

```text
Host clicks "დაწყება"
         │
         ▼
 ┌───────────────────┐
 │ Check source_type │
 └─────────┬─────────┘
           │
     ┌─────┴─────┐
     ▼           ▼
 category    user_trivia
     │           │
     │           ▼
     │    ┌──────────────┐
     │    │ Is host owner?│
     │    └──────┬───────┘
     │           │
     │      ┌────┴────┐
     │      ▼         ▼
     │     YES       NO
     │      │         │
     │      │         └─► Host PLAYS
     │      ▼
     │  ┌────────────┐
     │  │ is_blind?  │
     │  └─────┬──────┘
     │        │
     │   ┌────┴────┐
     │   ▼         ▼
     │  YES       NO
     │   │         │
     │   │         └─► Host SKIPS
     │   ▼
     │ ┌─────────────┐
     │ │plays_count>0│
     │ └──────┬──────┘
     │        │
     │   ┌────┴────┐
     │   ▼         ▼
     │  YES       NO
     │   │         │
     │   │         └─► Host PLAYS (first time seeing questions)
     │   └─────────────► Host SKIPS (already seen)
     │
     └─────────────────► Host PLAYS (library)
```

---

## Testing Checklist

1. **Library category:** Create room, pick library category, verify host plays normally
2. **My Trivia (non-blind):** Create non-blind trivia, pick it in room, verify host sees observer UI
3. **Blind Trivia (first play):** Create blind trivia, pick it in room, verify host can play
4. **Blind Trivia (second play):** Same trivia again, verify host now observes
5. **Observer scoring:** Verify host earns 100 points per player mistake
6. **Queue additions:** Verify non-host player can add categories to queue
7. **Continue flow:** Verify "გაგრძელება" button works with queue items
8. **Add rounds:** Verify "კატეგორიის დამატება" returns to lobby for any player
