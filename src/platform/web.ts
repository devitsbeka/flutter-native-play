/**
 * Web Platform Adapter
 *
 * Default adapter for the standard browser environment.
 * Auth is handled directly by AuthContext/Supabase - this adapter is mostly a passthrough.
 * Ads use the existing simulated web ad behavior.
 */

import type {
  PlatformAdapter,
  PlatformPlayer,
  AuthResult,
  PlatformFriend,
  LeaderboardEntry,
  AdResult,
  Product,
  PurchaseResult,
  PlatformFeature,
} from './types';

export class WebPlatformAdapter implements PlatformAdapter {
  readonly platformId = 'web' as const;

  async initialize(): Promise<void> {
    // Nothing to initialize for web - Supabase client is already set up
  }

  async getPlayer(): Promise<PlatformPlayer | null> {
    // Web doesn't provide a platform identity - Supabase auth handles this
    return null;
  }

  async signIn(): Promise<AuthResult | null> {
    // Web auth is handled directly by AuthContext (email/password, Google OAuth)
    return null;
  }

  // ── Social ──

  async getConnectedFriends(): Promise<PlatformFriend[]> {
    // Web has no platform-level friend discovery
    return [];
  }

  async shareScore(_score: number, _text: string): Promise<void> {
    // Could implement Web Share API in the future
    // For now, no-op
  }

  async postLeaderboardScore(_boardName: string, _score: number): Promise<void> {
    // Web uses Supabase leaderboards directly - no platform leaderboard
  }

  async getLeaderboard(_boardName: string, _count?: number): Promise<LeaderboardEntry[]> {
    // Web uses Supabase leaderboards directly
    return [];
  }

  async invitePlayers(_text: string): Promise<void> {
    // Could implement Web Share API in the future
  }

  // ── Monetization ──

  async showRewardedAd(_placementId?: string): Promise<AdResult> {
    // Simulated web ad - matches existing adService web behavior
    await new Promise(resolve => setTimeout(resolve, 1500));
    return { rewarded: true, rewardType: 'plays', rewardAmount: 2 };
  }

  async showInterstitialAd(_placementId?: string): Promise<void> {
    // No interstitial ads on web
  }

  async getProducts(_productIds: string[]): Promise<Product[]> {
    // Web uses Stripe checkout - products are defined server-side
    return [];
  }

  async purchaseProduct(_productId: string, _developerPayload?: string): Promise<PurchaseResult> {
    // Web purchases go through Stripe checkout flow, not this adapter
    return { success: false, productId: _productId };
  }

  // ── Capabilities ──

  supportsFeature(feature: PlatformFeature): boolean {
    switch (feature) {
      case 'rewarded_ads':
        return true; // Simulated on web
      case 'iap':
        return true; // Via Stripe
      default:
        return false;
    }
  }

  // ── Analytics ──

  logEvent(name: string, params?: Record<string, unknown>): void {
    console.debug('[WebPlatform] Event:', name, params);
  }

  onPause(callback: () => void): void {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') callback();
    });
  }

  onResume(callback: () => void): void {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') callback();
    });
  }
}
