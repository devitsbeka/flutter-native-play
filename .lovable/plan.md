
# Plan: Fix Room Results Screen - Add Category Option & Proper Flow

## Problem Summary

After completing a round in regular (non-TV) multiplayer rooms:
1. Both host and players see "ახალი რაუნდი" (New Round) button
2. Clicking it replays the SAME round with same questions (confusing UX)
3. Host has no way to add more categories/trivias to continue playing with new content
4. The screen doesn't differentiate between host and player actions

## Current Flow (Broken)

```text
Round Complete
     │
     ▼
Results Screen
     │
     ├─► "ახალი რაუნდი" (visible to ALL)
     │   └─► Replays SAME questions ❌
     │
     └─► "ოთახში დაბრუნება"
         └─► Goes to lobby (but no indication why)
```

## Proposed Solution

Create a clear flow with proper host/player differentiation:

```text
Round Complete
     │
     ▼
Results Screen
     │
     ├─► [Has Queue Items?]
     │   ├─► YES: Show "გაგრძელება" with next category preview
     │   │        └─► Plays next queue item
     │   │
     │   └─► NO: Differentiate by role
     │       │
     │       ├─► HOST: Show "კატეგორიის დამატება" (Add Category)
     │       │        └─► Goes to lobby where host can add to queue
     │       │
     │       └─► NON-HOST: Show "ველოდებით მასპინძელს..."
     │                    └─► Either go to lobby or wait
     │
     └─► "ოთახში დაბრუნება" (Back to Room)
         └─► Returns to lobby for everyone
```

---

## Technical Changes

### File 1: `src/components/team/GameResultsScreenV2.tsx`

**Current Logic (lines 211-227):**
```typescript
const handlePlayAgain = async () => {
  setIsStartingRematch(true);
  try {
    if (queue.length > 0) {
      await startNextFromQueue();
    } else {
      // No queue - repeat same category ← PROBLEM: Same questions!
      await startNewRound();
    }
  } catch (error) {
    // ...
  }
};
```

**New Logic:**
1. When `queue.length > 0`: Show "გაგრძელება" (Continue) button → calls `startNextFromQueue()`
2. When `queue.length === 0`:
   - **Host:** Show "კატეგორიის დამატება" (Add Category) → calls `continueInRoom()` to go to lobby
   - **Non-host:** Either hide the button OR show "ველოდებით" (Waiting) state

**UI Changes:**
```tsx
{/* Bottom Section - Modified */}
{queue.length > 0 ? (
  // Has queue - show continue button
  <ChunkyButton
    variant="mint"
    onClick={handlePlayAgain}
    icon={<ChevronRight />}
  >
    გაგრძელება: {nextQueueItem.category_name}
  </ChunkyButton>
) : isHost ? (
  // No queue, is host - add category button
  <ChunkyButton
    variant="mint"
    onClick={handleBackToRoom}
    icon={<Plus />}
  >
    კატეგორიის დამატება
  </ChunkyButton>
) : (
  // No queue, not host - waiting indicator
  <div className="text-center py-4 text-white/70">
    ველოდებით მასპინძელს...
  </div>
)}

<ChunkyButton
  variant="secondary"
  onClick={handleBackToRoom}
  icon={<ArrowLeft />}
>
  ოთახში დაბრუნება
</ChunkyButton>
```

---

### File 2: `src/components/team/RoomLobbyV2.tsx`

**Add visual indicator when coming from results:**
- Optionally highlight the "კატეგორიის არჩევა" (Category Selection) section
- Consider showing a subtle hint like "დაამატე კატეგორია შემდეგი რაუნდისთვის" (Add a category for the next round)

---

### Optional: Keep "Replay Same Round" Option

If the user WANTS to replay the same trivia with same questions (for practice), we can add a secondary option:

```tsx
{/* Only show for user trivias (not library categories) */}
{!currentRoom?.category_id && isHost && (
  <ChunkyButton
    variant="ghost"
    onClick={handleReplaySame}
    icon={<RotateCcw />}
    className="text-white/60"
  >
    იგივე ტრივია
  </ChunkyButton>
)}
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `GameResultsScreenV2.tsx` | Differentiate actions: host can add categories, non-host waits |
| `GameResultsScreenV2.tsx` | Remove auto-replay of same questions when no queue |
| `GameResultsScreenV2.tsx` | Add clear "კატეგორიის დამატება" button for host |
| `RoomLobbyV2.tsx` | (Optional) Add visual hint for adding next round |

---

## User Experience After Fix

### For Host:
1. Finish round → See results
2. Click "კატეგორიის დამატება" → Goes to lobby
3. Add new category/trivia to queue → Click "დაწყება"
4. New round starts with new content

### For Non-Host:
1. Finish round → See results  
2. See "ველოდებით მასპინძელს..." message
3. Either wait or click "ოთახში დაბრუნება" to go to lobby
4. When host starts game, automatically joins

---

## Testing Checklist

1. Play a round with a user trivia (invited friend flow)
2. On results, verify host sees "კატეგორიის დამატება" instead of "ახალი რაუნდი"
3. Verify non-host sees waiting state, not the play button
4. Verify clicking "კატეგორიის დამატება" goes to lobby
5. In lobby, verify host can add categories to queue
6. Verify starting game works with new categories
7. Test with queue items - verify "გაგრძელება" shows correctly
