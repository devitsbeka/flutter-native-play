
## Strategy: Generate 8,000+ English Questions via Bulk Import

### The Problem
The current in-app generation pipeline (`generate-category-trivia`) is hardcoded for Georgian language with Georgian prompts, topic guidance, and exclusion lists. Adapting it for English and running 8,000 questions through it would be slow (rate limits), expensive, and error-prone.

### Recommended Approach: External AI Generation + Bulk Import

Use external AI agents (Claude, GPT, etc.) with the existing JSON schema template and quality guide to generate ~200 English questions per category across 41 global categories, then import via the Bulk Import system.

### What Needs to Change

**1. Update the JSON schema and quality guide for English**

The existing `public/question-import-schema.json` and `public/question-quality-guide.md` already support English, but we should add:
- A ready-to-use prompt template section in the quality guide specifically for English generation
- A list of the 41 eligible categories (excluding the 4 Georgian-specific ones)
- Target counts per category (~200 each)

**2. Create a dedicated English generation prompt file**

New file: `public/english-generation-prompt.md`

A complete, copy-paste-ready prompt for external AI agents containing:
- All 41 global category slugs with English names
- The exact JSON output format expected
- All quality rules (65-char question limit, 20-char answer limit, no answer-in-question, etc.)
- Icon keyword instructions
- Difficulty distribution (30% easy, 50% medium, 20% hard)
- Target: ~200 questions per category
- Instructions to split output into batches of 50 questions per category for manageability

**3. Enhance Bulk Import to handle large English batches**

Minor updates to `src/pages/admin/import/BulkImport.tsx`:
- Add a progress indicator for large imports (1000+ questions)
- Add category-level stats in the preview (show how many questions per category)
- Auto-set language to "en" when all questions are English

### Category Breakdown (41 categories, ~200 each = ~8,200 questions)

| Group | Categories | Count |
|-------|-----------|-------|
| Science | astronomy, biology, chemistry, physics, math, science, geology, ecology, medicine | 9 |
| History/Culture | world_history, military_history, archaeology, religion_mythology, philosophy | 5 |
| Geography | geography, space, nature, languages | 4 |
| Technology | programming, technology, robotics_ai | 3 |
| Entertainment | movies, tv_series, music, video_games, anime_manga, pop_culture, celebrities | 7 |
| Society | politics, economics, psychology, fashion, social_media, memes_internet | 6 |
| Arts | art, architecture, world_cuisine | 3 |
| Misc | sports, animals, fun_facts, myths_reality | 4 |

**Excluded (Georgian-specific):** georgian_history, georgian_culture, georgian_literature, georgian_cuisine

### Workflow

```text
Step 1: Generate the English prompt file (public/english-generation-prompt.md)
        - Contains everything an AI agent needs to produce valid questions

Step 2: You give this prompt to external AI agents (Claude/GPT)
        - Ask them to generate 200 questions per category in batches
        - Output: JSON files following the schema

Step 3: Import via /admin/import -> Bulk Import tab
        - Upload JSON file(s)
        - Auto-validation + category mapping
        - Auto-icon assignment via edge function
        - Preview, review, approve

Step 4: Questions go to Library or Production
```

### Technical Details

**Files to create:**
- `public/english-generation-prompt.md` -- Complete prompt template for AI agents with all 41 categories, rules, and expected JSON format

**Files to modify:**
- `public/question-quality-guide.md` -- Add English-specific section with the 41 eligible categories
- `src/pages/admin/import/BulkImport.tsx` -- Add progress bar for large imports, per-category stats in preview

### Cost Estimate

Using external AI agents (e.g., Claude or GPT) to generate 8,200 questions:
- Approximately $5-15 total (much cheaper than the in-app pipeline since no fact-checking or research steps)
- The quality guide ensures the AI agent produces correctly formatted output
- Post-import, you can optionally run the quality review from /admin/review to score them

### Why This Approach Wins

1. **Speed**: External AI can generate 200 questions in one shot vs. batches of 5-10 in-app
2. **Cost**: No research, fact-check, or translation steps needed (questions are natively English)
3. **Quality**: The schema + quality guide enforce all constraints upfront
4. **Flexibility**: You can use any AI model, iterate on batches, and review before importing
5. **Icons**: The bulk import auto-assigns icons via the existing edge function
