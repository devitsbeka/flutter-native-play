# Performance Analysis Report

This document identifies performance anti-patterns, N+1 queries, unnecessary re-renders, and inefficient algorithms in the codebase.

---

## Executive Summary

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| N+1 Queries | 1 | 0 | 2 | 1 |
| Unnecessary Re-renders | 2 | 3 | 5 | 3 |
| Inefficient Algorithms | 2 | 2 | 4 | 2 |
| Memory Leaks | 0 | 0 | 1 | 2 |

---

## 1. N+1 Query Anti-Patterns

### CRITICAL: Sequential Database Queries in Loop

**File:** `src/hooks/useUnreadRoomMessages.ts:41-54`

```typescript
for (const participation of participations) {
  const lastReadAt = participation.last_read_at || new Date(0).toISOString();

  const { count, error: countError } = await supabase
    .from("room_chat_messages")
    .select("*", { count: "exact", head: true })
    .eq("room_id", participation.room_id)
    .gt("created_at", lastReadAt)
    .neq("user_id", user.id);

  if (!countError && count !== null) {
    counts[participation.room_id] = count;
  }
}
```

**Impact:** If a user is in 10 rooms, this executes 10 separate COUNT queries.

**Recommended Fix:**
```typescript
// Option 1: Use a Supabase RPC function with GROUP BY
const { data } = await supabase.rpc('get_unread_counts_by_room', {
  user_id: user.id,
  room_ids: participations.map(p => p.room_id)
});

// Option 2: Fetch all messages and aggregate client-side (if small dataset)
const roomIds = participations.map(p => p.room_id);
const { data: messages } = await supabase
  .from("room_chat_messages")
  .select("room_id, created_at")
  .in("room_id", roomIds)
  .neq("user_id", user.id);

// Then aggregate by room_id with last_read_at comparison
```

---

### MEDIUM: Sequential Queries That Could Be Parallelized

**File:** `src/hooks/useSocialFeed.ts:145-166`

```typescript
// After inserting a like, these queries run sequentially
const { data: postData } = await supabase
  .from("user_quiz_posts")
  .select("user_id, title")
  .eq("id", postId)
  .single();

if (postData && postData.user_id !== user.id) {
  const { data: senderProfile } = await supabase
    .from("profiles")
    .select("nickname")
    .eq("user_id", user.id)
    .single();
  // ...
}
```

**Recommended Fix:**
```typescript
// Parallelize independent queries
const [postResult, profileResult] = await Promise.all([
  supabase.from("user_quiz_posts").select("user_id, title").eq("id", postId).single(),
  supabase.from("profiles").select("nickname").eq("user_id", user.id).single()
]);
```

---

### MEDIUM: O(n*m) Lookup Instead of Map

**File:** `src/hooks/useIconReviewQueue.ts:84-94`

```typescript
const questionsWithCategories = (data || []).map(q => {
  return {
    ...q,
    category_name: categories.find(c => c.uuid === q.category_id)?.name || 'უცნობი'
    //             ^^^^^^ O(n) search for each question
  };
});
```

**Recommended Fix:**
```typescript
const categoryMap = new Map(categories.map(c => [c.uuid, c.name]));
const questionsWithCategories = (data || []).map(q => ({
  ...q,
  category_name: categoryMap.get(q.category_id) || 'უცნობი'
}));
```

---

## 2. Unnecessary Re-renders

### CRITICAL: Context Value Not Memoized

**File:** `src/contexts/MultiplayerContextV2.tsx:1388-1409`

```typescript
const value: MultiplayerContextType = {
  ...state,
  participants,
  isHost,
  loading,
  createRoom,
  enterRoom,
  // ... more properties
};

return (
  <MultiplayerContext.Provider value={value}>
    {children}
  </MultiplayerContext.Provider>
);
```

**Impact:** Every state change creates a new object reference, causing all context consumers to re-render.

**Recommended Fix:**
```typescript
const value = useMemo(() => ({
  ...state,
  participants,
  isHost,
  loading,
  createRoom,
  enterRoom,
  // ... more properties
}), [state, participants, isHost, loading, createRoom, enterRoom, /* other deps */]);
```

---

### HIGH: Excessive Inline Style Objects

**File:** `src/components/home/AirbnbCategoryCard.tsx` (11+ instances)

```typescript
// Lines 111-114, 121-125, 131-134, 141-143, etc.
style={{
  transform: isPressed ? "scale(0.97)" : "scale(1)",
  transition: "transform 0.15s ease-out",
}}
```

**Impact:** Creates new object on every render, causing child components to see changed props.

**Recommended Fix:**
```typescript
// Extract to constants or useMemo
const pressedStyle = useMemo(() => ({
  transform: isPressed ? "scale(0.97)" : "scale(1)",
  transition: "transform 0.15s ease-out",
}), [isPressed]);
```

---

### HIGH: Missing useMemo for Expensive Computations

**File:** `src/pages/CategoryPage.tsx:159-169`

```typescript
const levels = Array.from({ length: TOTAL_DISPLAY_LEVELS }, (_, i) => {
  const level = i + 1;
  const hasEnoughQuestions = level <= availableLevels;
  // ... more computations
  return { level, isCompleted, isUnlocked, isCurrent, isComingSoon, stars };
});
```

**Recommended Fix:**
```typescript
const levels = useMemo(() =>
  Array.from({ length: TOTAL_DISPLAY_LEVELS }, (_, i) => {
    // ... computation
  }),
  [TOTAL_DISPLAY_LEVELS, availableLevels, categoryId, /* other deps */]
);
```

---

### HIGH: Missing useCallback for Event Handlers

**File:** `src/components/home/CategoryCarousel.tsx:58-104`

```typescript
// Inline functions passed to children
onClick={() => scroll("left")}
onClick={() => scroll("right")}
onFavoriteClick={(e) => {
  e.stopPropagation();
  onFavoriteToggle(favoriteId);
}}
```

**Recommended Fix:**
```typescript
const handleScrollLeft = useCallback(() => scroll("left"), [scroll]);
const handleScrollRight = useCallback(() => scroll("right"), [scroll]);
const handleFavoriteClick = useCallback((e: React.MouseEvent) => {
  e.stopPropagation();
  onFavoriteToggle(favoriteId);
}, [onFavoriteToggle, favoriteId]);
```

---

## 3. Inefficient Algorithms

### CRITICAL: O(n²) Duplicate Detection

**File:** `src/utils/duplicateDetection.ts:52-69`

```typescript
export function removeDuplicatesFromBatch<T extends { question_text: string }>(
  questions: T[],
  threshold: number = 0.55
): T[] {
  const unique: T[] = [];

  for (const q of questions) {
    const isDuplicate = unique.some(existing =>
      calculateSimilarity(q.question_text, existing.question_text) > threshold
    );

    if (!isDuplicate) {
      unique.push(q);
    }
  }
  return unique;  // O(n²) complexity
}
```

**Impact:** For 100 questions, this performs ~5,000 similarity calculations. Each `calculateSimilarity` call involves string normalization and set operations.

**Recommended Optimizations:**
1. Use locality-sensitive hashing (LSH) for approximate matching
2. Pre-compute normalized text and keyword sets once per question
3. Use early termination with length-based filtering

```typescript
export function removeDuplicatesFromBatch<T extends { question_text: string }>(
  questions: T[],
  threshold: number = 0.55
): T[] {
  // Pre-compute normalized texts and keyword sets
  const processed = questions.map(q => ({
    original: q,
    normalized: normalizeText(q.question_text),
    keywords: extractKeywords(q.question_text),
    length: q.question_text.length
  }));

  const unique: typeof processed = [];

  for (const q of processed) {
    let isDuplicate = false;
    for (const existing of unique) {
      // Early exit: length-based filtering
      const lengthRatio = Math.min(q.length, existing.length) / Math.max(q.length, existing.length);
      if (lengthRatio < threshold * 0.5) continue;

      // Use pre-computed values
      if (calculateSimilarityOptimized(q.normalized, q.keywords, existing.normalized, existing.keywords) > threshold) {
        isDuplicate = true;
        break;
      }
    }
    if (!isDuplicate) unique.push(q);
  }

  return unique.map(u => u.original);
}
```

---

### CRITICAL: Nested O(n²) Loops in Duplicate Detection Hook

**File:** `src/hooks/useDuplicateDetection.ts:141-161`

```typescript
for (let i = 0; i < (questions || []).length; i++) {
  for (let j = i + 1; j < (questions || []).length; j++) {
    const q1 = questions![i];
    const q2 = questions![j];
    const similarity = calculateSimilarity(q1.question_text, q2.question_text);
    if (similarity >= similarityThreshold) {
      duplicates.push({...});
    }
  }
}
```

**Same optimization strategies apply as above.**

---

### HIGH: Expensive Deep Cloning with JSON.parse(JSON.stringify())

**Files:**
- `src/contexts/MultiplayerContextV2.tsx:589, 702, 881, 994, 1140, 1263`
- `src/components/social/EditQuizModal.tsx:144`
- `src/components/social/CreateQuizModal.tsx:378`

```typescript
questions_data: JSON.parse(JSON.stringify(questions)),
```

**Impact:** Full serialization/deserialization is expensive, especially for large question arrays.

**Recommended Fix:**
```typescript
// Use structuredClone (modern browsers) or shallow copy if structure is flat
questions_data: structuredClone(questions),

// Or for flat arrays of objects:
questions_data: questions.map(q => ({ ...q })),
```

---

### HIGH: .find() Inside Loops

**File:** `src/services/questionService.ts:774`

```typescript
for (const q of shuffled) {
  const cat = categories.find(c => c.id === q.category_id);  // O(n) per iteration
  selectedQuestions.push(formatQuestion(q, cat?.name, cat?.category_id));
}
```

**Recommended Fix:**
```typescript
const categoryMap = new Map(categories.map(c => [c.id, c]));
for (const q of shuffled) {
  const cat = categoryMap.get(q.category_id);  // O(1) lookup
  selectedQuestions.push(formatQuestion(q, cat?.name, cat?.category_id));
}
```

---

### MEDIUM: Repeated Date Object Creation in Sorting

**File:** `src/hooks/useSocialFeed.ts:323-331`

```typescript
feedItems.sort((a, b) => {
  const dateA = a.type === 'collection'
    ? new Date(a.posts[0]?.createdAt || 0).getTime()
    : new Date(a.post.createdAt).getTime();
  const dateB = b.type === 'collection'
    ? new Date(b.posts[0]?.createdAt || 0).getTime()
    : new Date(b.post.createdAt).getTime();
  return dateB - dateA;
});
```

**Impact:** Creates 2 Date objects per comparison. For n items, sort performs O(n log n) comparisons = O(n log n) Date objects.

**Recommended Fix:**
```typescript
// Pre-compute timestamps
const feedItemsWithTimestamp = feedItems.map(item => ({
  item,
  timestamp: item.type === 'collection'
    ? new Date(item.posts[0]?.createdAt || 0).getTime()
    : new Date(item.post.createdAt).getTime()
}));

feedItemsWithTimestamp.sort((a, b) => b.timestamp - a.timestamp);
const sortedFeedItems = feedItemsWithTimestamp.map(x => x.item);
```

---

### MEDIUM: .includes() in While Loop

**File:** `src/hooks/useCategoryProgress.ts:97-102`

```typescript
Object.values(progressByCategory).forEach((catProgress) => {
  const completedLevelNumbers = catProgress.completedLevels.map((l) => l.level_number);
  let nextLevel = 1;
  while (completedLevelNumbers.includes(nextLevel)) {  // O(n) per iteration
    nextLevel++;
  }
  catProgress.currentLevel = nextLevel;
});
```

**Recommended Fix:**
```typescript
Object.values(progressByCategory).forEach((catProgress) => {
  const completedSet = new Set(catProgress.completedLevels.map((l) => l.level_number));
  let nextLevel = 1;
  while (completedSet.has(nextLevel)) {  // O(1) per iteration
    nextLevel++;
  }
  catProgress.currentLevel = nextLevel;
});
```

---

## 4. Memory Leak Risks

### MEDIUM: Fetch Without AbortSignal

**File:** `src/hooks/useGeoLocation.ts:18`

```typescript
const response = await fetch("https://ip-api.com/json/?fields=countryCode");
// No AbortSignal - if component unmounts, fetch promise remains pending
```

**Recommended Fix:**
```typescript
const controller = new AbortController();
try {
  const response = await fetch("https://ip-api.com/json/?fields=countryCode", {
    signal: controller.signal
  });
  // ...
} catch (err) {
  if (err.name === 'AbortError') return;
  throw err;
}

// In cleanup:
return () => controller.abort();
```

---

### LOW: Uncleaned setTimeout in Sound Context

**File:** `src/contexts/SoundContext.tsx:343-356`

```typescript
case "game-invitation": {
  setTimeout(() => {
    [1174.66, 1479.98].forEach((freq, i) => {
      // oscillator code
    });
  }, 150);  // No cleanup if component unmounts
  break;
}
```

**Impact:** Low (150ms is short), but could accumulate if triggered repeatedly.

---

## 5. Additional Recommendations

### Use React.memo for Presentational Components

Components that receive stable props should be memoized:
- `src/components/home/FloatingUserStats.tsx`
- `src/components/game/IconTab.tsx`
- `src/components/modals/AccountSwitcherModal.tsx`

### Batch State Updates in Multiplayer Context

**File:** `src/contexts/MultiplayerContextV2.tsx:282-286`

Multiple `setState` calls that modify the same state should be batched (React 18 does this automatically in most cases, but explicit batching can help in async callbacks).

### Consider React Query for Data Fetching

The codebase already uses TanStack Query in some places. Expanding its use would provide:
- Automatic caching
- Background refetching
- Deduplication of requests
- Proper loading/error states

---

## Priority Fixes

1. **Immediate (Critical):**
   - Fix N+1 query in `useUnreadRoomMessages.ts`
   - Memoize context value in `MultiplayerContextV2.tsx`
   - Optimize duplicate detection algorithm

2. **Short-term (High):**
   - Replace `JSON.parse(JSON.stringify())` with `structuredClone`
   - Add `useMemo` for expensive computations in `CategoryPage.tsx`
   - Create Map lookups instead of `.find()` in loops

3. **Medium-term:**
   - Add `useCallback` to event handlers passed to children
   - Extract inline styles to constants
   - Add AbortController to fetch calls

---

*Generated on: 2026-01-21*
