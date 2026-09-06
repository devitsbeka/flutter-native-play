# MyTrivia — product and features

*Everything the app does for a player. Written 2026-09-06 from `main` @ `21717c9`,
correcting `docs/MYTRIVIA_FEATURES.md` where the code has moved past it.*

---

## 1. Accounts and identity

**Sign-in methods.** Email + password (Zod-validated); **username + password**,
where the username maps to a synthetic email internally so a player can have an
account without ever giving an email address; Google OAuth; **Sign in with
Apple** — the native plugin on iOS (required by App Store guideline 4.8), OAuth
redirect elsewhere. The last account used is remembered locally
(`mytrivia_last_user`) and offered as a one-tap re-login card.

**Password recovery without email.** `/forgot-password` runs a security-question
flow (five preset questions) through the `reset-password-with-security` edge
function: look up the username, answer the stored question, set a new password.
Answers are hashed, attempts are rate-limited to three and tracked in
`password_reset_attempts`.

**Guest mode.** Unauthenticated visitors play immediately. Five free guest plays
tracked in `localStorage`; guest level progress and stars kept locally
(`useGuestProgress`) and **migrated into the account on signup**, along with a
retroactive game log so nothing is lost. Guests get their own favorites store, a
desktop guest landing page, and a nickname-only join path into TV sessions. This
matters for App Review: the app is fully playable with no account, so no demo
account is needed.

**Onboarding.** A staged flow in `OnboardingContext`:
`age_gate → username → password → creating → complete`. The **age gate**
classifies the player `child` / `teen` / `adult` and writes it to the profile,
which drives child-directed ad treatment and under-age-of-consent handling for
AdMob. A welcome overlay, a signup modal and a feature carousel introduce the
app. The gate starts at 13, which is why the store age rating has to be **12+**
— Apple has no 13+ tier and 4+ on an app whose own gate starts at 13 is a
contradiction a reviewer notices.

**Referrals.** Signup accepts `?ref=CODE`. `friend_invites` tracks
inviter → invitee with an 8-character code, tier granted, acceptance and expiry,
and `resolve_referral_code` / `generate_referral_code` / `accept_invite` handle
the codes. A PRO invite-friends modal and an invites tracker in the profile show
progress. There is also a general `invite_links` table and an `/i/:code` route
with a server-rendered preview (`invite_preview`).

**The old invite-a-friend-for-ten-days-of-PRO offer is gone**, server side
included. `process_referral_reward` was executable by `anon` and took the
*recipient* as a parameter, and the table's own policy let any signed-in player
insert an invite naming themselves as the inviter — two calls, no friend, ten
days of PRO, repeatable forever. It also never paid out, because the signup
insert it depended on was refused by RLS, so the friend saw a "you have PRO days"
toast and got nothing. The function was dropped; the table stays and is simply
no longer client-writable. PRO seats (§4 of the economy doc) are the referral
mechanism now.

**Profile.** `profiles` carries nickname, email, avatar (still and animated),
equipped frame, home mascot, coins, gems, XP/`total_points`, level, games
played and won, current and best streak, country, age group, privacy flag,
sound/music/vibration preferences, push preference, daily-play counters and the
free-play window columns. `/profile` is your own ("My Account"),
`/profile/:userId` the public one, and a **global player-profile modal** opens
from anywhere — leaderboards, lobbies, feeds — via `PlayerProfileContext`.

## 2. Content: categories, questions, icons

**Categories.** 57 built-in categories in `src/data/categories.ts`, typed
`classic` / `fun` / `educational`, each with an icon, gradient, description and
level count (typically 20). Database-backed categories (`categories` +
`category_translations`) layer country- and language-specific sets on top, with
sort order, cover images, icon slugs and activation flags. `user_favorites` pins
categories; `useNewLevels` + `user_category_last_seen` badge categories that
gained levels since your last visit, and `notify-new-levels` pushes the
announcement.

**Three access tiers**, defined once in `src/utils/categoryAccess.ts` and read by
every gating screen:

| Tier | Categories | Rule |
|---|---|---|
| `free` | the picture-guess set: `guess_celebrity`, `guess_city`, `guess_flag`, `guess_logo`, `guess_movie`, `guess_sportsman` | Open to everyone, every level, signed in or not. The shop window; never interrupted by a paywall. |
| `standard` | everything else | One level without a subscription; the rest is what PRO buys. |
| `premium` | the curated nine: `art`, `celebrities`, `fun_facts`, `movies`, `politics`, `programming`, `science`, `space`, `video_games` | Locked outright without PRO, drawn with a lock rather than a progress bar. |

`categories.is_premium` is the authority, but the client carries the nine as a
fallback because migrations reach the database through Lovable and may lag;
`categoryAccess.test.ts` fails if the two drift.

**The question bank.** `questions` rows hold the text, correct answer, three
incorrect answers (JSONB), category, difficulty, language, level number, icon
slug/URL, media URLs, `is_active`, `is_production`, and analytics counters
(`times_shown`, `times_correct`). Every language is its own row.

`src/services/questionService.ts` is **the single question pipeline for every
mode** — the repo calls it the golden standard. It guarantees, in order:

1. language filtering to the app language;
2. active and production-approved rows only;
3. **length validation** — anything that would overflow a phone screen is
   rejected, not truncated;
4. **seen-question tracking** (`questionTracker.ts`, localStorage) so a player
   never repeats a question until the pool is exhausted;
5. **exhaustion detection** with a graceful fallback, surfaced in-game by an
   `ExhaustionIndicator`.

Question types: standard four-answer multiple choice, **true/false**, and
**media questions** (image, audio, video) produced by `generate-media-questions`
and `parse-wikipedia-media`. `src/constants/questionQuality.ts` and
`utils/questionValidation.ts` enforce maximum lengths and detect the answer
leaking into the question text — the same limits the server-side generators use.

**Icon library.** Every question can carry an illustration from a central
`icon_library` (slug, URL, category, tags, AI keywords, usage count), resolved
through `useCategoryIconResolver`, `useAIIcon` / `useAIIconSlug` (hashed
in-memory cache) and `DynamicIcon`, and preloaded before a round starts. A large
admin toolchain assigns, verifies, repairs and propagates icons at scale.

## 3. Game modes

### 3.1 The mode registry

Modes are a **registry**, not a hardcoded list. The `game_types` table decides
liveness, badges and order — so a mode can be dark-launched and then released by
a one-line `UPDATE`, without a client release. `src/game-types/registry.ts` is
the client half: what launching a mode does, and which translation keys and
artwork its card renders with. The two are matched by `key`; a database row with
no client descriptor renders nothing, so an older client cannot launch a mode it
does not know.

| Key | Name | Players | ~Minutes | Status | Route |
|---|---|---|---|---|---|
| `classic` | Classic | 2–8 | 5 | live, matchmaking | `/create-room` |
| `tv_show` | TV / party | 2–12 | 15 | live | `/tv` |
| `team_battle` | Team Battle | 2–10 | 15 | **dark** (beta badge) | `/team-battle` |
| `king` | MyTrivia King | 1 | 10 | **dark** (beta badge) | `/king` |
| `words` | Words | 1–2 | 5 | live (new badge) | `/words` |

`DEVELOPER_ONLY_GAME_TYPES` holds `team_battle` and `king`: with developer mode
off they are not shown at all — not greyed, not teased. With it on (admin only,
`DeveloperModeContext`) they are live for that account so the mode can be played
end to end before anyone else sees it. The dark launch is **enforced
server-side** in `tb_start_match`, `king_start_match` and `mm_enqueue`, so a
hand-crafted call is refused too, not just a chooser tap.

### 3.2 Category campaign (solo)

`/category/:id` → `/play/:categoryId/:levelId`. Pick a category, pick a level on
a progress grid, answer against a per-question timer.

- Scored **1–3 stars**: ≥80% correct = 3★, ≥60% = 2★, ≥40% = 1★.
- Earning ≥1 star unlocks the next level. Progress lives in `user_level_progress`
  (localStorage for guests), aggregated by `useCategoryProgress` / `useTotalStars`.
- Level completion pays `score × 10 + stars × 20` coins, plus mission progress.
- Free-tier gating per §2's three tiers.
- Power-ups usable in-level; level-unlock animation, completed/locked modals and
  an adventure-map help modal support the flow.

### 3.3 Quick Game / VS (`/game`)

A matchmaking animation, then ten questions against a **simulated opponent**
drawn from real player profiles (`src/data/opponents.ts`, `GameContext`). Entry
costs a coin stake (`useGameStake`, settled by `settle_quick_game`); PRO skips it.

Outcome resolution is deliberate (`utils/matchOutcome.ts`): a win requires
leading on score **and** at least one correct answer — leading with zero correct
answers is demoted to a draw, so wins and streaks cannot be farmed.

### 3.4 Classic multiplayer rooms

`/team`, `/create-room`, `/trivia/:triviaId`, `/room/:code`, `/lobby/:gameType`.
Managed by `MultiplayerContextV2` (3,416 lines) over Supabase Realtime.

- **Create**: name (or an auto-generated themed name from 120+ options across 15
  themes in 7 languages), icon, gradient/cover art, category or random, question
  count, max players (default 8, min 2), permanent vs one-shot, public or private.
- **Join**: 6-character room code, deep link, QR scan, friend invite, join
  request (`room_join_requests` + `respond_room_join`), the public rooms list
  (`public_rooms`), or "recent rooms" / "my rooms".
- **The universal lobby** (`src/components/lobby/UniversalLobby.tsx`) is the one
  lobby every mode opens into — two tabs, Rules and Players. It knows nothing
  about rooms; each room kind maps its own state onto its props. The scene behind
  the title is a blurred render of the card that was tapped, so the card appears
  to grow into the screen. Presence, ready states, room chat
  (`room_chat_messages`), a category queue (`room_category_queue`), host
  controls, seat management (`lobby_manage_seat`), host transfer, reactions and
  a room ping all live here.
- **Gameplay**: pre-generated `room_questions` per round, server-synchronized
  timers, a live per-question scoreboard, first-correct-answer claims, and an
  **observer mode** for a host who already knows the answers (the author of a
  blind trivia) — observers earn a bonus equal to a correct answer at the
  average answer speed.
- **Payouts** (`utils/multiplayerPayout.ts`): a solo room is *practice* — XP
  only, no coins, no recorded win, no streak change. Otherwise 1st place earns
  `min(500 × opponents beaten, 1000) + own score`; 2nd and 3rd earn half their
  score; everyone else gets 100 participation coins.
- **Persistence**: permanent rooms survive between rounds; `room_match_history`
  and `room_games` keep the record; `complete_room_round` accumulates cumulative
  totals server-side; `cleanup-old-rooms` reaps stale rooms.

### 3.5 TV / party mode

The largest single subsystem: `TVGameContext` at 4,277 lines, 17 TV screens and
a separate phone-controller UI. It is also the acquisition mechanism — one
paying household converts a room full of nickname-only guests.

**Setup.** Open `/tv` on the big screen → a 4-digit session code and QR appear.
Players scan or enter it at `/join`, `/join/:code`, `/join/session/:id` and can
join **with just a nickname, no account** (a stable guest id in localStorage).
`/tv/host/:sessionId` is the host's phone controller; `/tv/:code` is the
display; a mirror mode lets a second screen follow read-only.

**Phases.** `pairing → lobby → poll-suggest → poll-voting → poll-results →
category-select → round-intro → countdown → question → reveal → results →
scoreboard → completed / idle`.

- **Category poll**: players suggest categories, their own trivia or collections
  (`tv_poll_suggestions`), everyone votes (`tv_poll_votes`), and the winner
  becomes the round with the suggester credited on screen.
- **15 seconds per question**, server-time synchronized. The host auto-advances
  when everyone has answered; a watchdog re-checks every 5 seconds for stuck
  timers; the server can expire a question (`tv_expire_question`) independently.
- **Reveal** is a 1.4s highlight, extended to 10s when nobody answered so the
  correct answer is readable.
- **Observer bonus** for players who answered wrong or timed out, awarded
  server-side (`award_tv_observer_bonus`, `tv_observer_awards`).
- Scores accumulate across rounds; `tv_round_history`, `tv_score_events` and
  `tv_phase_events` keep an auditable trail; `tv_answer_rejections` logs refused
  answers.

**Robustness.** Session claiming (`tv_claim_session`) so a reload does not orphan
a game; join idempotency via 24-hour local session bindings; divergence
detection that resyncs any client — the host included — whose phase falls behind
the database; reconnect handling; an idle timeout that redirects a stuck screen;
a TV error boundary; a debug overlay with live answered/expected diagnostics; and
a Playwright TV smoke test. **External display support** (AirPlay, Presentation
API, Miracast detection) lets a phone drive a TV directly.

Eight-part deep audit at `docs/tv-audit/`.

### 3.6 Team Battle *(built, dark-launched)*

Two teams, a board of priced categories, rapid-fire turns, one player in the
spotlight at a time. Remote — every player on their own phone, same realtime
room stack as friend rooms.

- Teams are equal size, 1v1 up to 5v5; room min 2, max 10.
- **Opener: rock-paper-scissors.** Every player secretly picks; the majority
  gesture per team is the team's throw; the winner picks first. Theatre, under
  15 seconds.
- **A turn** is ~40 seconds of rapid-fire questions in the chosen category at
  that category's difficulty. Each correct answer earns a slice of the tile's
  price (`price / target_correct`, capped at the full price). Easy categories are
  cheap, hard ones expensive — that is the strategy layer.
- **Everyone plays**: each player takes a turn before any teammate takes a
  second; the server enforces the rotation.
- Phases: `lobby → team_pick → rps → board (pick → rapid_fire → turn_result)…
  → [super_vote → super_round]? → match_result`.
- **Tie → Super Round**: each team votes a champion (self-votes allowed; a tie
  goes to the captain, who is the team's first joiner by default). Champions
  play a 1v1 blitz on the same question simultaneously, first correct scores,
  first to 3 wins.
- A team dropping below half its size for 60 seconds forfeits, on a server timer.
- Server RPCs: `tb_start_match`, `tb_pick_tile`, `tb_submit_answer`,
  `tb_close_turn`, `tb_next_player`, `tb_submit_rps`, `tb_resolve_rps`,
  `tb_vote_super`, `tb_resolve_super_vote`, `tb_submit_super`, `tb_advance_super`,
  `tb_set_captain`, `tb_vote_captain`, `tb_set_team_name`, `tb_set_team_icon`,
  `tb_add_bot`, `tb_remove_bot`, `tb_team_throw`.

### 3.7 MyTrivia King *(built, dark-launched)*

The digital *What? Where? When?*. Very hard questions requiring **no prior
knowledge — only logic**. You against the King, first to 6.

- Each question is an "envelope". Crack it and you score; miss and the King
  scores. Match ends at 6 either way.
- **Hybrid answer flow**: question presented with **no options shown** → a
  **60-second think phase** with only an "I have it" early-commit button → a
  **10-second commit phase** where four options appear → reveal, then an
  **explanation screen** writing out the logic chain. Losing a question should
  still feel enriching; that screen is the soul of the mode.
- No power-ups, no 50/50. The mode's integrity is the point.
- **A separate question pool** (`king_questions`) with an explanation, a
  1–5 difficulty and adversarially written distractors, because mixing logic
  puzzles into `questions` would pollute every other mode's pipeline. Nothing
  ships unreviewed (`is_active` defaults false). Seeded with 24 questions
  against a ~120 launch bar; the seed is the quality reference for the rest.
- There is now also a **team/couch variant** — `king_team_matches` and the
  `king_team_*` RPCs (`start`, `state`, `suggest`, `open_options`, `commit`,
  `resolve`, `draw_into`, `member`) — where a group plays the King together.
- Players can report a bad King question (`utils/kingQuestionReport.ts`).

### 3.8 Words

`/words`, `/words/:code` — a word-wheel crossword, solo or with one friend.
Client-only in a way nothing else here is: levels ship in the bundle
(`levels.<lang>.generated.ts` for all seven languages), a friend game rides a
realtime broadcast channel (`words-board-<roomId>`) reconciled by `mergeShared`,
and there is **no match table and no RPC**. The room row exists only so the
app's invite machinery works unchanged; Words rooms are always private and never
move to `playing`. Includes a letter wheel, a luck wheel, a scrapbook of found
words and a word-info modal.

### 3.9 Global matchmaking

`/play/queue`, `useMatchmaking`, `matchmaking_queue`. A queue per
(game type, language, team-size bucket). `mm_enqueue` inserts and calls
`mm_try_match`, an idempotent advisory-locked matcher that takes oldest-first
within a bucket, widens the rating band with wait time, then **creates the
`game_rooms` row itself**, assigns teams (parties kept together, remainder
balanced) and marks the queue rows matched. Players learn of the match through a
realtime subscription on their own queue row and walk into the lobby with a short
auto-ready countdown.

Rows expire after two minutes; the client then offers "keep waiting / play vs
bot / invite friends". It **never silently fills a global-PvP queue with bots** —
the bot precedent stays in Quick Game where it is advertised. v1 explicitly
excludes skill rating beyond loose banding, cross-language matching, mid-match
backfill and region sharding.

### 3.10 Async challenges

`/challenge/:code`. Any player turns a result into a **challenge link**
(`challenge_links`, `challenge_attempts`): the same questions, their score to
beat. The link opens a public landing page **playable without an account** —
enter a name, play the same 15-second round, see how you compare.
`challenge-og-image` renders the social share card. Incoming challenges appear as
`PendingChallenges` on the home screen with expiry, challenger avatar and score.

### 3.11 Party categories — "Most Likely To"

A multiplayer-only category whose questions are not trivia: every player votes
for a player in the room, and the single most-voted player becomes the correct
answer. Majority voters score a flat **100 points** (deliberately below the
275-point question maximum); a split top vote pays nobody.

The rows are shaped to enforce this — `correct_answer` is the `'__vote__'`
sentinel and `incorrect_answers` is empty, which every generic selection pipeline
rejects. Only the dedicated vote path in `MultiplayerContextV2` serves them,
substituting the room's player names as the answers. So it cannot be played
solo, on TV against the clock, or in mixed pools. Ten prompts per round from a
bank of 36, ballots never longer than four names. Settled by
`settle_most_likely_votes`.

### 3.12 Feed trivia and collections

Playing someone else's quiz from a collection lobby (`/collection/:id`) is its
own light mode: 5 XP and 5 coins per correct answer, +10 XP and +25 coins for a
perfect run, 50 coins for completing a whole collection. Playing someone's trivia
notifies the creator.

## 4. Scoring and progression

**One answer-scoring formula everywhere** (`src/utils/scoring.ts`), used by
multiplayer, Quick Game, TV and challenges:

```
points = 100 + round(secondsRemaining) × 10     (15-second clock → max 250)
wrong or timed out                              = 0
first correct answer on a question              = +25 flat bonus
```

Whole seconds only, so every score is a clean multiple of 10 over the base. The
category campaign is the deliberate exception: no per-question clock, paid at
level end.

**XP and account level** (`utils/levelCalculation.ts`): a power curve,
`threshold(level) = 100 × (level−1)^1.8`, up to level 999, with the first 50
thresholds precomputed. A level-up modal fires every 20 correct answers and
grants 150 coins plus a random power-up.

**Win streaks**: 3 days = +15% XP, 5 = +30%, 7 = +50%, with milestones defined to
30 days. Reset by a non-practice loss, untouched by practice games. `/streak` is
the dedicated page the home screen's flame lands on;
`claim_streak_milestone` pays each milestone once, deduped on the ledger
server-side because a client-side flag let earlier streak rewards be banked twice.

**Progress surfaces**: total stars, per-category ranks, progress rings, level
positions on the adventure map (`level_positions`, editable in the admin map
editor), and an optional **3D interactive world map** (`src/features/world-map`)
— a procedurally assembled, seed-deterministic 2.5D island world in React Three
Fiber with a fixed-axis cinematic camera, quality tiers, reduced-motion support
and a painted-map fallback when WebGL is unavailable.

## 5. Power-ups

Four, consistent across every mode (except King, which has none by design):

| Power-up | Effect | Coin price |
|---|---|---|
| 50/50 (`5050`) | Removes two wrong answers | 150 |
| Freeze (`freeze`) | Freezes the timer | 100 |
| Replace (`replace`) | Swaps the current question | 75 |
| Time Drain (`time-drain`) | Adds time | 100 |

New accounts start with 2× 50/50 and one each of the rest. Quantities live in
`user_power_ups` and change through the atomic `adjust_power_up` SECURITY
DEFINER RPC, with a guarded compare-and-set fallback if that migration has not
landed — concurrent writers cannot clobber each other. Sources: shop purchase,
bundles, mission rewards, level-up drops, lucky-spin segments, and the PRO daily
grant of one of each.

## 6. Reward loops

**Daily rewards** — a 7-day cycle resetting at *local* midnight, the countdown a
pure function of "now":

| Day | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|
| Coins | 200 | 300 | 400 | 500 | 750 | 1,000 | 1,500 |
| Gems | — | — | — | — | — | — | 1 |

≈6,750 coins a week. `pro_plus` gets a 1.5× multiplier.

**Treasure chest** — once per 24 hours, 50–250 random coins, plus 1 gem at
weekends. An unclaimed chest is always immediately claimable, so a new player
never sees a phantom countdown.

**Lucky spin** — 100/150/200/250/300/500 coins, a rare 1 gem, or a random
power-up. One free spin a day, **four for PRO**, +2 per rewarded ad. Spin
counting is race-guarded so two parallel spins cannot write the same count.

**Missions** (`useMissions`, 1,429 lines) — a rotating pool with **beginner and
advanced tiers**; players with ≥30 finished games get harder targets and bigger
rewards.

- Daily pool, 5 active per day: play N games, answer N correctly, win N games,
  play N different categories, win at 100% accuracy, play a room game with
  friends, play on TV.
- Weekly pool, 4 active per week: weekly wins, weekly correct answers, invite new
  friends, multi-category, perfect wins, friend games, weekly marathon.
- Rewards combine XP + coins + gems + power-ups and are **granted instantly on
  completion** — no claim step — announced by toast and written to the
  notifications feed.
- Gameplay reports events (`game_played`, `correct_answers`, `game_won`,
  `categories_played`, `perfect_win`, `friend_game`, `tv_played`,
  `friend_invited`) and each event advances every listening daily *and* weekly
  mission.
- Reward columns on unfinished rows are re-synced to the current pool, so a card
  can never advertise a payout the grant no longer matches.
- Realtime updates arrive over a **ref-counted shared channel** — one
  subscription per user however many components mount the hook.

**Mission streak** (`user_mission_streaks`) — consecutive days of completed
missions: 1 day 25c · 3 days 50c + 1 gem · 5 days 75c + 2 · 7 days 100c + 3 ·
14 days 150c + 5 · 21 days 200c + 8 · 30 days 300 coins + 15 gems + 250 XP.

**Other**: a floating gift button, watch-ad-for-spins, chest and streak modals,
and a **Did You Know?** widget — trivia facts (`trivia_facts`) with a
"knew it / didn't know it" vote that shows how you compare (`user_fact_votes`).

## 7. Leaderboards and leagues

- **Three weekly leagues**: Bronze → Silver → Gold (`user_league_data`,
  `get_league_leaderboard`), ranked on weekly XP, reset on a Monday-start week,
  with promotion and demotion and a live countdown.
- Rank movement indicators (up/down/same/new) and a podium; filler entries are
  flagged so the board never looks empty.
- **Regional and global** scoping, plus **per-category leaderboards**
  (`category_leaderboard`, `category_weekly_rewards`,
  `weekly_leaderboard_snapshots`).
- **Weekly prizes** for the top 10 of each category:

| Rank | Coins | Gems | Extra |
|---|---|---|---|
| 1 | 2,000 | 25 | `champion_gold` frame + Weekly Champion badge |
| 2 | 1,500 | 15 | `champion_silver` frame + Silver badge |
| 3 | 1,000 | 10 | `champion_bronze` frame + Bronze badge |
| 4–10 | 750 → 150 | 5 → 1 | — |

Frames and badges are stored per user (`user_leaderboard_frames`,
`user_leaderboard_badges`) and claimed through a rewards modal;
`claim_leaderboard_reward` allows exactly one claim, by the owner only.

## 8. Social

- **Friends** (`friendships`): send, accept, decline, block (`user_blocks`), a
  friends "stories" bar of recent activity, add by search or code. A friend
  request can be answered from anywhere in the app — `GlobalFriendRequestGate`
  is mounted outside the router.
- **Presence** (`user_presence`, realtime): online status, current room, active-
  and online-user surfaces, live badges, heartbeats.
- **Game invitations** (`game_invitations`) and **join requests**
  (`room_join_requests`), both answerable app-wide through
  `GlobalGameInviteGate` and `GlobalJoinRequestGate` — so a host reading Discover
  still answers the door, and a yes walks them into the room.
- **Chat**: direct (`chat_messages`) and per-room (`room_chat_messages`), with
  `get_unread_counts_by_room`.
- **PRO seats** — see `04-ECONOMY-AND-MONETIZATION.md` §4.
- **Sharing**: invite and referral modals, share sheets, QR codes and OG images
  for rooms, TV sessions and challenge links — always built on the canonical
  production URL (`src/config/site.ts`) so a link never points at localhost or a
  preview deploy.
- **Reporting** (`user_reports`) with an admin queue, plus text filtering
  (`utils/contentFilter.ts`) and blocking. This is what keeps the App Store
  user-generated-content answers from forcing a 17+ rating.
- **Seeded content accounts**: a curated list of profiles exists to populate the
  feed. They never sign in, so a friend request to one is **auto-accepted from
  the requester's own client** after a stable, id-derived delay of 4–48 hours, so
  they read as real people who were away. Any account not on that list is never
  auto-accepted. `src/config/fakeAccounts.ts`, `FakeFriendRequestAutoAccept`.

## 9. User-generated content and Discover

> **Launch scope note.** `src/config/features.ts` sets
> `PUBLIC_SHARING_ENABLED = false`. For this launch everything a player creates
> is **private** — playable alone or with invited friends — and the whole public
> surface (the Explore tab, Publish buttons, Public/Private pickers, visibility
> filter chips) is *hidden, not deleted*. Flip the flag to bring it back. Much of
> what follows is therefore built and dormant.

**Creating trivia.** `CreateQuizModal` walks a player through authoring, in two
creator modes: **open ("edit")**, where the author sees and edits every question,
and **locked / blind**, where the author never sees the answers so they can play
their own trivia fairly. Blind trivia is private by default and drives the
multiplayer observer/host-play policy.

Content can come from: **AI generation from a topic** (`generate-custom-quiz`,
with AI-suggested topics and titles), **importing a URL** (`parse-quiz-url`,
`fetch-url-metadata`), **pasting text** (`parse-text-content`), **Wikipedia
media** (`parse-wikipedia-media`), or hand-writing in a game-style editor with
live character-limit warnings and a per-question icon picker (which refuses an
icon that points at one of the answers). Covers are picked, uploaded or
AI-generated (`generate-cover-image`, `validate-cover-image`).

**My Trivia Party** opens on a worked example rather than a blank card: ten
family-shaped questions drawn at random from a larger pool
(`src/config/partyStarterPack.ts`), every one editable.

**Collections** (`quiz_collections`) group quizzes into multi-round shows, each
quiz a numbered round, played end to end in `CollectionLobby` with a completion
bonus. **Drafts** (`trivia_drafts`, `collection_drafts`) auto-save work in
progress.

**Discover** (`/discover`): category carousels and grids, favorites, per-category
rank, new-level badges. The explore/portfolio feed shows creator portfolios,
trivia cards with cover art, live badges and filters, with like / save / play /
comment on posts (`quiz_post_*` tables), each raising a notification to the
creator. **Spotlight search** is a ⌘K-style palette over categories, players,
trivia, rooms and navigation actions.

## 10. Avatars, mascots and personalization

**The split matters.** The home screen paints a **mascot scene**; the circle
avatar is a separate choice shown everywhere else.

- **Mascots** (`src/config/mascots.ts`): owl, panda, tiger, monkey, elephant,
  giraffe, bull, penguin — eight animals, each with a 9:16 full-bleed home scene
  and a square face thumb. A player who has not picked sees the Trivia King idle
  loop, which the King is not one of the choices for. Adding one means an id
  here, two assets, a name in every locale, and a migration recreating the
  `profiles.home_mascot` CHECK — the database refuses ids it does not know.
  A mascot's face can also be used as the avatar.
- **AI avatar studio**: upload or shoot a selfie (Capacitor Camera, HEIC
  conversion, face detection via `detect-face`) and generate a stylized
  character. `generate-avatar` produces a 16:9 **scene**; the square
  **portrait** is derived *from that scene*, so the face in the circle is the
  same character in the same art style. Non-square results are rejected outright.
- **Animated avatars**: `animate-avatar` turns the scene into a seamless idle
  loop the homepage plays instead of the still, cached locally for instant paint.
  Batch tools animate or regenerate many at once; `ScenePortraitHealer` and
  `StaleAnimationCleanup` sweep up.
- **Quotas**: scenes and portraits count against **separate** caps — 5 per type
  for PRO, 2 free — because a shared cap used to block new avatars silently.
- **Avatar frames** (`user_avatar_frames`): Galaxy (15💎), Ice (15💎), Fire
  (25💎), Neon (25💎), Rainbow (40💎), Golden (50💎), plus VIP-only Crown,
  Diamond and Royal, in common → rare → epic → legendary rarities with animated
  variants. Champion frames are earned, never bought.
- Also: nickname change, country selector, room gradients and icons, AI room
  names and covers, sound/music/vibration preferences, and a persistent animated
  background scene.

## 11. Notifications

**In-app** — `notifications` + `NotificationsContext` (realtime), 21 types:
`new_message`, `friend_request`, `friend_accepted`, `challenge`, `game_started`,
`room_invite`, `game_result`, `reward`, `daily_reward`, `streak`, `level_up`,
`achievement`, `trivia_liked`, `trivia_saved`, `trivia_played`, `billing`,
`subscription`, `system`, `welcome`, `ai_generation`, `room_ping`. Each has an
icon, colour and localized label (`config/notificationConfig.ts`) and groups into
social / games / rewards / messages / billing. Surfaces: a `/notifications` page,
a header bell with unread counts, compact cards, a detail modal, and a dedicated
card for AI-generation jobs. **Titles and bodies are translated at render time**,
so a message stored in one language still reads correctly after a language switch.

**Push** — Firebase Cloud Messaging through `send-push-notification` (the
service-account JWT is minted in Deno), with `send-game-invite-push`,
`send-social-push` and `scheduled-pushes` alongside. Tokens in `push_tokens`,
delivery logged in `push_log`. Admin broadcasts from `/admin/push`. Per-user
opt-out on the profile. Communication notifications carry the sender's avatar.

**Modal notifications** — `NotificationModalContext` handles celebratory and
alert modals (rewards, achievements, level-ups, purchase success), separate from
toasts. Toasts go through `src/lib/toast.ts` and render in a single Sonner
`<Toaster>` mounted at the app root; `toastsGoThroughHelper.test.ts` keeps every
call site on the helper.

## 12. Internationalization

**Seven languages**: Georgian (`ka`, default), English, Spanish, French, German,
Italian, Portuguese. `LanguageContext` persists the choice and exposes `t()`;
a standalone `t()` in `src/lib/i18n.ts` serves non-React call sites (contexts,
services, toasts).

Each catalog is ~4,500 lines of key/value across ~48 namespaces, with English
fallback and a locale-parity test. **Content is localized, not just chrome**:
questions carry a `language`, categories have `category_translations`, and
`translate-questions` / `generate-multilang-trivia` produce localized sets.
`verify-georgian-grammar` and `fix-mixed-language-questions` guard Georgian
specifically. `utils/countryLanguage.ts` maps country → question language
(defaulting to English for unlisted countries), and `LanguageFollowsCountry`
makes the account's country decide the language. Room names, notification text
and error messages are all multilingual, and transliteration helpers bridge
Georgian ↔ Latin for search and icon matching.

Prices are **never converted at runtime** — see
`04-ECONOMY-AND-MONETIZATION.md`.

## 13. Settings, privacy and compliance

- `/settings` (account, language, sound/music/vibration, country, email,
  notifications) with focused sub-pages `/settings/name`, `/settings/password`,
  `/settings/privacy`.
- **Data export** (`export-user-data`) and **account deletion**
  (`delete-user-account`, plus a public `/delete-account` page for guideline
  5.1.1(v)).
- Profile visibility toggle (`is_public`).
- Legal pages in all seven languages at `/privacy-policy`, `/terms` and the
  language-pinned `/privacy-policy/:lang`, `/terms/:lang` — App Store Connect
  takes a privacy policy URL *per localization*, and a preference-following route
  cannot promise the right language to someone who has never opened the app.
  `/support` carries FAQ and contact.
- Age gate → child-directed ad treatment; ATT consent on iOS.
- Reporting, blocking and text filtering for UGC and players.

## 14. The admin and content-operations suite

`/admin` is role-gated (`user_roles` + `has_role` + `AdminRoute`) and **excluded
from the production bundle entirely** when `VITE_INCLUDE_ADMIN=false` — tree
shaken out, not route-guarded, because a guarded route still ships the chunk.

| Route | What it does |
|---|---|
| `/admin` | Dashboard — live stats, activity, quick actions |
| `/admin/question-studio` | Question CRUD: filters, bulk actions, MC/true-false/media type selector, preview, URL import, bulk generator |
| `/admin/flow` | "Question Factory" — knowledge sources, generation panel, queue, per-language browser, icon picker |
| `/admin/content` | Categories and levels |
| `/admin/import` | AI generator, bulk import, category import, CSV, JSON, free text, parser |
| `/admin/users` · `/admin/user-analytics` | Presence and last-active; user table, detail modal, stats, country breakdown, activity timeline |
| `/admin/duplicates` | Semantic duplicate scanner (`find-similar-questions`) |
| `/admin/icons` · `/admin/icon-assign` · `/admin/icon-review` · `/admin/missing-icons` · `/admin/fix-icons` | The icon pipeline: library, AI assignment with history, human review queue, missing scanner, repair |
| `/admin/tools` | Shorteners, translators, grammar and mixed-language fixers |
| `/admin/ai-generations` | Generation job history and per-job review |
| `/admin/review` | Quality review queue (`scan-`/`review-`/`resolve-question-quality`) |
| `/admin/push` | Compose and send push broadcasts |
| `/admin/reports` | User report moderation |
| `/admin/social` | Social frames |
| `/admin/design` | Design-system console, and the adventure-map level position editor |
| `/admin/economy` | Economy config, health, revenue analytics, IAP products, shop products |
| `/admin/settings` | App settings, AI settings, AI-prompt sync |
| `/admin/guest` · `/admin/tvmodegame` | Guest-experience preview; TV mode documentation |

**The AI content factory** behind these pages: research facts → generate
questions (single, per-category, per-country, contextual, multilingual, media,
national) → shorten to fit the UI → AI quality-review and score → detect semantic
duplicates → assign, verify and repair illustrations → translate → publish to
production. Generation runs as jobs (`generation_jobs`,
`generation_job_questions`, `run-generation-job`) with progress notifications.
`seed-sample-content` populates a fresh environment.

Operationally this is the point: the marginal cost of a new category, language or
country pack is AI inference plus review time, not writer headcount.

## 15. Resilience and instrumentation

- **PostHog** with synchronous identity bootstrap — the very first event already
  carries the right user id — plus autocapture, pageleave, manual pageviews,
  person profiles, and global exception capture for unhandled rejections and
  async throws. `console.error` is deliberately *not* promoted to an exception,
  because it is used as ordinary logging. Meta Pixel handles page views.
- Purchase analytics, session tracking (`user_sessions`), active/online user
  panels, per-question analytics counters, a `currency_grants` ledger for every
  credit and an `iap_events` ledger for every purchase event. **This product can
  be measured from day one rather than retrofitted.**
- A root React error boundary and a TV-specific one; an offline banner and
  network-status awareness; idle timeouts; optimistic updates with server
  reconciliation; compare-and-set writes for anything counted; and **fail-open**
  behaviour for ads and play bookkeeping, so infrastructure problems never block
  gameplay.
- A **fresh-build guard** polls `version.json` every 45 seconds and on tab focus
  and reloads a stale tab — never during a live game.
