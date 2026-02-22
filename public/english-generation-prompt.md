# English Trivia Question Generation Prompt

> Copy-paste this entire prompt to an AI agent (Claude, GPT, etc.) to generate trivia questions for bulk import.

---

## Your Task

Generate **200 trivia questions** for the category **`[CATEGORY_SLUG]`** in **English** following the exact JSON format and quality rules below.

Split your output into **4 batches of 50 questions** each.

---

## Output Format

Return a valid JSON object with a single `questions` array:

```json
{
  "questions": [
    {
      "category_slug": "astronomy",
      "question_text": "What is the largest planet in our solar system?",
      "correct_answer": "Jupiter",
      "incorrect_answers": ["Saturn", "Mars", "Neptune"],
      "difficulty": "easy",
      "language": "en",
      "icon_keyword": "planet"
    }
  ]
}
```

---

## STRICT Rules (Questions violating these are REJECTED)

### Character Limits
| Field | Max Length |
|-------|-----------|
| `question_text` | **65 characters** (including `?`) |
| `correct_answer` | **20 characters** |
| Each `incorrect_answer` | **20 characters** |

### Formatting
- `question_text` **MUST** end with `?`
- Single, clear, unambiguous question — no compound sentences
- Do NOT start with "Which of the following..."
- All 4 answers must be grammatically consistent

### Answer-in-Question Check (CRITICAL)
The correct answer **MUST NOT** appear as a substring in the question text.

- ❌ `"What is Jupiter's largest moon?"` + answer `"Jupiter"` → REJECTED
- ✅ `"What is the largest planet in our solar system?"` + answer `"Jupiter"` → OK

### Answer Length Balance
Max difference between the longest and shortest answer: **8 characters**

### Answer Count
- Exactly **3 incorrect answers** (4 options total)
- No duplicates among the 4 options
- All answers must be non-empty

---

## Difficulty Distribution

Per batch of 200 questions:
- **easy** (30% = ~60 questions): Common knowledge, widely known facts
- **medium** (50% = ~100 questions): Requires some domain knowledge
- **hard** (20% = ~40 questions): Expert-level, obscure or nuanced

---

## Icon Keyword Rules

The `icon_keyword` field is **optional but recommended**.

- Should be a **single English word** describing the question's **topic** (not the answer!)
- Examples: `"planet"`, `"war"`, `"dna"`, `"pyramid"`, `"music"`
- The icon keyword **MUST NOT** match or hint at the correct answer
- If the answer is `"pyramid"`, do NOT use `"pyramid"` as the keyword

---

## Duplicate Avoidance

- Vary the **fact being tested**, not just the phrasing
- Do NOT ask the same thing from different angles (e.g., "Who painted X?" and "Which artist created X?")
- Each question should test a **unique piece of knowledge**

---

## 41 Eligible Categories

Use exactly one of these `category_slug` values per question:

| Slug | English Name |
|------|-------------|
| `anime_manga` | Anime & Manga |
| `archaeology` | Archaeology |
| `architecture` | Architecture |
| `astronomy` | Astronomy |
| `biology` | Biology |
| `nature` | Nature |
| `geography` | Geography |
| `geology` | Geology |
| `ecology` | Ecology |
| `economics` | Economics |
| `languages` | Languages & Linguistics |
| `video_games` | Video Games |
| `movies` | Movies |
| `space` | Space |
| `math` | Mathematics |
| `medicine` | Medicine & Health |
| `memes_internet` | Memes & Internet |
| `science` | Science |
| `myths_reality` | Myths vs Reality |
| `fashion` | Fashion & Style |
| `world_history` | World History |
| `world_cuisine` | World Cuisine |
| `music` | Music |
| `politics` | Politics |
| `pop_culture` | Pop Culture |
| `programming` | Programming |
| `religion_mythology` | Religion & Mythology |
| `robotics_ai` | Robotics & AI |
| `military_history` | Military History |
| `fun_facts` | Fun Facts |
| `tv_series` | TV Series |
| `social_media` | Social Media |
| `sports` | Sports |
| `technology` | Technology |
| `physics` | Physics |
| `philosophy` | Philosophy |
| `psychology` | Psychology |
| `chemistry` | Chemistry |
| `celebrities` | Celebrities |
| `animals` | Animals |
| `art` | Art |

**DO NOT use:** `georgian_history`, `georgian_culture`, `georgian_literature`, `georgian_cuisine`

---

## Quality Checklist (verify before submitting)

- [ ] Every `question_text` is ≤65 characters and ends with `?`
- [ ] Every `correct_answer` is ≤20 characters
- [ ] Every incorrect answer is ≤20 characters
- [ ] No correct answer appears as a substring in its question
- [ ] Answer length difference within each question ≤8 characters
- [ ] Exactly 3 incorrect answers per question
- [ ] No duplicate questions testing the same fact
- [ ] `category_slug` matches the table above exactly
- [ ] `difficulty` is one of: `easy`, `medium`, `hard`
- [ ] `language` is `"en"` for all questions
- [ ] `icon_keyword` (if set) does NOT match the correct answer
- [ ] JSON is valid and parseable

---

## Example Batch (5 questions)

```json
{
  "questions": [
    {
      "category_slug": "astronomy",
      "question_text": "What is the closest star to Earth?",
      "correct_answer": "The Sun",
      "incorrect_answers": ["Proxima Centauri", "Sirius", "Alpha Centauri"],
      "difficulty": "easy",
      "language": "en",
      "icon_keyword": "star"
    },
    {
      "category_slug": "world_history",
      "question_text": "In what year did World War II end?",
      "correct_answer": "1945",
      "incorrect_answers": ["1944", "1946", "1943"],
      "difficulty": "easy",
      "language": "en",
      "icon_keyword": "war"
    },
    {
      "category_slug": "biology",
      "question_text": "What organelle is the powerhouse of a cell?",
      "correct_answer": "Mitochondria",
      "incorrect_answers": ["Nucleus", "Ribosome", "Chloroplast"],
      "difficulty": "easy",
      "language": "en",
      "icon_keyword": "cell"
    },
    {
      "category_slug": "movies",
      "question_text": "Who directed the 1994 film Pulp Fiction?",
      "correct_answer": "Quentin Tarantino",
      "incorrect_answers": ["Martin Scorsese", "Steven Spielberg", "David Fincher"],
      "difficulty": "medium",
      "language": "en",
      "icon_keyword": "film"
    },
    {
      "category_slug": "chemistry",
      "question_text": "What is the chemical symbol for gold?",
      "correct_answer": "Au",
      "incorrect_answers": ["Ag", "Fe", "Cu"],
      "difficulty": "easy",
      "language": "en",
      "icon_keyword": "metal"
    }
  ]
}
```

---

## How to Use This Prompt

1. Replace `[CATEGORY_SLUG]` with one category from the table above
2. Ask the AI to generate 200 questions for that category
3. Request output in 4 batches of 50
4. Combine all batches into one JSON file per category
5. Upload via the Bulk Import tool at `/admin/import`

To generate all 8,200 questions, repeat for each of the 41 categories.
