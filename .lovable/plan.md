

## Fix: Question Generation Still Producing Duplicates

### Root Causes Identified

1. **Topic fingerprint is not compressing** -- `extract-category-topics` returns 263 topics from 373 questions (nearly 1:1 mapping). The AI treats each question as a separate topic instead of merging related facts. When 263 topics are passed to the generator, the prompt is bloated and the AI ignores most of them.

2. **No answer-based dedup** -- The system only compares question TEXT similarity (Jaccard at 0.55). But if a generated question has `correct_answer: "ვახტანგ გორგასალი"` and an existing question already has the same answer, it's almost certainly testing the same fact. This check doesn't exist.

3. **Server relies on client-sent 200 questions** -- The generate function receives `existingQuestions` from the frontend (limited to 200), but Georgian History has 202+ questions. The server should fetch directly from DB.

### Solution: Three-Layer Fix

#### Layer 1: Fix `extract-category-topics` -- Real Compression

- Change the prompt to force a **max of 80 topics** regardless of question count
- Instruct the AI to group related questions into single topics (e.g., 5 questions about "ვახტანგ გორგასალი" = 1 topic, not 5)
- Use a smarter model (`google/gemini-2.5-pro`) for better summarization

#### Layer 2: Add Answer-Based Dedup in `generate-category-trivia`

- Server fetches ALL existing `correct_answer` values from DB for the category
- Before any text similarity check, reject any generated question whose `correct_answer` exactly matches an existing one
- Also pass the list of existing answers to the AI prompt so it avoids generating questions about the same facts

#### Layer 3: Server-Side Full DB Check

- Instead of relying on client-sent `existingQuestions` (200 limit), the edge function fetches ALL question texts + answers directly from the database
- This ensures 100% coverage, not 200 out of 202+

### Technical Changes

#### File: `supabase/functions/extract-category-topics/index.ts`

- Update prompt to enforce max 80 topics with aggressive merging
- Upgrade model to `google/gemini-2.5-pro` for better comprehension
- Add instruction: "If 10 questions are about the same person, that's 1 topic, not 10"

#### File: `supabase/functions/generate-category-trivia/index.ts`

- Add DB fetch at start: `SELECT question_text, correct_answer FROM questions WHERE category_id = X AND is_active = true`
- Add answer-based dedup step (before text similarity): reject if `correct_answer` matches any existing answer
- Pass existing answers as an exclusion list in the prompt: "These answers already exist, do NOT create questions with these answers"
- Remove reliance on client-sent `existingQuestions` parameter

#### File: `src/pages/admin/import/AiGenerator.tsx`

- Remove the client-side fetch of 200 existing questions (server handles it now)
- Remove client-side `areSimilarQuestions` dedup (server handles it now)
- Keep simple exact-match dedup within the current session batch only

### Expected Impact

- Answer-based dedup alone would have caught most of the 16/20 duplicates you saw (same facts = same answers)
- Compressed topic fingerprint (80 vs 263) gives the AI a manageable exclusion list
- Server-side full DB check eliminates the 200-question blind spot
