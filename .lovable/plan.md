
# Fix Quality Review: Resolution & Visual Feedback

## Problems Found

1. **Wrong AI Gateway URL**: The `resolve-question-quality` edge function uses `https://ai.lovable.dev/chat/completions` which doesn't exist. It should be `https://ai.gateway.lovable.dev/v1/chat/completions`

2. **No visual feedback for resolved questions**: After fixing questions, there's no indication that they were successfully resolved. User wants green highlighting for fixed questions.

3. **No tracking of resolved questions**: The system doesn't track which questions have been fixed vs their original state.

---

## Implementation Plan

### 1. Fix Edge Function URL

**File**: `supabase/functions/resolve-question-quality/index.ts`

Change both AI fetch calls from:
```
https://ai.lovable.dev/chat/completions
```
To:
```
https://ai.gateway.lovable.dev/v1/chat/completions
```

This affects lines 117 and 212 in the file.

### 2. Add Resolved State Tracking

**File**: `src/hooks/useQuestionQualityReview.ts`

Add a new state to track which question IDs have been successfully resolved:
```typescript
const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
```

Update `resolveQuestions` to add successfully resolved IDs to this set.

### 3. Add Visual Feedback for Resolved Questions

**File**: `src/pages/admin/QualityReview.tsx`

- Pass `resolvedIds` set to `QuestionResultCard`
- Add green border/background for resolved questions
- Show a "Resolved" badge or checkmark
- Optionally show "before" grade vs "after" grade

**Visual Design**:
```text
Before resolution:
┌─────────────────────────────────────────────┐
│ 🟠 Question text here...          [Fix] C  │
└─────────────────────────────────────────────┘

After resolution:
┌─────────────────────────────────────────────┐ Green border
│ ✅ Question text here...     [Resolved] A  │ Green bg tint
└─────────────────────────────────────────────┘
```

---

## Technical Changes

### Edge Function Fix (lines 117 & 212)

```typescript
// Line 117 - First AI call
const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {

// Line 212 - Second AI call (re-review)
const reviewResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
```

### Hook State Addition

```typescript
// New state
const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());

// In resolveQuestions, after successful resolution:
if (resolvedResults.length > 0) {
  setResolvedIds(prev => {
    const newSet = new Set(prev);
    resolvedResults.forEach(r => newSet.add(r.id));
    return newSet;
  });
}

// Return resolvedIds from hook
return { ...existing, resolvedIds };
```

### UI Visual Changes

```typescript
// In QuestionResultCard - add isResolved prop
const isResolved = resolvedIds.has(result.id);

// Apply green styling when resolved
<div className={cn(
  "border rounded-lg p-3 transition-colors",
  isResolved && "bg-green-500/10 border-green-500/50",
  isSelected && !isResolved && "bg-accent/50 border-accent"
)}>
  {isResolved && (
    <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
      ✓ Fixed
    </Badge>
  )}
</div>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/resolve-question-quality/index.ts` | Fix AI gateway URL (2 locations) |
| `src/hooks/useQuestionQualityReview.ts` | Add `resolvedIds` state tracking |
| `src/pages/admin/QualityReview.tsx` | Add green visual feedback for resolved questions |

---

## Expected Result

After implementation:
1. Clicking "Fix" will actually work (API calls succeed)
2. Successfully resolved questions show with green background/border
3. A "Fixed" badge appears on resolved questions
4. User can clearly see which questions have been improved
5. Questions that improve to A/B grade stay visible with new grade but green styling
