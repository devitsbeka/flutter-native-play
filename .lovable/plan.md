
# Fix: TV Mode `__mixed__` Category Handling

## Problem Summary
The "დაწყება (1 რაუნდი)" button IS clickable, but the game fails to start because the TV mode doesn't handle the special `__mixed__` category marker correctly.

When a room is set up with "სხვადასხვა" (Mixed/Random categories), the `category_id` is `"__mixed__"`, but the `startGame` function in `TVGameContext.tsx` tries to resolve this as a real category UUID, which fails.

## Root Cause
- `TVHostController.tsx` passes `"__mixed__"` to `startGame(categoryId)`
- `TVGameContext.tsx` calls `resolveCategoryUuid("__mixed__")` 
- This returns `null` because there's no category with slug `__mixed__`
- Game fails with error: "Failed to resolve category UUID"

## Solution
Add special handling for `__mixed__` category in `TVGameContext.tsx`'s `startGame` function, similar to how `MultiplayerContextV2.tsx` handles it.

---

## Technical Changes

### File: `src/contexts/TVGameContext.tsx`

**Location:** Around line 2423-2435 (inside `startGame` function)

**Current Code:**
```tsx
} else if (categoryId) {
  // Use unified questionService for category questions
  const { getQuestions, resolveCategoryUuid } = await import('@/services/questionService');
  const { markQuestionsAsAsked } = await import('@/services/questionTracker');

  // Resolve category UUID
  const categoryUUID = await resolveCategoryUuid(categoryId);
  if (!categoryUUID) {
    tvLogError('startGame', 'Failed to resolve category UUID');
    return;
  }
  // ...
}
```

**Updated Code:**
```tsx
} else if (categoryId) {
  const { getQuestions, resolveCategoryUuid } = await import('@/services/questionService');
  const { markQuestionsAsAsked } = await import('@/services/questionTracker');

  // Handle __mixed__ category - random questions from all categories
  const isMixedCategory = categoryId === "__mixed__";
  
  if (isMixedCategory) {
    tvLog('Using mixed category mode for TV', { categoryId });
    
    // Fetch random questions without category filter
    const result = await getQuestions({
      mode: 'tv',
      count: 10,
      // No categoryUuid = fetch from all categories
    });

    if (result.questions.length === 0) {
      tvLogError('startGame', 'No questions available');
      return;
    }

    formattedQuestions = result.questions.map(q => ({
      id: q.id,
      question_text: q.question,
      correct_answer: q.correctAnswer,
      options: q.allAnswers,
      icon_slug: q.iconSlug,
      image_url: q.imageUrl,
      video_url: q.videoUrl,
      audio_url: q.audioUrl,
    }));

    categoryName = 'სხვადასხვა';
    categoryIcon = 'mystery-box';
  } else {
    // Standard category - resolve UUID
    const categoryUUID = await resolveCategoryUuid(categoryId);
    if (!categoryUUID) {
      tvLogError('startGame', 'Failed to resolve category UUID');
      return;
    }
    
    // ... rest of existing category handling
  }
}
```

### Key Logic Changes

1. **Check for `__mixed__`** before trying to resolve UUID
2. **Call `getQuestions` without `categoryUuid`** for mixed mode (triggers random category fetch)
3. **Set appropriate metadata**: `categoryName = 'სხვადასხვა'`, `categoryIcon = 'mystery-box'`

---

## Implementation Notes

- The `questionService.getQuestions()` already supports fetching from random categories when no `categoryUuid` is provided
- This mirrors the existing pattern in `MultiplayerContextV2.tsx` (line 1189)
- The fix is isolated to `TVGameContext.tsx` - no changes needed elsewhere
