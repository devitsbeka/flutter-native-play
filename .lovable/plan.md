

# Plan: Fix Non-Host Not Transitioning to Game Screen

## Problem Summary

When the host starts a game (especially with their own trivia where they observe), the non-host player remains stuck in the lobby while the host sees the game screen. This is a state desynchronization issue.

## Root Cause

The `roomChannel` subscription in `MultiplayerContextV2.tsx` only listens for **future** room updates. It doesn't check the **current** room status when the subscription is first established.

**Current problematic flow:**
```text
1. Non-host joins room (room.status = "waiting")
2. Room subscription starts connecting
3. Host starts game (room.status → "playing")  
4. Room subscription fully connects
5. ❌ Non-host missed the update event
6. Non-host stuck in "lobby" phase
```

The `participantsChannel` already has this pattern correctly implemented (lines 431-435), but `roomChannel` does not.

---

## Technical Solution

### Fix Location: `src/contexts/MultiplayerContextV2.tsx`

### Change 1: Add Initial State Sync to Room Subscription

Replace the simple `.subscribe()` call with a callback that checks the current room status when the subscription is ready:

**Current code (line 421):**
```typescript
.subscribe();
```

**Fixed code:**
```typescript
.subscribe(async (status) => {
  // When subscription is ready, check if room is already playing
  if (status === 'SUBSCRIBED') {
    // Fetch fresh room data to check current status
    const { data: freshRoom } = await supabase
      .from("game_rooms")
      .select("*")
      .eq("id", roomId)
      .single();
    
    if (freshRoom && freshRoom.status === "playing") {
      const currentPhase = phaseRef.current;
      const currentIsHost = isHostRef.current;
      
      // Only handle if we're in lobby/results and NOT the host
      if ((currentPhase === "lobby" || currentPhase === "results") && !currentIsHost) {
        console.log(`[MP] Subscription connected, room already playing. Fetching questions...`);
        
        // Same logic as the UPDATE handler
        setState(prev => ({
          ...prev,
          questions: [],
          currentQuestionIndex: 0,
          myScore: 0,
          opponentAnswers: {},
          lastQuestionResult: null,
          currentRoom: freshRoom as GameRoom,
        }));
        
        const expectedGameId = freshRoom.current_game_id;
        
        // Wait for questions to be fully committed
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Fetch with retry logic
        let attempts = 0;
        const MAX_ATTEMPTS = 8;
        const RETRY_DELAY = 600;
        let roomQuestions: any[] | null = null;
        let validQuestionsFound = false;
        
        while (attempts < MAX_ATTEMPTS && !validQuestionsFound) {
          const { data } = await supabase
            .from("room_questions")
            .select("*")
            .eq("room_id", roomId)
            .eq("game_id", expectedGameId)
            .order("question_index", { ascending: true });
          
          roomQuestions = data;
          
          if (roomQuestions && roomQuestions.length > 0) {
            validQuestionsFound = true;
            break;
          }
          
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          attempts++;
        }
        
        if (validQuestionsFound && roomQuestions && roomQuestions.length > 0) {
          const questions = roomQuestions.map((q: any) => ({
            id: `${roomId}-${q.question_index}`,
            question: q.question_text,
            correctAnswer: q.correct_answer,
            incorrectAnswers: q.incorrect_answers,
            allAnswers: q.shuffled_answers?.length > 0 
              ? q.shuffled_answers 
              : [...q.incorrect_answers, q.correct_answer],
            difficulty: q.difficulty || "medium",
            category: freshRoom.category_name || "General",
            iconSlug: q.icon_slug || undefined,
          }));
          
          setState(prev => ({
            ...prev,
            questions,
            currentQuestionIndex: 0,
            myScore: 0,
            phase: "playing",
            lastQuestionResult: null,
            opponentAnswers: {},
            currentRoom: freshRoom as GameRoom,
          }));
        } else {
          toast.error("კითხვების სინქრონიზაცია ვერ მოხერხდა. ცადე თავიდან.");
          setState(prev => ({
            ...prev,
            phase: "lobby",
            currentRoom: freshRoom as GameRoom,
          }));
        }
      }
    }
  }
});
```

---

## Alternative Approach: Extract Shared Logic

To avoid code duplication, we could extract the question-fetching logic into a helper function:

```typescript
const handlePlayingTransition = async (
  roomId: string, 
  roomData: GameRoom
) => {
  // Clear local state
  setState(prev => ({
    ...prev,
    questions: [],
    currentQuestionIndex: 0,
    myScore: 0,
    opponentAnswers: {},
    lastQuestionResult: null,
    currentRoom: roomData,
  }));
  
  const expectedGameId = roomData.current_game_id;
  
  // ... rest of question fetching logic
};
```

Then use this in both:
1. The room UPDATE subscription handler
2. The initial SUBSCRIBED callback

---

## Files to Modify

| File | Change |
|------|--------|
| `src/contexts/MultiplayerContextV2.tsx` | Add initial state sync callback to room subscription |

---

## Expected Behavior After Fix

1. Non-host joins room while room is in "waiting" status
2. Subscription starts connecting
3. Host starts game (room becomes "playing")
4. If subscription catches the UPDATE event → transition works normally
5. If subscription connects AFTER the update → initial sync checks room status and transitions to playing
6. Both host and non-host see the game screen

---

## Testing Recommendations

1. Host creates room with their own trivia
2. Non-host joins room
3. Host starts game (becomes observer)
4. Verify both players see game screen
5. Test with slight network delays to ensure sync works
6. Test rapid game start (within 1-2 seconds of join)

