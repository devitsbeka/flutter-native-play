
# Fix Duplicate Category Selection in TV Host Controller

## Problem

The user can select the same category twice in the TV host controller queue (as shown in the screenshot with "მათემატიკა" appearing twice at positions 2 and 3).

The issue is a **race condition** where:
1. User clicks a category
2. `handleSelectCategory` checks if category exists in queue (passes)
3. Optimistic update adds item to queue
4. Modal closes, user reopens and clicks same category again
5. If done quickly, the second click's check might pass before the first update fully propagates

## Root Cause

The duplicate check in `handleSelectCategory` relies on the `queue` state, but:
1. **Rapid clicks**: The button is not properly disabled between click and optimistic update
2. **Loading state**: The `loading` state is shared across all categories, not per-category
3. **No debouncing**: Multiple clicks can fire before the first one completes

## Solution

### 1. Add per-selection loading state to prevent rapid duplicate clicks

Track which category is currently being added so we can disable its button immediately:

```typescript
const [pendingCategoryId, setPendingCategoryId] = useState<string | null>(null);
```

### 2. Update handleSelectCategory to set pending state immediately

Set the pending state BEFORE the async operation:

```typescript
const handleSelectCategory = async (category: Category) => {
  // Immediately mark as pending to prevent double-clicks
  setPendingCategoryId(category.category_id);
  
  // Check if already in queue
  const alreadyInQueue = queue.some(
    (item) => item.source_type === 'category' && item.category_id === category.category_id
  );
  
  if (alreadyInQueue) {
    toast.error(`${category.name} უკვე არჩეულია!`);
    setPendingCategoryId(null);
    setShowCategoryPicker(false);
    return;
  }
  
  setLoading(true);
  try {
    await addCategoryToQueue({...});
    toast.success(`${category.name} დაემატა!`);
  } catch (error) {
    console.error('Error adding category:', error);
    toast.error('დამატება ვერ მოხერხდა');
  }
  setLoading(false);
  setPendingCategoryId(null);
  setShowCategoryPicker(false);
};
```

### 3. Update button disabled logic to include pending state

```typescript
const isPending = pendingCategoryId === category.category_id;
const isDisabled = loading || isSelected || isPending;

<button
  onClick={() => !isDisabled && handleSelectCategory(category)}
  disabled={isDisabled}
  className={`... ${
    isSelected || isPending
      ? 'bg-white/5 border-green-400/50 opacity-60 cursor-not-allowed' 
      : 'bg-white/10 border-white/20 hover:border-purple-400'
  }`}
>
```

### 4. Apply same fix for trivia selection

Add `pendingTriviaId` state and apply the same pattern to `handleSelectTrivia`.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/controller/ControllerDirectSelection.tsx` | Add pending states for category/trivia, update handlers and button disabled logic |

---

## Summary

This fix prevents duplicate selections by:
1. **Immediately marking** the selected category as "pending" before any async work
2. **Disabling the button** for that specific category until the operation completes
3. **Applying the same pattern** to both category and trivia selection

The user will see the category become disabled immediately on click, preventing any possibility of double-selection.
