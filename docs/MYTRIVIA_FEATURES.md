# MyTrivia — Complete Feature Reference

A self-contained explanation of everything the MyTrivia app does: every player-facing
feature, every economy rule, every game mode, the admin/content tooling behind it, and
the platform pieces that make it all work.

> **Scope note.** This document describes the app in `src/`, `supabase/` and the
> Capacitor shell — the product shipped as **MyTrivia** (`io.mytrivia.app`,
> https://mytrivia.io). Numbers quoted (prices, timers, rewards) are the values
> currently in the source config; the admin Economy console can override several of
> them at runtime.

---

## Table of contents

1. [What MyTrivia is](#1-what-mytrivia-is)
2. [Platform and architecture](#2-platform-and-architecture)
3. [Accounts, identity and onboarding](#3-accounts-identity-and-onboarding)
4. [Content system: categories, questions, icons](#4-content-system-categories-questions-icons)
5. [Game modes](#5-game-modes)
6. [Scoring, progression and levels](#6-scoring-progression-and-levels)
7. [Power-ups](#7-power-ups)
8. [Economy: coins, gems, stakes and play limits](#8-economy-coins-gems-stakes-and-play-limits)
9. [Reward loops: daily, chest, spin, missions, streaks](#9-reward-loops-daily-chest-spin-missions-streaks)
10. [Leaderboards and leagues](#10-leaderboards-and-leagues)
11. [Social layer](#11-social-layer)
12. [User-generated content and Discover](#12-user-generated-content-and-discover)
13. [TV / party mode](#13-tv--party-mode)
14. [Monetization: PRO, shop, IAP, ads](#14-monetization-pro-shop-iap-ads)
15. [Avatars, scenes and personalization](#15-avatars-scenes-and-personalization)
16. [Notifications](#16-notifications)
17. [Native mobile capabilities](#17-native-mobile-capabilities)
18. [Internationalization](#18-internationalization)
19. [Settings, privacy and compliance](#19-settings-privacy-and-compliance)
20. [Admin and content-operations suite](#20-admin-and-content-operations-suite)
21. [Backend: database, RPCs, edge functions](#21-backend-database-rpcs-edge-functions)
22. [Analytics, telemetry and resilience](#22-analytics-telemetry-and-resilience)
23. [Internal / developer surfaces](#23-internal--developer-surfaces)
24. [Complete route map](#24-complete-route-map)
25. [Feature index (quick list)](#25-feature-index-quick-list)

---

## 1. What MyTrivia is

MyTrivia is a **multi-mode trivia game** that works as a web app, an installable iOS/Android
app, and a **TV party game** where a big screen shows the questions and everyone's phone
becomes a buzzer. On top of the quiz itself sits a full live-service game:

- a **single-player campaign** of categories and star-rated levels,
- **head-to-head and room-based multiplayer**,
- **player-authored trivia** that other players can discover and play,
- a two-currency **economy** with power-ups, a shop and a PRO subscription,
- daily/weekly **engagement loops** (rewards, chests, spins, missions, streaks),
- **weekly leagues** with promotion, demotion and prizes,
- a **friends/social graph** with challenges, invites and notifications,
- and an **AI content factory** in the admin panel that authors, translates, illustrates
  and quality-checks the question bank.

The app ships in **7 languages** and defaults to Georgian (`ka`), with a large Georgian-first
content library and global/localized categories layered on top.

---

## 2. Platform and architecture

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite (SWC) |
| UI | Tailwind CSS, shadcn/ui + Radix primitives, custom "chunky" game components |
| Motion / FX | Framer Motion, GSAP, Lottie, canvas-confetti, video/WebM overlays |
| 3D | three.js + React Three Fiber + drei (interactive world map, background scenes) |
| State | React Context providers + TanStack Query (server cache) + Zustand (world map) |
| Backend | Supabase — PostgreSQL, Auth, Realtime, Storage, Edge Functions (Deno) |
| Mobile shell | Capacitor 8 (iOS 14+ / Android), portrait-locked |
| Payments | Stripe (web checkout) + RevenueCat (native IAP) |
| Ads | AdMob via `@capacitor-community/admob` (native only) |
| Push | Firebase Cloud Messaging via an edge function |
| Analytics | PostHog (autocapture, identity bootstrap, exception capture) + Meta Pixel |
| AI | Server-side AI gateway + fal.ai image models, called only from edge functions |
| Tests | Vitest (unit) + Playwright (e2e smoke, incl. TV flow) |
| Hosting | Static build, Cloudflare (`wrangler.toml`), Lovable-managed project |

**Provider hierarchy** (outermost → innermost, from `src/App.tsx`):
`LanguageProvider → AuthProvider → PostHogProvider → VipProvider → SoundProvider →
FriendsProvider → PlayGuardProvider → PendingChallengesProvider → NotificationsProvider →
OnboardingProvider → NotificationModalProvider → BackgroundGenerationProvider →
PlayerProfileProvider → AvatarModalProvider → SplashScreen → TooltipProvider → Routes`.

Globally mounted background services: offline banner, persistent particle/spline background,
user-presence tracker, admin AI-prompt sync, stale-animation cleanup, fake-friend-request
auto-accept, and a **fresh-build guard** that reloads long-open tabs when a new build deploys
(only at safe moments, never mid-game).

Performance features: route-level code splitting (`React.lazy` for nearly every page), an
admin bundle that is **tree-shaken out at build time** (`VITE_INCLUDE_ADMIN=false`), dev/doc
pages excluded from production builds (`VITE_INCLUDE_DEV_PAGES`), video preloading, image
preloading for question icons, prefetch hooks for navigation/shop/leaderboard/explore, and
skeleton screens for every lazy route.

---

## 3. Accounts, identity and onboarding

### Sign-in methods
- **Email + password** (Zod-validated forms).
- **Username + password** — usernames are mapped to a synthetic email internally, so players
  can sign up without ever giving an email address.
- **Google OAuth**.
- **Sign in with Apple** — native flow via `@capacitor-community/apple-sign-in` on iOS
  (required by App Store guideline 4.8), OAuth redirect elsewhere.
- **Returning-user picker** — the last account used is remembered locally (`mytrivia_last_user`)
  and offered as a one-tap re-login card.

### Password recovery without email
`/forgot-password` runs a **security-question** flow (5 preset questions) through the
`reset-password-with-security` edge function: look up username → answer the stored question →
set a new password. Attempts are rate-limited (3 tries, tracked in `password_reset_attempts`),
and answers are hashed. `/settings/password` handles in-session password changes.

### Guest mode
Unauthenticated visitors can play immediately:
- **5 free guest plays** tracked in `localStorage` (`mytrivia_guest_plays`).
- Guest **level progress and stars** are stored locally (`useGuestProgress`) and **migrated
  into the account on signup**, along with a retroactive game log (`useGuestPlays` →
  `game_plays` rows), so nothing is lost.
- Guest-specific UI: progress banner, max-plays modal, register-prompt modal, a desktop guest
  landing page, and a guest join path for TV sessions (nickname only, no account).
- Guests get their own favorites store in `localStorage`.

### Onboarding
A staged flow (`OnboardingContext`): `age_gate → username → password → creating → complete`.
- **Age gate** classifies the player as `child` / `teen` / `adult` and stores it on the profile.
  This drives **child-directed ad treatment** and under-age-of-consent handling for AdMob.
- **Welcome overlay** and a **signup onboarding modal** introduce the app.
- A **feature onboarding carousel** explains the Team/multiplayer surface on first visit.
- Onboarding completion is persisted locally and on the profile.

### Referrals
Signup accepts `?ref=CODE`. `friend_invites` rows track inviter → invitee, an 8-character
referral code, tier granted, acceptance and expiry. The `process_referral_reward` RPC pays out.
A **PRO invite-friends** modal and a **friend-invites tracker** in the profile show progress;
invitees can land in a "referral welcome" state that grants PRO immediately.

### Profile
`profiles` carries nickname, email, avatar (still + animated), equipped frame, coins, gems,
XP/`total_points`, level, games played/won, current and best streak, country, age group,
privacy flag, sound/music/vibration preferences, push preference, daily-play counters and the
free-play window columns. `/profile` shows stats, avatar reel, PRO plans; `/profile/:userId`
is the public profile; a **global player-profile modal** can be opened from anywhere
(leaderboards, lobbies, feeds) via `PlayerProfileContext`.

---

## 4. Content system: categories, questions, icons

### Categories
- **54 built-in categories** in `src/data/categories.ts` typed as `classic`, `fun` or
  `educational` (Georgian history, world history, geography, science, sports, literature, art,
  philosophy, archaeology, languages, politics, economics, architecture, movies, music,
  animals, fashion, celebrities, math, technology, space, nature, psychology, medicine,
  physics, chemistry, biology, astronomy, geology, ecology, programming, …), each with an icon,
  gradient, description and level count (typically 20 levels).
- Database-backed categories (`categories` + `category_translations`) add country-specific and
  language-specific sets, sort order, cover images, icon slugs and activation flags.
- **Country trivia**: `generate-country-trivia` and `user_country_progress` support
  per-country category packs; a country selector lives in settings/profile.
- **Favorites** (`user_favorites`) let players pin categories; **new-content indicators**
  (`useNewLevels`, `user_category_last_seen`) badge categories that gained levels since the
  last visit, and `notify-new-levels` pushes an announcement.

### The question bank
`questions` rows hold question text, correct answer, three incorrect answers (JSONB),
category, difficulty, language, level number, icon slug/URL, media URLs (image/video/audio),
`is_active`, `is_production`, and analytics counters (`times_shown`, `times_correct`).

**`questionService.ts` is the single question pipeline for every mode** ("golden standard").
It guarantees:
1. language filtering (matches the app language),
2. active + production-approved rows only,
3. **length validation** — questions and answers that would overflow a phone screen are
   rejected, not truncated,
4. **seen-question tracking** via `questionTracker.ts` (localStorage) so a player never repeats
   a question until the pool is exhausted,
5. **exhaustion detection** with a graceful fallback, surfaced in-game by an
   `ExhaustionIndicator`.

Question types supported: standard 4-answer multiple choice, **true/false**, and **media
questions** (image, audio, video) generated by `generate-media-questions` /
`parse-wikipedia-media`.

### Icon library
Every question can carry an illustration from a central `icon_library` (slug, URL, category,
tags, AI keywords, usage count). The app resolves icons through `useCategoryIconResolver`,
`useAIIcon`/`useAIIconSlug` (hashed in-memory cache) and `DynamicIcon`, with preloading before
a round starts. A large admin toolchain (see §20) assigns, verifies, repairs and propagates
icons at scale.

### Quality constants
`src/constants/questionQuality.ts` and `utils/questionValidation.ts` enforce max lengths for
questions/answers, detect the **answer leaking into the question text**, and feed both the
client editors and the server-side generators (which share the same limits).

---

## 5. Game modes

MyTrivia has **six distinct ways to play**.

### 5.1 Category campaign (solo, `/category/:id` → `/play/:categoryId/:levelId`)
- Pick a category → pick a level on a progress grid → answer a level's questions against a
  per-question timer.
- Scored with **1–3 stars**: ≥80% correct = 3★, ≥60% = 2★, ≥40% = 1★.
- Earning ≥1 star unlocks the next level; progress is stored in `user_level_progress`
  (guests: localStorage) and aggregated by `useCategoryProgress` / `useTotalStars`.
- Level completion pays `score × 10 + stars × 20` coins, plus mission progress.
- **Free-tier gating**: non-PRO players can play **3 levels per category across at most 5
  categories** (`useCategoryPlayLimit`); beyond that a PRO-required modal appears.
- Power-ups are usable in-level; a **level-unlock animation**, completed/locked level modals
  and an adventure-map help modal support the flow.
- Supporting UI: `QuizQuestionCard`, `QuizAnswerButton`, `QuizTrueFalseButton`,
  `QuizProgressDots`, `QuizPowerUpBar`, `TimerBadge`, power-up effect overlays.

### 5.2 VS mode (`/game`)
- Matchmaking animation against a **simulated opponent** drawn from real player profiles
  (`src/data/opponents.ts`, `GameContext`), 10 questions per match.
- Entry costs a **coin stake** (`useGameStake`); PRO skips the stake entirely.
- Outcome resolution is deliberate (`utils/matchOutcome.ts`): a win requires leading on score
  **and** at least one correct answer — leading with zero correct answers is demoted to a draw
  so wins and streaks can't be farmed.
- Results screen (`MatchResultScreen`) pays coins, XP, level-up rewards and mission progress;
  loss and help modals included.

### 5.3 Multiplayer rooms (`/team`, `/trivia/:triviaId`, `/room/:code`)
Managed by `MultiplayerContextV2` (~2.9k lines) over Supabase Realtime.
- **Create a room**: name (or an auto-generated themed name from 120+ options across 15 themes
  in 7 languages), icon, gradient/cover art, category or random, question count, max players
  (default 8, min 2), permanent vs one-shot.
- **Join**: 6-character room code, deep link, QR code scan (`QRScannerModal` /
  `html5-qrcode`), friend invite, or the "recent rooms"/"my rooms" lists.
- **Lobby**: live participant list with presence, ready states, room chat
  (`room_chat_messages`), a **category queue** (`room_category_queue`) so rounds can be lined
  up in advance, host controls, and a **room ping** notification to nudge invitees.
- **Gameplay**: pre-generated `room_questions` per round, server-synchronized timers,
  live per-question scoreboard, first-correct-answer claims, and an **observer mode** for a
  host who already knows the answers (e.g. the author of a blind trivia) — observers earn an
  **observer bonus** equal to a correct answer at the average answer speed.
- **Payouts** (`utils/multiplayerPayout.ts`): a solo room is *practice* — XP only, no coins, no
  recorded win, no streak change. Otherwise 1st place earns
  `min(500 × opponents beaten, 1000) + own score`; 2nd/3rd earn half their score; everyone else
  gets 100 participation coins. Streak increments only on a non-practice win.
- **Persistence**: permanent rooms survive between rounds; `room_match_history` and
  `room_games` keep the record; `cleanup-old-rooms` reaps stale rooms.
- Server-authoritative hardening: score columns are locked from client writes, answers are
  submitted through `submit_tv_answer`/`increment_participant_score`-style RPCs, rejected
  answers are logged, and question advancement/expiry is enforced server-side.

### 5.4 Async challenges (`/challenge/:code`)
- Any player can generate a **challenge link** (`challenge_links`, `challenge_attempts`) from
  their result: the same questions, their score to beat.
- The link opens a **public landing page playable without an account** — enter a name, play the
  same 15-second-per-question round, see how you compare.
- `challenge-og-image` renders a share card for social previews; `ChallengeShareModal`,
  `ChallengeTypeModal` and `WeeklyChallengeModal` drive creation.
- Incoming challenges appear as `PendingChallenges` with expiry, challenger avatar and score;
  they can be accepted or declined from the home screen.

### 5.5 TV / party mode
Covered in depth in [§13](#13-tv--party-mode).

### 5.6 Feed trivia and collections
Playing another player's quiz from Discover or a collection lobby
(`/collection/:collectionId`) is its own light mode: 5 XP per correct answer, +10 XP for a
perfect run, 5 coins per correct answer, +25 for perfect, and 50 coins for completing a whole
collection. Playing someone's trivia notifies the creator.

---

## 6. Scoring, progression and levels

### One answer-scoring formula everywhere
`src/utils/scoring.ts` is the single policy used by multiplayer, VS, TV and challenges:

```
points = 100 + round(secondsRemaining) × 10      (15-second clock → max 250)
wrong or timed-out answer = 0
first correct answer on a question = +25 flat bonus
```

Whole seconds only, so every score is a clean multiple of 10 over the base. The category
campaign is the deliberate exception — it has no per-question clock and pays out at level end.

### XP and account level
`utils/levelCalculation.ts`: a power curve, `threshold(level) = 100 × (level−1)^1.8`, up to
**level 999**. The first 50 thresholds are precomputed. A **level-up modal** fires every 20
correct answers, granting **150 coins + one random power-up**.

### Win streaks
`getStreakBonus`: 3-day streak = +15% XP, 5 = +30%, 7 = +50%, with milestone rewards defined up
to 30 days (2× XP + exclusive badge). Streaks are reset by a non-practice loss and untouched by
practice games.

### Progress surfaces
Total stars, per-category ranks (`useUserCategoryRanks`), category progress rings, level
positions on the adventure map (`level_positions`, editable in the admin map editor), and an
optional **3D interactive world map** (`src/features/world-map`) — a procedurally assembled,
seed-deterministic 2.5D island world in React Three Fiber with a fixed-axis cinematic camera,
quality tiers, reduced-motion support and a painted-map fallback when WebGL is unavailable.

---

## 7. Power-ups

Four power-ups, consistent across every mode:

| Power-up | Effect | Coin price |
|---|---|---|
| **50/50** (`5050`) | Removes two wrong answers | 150 |
| **Freeze** (`freeze`) | Freezes the timer | 100 |
| **Replace** (`replace`) | Swaps the current question for a new one | 75 |
| **Time Drain** (`time-drain`) | Adds time | 100 |

- New accounts start with 2× 50/50 and 1 each of the others.
- Quantities live in `user_power_ups` and are adjusted through an atomic
  `adjust_power_up` SECURITY DEFINER RPC, with a guarded compare-and-set fallback if the
  migration hasn't been applied — concurrent writers can't clobber each other.
- Sources: shop purchase (gems), bundles, mission rewards, level-up drops, lucky-spin segments,
  and the **PRO daily grant** (1 of each per day).
- In-game UI: power-up bar, active-power indicator, screen effects, detail modal and a
  first-use tutorial modal. A "My Powers" modal and shop section show inventory.

---

## 8. Economy: coins, gems, stakes and play limits

### Two currencies
- **Coins** — earned by playing. `1 gem = 500 coins`.
- **Gems** — premium currency, bought with real money or won rarely.
- New players start with **3000 coins + 3 gems** (≈9 games' worth).
- All balance changes go through the atomic `update_user_currency` RPC; wallet columns are
  locked against direct client writes.
- A **currency exchange modal** converts gems → coins at the published rate; flying-currency
  animations and animated counters sell the feedback.

### Game stake
A VS game costs a **500-coin stake**; a win returns 500 on top (net +500 for a win, −500 for a
loss, no change on a draw). PRO members skip the stake entirely.

### Free-play window (non-PRO)
`usePlayLimit` + `utils/playLimit.ts` implement **5 free games per rolling 3-hour window**,
counted server-side by the `consume_free_play()` RPC against
`free_plays_used` / `free_plays_window_start` columns that the client cannot write.

The hook deliberately ships **two rules at once**: if the migration hasn't reached the database
yet it detects the missing columns and falls back to the legacy rule (lifetime free games +
one regenerating play every 3 hours), switching over automatically once the columns appear.
Neither deploy ordering can ever lock a player out.

When plays run out, the player can:
- wait out the countdown (shown live in the play-limit modal),
- **watch a rewarded ad** for +1 play (max 5 ads/day),
- spend **2 gems** for instant plays,
- or subscribe to PRO for unlimited play.

### Config surfaces
`src/config/rewardConfig.ts` is the single source of truth for stakes, regeneration, daily
rewards, chest ranges, spin table, level-up rewards, gem rate, starting balance, power-up
prices, VIP prices and multiplayer payouts. `economy_config` lets admins tune values live
without a deploy, and the admin **Economy** console exposes config, health, revenue analytics,
IAP products and shop products.

---

## 9. Reward loops: daily, chest, spin, missions, streaks

### Daily rewards (7-day cycle)
| Day | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|
| Coins | 200 | 300 | 400 | 500 | 750 | 1000 | 1500 |
| Gems | — | — | — | — | — | — | 1 |

Resets at **local midnight**; the countdown is a pure function of "now" (`utils/rewardTimers.ts`).
PRO+ gets a 1.5× daily-reward multiplier.

### Treasure chest
Claimable once every 24 hours for **50–250 random coins**, plus **1 bonus gem on weekends**.
An unclaimed chest is always immediately claimable (no phantom countdown for new players).

### Lucky spin
A daily wheel: 100/150/200/250/300/500 coins, a rare **1 gem**, or a **random power-up**.
Base 1 spin/day, **PRO gets 4**; watching an ad grants **+2 extra spins**. Spin counting is
race-guarded so two parallel spins can't both write the same count.

### Missions
`useMissions` runs a rotating pool with **beginner and advanced tiers** (players with ≥30
finished games get harder targets and bigger rewards).

- **Daily pool (5 active per day, rotating):** play N games, answer N correctly, win N games,
  play N different categories, win a game at 100% accuracy, play a room game with friends,
  play on TV.
- **Weekly pool (4 active per week, rotating):** weekly wins, weekly correct answers, invite
  new friends, multi-category, perfect wins, friend games, weekly marathon.
- Rewards combine **XP + coins + gems + power-ups**; they are **granted instantly on
  completion** (no claim step), announced by toast and written to the notifications feed.
- Gameplay reports **events** (`game_played`, `correct_answers`, `game_won`,
  `categories_played`, `perfect_win`, `friend_game`, `tv_played`, `friend_invited`) and each
  event advances every listening daily *and* weekly mission.
- Reward columns on unfinished rows are re-synced to the current pool, so a card can never
  advertise a payout the grant no longer matches.
- Realtime updates arrive over a **ref-counted shared channel** (one subscription per user,
  however many components mount the hook).

### Mission streak
`user_mission_streaks` tracks consecutive days of completed missions, paying escalating bonuses:
1 day (25c), 3 (50c + 1 gem), 5 (75c + 2), 7 (100c + 3), 14 (150c + 5), 21 (200c + 8),
30 (300 coins + 15 gems + 250 XP).

### Other loops
Floating gift button, "watch ad for spins" modal, points modal, chest reward modal, streak
modal, and a **Did You Know?** widget — trivia facts (`trivia_facts`) with a
"knew it / didn't know it" vote that shows how you compare (`user_fact_votes`).

---

## 10. Leaderboards and leagues

- **Three weekly leagues**: Bronze → Silver → Gold (`user_league_data`, `get_league_leaderboard`).
- Ranking is on **weekly XP**, reset on a Monday-start week, with promotion/demotion between
  tiers and a live countdown to the week's end.
- Rank movement indicators (up / down / same / new) and a podium display; AI/filler entries are
  flagged so the board never looks empty.
- **Regional and global boards** — leaderboards can be scoped by region/language.
- **Per-category leaderboards** (`category_leaderboard`, `category_weekly_rewards`,
  `weekly_leaderboard_snapshots`).
- **Weekly prizes** for the top 10 of each category:

| Rank | Coins | Gems | Extra |
|---|---|---|---|
| 1 | 2000 | 25 | `champion_gold` frame + Weekly Champion badge |
| 2 | 1500 | 15 | `champion_silver` frame + Silver badge |
| 3 | 1000 | 10 | `champion_bronze` frame + Bronze badge |
| 4–10 | 750 → 150 | 5 → 1 | — |

Exclusive frames and badges are stored per user (`user_leaderboard_frames`,
`user_leaderboard_badges`) and claimed through a rewards modal.

---

## 11. Social layer

- **Friends** (`friendships`): send/accept/decline requests, block (`user_blocks`), a friends
  "stories" bar of recent activity, an all-friends modal, and add-friend by search or code.
- **Presence** (`user_presence`, realtime): online status, current room, "active users" and
  "online users" surfaces, live badges, and a global presence tracker with heartbeats.
- **Seeded content accounts**: a curated list of profiles exists purely to populate the explore
  feed. Because they never sign in, a friend request to one is **auto-accepted from the
  requester's own client** after a stable, id-derived delay of 4–48 hours, so they behave like
  real people who were away. Any account not on that list is treated as a real person and is
  never auto-accepted.
- **Game invitations** (`game_invitations`) with an invitations section on the Team page.
- **Direct and room chat** (`chat_messages`, `room_chat_messages`, `get_unread_counts_by_room`).
- **Player profile modal** available app-wide; public profiles at `/profile/:userId`.
- **Invite/referral modals** (generic and PRO-specific), share sheets and QR codes
  (`qrcode.react`) for rooms, TV sessions and challenge links — all built on the canonical
  production URL so links never point at localhost or a preview deploy.
- **Reporting** (`user_reports`) with an admin Reports queue.

---

## 12. User-generated content and Discover

### Creating trivia
`CreateQuizModal` walks a player through authoring a quiz, with two creator modes:
- **Open ("edit") mode** — the author sees and edits every question.
- **Locked / blind mode** — the author never sees the answers, so they can play their own
  trivia fairly. Blind trivia is private by default and drives the multiplayer
  observer/host-play policy.

Content can be produced by:
- **AI generation from a topic** (`generate-custom-quiz`), with AI-suggested topics and title
  ideas (`generate-topic-suggestions`, `extract-category-topics`),
- **importing a URL** (`parse-quiz-url`, `fetch-url-metadata`),
- **pasting text** (`parse-text-content`),
- **Wikipedia media** (`parse-wikipedia-media`) for image/audio/video rounds,
- or writing questions by hand in a game-style editor with live character-limit warnings and a
  per-question icon picker.

Covers are either picked, uploaded, or **AI-generated** (`generate-cover-image`,
`validate-cover-image`), with gradient fallbacks.

### Collections and drafts
- **Collections** (`quiz_collections`) group quizzes into multi-round shows; each quiz becomes a
  numbered round. `CollectionLobby` plays them end-to-end, with a completion bonus.
- **Drafts** (`trivia_drafts`, `collection_drafts`) auto-save work in progress; a drafts list
  lets creators resume.
- Rounds can be edited, reordered, added to collections, or deleted.

### Discover and the feed
- `/discover` — category carousels and grids, favorites, per-category rank, "new levels"
  badges, and an Airbnb-style browsing layout.
- The **explore/portfolio feed** shows creator portfolios, trivia cards with cover art, live
  badges, filters (newest/popular/type) and preview modals.
- Social actions on posts: **like, save, play, comment** (`quiz_post_likes`, `quiz_post_saves`,
  `quiz_post_plays`, `quiz_post_comments`), each with a matching notification to the creator.
- **My Trivia** tab: everything you've made, with play counts and engagement.
- **Spotlight search** — a ⌘K-style command palette for categories, players, trivia and
  navigation actions.

---

## 13. TV / party mode

The largest single subsystem (`TVGameContext`, ~4.2k lines; 17 TV screens; a full controller UI).

### Setup
1. Open `/tv` on the big screen → a **4-digit session code** and QR code appear
   (`TVPairingScreenV3`).
2. Players scan/enter the code at `/join`, `/join/:code` or `/join/session/:id`.
   **Guests can join with just a nickname** — no account required (a stable guest player id is
   kept in localStorage).
3. `/tv/host/:sessionId` gives the host a phone **controller** with full game control.
4. `/tv/:code` is the display; a **mirror mode** lets a second screen mirror an existing
   session read-only.

### Round flow (phases)
`pairing → lobby → poll-suggest → poll-voting → poll-results → category-select → round-intro →
countdown → question → reveal → results → scoreboard → completed / idle`

- **Category poll**: players suggest categories, their own trivia or collections
  (`tv_poll_suggestions`), everyone votes (`tv_poll_votes`), and the winner becomes the round —
  with the suggester credited on screen.
- **Round queue** (`tv_session_queue`, falling back to `room_category_queue`) lines up
  subsequent rounds.
- **15 seconds per question**, server-time synchronized. The host client auto-advances when
  everyone has answered; a watchdog re-checks every 5 seconds for stuck timers, and the server
  can expire a question (`tv_expire_question`) independently.
- **Reveal** is a quick 1.4s highlight, extended to 10s when nobody answered so the correct
  answer is readable.
- **Observer bonus** for players who answered wrong or timed out, awarded server-side
  (`award_tv_observer_bonus`, `tv_observer_awards`).
- Scores accumulate across rounds; `tv_round_history`, `tv_score_events` and `tv_phase_events`
  keep an auditable trail, and `tv_answer_rejections` logs refused answers.

### Robustness
Session claiming (`tv_claim_session`) so a reload doesn't orphan a game, join idempotency via
24-hour local session bindings, divergence detection that resyncs any client (including the
host) whose phase falls behind the database, reconnect handling for dropped players, an idle
timeout that redirects a stuck screen, a TV error boundary, a debug overlay with live
"answered/expected" diagnostics, and a Playwright TV smoke test.

### Presentation
Branding overlay, idle/attract screen, round-intro, countdown, big-format question screen with
answer-choice avatars, live scoreboard, results and game-over screens, plus **external display
support** (AirPlay / Presentation API / Miracast detection) so a phone can drive a TV directly.

---

## 14. Monetization: PRO, shop, IAP, ads

### PRO (VIP) subscription
Tiers `pro` and `pro_plus` (`vip_subscriptions`), realtime-synced with a localStorage cache so
the badge doesn't flicker on reload.

**Benefits**: 2× XP · 4 daily spins instead of 1 · no game stake · unlimited plays · no ads ·
1 free power-up of each type per day · PRO badge and exclusive frames · unlimited rooms,
trivia, collections and avatar generations. `pro_plus` adds enhanced rewards (1.5× daily).

**Gating** is centralized in `useProGating(feature)` — `rooms`, `trivia`, `collection`,
`avatar`, `animation`, `general` — which queues requests made while the subscription status is
still loading rather than passing them through, and shows a `ProRequiredModal` otherwise.

**Pricing** in gems: day 30 · week 100 (52% off daily) · month 250 (72% off). Real-money PRO
runs through RevenueCat (`io.mytrivia.vip.monthly`, `io.mytrivia.vip.annual`) or Stripe
(`create-pro-checkout`). Admin accounts and specific granted accounts self-heal a
**lifetime PRO** row on login.

### Shop (`/power-ups`)
Sections: **Coins** (500 → 15 000 for 1 → 24 gems, with escalating bonuses), **Gems for real
money** (1.19 / 3.59 / 9.99 / 19.99 for 30 / 100+11 / 300+60 / 700+200 gems, up to +40%
bonus), **PRO**, **Powers** (×3 packs),
**Mega Powers** (2× or 10× of all four, 12–30% off), **Frames**, plus starter/mega bundles.

**Rotating deals**: a **daily deal** rotating at local midnight and an **hourly flash deal**
rotating on the hour, each bundling PRO time + powers + coins at 40–55% off. Which deal is
active derives from the date/hour, so every player sees the same offer simultaneously.

`config/bundleContents.ts` is the single source of truth for what a bundle grants, shared by
both the grant step and the transaction receipt so the two can never drift.
`purchase_transactions`, `gem_purchases`, `shop_products` and `iap_products` record everything;
`verify-receipt` validates native purchases and `stripe-gem-webhook` completes web ones.
Success/cancel pages live at `/shop/success` and `/shop/cancel`.

### Ads (native only; PRO and web are exempt)
- **Rewarded ads** gate extra plays and extra spins. The gate **fails open**: a 12s deadline if
  the ad never appears, 120s once it is visibly playing, one retry on genuine failure, and
  `onProceed` always runs exactly once — a broken ad network can never trap a player behind a
  spinner.
- **Interstitials**: first only after 5 completed games, then every 3 games, never more often
  than once per 3 minutes.
- **App Tracking Transparency** prompt on iOS 14.5+ before personalized ads; child /
  under-age-of-consent treatment derived from the age gate.
- An **ad-free** purchase (`io.mytrivia.adfree`) and an ad-free modal.
- Admin ads-analytics widget for impressions/revenue.

---

## 15. Avatars, scenes and personalization

- **AI avatar studio**: upload or shoot a selfie (Capacitor Camera, HEIC conversion via
  `heic2any`, face detection via `detect-face`) and generate a stylized character.
  `generate-avatar` produces a **16:9 "scene"**; `generatePublicPortrait` derives the square
  mini-portrait **from that scene** so the face in the circle is the same character in the same
  art style. Non-square results are rejected outright.
- **Animated avatars**: `animate-avatar` turns the scene into a seamless idle-loop video, which
  the homepage plays instead of the still (`useUserScene`, cached locally for instant paint).
  Batch tools exist to animate/regenerate many avatars at once.
- **Quotas**: scenes and portraits count against **separate** caps — 5 per type for PRO, 2 for
  free — because a shared cap used to silently block new avatars with no explanation.
- Generation runs in the background (`BackgroundGenerationContext`) with progress, completion
  notifications and a stale-animation cleanup sweep.
- **Avatar frames** (`user_avatar_frames`): Galaxy (15💎), Ice (15💎), Fire (25💎), Neon (25💎),
  Rainbow (40💎), Golden (50💎) plus VIP-only Crown, Diamond and Royal frames, in common → rare
  → epic → legendary rarities, with animated variants. Champion frames are earned, not bought.
- Other personalization: nickname change modal, country selector, room gradients and icons,
  AI-generated room covers and names, sound/music/vibration preferences, and a persistent
  animated background scene.

---

## 16. Notifications

### In-app
`notifications` + `NotificationsContext` (realtime) support **21 types**: `new_message`,
`friend_request`, `friend_accepted`, `challenge`, `game_started`, `room_invite`, `game_result`,
`reward`, `daily_reward`, `streak`, `level_up`, `achievement`, `trivia_liked`, `trivia_saved`,
`trivia_played`, `billing`, `subscription`, `system`, `welcome`, `ai_generation`, `room_ping`.

Each type has an icon, color and localized label (`config/notificationConfig.ts`), and they
group into filter categories: social, games, rewards, messages, billing. Surfaces include a
`/notifications` page, a header panel with unread counts, compact cards, a detail modal, and a
dedicated card for AI-generation jobs. Notification titles/bodies are translated at render time
so a message stored in one language still reads correctly after a language switch.

### Push
Firebase Cloud Messaging via the `send-push-notification` edge function (service-account JWT
minted in Deno). Device tokens live in `push_tokens`, registered through
`@capacitor/push-notifications`. Categories include game invites, daily rewards, friend
requests and game-started events, plus **admin broadcast pushes** from `/admin/push`.
Per-user opt-out lives on the profile.

### Modal notifications
`NotificationModalContext` provides celebratory/alert modals (rewards, achievements, level-ups,
purchase success) separate from toasts (`sonner`).

---

## 17. Native mobile capabilities

- **Capacitor 8** shell for iOS (min 14.0) and Android, **portrait-locked**, with a custom
  Android user agent.
- **Camera + photo library** for avatars, with the required iOS usage descriptions.
- **Haptics** wired into the sound system (vibration is an independent user preference).
- **Push notifications** (FCM).
- **AdMob** with the app id configured in `capacitor.config.ts`.
- **RevenueCat** for native IAP; **Apple Sign In** native plugin.
- **App Tracking Transparency** service for iOS 14.5+.
- **QR scanning** for room/TV codes; **QR generation** for sharing.
- **Offline detection banner** and network-status hook.
- **External display / casting** detection (AirPlay, Presentation API, Miracast).
- Splash screen, loading screen, idle timeouts and a fresh-build guard.

---

## 18. Internationalization

**7 languages**: Georgian (`ka`, default), English, Spanish, French, German, Italian,
Portuguese. `LanguageContext` persists the choice and exposes `t()`; a standalone `t()` exists
for non-React call sites (contexts, services, toasts).

- Roughly **3 450 keys** in the Georgian and English catalogs across ~48 namespaces (common,
  auth, onboarding, game, shop, team, tv, missions, leaderboard, legal, modals, errors, …),
  with the other languages at varying coverage and English fallback.
- **Content**, not just UI, is localized: questions carry a `language`, categories have
  `category_translations`, and `translate-questions` / `generate-multilang-trivia` produce
  localized question sets. `verify-georgian-grammar` and `fix-mixed-language-questions` guard
  Georgian quality specifically.
- **Country → language mapping** (`utils/countryLanguage.ts`) picks the right question language
  for a player's country, defaulting to English for unlisted countries; `useGeoLocation` and
  language detection assist.
- Room name generation, notification text and error messages are all multilingual;
  transliteration helpers bridge Georgian ↔ Latin for search and icon matching.

---

## 19. Settings, privacy and compliance

- `/settings` — account, language, sound/music/vibration, country, email, notifications.
- `/settings/name`, `/settings/password`, `/settings/privacy` — focused sub-pages.
- **Data export** (`export-user-data`) and **account deletion** (`delete-user-account`,
  plus a public `/delete-account` page for store compliance).
- Profile visibility toggle (`is_public`).
- Legal pages in Georgian and English: `/privacy-policy`, `/privacy-policy-en`, `/terms`,
  `/terms-en`, plus `/support` with FAQ and contact.
- Age gate feeding child-directed ad treatment; ATT consent on iOS.
- Reporting and blocking for user-generated content and players.

---

## 20. Admin and content-operations suite

`/admin` is a role-gated console (`user_roles` + `has_role` + `AdminRoute`) that is **excluded
from the production bundle entirely** when `VITE_INCLUDE_ADMIN=false`.

| Route | What it does |
|---|---|
| `/admin` | Dashboard — live stats, activity, quick actions |
| `/admin/question-studio` | Full question CRUD: filters, bulk actions, type selector (MC / true-false / media), preview panel, create modal, URL import tool, bulk generator |
| `/admin/flow` | "Question Factory" — knowledge sources, generation panel, question queue, per-language browser, icon picker, preview list |
| `/admin/content` | Content manager for categories and levels |
| `/admin/import` | Importers: AI generator, bulk import, category import, CSV, JSON, free text, parser tool |
| `/admin/users` | Online users, presence, last-active panel |
| `/admin/user-analytics` | User table, detail modal, stats/insights tabs, country breakdown, activity timeline |
| `/admin/duplicates` | Semantic duplicate scanner (`find-similar-questions`, `useDuplicateDetection`) |
| `/admin/icons` | Icon library admin: upload, search, metadata, usage stats |
| `/admin/icon-assign` | AI-assisted icon assignment with history |
| `/admin/icon-review` | Human review queue for assigned icons |
| `/admin/missing-icons` | Scanner for questions lacking icons |
| `/admin/fix-icons` | Repair broken icon references |
| `/admin/tools` | Question tools — shorteners, translators, grammar/language fixers |
| `/admin/ai-generations` | Generation job history and per-job question review |
| `/admin/review` | Quality review queue (`scan-question-quality`, `review-question-quality`, `resolve-question-quality`) |
| `/admin/push` | Compose and send push broadcasts |
| `/admin/reports` | User reports moderation |
| `/admin/design` | Design-system console — also hosts the **adventure-map level position editor** (drag-and-drop over `level_positions`) as a tab |
| `/admin/economy` | Economy config, economy health, revenue analytics, IAP products, shop products |
| `/admin/settings` | App settings, AI settings, AI-prompt sync |
| `/admin/guest` | Guest-experience preview |
| `/admin/tvmodegame` | TV mode game documentation |
| `/onboarding` | Onboarding welcome preview (admin-gated) |

**The AI content factory** behind these pages: research facts → generate questions
(single, category, country, contextual, multilingual, media) → shorten questions/answers to fit
→ review and score quality → detect duplicates → assign and verify icons → translate → publish
to production. Generation runs as jobs (`generation_jobs`, `generation_job_questions`,
`run-generation-job`) with progress notifications, and `seed-sample-content` can populate a
fresh environment with mascot accounts and content plans.

---

## 21. Backend: database, RPCs, edge functions

### Database
**90 tables** and **230 migrations**, grouped roughly as:

- **Users**: `profiles`, `user_roles`, `user_presence`, `user_sessions`, `user_blocks`,
  `push_tokens`, `password_reset_attempts`
- **Content**: `categories`, `category_translations`, `category_stats`, `questions`,
  `icon_library`, `icon_assignment_history`, `icon_fix_history`, `icon_verification_results`,
  `knowledge_sources`, `trivia_facts`, `level_positions`
- **Progress**: `user_level_progress`, `user_category_progress`, `user_country_progress`,
  `user_category_last_seen`, `user_achievements`, `game_plays`, `game_sessions`
- **Multiplayer**: `game_rooms`, `room_participants`, `room_questions`, `room_games`,
  `room_match_history`, `room_category_queue`, `room_chat_messages`, `player_answers`,
  `game_invitations`
- **TV**: `tv_sessions`, `tv_players`, `tv_session_queue`, `tv_poll_suggestions`,
  `tv_poll_votes`, `tv_round_history`, `tv_score_events`, `tv_phase_events`,
  `tv_observer_awards`, `tv_answer_rejections`
- **Social/UGC**: `friendships`, `friend_invites`, `chat_messages`, `notifications`,
  `user_quiz_posts`, `quiz_collections`, `quiz_post_likes`, `quiz_post_saves`,
  `quiz_post_plays`, `quiz_post_comments`, `trivia_drafts`, `collection_drafts`,
  `user_favorites`, `user_reports`, `user_fact_votes`
- **Economy**: `economy_config`, `shop_products`, `iap_products`, `gem_purchases`,
  `purchase_transactions`, `vip_subscriptions`, `user_power_ups`, `user_avatar_frames`,
  `user_rewards`, `user_daily_rewards`, `user_daily_spins`, `user_daily_plays`,
  `user_daily_vip_rewards`
- **Competition**: `user_league_data`, `category_leaderboard`, `category_weekly_rewards`,
  `weekly_leaderboard_snapshots`, `leaderboard_badges`, `leaderboard_exclusive_frames`,
  `user_leaderboard_badges`, `user_leaderboard_frames`, `user_missions`,
  `user_mission_streaks`
- **Challenges**: `challenge_links`, `challenge_attempts`
- **AI ops**: `ai_generation_settings`, `generation_jobs`, `generation_job_questions`,
  `avatar_generations`, `cover_image_generations`, `app_settings`

**Security posture** visible in the migration history: RLS on every user-owned table, score and
wallet columns locked against client writes, anonymous session writes blocked, security-answer
hashes hidden from the client, server-side question advancement/expiry, server-side observer
bonus, first-correct-answer claims, and a dedicated "launch hardening" pass.

### Typed RPCs
`adjust_power_up`, `update_user_currency`, `consume_free_play`, `submit_tv_answer`,
`tv_claim_session`, `tv_expire_question`, `award_tv_observer_bonus`,
`is_tv_session_participant`, `increment_participant_score`, `reset_room_participants`,
`get_league_leaderboard`, `get_category_question_counts`, `get_questions_sorted_by_length`,
`get_unread_counts_by_room`, `search_questions`, `process_referral_reward`, `has_role`.

### Edge functions (69)
- **Question generation** — `generate-single-question`, `generate-category-trivia`,
  `generate-country-trivia`, `generate-custom-quiz`, `generate-multilang-trivia`,
  `generate-media-questions`, `bulk-generate-contextual-questions`, `run-generation-job`,
  `research-category-facts`, `generate-topic-suggestions`, `extract-category-topics`,
  `bulk-resolve-topics`
- **Question quality** — `review-generated-questions`, `review-question-quality`,
  `scan-question-quality`, `resolve-question-quality`, `fix-generated-question`,
  `shorten-questions`, `shorten-answers`, `find-similar-questions`,
  `fix-mixed-language-questions`, `verify-georgian-grammar`, `restore-english-questions`,
  `translate-questions`
- **Icons** — `analyze-question-icon`, `suggest-icons`, `smart-icon-search`,
  `smart-assign-icons`, `batch-assign-icons`, `batch-assign-icons-category`,
  `bulk-import-assign-icons`, `propagate-icons`, `replace-icon`, `verify-icons`,
  `extract-icons`, `extract-missing-icons`, `fix-broken-icon-references`,
  `import-icon-metadata`, `export-icon-library`, `sync-icon-library`
- **Images / avatars** — `generate-avatar`, `animate-avatar`, `batch-animate-avatars`,
  `batch-regenerate-avatars`, `process-existing-avatars`, `expand-avatar`, `detect-face`,
  `generate-cover-image`, `validate-cover-image`, `generate-question-image`,
  `search-question-image`, `generate-room-covers`, `generate-room-name`
- **Import / parsing** — `parse-quiz-url`, `parse-text-content`, `parse-wikipedia-media`,
  `fetch-url-metadata`
- **Commerce** — `create-gem-checkout`, `create-pro-checkout`, `stripe-gem-webhook`,
  `verify-receipt`
- **Accounts / compliance** — `delete-user-account`, `export-user-data`,
  `reset-password-with-security`
- **Ops** — `send-push-notification`, `notify-new-levels`, `cleanup-old-rooms`,
  `seed-sample-content`, `challenge-og-image`

---

## 22. Analytics, telemetry and resilience

- **PostHog** with synchronous identity bootstrap (the very first event already carries the
  right user id), autocapture, pageleave, manual pageviews, person profiles, and global
  exception capture for unhandled rejections and async throws — console errors are
  deliberately *not* promoted to exceptions, since `console.error` is used as ordinary logging.
- **Meta Pixel** page-view tracking.
- **Purchase analytics** (`usePurchaseAnalytics`), session tracking (`user_sessions`), active-
  user and online-user panels, and an admin analytics widget set.
- Resilience: React error boundary at the root, a TV-specific error boundary, offline banner,
  network-status awareness, idle timeouts, optimistic updates with server reconciliation,
  compare-and-set writes for anything counted, and fail-open behaviour for ads and play
  bookkeeping so infrastructure problems never block gameplay.

---

## 23. Internal / developer surfaces

Excluded from production builds unless `VITE_INCLUDE_DEV_PAGES=true`:

- `/styleguide` — colors, typography, components
- `/all-buttons` — every button variant and state
- `/modals` — every modal type
- `/tv-showcase` — every TV screen in every state (backed by a mock TV context)
- `/docs` — the internal technical map (architecture, tables, RPCs, edge functions, hooks,
  components, contexts, TV mode) rendered from `src/data/documentation/*`
- `/onboarding-preview`, `/sampledemotv`, `/sampledemoplayer` — flow previews and demo players

Tooling: ESLint 9 + typescript-eslint, `tsc --noEmit` typecheck, Vitest unit tests (economy
config, playLimit, locales, world-map generation, avatar studio, …), Playwright e2e
(`public-routes.spec.ts`, `tv-smoke.spec.ts`), and Qodana static analysis.

---

## 24. Complete route map

**Public / player**

| Route | Purpose |
|---|---|
| `/` , `/dev/v2` | Home (guest landing or logged-in dashboard) |
| `/loading`, `/trivialoader` | Loading / splash surfaces |
| `/auth`, `/forgot-password` | Sign in, sign up, recovery |
| `/discover` | Category discovery + explore feed |
| `/category/:categoryId` | Category levels |
| `/play/:categoryId/:levelId` | Level gameplay |
| `/game` | VS mode |
| `/team` | Multiplayer hub, rooms, my trivia |
| `/trivia/:triviaId` | Trivia/room lobby |
| `/collection/:collectionId` | Collection lobby |
| `/room/:code` | Room join redirect |
| `/challenge/:code` | Public challenge landing |
| `/tv`, `/tv/:code`, `/tv/host/:sessionId` | TV lobby, display, host controller |
| `/join`, `/join/:code`, `/join/session/:sessionId` | Phone controller join |
| `/leaderboards` | Leagues and rankings |
| `/power-ups` | Shop |
| `/vip` | PRO subscription |
| `/profile`, `/profile/:userId` | Own and public profiles |
| `/notifications` | Notification feed |
| `/settings`, `/settings/name`, `/settings/password`, `/settings/privacy` | Settings |
| `/shop/success`, `/shop/cancel` | Checkout outcomes |
| `/support`, `/delete-account` | Help and account deletion |
| `/privacy-policy`, `/privacy-policy-en`, `/terms`, `/terms-en` | Legal |
| `*` | 404 |

**Admin** (build-flagged): `/admin` plus the sub-routes listed in §20, and the admin-gated
`/onboarding` preview.
**Dev** (build-flagged): `/styleguide`, `/all-buttons`, `/modals`, `/tv-showcase`, `/docs`,
`/onboarding-preview`, `/sampledemotv`, `/sampledemoplayer`.

---

## 25. Feature index (quick list)

**Gameplay** — category campaign with star levels · VS mode vs simulated opponents · real-time
multiplayer rooms (2–8) · TV party mode with phone controllers · async challenge links playable
without an account · player-made trivia and multi-round collections · true/false questions ·
image / audio / video questions · unified 15-second scoring · first-answer bonus · observer
bonus · practice-room rules · exhaustion-aware question selection · no-repeat question tracking

**Progression** — 1–3 star level ratings · level unlocking · 999 account levels on a power
curve · XP · win streaks with escalating bonuses · per-category ranks · total stars · adventure
map · 3D interactive world map

**Power-ups** — 50/50 · Freeze · Replace · Time Drain · atomic inventory · tutorial · effects
overlay · PRO daily grant

**Economy** — coins + gems · 500:1 exchange · 500-coin game stake · 5 free plays / 3-hour
server-counted window · ad-for-play · gems-for-plays · shop with 6 sections · rotating daily and
hourly deals · bundles with drift-proof receipts · admin-tunable economy config

**Engagement** — 7-day daily rewards · 24h treasure chest with weekend gem · lucky spin ·
rotating daily (5) and weekly (4) missions with beginner/advanced tiers · instant mission
payouts · mission streaks to 30 days · Did You Know facts with voting · floating gifts

**Competition** — Bronze/Silver/Gold weekly leagues · promotion & demotion · regional and global
boards · per-category leaderboards · top-10 weekly prizes · exclusive champion frames and badges
· weekly snapshots

**Social** — friends, requests, blocking · presence and online status · friends stories bar ·
room and direct chat · game invitations · room pings · referrals with rewards · share links,
QR codes and OG images · player profile modal · public profiles · reporting

**Creation** — quiz creator with open and blind modes · AI generation from a topic · import from
URL, pasted text or Wikipedia · manual game-style editor · per-question icon picker · AI cover
art · collections and rounds · auto-saving drafts · likes, saves, plays, comments · creator
portfolios · explore feed with filters · spotlight search

**Monetization** — PRO / PRO+ subscription with six benefit lines · centralized PRO gating ·
RevenueCat native IAP · Stripe web checkout · gem packs with bonuses · ad-free purchase ·
rewarded ads with fail-open gating · paced interstitials · ATT consent · child-safe ad treatment

**Personalization** — AI avatar scenes and portraits · animated idle-loop avatars · separate
scene/portrait quotas · 9 avatar frames plus earned champion frames · nickname, country, room
gradients, icons and AI room names/covers · sound, music and vibration preferences

**Platform** — 7 languages with localized content and questions · push notifications · 21 in-app
notification types · camera and photo library · haptics · QR scan and generate · offline banner ·
external display / casting · portrait-locked iOS + Android shells · data export and account
deletion

**Operations** — role-gated admin console · AI question factory with job queue · quality review
and duplicate scanning · icon assignment, verification and repair pipelines · translation and
grammar tooling · push broadcast console · economy and revenue dashboards · user analytics ·
report moderation · adventure-map position editor · 90 tables, 230 migrations, 69 edge functions
