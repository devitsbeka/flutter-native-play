# MyTrivia — backend, data model and security posture

*Supabase: the schema, the RPCs, the edge functions, and the rules that keep
money out of the client's hands. Written 2026-09-06 from `main` @ `21717c9`.
Table and function names are read out of `src/integrations/supabase/types.ts`,
which is generated from the live database.*

---

## 1. Shape of the backend

Everything server-side is **Supabase**, project ref `sqwpzezkhpqkdyltvsim`:

- **PostgreSQL** — 107 tables, 114 callable functions (RPCs), 337 applied
  migrations.
- **Auth** — email/password, username-as-synthetic-email, Google OAuth, Sign in
  with Apple (Services ID `io.mytrivia.signin`).
- **Realtime** — `postgres_changes` subscriptions per room
  (`room-${id}`, `participants-${id}`, `answers-${id}`), TV session channels, a
  broadcast channel for Words, presence heartbeats, and a ref-counted shared
  channel for missions.
- **Storage** — avatars, covers, icons, generated media.
- **Edge Functions** — 76 Deno functions.

The database is **owned and deployed through Lovable**. Nobody on the team holds
a Supabase personal access token or CLI access. See
`05-PLATFORMS-DEPLOY-AND-RELEASE.md` §3 for what that means in practice.

## 2. The tables, by domain

All 107, grouped.

**Users and identity** — `profiles`, `user_roles`, `user_presence`,
`user_sessions`, `user_blocks`, `push_tokens`, `push_log`,
`password_reset_attempts`, `user_achievements`.

**Content** — `categories`, `category_translations`, `category_stats`,
`questions`, `king_questions`, `icon_library`, `icon_assignment_history`,
`icon_fix_history`, `icon_verification_results`, `knowledge_sources`,
`trivia_facts`, `level_positions`.

**Progress** — `user_level_progress`, `user_category_progress`,
`user_country_progress`, `user_category_last_seen`, `game_plays`,
`game_sessions`.

**Rooms and classic multiplayer** — `game_rooms`, `game_types`,
`room_participants`, `room_questions`, `room_games`, `room_match_history`,
`room_category_queue`, `room_chat_messages`, `room_join_requests`,
`room_vote_results`, `player_answers`, `game_invitations`, `invite_links`,
`matchmaking_queue`.

**Team Battle** — `team_battle_board`, `team_battle_state`.

**King** — `king_questions`, `king_matches`, `king_team_matches`.

**TV mode** — `tv_sessions`, `tv_players`, `tv_session_queue`,
`tv_poll_suggestions`, `tv_poll_votes`, `tv_round_history`, `tv_score_events`,
`tv_phase_events`, `tv_observer_awards`, `tv_answer_rejections`.

**Social and UGC** — `friendships`, `friend_invites`, `chat_messages`,
`notifications`, `user_quiz_posts`, `quiz_collections`, `quiz_post_likes`,
`quiz_post_saves`, `quiz_post_plays`, `quiz_post_comments`, `trivia_drafts`,
`collection_drafts`, `social_frame_drafts`, `user_favorites`, `user_reports`,
`user_fact_votes`.

**Economy and commerce** — `economy_config`, `currency_grants`,
`currency_grant_limits`, `shop_products`, `iap_products`, `iap_events`,
`gem_purchases`, `purchase_transactions`, `promotions`, `vip_subscriptions`,
`pro_seats`, `user_power_ups`, `user_avatar_frames`, `user_rewards`,
`user_daily_rewards`, `user_daily_spins`, `user_daily_plays`,
`user_daily_vip_rewards`.

**Competition** — `user_league_data`, `category_leaderboard`,
`category_weekly_rewards`, `weekly_leaderboard_snapshots`, `leaderboard_badges`,
`leaderboard_exclusive_frames`, `user_leaderboard_badges`,
`user_leaderboard_frames`, `user_missions`, `user_mission_streaks`.

**Challenges** — `challenge_links`, `challenge_attempts`.

**AI operations** — `ai_generation_settings`, `generation_jobs`,
`generation_job_questions`, `avatar_generations`, `cover_image_generations`,
`app_settings`.

## 3. The RPCs

All 114, grouped by what they defend. Read out of the generated types, so this
is the live set — not an aspirational one.

**Money and entitlements** (never weaken these) — `update_user_currency`,
`apply_currency_grant`, `credit_gameplay_reward`, `claim_daily_reward`,
`claim_daily_vip_powers`, `claim_leaderboard_reward`, `claim_streak_milestone`,
`streak_milestones_claimed`, `exchange_currency`, `buy_extra_plays`,
`consume_free_play`, `grant_vip_days`, `ensure_admin_lifetime_pro`,
`settle_quick_game`, `adjust_power_up`, `admin_user_economy`.

**PRO seats** — `grant_pro_seat`, `revoke_pro_seat`, `end_pro_seat`,
`pro_seat_allowance`, `pro_seat_holder_has_pro`.

**Rooms and lobbies** — `generate_room_code`, `complete_room_round`,
`increment_participant_score`, `reset_room_participants`, `room_players`,
`room_preview`, `public_rooms`, `request_room_join`, `respond_room_join`,
`block_room_join`, `invite_room_players`, `transfer_room_host`,
`lobby_manage_seat`, `settle_most_likely_votes`.

**Invites, referrals and challenges** — `accept_invite`, `invite_preview`,
`get_or_create_invite_code`, `generate_referral_code`, `resolve_referral_code`,
`generate_challenge_code`.

**TV** — `submit_tv_answer`, `tv_claim_session`, `tv_advance_question`,
`tv_expire_question`, `award_tv_observer_bonus`, `is_tv_session_participant`,
`reset_tv_session_scores`.

**Team Battle** — `tb_start_match`, `tb_pick_tile`, `tb_submit_answer`,
`tb_close_turn`, `tb_next_player`, `tb_advance`, `tb_settle`, `tb_leave_match`,
`tb_finish_stale`, `tb_submit_rps`, `tb_resolve_rps`, `tb_team_throw`,
`tb_vote_super`, `tb_resolve_super_vote`, `tb_submit_super`, `tb_advance_super`,
`tb_set_captain`, `tb_vote_captain`, `tb_set_team_name`, `tb_set_team_icon`,
`tb_add_bot`, `tb_remove_bot`.

**King (solo)** — `king_start_match`, `king_state`, `king_draw_question`,
`king_show_options`, `king_submit_answer`, `king_finish_question`,
`king_expire_question`, `king_abandon_match`, `king_question_is_long`.

**King (team / couch)** — `king_team_start`, `king_team_state`,
`king_team_view`, `king_team_suggest`, `king_team_options`,
`king_team_open_options`, `king_team_commit`, `king_team_resolve`,
`king_team_advance`, `king_team_next`, `king_team_draw_into`, `king_team_member`.

**Matchmaking** — `mm_enqueue`, `mm_cancel`, `mm_try_match`, `mm_status`,
`mm_entry_state`, `mm_required_players`.

**Content and analytics** — `search_questions`, `get_category_question_counts`,
`get_questions_sorted_by_length`, `get_untranslated_questions`,
`question_translation_progress`, `national_question_progress`,
`increment_quiz_plays`, `best_category_for_user`, `head_to_head_record`,
`increment_profile_stats`, `player_profile_facts`, `presence_for_users`,
`get_league_leaderboard`, `get_unread_counts_by_room`,
`get_my_private_profile`, `format_display_name`, `has_role`.

**Two names to know are gone.** `king_draw_question` returns a question
*without* its options during the think phase — the options are fetched only when
the commit phase opens, which keeps them out of the DOM while the player is
thinking. And `process_referral_reward` **was dropped on purpose** — see
`06-RULES-GOTCHAS-AND-HISTORY.md` §5.

## 4. The security posture — read this before touching anything server-side

The design principle: **the client is never trusted with anything that has
value.** This replaced a set of real holes where a signed-in user could grant
themselves a paid subscription or unlimited currency.

### 4.1 Money

- `vip_subscriptions` has **no client INSERT/UPDATE policy**. Grants go through
  `grant_vip_days` or the RevenueCat webhook. Nothing else.
- `update_user_currency` **refuses positive deltas from a signed-in caller**. A
  client can spend its own balance and nothing more.
- Credits flow only through `credit_gameplay_reward`, `claim_daily_reward`,
  `claim_leaderboard_reward`, `claim_streak_milestone`, `exchange_currency` and
  `buy_extra_plays`, each of which decides or bounds the amount **server-side**
  and writes a `currency_grants` ledger row.
- `currency_grant_limits` caps each reward kind per award and per day. **A kind
  with no limits row raises** rather than paying — so adding a new reward means
  adding its limits row, or nothing is granted and the RPC errors.
- The client **cannot read `currency_grants`** (no SELECT policy, by design), so
  "already claimed" comes back from the server rather than from a local flag. A
  local flag is exactly what let earlier streak rewards be banked twice.
- `exchange_currency` uses the server's 500:1 rate and rejects sub-gem amounts.

### 4.2 Grants default to public — always revoke

A new `SECURITY DEFINER` function in Postgres is granted to `PUBLIC` **by
default**. Every function here therefore does:

```sql
REVOKE ALL ON FUNCTION … FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION … TO authenticated;
```

Forgetting the revoke is the single easiest way to reopen a hole, and it looks
like nothing in a diff.

### 4.3 Gameplay

- Score columns are locked against client writes; answers are submitted through
  RPCs (`submit_tv_answer`, `increment_participant_score`,
  `tb_submit_answer`, `king_submit_answer`), and **rejected answers are logged**
  (`tv_answer_rejections`).
- Question advancement and question expiry are enforced server-side, with a
  deadline check, so a client cannot stop the clock.
- The observer bonus is awarded server-side (`award_tv_observer_bonus`).
- First-correct-answer claims are a server-side race, not a client assertion.
- `complete_room_round` accumulates cumulative scoreboard totals for **every**
  participant exactly once per round. The client-side version of this write was
  silently RLS-blocked for all non-host rows — which is what "0 points and 0
  rounds after every round" was.
- Anonymous session writes are blocked; security-answer hashes are hidden from
  the client.
- The **dark launch is server-enforced**: `tb_start_match`, `king_start_match`
  and `mm_enqueue` refuse a mode that is not `is_live`, so a hand-crafted call
  fails the same way a chooser tap would.
- Friendships: `friendships` lets a signed-in user insert a row naming
  themselves, status included — so a client-side "we are friends now" would be
  "I am in your friends list now" for anyone whose user id you can learn, and
  every room participant can read those. The **invite-link code is what proves
  the host asked for the introduction**; the SQL suite `05-invite-links.sql`
  pins it.

### 4.4 The one acknowledged gap

**Gameplay rewards are bounded and ledgered, but not verified.** A modified
client can still claim a plausible score within the caps. The exposure is
bounded coin/XP inflation, not revenue theft — purchases and entitlements *are*
server-verified. The repository's own launch documentation names this as "the
one economy gap left" and recommends closing it before the economy carries
significant real money. It is a project, not a patch.

A second, smaller one: **the lucky-spin outcome is chosen on the client**
(audit finding P5-2).

## 5. Edge functions (76)

All Deno, under `supabase/functions/`, sharing `_shared/`.

**Question generation** — `generate-single-question`, `generate-category-trivia`,
`generate-country-trivia`, `generate-national-questions`, `generate-custom-quiz`,
`generate-multilang-trivia`, `generate-media-questions`,
`bulk-generate-contextual-questions`, `run-generation-job`,
`research-category-facts`, `generate-topic-suggestions`,
`extract-category-topics`, `bulk-resolve-topics`.

**Question quality** — `review-generated-questions`, `review-question-quality`,
`scan-question-quality`, `resolve-question-quality`, `fix-generated-question`,
`shorten-questions`, `shorten-answers`, `find-similar-questions`,
`fix-mixed-language-questions`, `verify-georgian-grammar`,
`restore-english-questions`, `translate-questions`.

**Icons** — `analyze-question-icon`, `suggest-icons`, `smart-icon-search`,
`smart-assign-icons`, `batch-assign-icons`, `batch-assign-icons-category`,
`bulk-import-assign-icons`, `propagate-icons`, `replace-icon`, `verify-icons`,
`extract-icons`, `extract-missing-icons`, `fix-broken-icon-references`,
`import-icon-metadata`, `export-icon-library`, `sync-icon-library`.

**Images and avatars** — `generate-avatar`, `animate-avatar`,
`batch-animate-avatars`, `batch-regenerate-avatars`, `process-existing-avatars`,
`expand-avatar`, `detect-face`, `generate-cover-image`, `validate-cover-image`,
`generate-question-image`, `search-question-image`, `generate-room-covers`,
`generate-room-name`.

**Import and parsing** — `parse-quiz-url`, `parse-text-content`,
`parse-wikipedia-media`, `fetch-url-metadata`.

**Commerce** — `create-gem-checkout`, `create-pro-checkout`, `stripe-gem-webhook`,
`verify-receipt`, `revenuecat-webhook`.

**Accounts and compliance** — `register-username`, `delete-user-account`,
`export-user-data`, `reset-password-with-security`.

**Social and ops** — `send-push-notification`, `send-game-invite-push`,
`send-social-push`, `scheduled-pushes`, `social-post`, `notify-new-levels`,
`cleanup-old-rooms`, `seed-sample-content`, `challenge-og-image`.

**All AI calls happen here, never in the client.** The AI gateway keys and the
fal.ai credentials are Supabase platform secrets.

## 6. The purchase → entitlement chain

Three pieces, deliberately one design:

| Piece | Does | Auth |
|---|---|---|
| `verify-receipt` | The app asks the server to re-sync entitlements after a purchase or a restore | Supabase JWT (signed-in caller required) |
| `revenuecat-webhook` | RevenueCat reports renewals, cancellations, refunds | A shared-secret header — RevenueCat has no Supabase session, so that header is the whole gate |
| `_shared/iap.ts` | The product catalog and the apply logic both of the above use | — |

**Nothing about a purchase is taken from the client.** The server asks
RevenueCat what the user actually owns. `iap_events` is an event ledger that
makes RevenueCat's retries idempotent.

Secrets (Supabase platform secrets, never in the repo, never in a `VITE_` var):

- `REVENUECAT_SECRET_API_KEY` — the `sk_…` key, and it must be a **V1** key.
  RevenueCat issues V2 by default now, and `_shared/iap.ts` calls the V1
  `/subscribers` endpoint; a V2 key there fails with 403 code 7723 and every
  symptom of that is server-side.
- `REVENUECAT_WEBHOOK_SECRET` — invented, and pasted into RevenueCat's webhook
  configuration. **The webhook refuses to run at all when it is unset**, rather
  than accepting unauthenticated calls: a missed step fails closed.

`config.toml` carries the JWT settings — `verify-receipt` requires a signed-in
caller, `revenuecat-webhook` does not.

**Do not write a second implementation of any of these three.** They agree with
each other and with the tables; a second one will not.

## 7. What is tested, and what is not

`supabase/tests/` runs the SQL against a **real Postgres 16** in CI on every PR.
Seventeen suites: entitlements, currency assertions, PRO seats, room rounds,
head-to-head, invite links, category levels, level-17 backfill,
money-not-anon, game types, most-likely votes, team battle, king, matchmaking,
public rooms, streak milestones.

What they prove: a signed-in user cannot mint currency, cannot touch another
user's balance, and can still spend their own; gameplay rewards are capped per
award and per day and an unknown reward kind is refused; `vip_subscriptions` is
not directly writable; `grant_vip_days` accepts only known durations and stacks
rather than resets; `exchange_currency` uses the server rate; the daily reward
pays the right amount and cannot be claimed twice a day; a leaderboard reward
can only be claimed by its owner, exactly once.

What they do **not** prove:

- **The shim is not Supabase.** `auth.uid()` reads a session variable rather than
  a JWT, and roughly 36 historical migrations fail to apply locally because they
  depend on Supabase's `storage` / `realtime` schemas. Every table the
  entitlement functions touch does get created, which is what makes the results
  meaningful — but this tests the *logic*, not the deployment.
- **Nothing here tests the edge functions.** `verify-receipt`,
  `revenuecat-webhook` and `_shared/iap.ts` are Deno and need a real project. A
  sandbox purchase on a device is currently the only end-to-end test of that
  chain.

## 8. Verifying the live database without CLI access

You can learn a surprising amount with only the public anon key in `.env`:

- **PostgREST answers** for tables and functions — a `404` on
  `/rest/v1/rpc/<name>` means the migration has not been applied.
- **A realtime websocket** will say whether a table is in the
  `supabase_realtime` publication.
- **Edge function reachability**: a deployed function answers `401`/`400`; one
  that has never been deployed answers **`404`**. This is how
  `send-game-invite-push` was found sitting undeployed while everything else
  answered 401.

To confirm a migration applied, hand the operator a read-only `SELECT` to paste
into the Lovable SQL editor rather than guessing.
