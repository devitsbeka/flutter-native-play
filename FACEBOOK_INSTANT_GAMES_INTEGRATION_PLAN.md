# Facebook Instant Games Integration Plan

## Executive Summary

This document outlines the high-level plan for bringing World Quizzes to **Facebook Instant Games** using the mandatory **NEZP (Network Enabled Zero Permissions)** model. The goal is to create a Facebook-specific build target from the existing React/TypeScript codebase that runs inside Facebook's iframe environment while sharing the same Supabase backend, question database, and game logic with the web and native (iOS/Android) versions.

**Key deadline:** All new Instant Games must use NEZP as of August 1, 2025. Web Games are sunset entirely by September 30, 2026.

---

## Platform Context

| Property | Value |
|---|---|
| Platform | Facebook Instant Games (NEZP) |
| SDK | FBInstant SDK v8.0 |
| Runtime | HTML5 inside Facebook iframe |
| Max bundle size | 200 MB |
| Recommended initial load | < 1 MB |
| Target load time | < 5 seconds |
| Revenue split | 70% developer / 30% Facebook |
| Active user base | ~350M monthly players |

---

## Architecture Overview

```
                    ┌──────────────────────────────────────────────┐
                    │              Supabase Backend                │
                    │  ┌──────────┐ ┌──────────┐ ┌─────────────┐ │
                    │  │ Auth     │ │ Database │ │ Edge        │ │
                    │  │ Service  │ │ (Postgres)│ │ Functions   │ │
                    │  └────▲─────┘ └────▲─────┘ └──────▲──────┘ │
                    └───────┼────────────┼──────────────┼─────────┘
                            │            │              │
              ┌─────────────┼────────────┼──────────────┼──────────────┐
              │             │            │              │              │
     ┌────────┴───┐  ┌─────┴─────┐ ┌────┴─────┐ ┌─────┴──────┐      │
     │  Web App   │  │ FB Instant│ │ iOS App  │ │ Android    │      │
     │ (Vite SPA) │  │ Games    │ │(Capacitor)│ │(Capacitor) │      │
     │            │  │ (Vite FB)│ │          │ │            │      │
     └────────────┘  └──────────┘ └──────────┘ └────────────┘      │
                                                                     │
     All clients share: question DB, game logic, profiles, progress  │
     ─────────────────────────────────────────────────────────────────┘
```

The Facebook Instant Games version is a **separate Vite build target** that:
- Shares the same `src/` codebase (components, hooks, contexts, services)
- Has a Facebook-specific entry point and platform adapter layer
- Replaces auth, payments, and social APIs with FBInstant equivalents
- Produces an optimized, code-split bundle for the iframe environment

---

## Phase 1: Foundation & Platform Adapter Layer

### 1.1 Create a Platform Abstraction Layer

Introduce a `PlatformAdapter` interface so all platform-specific code (auth, payments, social, ads) is accessed through a single abstraction. Each platform implements this interface.

```
src/
  platform/
    types.ts              # PlatformAdapter interface definition
    web.ts                # Current web implementation (default)
    facebook.ts           # Facebook Instant Games implementation
    capacitor.ts          # iOS/Android native implementation
    index.ts              # Auto-selects adapter based on environment
```

**Interface surface area:**

```typescript
interface PlatformAdapter {
  // Identity
  readonly platformId: 'web' | 'facebook' | 'ios' | 'android';

  // Authentication
  initialize(): Promise<void>;
  getPlayer(): Promise<PlatformPlayer>;
  signIn(): Promise<AuthResult>;
  signOut(): Promise<void>;

  // Social
  getFriends(): Promise<PlatformFriend[]>;
  shareScore(score: number, text: string): Promise<void>;
  postLeaderboardScore(board: string, score: number): Promise<void>;
  getLeaderboard(board: string): Promise<LeaderboardEntry[]>;
  invitePlayers(text: string): Promise<void>;

  // Monetization
  showRewardedAd(): Promise<AdResult>;
  showInterstitialAd(): Promise<void>;
  purchaseProduct(productId: string): Promise<PurchaseResult>;
  getProducts(): Promise<Product[]>;
  restorePurchases(): Promise<PurchaseResult[]>;

  // Platform capabilities
  supportsFeature(feature: PlatformFeature): boolean;

  // Analytics / Lifecycle
  logEvent(name: string, params?: Record<string, unknown>): void;
  onPause(callback: () => void): void;
  onResume(callback: () => void): void;
}
```

**Why this matters for the ecosystem:** Every future platform (iOS, Android, Facebook, potentially others) plugs into the same interface. Game logic never directly calls `FBInstant.*` or Capacitor APIs - it calls `platform.showRewardedAd()` and the adapter handles the rest. This also makes testing trivial with a mock adapter.

### 1.2 Facebook-Specific Entry Point

Create a separate Vite entry point for the Facebook build:

```
web/
  index.html              # Standard web entry (existing)
  fb-instant.html         # Facebook Instant Games entry
  fbapp-config.json       # FB Instant Games config (bundled in root)
```

The FB entry point:
1. Loads the FBInstant SDK v8.0 from Meta's CDN
2. Calls `FBInstant.initializeAsync()` before mounting React
3. Reports loading progress via `FBInstant.setLoadingProgress()`
4. Calls `FBInstant.startGameAsync()` once React is hydrated
5. Mounts the app with the Facebook platform adapter selected

### 1.3 Vite Build Configuration

Add a Facebook-specific Vite config:

```
vite.config.fb.ts         # Facebook build config
```

This config:
- Uses `fb-instant.html` as the entry point
- Applies aggressive code splitting (game modes as separate chunks)
- Enables asset compression and tree-shaking
- Excludes unused platform code (Capacitor, AdMob, RevenueCat)
- Inlines critical CSS for sub-5-second load
- Sets `base: './'` for relative asset paths (required in iframe)
- Produces a zip-ready `dist-fb/` output directory

---

## Phase 2: Authentication Bridge

### 2.1 The Problem

The game currently authenticates via Supabase Auth (email/password, Google OAuth, Apple Sign-in). Facebook Instant Games provides its own identity via `FBInstant.player.getID()` which returns a Facebook Application-Scoped ID - not compatible with Supabase Auth out of the box.

### 2.2 The Solution: Server-Side Token Exchange

```
Player opens game on Facebook
        │
        ▼
FBInstant.initializeAsync()
        │
        ▼
FBInstant.player.getSignedPlayerInfoAsync('my-nonce')
        │
        ▼  { playerID, signature }
        │
        ▼
POST /functions/v1/facebook-auth
        │
        ▼  Edge Function verifies signature using FB App Secret
        │  Looks up or creates Supabase user linked to FB player ID
        │  Returns Supabase JWT
        │
        ▼
Client uses Supabase JWT for all subsequent API calls
```

**New Edge Function: `facebook-auth`**
- Receives `{ playerID, signature, nonce }` from client
- Verifies the HMAC-SHA256 signature against the Facebook App Secret
- Checks `facebook_player_links` table for existing mapping
- If new player: creates Supabase user, profile, and link record
- If returning player: retrieves existing Supabase user
- Issues a Supabase JWT via `supabase.auth.admin.createUser()` or custom JWT signing
- Returns the token to the client

**New database table:**
```sql
CREATE TABLE facebook_player_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facebook_player_id TEXT UNIQUE NOT NULL,
  supabase_user_id UUID REFERENCES auth.users(id) NOT NULL,
  facebook_name TEXT,
  facebook_photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_login_at TIMESTAMPTZ DEFAULT now()
);
```

### 2.3 Account Linking (Cross-Platform)

Players who already have a World Quizzes account on web/mobile can link their Facebook identity:

1. Player logs into Facebook Instant Games (auto-creates FB-linked account)
2. Player taps "Link Existing Account" in settings
3. Player enters their existing email/password or uses Google OAuth
4. Backend merges the two accounts: migrates all progress, friends, currency to the primary account
5. The `facebook_player_links` record is updated to point to the existing `supabase_user_id`

This ensures a single player identity across all platforms.

---

## Phase 3: Social Features Integration

### 3.1 Mapping Existing Social Features to FB Instant Games

| World Quizzes Feature | Facebook Implementation |
|---|---|
| Friend list | `FBInstant.player.getConnectedPlayersAsync()` to discover FB friends who play, merged with existing friends system |
| Leaderboards | Dual-write: post to both Supabase leaderboards AND `FBInstant.leaderboard` for FB-native display |
| Game invitations | `FBInstant.context.chooseAsync()` for inviting players through Messenger/Feed |
| Share score | `FBInstant.shareAsync()` with custom image + score card |
| Multiplayer rooms | Existing Supabase Realtime rooms work unchanged; FB context ID used as room source |
| Online presence | Existing Supabase presence channels work unchanged |
| Chat | Existing room chat works unchanged |

### 3.2 FB-Specific Social Enhancements

- **Context-Aware Play:** When a player opens the game from a Messenger thread or Facebook group, `FBInstant.context.getID()` identifies the context. Use this to auto-create or join a room with those players.
- **Tournaments:** Map the existing VS mode to `FBInstant.tournament.createAsync()` for viral score-chasing on Facebook feeds.
- **Update Messages:** After completing a match, send an update back to the Facebook context using `FBInstant.updateAsync()` with the score, encouraging re-engagement.
- **Matchmaking:** Use `FBInstant.matchPlayerAsync()` as a supplementary matchmaking channel alongside the existing system.

### 3.3 Friend System Bridging

Facebook friends who play the game are surfaced alongside the existing friends list. The backend maintains a unified view:

```
Friend source: 'manual' | 'facebook'
```

When listing friends, the UI queries both the existing `friendships` table and calls `getConnectedPlayersAsync()`, deduplicating by linked accounts. FB friends who haven't linked their account show a simplified profile (FB name + photo, no in-game stats until they play).

---

## Phase 4: Monetization

### 4.1 Ad Integration

Facebook Instant Games supports:
- **Interstitial Ads** -- Show between matches (replaces the current simulated web ads)
- **Rewarded Video Ads** -- Watch to earn 2 free plays (same mechanic as current AdMob implementation)

The Platform Adapter's `showRewardedAd()` method uses:
- **Facebook build:** `FBInstant.getRewardedVideoAsync(placementId)` then `.showAsync()`
- **Web build:** Current simulated ad behavior
- **Native build:** AdMob via Capacitor plugin

VIP users continue to skip all ads regardless of platform - this is enforced server-side.

### 4.2 In-App Purchases

Facebook's IAP system replaces Stripe for the Facebook build:

```javascript
// Product catalog defined in Facebook Developer Dashboard
FBInstant.payments.purchaseAsync({
  productID: 'gem_pack_100',
  developerPayload: JSON.stringify({ user_id: supabaseUserId })
});
```

**New Edge Function: `facebook-purchase-webhook`**
- Validates purchase receipts server-side via Facebook's Graph API
- Credits gems/coins to the player's Supabase profile
- Records transaction in `purchase_transactions` with `platform: 'facebook'`
- Consumes the purchase to prevent re-delivery

**Product mapping:**
- All gem packs from the existing Stripe catalog are registered as Facebook IAP products
- VIP subscriptions need evaluation -- FB Instant Games doesn't support recurring subscriptions natively, so VIP may need to be sold as time-limited consumable packs (e.g., "7 days of VIP") on this platform

### 4.3 Revenue Tracking

Extend the existing `purchase_transactions` table with a `platform` column:

```sql
ALTER TABLE purchase_transactions ADD COLUMN platform TEXT DEFAULT 'web';
-- Values: 'web', 'facebook', 'ios', 'android'
```

The admin dashboard can then slice revenue by platform.

---

## Phase 5: UI/UX Adaptations

### 5.1 Navigation Changes

Facebook Instant Games run in a constrained iframe. Several UI elements need adjustment:

- **Remove browser-specific navigation:** No URL bar, no back button. Implement a custom back-stack or simplify navigation to a hub-and-spoke model.
- **Remove authentication UI:** No login/signup screens. Authentication is automatic via Facebook identity. Show "Link Account" option in settings instead.
- **Remove Google/Apple sign-in buttons:** Not applicable in FB context.
- **Adapt the header:** Remove any "install app" prompts. Replace with FB-appropriate CTAs.

### 5.2 Game Mode Availability

Not all game modes may be appropriate or technically feasible on Facebook initially:

| Mode | FB Status | Notes |
|---|---|---|
| VS Mode (1v1) | Available | Core experience. Use FB matchmaking as additional channel. |
| Category Mode | Available | Progressive single-player works as-is. |
| TV Mode | Deferred | Requires separate host device; not a natural fit for FB iframe. |
| Multiplayer Rooms | Available | Supabase Realtime works in iframe. Deep-link rooms via FB context. |
| User Quizzes | Available | Creating and sharing quizzes maps well to FB social graph. |

### 5.3 Loading Experience

Facebook provides its own loading bar. The integration must:
1. Report real loading progress via `FBInstant.setLoadingProgress(0-100)`
2. NOT show a secondary loading screen (violates FB guidelines)
3. Reach interactive state within 5 seconds

This requires measuring chunk download progress and mapping it to the FB loading API.

---

## Phase 6: Bundle Optimization

### 6.1 The Challenge

The current build is a full SPA with 47+ pages, heavy animation libraries (Three.js, GSAP, Framer Motion, Lottie), and a globe visualization (Cobe). This far exceeds the recommended 1 MB initial download for FB Instant Games.

### 6.2 Strategy: Aggressive Code Splitting + Lazy Loading

**Tier 0 (Initial bundle, target < 1 MB):**
- React core + Router
- Platform adapter (Facebook)
- FBInstant initialization + loading bridge
- Home/lobby screen (minimal version)
- Core game engine (question display, answer input, scoring)

**Tier 1 (Loaded after startGameAsync, < 3 MB):**
- VS Mode full UI
- Category Mode
- Power-up system
- Leaderboards
- Friend list

**Tier 2 (On-demand, loaded per feature):**
- Multiplayer rooms + chat
- User quiz creation
- Settings/profile editing
- Admin pages (excluded entirely from FB build)
- Three.js / Cobe globe (excluded from FB build)
- Lottie animations (replaced with CSS alternatives)

### 6.3 Excluded from Facebook Build

These features/libraries add significant bundle weight and are not needed:
- **Three.js + react-three-fiber + Cobe** (globe visualization) -- replace with a static map image or simple Leaflet map
- **Capacitor plugins** -- not applicable in iframe
- **RevenueCat** -- replaced by FB IAP
- **AdMob** -- replaced by FB ads
- **Apple Sign-in** -- not applicable
- **Service Worker** -- FB has its own caching
- **Admin pages** -- never needed in player-facing FB build
- **TV Mode** -- deferred from initial launch

### 6.4 Build Script

```bash
# Standard web build
npm run build

# Facebook Instant Games build
npm run build:fb    # Uses vite.config.fb.ts
npm run package:fb  # Zips dist-fb/ for upload to FB dashboard
```

---

## Phase 7: Testing & Deployment

### 7.1 Local Development

1. Run `npm run dev:fb` which starts Vite with the Facebook config
2. Use Facebook's embedded browser testing tool (requires HTTPS)
3. Use a mock FBInstant SDK for local testing without Facebook

### 7.2 Facebook Developer Dashboard Setup

1. Create a new Facebook App at developers.facebook.com
2. Add the "Instant Games" product
3. Configure App ID and secret (store in Supabase vault, never client-side)
4. Set up IAP product catalog mirroring existing gem packs
5. Configure ad placements (interstitial + rewarded video)
6. Set up leaderboard configurations matching existing categories
7. Configure NEZP settings (mandatory for new apps)

### 7.3 Deployment Pipeline

```
Code change
    │
    ▼
GitHub push to main
    │
    ├──► Standard web deploy (Lovable) -- existing pipeline
    │
    └──► Facebook build pipeline (new):
            1. npm run build:fb
            2. npm run package:fb (creates fb-build.zip)
            3. Upload to Facebook via Graph API:
               POST /{app-id}/assets
            4. Publish new version in FB Developer Dashboard
```

Eventually automate step 3-4 via CI/CD using the Facebook Graph API's hosting endpoint.

### 7.4 Testing Checklist

- [ ] FBInstant initialization completes without errors
- [ ] Player identity is correctly bridged to Supabase
- [ ] Existing web players can link their Facebook account
- [ ] VS Mode plays correctly inside the iframe
- [ ] Category Mode progression syncs across platforms
- [ ] Rewarded video ads display and grant rewards
- [ ] IAP purchases credit gems correctly
- [ ] Leaderboard scores appear on both FB and in-game leaderboards
- [ ] Share/invite flows post to Facebook correctly
- [ ] Tournament creation and score posting works
- [ ] Initial bundle loads in under 5 seconds
- [ ] No CSP violations in the Facebook iframe
- [ ] All Supabase Realtime subscriptions work in iframe context
- [ ] VIP benefits are enforced server-side regardless of platform

---

## Implementation Priority & Sequencing

```
Phase 1: Foundation (Platform Adapter + Build Config)
  │
  ├── Can be done independently of other platforms
  ├── Benefits iOS/Android development by establishing the pattern
  │
  ▼
Phase 2: Authentication Bridge
  │
  ├── Depends on: Phase 1 adapter layer
  ├── Creates: facebook-auth edge function + player links table
  │
  ▼
Phase 3: Core Game (VS + Category modes running on FB)
  │
  ├── Depends on: Phase 2 (auth must work)
  ├── Bundle optimization work happens here
  │
  ▼
Phase 4: Monetization (Ads + IAP)
  │
  ├── Depends on: Phase 3 (game must be playable first)
  ├── Creates: facebook-purchase-webhook edge function
  │
  ▼
Phase 5: Social Features (Leaderboards, Sharing, Tournaments)
  │
  ├── Depends on: Phase 3
  ├── Can run in parallel with Phase 4
  │
  ▼
Phase 6: Polish, Testing, Launch
  │
  ├── UI/UX refinement for iframe context
  ├── Performance optimization
  ├── Facebook review process
  │
  ▼
Phase 7: Post-Launch (Multiplayer rooms, advanced social, cross-play)
```

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Bundle size too large for 5s load target | Players abandon during loading | Aggressive code splitting; exclude heavy libraries (Three.js, Cobe); lazy load all non-critical features |
| CSP restrictions block Supabase connections | Game non-functional | Test early in iframe; request Facebook whitelist Supabase domains if needed; consider proxying through a custom domain |
| Facebook IAP doesn't support subscriptions | VIP revenue loss on FB | Sell VIP as consumable time-packs (1-day, 7-day, 30-day) |
| Account linking complexity | Players lose progress | Implement server-side merge carefully with dry-run testing; keep both accounts intact until merge is confirmed |
| FB platform changes or further deprecation | Wasted development effort | Platform adapter ensures FB-specific code is isolated; easy to remove without affecting other platforms |
| Revenue split (30% to Facebook) | Lower margins | Factor into pricing; FB's 350M user base may compensate with volume |
| NEZP restrictions limit data access | Reduced personalization | Design for minimal data requirements from the start |

---

## Files to Create/Modify

### New Files
| File | Purpose |
|---|---|
| `src/platform/types.ts` | PlatformAdapter interface and shared types |
| `src/platform/index.ts` | Platform detection and adapter factory |
| `src/platform/web.ts` | Web platform adapter (wraps existing behavior) |
| `src/platform/facebook.ts` | Facebook Instant Games adapter |
| `src/platform/capacitor.ts` | Native iOS/Android adapter (future) |
| `src/platform/mock.ts` | Mock adapter for testing |
| `web/fb-instant.html` | Facebook build entry HTML |
| `web/fbapp-config.json` | Facebook Instant Games config |
| `vite.config.fb.ts` | Facebook-specific Vite build config |
| `supabase/functions/facebook-auth/index.ts` | FB auth token exchange |
| `supabase/functions/facebook-purchase-webhook/index.ts` | FB IAP webhook |
| `supabase/migrations/xxx_facebook_player_links.sql` | Account linking table |
| `scripts/package-fb.sh` | Build + zip script for FB deployment |

### Modified Files
| File | Change |
|---|---|
| `src/contexts/AuthContext.tsx` | Use PlatformAdapter for auth instead of direct Supabase auth calls |
| `src/services/adService.ts` | Route through PlatformAdapter instead of direct AdMob calls |
| `src/contexts/VipContext.tsx` | Add platform-aware purchase routing |
| `src/contexts/FriendsContext.tsx` | Merge FB friends with existing friends |
| `src/components/game/*` | No changes needed (pure game logic) |
| `package.json` | Add `build:fb`, `dev:fb`, `package:fb` scripts |

---

## Key Design Principles

1. **Shared backend, platform-specific frontend skin.** All platforms talk to the same Supabase database, same Edge Functions, same question pool. The PlatformAdapter pattern ensures platform code is isolated.

2. **Server-side is the source of truth.** VIP status, currency balances, purchase validation, and leaderboard integrity are all enforced server-side. No client can fake being VIP or grant themselves coins.

3. **Progressive feature rollout.** Launch with VS Mode + Category Mode. Add social features, multiplayer, and user quizzes incrementally. Don't try to ship everything on day one.

4. **Performance is a feature.** Facebook users expect instant load times. The bundle must be under 1 MB for initial load. Every library inclusion must justify its weight.

5. **Account portability.** A player's progress, friends, and purchases must be accessible from any platform. The account linking system is critical for cross-platform retention.
