

# Plan: Fix TV Poll Results Screen Display

## Problem Summary

Based on the screenshot and investigation, there are three issues with `TVPollResultsScreen.tsx`:

1. **Trophy icons in header** - User wants them removed
2. **Title font too large** - "გამარჯვებული კატეგორიები" should be 60% smaller
3. **Shows wrong/missing categories** - TV screen shows "საქართველოს ისტორია" but mobile shows "ქართული სამზარეულო". The screen only shows 1 category when multiple rounds were selected

## Root Cause Analysis

The `TVPollResultsScreen` component fetches queue items correctly from `tv_session_queue`, but:

1. The fetch happens once on mount, and if the queue was just populated by `finalizePollAndStartGame`, there may be a race condition
2. The component doesn't subscribe to real-time updates, so it may show stale data
3. The queue data might not yet be committed when this screen renders

Looking at the database, session `44ed44e8-...` has 2 queue items but shows only 1 on TV. This suggests either:
- The query returned before all items were inserted
- The component rendered with old cached state

## Solution

### 1. Remove Trophy Icons from Header

Remove the two `Trophy` components flanking the title.

**Current code (lines 92-98):**
```tsx
<div className="flex items-center justify-center gap-3 mb-2">
  <Trophy className="w-10 h-10 text-yellow-400" />
  <h1 className="text-4xl md:text-5xl font-bold text-white">
    გამარჯვებული კატეგორიები
  </h1>
  <Trophy className="w-10 h-10 text-yellow-400" />
</div>
```

**Fixed code:**
```tsx
<h1 className="text-xl md:text-2xl font-bold text-white mb-2">
  გამარჯვებული კატეგორიები
</h1>
```

### 2. Reduce Title Font Size by 60%

Change from `text-4xl md:text-5xl` (36px/48px) to approximately `text-xl md:text-2xl` (20px/24px) which is 60% smaller.

### 3. Add Real-time Subscription for Queue Updates

Add a Supabase real-time subscription to ensure the component gets the latest queue data, and add a small delay before the initial fetch to ensure data is committed.

**Add to useEffect:**
```tsx
useEffect(() => {
  const fetchWinners = async () => {
    if (!sessionId) return;

    // Small delay to ensure queue insert is committed
    await new Promise(resolve => setTimeout(resolve, 300));

    const { data: queueItems } = await supabase
      .from('tv_session_queue')
      .select('*')
      .eq('session_id', sessionId)
      .order('position', { ascending: true });

    if (queueItems) {
      setWinningCategories(queueItems as QueueItem[]);
    }
    setLoading(false);
  };

  fetchWinners();

  // Subscribe to queue changes for this session
  const channel = supabase
    .channel(`queue-${sessionId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tv_session_queue',
        filter: `session_id=eq.${sessionId}`,
      },
      () => {
        // Refetch on any change
        fetchWinners();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [sessionId]);
```

---

## Technical Changes

### File: `src/components/tv/TVPollResultsScreen.tsx`

| Line Range | Change |
|------------|--------|
| 3 | Remove `Trophy` from lucide-react imports |
| 92-98 | Remove Trophy icons from header, simplify to just h1 |
| 94 | Change title font size from `text-4xl md:text-5xl` to `text-xl md:text-2xl` |
| 33-50 | Add 300ms delay before fetch and add real-time subscription |

---

## Code Preview

### Updated Header (lines 87-102)
```tsx
<motion.div
  initial={{ opacity: 0, y: -20 }}
  animate={{ opacity: 1, y: 0 }}
  className="text-center mb-8"
>
  <h1 className="text-xl md:text-2xl font-bold text-white mb-2">
    გამარჯვებული კატეგორიები
  </h1>
  <p className="text-purple-300 text-lg">
    მომდევნო {winningCategories.length} რაუნდი
  </p>
</motion.div>
```

### Updated useEffect with Real-time (lines 32-52)
```tsx
useEffect(() => {
  let isMounted = true;
  
  const fetchWinners = async () => {
    if (!sessionId) return;

    // Small delay to ensure queue insert is committed
    await new Promise(resolve => setTimeout(resolve, 300));

    const { data: queueItems } = await supabase
      .from('tv_session_queue')
      .select('*')
      .eq('session_id', sessionId)
      .order('position', { ascending: true });

    if (queueItems && isMounted) {
      setWinningCategories(queueItems as QueueItem[]);
    }
    if (isMounted) setLoading(false);
  };

  fetchWinners();

  // Subscribe to queue changes for this session
  const channel = supabase
    .channel(`poll-results-queue-${sessionId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tv_session_queue',
        filter: `session_id=eq.${sessionId}`,
      },
      () => fetchWinners()
    )
    .subscribe();

  return () => {
    isMounted = false;
    supabase.removeChannel(channel);
  };
}, [sessionId]);
```

---

## Summary of Changes

| Aspect | Before | After |
|--------|--------|-------|
| Trophy icons | Two yellow trophies | Removed |
| Title font | `text-4xl md:text-5xl` (36-48px) | `text-xl md:text-2xl` (20-24px) |
| Subtitle font | `text-xl` | `text-lg` |
| Data fetching | Single fetch on mount | Delayed fetch + real-time subscription |
| Import | `Trophy, Crown, Star, Sparkles` | `Crown, Star, Sparkles` |

---

## Testing Checklist
1. Title appears smaller (60% reduction) without trophy icons
2. All selected rounds/categories appear on screen (not just 1)
3. Categories match what host sees on mobile
4. Real-time updates work if queue changes after screen loads

