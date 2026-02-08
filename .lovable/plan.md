

## Fix: Empty Leaderboard + Tap Delay on Feed Cards

### Problem 1: Leaderboard shows "0 players" on new mascot trivias

The new mascot trivias (Tornike, Nino, Saba, etc.) have `plays_count` values (19-55) displayed in the UI, but there are **zero actual play records** in the `quiz_post_plays` table. The leaderboard queries this table for real data, so it correctly shows empty.

The old mascots (Giorgi, Nika, etc.) have 7 actual play records each because their migration included inserting cross-play records. The new migration only set `plays_count` numbers without creating matching play data.

### Problem 2: Tap delay on feed cards

The `touch-action: pan-x pan-y` on the body element combined with framer-motion animation wrappers causes inconsistent tap response on mobile. Cards require multiple taps to register a click.

---

### Solution

#### Part 1: Insert play records for new mascot trivias (Database Migration)

Insert cross-play records where each of the 16 mascot accounts "plays" the 8 new trivias (excluding the trivia owner). This gives each new trivia ~15 play records with varied scores (0-5 range since each trivia has 5 questions).

All 8 new trivia post IDs:
- Tornike: `441639c7-...` (ყველაფერი ცოტ-ცოტა)
- Nino: `99116cb9-...` (შერეული ვიქტორინა)
- Saba: `37f690a4-...` (გამოიცანი!)
- Salome: `93eb9637-...` (ტესტი ერუდიტებისთვის)
- Dato: `e38f80a1-...` (მრავალფეროვანი კითხვები)
- Keti: `89b6bba6-...` (ვინ იცის მეტი?)
- Irakli: `e03a0467-...` (ინტელექტის ტესტი)
- Tekla: `94482e11-...` (ერუდიციის გამოწვევა)

Each will get ~15 play records with randomized scores (2-5) and staggered `played_at` timestamps.

#### Part 2: Fix tap delay (Code Change)

**File: `src/index.css`** -- Change `touch-action: pan-x pan-y` to `touch-action: manipulation` on the body element. The `manipulation` value allows panning and pinch-zoom but removes the 300ms delay browsers add when waiting for potential double-tap gestures. This is the standard fix for mobile tap responsiveness.

**File: `src/components/social/PlayerFeedItem.tsx`** -- Add `touch-action: manipulation` directly on the clickable card div for extra safety, ensuring the card area specifically responds instantly to taps.

### Files Changed
- Database migration (insert ~120 play records across 8 trivias)
- `src/index.css` (1 line: touch-action value)
- `src/components/social/PlayerFeedItem.tsx` (add touch-action style to card)

