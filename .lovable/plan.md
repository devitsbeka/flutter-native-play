

## Re-Import 96 Corrupted Anime/Manga Questions

### Situation
- 90 of the 96 questions were translated from English to Georgian by the broken resolve function
- 6 questions still have English text but were flagged
- Original English text is lost from the database

### Approach: AI-Powered Reverse Translation

Instead of deleting and regenerating from scratch, we'll translate the 90 Georgian questions back to English. The content/trivia facts are correct -- they're just in the wrong language.

### Steps

#### 1. Create a one-time edge function `restore-english-questions`

This function will:
- Fetch all 96 questions with `quality_status = 'needs_rewrite'` in the Anime/Manga category
- For questions with Georgian text: send them to Gemini to translate back to English
- For questions already in English: just reset their status
- Apply character limits (question: 65 chars, answer: 20 chars)
- Update each question in the database:
  - Set `question_text`, `correct_answer`, `incorrect_answers` to the English translations
  - Set `language = 'en'` (confirm it's correct)
  - Clear `quality_status` (set to NULL)
  - Clear `ai_review_score`, `ai_review_grade`, `ai_review_data`, `last_ai_review`
  - Keep `in_production = false` so they can be reviewed before going live

#### 2. AI Prompt Strategy

The prompt will instruct the model to:
- Translate Georgian trivia questions about Anime/Manga back to English
- Keep proper nouns (character names, show titles) in their standard English form
- Respect character limits
- Return clean JSON for batch processing

#### 3. After restoration

- All 96 questions will have English text with `quality_status = NULL` and `in_production = false`
- You can then run the (now language-aware) quality review to check them
- Promote good ones to production

### Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/functions/restore-english-questions/index.ts` | New edge function for one-time batch reverse-translation |

### Technical Notes

- Will process in batches of 10 to stay within AI token limits
- Uses the existing Lovable AI integration (no extra API key needed)
- The function can be deleted after use since it's a one-time operation
