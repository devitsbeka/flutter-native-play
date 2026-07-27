# TV Audit — 02: Game Start & Rounds

_Scope: startGame, question sourcing/validation, count locking, category
queue, multi-round transitions, suggester/poll flow, scores across rounds,
play-again. Severity: H/M/L._

## How it works (verified)

1. **startGame(categoryId | userTriviaId)** (host only): consumes the queue's
   first item if it matches the chosen round (keeps queue = "future rounds",
   fixes off-by-one totals), computes `total_rounds = 1 + queueCount`,
   fetches ALL 10 questions up front, writes them to the session row, moves
   to countdown/round-intro.
2. **Question sourcing**: library categories and `__mixed__` go through the
   unified `questionService.getQuestions({mode:'tv'})` — includes shuffle,
   seen-question exclusion, and broken-image pre-validation. User trivias
   are read straight from `user_quiz_posts.questions` JSONB.
3. **Count locking**: `startPlaying` (mutex-guarded) → `prepareForPlaying` →
   `confirmActivePlayers` (presence-verified actives, paired floor of 2,
   suggester excluded) → `active_player_count` locked per question.
4. **Round transitions**: reveal of last question → `startNextRoundFromQueueIfAny`
   (in-flight guard) → consumes next queue item (tv queue, else room queue) →
   `round-intro` → host `markReady` → countdown → playing. Round number
   CAS-guarded against overflow.
5. **Scores**: `current_round_score` accumulates across queued rounds (reset
   only on play-again / new game) → final podium shows the grand total, per
   product decision (2026-07-27).
6. **Poll flow**: `tv_poll_suggestions`/`tv_poll_votes` tables; statuses
   `poll-suggest → poll-voting → poll-results`; winner's suggester is locked
   as the round's observer (blocked from answering, earns observer bonus when
   the majority answers wrong). Poll timing = `poll_start_time`+`poll_duration`
   on the session, driven by host-client timers.

## Findings

### M-1: User-trivia rounds bypass media handling and image validation
The user-trivia path maps only `question_text/correct/incorrect/icon_slug` —
any `image_url`/`video_url`/`audio_url` on user-created questions is
silently dropped on TV, and no broken-image pre-validation runs (library
rounds get both). Inconsistent with the "image question = image + options"
product rule if user trivias ever carry media.

### M-2: startGame has no double-invocation guard
`startNextRound` has an in-flight ref; `startGame` does not, and the lobby
Start button + 15s auto-start countdown can both fire (countdown calls
`handleStartGame` at 0 while a slow manual start is running). Consequences:
double queue consumption (a queued round silently skipped), double question
fetch, conflicting session writes. Fix direction: same in-flight ref +
disable the button while starting; cancel auto-start on manual press is
already there but not the reverse.

### M-3: Round history is dead code
`saveRoundHistory` (writes `tv_round_history` + `accumulated_scores`) is
exported from the context but never called anywhere. Either wire it into
round completion or delete the path and table — currently it just misleads.

### M-4: Poll phases run on the same fragile host-client timers
Poll timing (suggest/vote windows) is enforced only by the host device's
JS clocks — the same engine-on-a-phone weakness the question loop had.
Watchdogs added to the question loop don't cover poll phases; a host blip
during a poll strands the session in `poll-*` with no recovery path.

### L-1: Seen-question tracking is device-local
`markQuestionsAsAsked('tv_<cat>')` stores seen ids in the HOST DEVICE's
localStorage. A different host device (or cleared storage) repeats
questions across game nights. Server-side per-room/user tracking would be
needed for real no-repeat guarantees.

### L-2: Queue reorder is N sequential updates
Queue consumption reindexes positions with parallel per-row updates —
harmless at current sizes, but not atomic; a concurrent add-to-queue can
interleave and produce duplicate positions (self-heals on next reorder).

### L-3: `current_round_score` is a misnomer
It holds the ACCUMULATED total across rounds (by design). Rename to
`total_score` when convenient to prevent future bugs — earlier code assumed
per-round semantics more than once.

## Cross-references
- Count-locking + advance interplay: Run 3.
- Poll strand recovery: candidates for Run 8 backlog with M-4.
