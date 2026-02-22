# Trivia Question Quality Control Guide

> Complete reference for AI agents generating trivia questions for bulk import.
> All rules below are enforced by the system — questions violating them will be rejected.

---

## 1. Character Limits (STRICT — No Truncation)

| Field | Max Length | Warning Threshold |
|-------|-----------|-------------------|
| `question_text` | **65 characters** | 55 characters |
| `correct_answer` | **20 characters** | 15 characters |
| Each `incorrect_answer` | **20 characters** | 15 characters |

- Questions exceeding these limits are **REJECTED**, not truncated.
- Count includes spaces, punctuation, and the trailing `?`.

---

## 2. Formatting Rules

### Question Text
- **MUST** end with a question mark (`?`)
- Should be a single, clear, unambiguous question
- Avoid multi-part questions or compound sentences
- Avoid starting with "Which of the following..." (wastes characters)

### Answers
- Should be concise nouns, names, dates, or short phrases
- All 4 answers (1 correct + 3 incorrect) should be grammatically consistent
- **Max length difference** between the longest and shortest answer: **8 characters**
  - Example: If correct answer is "იუპიტერი" (9 chars), incorrect answers should be 1–17 chars each

---

## 3. Answer-in-Question Check (CRITICAL)

The correct answer **MUST NOT** appear as a substring in the question text.

### How it works:
1. Both question and answer are lowercased and punctuation is stripped
2. If the normalized correct answer (≥4 chars) appears anywhere in the normalized question → **REJECTED**
3. For multi-word answers: if the first 2 words (≥6 chars combined) appear in the question → **REJECTED**

### Examples:
- ❌ `"რომელია იუპიტერის ყველაზე დიდი თანამგზავრი?"` + answer `"იუპიტერი"` → REJECTED (answer in question)
- ✅ `"მზის სისტემის რომელი პლანეტაა ყველაზე დიდი?"` + answer `"იუპიტერი"` → OK

---

## 4. Answer Count

- Exactly **3 incorrect answers** required (total 4 options with correct)
- No duplicates among the 4 options
- All answers must be non-empty

---

## 5. Difficulty Distribution

Recommended distribution per category:
- **easy**: 30% — Common knowledge, widely known facts
- **medium**: 50% — Requires some domain knowledge
- **hard**: 20% — Expert-level, obscure or nuanced

---

## 6. Duplicate Detection

### Layer 1: Same-Answer Detection (O(n) speed)
- Questions within the same category sharing an **identical correct answer** (≥3 chars) are flagged as "Same Answer" (იგივე პასუხი) duplicates.

### Layer 2: Text Similarity (Jaccard)
- Questions with **≥55% Jaccard similarity** in their text (within same category) are flagged as "Similar Text" (მსგავსი ტექსტი) duplicates.

### Layer 3: Semantic Duplicate Detection (AI-powered)
- During AI review, questions are checked against up to **50,000 existing questions** in the category.
- Semantic duplicates (same fact, different wording) are heavily penalized and flagged with '🧠 Semantic Dup'.

### Best Practices to Avoid Duplicates:
- Vary the fact being tested, not just the phrasing
- Don't ask the same thing from different angles (e.g., "Who painted X?" and "Which artist created X?")
- Check the existing question pool for the category before generating

---

## 7. Dual-Model Fact-Check (Post-Import)

After import, questions undergo fact-checking using two AI models in parallel:
- **Google Gemini 2.5 Pro** — Primary fact-checker
- **OpenAI GPT-5 Mini** — Secondary verification

### Requirements:
- Both models must return **≥0.95 confidence** that the correct answer is factually accurate
- If either model returns <0.95, the question is flagged for manual review
- Questions with <0.80 confidence from either model are auto-rejected

### What's Checked:
- Is the correct answer actually correct?
- Are all incorrect answers actually wrong?
- Is the question unambiguous (only one valid answer)?

---

## 8. AI Quality Review Scoring

Each question is scored 0–100% across three dimensions:

| Dimension | Weight | What's Checked |
|-----------|--------|----------------|
| Grammar | 30% | Spelling, punctuation, sentence structure |
| Uniqueness | 40% | Not a duplicate of existing questions (text + semantic) |
| Clarity | 30% | Unambiguous, well-formed, single correct answer |

### Grade Thresholds:
- **A** (90–100%): Ready for production
- **B** (75–89%): Acceptable with minor issues
- **C** (50–74%): Needs improvement — "Fix" button available
- **D** (below 50%): Should be rejected or completely rewritten

---

## 9. Icon Assignment Rules

### icon_keyword Field
- Optional but recommended for faster icon assignment
- Should be a single English word describing the question's **topic** (not the answer!)
- Examples: `"planet"`, `"war"`, `"dna"`, `"pyramid"`, `"music"`

### Critical Rule: Icon Must NOT Hint at Answer
- The assigned icon **MUST NOT** visually or semantically suggest the correct answer
- Example: If the answer is "pyramid", the icon should NOT be a pyramid
- The system validates this automatically and rejects icons that match the answer

### How Auto-Assignment Works:
1. Keywords from the question text and `icon_keyword` are extracted
2. Matched against a **9,000+ 3D icon library** using:
   - Topic-to-icon mappings (e.g., "egypt" → pharaoh, pyramid, scarab)
   - Tag-based search in the icon database
   - Category-level fallback icons
3. Icons that match the correct answer are automatically excluded

---

## 10. Language-Specific Notes

### Georgian (ka) — Primary Language
- Georgian script uses unique characters (ა-ჰ)
- Georgian words tend to be longer than English equivalents
- Pay extra attention to the 20-char answer limit — some Georgian words are naturally long
- Common abbreviations are acceptable if widely understood

### Supported Languages
| Code | Language |
|------|----------|
| `ka` | Georgian (ქართული) |
| `en` | English |
| `fr` | French |
| `de` | German |
| `es` | Spanish |
| `it` | Italian |
| `pt-br` | Brazilian Portuguese |

---

## 11. Category Slugs Reference

| Slug | Georgian Name |
|------|--------------|
| `anime_manga` | ანიმე და მანგა |
| `archaeology` | არქეოლოგია |
| `architecture` | არქიტექტურა |
| `astronomy` | ასტრონომია |
| `biology` | ბიოლოგია |
| `nature` | ბუნება |
| `geography` | გეოგრაფია |
| `geology` | გეოლოგია |
| `ecology` | ეკოლოგია |
| `economics` | ეკონომიკა |
| `languages` | ენები და ლინგვისტიკა |
| `video_games` | ვიდეო თამაშები |
| `movies` | კინო |
| `space` | კოსმოსი |
| `math` | მათემატიკა |
| `medicine` | მედიცინა და ჯანმრთელობა |
| `memes_internet` | მემები და ინტერნეტი |
| `science` | მეცნიერება |
| `myths_reality` | მითები თუ რეალობა |
| `fashion` | მოდა და სტილი |
| `world_history` | მსოფლიო ისტორია |
| `world_cuisine` | მსოფლიო სამზარეულო |
| `music` | მუსიკა |
| `politics` | პოლიტიკა |
| `pop_culture` | პოპ კულტურა |
| `programming` | პროგრამირება |
| `religion_mythology` | რელიგია და მითოლოგია |
| `robotics_ai` | რობოტიკა და AI |
| `military_history` | სამხედრო ისტორია |
| `georgian_history` | საქართველოს ისტორია |
| `fun_facts` | სახალისო ფაქტები |
| `tv_series` | სერიალები |
| `social_media` | სოციალური მედია |
| `sports` | სპორტი |
| `technology` | ტექნოლოგიები |
| `physics` | ფიზიკა |
| `philosophy` | ფილოსოფია |
| `psychology` | ფსიქოლოგია |
| `georgian_culture` | ქართული კულტურა |
| `georgian_literature` | ქართული ლიტერატურა |
| `georgian_cuisine` | ქართული სამზარეულო |
| `chemistry` | ქიმია |
| `celebrities` | ცნობილი ადამიანები |
| `animals` | ცხოველები |
| `art` | ხელოვნება |

---

## 12. JSON File Format

Your output file must be a valid JSON object with a single `questions` array:

```json
{
  "questions": [
    {
      "category_slug": "astronomy",
      "question_text": "მზის სისტემის რომელი პლანეტაა ყველაზე დიდი?",
      "correct_answer": "იუპიტერი",
      "incorrect_answers": ["სატურნი", "მარსი", "ნეპტუნი"],
      "difficulty": "easy",
      "language": "ka",
      "icon_keyword": "planet"
    }
  ]
}
```

See `question-import-schema.json` for the full JSON Schema definition with all constraints.

---

## 13. Pre-Import Checklist

Before submitting your JSON file, verify:

- [ ] All `question_text` values are ≤65 characters and end with `?`
- [ ] All `correct_answer` values are ≤20 characters
- [ ] All `incorrect_answers` arrays have exactly 3 items, each ≤20 characters
- [ ] No correct answer appears as a substring in its question text
- [ ] Answer length difference within each question ≤8 characters
- [ ] All `category_slug` values match the reference table
- [ ] All `difficulty` values are one of: `easy`, `medium`, `hard`
- [ ] All `language` values are valid language codes
- [ ] `icon_keyword` (if provided) does NOT match or hint at the correct answer
- [ ] No duplicate questions (same fact, same category)
- [ ] JSON is valid and parseable
