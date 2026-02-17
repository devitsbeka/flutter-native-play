

## Problem Analysis

The current question generation pipeline (`generate-category-trivia`) has a fundamental flaw: **the AI doesn't know what topics already exist in your database**. Here's why duplicates keep appearing:

1. **Only 50 question texts are sent as exclusions** (line 188), but categories have 220-370+ questions
2. Even when sent, the AI sees raw question strings -- it doesn't understand the underlying **facts/topics** being tested
3. The Jaccard text similarity filter (0.55 threshold) catches obvious text overlaps but misses semantic duplicates like "When did Kartli adopt Christianity?" vs "In which century did Georgia become Christian?" -- same fact, different words
4. The AI generates from the same "common knowledge" pool every time with no topic-level steering

## Solution: Topic-Aware Generation Pipeline

### Core Idea
Before generating, extract a compact **topic fingerprint** of all existing questions in the category using AI summarization, then feed that as a structured exclusion list. This replaces the current "paste 50 raw questions" approach.

### Step 1: New Edge Function `extract-category-topics`
- Fetches ALL question texts for a category (up to 500)
- Calls AI to compress them into a list of ~50-80 **topic labels** (e.g., "Kartli Christianity adoption - 4th century", "Tamar Mepe - first queen", "Tbilisi founding - 458 AD")
- Returns a compact topic list that fits easily in a prompt

### Step 2: Update `generate-category-trivia` Prompt Strategy
- Replace the raw 50-question exclusion list with the topic fingerprint
- Add explicit instruction: "Here are topics already covered. Generate questions about COMPLETELY DIFFERENT facts"
- Increase temperature slightly (0.95) for more creative output
- Add a "topic_hint" field in the prompt asking AI to suggest what NEW subtopic each question covers

### Step 3: Update `AiGenerator.tsx` (Flow Page)
- Before generating, call `extract-category-topics` once to get the topic fingerprint
- Pass the fingerprint to each `generate-category-trivia` batch call
- Cache the fingerprint during a generation session so multiple batches share the same exclusion context

## Technical Details

### New Edge Function: `extract-category-topics`

```
Input: { categoryId: string }
Process:
  1. SELECT question_text, correct_answer FROM questions 
     WHERE category_id = X AND is_active = true AND language = 'ka'
     LIMIT 500
  2. Call AI: "Summarize these questions into a list of distinct facts/topics being tested. 
     Return as JSON array of short topic labels (max 15 words each)."
Output: { topics: string[], count: number }
```

### Updated `generate-category-trivia` Prompt Changes

Replace the current exclusion section (lines 188-197):
```
Current: "არსებული კითხვები: [50 raw question texts]"

New: "უკვე დაფარული თემები (არ გაიმეორო!):
1. თბილისის დაარსება - 458 წ.
2. ქართლის გაქრისტიანება - IV საუკუნე
3. თამარ მეფე - პირველი დედოფალი
... (50-80 topics)

შექმენი კითხვები რომლებიც ეხება სრულიად ახალ ფაქტებს, 
პიროვნებებს, მოვლენებს ან თარიღებს!"
```

### Updated `AiGenerator.tsx` Flow

```
1. User clicks "Generate"
2. Call extract-category-topics(categoryId) -> topicFingerprint
3. For each batch:
   - Call generate-category-trivia({ ..., coveredTopics: topicFingerprint })
4. Existing text-similarity dedup remains as safety net
```

### Files to Create
- `supabase/functions/extract-category-topics/index.ts` -- new edge function

### Files to Modify
- `supabase/functions/generate-category-trivia/index.ts` -- accept `coveredTopics` param, restructure prompt
- `src/pages/admin/import/AiGenerator.tsx` -- call topic extraction before generation
- `supabase/config.toml` -- register new function

