

## Strengthen Fact-Checking to Eliminate Factual Errors

### Root Cause

The current pipeline generates questions with `google/gemini-2.5-flash` and fact-checks them with `google/gemini-3-flash-preview` at a 0.85 confidence threshold. Flash models are fast but prone to confidently confirming incorrect facts, especially for niche Georgian trivia. The checker and generator share the same "knowledge gaps."

### Solution: Dual-Model Cross-Validation

Use **two different model families** for fact-checking. A question only passes if **both** models agree it's correct with high confidence. This catches cases where one model's blind spots are covered by the other.

### Changes

**File: `supabase/functions/_shared/factCheck.ts`**

1. Raise default `minConfidence` from `0.85` to `0.95`
2. Add a second verification pass using `openai/gpt-5-mini` (different model family than the Gemini generator/checker)
3. A question passes only if BOTH models mark it as `pass: true` above the confidence threshold
4. Log which model rejected a question and why, for debugging

**File: `supabase/functions/generate-category-trivia/index.ts`**

1. Pass `minConfidence: 0.95` explicitly to `factCheckQuestions`
2. Add a prompt instruction to the generator: only use well-established, widely-documented facts -- avoid obscure or disputed claims

### Technical Details

Updated `factCheckQuestions` logic:

```
Pass 1: google/gemini-2.5-pro (upgraded from flash) -> results1
Pass 2: openai/gpt-5-mini (cross-family check)      -> results2

Final: question passes ONLY if results1[i].pass AND results2[i].pass
       AND both have confidence >= 0.95
```

The two passes run in parallel (`Promise.all`) so there's no extra latency -- just one additional API call per batch.

### Why This Works

- Gemini and GPT have different training data and knowledge bases
- If a fact is wrong, it's unlikely both model families will agree it's correct at 95%+ confidence
- Upgrading the primary checker from flash to pro also improves single-model accuracy
- The 0.95 threshold means "if not near-certain, reject" -- better to lose a valid question than ship a wrong one

### Files to Edit

- `supabase/functions/_shared/factCheck.ts` -- add dual-model cross-validation, raise threshold
- `supabase/functions/generate-category-trivia/index.ts` -- pass higher confidence, add "verified facts only" prompt instruction
