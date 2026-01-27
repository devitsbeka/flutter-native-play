

# Fix: Controller Navigation and Duplicate Selection Prevention

## Problems Identified

1. **Back Button Always Goes to `/team`**: The `onBack` prop in `TVHostController.tsx` is hardcoded to `navigate('/team')` instead of going back to the previous page in history.

2. **Duplicate Category/Trivia Selection**: Users can select the same category or trivia multiple times, creating duplicates in the queue (as shown in the screenshot with "გეოგრაფია" appearing twice).

---

## Solution

### File 1: `src/pages/TVHostController.tsx`

**Change the `onBack` handler to use browser history:**

```typescript
// Line ~569: Change from
onBack={() => navigate('/team')}

// To
onBack={() => {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    navigate('/team');
  }
}}
```

This matches the pattern already used in `ControllerPollScreen.tsx`.

---

### File 2: `src/components/controller/ControllerDirectSelection.tsx`

**Add duplicate checking before adding items to queue:**

#### 1. Category Selection - Check if category already exists in queue

```typescript
// In handleSelectCategory (around line 87)
const handleSelectCategory = async (category: Category) => {
  // Check if this category is already in the queue
  const alreadyInQueue = queue.some(
    (item) => item.source_type === 'category' && item.category_id === category.category_id
  );
  
  if (alreadyInQueue) {
    toast.error(`${category.name} უკვე არჩეულია!`);
    setShowCategoryPicker(false);
    return;
  }
  
  setLoading(true);
  // ... rest of existing logic
};
```

#### 2. Trivia Selection - Check if trivia already exists in queue

```typescript
// In handleSelectTrivia (around line 105)
const handleSelectTrivia = async (trivia: UserTrivia) => {
  // Check if this trivia is already in the queue
  const alreadyInQueue = queue.some(
    (item) => item.source_type === 'user_trivia' && item.user_trivia_id === trivia.id
  );
  
  if (alreadyInQueue) {
    toast.error(`${trivia.title} უკვე არჩეულია!`);
    setShowTriviaPicker(false);
    return;
  }
  
  setLoading(true);
  // ... rest of existing logic
};
```

#### 3. Visual Feedback - Show already-selected items as disabled in pickers

For categories (around line 174):
```typescript
{categories.map((category) => {
  const isSelected = queue.some(
    (item) => item.source_type === 'category' && item.category_id === category.category_id
  );
  
  return (
    <button
      key={category.id}
      onClick={() => !isSelected && handleSelectCategory(category)}
      disabled={loading || isSelected}
      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
        isSelected 
          ? 'bg-white/5 border-green-400/50 opacity-60 cursor-not-allowed' 
          : 'bg-white/10 border-white/20 hover:border-purple-400'
      }`}
    >
      {/* ... existing content ... */}
      {isSelected ? (
        <Check className="w-5 h-5 text-green-400" />
      ) : (
        <ChevronRight className="w-5 h-5 text-purple-300" />
      )}
    </button>
  );
})}
```

For trivias (around line 218):
```typescript
{userTrivias.map((trivia) => {
  const isSelected = queue.some(
    (item) => item.source_type === 'user_trivia' && item.user_trivia_id === trivia.id
  );
  
  return (
    <button
      key={trivia.id}
      onClick={() => !isSelected && handleSelectTrivia(trivia)}
      disabled={loading || isSelected}
      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
        isSelected 
          ? 'bg-white/5 border-green-400/50 opacity-60 cursor-not-allowed' 
          : 'bg-white/10 border-white/20 hover:border-purple-400'
      }`}
    >
      {/* ... existing content ... */}
      {isSelected ? (
        <Check className="w-5 h-5 text-green-400" />
      ) : (
        <ChevronRight className="w-5 h-5 text-purple-300" />
      )}
    </button>
  );
})}
```

#### 4. Add Check icon to imports

```typescript
import { 
  Library, 
  User, 
  Play, 
  X, 
  ChevronRight, 
  Sparkles,
  Crown,
  ArrowLeft,
  Check  // Add this
} from 'lucide-react';
```

---

## Summary

| File | Changes |
|------|---------|
| `src/pages/TVHostController.tsx` | Update `onBack` to use browser history with `/team` fallback |
| `src/components/controller/ControllerDirectSelection.tsx` | Add duplicate checks, disable already-selected items in pickers, show checkmark instead of chevron for selected items |

## Result

- **Back button**: Returns to previous page, falls back to `/team` only if no history exists
- **Duplicate prevention**: Categories and trivias already in queue are visually marked as selected (checkmark, disabled styling) and cannot be added again
- **User feedback**: Toast error message if somehow attempting to add a duplicate

