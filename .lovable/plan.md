
# Show Fixed Questions First in List

## Current Behavior
The results are sorted by grade (D → C → B → A) or by score (lowest first), but resolved/fixed questions appear mixed in with other questions at the same grade level.

## Requested Change
Fixed (resolved) questions should appear at the top of the list for easy review.

---

## Implementation

### File: `src/pages/admin/QualityReview.tsx`

Update the `sortedResults` memo (lines 72-81) to sort resolved questions first:

**Current logic:**
```typescript
const sortedResults = useMemo(() => {
  const sorted = [...results];
  if (sortBy === 'grade') {
    const gradeOrder = { D: 0, C: 1, B: 2, A: 3 };
    sorted.sort((a, b) => gradeOrder[a.grade] - gradeOrder[b.grade]);
  } else {
    sorted.sort((a, b) => a.overall_score - b.overall_score);
  }
  return sorted;
}, [results, sortBy]);
```

**New logic:**
```typescript
const sortedResults = useMemo(() => {
  const sorted = [...results];
  
  sorted.sort((a, b) => {
    // Resolved questions always come first
    const aResolved = resolvedIds.has(a.id) ? 0 : 1;
    const bResolved = resolvedIds.has(b.id) ? 0 : 1;
    if (aResolved !== bResolved) return aResolved - bResolved;
    
    // Then sort by grade or score
    if (sortBy === 'grade') {
      const gradeOrder = { D: 0, C: 1, B: 2, A: 3 };
      return gradeOrder[a.grade] - gradeOrder[b.grade];
    } else {
      return a.overall_score - b.overall_score;
    }
  });
  
  return sorted;
}, [results, sortBy, resolvedIds]);
```

---

## Result

After this change:
1. All fixed questions (green background) will appear at the top of the list
2. Within fixed questions, they'll still be sorted by grade/score
3. Non-fixed questions appear after, also sorted by grade/score
4. Easy to review all your fixed questions in one place
