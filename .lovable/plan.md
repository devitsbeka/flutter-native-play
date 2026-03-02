

## Fix: Verify and Debug Length-Based Sorting

### Investigation Results
I tested the database function `get_questions_sorted_by_length` directly and confirmed it works perfectly -- it returns the longest questions first (296 chars, 294 chars, 279 chars, etc.). The code in `useQuestionStudio.ts` also looks correct: it calls the RPC with proper `null` parameters when `sortBy === 'longest_question'`.

### Root Cause
The most likely issue is that the latest code changes haven't taken effect in your preview yet. Each time changes were made, the preview needs to rebuild. If you're viewing a cached version of the app, you'll still see the old behavior.

### Plan

**1. Add a visible character count to each question in the list**
This way, even after the sort works, you can immediately confirm questions are ordered longest-first. In `QuestionList.tsx`, add a small character count badge next to each question (e.g., "296c") so you can visually verify the sort order.

**2. Add `is_active = true` filter to the RPC**
The database function currently doesn't filter by `is_active`, which means it may include deactivated questions. Update the SQL function to add `AND q.is_active = true` to the WHERE clause.

**3. Add error logging if RPC fails**
Currently, if the RPC call errors, it shows a generic toast. Add more specific error logging so we can see exactly what fails.

**4. Force a hard refresh approach**
Add a timestamp or version indicator in the Question Studio header (e.g., "v2 - sorted by length") so you can confirm you're seeing the latest build.

### Technical Details

**File: `src/components/admin/studio/QuestionList.tsx`**
- Add character count display: show `{question.question_text.length}c` badge next to each question
- This gives immediate visual confirmation that sorting is working

**Database migration**
- Update `get_questions_sorted_by_length` to add `AND q.is_active = true` in the WHERE clause

**File: `src/hooks/useQuestionStudio.ts`**
- Add more detailed error logging around the RPC call
- Remove the debug `console.log` statements once confirmed working

### Expected Result
After these changes, when you open Question Studio on the Production tab, you'll see questions ordered from longest to shortest, with character count badges like "296c", "294c", "279c" making the sort order immediately obvious.

