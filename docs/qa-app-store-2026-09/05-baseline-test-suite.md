# Baseline automated test suite — full run

**Date:** 2026-09-08. All checks run locally, mirroring `.github/workflows/pr-checks.yml` / `deploy.yml` exactly. No application source was modified to produce these results.

## Results

| Step | Status | Notes |
|---|---|---|
| `npm run typecheck` | PASS | Both tsconfigs, zero errors |
| `npm run test` (vitest) | PASS | 2346/2346 tests, 222 files, ~44s |
| `npm run lint` (eslint) | **FAIL — pre-existing, not CI-gated** | 515 errors / 222 warnings, dominated by `@typescript-eslint/no-explicit-any`; see note below |
| SQL entitlement/economy suite (Docker Postgres 16) | PASS | 14/14 files run by CI, plus `15-room-pot.sql` which exists but isn't wired into CI (also passes) |
| `npm run build` (vite) | PASS | Chunk-size advisory only (non-blocking) |
| `npm run test:e2e` (Playwright) | PASS | 23/23 after one environmental hiccup on the first attempt (see note) |

## Notes

**Lint is not a regression — it has never been a CI gate.** Neither `pr-checks.yml` nor `deploy.yml` runs `npm run lint`; only typecheck/test/build are gated. The 515 errors are repo-wide pre-existing state, concentrated in `src/services/adService.ts` (13), `supabase/functions/generate-multilang-trivia/index.ts` (12), and scattered across `supabase/functions/*` and `src/pages/admin/*`. Nothing here blocks resubmission. **Action item, not a blocker:** decide whether to start gating lint in CI going forward, since right now it's effectively decorative.

**`supabase/tests/15-room-pot.sql` exists and passes but isn't in `pr-checks.yml`.** It tests real money-adjacent logic (room-round pot staking/payout, from migration `20261015100000_room_round_pot.sql`) — 28 assertions including "nothing was minted," zero-sum payouts, idempotent double-settlement, and PRO-player parity. Its last-touched commit (`#590`) is unrelated to why it's missing from CI — this looks like a wiring oversight rather than a deliberate exclusion. **Action item:** add a `15-room-pot.sql` step to the `entitlements` job in `pr-checks.yml`, mirroring the existing 14 steps. This is exactly the kind of gap `AGENTS.md` §3 ("money and entitlements are enforced in the database — leave them there... `supabase/tests/` executes these rules against a real Postgres") calls out: a real money-adjacent test that isn't currently gating pull requests.

**The one E2E flake was environmental, not a regression.** First run: 21/23 passed; the last two failed with `net::ERR_HTTP_RESPONSE_CODE_FAILURE` because the built `dist/` directory had vanished from disk mid-run (confirmed via `ls`, with 27G of disk still free — nothing in the session explains it). A clean rebuild and rerun passed 23/23. Worth a note for whoever owns CI infra if `dist/` disappearing mid-job is ever observed there too, but there's no evidence this is anything but a one-off sandbox artifact.

**Test-suite growth is expected, not a discrepancy.** `docs/IOS_APP_REVIEW_AUDIT.md` (2026-08-25) cites ~895 tests across ~94 files; the current count (2346 / 222) reflects roughly 2.5x growth from ongoing feature work (Team Battle, King, matchmaking, room pot) in the three weeks since — not a sign anything regressed.

## Bottom line

Nothing found in this pass should block App Store resubmission on its own. The SQL entitlement suite in particular — the part of the codebase enforcing that money and entitlements can't be self-granted — is fully green against a from-scratch database built from the actual migration history. The two action items above (wire up `15-room-pot.sql`, decide on lint gating) are housekeeping, not blockers.
