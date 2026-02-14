

## Fix: Challenge Scores, Room Sorting & Start Button Logic

### Issue 1: Challenge scores show wrong value (1 vs 751)

The challenger's score is saved as total points (e.g., 751 — including time bonuses), but the friend's `player_score` is saved as a simple correct-answer count (e.g., 1). This makes the comparison meaningless.

**Fix in `ChallengeLanding.tsx`:** Calculate a proper point-based score for the challenge player, matching the host's scoring system. Instead of incrementing `playerScore` by 1 per correct answer, calculate points with a time bonus (same formula used in the multiplayer game: base points + time bonus).

The scoring formula will match the room game: ~100 base points + up to ~50 bonus points based on remaining time per correct answer. This way both scores are comparable.

### Issue 2: Host sees new room first in list

The sorting in `useMyRooms.ts` already prioritizes "MY recently created rooms (within 5 min)" at Priority 1. However, after 5 minutes the room drops in priority. We will extend this window to include rooms with recent `last_activity_at` when the host owns them, ensuring rooms the host just interacted with stay near the top.

**Fix in `useMyRooms.ts`:** Broaden the "my new room" priority to also include rooms where `last_activity_at` is very recent (within 10 minutes) and the user is the host.

### Issue 3: Bottom button shows "აირჩიე კატეგორია" instead of "თამაშის დაწყება"

Currently, the logic forces "აირჩიე კატეგორია" whenever `justReturnedFromResults && !madeNewSelection`, even if the queue has items ready to play. The user wants: if there's at least one category/trivia/queue item selected, always show the start button. The + button in the category picker section above already handles adding more categories.

**Fix in `RoomLobbyV2.tsx`:** Change the `needsCategorySelection` logic so it only shows "აირჩიე კატეგორია" when there is truly no content (no queue items, no category, no trivia). Remove the `justReturnedFromResults` override when content exists.

---

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/ChallengeLanding.tsx` | Calculate point-based score instead of correct-count for `playerScore` |
| `src/hooks/useMyRooms.ts` | Extend "my new room" priority window for host's active rooms |
| `src/components/team/RoomLobbyV2.tsx` | Fix bottom button logic: show "თამაშის დაწყება" when queue/category exists |

### Technical Details

**Score calculation (ChallengeLanding.tsx):**
```typescript
// Per correct answer: base 100 + time bonus (up to 50 based on time remaining)
const timeBonus = Math.round((timeRemaining / TIME_PER_QUESTION) * 50);
setPlayerScore(s => s + 100 + timeBonus);
```

**Button logic fix (RoomLobbyV2.tsx line ~981):**
```typescript
// Only show "აირჩიე კატეგორია" when there's truly nothing to play
const needsCategorySelection = !hasContent;
```
