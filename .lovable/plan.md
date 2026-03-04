

## Fix: Better Answer Shortening — Send All 4 Answers Together

### Problem
The current approach only sends individual answers that exceed the character limit to the AI. This produces:
1. **Inconsistent quality** — shortened answers don't match the style/tone of untouched answers
2. **Poor results** — AI lacks context about the full answer set, can't balance them
3. **Misses opportunities** — e.g. "Long real; short TV" is awkward but under 20 chars so it's kept

### Solution
Change the prompt strategy: **always send ALL 4 answers to the AI** with the question, and ask it to produce a complete, balanced set of quiz-button-ready answers. This gives the AI full context to create coherent, high-quality answer options.

### Changes

#### `supabase/functions/shorten-answers/index.ts`

1. **Send all 4 answers** (correct + 3 incorrect) to the AI, not just the long ones
2. **New prompt**: Ask AI to rewrite the full answer set as concise, balanced quiz labels (max 20 chars each)
3. **Always apply results** for all 4 answers — the AI optimizes the entire set
4. **Use `response_format: { type: "json_object" }`** instead of hoping for clean JSON
5. **Use a better model** (`google/gemini-2.5-flash`) with clearer instructions

New prompt approach:
```
You are a trivia quiz answer editor. Given a question and its 4 answer options, 
rewrite ALL answers as short, high-quality quiz button labels (max 20 chars each).

Rules:
- ALL 4 answers must be ≤20 characters
- Answers should be similar in length and style (balanced)
- Keep factual accuracy — don't change which answer is correct
- Extract key concepts from sentences
- Use well-known abbreviations only
- If an answer is already good and short, keep it as-is

Question: "..."
Correct: "..."
Incorrect 1: "..."
Incorrect 2: "..."  
Incorrect 3: "..."

Return JSON: { "correct": "...", "incorrect": ["...", "...", "..."] }
```

This is simpler, produces better results, and handles the full set as a unit.

### Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/shorten-answers/index.ts` | Rewrite prompt to send all 4 answers, use `response_format: json_object`, apply all results |

