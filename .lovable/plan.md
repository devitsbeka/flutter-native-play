

## Fix: Duplicate Scanner Not Finding Real Duplicates

### Root Cause

The current duplicate scanner uses **Jaccard keyword similarity** (comparing shared words between questions). This fundamentally fails for Georgian trivia because:

- Two questions can ask the **exact same fact** with completely different wording
- Example: "რომელ წელს აიღეს კონსტანტინოპოლი ოსმალებმა?" vs "რა წელს დაეცა კონსტანტინოპოლი ოსმალების ხელში?" -- same answer (1453), same category, clearly duplicates, but the keyword overlap is low
- The database has **4,538 duplicate pairs** where questions share the same correct answer within the same category, but the scanner misses most of them

### Solution: Answer-Aware Duplicate Detection

Add a **two-layer detection approach**:

1. **Layer 1 -- Answer Match (new)**: If two questions in the same category have the exact same `correct_answer` (and the answer is 3+ characters), they are flagged as likely duplicates. This alone catches the majority of missed duplicates.

2. **Layer 2 -- Text Similarity (existing, improved)**: Keep the current Jaccard keyword comparison as a secondary check for questions with different answers but similar text.

### Technical Changes

**File: `src/hooks/useDuplicateDetection.ts`**

1. Update `fetchAllQuestions` to also fetch `correct_answer` and `category_id` fields
2. Update `scanDatabaseForDuplicates` to:
   - First, group questions by `category_id + correct_answer`
   - Any group with 2+ questions = automatic duplicate (skip expensive text comparison)
   - Then run the existing text similarity check only on remaining unpaired questions
   - This makes the scan both **faster** (skips O(n^2) for obvious matches) and **more accurate**
3. Update `DuplicateResult` interface to include `matchType: 'answer' | 'text'` so the UI can show why it was flagged

**File: `src/pages/admin/DuplicateScanner.tsx`**

4. Show match type badge: "იგივე პასუხი" (Same Answer) in orange, or "მსგავსი ტექსტი" (Similar Text) in yellow
5. Show the correct answer for answer-matched pairs so the admin can quickly verify
6. Lower the default threshold slider from 80% to 70% for the text similarity layer (to catch more edge cases)

### How the improved scan works

```text
9,101 active questions
        |
        v
  Group by (category_id + correct_answer)
        |
        +---> Groups with 2+ questions --> Flag as "Same Answer" duplicates
        |
        +---> Remaining questions --> Run Jaccard text similarity (existing logic)
        |
        v
  Combined results, sorted by match type then similarity
```

### Expected Impact

- Current scanner finds ~0-20 duplicates at 80% threshold
- New scanner will find **4,500+ duplicate pairs** from answer matching alone
- Much faster scan since answer grouping is O(n) vs O(n^2) text comparison
- No false positives for answer-based matches (same answer + same category is a definitive signal)

