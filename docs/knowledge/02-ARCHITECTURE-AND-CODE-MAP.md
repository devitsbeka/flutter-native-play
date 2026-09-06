# MyTrivia — architecture and code map

*Where everything lives and why. Written 2026-09-06 from `main` @ `21717c9`.
All counts measured at that commit.*

---

## 1. The stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite (SWC via `@vitejs/plugin-react-swc`) |
| Routing | React Router 6 (`BrowserRouter` in `main.tsx`, routes in `App.tsx`) |
| UI | Tailwind CSS, shadcn/ui over Radix primitives, plus custom "chunky" game components |
| Motion / FX | Framer Motion, GSAP, Lottie (`lottie-react`), `canvas-confetti`, WebM/MP4 overlays |
| 3D | three.js + React Three Fiber + drei — the world map and background scenes |
| Server state | TanStack Query |
| App state | 20 React Context providers; Zustand only inside the world map |
| Forms | react-hook-form + Zod |
| Backend | Supabase — PostgreSQL, Auth, Realtime, Storage, Edge Functions (Deno) |
| Native shell | Capacitor 8 — iOS 15.0+, portrait-locked; Android configured, not generated |
| Web edge | Cloudflare Workers — `worker/index.ts` plus a static assets binding |
| Payments | RevenueCat (`@revenuecat/purchases-capacitor`) native, Stripe web |
| Ads | AdMob via `@capacitor-community/admob`, native only |
| Push | Firebase Cloud Messaging via `@capacitor-firebase/messaging` |
| Analytics | `posthog-js` + Meta Pixel |
| Tests | Vitest, Playwright, and raw SQL suites against Postgres 16 |

**The repository is not Flutter.** The name `flutter-native-play` is a leftover
from an abandoned start. There is no Dart in it.

## 2. Size and shape

```
src/                1,057 .ts/.tsx files · ~280,000 lines
├── components/     398 .tsx across 30 sub-folders
├── pages/          90 .tsx (23 of them under pages/admin)
├── hooks/          130
├── contexts/       20
├── features/       world-map · home-v3 · words
├── config/         24 config modules — the economy and catalog constants
├── utils/          ~95 pure modules (scoring, payouts, routing, formatting)
├── services/       adService · questionService · questionTracker · missionTracker · trackingService
├── locales/        7 catalogs, ~4,500 key/value lines each
├── native/         Capacitor glue and the consent gates
├── integrations/   supabase/client.ts, rpc.ts, types.ts (5,669 lines, generated)
├── assets/         artwork, mascots, Lottie, videos
├── data/           categories.ts, opponents.ts, documentation/
├── dev/            screenshot harnesses, build-flagged out
└── __tests__/      113 top-level test files incl. repo-invariants
supabase/
├── migrations/     337 .sql
├── functions/      76 Deno edge functions + _shared/
└── tests/          17 .sql suites + a shim
worker/             the Cloudflare Worker
ios/App/            the Capacitor iOS project
e2e/                5 Playwright specs
scripts/            build guards, screenshot capture, content generators
docs/               long-form documentation (see 00-MASTER-BRIEF §8)
```

Largest files, as a map of where the mass is:

| Lines | File |
|---|---|
| 5,669 | `src/integrations/supabase/types.ts` (generated) |
| 5,186 / 5,147 | `src/locales/ka.ts` / `en.ts` |
| 4,277 | `src/contexts/TVGameContext.tsx` |
| 3,416 | `src/contexts/MultiplayerContextV2.tsx` |
| 2,189 | `src/components/team/CreateRoomPage.tsx` |
| 1,789 | `src/pages/TeamV2.tsx` |
| 1,773 | `src/pages/KingPage.tsx` |
| 1,670 | `src/pages/Index.tsx` |
| 1,570 | `src/pages/TVHostController.tsx` |
| 1,429 | `src/hooks/useMissions.ts` |
| 1,392 | `src/components/lobby/UniversalLobby.tsx` |

## 3. The provider tree

From `src/App.tsx`, outermost first:

```
LanguageProvider
└ AuthProvider                (+ LanguageFollowsCountry)
  └ PostHogProvider
    └ DeveloperModeProvider   (admin-only reveal of unreleased modes)
      └ VipProvider
        └ SoundProvider
          └ FriendsProvider
            └ PlayGuardProvider
              └ PendingChallengesProvider
                └ NotificationsProvider
                  └ OnboardingProvider
                    └ NotificationModalProvider
                      └ BackgroundGenerationProvider
                        └ PlayerProfileProvider
                          └ AvatarModalProvider
                            └ SplashScreen
                              └ MotionConfig reducedMotion="user"
                                └ TooltipProvider
                                  └ <Routes>
```

Order is load-bearing. `LanguageFollowsCountry` sits inside `AuthProvider`
because `LanguageProvider` is outside it; `DeveloperModeProvider` is inside
`AuthProvider` because it asks `has_role(admin)` for the signed-in user.
`MotionConfig reducedMotion="user"` is not decoration — the app runs hundreds of
infinite decorative animations and none of them asked the OS setting before.

**Mounted globally, outside `<Routes>`** (so they follow a player anywhere):

`Toaster` (single Sonner instance, `visibleToasts={1}`, z-index above the
full-screen game modals) · `OfflineBanner` · `GlobalJoinRequestGate` ·
`GlobalGameInviteGate` · `GlobalFriendRequestGate` · `GlobalSplineBackground` ·
`UserPresenceTracker` · `ScrollLockGuard` · `AutoplayRescue` · `PushRegistrar` ·
`AdminAIPromptSync` · `StaleAnimationCleanup` · `ScenePortraitHealer` ·
`ReducedMotionGuard` · `HiddenWorkGuard` · `FakeFriendRequestAutoAccept` ·
`FreshBuildGuard` · `RoundStartWatcher` (outside `<Routes>` on purpose —
`MultiplayerProviderV2` is mounted inside the `/team` route, so nothing followed
a player who wandered off while waiting for the host to start).

`VideoPreloader` auto-starts on import; there is no component for it.

## 4. Contexts, and what each owns

| Context | Owns |
|---|---|
| `AuthContext` | Supabase session, profile, sign-in/up/out |
| `LanguageContext` | Active language, `t()`, persistence |
| `VipContext` | PRO/PRO+ status, realtime-synced with a localStorage cache so the badge does not flicker on reload |
| `SoundContext` | Sound, music and vibration; haptics wired in |
| `FriendsContext` | Friend graph and requests |
| `PlayGuardContext` | The free-play gate in front of every mode |
| `PendingChallengesContext` | Incoming async challenges |
| `NotificationsContext` | Realtime notification feed and unread counts |
| `NotificationModalContext` | Celebratory/alert modals, distinct from toasts |
| `OnboardingContext` | The staged signup flow |
| `BackgroundGenerationContext` | Avatar/cover AI jobs running in the background |
| `PlayerProfileContext` | The app-wide player profile modal |
| `AvatarModalContext` | The avatar studio modal |
| `DeveloperModeContext` | Admin switch revealing dark-launched modes |
| `GameContext` | Quick Game / VS |
| `MultiplayerContextV2` | Classic rooms, realtime, answers, payouts (3,416 lines) |
| `TeamBattleContext` | Team Battle match state |
| `TVGameContext` | TV mode — the largest subsystem (4,277 lines) |
| `TVMockContext` | Feeds `/tv-showcase` without a live session |
| `DemoGameContext` | The demo/sample player surfaces |

## 5. Route map

Measured from `App.tsx`. Public unless marked.

**Core**

| Route | Purpose |
|---|---|
| `/` | Home — guest landing or logged-in dashboard (`Index.tsx`) |
| `/auth`, `/forgot-password`, `/reset-password` | Sign in, sign up, recovery |
| `/loading`, `/trivialoader` | Loading and splash surfaces |
| `/onboarding` | Onboarding (admin-gated preview) |
| `/discover` | Category discovery and the explore feed |
| `/notifications`, `/streak` | Notification feed; the streak page |
| `/profile`, `/profile/:userId` | Own account; public profile |
| `/settings` (+ `/name`, `/password`, `/privacy`) | Settings |
| `/support`, `/delete-account` | Help; store-compliant deletion page |
| `/privacy-policy`, `/terms` (+ `-en`, + `/:lang`) | Legal, per-language |
| `*` | 404 |

**Playing**

| Route | Purpose |
|---|---|
| `/play` | The game-type chooser, rendered from the registry |
| `/play/queue` | Global matchmaking queue |
| `/play/:categoryId/:levelId` | Category level gameplay |
| `/category/:categoryId` | Category levels grid |
| `/game` | Quick Game / VS |
| `/team` | Multiplayer hub, rooms, my trivia |
| `/create-room` | Room creation |
| `/lobby/:gameType` | The universal lobby |
| `/trivia/:triviaId`, `/collection/:collectionId` | Trivia and collection lobbies |
| `/room/:code`, `/i/:code` | Room join redirect; invite link |
| `/team-battle`, `/king` | Team Battle arena; King lounge (both dark-launched) |
| `/words`, `/words/:code` | Words solo and with a friend |
| `/challenge/:code` | Public challenge landing, no account needed |
| `/tv`, `/tv/:code`, `/tv/host/:sessionId` | TV lobby, display, host controller |
| `/join`, `/join/:code`, `/join/session/:sessionId`, `/controller/:code` | Phone controller join |

**Commerce** — `/power-ups` (the shop), `/shop`, `/vip` (the paywall),
`/shop/success`, `/shop/cancel`, `/leaderboards`.

**Admin** — `/admin` plus 23 sub-routes; included only when
`VITE_INCLUDE_ADMIN !== 'false'`.

**Dev / preview** — `/styleguide`, `/all-buttons`, `/modals`, `/tv-showcase`,
`/docs`, `/onboarding-preview`, `/sampledemotv`, `/sampledemoplayer`,
`/dev/home`, `/dev/lobby`, `/dev/v2`, `/newui`, `/newui/path/:pathId`, `/v3`
(redirects to `/newui`). Included only when `import.meta.env.DEV` or
`VITE_INCLUDE_DEV_PAGES=true`.

`/docs` in particular renders the full internal map — every table, RPC, edge
function and hook — which is why it is excluded at **build** time and not merely
route-guarded: a guarded route still ships the chunk, and the chunk is the leak.

## 6. Feature folders

Three parts of the app are self-contained under `src/features/`:

- **`world-map/`** — the 3D interactive world map. A procedurally assembled,
  seed-deterministic 2.5D island world in React Three Fiber, with a fixed-axis
  cinematic camera, quality tiers, reduced-motion support and a painted-map
  fallback when WebGL is unavailable. Sub-folders: `camera`, `nodes`, `paths`,
  `regions`, `procedural`, `schemas`, `state`, `styles`, `utils`, `data`.
- **`home-v3/`** — the new-UI home preview at `/newui`. Path cards and towers,
  category rows, a PRO hero and benefits, sale banner, tinted icons, promo and
  theming modules. A preview surface: the chunk loads only when visited and it
  exposes nothing the app does not already show.
- **`words/`** — the Words mode: board, letter wheel, luck wheel, scrapbook,
  per-language generated level files, prize table, storage and the realtime room
  hook. No server half.

## 7. Performance architecture

- **Route-level code splitting.** Almost every page is `React.lazy`; only
  `Index`, `Auth`, `NotFound` and `Loading` are eager. Every lazy route has a
  skeleton (`PageSkeleton`).
- **Build-time exclusion**, not route guards, for the admin console
  (`VITE_INCLUDE_ADMIN=false`) and dev pages (`VITE_INCLUDE_DEV_PAGES`).
- **Prefetch hooks** for navigation, shop, leaderboard and explore; image
  preloading for question icons; a video preloader and a `videoLoadQueue`.
- **Video is streamed, not bundled**, on iOS: `scripts/prune-ios-videos.mjs`
  strips all but a handful, and the rest load from `https://mytrivia.io/videos/…`.
  See `05-PLATFORMS-DEPLOY-AND-RELEASE.md` for the byte-range caveat.
- **Opaque surfaces below `md`.** `backdrop-filter` is cheap in a desktop browser
  and pathological in WKWebView — under load the compositor hands back stale or
  empty tiles, which reads as "the whole page is glitching". Surfaces are opaque
  below `md` and glass at `md` and up. The rule is a **width, not a platform**,
  because iOS Safari runs the same engine as the app, so a Capacitor check would
  have fixed the app and left mobile web broken. Written up in
  `docs/why-mobile-surfaces-are-opaque.md`; the classes live at the call sites as
  `bg-… md:bg-…/… md:backdrop-blur-…`, so there is no runtime branch to get wrong.

## 8. Conventions worth matching

- **One policy, one file.** Scoring (`utils/scoring.ts`), payouts
  (`utils/multiplayerPayout.ts`), category access (`utils/categoryAccess.ts`),
  prices (`config/pricing.ts`), bundle contents (`config/bundleContents.ts`),
  gem packs (`config/gemPacks.ts`) — each is the single source of truth, and in
  several cases a test reads the SQL migration to make sure the client copy and
  the server rule still agree.
- **Comments explain the incident, not the code.** Files across this repo carry
  long header comments describing what went wrong before, why the current shape
  exists, and what not to "improve". They are the institutional memory; read them
  before changing behaviour, and write them the same way.
- **Toasts and shares go through helpers** (`src/lib/toast.ts`,
  `utils/shareLink.ts`), enforced by tests, so nothing bypasses the single
  renderer or the canonical URL.
- **Links are built from `SITE_URL`**, never from `window.location.origin`, so a
  shared link never points at localhost or a preview deploy.
- **Standalone pages own their scrolling** — see
  `06-RULES-GOTCHAS-AND-HISTORY.md` §2.
- **Guards fail open.** Ads, play bookkeeping and the rewarded gate are all built
  so that infrastructure failure lets the player play, rather than trapping them
  behind a spinner.
- **Dual-path hooks for undeployed migrations.** Because migrations land through
  Lovable on their own schedule, several hooks (`usePlayLimit`,
  `useStreakMilestones`, `useGameTypes`, `adjust_power_up`'s fallback,
  `categoryAccess`) detect a missing column or a PostgREST "no such function" and
  fall back to a legacy rule, switching over automatically once the migration
  appears. **Neither deploy ordering can lock a player out.** Match this pattern
  when adding anything that depends on a new migration.

## 9. Testing

| Layer | What |
|---|---|
| Unit (Vitest) | 163 files under `src/`, covering economy config, play limits, locales parity, payouts, world-map generation, avatar studio, room routing, scoring purity, translation padding, and much of the product's decided behaviour |
| Repo invariants | `src/__tests__/repo-invariants.test.ts` — the CI trip-wire; see `06-RULES-GOTCHAS-AND-HISTORY.md` §4 |
| E2E (Playwright) | `public-routes.spec.ts`, `tv-smoke.spec.ts`, `toasts-visible.spec.ts`, `overlay-containment.spec.ts` |
| SQL | 17 suites under `supabase/tests/` executed against a real Postgres 16 in CI — entitlements, currency, PRO seats, room rounds, head-to-head, invite links, category levels, game types, most-likely votes, team battle, king, matchmaking, public rooms, streak milestones |
| Static | ESLint 9 + typescript-eslint, `tsc --noEmit` on both tsconfigs, Qodana |

The last full run recorded in the repo's own documentation was **113 files,
1,199 tests, all passing** (2026-08-26); the tree has grown since.

## 10. Local commands

```sh
npm ci              # npm, never bun alone — see the rules doc
npm run dev         # Vite dev server on :8080
npm test            # vitest run
npm run typecheck   # tsc --noEmit on both tsconfigs
npm run lint
npm run test:e2e    # Playwright
npm run build       # web build (refuses without the Supabase env vars)
npm run build:ios   # native guard → build → prune videos → verify bundle → cap sync ios
```

`build:ios` runs `scripts/verify-ios-native.mjs` **first**, so a missing or
wrong `GoogleService-Info.plist` fails before Xcode rather than inside it, and
`scripts/verify-ios-bundle.mjs` afterwards, which asserts no admin console and
no pre-ATT tracking made it into the bundle.
