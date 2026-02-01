
# Comprehensive Fix for Quality Review System

## Issues Identified

### Issue 1: "Select All C-D" Only Selects D Questions
**Root Cause**: The `handleSelectAll` function correctly filters for C and D grades, BUT the checkbox's `checked` state comparison is fragile. When results are sorted, and if there's any timing issue with state updates, it could cause selection mismatch.

**Fix**: Ensure selection logic explicitly handles both C and D grades with proper state synchronization.

### Issue 2: "Move to Library" Doesn't Actually Work
**Root Cause**: Two problems:
1. The questions are only visually "marked" with `movedToLibrary: true` but never removed from the displayed results
2. No toast feedback if the update fails due to RLS (though admin role should work)

**Fix**: 
- After successful update, filter out moved questions from the results array
- Add proper error handling and feedback
- Remove moved questions from the UI

### Issue 3: Missing "Quick Resolve" Feature
**User Request**: Ability to auto-fix questions using AI recommendations

**Implementation**:
1. Create new edge function `resolve-question-quality` that:
   - Takes a question and its review data
   - Uses AI to generate corrected question text, correct answer, and incorrect answers
   - Updates the question in the database
   - Re-runs quality review to verify improvement

2. Add UI buttons:
   - "Quick Resolve" button on each question card
   - "Resolve Selected" button for batch resolution
   - Progress indicator for batch operations
   - Re-review confirmation after resolution

---

## Implementation Plan

### 1. Fix "Select All C-D" Selection Bug

**File: `src/pages/admin/QualityReview.tsx`**

Update the selection logic to be more explicit:

```text
// Current (lines 86-91):
const handleSelectAll = (checked: boolean) => {
  if (checked) {
    setSelectedIds(new Set(lowGradeResults.map(r => r.id)));
  } else {
    setSelectedIds(new Set());
  }
};

// Fixed version:
const handleSelectAll = (checked: boolean) => {
  if (checked) {
    // Explicitly filter for C and D grades from current results
    const cdIds = results
      .filter(r => r.grade === 'C' || r.grade === 'D')
      .map(r => r.id);
    setSelectedIds(new Set(cdIds));
  } else {
    setSelectedIds(new Set());
  }
};
```

Also update the checkbox checked state calculation to be more robust.

### 2. Fix "Move to Library" Functionality

**File: `src/hooks/useQuestionQualityReview.ts`**

Update `moveToLibrary` function:

```text
const moveToLibrary = useCallback(async (questionIds: string[]) => {
  if (questionIds.length === 0) {
    toast.error('No questions selected');
    return;
  }

  try {
    const { error } = await supabase
      .from('questions')
      .update({ in_production: false })
      .in('id', questionIds);

    if (error) throw error;

    toast.success(`Moved ${questionIds.length} questions to library`);
    
    // Remove moved questions from results (not just mark them)
    setResults(prev => prev.filter(r => !questionIds.includes(r.id)));
    
    // Update summary counts
    setSummary(prev => {
      const movedResults = results.filter(r => questionIds.includes(r.id));
      return {
        A: prev.A - movedResults.filter(r => r.grade === 'A').length,
        B: prev.B - movedResults.filter(r => r.grade === 'B').length,
        C: prev.C - movedResults.filter(r => r.grade === 'C').length,
        D: prev.D - movedResults.filter(r => r.grade === 'D').length,
      };
    });
  } catch (error) {
    console.error('Move to library error:', error);
    toast.error('Failed to move questions to library. Make sure you have admin permissions.');
  }
}, [results]);
```

### 3. Create New Edge Function for AI Resolution

**File: `supabase/functions/resolve-question-quality/index.ts`**

New edge function that:
- Receives question ID and review data
- Uses AI to generate improved question/answers based on identified issues
- Updates the question in database
- Optionally re-runs review to verify improvement

```text
Input:
{
  questionIds: string[],
  reviewData: ReviewResult[] // Contains issues and recommendations
}

Processing:
1. For each question, construct AI prompt with:
   - Original question text, correct answer, incorrect answers
   - Grammar issues identified
   - Uniqueness issues identified  
   - Clarity issues identified
   - Recommendations from review

2. AI returns corrected version:
   - Fixed question_text
   - Fixed correct_answer
   - Fixed incorrect_answers

3. Update question in database

4. Optionally re-review to confirm grade improvement

Output:
{
  resolved: [{ id, newGrade, success }],
  failed: [{ id, error }]
}
```

### 4. Add Resolution UI Components

**File: `src/pages/admin/QualityReview.tsx`**

Add:
- "Quick Resolve" button on each question card (only for C/D grades)
- "Resolve Selected" button in the header actions
- Resolution progress modal
- Re-review confirmation

**File: `src/hooks/useQuestionQualityReview.ts`**

Add new functions:
- `resolveQuestions(questionIds: string[], reviewData: ReviewResult[])`
- `resolving` state
- `resolveProgress` state

### 5. Update Config

**File: `supabase/config.toml`**

Add the new edge function configuration.

---

## Technical Details

### AI Prompt for Resolution

```text
System: You are a Georgian language trivia question expert. Your task is to fix 
questions to achieve A-grade quality (90%+ score).

Given:
- Original question and answers
- Identified issues (grammar, uniqueness, clarity)
- Recommendations

You must:
1. Fix all grammar issues (spelling, verb conjugation, case endings)
2. Ensure only ONE answer is correct with no ambiguity
3. Make incorrect answers clearly wrong but still plausible
4. Improve question clarity and phrasing

Return JSON:
{
  "question_text": "Fixed question",
  "correct_answer": "Fixed correct answer",
  "incorrect_answers": ["Fixed incorrect 1", "Fixed incorrect 2", "Fixed incorrect 3"],
  "changes_made": ["Change 1", "Change 2"]
}
```

### UI Flow

```text
1. User runs review -> sees results with grades
2. For low-grade questions:
   a. Click "Quick Resolve" on individual question
      -> AI fixes question
      -> Question is re-reviewed
      -> Updated grade shown inline
   
   b. Select multiple questions + click "Resolve Selected"
      -> Progress modal shows resolution progress
      -> After completion, all resolved questions re-reviewed
      -> Results updated with new grades
      
3. User can then move remaining C-D questions to library
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/resolve-question-quality/index.ts` | Create | New edge function for AI resolution |
| `src/hooks/useQuestionQualityReview.ts` | Edit | Add resolve functions, fix moveToLibrary |
| `src/pages/admin/QualityReview.tsx` | Edit | Fix selection bug, add resolve UI |
| `supabase/config.toml` | Edit | Add new function config |

---

## Summary of Fixes

1. **Selection Bug**: Direct filtering from `results` instead of cached `lowGradeResults`
2. **Move to Library**: Actually remove items from state after successful update
3. **Quick Resolve**: New AI-powered auto-fix feature with re-review capability
4. **Batch Resolution**: Select multiple questions and resolve all at once
5. **Better Feedback**: Clear progress indicators and success/error messages
