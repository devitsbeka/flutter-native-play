

## Bulk Import System with Auto-Icon Assignment + Schema Template + Quality Guide

This plan covers three deliverables:
1. A new "Bulk Import" tab on /admin/import for importing thousands of questions from JSON with auto-icon assignment
2. A downloadable JSON schema template file for AI agents to use
3. A downloadable Markdown quality guide with all validation rules

---

### Deliverable 1: JSON Schema Template File

A new file `public/question-import-schema.json` that serves as both documentation and a template for AI agents. It will contain a JSON Schema definition plus example entries.

**Schema structure per question:**
```json
{
  "category_slug": "string (e.g. 'astronomy', 'biology')",
  "question_text": "string, max 65 chars, must end with '?'",
  "correct_answer": "string, max 20 chars",
  "incorrect_answers": ["string", "string", "string"],
  "difficulty": "easy | medium | hard",
  "language": "en | fr | de | es | it | pt-br",
  "icon_keyword": "optional string hint for icon matching (e.g. 'planet', 'dna')"
}
```

The file will include:
- JSON Schema ($schema) for validation
- Required/optional field definitions with exact constraints
- An `examples` array with 3-5 sample questions across different categories/languages
- A mapping of all 45 active category slugs to their UUIDs and Georgian names (so AI agents can reference them)

---

### Deliverable 2: Quality Control Guide (Markdown)

A new file `public/question-quality-guide.md` containing ALL quality rules extracted from the codebase:

**Content includes:**
- Character limits: question max 65 chars, answer max 20 chars
- Question must end with `?`
- Correct answer must NOT appear in question text (substring check with normalization)
- Exactly 3 incorrect answers required
- Max answer length difference of 8 chars between answers
- Similarity threshold of 0.55 for duplicate detection
- Dual-model fact-check requirement (Gemini 2.5 Pro + GPT-5-mini, 0.95+ confidence)
- AI review scoring: grammar (30%), uniqueness (40%), clarity (30%)
- Grade thresholds: A (90+), B (75-89), C (50-74), D (below 50)
- Semantic duplicate detection rules
- Icon keyword rules: icon must NOT hint at the correct answer
- Language-specific notes (Georgian word constraints for translations)

---

### Deliverable 3: Enhanced Bulk Import UI

**New file: `src/pages/admin/import/BulkImport.tsx`**

A dedicated import component with these features:

1. **File Upload**: Accept `.json` files (drag-and-drop or file picker). Parse and validate all questions client-side using existing `validateQuestion()` logic.

2. **Category Mapping**: Auto-map `category_slug` from the JSON to actual category UUIDs using a lookup table. Show unmapped categories as warnings.

3. **Language Selection**: Support importing questions with a `language` field per question, or apply a single language to all.

4. **Auto Icon Assignment**: After parsing, call the existing `batch-assign-icons` edge function to automatically assign `icon_slug` to all questions that don't already have one. This function uses keyword-based matching from the 9,000+ icon library.

5. **Preview and Review**:
   - Summary dashboard: total questions, valid/invalid counts, per-category breakdown, per-language breakdown
   - Reuse existing `QuestionPreviewList` component for individual question review/editing
   - Bulk actions: select all valid, deselect invalid, filter by category/difficulty/language
   - Icon override: click any question's icon to change it via `IconPickerModal`

6. **Destination Selection**: Radio buttons for "Library" (`in_production: false`) or "Production" (`in_production: true`)

7. **Batch Import**: Insert questions in chunks of 100 using the existing `bulkAddQuestions` from `useAdminQuestions`. After insert, trigger `batch-assign-icons` edge function for any questions without icons.

**Modifications to existing files:**

- **`src/pages/admin/Import.tsx`**: Add a new tab "Bulk Import" with a `PackagePlus` icon, rendering `<BulkImport />`
- **`src/hooks/useQuestionParser.ts`**: Add a new `parseFromBulkJson()` method that handles the extended schema format (with `category_slug`, `language`, `icon_keyword` fields) and maps category slugs to UUIDs
- **`src/pages/admin/import/QuestionPreviewList.tsx`**: No changes needed -- it already supports icons, editing, selection, and filtering

**New edge function: `supabase/functions/bulk-import-assign-icons/index.ts`**

A lightweight wrapper that:
1. Accepts an array of `{ question_text, correct_answer, category_name }` objects
2. Uses the same keyword-based icon matching logic from `batch-assign-icons` (TOPIC_TO_ICONS mapping + icon library tag search)
3. Returns `{ question_index, suggested_icon_slug }[]`
4. Does NOT require AI calls -- purely keyword/tag matching for speed with thousands of questions

---

### Technical Flow

```text
User uploads JSON file (1000+ questions)
    |
    v
Client-side validation (char limits, format, question mark)
    |
    v
Category slug -> UUID mapping
    |
    v
Preview dashboard (stats, filters, per-question review)
    |
    v
Auto-assign icons (call bulk-import-assign-icons edge function)
    |
    v
User reviews, edits individual questions/icons if needed
    |
    v
User selects destination (Library / Production)
    |
    v
Batch insert in chunks of 100 via bulkAddQuestions
```

---

### Files to Create
1. `public/question-import-schema.json` -- JSON Schema template for AI agents
2. `public/question-quality-guide.md` -- Complete quality control documentation
3. `src/pages/admin/import/BulkImport.tsx` -- Main bulk import UI component
4. `supabase/functions/bulk-import-assign-icons/index.ts` -- Fast icon assignment for bulk imports

### Files to Modify
1. `src/pages/admin/Import.tsx` -- Add new "Bulk Import" tab
2. `src/hooks/useQuestionParser.ts` -- Add `parseFromBulkJson()` method with category mapping

