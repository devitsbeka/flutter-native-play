# New Game Types — Design

Status: **P1–P4 implemented and merged** · Owner: product + whichever agent picks this up
Decisions in this doc were made with the product owner on 2026-08-29. Where a
choice is marked *(decided)* it is settled — don't re-litigate it in a PR, ask first.

## Implementation status (2026-08-29)

| Phase | State | Where |
|---|---|---|
| P1 entry + registry | ✅ shipped | `/play`, `game_types` migration `20260916*`, `src/game-types/` |
| P2 Team Battle | ✅ built, dark | migration `20260917*`, `TeamBattleContext`, `/team-battle`, suite `10-*` |
| P3 MyTrivia King | ✅ built, dark | migrations `20260918*` (schema + 24-question seed), `/king`, suite `11-*` |
| P4 global matchmaking | ✅ built | migration `20260919*`, `useMatchmaking`, `/play/queue`, suite `12-*` |
| P5 polish | partially | adversarial review pass applied; TV surface / rating bands / King ladder remain post-launch |

Deviations from the spec worth knowing: the Team Battle super round draws its
questions from the same trivia pipeline as the board (not a dedicated pool);
matchmade Team Battle queues as 2v2 only in v1; the King seed pool is 24
questions against the ~120 launch bar (§3.3) and is the quality reference for
the rest. The dark launch is enforced server-side in `tb_start_match`,
`king_start_match` and `mm_enqueue` — a mode that is not `is_live` refuses
hand-crafted calls, not just chooser taps.

## Launch runbook

1. Merge to `main`; the web deploy is automatic, the database is not.
2. Ask Lovable to deploy — or paste each migration's raw-file link from
   `main` into the Lovable SQL editor, in order: `20260916100000` (registry),
   `20260917100000` (team battle), `20260918100000` + `20260918110000`
   (king + seed), `20260919100000` (matchmaking).
3. Verify: `select key, is_live, supports_matchmaking from game_types order by sort_order;`
   (4 rows; classic has matchmaking) and
   `select count(*) from king_questions where is_active;` (24).
4. Review the seed questions (`20260918110000_king_seed_en.sql`) and grow the
   pool toward ~120.
5. Flip modes live, one at a time, each a one-line SQL statement:
   `update game_types set is_live = true where key = 'team_battle';` /
   `... where key = 'king';` Classic matchmaking is live the moment the
   matchmaking migration lands (classic is already `is_live`).

This document specifies:

1. A redesigned **Play entry flow** (the bottom-center Play button).
2. Game type #1: **Team Battle** — a Family-Feud-style team game, remote, phones.
3. Game type #2: **MyTrivia King** — a What? Where? When?-style solo intellectual game.
4. **Global matchmaking** (v1 scope — decided in).
5. Schema, RPC, economy, and phasing plans grounded in the code that exists today.
6. A backlog of future game types.

---

## 0. What exists today (read this before designing further)

| Piece | Where | Relevance |
|---|---|---|
| Play button | `src/components/layout/UniversalBottomNav.tsx` → `onPlayClick` provided by `src/pages/Index.tsx` | Entry point we're redesigning |
| Play chooser | `src/components/home/PlayOptionsModal.tsx` | Two hardcoded options today (Quick Game, Play with Friends) |
| Quick Game | `src/contexts/GameContext.tsx` + `/game` | **Solo vs a simulated bot** (`src/data/opponents.ts`) — there is no real PvP matchmaking anywhere today |
| Friend rooms | `src/contexts/MultiplayerContextV2.tsx` (3k lines), `src/pages/TeamV2.tsx`, `src/components/team/*` | The multiplayer engine Team Battle builds on |
| Room schema | `game_rooms`, `room_participants`, `room_games`, `room_questions`, `player_answers`, `room_first_correct`, `room_category_queue` | Extended, not replaced |
| Realtime | Postgres `postgres_changes` subscriptions per room (`room-${id}`, `participants-${id}`, `answers-${id}`) | Same mechanism for new modes |
| Questions | `questionService.getQuestions(ctx)` — the "golden standard" pipeline; `questions.difficulty` = easy/medium/hard, per-language rows | Team Battle reuses it; King needs a **new question pool** |
| Mode discriminator | `game_rooms.game_mode` — free text, already overloaded (`'tv_show'`, `` `trivia:${id}` ``, `` `collection:${id}` ``) | Formalized below |
| Economy | `credit_gameplay_reward` + `currency_grant_limits` (a kind with no limits row **raises**), `settle_quick_game` for stakes | Every new payout needs a limits row + server-side settle |
| TV mode | `TVGameContext` + `tv_*` tables/RPCs | Precedent for a server-authoritative game type; **not** the base for these two |

Constraints from `CLAUDE.md` that shape this design:

- Migrations/functions deploy **through Lovable**, not the CLI. New `SECURITY DEFINER`
  functions must `REVOKE ALL FROM PUBLIC` and grant explicitly.
- Currency credits are server-decided only. No client-side grant paths.
- New standalone pages must own their scrolling
  (`h-[calc(100dvh_-_var(--safe-top)_-_var(--safe-bottom))] overflow-y-auto`) —
  the iOS webview document scroller is disabled.

---

## 1. Entry flow — the Play button

**Today:** Play → `PlayOptionsModal` (Quick Game | Play with Friends).

**New flow:**

```
Play button
  └─ Play screen (full-screen sheet, replaces PlayOptionsModal)
       ├─ Quick Game        → unchanged (solo vs bot, stake via settle_quick_game)
       └─ Play with Friends → Game Type Select page
            ├─ Classic Trivia   (existing room flow, unchanged rules)
            ├─ Team Battle      (new — §2)
            ├─ MyTrivia King    (new — §3; solo, listed here for discoverability,
            │                    also reachable from Quick Game side later)
            └─ [future types render from the registry — §4]
            Each multiplayer type then offers:
              • Private game  → invite friends / room code (existing invitation stack)
              • Global server → matchmaking queue (§5)
```

UI notes:

- The Game Type Select page is a new route (suggest `/play`), a standalone page
  (own scrolling per CLAUDE.md 4b), with one card per game type: name, 1-line
  hook, player count, est. duration, and a "NEW" badge driven by the registry.
- `PlayOptionsModal` becomes a thin launcher or is replaced by navigation to
  `/play`; guest users keep the current direct-to-Quick-Game shortcut.
- MyTrivia King is solo but lives on this screen too — the screen is "what do
  you want to play", not strictly "multiplayer".

---

## 2. Game type: Team Battle

*Elevator pitch:* two teams, a board of priced categories, rapid-fire turns,
one player in the spotlight at a time, rock-paper-scissors for the opener, and
a 1v1 blitz super round on a tie.

### 2.1 Decided rules

- **Remote, each player on their own phone** *(decided)*. Same realtime room
  stack as friend rooms. A TV display can come later; rules are designed
  server-side so a display surface can be added without rule changes.
- **Teams: equal sizes, 1v1 up to 5v5** *(decided)*. Room min 2, max 10.
- **Turn = timed rapid-fire** *(decided)*: the active player picks a category
  from the board and gets **~40 seconds** (tunable via `economy_config`-style
  config) of rapid-fire questions in that category at the category's difficulty.
- **Win condition = points from category prices** *(decided)*: each correct
  answer in a turn earns a slice of the category's price
  (`price / target_correct`, capped at the full price). Highest team total
  after the board phase wins. Prices: easy categories are cheap, hard ones
  expensive — risk/reward is the strategy layer.
- **Everyone plays**: each player must take at least one turn before any
  teammate takes a second. Turn count per team = max(team size, board picks
  per team); with uneven-ish rosters the server enforces the rotation.
- **Opener mini-game: rock-paper-scissors** *(decided)*: one round, whole
  teams — every player secretly picks ✊✋✌️, majority gesture per team is the
  team's throw (tie inside a team → random among tied). Winning team picks
  first. It's theater; keep it under 15 seconds with big reveal animation.
- **Tie → Super Round** *(decided)*: each team votes one champion
  (self-votes allowed; tie in votes → captain decides; captain = team's first
  joiner by default). Champions play a 1v1 blitz: same question
  simultaneously, first correct answer scores (reuse the `room_first_correct`
  first-claim pattern), first to 3 wins the match.

### 2.2 Match flow (server-authoritative phases)

```
lobby → team_pick → rps → board (repeat: pick → rapid_fire → turn_result)
      → [super_vote → super_round]? → match_result
```

1. **lobby** — existing `RoomLobbyV2` with a team-assignment layer: two team
   columns, tap to switch sides, host can shuffle/balance. Start requires
   equal teams and everyone ready.
2. **team_pick** — folded into lobby (not a separate phase).
3. **rps** — all players submit a gesture within 10s (no submit → random).
   Reveal both team throws; winner picks first.
4. **board** — 6–10 category tiles (count scales with team size so everyone
   gets a turn), each showing category, difficulty chip, and price. Generated
   at match start from the room's language/categories via
   `questionService.getQuestions` (new `mode: 'team_battle'`).
   The picking team's *next rotation player* chooses the tile; only that
   player answers. Teammates and opponents watch a spectator view: live
   question (read-only), timer, and running score — the `answers-${roomId}`
   INSERT subscription already delivers per-answer events for this.
5. **rapid_fire turn** — ~40s, questions served one at a time from the
   category's pool; correct = next question + price slice; wrong/skip = next
   question, no penalty beyond time. Turn ends on timer.
6. **turn_result** — 3s interstitial: points earned, team totals, board state.
7. Alternate teams until every tile is played (or both rotations complete).
8. **super_vote / super_round** — only on exact points tie.
9. **match_result** — winner, MVP (most points earned), payouts, rematch CTA.

Disconnects: same durable-roster approach as rooms (`useDurableRoster`,
`participant_status`). If the active player disconnects mid-turn the timer
runs out naturally; their turn is not replayed. A team dropping below half its
size for >60s forfeits (server timer, not client).

### 2.3 Schema changes

Extend, don't fork, the room schema:

```sql
-- room_participants
ALTER TABLE room_participants ADD COLUMN team text CHECK (team IN ('a','b'));
ALTER TABLE room_participants ADD COLUMN turn_order int;

-- new: one row per board tile
CREATE TABLE team_battle_board (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES game_rooms NOT NULL,
  game_id uuid,                      -- room_games round this board belongs to
  tile_index int NOT NULL,
  category_id uuid NOT NULL,
  difficulty text NOT NULL,          -- easy | medium | hard
  price int NOT NULL,
  claimed_by_team text,              -- 'a' | 'b' once played
  played_by uuid,                    -- the spotlight player
  points_earned int DEFAULT 0,
  played_at timestamptz
);

-- new: match-level state machine (phases, whose turn, rps, super round)
CREATE TABLE team_battle_state (
  room_id uuid PRIMARY KEY REFERENCES game_rooms,
  game_id uuid,
  phase text NOT NULL,               -- rps | board | rapid_fire | super_vote | super_round | done
  active_team text,
  active_player uuid,
  active_tile uuid REFERENCES team_battle_board,
  turn_deadline timestamptz,         -- server-set; clients render countdown from it
  team_a_score int DEFAULT 0,
  team_b_score int DEFAULT 0,
  rps jsonb DEFAULT '{}'::jsonb,     -- per-player throws + resolved winner
  super jsonb DEFAULT '{}'::jsonb,   -- votes, champions, blitz score
  updated_at timestamptz DEFAULT now()
);
```

`player_answers` is reused as-is for turn answers (it already carries
`room_id`, `question_index`, `is_correct`, `points_earned`).

RPCs (all `SECURITY DEFINER`, `REVOKE ALL FROM PUBLIC`, granted to
`authenticated` only — per CLAUDE.md §3):

- `tb_start_match(room_id)` — validates equal teams, builds board, seeds state.
- `tb_submit_rps(room_id, throw)` / auto-resolve on deadline.
- `tb_pick_tile(room_id, tile_id)` — only the active player may call.
- `tb_submit_answer(room_id, tile_id, question_id, answer)` — server checks
  correctness and deadline, updates scores, inserts `player_answers`.
- `tb_advance(room_id)` — deadline-driven phase advance; callable by any
  participant, idempotent (first caller wins, like `tv_advance_question`).
- `tb_settle(room_id)` — computes result, writes `room_games` +
  `room_match_history`, credits rewards (§6).

Clients subscribe to `team_battle_state` UPDATEs on `room-${roomId}` alongside
the existing room channels. **All timers are server deadlines** — clients
render countdowns from `turn_deadline`, never decide expiry themselves.

---

## 3. Game type: MyTrivia King

*Elevator pitch:* the digital What? Where? When?. Very hard questions that
require **no prior knowledge — only logic**. One minute of real thinking, then
commit. You against the MyTrivia King, first to 6.

### 3.1 Decided rules

- **Solo** vs the King (a styled persona of the game itself, not another user
  and not an LLM opponent — the "opponent" is the question).
- **First to 6** *(decided)*: each question is an "envelope". Crack it → you
  score. Miss → the King scores. Match ends at 6 either way. Classic show
  pacing, natural drama at 5–5.
- **Hybrid answer flow** *(decided)*:
  1. Question presented — text (support image), **no options shown**.
  2. **60-second think phase.** Nothing to tap but a "I have it" early-commit
     button. Encourage actual thinking; optionally a scratch-pad text field
     that is never submitted.
  3. **Commit phase**: 4 options appear, **10 seconds** to lock one in.
     Options are engineered to be plausible post-hoc rationalizations — they
     must not give the answer away to someone who didn't think (see 3.3).
  4. Reveal + **explanation screen**: the logic chain, written out. This is
     the soul of the mode — losing a question should still feel enriching.
- No power-ups, no 50/50 — this mode's integrity is the point.

### 3.2 Why this needs a separate question pool

The existing `questions` table is knowledge trivia. King questions are logic
puzzles with a derivation, an explanation, and adversarial distractors. Mixing
them into `questions` would pollute every existing mode's pipeline
(level selection, seen-tracking, difficulty semantics).

```sql
CREATE TABLE king_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language text NOT NULL DEFAULT 'en',
  translated_from uuid REFERENCES king_questions,  -- same per-language-row model as questions
  question_text text NOT NULL,
  image_url text,
  correct_answer text NOT NULL,
  incorrect_answers jsonb NOT NULL,   -- exactly 3, adversarially written
  explanation text NOT NULL,          -- the logic chain, always required
  difficulty int NOT NULL DEFAULT 3,  -- 1..5, for ladder tuning later
  source text,                        -- 'curated' | 'ai_reviewed'
  is_active boolean DEFAULT false,    -- nothing ships unreviewed
  created_at timestamptz DEFAULT now()
);

CREATE TABLE king_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'playing',  -- playing | won | lost | abandoned
  player_score int DEFAULT 0,
  king_score int DEFAULT 0,
  question_ids uuid[] DEFAULT '{}',
  started_at timestamptz DEFAULT now(),
  finished_at timestamptz
);
```

Server RPCs: `king_start_match()`, `king_draw_question(match_id)` (returns the
question **without** options during think phase; options fetched only when the
commit phase opens — keeps them out of the DOM during thinking),
`king_submit_answer(match_id, question_id, answer)` (server-validated,
deadline-checked), `king_settle(match_id)`.

### 3.3 Content pipeline

- Seed pool: **hand-curated, ~120 questions** before launch (enough for ~10–15
  matches per player before repeats; per-player seen-tracking via a
  `king_seen` per-user array or the existing `questionTracker` pattern with a
  new key).
- AI-assisted authoring is fine (the repo already has AI generation edge
  functions as precedent) but **every question ships human-reviewed**
  (`is_active` gate). Bad logic questions are worse than no questions.
- Distractor quality bar: each wrong option must be the "answer" of a
  plausible-but-flawed reasoning chain. Review checklist lives with the pool.
- Localization follows the existing model: one row per language,
  `translated_from` linking to the source. Logic questions translate better
  than knowledge trivia (little cultural pinning) — good fit for the existing
  no-fallback language policy.

---

## 4. Game type registry (formalizing `game_mode`)

`game_rooms.game_mode` is today a free-text field doing double duty as a mode
flag and a content pointer. Don't break existing values; formalize alongside:

```sql
CREATE TABLE game_types (
  key text PRIMARY KEY,          -- 'classic' | 'team_battle' | 'king' | 'tv_show' | ...
  title text NOT NULL,           -- + game_type_translations later if needed
  tagline text NOT NULL,
  min_players int NOT NULL,
  max_players int NOT NULL,
  supports_private boolean NOT NULL DEFAULT true,
  supports_matchmaking boolean NOT NULL DEFAULT false,
  is_live boolean NOT NULL DEFAULT false,  -- drives visibility on /play
  sort_order int NOT NULL DEFAULT 100,
  badge text                     -- 'new' | 'beta' | null
);

ALTER TABLE game_rooms ADD COLUMN game_type_key text REFERENCES game_types;
```

- Existing rows/values in `game_mode` stay untouched; classic flow writes
  `game_type_key = 'classic'` going forward, old rows are backfilled lazily
  or left null (treated as classic).
- The `/play` page renders from `game_types where is_live` — shipping a new
  mode to the chooser becomes a data change, and modes can be dark-launched.
- Client: a `src/game-types/` module with one descriptor per type (route,
  icon, context provider) keyed by the same `key`, so the registry row and the
  client implementation are matched explicitly and an unknown key renders
  nothing rather than crashing.

---

## 5. Global matchmaking (v1 — decided in scope)

Decision: real stranger matchmaking ships in v1, not just public rooms.
Scope it tightly:

### 5.1 v1 shape

- **Queue per (game_type, language, team_size-bucket)**. Classic 1v1 and Team
  Battle (players queue solo or as a friend party; parties ≤ team size).
- Mechanism: a `matchmaking_queue` table + a matcher that runs server-side.
  Given the no-CLI/Lovable deploy constraint and that edge functions here do
  side effects only, the matcher is a `SECURITY DEFINER` function
  `mm_try_match()` invoked opportunistically: on every enqueue, and by a
  `scheduled-pushes`-style cron if available. No long-lived worker.

```sql
CREATE TABLE matchmaking_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  party_id uuid,                   -- friends queueing together
  game_type_key text NOT NULL REFERENCES game_types,
  language text NOT NULL,
  team_size int,                   -- team battle: desired size, null = any
  rating int,                      -- from profiles stats; loose banding only in v1
  enqueued_at timestamptz DEFAULT now(),
  matched_room_id uuid,
  status text NOT NULL DEFAULT 'waiting'  -- waiting | matched | cancelled | expired
);
```

- `mm_enqueue(...)` → inserts + calls `mm_try_match()`; `mm_cancel()`.
- `mm_try_match()` (idempotent, advisory-locked): oldest-first within the
  bucket; widen rating band with wait time; when enough players are found it
  **creates a `game_rooms` row itself**, assigns teams (parties kept
  together, remainder balanced), inserts `room_participants`, marks queue
  rows matched. Players learn of the match via a realtime subscription on
  their own queue row (`matched_room_id`) and are navigated straight into the
  lobby with a short auto-ready countdown.
- Expiry: rows older than 2 minutes expire → client offers "keep waiting /
  play vs bot instead / invite friends". **Never silently fake it with bots
  in a mode advertised as global PvP** — the Quick Game bot precedent stays
  in Quick Game.
- Abandonment: queue again immediately re-fills a room that lost players in
  lobby; mid-match Team Battle uses the forfeit rule (§2.2), no backfill v1.

### 5.2 Explicit v1 exclusions

No skill-based rating beyond loose banding, no cross-language matching, no
mid-match backfill, no region sharding. All are phase-2+ and the queue schema
above doesn't block any of them.

---

## 6. Economy & rewards

Per CLAUDE.md §3, all payouts are server-decided:

- New reward kinds + `currency_grant_limits` rows (**required, or the RPC
  raises and pays nothing**): `team_battle_win`, `team_battle_play`,
  `king_win`, `king_question` (small per-cracked-question drip, capped daily).
- Team Battle settle: winning team splits a pot; category prices are the
  *match score*, coins derive from them server-side inside `tb_settle` with
  bounded amounts. MVP bonus optional, also bounded.
- Stakes (à la `settle_quick_game`) are **out of v1** for both new modes —
  entry is free (subject to `usePlayLimit`); revisit once match-abandonment
  behavior is understood.
- Play limits: both modes consume a play via the existing `usePlayLimit` /
  `PlayGuardContext` gates, same as Quick Game.

---

## 7. Build phases

Each phase is shippable and independently testable; migrations go to `main` →
Lovable deploy per CLAUDE.md 4a.

1. **P1 — Entry + registry.** `/play` page, `game_types` table + seed rows
   (classic live; team_battle/king as `badge='beta', is_live=false` dark),
   PlayOptionsModal rewired. Zero gameplay risk.
2. **P2 — Team Battle, private rooms only.** Schema §2.3, RPCs, lobby team
   picker, RPS, board, rapid-fire, settle. Feature-flagged via `is_live`.
3. **P3 — MyTrivia King.** Schema §3.2, curated seed pool, match flow,
   explanation screens.
4. **P4 — Global matchmaking.** Queue + matcher, Classic 1v1 first (smallest
   match unit, exercises the whole pipe), then Team Battle.
5. **P5 — Polish.** Spectator view juice, TV display surface for Team Battle,
   King ladder/leaderboard, rating bands.

Test obligations: `supabase/tests/` rows for every new RPC's privilege posture
(revoked from PUBLIC/anon), and `repo-invariants`-style assertions that the
six entitlement functions plus the new settle functions exist in types.

---

## 8. Future game types (backlog, roughly ordered)

1. **Daily Gauntlet** — one shared daily set of 10 questions, everyone plays
   the same set once; global + friends leaderboard resets daily. Cheapest to
   build (no realtime), strongest retention loop; pairs with streaks.
2. **Blitz Royale** — 20–100 players answer simultaneously, bottom X%
   eliminated each question until one remains. Global-server flagship;
   matchmaking from §5 makes it possible. Great spectator/TV moment.
3. **Auction Trivia** — before each question only the category is shown;
   players bid coins for the right to answer. Wrong answer forfeits the bid.
   Deep use of the currency system (all server-settled).
4. **Co-op Raid** — a friends room plays *together* against an escalating
   "boss" question ladder with a shared HP bar; weekly boss rotation. Purely
   cooperative — fills a social niche the versus modes don't.
5. **Liar's Trivia** — players submit fake answers to open-ended questions,
   then everyone picks the real one from the mix (Fibbage-style). Reuses the
   user-generated-content moderation stack; brilliant for the TV surface.
6. **Relay** — team mode where the answer baton passes on every question and
   a wrong answer resets the streak multiplier. A cheap Team Battle variant
   once §2's team plumbing exists.
7. **Prediction League** — not questions but predictions (sports, events)
   scored when reality resolves. Different content ops; park it until there's
   an editorial pipeline.

Recommended next after P5: **Daily Gauntlet** (retention, near-zero infra),
then **Blitz Royale** (uses matchmaking investment, marketable).

---

## 9. Open questions (parked, not blockers)

- Team Battle board size vs. team size curve — playtest, keep in config.
- RPS: does the whole-team majority throw read clearly at 5v5, or should big
  teams delegate to captains? Playtest.
- King: does a 60s think phase hold attention on mobile, or does 45s test
  better? Instrument it.
- Matchmaking liquidity: below what DAU does the global queue feel dead per
  language bucket? Have the "invite friends instead" fallback ready from day
  one.
