/**
 * Facebook Instant Games Platform Adapter
 *
 * Implements PlatformAdapter for the Facebook Instant Games (NEZP) environment.
 * All FBInstant SDK calls are isolated to this file.
 *
 * Auth flow:
 *   1. FBInstant.initializeAsync()  (called in fb-main.tsx before React mounts)
 *   2. getSignedPlayerInfoAsync()   (this adapter)
 *   3. POST to facebook-auth edge function → returns Supabase JWT
 *   4. Supabase client uses that JWT for all subsequent calls
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
import { supabase } from '@/integrations/supabase/client';

// FBInstant is loaded globally from Meta's CDN in fb-instant.html
declare const FBInstant: any;

export class FacebookPlatformAdapter implements PlatformAdapter {
  readonly platformId = 'facebook' as const;

  private rewardedAdInstance: any = null;
  private interstitialAdInstance: any = null;

  // ── Lifecycle ──

  async initialize(): Promise<void> {
    // FBInstant.initializeAsync() is called in fb-main.tsx before this adapter is created.
    // By the time we get here, FBInstant is ready.
    // We just preload ads so they're ready when needed.
    this.preloadAds();
  }

  // ── Authentication ──

  async getPlayer(): Promise<PlatformPlayer | null> {
    try {
      const player = FBInstant.player;
      return {
        id: player.getID(),
        name: player.getName(),
        photoUrl: player.getPhoto(),
      };
    } catch {
      return null;
    }
  }

  async signIn(): Promise<AuthResult | null> {
    try {
      // Get a signed payload from Facebook for server-side verification
      const nonce = crypto.randomUUID();
      const signedInfo = await FBInstant.player.getSignedPlayerInfoAsync(nonce);

      const response = await supabase.functions.invoke('facebook-auth', {
        body: {
          playerId: FBInstant.player.getID(),
          signature: signedInfo.getSignature(),
          nonce,
          playerName: FBInstant.player.getName(),
          playerPhoto: FBInstant.player.getPhoto(),
        },
      });

      if (response.error) {
        console.error('[FacebookPlatform] Auth error:', response.error);
        return null;
      }

      const { access_token, refresh_token, user_id } = response.data;

      // Set the Supabase session with the tokens from our edge function
      await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      return {
        accessToken: access_token,
        refreshToken: refresh_token,
        userId: user_id,
      };
    } catch (error) {
      console.error('[FacebookPlatform] signIn failed:', error);
      return null;
    }
  }

  // ── Social ──

  async getConnectedFriends(): Promise<PlatformFriend[]> {
    try {
      const players = await FBInstant.player.getConnectedPlayersAsync();
      return players.map((p: any) => ({
        id: p.getID(),
        name: p.getName() || 'Player',
        photoUrl: p.getPhoto(),
      }));
    } catch {
      return [];
    }
  }

  async shareScore(score: number, text: string): Promise<void> {
    try {
      await FBInstant.shareAsync({
        intent: 'SHARE',
        text: `${text} - Score: ${score}`,
        data: { score },
      });
    } catch {
      // User cancelled or share failed - not critical
    }
  }

  async postLeaderboardScore(boardName: string, score: number): Promise<void> {
    try {
      const leaderboard = await FBInstant.getLeaderboardAsync(boardName);
      await leaderboard.setScoreAsync(score);
    } catch (error) {
      console.error('[FacebookPlatform] Failed to post leaderboard score:', error);
    }
  }

  async getLeaderboard(boardName: string, count = 10): Promise<LeaderboardEntry[]> {
    try {
      const leaderboard = await FBInstant.getLeaderboardAsync(boardName);
      const entries = await leaderboard.getEntriesAsync(count, 0);
      return entries.map((entry: any) => ({
        rank: entry.getRank(),
        playerId: entry.getPlayer().getID(),
        playerName: entry.getPlayer().getName() || 'Player',
        playerPhotoUrl: entry.getPlayer().getPhoto(),
        score: entry.getScore(),
      }));
    } catch {
      return [];
    }
  }

  async invitePlayers(text: string): Promise<void> {
    try {
      await FBInstant.context.chooseAsync({
        filters: ['NEW_CONTEXT_ONLY'],
        minSize: 2,
        maxSize: 8,
      });
      await FBInstant.updateAsync({
        action: 'CUSTOM',
        template: 'invite',
        text,
        strategy: 'IMMEDIATE',
      });
    } catch {
      // User cancelled
    }
  }

  // ── Monetization ──

  private async preloadAds(): Promise<void> {
    try {
      if (typeof FBInstant.getRewardedVideoAsync === 'function') {
        this.rewardedAdInstance = await FBInstant.getRewardedVideoAsync('rewarded_video_placement');
        await this.rewardedAdInstance.loadAsync();
      }
    } catch {
      // Ad preload failed - will try again on demand
      this.rewardedAdInstance = null;
    }

    try {
      if (typeof FBInstant.getInterstitialAdAsync === 'function') {
        this.interstitialAdInstance = await FBInstant.getInterstitialAdAsync('interstitial_placement');
        await this.interstitialAdInstance.loadAsync();
      }
    } catch {
      this.interstitialAdInstance = null;
    }
  }

  async showRewardedAd(_placementId?: string): Promise<AdResult> {
    try {
      // If no preloaded ad, try loading one now
      if (!this.rewardedAdInstance) {
        this.rewardedAdInstance = await FBInstant.getRewardedVideoAsync(
          _placementId || 'rewarded_video_placement'
        );
        await this.rewardedAdInstance.loadAsync();
      }

      await this.rewardedAdInstance.showAsync();

      // Ad was watched - preload the next one in background
      this.rewardedAdInstance = null;
      this.preloadAds();

      return { rewarded: true, rewardType: 'plays', rewardAmount: 2 };
    } catch (error: any) {
      console.error('[FacebookPlatform] Rewarded ad error:', error);
      this.rewardedAdInstance = null;
      return { rewarded: false };
    }
  }

  async showInterstitialAd(_placementId?: string): Promise<void> {
    try {
      if (!this.interstitialAdInstance) {
        this.interstitialAdInstance = await FBInstant.getInterstitialAdAsync(
          _placementId || 'interstitial_placement'
        );
        await this.interstitialAdInstance.loadAsync();
      }

      await this.interstitialAdInstance.showAsync();
      this.interstitialAdInstance = null;
      this.preloadAds();
    } catch {
      this.interstitialAdInstance = null;
    }
  }

  async getProducts(productIds: string[]): Promise<Product[]> {
    try {
      const catalog = await FBInstant.payments.getCatalogAsync();
      return catalog
        .filter((p: any) => productIds.includes(p.productID))
        .map((p: any) => ({
          productId: p.productID,
          title: p.title,
          description: p.description || '',
          priceDisplay: p.price,
          priceAmount: p.priceAmount ? parseFloat(p.priceAmount) : 0,
          priceCurrency: p.priceCurrencyCode || 'USD',
        }));
    } catch {
      return [];
    }
  }

  async purchaseProduct(productId: string, developerPayload?: string): Promise<PurchaseResult> {
    try {
      const purchase = await FBInstant.payments.purchaseAsync({
        productID: productId,
        developerPayload: developerPayload || '',
      });

      // Consume the purchase so it can be bought again (for consumables like gems)
      await FBInstant.payments.consumePurchaseAsync(purchase.purchaseToken);

      return {
        success: true,
        productId,
        purchaseToken: purchase.purchaseToken,
        developerPayload: purchase.developerPayload,
      };
    } catch (error: any) {
      console.error('[FacebookPlatform] Purchase error:', error);
      return { success: false, productId };
    }
  }

  // ── Capabilities ──

  supportsFeature(feature: PlatformFeature): boolean {
    switch (feature) {
      case 'rewarded_ads':
      case 'interstitial_ads':
      case 'iap':
      case 'social_share':
      case 'leaderboards':
      case 'tournaments':
      case 'friend_discovery':
      case 'context_play':
        return true;
      case 'subscriptions':
      case 'push_notifications':
      case 'haptics':
      case 'camera':
        return false;
      default:
        return false;
    }
  }

  // ── Analytics ──

  logEvent(name: string, params?: Record<string, unknown>): void {
    try {
      const valueToSum = typeof params?.value === 'number' ? params.value : undefined;
      FBInstant.logEvent(name, valueToSum, params);
    } catch {
      // Analytics are non-critical
    }
  }

  onPause(callback: () => void): void {
    FBInstant.onPause(() => callback());
  }

  onResume(_callback: () => void): void {
    // FBInstant doesn't have a direct onResume - use visibility API as fallback
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') _callback();
    });
  }
}
