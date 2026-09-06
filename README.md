# MyTrivia

A party quiz game — play solo, host friends in live rooms, or put the game on
a TV. React + Vite + Capacitor on a Supabase backend; ships as a web app
(Cloudflare Workers) and an iOS app.

## Working on it

```sh
npm ci          # npm, not bun — CI runs `npm ci` (see AGENTS.md §2)
npm run dev     # local dev server on :8080
npm test        # vitest
npm run typecheck
npm run build:ios   # iOS web bundle + guards + cap sync (needs GoogleService-Info.plist)
```

**Read `AGENTS.md` first.** More than one agent edits this repo, and that file
is the short list of things that have actually broken when someone skipped it —
lockfiles, the Supabase types file, how money is enforced, and how anything
server-side actually deploys (through Lovable, not the CLI).

## Where things are

| | |
|---|---|
| App code | `src/` — pages, components, hooks; native glue in `src/native/` |
| iOS shell | `ios/App/` — Capacitor; config in `capacitor.config.ts` |
| Backend | `supabase/` — migrations, edge functions, SQL tests |
| Web edge | `worker/` — the Cloudflare Worker in front of the static build |
| Release state | `docs/IOS_APP_REVIEW_AUDIT.md` — the audit passes and the pre-submission action ledger |
| Whole-product briefing | `docs/knowledge/` — eight documents covering the product, code, backend, economy, release, rules and go-to-market, written to be uploaded into an AI assistant's project knowledge |
| Live state | `docs/OPERATIONS.md` — goals, funnel, running loops, open threads, decisions and run log |

## Deploys

- **Web:** merge to `main` → `.github/workflows/deploy.yml` (typecheck, tests,
  build, Playwright smokes, then Cloudflare).
- **Server (edge functions, migrations):** through **Lovable** — merging to
  `main` deploys nothing server-side. See `AGENTS.md` §4a.
- **iOS:** `npm run build:ios`, then archive in Xcode on a Mac.
