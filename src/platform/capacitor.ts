/**
 * Capacitor (iOS/Android) Platform Adapter
 *
 * Wraps existing Capacitor plugin calls (AdMob, RevenueCat, Haptics, etc.)
 * behind the PlatformAdapter interface.
 *
 * This is a stub for now - it will be fleshed out when native builds are ready.
 * Currently, the existing adService and AuthContext handle native directly.
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
  PlatformId,
} from './types';

export class CapacitorPlatformAdapter implements PlatformAdapter {
  readonly platformId: PlatformId;

  constructor(os: 'ios' | 'android') {
    this.platformId = os;
  }

  async initialize(): Promise<void> {
    // Capacitor plugins are initialized by their respective services (adService, etc.)
  }

  async getPlayer(): Promise<PlatformPlayer | null> {
    // Native auth is handled by Supabase + Apple/Google sign-in in AuthContext
    return null;
  }

  async signIn(): Promise<AuthResult | null> {
    // Native auth is handled directly by AuthContext
    return null;
  }

  async getConnectedFriends(): Promise<PlatformFriend[]> {
    return [];
  }

  async shareScore(_score: number, _text: string): Promise<void> {
    // TODO: implement native share sheet via Capacitor Share plugin
  }

  async postLeaderboardScore(_boardName: string, _score: number): Promise<void> {
    // Native uses Supabase leaderboards directly
  }

  async getLeaderboard(_boardName: string, _count?: number): Promise<LeaderboardEntry[]> {
    return [];
  }

  async invitePlayers(_text: string): Promise<void> {
    // TODO: implement native share sheet for invitations
  }

  async showRewardedAd(_placementId?: string): Promise<AdResult> {
    // Delegates to existing adService which already handles AdMob
    // This is a passthrough - the real logic is in adService.ts
    return { rewarded: false };
  }

  async showInterstitialAd(_placementId?: string): Promise<void> {
    // TODO: implement via AdMob interstitial
  }

  async getProducts(_productIds: string[]): Promise<Product[]> {
    // TODO: implement via RevenueCat
    return [];
  }

  async purchaseProduct(_productId: string, _developerPayload?: string): Promise<PurchaseResult> {
    // TODO: implement via RevenueCat
    return { success: false, productId: _productId };
  }

  supportsFeature(feature: PlatformFeature): boolean {
    switch (feature) {
      case 'rewarded_ads':
      case 'interstitial_ads':
      case 'iap':
      case 'subscriptions':
      case 'push_notifications':
      case 'haptics':
      case 'camera':
        return true;
      case 'social_share':
      case 'leaderboards':
      case 'friend_discovery':
      case 'tournaments':
      case 'context_play':
        return false;
      default:
        return false;
    }
  }

  logEvent(name: string, params?: Record<string, unknown>): void {
    console.debug(`[CapacitorPlatform] Event: ${name}`, params);
  }

  onPause(callback: () => void): void {
    document.addEventListener('pause', callback);
  }

  onResume(callback: () => void): void {
    document.addEventListener('resume', callback);
  }
}
