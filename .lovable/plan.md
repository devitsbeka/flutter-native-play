
# Plan: Fix Button Texts and "Your Category" Bug (Properly)

## Summary
There are two issues to fix:
1. **Button texts still showing old Georgian text** - The user sees "კატეგორიის არჩევა" and "ხმის მიცემა" instead of the updated texts
2. **"Your category" bug persists for library categories** - Host cannot play even when selecting standard library categories

---

## Root Cause Analysis

### Issue 1: Button Texts Not Updated
After investigation, the `TVGameOverScreen.tsx` file already has the correct texts:
- Line 254: `კატეგორიის დამატება` (correct)
- Line 264: `არჩევნების დაწყება` (correct)

**However**, the user's screenshot shows old texts. This indicates **browser caching** of the old build. The changes were applied but not yet deployed/reloaded.

**Action**: Verify the build is deployed. If the user is still seeing old texts after deployment, we need to check if there's another component showing these buttons.

### Issue 2: "Your Category" Bug - Root Cause Identified

The bug originates from **two different code paths** that incorrectly set `suggester_user_id`:

#### Path 1: Poll Flow (`src/hooks/useTVPoll.ts`)
In the `finalizePollAndStartGame` function (lines 661-664), when building queue items from poll suggestions:

```typescript
// Store suggester info - they will skip this round
suggester_user_id: suggestion.user_id,     // BUG: Always sets suggester
suggester_nickname: suggestion.nickname,
suggester_avatar_url: suggestion.avatar_url,
```

**Problem**: This ALWAYS sets the suggester to whoever suggested/voted for the category, even for library categories. If the host votes for "მეცნიერება" (Science), they become the suggester and cannot play.

#### Database Evidence (from query):
```
session_id: 608ca166-c37f-4a25-9255-cab0e4f8b29f
category_name: მეცნიერება (Science - a library category!)
suggester_user_id: 615aae02-c044-4fd0-bec0-4bd7463e7381
source_type: category
```

A standard library category has a suggester attached - this is incorrect.

#### Path 2: Direct Selection (`src/components/controller/ControllerDirectSelection.tsx`)
The `addCategoryToQueue` hook does NOT set suggester fields - this is correct.
The `handleSelectTrivia` function correctly only sets suggester for non-blind trivias - this is also correct.

**The bug is isolated to the poll flow in `useTVPoll.ts`.**

---

## Correct Logic

| Source Type | Suggester Behavior |
|-------------|-------------------|
| Library category (`source_type: 'category'`) | **Never set suggester** - anyone can play |
| User trivia (non-blind) (`source_type: 'trivia'`, `is_blind: false`) | **Set suggester = trivia owner** - they know answers |
| User trivia (blind) (`source_type: 'trivia'`, `is_blind: true`) | **Never set suggester** - owner doesn't know answers |

---

## Technical Fix

### File: `src/hooks/useTVPoll.ts`

**Change Location**: Lines 652-665 in `finalizePollAndStartGame` function

**Current Code (BUGGY)**:
```typescript
const queueItems = topSuggestions.map((suggestion, i) => ({
  session_id: sessionId,
  position: i,
  source_type: suggestion.source_type,
  category_id: suggestion.category_id,
  category_name: suggestion.category_name,
  icon_slug: suggestion.icon_slug,
  user_trivia_id: suggestion.user_trivia_id,
  // Store suggester info - they will skip this round
  suggester_user_id: suggestion.user_id,           // BUG
  suggester_nickname: suggestion.nickname,         // BUG
  suggester_avatar_url: suggestion.avatar_url,     // BUG
}));
```

**Fixed Code**:
```typescript
const queueItems = topSuggestions.map((suggestion, i) => {
  // Only set suggester for user trivias (not library categories)
  // For user trivias, the suggester is the OWNER of the trivia, not the voter
  // We need to check if this is a user trivia and if it's NOT blind
  const isUserTrivia = suggestion.source_type === 'trivia' && suggestion.user_trivia_id;
  
  // For user trivias, the suggestion.user_id is the person who VOTED for it,
  // but we need the OWNER of the trivia. The owner info should come from
  // the trivia itself, not the suggestion voter.
  // 
  // CRITICAL FIX: For library categories, suggester should ALWAYS be null.
  // For user trivias, we need to fetch the trivia owner separately (not the voter).
  // Since we're in a map and can't async fetch, we'll set suggester to null here
  // and let the startNextRoundFromQueueIfAny logic handle it via queue item data.
  //
  // Actually, checking the PollSuggestion interface: user_id is the person who 
  // SUGGESTED the category during the poll (not necessarily the owner).
  // For library categories: user_id = voter (should NOT become suggester)
  // For user trivias: user_id = voter (but owner is in user_quiz_posts.user_id)
  
  return {
    session_id: sessionId,
    position: i,
    source_type: suggestion.source_type,
    category_id: suggestion.category_id,
    category_name: suggestion.category_name,
    icon_slug: suggestion.icon_slug,
    user_trivia_id: suggestion.user_trivia_id,
    // CRITICAL FIX: Only set suggester for user trivias, not library categories
    // For user trivias, the suggester should be the TRIVIA OWNER, not the voter
    // This will be null for now - the actual owner check happens in startNextRoundFromQueueIfAny
    suggester_user_id: null,
    suggester_nickname: null,
    suggester_avatar_url: null,
  };
});
```

**Alternative Approach**: Pre-fetch trivia owner info for user trivias before mapping

Since we need to know if a user trivia is blind and who owns it, we should fetch this data BEFORE building queue items:

```typescript
// Before building queue items, fetch trivia owner info for any user trivias
const triviaIds = topSuggestions
  .filter(s => s.source_type === 'trivia' && s.user_trivia_id)
  .map(s => s.user_trivia_id!);

let triviaOwnerMap: Record<string, { user_id: string; is_blind: boolean; owner_nickname: string | null; owner_avatar: string | null }> = {};

if (triviaIds.length > 0) {
  const { data: triviaData } = await supabase
    .from('user_quiz_posts')
    .select('id, user_id, is_blind')
    .in('id', triviaIds);
  
  if (triviaData) {
    // Get owner profiles
    const ownerIds = [...new Set(triviaData.map(t => t.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, nickname, avatar_url')
      .in('user_id', ownerIds);
    
    const profileMap = (profiles || []).reduce((acc, p) => {
      acc[p.user_id] = p;
      return acc;
    }, {} as Record<string, { nickname: string; avatar_url: string | null }>);
    
    triviaOwnerMap = triviaData.reduce((acc, t) => {
      const profile = profileMap[t.user_id];
      acc[t.id] = {
        user_id: t.user_id,
        is_blind: t.is_blind || false,
        owner_nickname: profile?.nickname || null,
        owner_avatar: profile?.avatar_url || null,
      };
      return acc;
    }, {} as Record<string, any>);
  }
}

// Then in the map:
const queueItems = topSuggestions.map((suggestion, i) => {
  // For library categories: no suggester
  // For user trivias: check if blind, then set owner as suggester
  let suggester_user_id: string | null = null;
  let suggester_nickname: string | null = null;
  let suggester_avatar_url: string | null = null;
  
  if (suggestion.source_type === 'trivia' && suggestion.user_trivia_id) {
    const triviaInfo = triviaOwnerMap[suggestion.user_trivia_id];
    if (triviaInfo && !triviaInfo.is_blind) {
      suggester_user_id = triviaInfo.user_id;
      suggester_nickname = triviaInfo.owner_nickname;
      suggester_avatar_url = triviaInfo.owner_avatar;
    }
  }
  
  return {
    session_id: sessionId,
    position: i,
    source_type: suggestion.source_type,
    category_id: suggestion.category_id,
    category_name: suggestion.category_name,
    icon_slug: suggestion.icon_slug,
    user_trivia_id: suggestion.user_trivia_id,
    suggester_user_id,
    suggester_nickname,
    suggester_avatar_url,
  };
});
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/hooks/useTVPoll.ts` | Fix `finalizePollAndStartGame` to only set suggester for non-blind user trivias (not library categories) |

**Note**: The button text issue is likely a caching problem since the `TVGameOverScreen.tsx` already has the correct texts. If after deployment the texts still appear wrong, we'll need to investigate if there's another component displaying these buttons.

---

## Testing Checklist
1. Start a poll, have the host suggest a library category, vote for it, and start the game - host should be able to play
2. Start a poll with a user's non-blind trivia - trivia owner should see observer mode
3. Start a poll with a user's blind trivia - trivia owner should be able to play
4. Verify button texts show "კატეგორიის დამატება" and "არჩევნების დაწყება" after build refresh
