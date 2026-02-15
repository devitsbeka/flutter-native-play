

## Enhance Quality Review: Issues-Only Mode and Source Selection

### Problem
Currently, every time you open Quality Review you must run a full AI review to see results. There's no way to:
1. Choose between reviewing only the **last N added** questions vs **all** questions in a category
2. Quickly see questions that **already have known issues** from previous reviews without re-running AI

### Solution

#### 1. Add "Source" filter: Last Added vs All
Replace the current "Last Added" selector (which is really just a limit) with a two-part control:
- **Source** dropdown: "Last Added" or "All"
- **Count** dropdown (only visible when "Last Added" is selected): 20, 50, 100, 200, 500

When "All" is selected, no limit is applied (uses a high limit like 1000).

#### 2. Add "Show Saved Issues" button
Add a new button alongside "Run Review" that loads questions from the database that already have `ai_review_grade` of B, C, or D -- questions with existing issues that need attention. This skips the AI call entirely and just queries the DB.

### Technical Changes

#### File: `src/pages/admin/QualityReview.tsx`

**New state:**
- `sourceMode`: `"last-added"` | `"all"` (default: `"last-added"`)

**New "Load Issues" function:**
- Query `questions` table where `ai_review_grade IN ('B', 'C', 'D')` and `is_active = true`
- Apply category and production filters
- Apply source/limit filters
- Order by `created_at DESC`
- Map the stored `ai_review_data` JSON + `ai_review_score` + `ai_review_grade` into `ReviewResult[]` format
- Set results directly without calling the edge function

**UI changes:**
- Add "Source" dropdown with "Last Added" / "All" options
- Show "Count" dropdown only when source is "Last Added"
- Add "Show Issues" button (outline style) next to "Run Review"
- "Run Review" does full AI analysis as before
- "Show Issues" loads pre-existing problematic questions from DB instantly

#### File: `src/hooks/useQuestionQualityReview.ts`

**Add `loadSavedIssues` function:**
- Accepts same `ReviewOptions` plus the source mode
- Queries DB directly for questions with `ai_review_grade` in B/C/D
- Reconstructs `ReviewResult` objects from stored `ai_review_data`
- Sets results and summary without invoking the edge function

### UI Layout (Filters row)
```
Category | Status | Source [Last Added v] | Count [200 v] | Sort By
                          [All        v]   (hidden when All)
```

### Button area
```
[Show Issues]  [Run Review]
```

- **Show Issues**: Instantly loads questions with existing B/C/D grades from DB
- **Run Review**: Full AI-powered review (existing behavior)

