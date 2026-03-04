

## Fix: Apply All AI-Shortened Answers, Not Just Those Under 20 Chars

### Root Cause

Lines 235-241 in `shorten-answers/index.ts` have a strict gate: if the AI returns an answer that's still >20 characters, the code **falls back to the original long answer**. This means if the AI shortens "It significantly reduced travel time" to "Reduced travel time" (19 chars) it applies, but if it returns "Reduced travel times" (20 chars) it also applies. However if it returns "Significantly reduced travel" (27 chars), the original 40+ char answer is kept unchanged.

The result: 2 answers that the AI successfully got under 20 are applied, while 2 that the AI couldn't squeeze under 20 revert to their original (even longer) versions. The question gets marked "შემოკლდა" but the answers are still broken.

### Fix

Change the acceptance logic: **always apply the AI's version if it's shorter than the original**, even if it's still over 20 chars. This ensures all 4 answers improve. The status tracking already handles "partially_shortened" vs "shortened" to indicate whether all are within limits.

### Changes in `supabase/functions/shorten-answers/index.ts`

| Lines | Current | New |
|-------|---------|-----|
| 235 | Apply only if `parsed.correct.length <= MAX_ANSWER_LENGTH` | Apply if shorter than original OR within limit |
| 238-241 | Apply only if `ans.length <= MAX_ANSWER_LENGTH` | Apply if shorter than original OR within limit |

```typescript
// Line 235: Before
const newCorrect = parsed.correct.length <= MAX_ANSWER_LENGTH ? parsed.correct : question.correct_answer;

// Line 235: After  
const newCorrect = (parsed.correct.length <= MAX_ANSWER_LENGTH || parsed.correct.length < question.correct_answer.length) 
  ? parsed.correct : question.correct_answer;

// Lines 238-241: Before
const newIncorrect = parsed.incorrect.map((ans, idx) => {
  if (ans && ans.length <= MAX_ANSWER_LENGTH) return ans;
  return incorrectAnswers[idx] || ans;
});

// Lines 238-241: After
const newIncorrect = parsed.incorrect.map((ans, idx) => {
  const original = incorrectAnswers[idx] || '';
  if (ans && (ans.length <= MAX_ANSWER_LENGTH || ans.length < original.length)) return ans;
  return original || ans;
});
```

This way all 4 answers always get the AI's improved version as long as it's at least shorter than what was there before.

