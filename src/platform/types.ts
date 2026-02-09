/**
 * Platform Adapter Interface
 *
 * Abstracts all platform-specific APIs (auth, ads, payments, social)
 * so game logic never directly calls FBInstant, Capacitor, or browser APIs.
 *
 * Each platform (web, facebook, ios, android) implements this interface.
 */

// ── Identity ──────────────────────────────────────────────────────────

export interface PlatformPlayer {
  /** Platform-scoped player ID (e.g. Facebook app-scoped ID, Supabase user ID) */
  id: string;
  /** Display name from the platform */
  name: string | null;
  /** Avatar/photo URL from the platform */
  photoUrl: string | null;
}

export interface AuthResult {
  /** Supabase JWT access token for all subsequent API calls */
  accessToken: string;
  /** Supabase refresh token */
  refreshToken: string;
  /** The linked Supabase user ID */
  userId: string;
}

// ── Social ────────────────────────────────────────────────────────────

export interface PlatformFriend {
  id: string;
  name: string;
  photoUrl: string | null;
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  playerName: string;
  playerPhotoUrl: string | null;
  score: number;
}

// ── Monetization ──────────────────────────────────────────────────────

export interface AdResult {
  /** Whether the user watched the full ad and earned the reward */
  rewarded: boolean;
  /** Reward type identifier */
  rewardType?: string;
  /** Reward amount */
  rewardAmount?: number;
}

export interface Product {
  productId: string;
  title: string;
  description: string;
  /** Price string formatted for display (e.g. "$4.99") */
  priceDisplay: string;
  /** Price in smallest currency unit (e.g. cents) */
  priceAmount: number;
  priceCurrency: string;
}

export interface PurchaseResult {
  success: boolean;
  productId: string;
  /** Platform-specific purchase token for server-side verification */
  purchaseToken?: string;
  /** Developer-provided payload echoed back */
  developerPayload?: string;
}

// ── Platform Capabilities ─────────────────────────────────────────────

export type PlatformFeature =
  | 'rewarded_ads'
  | 'interstitial_ads'
  | 'iap'
  | 'subscriptions'
  | 'push_notifications'
  | 'haptics'
  | 'camera'
  | 'social_share'
  | 'leaderboards'
  | 'tournaments'
  | 'friend_discovery'
  | 'context_play';   // FB-specific: playing within a Messenger thread / group

export type PlatformId = 'web' | 'facebook' | 'ios' | 'android';

// ── Main Interface ────────────────────────────────────────────────────

export interface PlatformAdapter {
  readonly platformId: PlatformId;

  // ── Lifecycle ──
  /** One-time initialization. Call before anything else. */
  initialize(): Promise<void>;

  // ── Authentication ──
  /** Get the current platform player identity (before Supabase auth) */
  getPlayer(): Promise<PlatformPlayer | null>;
  /**
   * Platform-specific sign-in flow.
   * On Facebook: verifies signed player info and exchanges for Supabase JWT.
   * On web: no-op (Supabase auth is handled directly by AuthContext).
   * Returns null if the platform doesn't handle its own auth.
   */
  signIn(): Promise<AuthResult | null>;

  // ── Social ──
  /** Discover friends who also play the game on this platform */
  getConnectedFriends(): Promise<PlatformFriend[]>;
  /** Share a score/result card to the platform's social feed */
  shareScore(score: number, text: string): Promise<void>;
  /** Post a score to a platform-managed leaderboard */
  postLeaderboardScore(boardName: string, score: number): Promise<void>;
  /** Read entries from a platform-managed leaderboard */
  getLeaderboard(boardName: string, count?: number): Promise<LeaderboardEntry[]>;
  /** Invite friends to play */
  invitePlayers(text: string): Promise<void>;

  // ── Monetization ──
  /** Show a rewarded video ad and return the result */
  showRewardedAd(placementId?: string): Promise<AdResult>;
  /** Show an interstitial ad (no reward) */
  showInterstitialAd(placementId?: string): Promise<void>;
  /** Fetch the product catalog for this platform */
  getProducts(productIds: string[]): Promise<Product[]>;
  /** Initiate an in-app purchase */
  purchaseProduct(productId: string, developerPayload?: string): Promise<PurchaseResult>;

  // ── Capabilities ──
  /** Check if a specific feature is available on this platform */
  supportsFeature(feature: PlatformFeature): boolean;

  // ── Analytics / Lifecycle ──
  /** Log an analytics event */
  logEvent(name: string, params?: Record<string, unknown>): void;
  /** Register a callback for when the game is paused/backgrounded */
  onPause(callback: () => void): void;
  /** Register a callback for when the game is resumed/foregrounded */
  onResume(callback: () => void): void;
}
