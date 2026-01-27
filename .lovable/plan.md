

# Fix Plan: Three TV Mode Issues

## Issues to Fix

### Issue 1: Back/Start Game Buttons Not Clickable (Category Selection Screen)
**Location**: `src/components/controller/ControllerDirectSelection.tsx` and `src/pages/TVHostController.tsx`

**Root Cause**: After the game ends and the session transitions to `category-select` phase, the `useTVSessionQueue` hook may be returning stale or unmounted state, or there's a race condition where button handlers try to interact with uninitialized queue state.

**Evidence from Code Analysis**:
- The `ControllerDirectSelection` component (lines 186-192) has a guard that blocks start game if `!hasQueue || queue.length === 0`
- The back button handler in `TVHostController.tsx` (lines 603-611) uses complex history state checking which can fail
- After game completion, the session state may not properly reset the queue subscriptions

### Issue 2: TV Winners Preview After Poll
**Location**: `src/components/tv/TVResultsScreenV2.tsx` and `src/hooks/useTVPoll.ts`

**Root Cause**: After a poll completes and before the game starts, there's no dedicated screen showing which categories won and will be played in upcoming rounds. The TV transitions directly from `poll-results` to `countdown`.

**Current Behavior**: 
- `TVResultsScreenV2.tsx` (lines 218-249) does show a "Next round" preview if queue exists
- But there's no dedicated **post-poll winners preview** screen showing all selected categories before game start

**Solution**: Add a TV screen component for `poll-results` phase that displays all winning categories before transitioning to countdown.

### Issue 3: TV Timer Behavior (5 Second No-Answer Advance)
**Location**: `src/contexts/TVGameContext.tsx`

**Root Cause**: The current timer logic (lines 1086-1121) waits the full 15 seconds (`QUESTION_TIME`) before advancing to reveal. The user wants a different behavior: if no one answers for 5 seconds, stop the timer early, show the correct answer for 10 seconds, then move on.

**Current Logic**:
```typescript
// Timer runs full 15 seconds
if (prev.timeRemaining <= 1) {
  advanceToReveal('timer expired');
}
```

**Required Logic**:
- Track if any player has answered during the question phase
- If no one answers for 5 consecutive seconds, trigger early reveal
- Reveal phase should display for 10 seconds (currently uses `REVEAL_DURATION_MS = 1400`)

---

## Technical Solution

### Fix 1: Category Selection Button Issues

**File**: `src/components/controller/ControllerDirectSelection.tsx`

**Changes**:
1. Add proper state initialization and reset when entering category-select phase
2. Simplify the back button handler to use direct navigation
3. Add loading state guards for queue operations

```typescript
// Line 186: Simplify handleStartGame
const handleStartGame = () => {
  // Remove blocking condition - allow start even if queue is still loading
  if (queue.length === 0) {
    toast.error('აირჩიე მინიმუმ 1 კატეგორია');
    return;
  }
  onStartGame();
};
```

**File**: `src/pages/TVHostController.tsx`

**Changes**:
1. Simplify back button handler in category-select phase (lines 603-611)

```typescript
// Line 603-610: Replace complex history check with direct navigation
onBack={() => navigate('/team', { replace: true })}
```

### Fix 2: TV Poll Winners Preview Screen

**New File**: `src/components/tv/TVPollResultsScreen.tsx`

Create a dedicated TV display screen for poll results that shows:
- Winning categories with rank badges
- Who suggested each category
- Clear "Coming up..." header
- Auto-transition to countdown after a brief display (or host triggers it)

**File**: `src/pages/TVLobby.tsx`

**Changes**:
- Add routing for `poll-results` phase to show `TVPollResultsScreen`

```typescript
case 'poll-results':
  return <TVPollResultsScreen />;
```

**File**: `src/hooks/useTVPoll.ts`

The `finalizePollAndStartGame` function already sets up the queue correctly. We need to ensure the TV display shows this before transitioning.

### Fix 3: Early Timer Advance When No One Answers

**File**: `src/contexts/TVGameContext.tsx`

**Changes**:

1. Add new constant for no-answer timeout:
```typescript
const NO_ANSWER_TIMEOUT = 5; // seconds without answers before early advance
const REVEAL_DURATION_LONG_MS = 10000; // 10 seconds for timeout reveals
```

2. Add a ref to track "seconds since last answer":
```typescript
const noAnswerTimeRef = useRef<number>(0);
```

3. Modify the timer effect (lines 1092-1121) to check for no-answer condition:
```typescript
useEffect(() => {
  if (state.phase !== 'question') return;
  if (!state.sessionId) return;
  
  // Reset no-answer counter at start of question
  noAnswerTimeRef.current = 0;
  
  timerRef.current = setInterval(() => {
    setState(prev => {
      // Check if any player has answered
      const anyAnswered = prev.players.some(p => p.hasAnswered);
      
      // Increment no-answer time if no one has answered yet
      if (!anyAnswered) {
        noAnswerTimeRef.current += 1;
      } else {
        noAnswerTimeRef.current = 0; // Reset if someone answered
      }
      
      // Early advance if no one answered for 5 seconds
      if (!anyAnswered && noAnswerTimeRef.current >= NO_ANSWER_TIMEOUT) {
        if (isHostRef.current && prev.phase === 'question') {
          advanceToReveal('no answers for 5 seconds');
        }
        return { ...prev, timeRemaining: 0 };
      }
      
      // Normal timer expiration
      if (prev.timeRemaining <= 1) {
        if (isHostRef.current && prev.phase === 'question') {
          advanceToReveal('timer expired');
        }
        return { ...prev, timeRemaining: 0 };
      }
      
      return { ...prev, timeRemaining: prev.timeRemaining - 1 };
    });
  }, 1000);

  return () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };
}, [state.phase, state.sessionId, advanceToReveal]);
```

4. Modify reveal duration to be longer for no-answer scenarios (line 1162-1230):
```typescript
// In the reveal auto-advance effect, use longer timeout if no one answered
const revealDuration = state.players.every(p => !p.hasAnswered) 
  ? REVEAL_DURATION_LONG_MS 
  : REVEAL_DURATION_MS;
  
const t = setTimeout(async () => {
  // ... existing next question logic
}, revealDuration);
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/controller/ControllerDirectSelection.tsx` | Simplify button handlers, remove blocking conditions |
| `src/pages/TVHostController.tsx` | Simplify back button navigation |
| `src/pages/TVLobby.tsx` | Add `poll-results` phase routing |
| `src/components/tv/TVPollResultsScreen.tsx` | **NEW** - Winners preview screen for TV |
| `src/contexts/TVGameContext.tsx` | Add no-answer early advance logic, increase reveal duration for timeouts |

---

## Expected Behavior After Fixes

1. **Category Selection**: Back button and Start Game button work reliably after game ends
2. **TV Winners Preview**: After poll completes, TV shows winning categories with ranks before game starts
3. **Timer Behavior**: If no one answers for 5 seconds, timer stops, correct answer shows for 10 seconds, then next question appears

