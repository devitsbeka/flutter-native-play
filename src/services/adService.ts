/**
 * AdMob Service for Rewarded Ads
 * Uses @capacitor-community/admob when running on native iOS/Android
 * Falls back to simulated ads on web
 */

import { Capacitor } from '@capacitor/core';
import { trackingService } from './trackingService';

// AdMob Configuration — every ad unit ID lives in this one object.
const ADMOB_CONFIG = {
  rewarded: {
    // Existing production rewarded ID used as default for both platforms.
    // TODO(owner): supply a dedicated iOS rewarded ad unit ID if different from Android.
    android: 'ca-app-pub-1329033152352928/8877032796',
    ios: 'ca-app-pub-1329033152352928/8877032796',
  },
  interstitial: {
    // TODO(owner): replace these Google TEST interstitial IDs with real per-platform unit IDs.
    android: 'ca-app-pub-3940256099942544/1033173712',
    ios: 'ca-app-pub-3940256099942544/4411468910',
  },
  // Test ad unit IDs for development
  testRewardedAdUnitId: 'ca-app-pub-3940256099942544/5224354917',
  testInterstitialAdUnitId: 'ca-app-pub-3940256099942544/1033173712',
};

interface AdReward {
  type: string;
  amount: number;
}

interface AdServiceCallbacks {
  onAdLoaded?: () => void;
  onAdFailedToLoad?: (error: string) => void;
  onAdShowed?: () => void;
  onAdDismissed?: () => void;
  onRewardEarned?: (reward: AdReward) => void;
  onAdFailedToShow?: (error: string) => void;
}

class AdService {
  private isInitialized = false;
  private isNative = false;
  private AdMob: any = null;
  private RewardAdPluginEvents: any = null;
  private InterstitialAdPluginEvents: any = null;
  private isAdLoading = false;
  private isAdLoaded = false;
  private isInterstitialLoading = false;
  private isInterstitialLoaded = false;
  private listeners: any[] = [];
  private isVipUser = false;
  private ageGroup: string | null = null;

  /**
   * Set VIP status - VIP users skip ads and get rewards automatically.
   * Synced from VipContext by the useAds hook.
   */
  setVipStatus(isVip: boolean) {
    this.isVipUser = isVip;
  }

  private getAdUnitId(kind: 'rewarded' | 'interstitial'): string {
    const platform = Capacitor.getPlatform();
    const ids = ADMOB_CONFIG[kind];
    return platform === 'ios' ? ids.ios : ids.android;
  }

  /**
   * Set age group for child-directed ad treatment (COPPA/GDPR compliance).
   * Must be called before loading/showing ads.
   */
  setAgeGroup(ageGroup: string | null | undefined) {
    this.ageGroup = ageGroup ?? null;
  }

  private getChildSafetyOptions() {
    if (this.ageGroup === 'child') {
      return {
        tagForChildDirectedTreatment: true,
        tagForUnderAgeOfConsent: true,
        maxAdContentRating: 'G' as const,
        npa: '1' as const,
      };
    }
    if (this.ageGroup === 'teen') {
      return {
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent: true,
        maxAdContentRating: 'T' as const,
        npa: '1' as const,
      };
    }
    return {};
  }

  /**
   * Check if ads should be shown (returns false for VIP users)
   */
  shouldShowAd(): boolean {
    return !this.isVipUser;
  }

  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      // Capacitor injects a `window.Capacitor` global on the web too, so the
      // old check reported "native" in a browser and only recovered because
      // the plugin import then threw. isNativePlatform() is the real answer.
      this.isNative = Capacitor.isNativePlatform();

      if (this.isNative) {
        // Dynamic import for Capacitor AdMob plugin
        try {
          const admobModule = await import('@capacitor-community/admob');
          this.AdMob = admobModule.AdMob;
          this.RewardAdPluginEvents = admobModule.RewardAdPluginEvents;
          this.InterstitialAdPluginEvents = admobModule.InterstitialAdPluginEvents;
          
          // Initialize tracking service and request ATT authorization
          await trackingService.initialize();
          await trackingService.requestAuthorization();
          
          const childSafety = this.getChildSafetyOptions();
          await this.AdMob.initialize({
            testingDevices: [],
            initializeForTesting: false,
            ...(childSafety.tagForChildDirectedTreatment !== undefined && {
              tagForChildDirectedTreatment: childSafety.tagForChildDirectedTreatment,
            }),
            ...(childSafety.tagForUnderAgeOfConsent !== undefined && {
              tagForUnderAgeOfConsent: childSafety.tagForUnderAgeOfConsent,
            }),
            ...(childSafety.maxAdContentRating && {
              maxAdContentRating: childSafety.maxAdContentRating,
            }),
          });
          
          console.log('AdMob initialized successfully');
          this.isInitialized = true;
          return true;
        } catch (importError) {
          console.warn('AdMob plugin not available, falling back to simulation:', importError);
          this.isNative = false;
          this.isInitialized = true;
          return true;
        }
      } else {
        // Web environment - will use simulation
        console.log('Running on web, ad simulation mode enabled');
        this.isInitialized = true;
        return true;
      }
    } catch (error) {
      console.error('Failed to initialize AdMob:', error);
      this.isInitialized = true; // Mark as initialized to allow fallback
      return false;
    }
  }

  private removeListeners() {
    this.listeners.forEach(listener => {
      if (listener && typeof listener.remove === 'function') {
        listener.remove();
      }
    });
    this.listeners = [];
  }

  async loadRewardedAd(callbacks?: AdServiceCallbacks): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.isAdLoading) {
      console.log('Ad is already loading');
      return false;
    }

    this.isAdLoading = true;

    try {
      if (this.isNative && this.AdMob) {
        this.removeListeners();

        // Set up event listeners
        const loadedListener = await this.AdMob.addListener(
          this.RewardAdPluginEvents.Loaded,
          () => {
            this.isAdLoaded = true;
            this.isAdLoading = false;
            callbacks?.onAdLoaded?.();
          }
        );
        this.listeners.push(loadedListener);

        const failedListener = await this.AdMob.addListener(
          this.RewardAdPluginEvents.FailedToLoad,
          (error: any) => {
            this.isAdLoading = false;
            this.isAdLoaded = false;
            callbacks?.onAdFailedToLoad?.(error?.message || 'Failed to load ad');
          }
        );
        this.listeners.push(failedListener);

        const childSafety = this.getChildSafetyOptions();
        await this.AdMob.prepareRewardVideoAd({
          adId: this.getAdUnitId('rewarded'),
          isTesting: false,
          ...(childSafety.npa && { npa: childSafety.npa }),
        });

        return true;
      } else {
        // Web simulation - pretend to load
        await new Promise(resolve => setTimeout(resolve, 300));
        this.isAdLoaded = true;
        this.isAdLoading = false;
        callbacks?.onAdLoaded?.();
        return true;
      }
    } catch (error) {
      console.error('Failed to load rewarded ad:', error);
      this.isAdLoading = false;
      callbacks?.onAdFailedToLoad?.((error as Error).message);
      return false;
    }
  }

  async showRewardedAd(callbacks?: AdServiceCallbacks): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      if (this.isNative && this.AdMob) {
        return new Promise((resolve) => {
          // Set up event listeners for this show
          const setupListeners = async () => {
            const showedListener = await this.AdMob.addListener(
              this.RewardAdPluginEvents.Showed,
              () => {
                callbacks?.onAdShowed?.();
              }
            );

            const removeAll = () => {
              showedListener.remove();
              dismissedListener.remove();
              rewardedListener.remove();
              failedListener.remove();
            };

            const dismissedListener = await this.AdMob.addListener(
              this.RewardAdPluginEvents.Dismissed,
              () => {
                this.isAdLoaded = false;
                callbacks?.onAdDismissed?.();
                removeAll();
                // Dismissed without a reward — settle as false (no-op if already resolved true)
                resolve(false);
              }
            );

            const rewardedListener = await this.AdMob.addListener(
              this.RewardAdPluginEvents.Rewarded,
              (reward: any) => {
                callbacks?.onRewardEarned?.(reward || { type: 'plays', amount: 2 });
                resolve(true);
              }
            );

            const failedListener = await this.AdMob.addListener(
              this.RewardAdPluginEvents.FailedToShow,
              (error: any) => {
                callbacks?.onAdFailedToShow?.(error?.message || 'Failed to show ad');
                removeAll();
                resolve(false);
              }
            );

            try {
              await this.AdMob.showRewardVideoAd();
            } catch (error) {
              // An unloaded ad rejects here without firing FailedToShow — settle the
              // promise so callers (e.g. WatchAdModal spinner) never hang
              this.isAdLoaded = false;
              callbacks?.onAdFailedToShow?.((error as Error)?.message || 'Failed to show ad');
              removeAll();
              resolve(false);
            }
          };

          setupListeners().catch((error) => {
            console.error('Failed to set up rewarded ad listeners:', error);
            resolve(false);
          });
        });
      } else {
        // Web simulation - show fake ad
        callbacks?.onAdShowed?.();
        
        // Simulate watching ad for 1.5 seconds
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Simulate reward
        callbacks?.onRewardEarned?.({ type: 'plays', amount: 2 });
        callbacks?.onAdDismissed?.();
        
        this.isAdLoaded = false;
        return true;
      }
    } catch (error) {
      console.error('Failed to show rewarded ad:', error);
      callbacks?.onAdFailedToShow?.((error as Error).message);
      return false;
    }
  }

  async showRewardedAdWithPreload(callbacks?: AdServiceCallbacks): Promise<boolean> {
    // Initialize if needed
    if (!this.isInitialized) {
      await this.initialize();
    }

    // VIP users skip ads and get rewards automatically
    if (this.isVipUser) {
      callbacks?.onAdShowed?.();
      callbacks?.onRewardEarned?.({ type: 'vip_skip', amount: 1 });
      callbacks?.onAdDismissed?.();
      return true;
    }

    // Load and show in one call
    if (!this.isAdLoaded) {
      const loaded = await this.loadRewardedAd(callbacks);
      if (!loaded && this.isNative) {
        return false;
      }
    }

    return this.showRewardedAd(callbacks);
  }

  private prepareInterstitialOnce(): Promise<boolean> {
    return new Promise((resolve) => {
      (async () => {
        let loadedListener: any = null;
        let failedListener: any = null;
        const removeAll = () => {
          loadedListener?.remove?.();
          failedListener?.remove?.();
        };
        try {
          loadedListener = await this.AdMob.addListener(
            this.InterstitialAdPluginEvents.Loaded,
            () => {
              removeAll();
              resolve(true);
            }
          );
          failedListener = await this.AdMob.addListener(
            this.InterstitialAdPluginEvents.FailedToLoad,
            (error: any) => {
              console.warn('Interstitial failed to load:', error?.message);
              removeAll();
              resolve(false);
            }
          );

          const childSafety = this.getChildSafetyOptions();
          await this.AdMob.prepareInterstitial({
            adId: this.getAdUnitId('interstitial'),
            isTesting: false,
            ...(childSafety.npa && { npa: childSafety.npa }),
          });
        } catch (error) {
          console.warn('prepareInterstitial threw:', error);
          removeAll();
          resolve(false);
        }
      })();
    });
  }

  async prepareInterstitial(): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Web has no interstitials — nothing to load
    if (!this.isNative || !this.AdMob || !this.InterstitialAdPluginEvents) return false;
    if (this.isInterstitialLoaded) return true;
    if (this.isInterstitialLoading) return false;

    this.isInterstitialLoading = true;
    try {
      // Retry once on load failure before giving up
      for (let attempt = 0; attempt < 2; attempt++) {
        const loaded = await this.prepareInterstitialOnce();
        if (loaded) {
          this.isInterstitialLoaded = true;
          return true;
        }
      }
      return false;
    } finally {
      this.isInterstitialLoading = false;
    }
  }

  /**
   * Show an interstitial ad. Always settles: resolves true if the ad was shown
   * and dismissed, false on any failure (never shown on web or for VIP users).
   */
  async showInterstitial(): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.isVipUser) return false;
    if (!this.isNative || !this.AdMob || !this.InterstitialAdPluginEvents) return false;

    if (!this.isInterstitialLoaded) {
      const loaded = await this.prepareInterstitial();
      if (!loaded) return false;
    }
    this.isInterstitialLoaded = false;

    return new Promise((resolve) => {
      (async () => {
        let dismissedListener: any = null;
        let failedListener: any = null;
        const removeAll = () => {
          dismissedListener?.remove?.();
          failedListener?.remove?.();
        };
        try {
          dismissedListener = await this.AdMob.addListener(
            this.InterstitialAdPluginEvents.Dismissed,
            () => {
              removeAll();
              resolve(true);
            }
          );
          failedListener = await this.AdMob.addListener(
            this.InterstitialAdPluginEvents.FailedToShow,
            (error: any) => {
              console.warn('Interstitial failed to show:', error?.message);
              removeAll();
              resolve(false);
            }
          );

          await this.AdMob.showInterstitial();
        } catch (error) {
          console.warn('showInterstitial threw:', error);
          removeAll();
          resolve(false);
        }
      })();
    });
  }

  isAdReady(): boolean {
    return this.isAdLoaded;
  }

  isRunningOnNative(): boolean {
    return this.isNative;
  }
}

// Singleton instance
export const adService = new AdService();
