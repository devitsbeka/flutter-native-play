/**
 * Platform detection and adapter factory.
 *
 * Auto-detects the runtime environment and provides the correct PlatformAdapter.
 *
 * Detection order:
 *   1. Facebook Instant Games  → FBInstant global exists
 *   2. Capacitor (iOS/Android) → window.Capacitor exists
 *   3. Web (default)           → everything else
 *
 * Usage:
 *   import { platform } from '@/platform';
 *   await platform.initialize();
 *   const friends = await platform.getConnectedFriends();
 */

import type { PlatformAdapter, PlatformId } from './types';
import { WebPlatformAdapter } from './web';

// Lazy-loaded to keep the web bundle small (Facebook/Capacitor code is tree-shaken)
let _platform: PlatformAdapter | null = null;

function detectPlatformId(): PlatformId {
  // Facebook Instant Games: the SDK sets FBInstant on the global scope
  if (typeof window !== 'undefined' && (window as any).FBInstant) {
    return 'facebook';
  }

  // Capacitor native: Capacitor bridge is injected into the WebView
  if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
    const platform = (window as any).Capacitor.getPlatform?.();
    if (platform === 'ios') return 'ios';
    if (platform === 'android') return 'android';
  }

  return 'web';
}

async function createAdapter(id: PlatformId): Promise<PlatformAdapter> {
  switch (id) {
    case 'facebook': {
      const { FacebookPlatformAdapter } = await import('./facebook');
      return new FacebookPlatformAdapter();
    }
    case 'ios':
    case 'android': {
      const { CapacitorPlatformAdapter } = await import('./capacitor');
      return new CapacitorPlatformAdapter(id);
    }
    case 'web':
    default:
      return new WebPlatformAdapter();
  }
}

/**
 * Get the platform adapter singleton.
 * On first call, detects the platform and creates the adapter.
 */
export async function getPlatform(): Promise<PlatformAdapter> {
  if (!_platform) {
    const id = detectPlatformId();
    _platform = await createAdapter(id);
  }
  return _platform;
}

/**
 * Synchronous access to the platform adapter.
 * Only use AFTER getPlatform() has been awaited at least once (e.g. in main.tsx).
 * Throws if called before initialization.
 */
export function platform(): PlatformAdapter {
  if (!_platform) {
    // Fallback: return web adapter synchronously so the app doesn't crash
    // during the brief window before async init completes
    _platform = new WebPlatformAdapter();
  }
  return _platform;
}

/**
 * Check if running in Facebook Instant Games environment.
 */
export function isFacebookPlatform(): boolean {
  return _platform?.platformId === 'facebook';
}

/**
 * Check if running on a native device (iOS or Android via Capacitor).
 */
export function isNativePlatform(): boolean {
  return _platform?.platformId === 'ios' || _platform?.platformId === 'android';
}

/**
 * Check if running in a standard web browser.
 */
export function isWebPlatform(): boolean {
  return _platform?.platformId === 'web';
}

// Re-export types for convenience
export type { PlatformAdapter, PlatformId, PlatformFeature } from './types';
