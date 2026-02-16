

## Two Fixes: Round Leaderboard + "დრო ამოიწურა" Message

### Fix 1: Show Leaderboard with Points After Every Round

Currently, the TV screen (`TVLobby.tsx`) maps both `results` and `completed` phases to `TVResultsScreenV2`, which shows a final game-over podium. There is no intermediate round-end leaderboard between rounds.

**Changes:**

**File: `src/pages/TVLobby.tsx`**
- When in `reveal` phase AND it's the last question of the round (i.e., `currentQuestionIndex === questions.length - 1`), show a dedicated round leaderboard instead of `TVQuestionScreenV4`
- Alternatively, enhance the existing `TVRevealScreenV2` (which already has `TVLeaderboardPanel`) to be used during reveal phase on the TV screen, showing player scores prominently

**Better approach:** Since the `reveal` phase already triggers on TV after each question, modify `TVQuestionScreenV4` (which is shown during reveal on TV per line 107) to display player avatars with their current scores below them during the reveal phase. This way after every question players can see the running score, and especially after the last question of each round they see the standings before transitioning to the next round.

**File: `src/components/tv/TVQuestionScreenV4.tsx`**
- During the `reveal` phase, show each player's score below their avatar in all three zones (correct, wrong, waiting)
- Add a small score label (e.g., the player's total score) beneath each avatar circle
- This gives a running leaderboard feel throughout the round without needing a separate screen

### Fix 2: Show "დრო ამოიწურა" Instead of "არასწორია" When Time Runs Out

The issue is in `ControllerReveal.tsx` (the phone controller screen shown to players during reveal). Currently line 133 shows only `სწორია!` or `არასწორია!` without checking if the player actually answered or timed out.

The `TVHostController.tsx` (line 823) already handles this correctly with `didAnswer` check, but `ControllerReveal.tsx` does not.

**File: `src/components/controller/ControllerReveal.tsx`**
- At lines 125-134, add a `didAnswer` check: if `myAnswer === null` (and no captured answer), show "დრო ამოიწურა!" with gray styling (like TVHostController does) instead of "არასწორია!"
- Use a gray icon (Clock) and gray text color for timeout, keeping red X and "არასწორია!" only for actual wrong answers

---

### Technical Details

**TVQuestionScreenV4.tsx changes (score display during reveal):**
- Below each `SafeAvatar` in the wrong, waiting, and correct player zones, add a small score badge showing `player.score`
- Only show during `phase === 'reveal'` to keep the question phase clean
- Style: small white text on semi-transparent background, positioned below the avatar

**ControllerReveal.tsx changes (timeout message):**
- Line 104-107: Add `didAnswer` logic similar to TVHostController
- Line 127-133: Add Clock icon + gray styling for timeout case
- Line 132-133: Three-way conditional: `didAnswer ? (isCorrect ? 'სწორია!' : 'არასწორია!') : 'დრო ამოიწურა!'`
