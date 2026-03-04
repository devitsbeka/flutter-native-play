

## Fix "შემოკლება" (Shorten Answers) — Debugging & Fix

### Diagnosis

Edge function logs show only boot/shutdown — no request processing logs. This means either:
1. The function receives the request but crashes before any logging
2. The client-side code silently errors before making the call

### Plan

#### 1. Add debugging logs to edge function (`supabase/functions/shorten-answers/index.ts`)
Add `console.log` at key points:
- Right after JSON parsing: log received params (`questionIds`, `categoryId`, `aggressiveMode`)
- After query: log number of questions found and number with long answers
- This will reveal if the function is called and what it finds

#### 2. Add debugging to client hook (`src/hooks/useQuestionStudio.ts`)
Add `console.log` in `bulkShortenAnswers`:
- Before the invoke call: log the IDs being sent
- After the response: log the full `data` and `error` objects
- This will reveal if the function is called and what it returns

#### 3. Redeploy the edge function
Ensure the latest code (with `questionIds` support and status filter bypass) is actually live.

### Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/shorten-answers/index.ts` | Add console.log at start, after query, after filtering |
| `src/hooks/useQuestionStudio.ts` | Add console.log in bulkShortenAnswers before/after invoke |

This is a quick debug-first approach. Once we see the logs, we'll know exactly what's failing and can fix it immediately.

