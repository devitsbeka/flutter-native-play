
# Fix Plan: Poll Screen UI Issues and Game Start Flow

## Issues Identified

### Issue 1: Remove Confetti from Screen 1 (TVPollScreen)
**Location:** `src/components/tv/TVPollScreen.tsx` (lines 45-60)
**Problem:** When voting is active and the leading category changes, confetti is triggered.
**Solution:** Remove the confetti celebration effect that fires when the leader changes during voting.

---

### Issue 2: Make Selected Category Green on Screen #3 (Voting Screen)
**Location:** `src/components/controller/ControllerPollScreen.tsx` (lines 686-735)
**Problem:** When a player clicks on a category to vote, the selected state shows with purple background and border (`bg-purple-500/30 border-purple-400`), but user wants it to be green.
**Solution:** Change the voted/selected state styling to green (`bg-green-500/30 border-green-400`) to clearly indicate selection.

---

### Issue 3: Extra Empty Category Fields Below Suggestions (Screen #3)
**Location:** `src/components/tv/TVPollScreen.tsx` and related components
**Problem:** The user sees items 5, 6, 7 with just "კატეგორია" placeholder text appearing below the actual suggestions.
**Root Cause Analysis:** This appears to be a UI rendering issue. Looking at the TVPollScreen, it only renders actual suggestions from the database. The ghost entries could be:
1. Stale suggestions that weren't properly cleaned up
2. UI artifacts from the suggestion grid layout
3. Categories being rendered twice from different sources

After reviewing the code, the most likely cause is the `SuggestionCard` component rendering suggestions that don't have proper category names (defaulting to "კატეგორია"). The suggestions grid at line 135-148 renders all suggestions, but some might have null/empty category names.

**Solution:** Add validation to filter out suggestions without valid category names before rendering.

---

### Issue 4: Double-Click Required on "დაწყება" Button (Screens #4, #5)
**Location:** `src/components/controller/ControllerPollResults.tsx` (lines 49-65)
**Problem:** Clicking "დაწყება" on the poll results screen requires two clicks.
**Root Cause:** The `finalizePollAndStartGame` function in `useTVPoll.ts` sets session status to `'paired'` (line 591), which maps to `'lobby'` phase. The host is then expected to see the lobby and click "Start Game" again to actually begin gameplay.

**Flow Analysis:**
1. User on poll-results screen (Screen #4)
2. Clicks "დაწყება (2 რაუნდი)" 
3. `finalizePollAndStartGame` is called which:
   - Creates queue items from winning suggestions
   - Updates session to `status: 'paired'` 
4. This triggers phase change to `lobby` (Screen #5)
5. User must click "დაწყება" again to start the actual game

**Solution:** After `finalizePollAndStartGame` succeeds, automatically call `startGame()` to bypass the lobby phase and go directly to countdown. This means the poll results "დაწყება" button should start the game in one click.

---

### Issue 5: Host-First-Answer Bug Verification
**Location:** `src/contexts/TVGameContext.tsx`
**Previous Fix Applied:** The last diff shows timing ref fixes were added to prevent premature auto-advance.
**Verification Needed:** The fix disables `questionStartedAtRef` during countdown and only enables it when status is `'playing'`. This should prevent the race condition where the host's answer triggers premature advancement.

**Additional Safeguard:** Ensure that after poll→game transition, the timing logic is properly gated so the 2500ms safety window starts from when the question is actually playable.

---

## Technical Implementation

### File 1: `src/components/tv/TVPollScreen.tsx`
**Remove confetti on leader change:**
- Delete the useEffect block (lines 45-60) that tracks `previousLeader` and fires confetti
- Remove `previousLeader` state and `confetti` import
- Keep the rest of the UI intact

### File 2: `src/components/controller/ControllerPollScreen.tsx`
**Change voted state to green:**
```typescript
// Line 693-697: Change from:
hasVoted
  ? 'bg-purple-500/30 border-purple-400'
  : 'bg-white/10 border-white/20 hover:border-purple-400'

// To:
hasVoted
  ? 'bg-green-500/30 border-green-400'
  : 'bg-white/10 border-white/20 hover:border-purple-400'
```

### File 3: `src/components/tv/TVPollScreen.tsx`
**Filter empty suggestions:**
```typescript
// Line 135: Add filter before mapping
{suggestions.filter(s => s.category_name && s.category_name.trim()).map((suggestion, index) => (
```

### File 4: `src/components/controller/ControllerPollResults.tsx`
**Auto-start game after poll finalization:**

The current flow calls `finalizePollAndStartGame` which sets status to `'paired'` (lobby). To make it one-click:

Option A (Recommended): Modify `finalizePollAndStartGame` in `useTVPoll.ts` to also start the game (set status to `'countdown'` and fetch questions for the first category).

Option B: Have `ControllerPollResults.handleStartGame` call the context's `startGame` after `finalizePollAndStartGame` succeeds.

**Implementation (Option B - safer, less invasive):**
```typescript
// In ControllerPollResults.tsx, after finalizePollAndStartGame succeeds:
const handleStartGame = async () => {
  if (winningCategories.length === 0) {
    toast.error('არ არის გამარჯვებული კატეგორიები');
    return;
  }

  setIsStarting(true);
  const success = await finalizePollAndStartGame(selectedRoundCount);
  
  if (success) {
    toast.success('თამაში იწყება!');
    // The session is now in 'paired' state with queue populated
    // Parent (TVHostController) will detect this and trigger startGame
    onGameStart();
  } else {
    toast.error('თამაშის დაწყება ვერ მოხერხდა');
    setIsStarting(false);
  }
};
```

The issue is that `onGameStart` just logs but doesn't actually start the game. We need `TVHostController` to auto-start after poll finalization.

**Better Fix in TVHostController.tsx:**
Add an effect that detects when we transition from `poll-results` to `lobby` with a populated queue, and auto-starts the game:

```typescript
// Detect post-poll lobby transition and auto-start
useEffect(() => {
  if (localPhase === 'lobby' && hasQueue && queue.length > 0) {
    // Check if we just came from poll-results (queue was just populated from poll)
    const firstItem = queue[0];
    if (firstItem.suggester_user_id) {
      // This queue was populated from poll (has suggester info)
      // Auto-start the game
      handleStartGame();
    }
  }
}, [localPhase, hasQueue, queue]);
```

However, this could cause unintended auto-starts. A cleaner approach:

**Cleanest Fix:** Add a flag to track poll-to-game transition in session data, or modify `finalizePollAndStartGame` to directly trigger `startGame` instead of going to lobby.

### File 5: `src/hooks/useTVPoll.ts`
**Modify finalizePollAndStartGame to start the game directly:**

Instead of setting status to `'paired'`, we should:
1. Set up the queue (already done)
2. Call the same logic as `startGame` to fetch questions and start countdown

This is the most robust fix but requires coordinating with `TVGameContext.startGame`.

---

## Recommended Implementation Order

1. **Remove confetti** (TVPollScreen) - Simple, no side effects
2. **Green selection styling** (ControllerPollScreen) - Simple CSS change
3. **Filter empty suggestions** (TVPollScreen) - Defensive fix
4. **Fix double-click issue** - Most complex, needs careful implementation
5. **Verify host-first-answer fix** - Already applied in last diff, needs testing

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/tv/TVPollScreen.tsx` | Remove confetti, filter empty suggestions |
| `src/components/controller/ControllerPollScreen.tsx` | Green selection styling |
| `src/hooks/useTVPoll.ts` | Modify `finalizePollAndStartGame` to set status to `'countdown'` and fetch questions |
| `src/contexts/TVGameContext.tsx` | No changes needed (timing fix already applied) |

---

## Expected Behavior After Fix

1. **No confetti** during poll voting phase
2. **Green highlight** when player clicks/votes for a category
3. **No phantom categories** appearing below real suggestions
4. **Single click "დაწყება"** starts the game immediately from poll results
5. **All players can answer** even if host answers first after poll
