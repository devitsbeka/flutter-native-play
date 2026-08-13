/**
 * App Tracking Transparency (ATT) Service
 * Handles iOS 14.5+ tracking authorization requests
 */

import { Capacitor } from '@capacitor/core';

export type TrackingStatus = 
  | 'authorized'
  | 'denied'
  | 'notDetermined'
  | 'restricted'
  | 'unavailable';

class TrackingService {
  private isNative = false;
  private AdMob: any = null;
  private hasRequestedAuthorization = false;
  private currentStatus: TrackingStatus = 'notDetermined';

  async initialize(): Promise<void> {
    // Not `typeof window.Capacitor !== 'undefined'`: that global exists on the
    // web as well, so the service believed it was native in a browser.
    this.isNative = Capacitor.isNativePlatform();

    if (this.isNative) {
      try {
        const admobModule = await import('@capacitor-community/admob');
        this.AdMob = admobModule.AdMob;
        
        // Check current status
        await this.checkStatus();
      } catch (error) {
        console.warn('AdMob plugin not available for tracking:', error);
        this.isNative = false;
      }
    }
  }

  async checkStatus(): Promise<TrackingStatus> {
    if (!this.isNative || !this.AdMob) {
      this.currentStatus = 'unavailable';
      return this.currentStatus;
    }

    try {
      const result = await this.AdMob.trackingAuthorizationStatus();
      this.currentStatus = this.mapStatus(result.status);
      return this.currentStatus;
    } catch (error) {
      console.error('Error checking tracking status:', error);
      this.currentStatus = 'unavailable';
      return this.currentStatus;
    }
  }

  private mapStatus(status: string): TrackingStatus {
    switch (status) {
      case 'authorized':
        return 'authorized';
      case 'denied':
        return 'denied';
      case 'notDetermined':
        return 'notDetermined';
      case 'restricted':
        return 'restricted';
      default:
        return 'unavailable';
    }
  }

  async requestAuthorization(): Promise<TrackingStatus> {
    // Only request once per app session
    if (this.hasRequestedAuthorization) {
      return this.currentStatus;
    }

    if (!this.isNative || !this.AdMob) {
      this.currentStatus = 'unavailable';
      return this.currentStatus;
    }

    try {
      // Check current status first
      const currentStatus = await this.checkStatus();
      
      // Only request if not determined yet
      if (currentStatus === 'notDetermined') {
        await this.AdMob.requestTrackingAuthorization();
        this.hasRequestedAuthorization = true;
        
        // Check status again after request
        return await this.checkStatus();
      }
      
      return currentStatus;
    } catch (error) {
      console.error('Error requesting tracking authorization:', error);
      this.hasRequestedAuthorization = true;
      return 'denied';
    }
  }

  /**
   * Call this before showing personalized ads
   * Returns true if tracking is authorized or unavailable (web)
   */
  async ensureTrackingAuthorization(): Promise<boolean> {
    if (!this.isNative) {
      // On web, we can show ads (no ATT required)
      return true;
    }

    const status = await this.requestAuthorization();
    
    // We can show ads in these cases:
    // - authorized: user allowed tracking
    // - unavailable: not on iOS 14.5+ or web
    // - denied/restricted: we can still show non-personalized ads
    return true; // Always return true, but AdMob will handle personalization
  }

  getStatus(): TrackingStatus {
    return this.currentStatus;
  }

  isTrackingAuthorized(): boolean {
    return this.currentStatus === 'authorized';
  }
}

// Singleton instance
export const trackingService = new TrackingService();
