# Getting off Lovable completely

An audit of what is still tied to Lovable as of `main` @ `e8972e3`, and the
plan to end it.

`docs/LOVABLE_MIGRATION.md` is the record of the first half of this work —
the code-level decoupling, done in one pass and mostly complete. This
document is the second half: the operational ownership that was left behind,
which is almost all of the remaining pain and none of the remaining code.

**The short version.** The application no longer depends on Lovable at
runtime. One thing does: the Supabase project `sqwpzezkhpqkdyltvsim` lives in
Lovable's Supabase organization, so every migration and every edge function
deploy goes through a vendor we cannot log into. Everything else on the list
below is minutes of work. That one thing is the project.

---

## 1. What is already ours

Worth stating plainly, because it shortens the job considerably and it is
easy to assume the dependency is broader than it is.

| Thing | Where it lives | Evidence |
|---|---|---|
| Web hosting | Our Cloudflare account, our Worker | `wrangler.toml`, `.github/workflows/deploy.yml` |
| Production domain | `mytrivia.io` / `www.mytrivia.io`, Cloudflare-managed | `wrangler.toml` `routes` |
| CI | GitHub Actions, our repo secrets | `deploy.yml`, `pr-checks.yml` |
| Google OAuth client | Our Google Cloud project | `docs/LOVABLE_MIGRATION.md` §1 |
| Apple Sign In | Our Apple Developer account (`io.mytrivia.signin`) | `docs/LAUNCH_RUNBOOK.md` |
| App identity | `io.mytrivia.app`, RevenueCat, AdMob, Stripe, Firebase | `capacitor.config.ts`, `.env` |
| Database schema | 368 migrations, 47,978 lines of SQL, in git | `supabase/migrations/` |
| Edge function source | 77 functions, in git | `supabase/functions/` |
| The money rules | Executed against real Postgres in CI | `supabase/tests/`, `pr-checks.yml` |

Nothing in that column needs migrating. The site could be served, the app
could be built and the schema could be rebuilt without asking anyone for
anything. That is the result of the first migration pass and it holds.

## 2. What is still Lovable's

### 2.1 The Supabase project — the only real lock-in

`sqwpzezkhpqkdyltvsim` is a **Lovable Cloud** project: a Supabase project
provisioned inside Lovable's organization. We have the anon key and the
project ref, which are public. We do not have the dashboard, a personal
access token, the service role key, or CLI access.

This is not a theoretical inconvenience. The repo already documents four
concrete failures caused by it:

- **Edge functions cannot be deployed.** `send-game-invite-push` sat at HTTP
  404 in production while every other function answered 401 — a fire-and-
  forget call failing silently — because Lovable had never been asked to
  deploy a function it had not seen before (`AGENTS.md` §4a).
- **Migrations cannot be applied.** The workflow is: merge to `main`, hand a
  human a link to the raw `.sql` file, they paste it into Lovable's SQL
  editor. Every apply is a manual step performed by someone else.
- **The auth redirect allowlist cannot be edited**, so the code works around
  it. `src/integrations/supabase/client.ts:41` carries a forwarder whose
  comment says exactly this: *"which nobody here can edit — Lovable holds the
  Supabase connection"*. A password reset link lands on the homepage and is
  re-routed client-side, because the allowlist entry that would make it land
  correctly is not ours to add.
- **`types.ts` cannot be safely regenerated**, and when Lovable regenerates
  it against a database missing the entitlement migrations, six RPC
  definitions vanish and the build fails with two dozen unrelated-looking
  errors. This is `CLAUDE.md` rule 1, and it exists because it has happened.

There is a fifth, quieter cost: retired IAP product ids are still mapped
server-side in `_shared/iap.ts` purely because `supabase/` deploys on
Lovable's schedule and the client-side half of the fix was the only half we
could ship (`src/__tests__/repo-invariants.test.ts:264`).

### 2.2 `bun.lock` resolves from Lovable's private registry

`docs/LOVABLE_MIGRATION.md` records the lockfile as *"regenerated, resolves
from public npm"*. That is no longer true — Lovable has re-synced it since.

```
87 of 931 entries in bun.lock resolve from
  https://europe-west4-npm.pkg.dev/lovable-core-prod/sandbox-npm-cache/...
package-lock.json: 928 entries, all registry.npmjs.org, 0 Lovable
```

CI is unaffected, because CI runs `npm ci` (`CLAUDE.md` rule 2). But anyone
who installs with bun is pulling 87 packages — `@babel/*`, `@capacitor/*`,
`css-tree` — through a Google Artifact Registry proxy owned by our vendor.
That is a supply-chain dependency on a company we are leaving, and it will
stop resolving for us at some point after we leave.

### 2.3 Three unused Lovable dev dependencies

```json
"@lovable.dev/vite-plugin-dev-server-bridge": "^1.0.2",
"@lovable.dev/vite-plugin-hmr-gate": "^1.8.0",
"lovable-tagger": "^1.3.3"
```

All three are in `devDependencies`. **None of them is imported by
`vite.config.ts` or anything else in the repo** — the first migration pass
removed `lovable-tagger` from the Vite config and Lovable has since re-added
the package without the config. They resolve from public npm in
`package-lock.json`, so they cost us a slightly slower `npm ci` and nothing
else. They are dead weight, not a dependency.

They are also a tell: Lovable re-adds them on sync, so removing them while
still connected will simply bring them back.

### 2.4 `_shared/ai.ts` still carries the legacy gateway

```
supabase/functions/_shared/ai.ts:36
  const LEGACY_CHAT_URL = "https://ai.gateway.lovable.dev/v1/chat/completions"
supabase/functions/_shared/ai.ts:89
  const legacyKey = Deno.env.get("LOVABLE_API_KEY")
```

The provider resolution is first-match-wins: `AI_GATEWAY_*`, then
`GEMINI_API_KEY`, then the Lovable gateway. **Which one is actually live is
not knowable from this repo** — it depends on which secret is set on the
Supabase project, which we cannot read. If `LOVABLE_API_KEY` is still the
only one set, then all 34 AI generation functions are currently billing
through Lovable and will break the day the account closes. This is the one
item on the list with a hard external deadline attached, and step 1 of the
plan is to find out.

### 2.5 The Lovable GitHub App has write access to the repo

`gpt-engineer-app[bot]` authored 11 of the last 200 commits. It pushes to
`main` directly. That is how §2.2 and §2.3 came back after being removed.

### 2.6 Residue

- `.lovable/` — `plan.md` (a stale one-shot deploy plan) and
  `mcp/manifest.json` (an MCP server manifest whose `issuer` is the project's
  auth endpoint).
- `deno.lock` carries the three npm specifiers from §2.3.
- `CLAUDE.md` / `AGENTS.md` §4a, `README.md`, `DEPLOYMENT.md` and a dozen
  `docs/` files encode "deploy through Lovable" as the house process. All of
  it becomes wrong the day the project moves, and the agent instructions in
  particular will actively mislead if left.
- ~36 migration files carry comments about Lovable's security scanner.
  Applied history; leave them alone.

---

## 3. The plan

### Step 0 — Ask whether the project can simply be transferred

**Do this before anything else, because a yes collapses the rest of this
document to an afternoon.**

Supabase supports transferring a project between organizations. If Lovable
will transfer `sqwpzezkhpqkdyltvsim` into our own Supabase organization, we
keep the same project ref, the same URL, the same anon key, the same JWT
secret, the same auth users, the same storage objects, the same webhook
endpoints — and gain the dashboard. Nothing in the client changes. No iOS
build is needed. Sections 4 and 5 below stop applying.

Ask Lovable support directly: *can this Lovable Cloud project be transferred
to our own Supabase organization, and what does that cost?*

Lovable's own documentation is blunt that there is **no automatic migration
between Lovable Cloud and your own Supabase project, in either direction** —
you recreate the schema and move the data manually. Since July 2026 the
Advanced settings page does offer *Export project data*, *Pause Cloud* and
*Remove Lovable Cloud*, and a Lovable project can be reconnected to your own
Supabase afterwards. So the export is real, and the reassembly is ours.

Treat a transfer as the good outcome, plan for the rebuild, and do not start
the rebuild until the question has been asked and answered.

### Step 1 — Find out what is actually running (half a day, no commitment)

Nothing here changes production. It closes the unknowns that make the rest
of the plan unestimatable.

1. **Which AI provider is live.** Get whoever has Lovable access to read the
   secrets list on the project. If only `LOVABLE_API_KEY` is set, set
   `GEMINI_API_KEY` now and redeploy the AI functions — this is the one item
   with an external clock on it, and it is independent of everything else.
2. **How big is the data.** Row counts for `questions`, `categories`,
   `profiles`, `auth.users`, and total bytes in the six storage buckets
   (`avatars`, `icon-library`, `icons`, `question-media`, `quiz-covers`,
   `room-covers`). This decides whether the data move is a `pg_dump` and a
   coffee or a week of streaming.
3. **Is the schema in git the schema in production.** 202 of the 368
   migrations are Lovable-generated (UUID-suffixed filenames); Lovable's
   agent can also apply SQL directly without writing a migration file. Any
   such SQL is invisible to us and will be missing from a rebuild. Compare a
   `pg_dump --schema-only` of production against a replay of
   `supabase/migrations/` and diff them.
4. **Does the migration chain replay at all.** This is the biggest technical
   risk in the whole plan and it is currently untested: `pr-checks.yml`
   applies the migrations with `|| true` — *every error is swallowed* — and
   its own comment notes that *"roughly 36 historical migrations depend on
   Supabase's own storage/realtime schemas and cannot apply here."* We have
   never proven that 368 migrations replay cleanly from zero onto a real
   Supabase instance. Run `supabase start` locally (or against a throwaway
   free-tier project) and replay them with `ON_ERROR_STOP=1`.

   If the replay fails — and with 368 files spanning a year it very likely
   will somewhere — the fix is not to repair a year of history. It is to
   take the `pg_dump --schema-only` from (3) as a new squashed baseline
   migration and archive the old chain. That is a better outcome anyway.

### Step 2 — Stand up our own Supabase project (1–2 days)

Create it in **our** Supabase organization, on a paid plan (the custom domain
add-on and the backup retention both want one).

1. Apply the baseline from Step 1 — either the replayed chain or the squashed
   dump.
2. Recreate what lives outside the schema:
   - **Auth providers.** Google and Apple, using the *existing* OAuth clients
     in our own Google Cloud and Apple Developer accounts. Add the new
     project's `/auth/v1/callback` as an additional redirect URI in both;
     keep the old one until cutover is done.
   - **URL configuration.** Site URL `https://mytrivia.io`, and the redirect
     allowlist that has never been ours to write: `https://www.mytrivia.io`,
     `http://localhost:5173`, `http://localhost:8080`,
     `capacitor://localhost`, `mytrivia://auth-callback` (the native return
     leg, `src/integrations/oauth.ts:32`) and `https://mytrivia.io/reset-password`.
     Adding that last one lets the client-side forwarder in `client.ts` become
     a no-op, which is the first workaround this project pays back.
   - **Storage buckets.** The six above; the migrations create them, but
     verify public/private flags and the MIME allowlists survived the replay.
   - **Realtime publication.** Nine-plus tables are added to
     `supabase_realtime` by migrations. Verify from outside — a realtime
     websocket will tell you whether a table is in the publication.
   - **Platform secrets.** Twenty are referenced across the edge functions:
     `AI_GATEWAY_API_KEY`, `AI_GATEWAY_URL`, `AI_MODEL_PREFIX`, `FAL_KEY`,
     `FIREBASE_SERVICE_ACCOUNT`, `FIRECRAWL_API_KEY`, `GEMINI_API_KEY`,
     `LATE_API_KEY`, `PUSH_CRON_SECRET`, `PUSH_TEST_SECRET`,
     `REVENUECAT_SECRET_API_KEY`, `REVENUECAT_WEBHOOK_SECRET`, `SEED_SECRET`,
     `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `TRANSLATE_SECRET`
     (`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are
     injected by the platform; `LOVABLE_API_KEY` is the one we are deleting).
     Several of these we hold; the rest have to be read out of Lovable or
     regenerated at their source.
3. Deploy all 77 edge functions with our own token:
   `supabase functions deploy --project-ref <new>`. `supabase/config.toml`
   carries the per-function `verify_jwt` settings and is applied by the CLI —
   check that the webhooks (`revenuecat-webhook`, `stripe-gem-webhook`,
   `verify-receipt`) come out with the right ones, because a webhook
   deployed with `verify_jwt = true` answers 401 to the payment provider and
   the failure looks exactly like the three-day Stripe retry storm described
   in `AGENTS.md` §4a.
4. **Wire CI to do this from now on.** A `supabase-deploy.yml` workflow with
   `SUPABASE_ACCESS_TOKEN` as a repo secret, running `db push` and
   `functions deploy` on push to `main`. This is the step that actually ends
   the dependency — until deploys are automatic and ours, we have only
   changed which human we wait for.

### Step 3 — Move the data (the risky one)

Order matters: schema, then `auth.users`, then public data, then storage.

- **Auth users are the delicate part.** Password hashes live in `auth.users`
  and a naive export loses them, which means a forced password reset for
  every account. A role-level `pg_dump` of the `auth` schema preserves them.
  Do this on a throwaway copy first and verify a known password still signs
  in before trusting it.
- **Sessions will break regardless.** Access tokens are signed with the
  project's JWT secret and refresh tokens live in `auth.refresh_tokens`. A
  new project means a new secret, so every signed-in user is signed out at
  cutover unless the JWT secret is carried across too. Plan for "everyone
  signs in again", tell users, and time it accordingly — do not discover it
  on the day.
- **Storage objects** need both the files and the `storage.objects` rows.
  Copy bucket by bucket and verify counts, not just success.
- **Freeze writes during the final copy.** Anything written to the old
  project after the dump is lost.

Rehearse the whole of Step 3 into a scratch project at least once. The
rehearsal is where you find out that the dump takes four hours, not twenty
minutes.

### Step 4 — Cutover, and the iOS problem

Changing the project ref means changing the URL and anon key in:

| Where | What |
|---|---|
| `.env` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY` |
| `.github/workflows/deploy.yml:76` | the hardcoded fallbacks |
| `.github/workflows/pr-checks.yml:60` | the hardcoded fallbacks |
| `wrangler.toml` `[vars]` | `SUPABASE_URL`, `SUPABASE_ANON_KEY` (the Worker's room link previews) |
| `supabase/config.toml` | `project_id` |
| ~10 files in `src/` | hardcoded `…supabase.co/storage/v1/object/public/icon-library` URLs |
| RevenueCat dashboard | webhook endpoint |
| Stripe dashboard | webhook endpoint **and a new signing secret**, with `customer.subscription.created/.updated/.deleted` plus `checkout.session.completed` subscribed (`AGENTS.md` §4a) |
| Whatever calls `scheduled-pushes` | the cron caller's URL and `PUSH_CRON_SECRET` |

**The web cutover is a deploy. The iOS cutover is an App Store release.**
The Supabase URL and anon key are compiled into the bundle by Vite, so every
already-installed build keeps talking to the old project until the user
updates — which some never will. This is the single constraint that shapes
the schedule:

- Keep the old project alive and readable for as long as old builds are in
  the field. A dual-write period is not realistic across two projects, so
  in practice this means **cut over at a moment when the app has few enough
  real users that a hard switch is acceptable** — which, per
  `docs/OPERATIONS.md` §2, is *now*, before public release. The cost of this
  migration goes up by an order of magnitude the day the app has users.
- If it has to happen after launch, the answer is a forced-update gate in the
  client plus a `api.mytrivia.io` Worker route in front of Supabase, so the
  host in the binary is one we control and can repoint without a release.
  Worth considering on its own merits even now — it also removes the reason
  the Google sign-in screen shows a Supabase hostname.

### Step 5 — Disconnect, and clean the repo

Only after the new project has served production for a week or two.

1. In Lovable: *Export project data* (keep the archive), then *Pause Cloud*,
   then *Remove Lovable Cloud*.
2. Remove the Lovable GitHub App's write access to `devitsbeka/flutter-native-play`.
3. Then, and only then — because until now each of these would be re-added on
   the next sync:
   - Drop the three devDependencies from `package.json`, `package-lock.json`,
     `bun.lock`, `deno.lock`.
   - Regenerate `bun.lock` from public npm with no Lovable registry entries.
     Per `CLAUDE.md` rule 2, regenerate `package-lock.json` alongside it.
   - Delete `.lovable/`.
   - Delete the `LEGACY_CHAT_URL` / `LOVABLE_API_KEY` branch from
     `_shared/ai.ts`, and delete the secret from the project.
   - Rewrite `CLAUDE.md` / `AGENTS.md` §4a, `README.md:20,38` and
     `DEPLOYMENT.md:7`. **This one matters more than it looks:** those files
     are instructions to every agent working in this repo, and an agent told
     to "hand the user a link to paste into the Lovable SQL editor" will keep
     doing that long after the editor is gone.
   - Add an invariant to `src/__tests__/repo-invariants.test.ts` asserting no
     `lovable` string in `package.json` or `bun.lock`, so the next sync from
     anywhere cannot quietly reintroduce it.

---

## 4. What will bite

1. **The migration chain has never been replayed.** Untested, 368 files,
   errors currently swallowed by `|| true` in CI. Assume it does not work and
   budget for the squashed-baseline path.
2. **Schema drift.** 202 Lovable-authored migrations, plus an unknown amount
   of SQL applied through its editor that never became a file. The diff in
   Step 1.3 is the only way to know, and it must be done before anything is
   rebuilt on top of the assumption.
3. **Auth users.** Password hashes and sessions. Rehearse; verify a real
   login against the copy before cutover.
4. **The iOS binary holds the URL.** The reason to do this now rather than
   after launch.
5. **Secrets we do not hold.** Some of the twenty are only in Lovable's
   secret store. Inventory them in Step 1 — discovering a missing
   `FIREBASE_SERVICE_ACCOUNT` at cutover means push notifications stop and
   there is no way back to read it.
6. **Webhook downtime is money.** RevenueCat and Stripe both retry, but
   `AGENTS.md` §4a records what a mishandled subscription webhook already
   cost once: card charged, entitlement never created, Stripe retrying for
   three days. Re-point these deliberately, verify with a test event, and
   watch `iap_events` after.

## 5. Recommended sequence

| When | What | Blocked by |
|---|---|---|
| Today | Step 0 — ask Lovable about a project transfer | nothing |
| Today | Step 1.1 — find out if the AI functions are still billing through Lovable, and set `GEMINI_API_KEY` if so | Lovable dashboard access |
| This week | Step 1.2–1.4 — data sizes, schema drift diff, migration replay test | nothing; all read-only |
| — | **Decision point:** transfer, or rebuild | Step 0 + Step 1 |
| If rebuilding, before public launch | Steps 2–4 | Step 1 |
| Two weeks after cutover | Step 5 | a stable new project |

One thing is worth doing regardless of which way the decision goes: **fix
`pr-checks.yml` to stop swallowing migration errors**. Whether the schema is
transferred or rebuilt, a migration chain that has never been proven to
replay is a liability, and `|| true` is why nobody has noticed.
