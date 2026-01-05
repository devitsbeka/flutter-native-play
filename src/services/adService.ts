/**
 * AdMob Service for Rewarded Ads
 * Uses @capacitor-community/admob when running on native iOS/Android
 * Falls back to simulated ads on web
 */

// AdMob Configuration
const ADMOB_CONFIG = {
  // Production ad unit IDs
  rewardedAdUnitId: 'ca-app-pub-1329033152352928/8877032796',
  // Test ad unit IDs for development
  testRewardedAdUnitId: 'ca-app-pub-3940256099942544/5224354917',
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
  private isAdLoading = false;
  private isAdLoaded = false;
  private listeners: any[] = [];

  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      // Check if running on native platform (Capacitor)
      const isPlatformNative = typeof (window as any).Capacitor !== 'undefined';
      this.isNative = isPlatformNative;

      if (this.isNative) {
        // Dynamic import for Capacitor AdMob plugin
        try {
          const admobModule = await import('@capacitor-community/admob');
          this.AdMob = admobModule.AdMob;
          this.RewardAdPluginEvents = admobModule.RewardAdPluginEvents;
          
          await this.AdMob.initialize({
            testingDevices: [],
            initializeForTesting: false,
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

        await this.AdMob.prepareRewardVideoAd({
          adId: ADMOB_CONFIG.rewardedAdUnitId,
          isTesting: false,
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

            const dismissedListener = await this.AdMob.addListener(
              this.RewardAdPluginEvents.Dismissed,
              () => {
                this.isAdLoaded = false;
                callbacks?.onAdDismissed?.();
                showedListener.remove();
                dismissedListener.remove();
                rewardedListener.remove();
                failedListener.remove();
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
                resolve(false);
              }
            );

            await this.AdMob.showRewardVideoAd();
          };

          setupListeners();
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

    // Load and show in one call
    if (!this.isAdLoaded) {
      const loaded = await this.loadRewardedAd(callbacks);
      if (!loaded && this.isNative) {
        return false;
      }
    }

    return this.showRewardedAd(callbacks);
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
