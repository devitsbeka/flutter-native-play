
# Play Regeneration System (3-Hour Timer After Free Games)

## Current Behavior
- Non-PRO users get 5 lifetime free games (tracked via `profiles.games_played`)
- After 5 games, the play button shows a sand timer (hourglass) icon
- Clicking it shows a "PlayLimitModal" that only offers PRO upgrade
- No way to earn free plays after exhaustion (except becoming PRO)

## New Behavior
- After the 5 free games are used up, a **3-hour regeneration timer** starts
- Every 3 hours, the user earns **1 free play** (max 1 stored at a time)
- When the user clicks the exhausted hourglass button:
  - If a regenerated play is available: let them play
  - If no play available yet: show the PlayLimitModal with a countdown ("you can play again in Xh Ym") + PRO upgrade option
- The PlayLimitModal will be updated to show the time remaining and a note like "შეგიძლია ითამაშო 3 საათში 1 თამაში" (You can play 1 game every 3 hours)

## Implementation Steps

### 1. Add regeneration tracking column to `profiles` table
Add a `last_play_regen_at` timestamp column to track when the regeneration timer started (after the 5th free game was played).

### 2. Update `usePlayLimit` hook
- Add regeneration logic: calculate if 3 hours have passed since `last_play_regen_at`
- Track `regenPlayAvailable` (boolean) -- 1 play available if >= 3 hours elapsed
- After the regenerated play is used, reset the timer
- Add `timeUntilNextPlay` (formatted string like "2სთ 15წთ")
- Update `canPlay` to include regenerated play availability

### 3. Update `PlayLimitModal` for registered non-PRO users
- Show the time remaining until next free play (e.g., "შემდეგი უფასო თამაში: 2სთ 15წთ")
- Keep the PRO upgrade button
- Add text: "ან ითამაშე 3 საათში 1 თამაში უფასოდ" (or play 1 game every 3 hours for free)
- If a regen play is available right now, show a "ითამაშე ახლა" (Play Now) button

### 4. Update `handlePlayClick` in Index.tsx
- When user has exhausted 5 free plays but has a regen play available, allow them to play
- After playing with regen play, update `last_play_regen_at` to current time

### 5. Update `rewardConfig.ts`
- Change `PLAY_REGEN_HOURS` from 4 to 3 to match the requested 3-hour interval
- Set `PLAY_REGEN_MAX` to 1 (only 1 stored regenerated play at a time)

---

## Technical Details

### Database Migration
```sql
ALTER TABLE profiles 
ADD COLUMN last_play_regen_at timestamptz DEFAULT NULL;
```

### `usePlayLimit` changes
- Fetch `last_play_regen_at` from profile
- Calculate: `hoursElapsed = (now - last_play_regen_at) / 3600000`
- `regenPlayAvailable = hoursElapsed >= 3`
- `canPlay = isVip || playsRemaining > 0 || regenPlayAvailable`
- New function `useRegenPlay()`: sets `last_play_regen_at = now()` after using the regen play
- New property `timeUntilNextPlay`: formatted countdown string

### `PlayLimitModal` changes
- Accept new props: `timeUntilNextPlay`, `regenPlayAvailable`, `onPlayWithRegen`
- Show countdown timer when no regen play available
- Show "Play Now" button when regen play is ready

### `handlePlayClick` in Index.tsx
- Add branch: if `!canPlay` from lifetime limit but `regenPlayAvailable`, call `useRegenPlay()` then navigate to game
- Otherwise show the updated PlayLimitModal

### Config change
- `PLAY_REGEN_HOURS`: 4 -> 3
- `PLAY_REGEN_MAX`: 3 -> 1
