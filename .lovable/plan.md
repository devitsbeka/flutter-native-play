

# AI-Powered Question Quality Review System

## Overview
This plan outlines the implementation of a new admin page called "Review" that performs deep AI-powered analysis of trivia questions. The system will evaluate questions based on Georgian grammar correctness, answer uniqueness/clarity, and overall question confusion level, producing an A-D grade for each question.

## Grade Definitions
- **Grade A (90-100%)**: Excellent quality, production ready
- **Grade B (75-89%)**: Good quality, minor issues possible
- **Grade C (50-74%)**: Needs improvement, should be reviewed
- **Grade D (0-49%)**: Poor quality, needs rewrite

---

## Technical Implementation

### 1. New Edge Function: `review-question-quality`

**Location:** `supabase/functions/review-question-quality/index.ts`

This function will use Lovable AI to perform deep analysis on questions:

```text
Input:
- categoryId (optional): Filter by category
- questionIds (optional): Specific question IDs to review
- onlyProduction: boolean (filter to in_production questions)
- limit: number (batch size, default 20)

Processing (per question):
1. Grammar Check (30% weight):
   - Uses Georgian grammar AI prompt similar to verify-georgian-grammar
   - Checks verb conjugation, case endings, spelling
   - Score 0-100

2. Answer Uniqueness Check (40% weight):
   - Verifies only one answer is definitively correct
   - Checks for vague or ambiguous options
   - Ensures incorrect answers are plausibly wrong but clearly incorrect
   - Score 0-100

3. Confusion Analysis (30% weight):
   - Evaluates how confusing the question+answers combination is
   - Checks if question phrasing is clear
   - Assesses if answer options are distinguishable
   - Score 0-100

Output per question:
{
  id: string,
  overall_score: number (0-100),
  grade: "A" | "B" | "C" | "D",
  grammar_score: number,
  grammar_issues: string[],
  uniqueness_score: number,
  uniqueness_issues: string[],
  confusion_score: number,
  confusion_issues: string[],
  corrected_text?: string,
  recommendations: string[]
}
```

### 2. Database Schema Updates

Add new columns to the `questions` table for storing review results:

```sql
ALTER TABLE questions ADD COLUMN IF NOT EXISTS ai_review_score integer;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS ai_review_grade text;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS ai_review_data jsonb;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS last_ai_review timestamp with time zone;
```

### 3. New Admin Page: `QualityReview.tsx`

**Location:** `src/pages/admin/QualityReview.tsx`

**UI Layout:**

```text
+----------------------------------------------------------+
|  Quality Review                              [Run Review] |
+----------------------------------------------------------+
| Filters:                                                  |
| [Category Dropdown] [Status: All/Prod/Lib] [Limit: 50]   |
| [x] Only unreviewed                                       |
+----------------------------------------------------------+
| Progress: [==========] 45/100 questions reviewed          |
+----------------------------------------------------------+
| Summary:                                                  |
| Grade A: 12 | Grade B: 18 | Grade C: 10 | Grade D: 5     |
+----------------------------------------------------------+
| Results (sortable by grade):                              |
|                                                           |
| [x] Q1: "ვინ დაწერა ვეფხისტყაოსანი?"                      |
|     Grade: A (95%) | Grammar: 100 | Unique: 95 | Clear: 90|
|                                                           |
| [x] Q2: "რა არის საქართველოს დედაქალაქი?"                 |
|     Grade: C (62%) | Grammar: 80 | Unique: 50 | Clear: 55 |
|     Issues: "Multiple answers could be interpreted..."    |
|                                                           |
+----------------------------------------------------------+
| Selected: 15 questions                                    |
| [Move C-D to Library] [Export Issues CSV]                 |
+----------------------------------------------------------+
```

**Features:**
1. Category and status filters
2. Batch review with progress indicator
3. Results table with expandable details
4. Checkbox selection for bulk actions
5. "Move to Library" button for selected C-D grade questions
6. Visual grade badges (A=green, B=blue, C=yellow, D=red)

### 4. Custom Hook: `useQuestionQualityReview.ts`

**Location:** `src/hooks/useQuestionQualityReview.ts`

```typescript
interface ReviewResult {
  id: string;
  question_text: string;
  overall_score: number;
  grade: 'A' | 'B' | 'C' | 'D';
  grammar_score: number;
  grammar_issues: string[];
  uniqueness_score: number;
  uniqueness_issues: string[];
  confusion_score: number;
  confusion_issues: string[];
  recommendations: string[];
}

interface UseQuestionQualityReview {
  reviewing: boolean;
  progress: { current: number; total: number };
  results: ReviewResult[];
  summary: { A: number; B: number; C: number; D: number };
  startReview: (options: ReviewOptions) => Promise<void>;
  moveToLibrary: (questionIds: string[]) => Promise<void>;
  clearResults: () => void;
}
```

### 5. Route and Navigation Updates

**src/App.tsx:**
```typescript
const QualityReview = lazy(() => import("./pages/admin/QualityReview"));
// Add route:
<Route path="review" element={<QualityReview />} />
```

**src/pages/Admin.tsx:**
```typescript
// Add to toolsNavItems array:
{ 
  to: '/admin/review', 
  icon: ClipboardCheck, // from lucide-react
  label: 'Review' 
},
```

---

## File Changes Summary

| File | Action |
|------|--------|
| `supabase/functions/review-question-quality/index.ts` | Create |
| `src/pages/admin/QualityReview.tsx` | Create |
| `src/hooks/useQuestionQualityReview.ts` | Create |
| `src/App.tsx` | Edit (add route) |
| `src/pages/Admin.tsx` | Edit (add nav item) |
| Database migration | Create (add review columns) |
| `supabase/config.toml` | Edit (add function config) |

---

## AI Prompt Design

The edge function will use a carefully crafted prompt for Georgian trivia evaluation:

```text
System: You are an expert Georgian language trivia evaluator. 
Analyze each question for:

1. GRAMMAR (30%): Check Georgian spelling, verb conjugation, 
   case endings, and proper phrasing.

2. ANSWER UNIQUENESS (40%): Ensure exactly one answer is correct.
   Check if any incorrect answers could also be valid.
   Verify answers are not too similar or confusing.

3. CLARITY (30%): Assess if the question is clear and 
   unambiguous. Check if answer options are distinguishable.

Return JSON with scores 0-100 for each criterion and specific issues found.
```

---

## User Flow

1. Admin navigates to Admin > Tools > Review
2. Selects category (or all) and filters (production status)
3. Clicks "Run Review" - system processes questions in batches
4. Views results sorted by grade (worst first)
5. Expands individual questions to see detailed issues
6. Selects all C-D grade questions using checkbox
7. Clicks "Move to Library" to set `in_production = false`
8. Questions are now in library for manual improvement

