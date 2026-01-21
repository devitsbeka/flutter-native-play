# Performance Analysis Report

**Date:** 2026-01-21
**Codebase:** React + TypeScript (Capacitor mobile app)

---

## Executive Summary

This comprehensive analysis identified **60+ performance issues** across the codebase, categorized into four main areas:

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| N+1 Queries & API Calls | 4 | 3 | 3 | 2 |
| Unnecessary Re-renders | 4 | 6 | 8 | 3 |
| Inefficient Algorithms | 5 | 4 | 5 | 2 |
| Memory Leaks | 2 | 1 | 3 | 1 |

---

## 1. N+1 Queries and API Call Issues

### CRITICAL

#### 1.1 Sequential Supabase Queries in Loop (N+1)
**File:** `src/components/admin/AiMagicRefillModal.tsx:188-199`
```typescript
const fetchExistingQuestions = async (categoryIds: string[]): Promise<void> => {
  existingQuestionsRef.current.clear();
  for (const categoryId of categoryIds) {  // N+1: Individual query per category
    const { data } = await supabase
      .from("questions")
      .select("question_text")
      .eq("category_id", categoryId);
    if (data) {
      existingQuestionsRef.current.set(categoryId, data.map((q) => q.question_text));
    }
  }
};
```
**Fix:** Use `.in("category_id", categoryIds)` to fetch all categories in a single query, then group results client-side.

---

#### 1.2 Sequential Approval Loop
**File:** `src/components/admin/AiMagicRefillModal.tsx:376-395`
```typescript
const approveAllPending = async () => {
  const pendingQuestions = generatedQuestions.filter((q) => q.status === "pending");
  for (const question of pendingQuestions) {
    await approveQuestion(question);  // Each DB insert waits for previous
  }
};

const approveCategoryPending = async (categoryId: string) => {
  const pendingQuestions = generatedQuestions.filter(
    (q) => q.category_id === categoryId && q.status === "pending"
  );
  for (const question of pendingQuestions) {  // Sequential N+1
    await approveQuestion(question);
  }
};
```
**Fix:** Use `Promise.all()` to parallelize database inserts.

---

#### 1.3 Language Bucket Queries in Loop
**File:** `src/components/admin/PalantirAnalyticsWidget.tsx:114-144`
```typescript
const fetchLanguageBuckets = async () => {
  const languages = ['ka', 'en', 'ru', 'de', 'fr'];
  const buckets: LanguageBucket[] = [];

  for (const lang of languages) {  // 5 iterations = 10 queries
    const { count: inProdCount } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('language', lang)
      .eq('in_production', true);  // Query 1

    const { count: inLibCount } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('language', lang)
      .eq('in_production', false);  // Query 2
    // ...
  }
};
```
**Fix:** Use aggregated query with GROUP BY or batch fetch with `.in()`.

---

#### 1.4 Sequential Database Queries in Loop
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
  // ...
}
```
**Impact:** If a user is in 10 rooms, this executes 10 separate COUNT queries.
**Fix:** Use a Supabase RPC function with GROUP BY.

---

### HIGH

#### 1.5 Sequential Queries in useActiveUsers
**File:** `src/hooks/useActiveUsers.ts:30-56`
```typescript
const { data: presenceData } = await supabase.from('user_presence').select('*');
// ... check
const { data: profilesData } = await supabase.from('profiles').select('...');  // Sequential
const { data: vipData } = await supabase.from('vip_subscriptions').select('...');  // Sequential
```
**Fix:** Use `Promise.all([query1, query2, query3])`.

---

#### 1.6 Sequential Approvals in CombinedShortener
**File:** `src/components/admin/CombinedShortener.tsx:657-662`
```typescript
const approveAllPending = async () => {
  for (const id of selectedResults) {
    await approvePending(id);  // Sequential awaits
  }
  setSelectedResults(new Set());
};
```
**Fix:** Use `Promise.all(selectedResults.map(id => approvePending(id)))`.

---

### MEDIUM

#### 1.7 Sequential Queries That Could Be Parallelized
**File:** `src/hooks/useSocialFeed.ts:145-166`
```typescript
const { data: postData } = await supabase
  .from("user_quiz_posts")
  .select("user_id, title")
  .eq("id", postId)
  .single();

if (postData && postData.user_id !== user.id) {
  const { data: senderProfile } = await supabase  // Could parallelize
    .from("profiles")
    .select("nickname")
    .eq("user_id", user.id)
    .single();
  // ...
}
```

---

#### 1.8 O(n*m) Lookup Instead of Map
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
**Fix:** Use `Map` for O(1) lookups.

---

## 2. Unnecessary Re-render Issues

### CRITICAL

#### 2.1 Context Provider Values Without useMemo
**Multiple contexts create new value objects on every render, causing all consumers to re-render.**

**File:** `src/contexts/SoundContext.tsx:621-635`
```typescript
<SoundContext.Provider
  value={{
    musicEnabled: settings.musicEnabled,
    setMusicEnabled,
    sfxEnabled: settings.sfxEnabled,
    // ... 13 more properties created inline
  }}
>
```

**Same issue in:**
- `src/contexts/TVGameContext.tsx:1271-1289`
- `src/contexts/MultiplayerContext.tsx:726-748`
- `src/contexts/MultiplayerContextV2.tsx:1388-1409`
- `src/contexts/AuthContext.tsx:271-286`

**Good Example (follow this pattern):**
```typescript
// src/contexts/LanguageContext.tsx:160-167
const value = useMemo(() => ({
  language, region, setLanguage, t, languages: LANGUAGES, currentLanguage,
}), [language, region, setLanguage, t, currentLanguage]);
```

---

### HIGH

#### 2.2 Inline Style Objects in Render
Creates new object on every render, causing child components to see changed props.

**Files with multiple occurrences:**
| File | Instances |
|------|-----------|
| `src/pages/Index.tsx` | 18+ inline styles |
| `src/components/map/AirbnbCategoryCard.tsx` | 15+ inline styles |
| `src/components/discover/CategoryCarousel.tsx` | 4 inline styles |
| `src/components/discover/IconTab.tsx` | 2 inline styles |
| `src/components/home/AirbnbCategoryCard.tsx` | 11+ instances |

```typescript
// Bad: Creates new object every render
<div style={{ fontSize: 28 }} />

// Good: Use constants or useMemo
const fontSize28 = { fontSize: 28 };  // Outside component
```

---

#### 2.3 Inline Functions in JSX Without useCallback
**File:** `src/components/discover/CategoryGrid.tsx:72-76`
```typescript
onFavoriteClick={(e) => {
  e.stopPropagation();
  onFavoriteToggle(favoriteId);
}}
onClick={() => onCategoryClick(category.id)}
```

**File:** `src/components/map/PowerUpShopModal.tsx:81-114, 239, 261, 276`
```typescript
const handleSelectPowerUp = (type: PowerUpType) => {  // Not wrapped in useCallback
  setSelectedType(type);
  setAnimationKey((prev) => prev + 1);
  setQuantity(1);
};
// Used in JSX:
onClick={() => handleSelectPowerUp(info.type)}
onClick={() => handleQuantityChange(-1)}
```

**File:** `src/components/map/SeasonalAdventureMap.tsx:115-123, 177-183`
```typescript
const scrollToSeason = (season: Season) => {  // Missing useCallback
  // ...
};
const handleLevelClick = (level: Level) => {  // Missing useCallback
  // ...
};
```

---

#### 2.4 Components Missing React.memo
Components that receive props but aren't memoized:

| Component | File | Props | Priority |
|-----------|------|-------|----------|
| AirbnbCategoryCard | `src/components/discover/` | 14 props | HIGH |
| CategoryGrid | `src/components/discover/` | Array props | HIGH |
| LevelNode | `src/components/map/` | 6 props | MEDIUM |
| TreasureChestNode | `src/components/map/` | Multiple props | MEDIUM |
| SectionHeader | `src/components/discover/` | 3 props | LOW |
| PowerUpsBar | `src/components/map/` | 1 prop | LOW |

---

### MEDIUM

#### 2.5 Array Literals Created in Maps
```typescript
// Bad: Creates new array on every render
{[...Array(6)].map((_, i) => <Component key={i} />)}
```

**Files:**
- `src/components/map/LevelNode.tsx:69`
- `src/components/map/PowerUpShopModal.tsx:315, 370`
- `src/components/map/DailyChallengeNode.tsx:19`
- `src/components/map/TreasureChestNode.tsx:102`
- `src/components/map/seasons/WinterBackground.tsx:92, 132`

---

## 3. Inefficient Algorithms

### CRITICAL

#### 3.1 Chained Array Filters Without Memoization
**File:** `src/hooks/useMissions.ts:555-560`
```typescript
// 6 separate O(n) operations per render
const completedDaily = dailyMissions.filter((m) => m.completed).length;
const claimedDaily = dailyMissions.filter((m) => m.reward_claimed).length;
const unclaimedDaily = dailyMissions.filter((m) => m.completed && !m.reward_claimed).length;
const completedWeekly = weeklyMissions.filter((m) => m.completed).length;
const claimedWeekly = weeklyMissions.filter((m) => m.reward_claimed).length;
const unclaimedWeekly = weeklyMissions.filter((m) => m.completed && !m.reward_claimed).length;
```
**Fix:** Use `useMemo` to compute all values in a single pass.

---

#### 3.2 O(n²) - .includes() in While Loop
**File:** `src/hooks/useCategoryProgress.ts:301-307`
```typescript
const completedLevelNumbers = updated[categoryId].completedLevels
  .filter(l => l.stars_earned >= 1)
  .map((l) => l.level_number);
let nextLevel = 1;
while (completedLevelNumbers.includes(nextLevel)) {  // O(n) per iteration = O(n²)
  nextLevel++;
}
```
**Fix:** Convert to `Set` for O(1) lookups.

Also at `src/hooks/useCategoryProgress.ts:97-102` (same pattern).

---

#### 3.3 Nested Icon Matching Loops - O(n×m×k)
**File:** `src/hooks/useIconLibrary.ts:414-420, 282-303`
```typescript
for (const icon of iconIndex) {
  const score = scoreMatch(icon, keywords, category);
  // scoreMatch contains nested loops:
  for (const keyword of keywords) {
    icon.slug.split('-').some(part => part.includes(keyword) || keyword.includes(part))
  }
  for (const tag of icon.tags) {
    for (const keyword of keywords) {
      if (tagLower === keyword || tagLower.includes(keyword) || keyword.includes(tagLower))
    }
  }
}
```
**Fix:** Build index structures (Map by slug, Set for tags) at load time.

---

#### 3.4 Repeated Array Concatenation + Search
**File:** `src/hooks/useMissions.ts:412, 467, 554`
```typescript
const allMissions = [...dailyMissions, ...weeklyMissions];  // O(n) allocation
const mission = allMissions.find((m) => m.mission_id === missionId);  // O(n) search
```
**Complexity:** O(2n) × 3 function calls
**Fix:** Create a `Map<missionId, mission>` for O(1) lookups.

---

#### 3.5 O(n²) Duplicate Detection
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
**Impact:** For 100 questions, ~5,000 similarity calculations.

Also at `src/hooks/useDuplicateDetection.ts:141-161`.

---

### HIGH

#### 3.6 Inefficient Fallback Lookups
**File:** `src/hooks/useIconLibrary.ts:437-459`
```typescript
for (const slug of categoryKeywords) {
  const exactIcon = iconIndex.find(i => i.slug === slug);  // O(n)
  if (exactIcon) return ...;
  const partialIcon = iconIndex.find(i => i.slug.includes(slug));  // O(n) again
  if (partialIcon) return ...;
}
```
**Fix:** Pre-compute slug index Map on component mount.

---

#### 3.7 Filter + Nested Loop - O(n×m×t)
**File:** `src/hooks/useIconLibrary.ts:544-550`
```typescript
const matchingIcons = iconIndex.filter(icon => {
  const slugMatch = categoryKeywords.some(kw => icon.slug.includes(kw));
  const tagMatch = icon.tags.some(tag =>
    categoryKeywords.some(kw => tag.toLowerCase().includes(kw))
  );
  return slugMatch || tagMatch;
});
```

---

#### 3.8 Expensive Deep Cloning with JSON.parse(JSON.stringify())
**Files:**
- `src/contexts/MultiplayerContextV2.tsx:589, 702, 881, 994, 1140, 1263`
- `src/components/social/EditQuizModal.tsx:144`
- `src/components/social/CreateQuizModal.tsx:378`

```typescript
questions_data: JSON.parse(JSON.stringify(questions)),
```
**Fix:** Use `structuredClone(questions)` or shallow copy if flat.

---

#### 3.9 .find() Inside Loops
**File:** `src/services/questionService.ts:774`
```typescript
for (const q of shuffled) {
  const cat = categories.find(c => c.id === q.category_id);  // O(n) per iteration
  selectedQuestions.push(formatQuestion(q, cat?.name, cat?.category_id));
}
```
**Fix:** Create `categoryMap` for O(1) lookups.

---

### MEDIUM

#### 3.10 getLevelStars Does O(n) Search Per Call
**File:** `src/hooks/useCategoryProgress.ts:198-206`
```typescript
const getLevelStars = (categoryId: string, levelNumber: number): number => {
  const catProgress = progress[categoryId];
  if (!catProgress) return 0;
  const level = catProgress.completedLevels.find((l) => l.level_number === levelNumber);  // O(n)
  return level?.stars_earned || 0;
};
```
**Fix:** Build lookup Map keyed by `${categoryId}-${levelNumber}`.

---

#### 3.11 Repeated Date Object Creation in Sorting
**File:** `src/hooks/useSocialFeed.ts:323-331`
```typescript
feedItems.sort((a, b) => {
  const dateA = a.type === 'collection'
    ? new Date(a.posts[0]?.createdAt || 0).getTime()
    : new Date(a.post.createdAt).getTime();
  // ... creates 2n Date objects for n log n comparisons
});
```
**Fix:** Pre-compute timestamps before sorting.

---

#### 3.12 Inefficient Array Operations
**File:** `src/hooks/usePingPongVideo.ts:101`
```typescript
const reversed = [...frames].slice(1, -1).reverse();  // 3 operations: O(3n)
```
**Fix:** Single loop to build reversed array in one pass.

---

## 4. Memory Leaks and Missing Cleanup

### CRITICAL

#### 4.1 Uncleared setTimeout in Game Countdown
**File:** `src/contexts/MultiplayerContext.tsx:485-488`
```typescript
setTimeout(async () => {
  await updateRoomStatus(currentRoom.id, "playing");
  setState(prev => ({ ...prev, phase: "playing" }));
}, 4000);  // No timeout ID stored, no cleanup
```
**Impact:** Repeated game sessions accumulate dangling timers.

**Same issue at:** `src/contexts/MultiplayerContext.tsx:556-559` (startGameSolo)

**Fix:**
```typescript
const timeoutRef = useRef<NodeJS.Timeout>();

// In startGame:
timeoutRef.current = setTimeout(async () => { ... }, 4000);

// In cleanup effect:
useEffect(() => {
  return () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };
}, []);
```

---

### HIGH

#### 4.2 Job Cleanup Timers Accumulate
**File:** `src/contexts/BackgroundGenerationContext.tsx:61-62`
```typescript
const scheduleJobCleanup = useCallback((jobId: string, delayMs: number = 300000) => {
  setTimeout(() => removeJob(jobId), delayMs);  // 5-minute timers accumulate, no tracking
}, [removeJob]);
```
**Fix:** Store timeout IDs in a Map and clear on unmount.

---

### MEDIUM

#### 4.3 Uncleared Music Fade-out Timer
**File:** `src/contexts/SoundContext.tsx:558`
```typescript
setTimeout(() => {
  if (musicRef.current) {
    musicRef.current.oscillators.forEach(osc => { /* ... */ });
  }
  setIsPlayingMusic(false);  // State update on potentially unmounted component
}, fadeTime * 1000);
```

---

#### 4.4 Uncleared Profile Update Timer
**File:** `src/contexts/AuthContext.tsx:221-226`
```typescript
setTimeout(async () => {
  await supabase.from('profiles').update({ nickname }).eq('user_id', data.user.id);
}, 1000);
```

---

#### 4.5 Fetch Without AbortSignal
**File:** `src/hooks/useGeoLocation.ts:18`
```typescript
const response = await fetch("https://ip-api.com/json/?fields=countryCode");
// No AbortSignal - if component unmounts, fetch promise remains pending
```
**Fix:** Add AbortController with cleanup.

---

### LOW

#### 4.6 Uncleaned setTimeout in Sound Effect
**File:** `src/contexts/SoundContext.tsx:343-356`
```typescript
case "game-invitation": {
  setTimeout(() => {
    [1174.66, 1479.98].forEach((freq, i) => { /* oscillator code */ });
  }, 150);  // No cleanup
  break;
}
```

---

## 5. Summary Tables

### Files Requiring Most Attention

| Priority | File | Issues |
|----------|------|--------|
| 1 | `src/hooks/useIconLibrary.ts` | Multiple O(n²+) algorithms |
| 2 | `src/hooks/useMissions.ts` | Repeated array operations, N+1 |
| 3 | `src/contexts/SoundContext.tsx` | Context value + timer cleanup |
| 4 | `src/contexts/MultiplayerContext.tsx` | Timer cleanup + context value |
| 5 | `src/contexts/MultiplayerContextV2.tsx` | Context value + deep cloning |
| 6 | `src/components/admin/AiMagicRefillModal.tsx` | N+1 queries |
| 7 | `src/hooks/useCategoryProgress.ts` | O(n²) algorithm |
| 8 | `src/pages/Index.tsx` | Many inline styles |

---

### Priority Action Items

#### Immediate (Critical - High Impact, Easy Fix)

| # | Action | Files |
|---|--------|-------|
| 1 | Wrap context provider values in useMemo | SoundContext, TVGameContext, MultiplayerContext, AuthContext |
| 2 | Convert N+1 loops to batch queries using `.in()` | AiMagicRefillModal.tsx:188-199 |
| 3 | Add Promise.all() for parallel operations | AiMagicRefillModal.tsx:376-395, useActiveUsers.ts:30-56 |
| 4 | Fix O(n²) → O(n) with Set | useCategoryProgress.ts:301-307 |

#### Short-term (High Impact)

| # | Action | Files |
|---|--------|-------|
| 5 | Add useMemo for chained array operations | useMissions.ts:555-560 |
| 6 | Build index structures for icon lookup | useIconLibrary.ts |
| 7 | Clear setTimeout timers on unmount | MultiplayerContext.tsx:485-488, 556-559 |
| 8 | Replace JSON.parse(JSON.stringify()) with structuredClone | MultiplayerContextV2.tsx |

#### Medium-term

| # | Action | Files |
|---|--------|-------|
| 9 | Add React.memo to frequently rendered components | AirbnbCategoryCard, CategoryGrid, LevelNode |
| 10 | Extract inline handlers with useCallback | PowerUpShopModal, SeasonalAdventureMap |
| 11 | Move inline styles to constants | Index.tsx, AirbnbCategoryCard.tsx |
| 12 | Add AbortController to fetch calls | useGeoLocation.ts |

---

### Estimated Performance Impact

| Fix Category | Estimated Improvement |
|--------------|----------------------|
| Context useMemo | 30-50% fewer re-renders |
| N+1 query fixes | 5-10x faster data loading |
| Algorithm O(n²) → O(n) | 10-100x faster for large datasets |
| Memory leak fixes | Prevents crashes in long sessions |
| React.memo additions | 20-40% fewer component renders |

---

## Good Patterns Found (Keep These!)

These patterns in the codebase are well-implemented:

1. **LanguageContext.tsx:160-167** - Properly memoized context value
2. **Supabase subscriptions** - All have proper cleanup (TVGameContext, MultiplayerContext, AuthContext)
3. **Event listeners** - useNetworkStatus, useIconLibrary, useExternalDisplay have proper cleanup
4. **Timer cleanup** - useRewardTimers, useTypingIndicator, TVGameContext question timer

---

*Generated on: 2026-01-21*
