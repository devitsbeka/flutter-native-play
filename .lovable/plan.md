

## Sample Demo: TV + Player Synchronized Experience

### Overview
Two new pages that showcase a complete TV trivia game experience with hardcoded data. Both pages sync via the browser's `BroadcastChannel` API -- open `/sampledemotv` on a big screen and `/sampledemoplayer` on a phone/tab, click "Start" on either, and they proceed together through the full game flow.

### Players
- **ირაკლი** (host), **გიო**, **თამუნა**, **მაკა**

### Questions (5 from ქართული ლიტერატურა)
Real questions from the database, hardcoded into the demo:
1. ვინ დაწერა „ვეფხისტყაოსანი"? (შოთა რუსთაველი)
2. რომელ ქალაქში დაიბადა ნიკოლოზ ბარათაშვილი? (თბილისი)
3. რომელ ეპოქაში მოღვაწეობდა სულხან-საბა ორბელიანი? (XVII-XVIII საუკუნე)
4. როდის დაიბადა მიხეილ ჯავახიშვილი? (1880 წელი)
5. ვის უწოდეს „ფშაველ-ხევსურთა ბრძენკაცი"? (ვაჟა-ფშაველა)

### Game Flow (automated after "Start")

```text
[Start Button] --> [Countdown 3-2-1] --> [Q1 15s + reveal] --> [Q2] --> ... --> [Q5] --> [Leaderboard]
```

Each question:
- 15-second timer counts down
- AI players "answer" at random times (some correct, some wrong)
- After timer expires: 3-second reveal phase showing correct answer
- Then auto-advance to next question

### Sync Mechanism
- Uses `BroadcastChannel('demo-game-sync')` -- zero backend, works across tabs in the same browser
- Messages: `{ type: 'start' }`, `{ type: 'tick', questionIndex, timeRemaining, phase }` 
- One tab becomes the "driver" (whichever clicks Start first); the other follows

### What each page shows

**`/sampledemotv`** -- TV Display experience:
- Start screen with "დაწყება" button and 4 player avatars
- Countdown (3, 2, 1, დაიწყო!)
- Question screen using the same visual layout as `TVQuestionScreenV4` (question card, 2x2 answers, player status bar with avatars moving between waiting/correct/wrong zones)
- Reveal phase highlighting correct answer in green
- Final leaderboard using the same podium layout as `TVResultsScreen`

**`/sampledemoplayer`** -- Player phone experience:
- Start screen with "მოემზადე" waiting state
- Same countdown
- Mobile answer buttons (tap to select) -- the viewer plays as **თამუნა**
- After selecting, shows correct/incorrect feedback
- Final score summary

### Winner
Predetermined scoring makes **მაკა** win (she gets 4/5 correct with fast times), followed by ირაკლი (3/5), თამუნა (player-controlled), გიო (2/5).

### Files to Create

| File | Purpose |
|------|---------|
| `src/contexts/DemoGameContext.tsx` | Shared state manager with BroadcastChannel sync, game loop logic, hardcoded questions/players, AI answer simulation |
| `src/pages/SampleDemoTV.tsx` | TV display page reusing existing TV visual components (countdown, question layout, results podium) |
| `src/pages/SampleDemoPlayer.tsx` | Mobile player page showing answer buttons, timer, score |

### Files to Modify

| File | Change |
|------|--------|
| `src/App.tsx` | Add 2 routes: `/sampledemotv` and `/sampledemoplayer` (lazy loaded, outside SplashScreen wrapper for instant load) |

### Technical Details

**DemoGameContext** manages:
- Phase state machine: `idle` -> `countdown` -> `playing` -> `reveal` -> (loop) -> `results`
- Timer (15s per question, 1s ticks)
- AI player answers (randomized timing, predetermined correctness pattern)
- Score calculation (base 100 pts + time bonus up to 150 pts for correct answers)
- BroadcastChannel for cross-tab sync (driver/follower pattern)

**No database calls** -- everything is hardcoded. No Supabase, no auth required. Pure client-side demo.

**Route placement** -- Routes will be added outside the `SplashScreen` wrapper (like existing `/tv-showcase`) so they load instantly without the app preloader.
