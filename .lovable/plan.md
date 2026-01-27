
# Fix: Remove 5-Second Early Timeout, Keep Full 15-Second Questions

## Problem

The previous implementation misunderstood the requirement. It was cutting questions short after just 5 seconds if no one answered. The actual intended behavior:

1. **Questions always run for full 15 seconds** - players need time to read and think
2. **After timer expires**: If no one answered → show reveal for 10 seconds; if someone answered → show reveal for 1.4 seconds

The 5-second "no answer timeout" is WRONG and needs to be removed.

## Solution

Remove the early timeout logic entirely. Questions should always run their full duration. The extended reveal duration (10 seconds) for no-answer scenarios is already correctly implemented.

## Technical Changes

### File: `src/contexts/TVGameContext.tsx`

**Remove the early timeout logic from the timer effect (lines 1098-1144)**

```text
BEFORE:
- Tracks noAnswerTimeRef to count seconds without answers
- Advances early if noAnswerTimeRef >= 5

AFTER:
- Remove all NO_ANSWER_TIMEOUT early advance logic
- Keep the normal 15-second countdown
- Keep the extended reveal duration logic (already correct)
```

**Lines to modify:**

1. **Remove unused constant** (line 104):
   ```typescript
   // DELETE: const NO_ANSWER_TIMEOUT = 5;
   ```

2. **Remove refs** (lines 1098-1099):
   ```typescript
   // DELETE: const noAnswerTimeRef = useRef<number>(0);
   // DELETE: const noAnswerTriggeredRef = useRef<boolean>(false);
   ```

3. **Simplify timer effect** (lines 1113-1147) - Remove the no-answer tracking:
   ```typescript
   timerRef.current = setInterval(() => {
     setState(prev => {
       // Timer at 0 = stop
       if (prev.timeRemaining <= 1) {
         tvLogTimer('expired');
         if (isHostRef.current && prev.phase === 'question') {
           advanceToReveal('timer expired');
         }
         return { ...prev, timeRemaining: 0 };
       }
       
       // Simply count down - no early timeout logic
       return { ...prev, timeRemaining: prev.timeRemaining - 1 };
     });
   }, 1000);
   ```

## Expected Behavior After Fix

| Scenario | Duration | Reveal Duration |
|----------|----------|-----------------|
| Players answer within 15s | Full time until all answer or timer expires | 1.4 seconds |
| No one answers for 15s | Full 15 seconds | 10 seconds |
| Timer expires, some answered | Full timer | 1.4 seconds |

## Summary

| Change | Description |
|--------|-------------|
| Remove `NO_ANSWER_TIMEOUT` | Delete the 5-second constant |
| Remove early advance refs | Delete `noAnswerTimeRef` and `noAnswerTriggeredRef` |
| Simplify timer effect | Remove the no-answer checking logic, keep simple countdown |

The extended reveal (10 seconds when no one answered) at lines 1203-1207 is already correct and will continue to work.
