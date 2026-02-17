

## Problem: AI Generates from Same Knowledge Pool Every Time

The current pipeline has a fundamental limitation: **the AI model generates questions purely from its training data**. No matter how many exclusion lists or topic fingerprints you pass, the model keeps gravitating toward the same well-known facts because that's all it knows. The exclusion lists are already massive (200+ answers, 80+ topics) and the model simply ignores much of it.

### Why Current Approach Fails

1. **`gemini-2.5-flash` is weak at following long exclusion lists** -- with 200+ existing answers and 80+ covered topics in the prompt, the model's attention drifts and it defaults to common-knowledge facts
2. **No external knowledge source** -- the model generates from the same static training data every time, so it naturally produces the same popular facts
3. **Georgian History has 202 questions with only 150 unique answers** -- the topic space is already well-covered by the model's "easy" knowledge; fresh questions require digging into lesser-known facts that the model won't produce unprompted

### Solution: Web-Grounded Question Generation

Instead of asking the AI to "think of new facts", **fetch real content from the web first**, then generate questions based on that content. This guarantees fresh, factually grounded questions every time.

### Architecture

```text
User clicks "Generate"
       |
       v
[1] Extract topic fingerprint (existing)
       |
       v
[2] NEW: Web Research Phase
    - Use Perplexity API (or Lovable AI with search prompt)
    - Search for lesser-known facts about the category
    - Specifically ask for facts NOT in the covered topics list
    - Returns 20-30 concrete facts with sources
       |
       v
[3] Generate questions FROM the researched facts
    - AI gets specific facts to turn into questions
    - Not "think of questions" but "convert these facts into trivia format"
    - Much harder to produce duplicates when source material is new
       |
       v
[4] Answer-based dedup (existing)
[5] Text similarity dedup (existing)
[6] Dual-model fact-check (existing)
       |
       v
Final: Fresh, verified questions
```

### Technical Changes

#### 1. New Edge Function: `research-category-facts`

This function searches the web for fresh, lesser-known facts about a category topic, avoiding already-covered material.

- Takes: `category`, `coveredTopics[]`, `count`
- Uses Lovable AI (`google/gemini-2.5-pro` with a research-focused prompt) to generate a list of obscure/interesting facts
- The prompt explicitly says: "Here are facts we already have. Find completely different, lesser-known facts from Georgian history that are NOT in this list. Focus on: minor historical figures, regional events, archaeological discoveries, cultural artifacts, diplomatic relations, economic history, etc."
- Returns: array of `{ fact: string, source_hint: string }` objects

#### 2. Update `generate-category-trivia` Edge Function

- Accept a new `researchedFacts` parameter
- When `researchedFacts` is provided, change the prompt strategy entirely:
  - Instead of "generate trivia questions about Georgian history"
  - Use "Convert these specific facts into trivia questions" 
  - Each fact becomes one question -- the AI's job is formatting, not ideation
- Upgrade the generation model from `gemini-2.5-flash` to `gemini-2.5-pro` for better instruction-following
- Keep all existing dedup and fact-check steps as safety nets

#### 3. Update `AiGenerator.tsx` Frontend

- Add a "Sources" toggle (already shown in UI mockup) that enables web research mode
- Flow becomes:
  1. Extract topic fingerprint (existing)
  2. Call `research-category-facts` with covered topics
  3. Pass researched facts to `generate-category-trivia`
- Show a progress indicator during the research phase ("Searching for new facts...")

#### 4. Update `extract-category-topics` 

- Also return the list of existing `correct_answer` values (already fetched but not returned)
- This avoids a redundant DB query in the generation function

### Why This Works

- **Fresh content every time**: Web research finds different facts on each run because search results vary and the prompt asks for "facts NOT in this list"
- **Factually grounded**: Questions are based on real, searchable facts rather than AI hallucinations -- the dual-model fact-check then double-verifies
- **Harder to duplicate**: When the AI converts a specific fact like "In 1801, the Treaty of Georgievsk was violated when Russia annexed the Kingdom of Kartli-Kakheti" into a question, it's inherently unique
- **Scales naturally**: As more questions are added, the covered topics list grows, pushing research toward increasingly obscure (but real) facts

### Files to Create
- `supabase/functions/research-category-facts/index.ts` -- new web research function

### Files to Modify
- `supabase/functions/generate-category-trivia/index.ts` -- accept `researchedFacts`, change prompt strategy, upgrade model
- `src/pages/admin/import/AiGenerator.tsx` -- add research phase to generation flow
- `supabase/config.toml` -- register new function

