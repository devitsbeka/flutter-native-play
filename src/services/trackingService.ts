/**
 * App Tracking Transparency status, and the one call that changes it.
 *
 * ## What this used to be, and why it was rejected
 *
 * Every path to ATT ran through `@capacitor-community/admob`:
 * `initialize()` dynamically imported the ad SDK and, if that import threw,
 * set `isNative = false` — after which `checkStatus()` reported `unavailable`
 * and `requestAuthorization()` returned without asking anything. A store
 * requirement was riding on whether an ad SDK happened to load, and it failed
 * open, silently, with the app otherwise working.
 *
 * Build 34 came back under guideline 2.1: "unable to locate the App Tracking
 * Transparency permission request".
 *
 * Now the request goes to `AppTrackingPlugin.swift` through
 * `@/native/appTracking`, which has no dependency on ads at all. AdMob's
 * `requestTrackingAuthorization()` is kept strictly as a fallback for the case
 * where the native plugin is missing from a build — two independent paths to
 * the same system dialog, so neither one failing can hide the prompt.
 *
 * This module holds status only. *When* to ask is `trackingConsent.ts`.
 */

import { Capacitor } from "@capacitor/core";
import { AppTracking } from "@/native/appTracking";

export type TrackingStatus =
  | "authorized"
  | "denied"
  | "notDetermined"
  | "restricted"
  | "unavailable";

const KNOWN: readonly TrackingStatus[] = [
  "authorized",
  "denied",
  "notDetermined",
  "restricted",
  "unavailable",
];

/** Anything iOS or a plugin hands back that we do not recognise is unavailable. */
function normalize(status: unknown): TrackingStatus {
  return KNOWN.includes(status as TrackingStatus)
    ? (status as TrackingStatus)
    : "unavailable";
}

class TrackingService {
  private status: TrackingStatus = "notDetermined";
  private initialized = false;

  /**
   * ATT is iOS-only. `Capacitor.isNativePlatform()` alone is not enough —
   * `window.Capacitor` exists in the browser too, which is how an earlier
   * version convinced itself it was native on the web.
   */
  private isIos(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    await this.checkStatus();
  }

  /** Read the stored answer. Never prompts. */
  async checkStatus(): Promise<TrackingStatus> {
    if (!this.isIos()) {
      this.status = "unavailable";
      return this.status;
    }

    try {
      const result = await AppTracking.getStatus();
      this.status = normalize(result?.status);
    } catch {
      // The native plugin is not in this binary. Ask the ad SDK instead.
      this.status = await this.admobStatus();
    }

    return this.status;
  }

  /**
   * Show the system dialog if iOS has no answer on file yet.
   *
   * Safe to call more than once: iOS returns the stored answer without
   * re-presenting, and the native side reports that as `shown: false`.
   */
  async requestAuthorization(): Promise<TrackingStatus> {
    if (!this.isIos()) {
      this.status = "unavailable";
      return this.status;
    }

    try {
      const result = await AppTracking.request();
      this.status = normalize(result?.status);
      return this.status;
    } catch {
      this.status = await this.admobRequest();
      return this.status;
    }
  }

  getStatus(): TrackingStatus {
    return this.status;
  }

  // ── AdMob fallback ──────────────────────────────────────────────────────
  //
  // Only reached when the native plugin is absent. Failure here is not fatal:
  // an undetermined status leaves the prompt to be retried next launch, and
  // ads stay non-personalised in the meantime.

  private async admob(): Promise<{
    trackingAuthorizationStatus(): Promise<{ status: string }>;
    requestTrackingAuthorization(): Promise<unknown>;
  } | null> {
    try {
      const mod = await import("@capacitor-community/admob");
      return mod.AdMob as never;
    } catch {
      return null;
    }
  }

  private async admobStatus(): Promise<TrackingStatus> {
    const adMob = await this.admob();
    if (!adMob) return "unavailable";
    try {
      const result = await adMob.trackingAuthorizationStatus();
      return normalize(result?.status);
    } catch {
      return "unavailable";
    }
  }

  private async admobRequest(): Promise<TrackingStatus> {
    const adMob = await this.admob();
    if (!adMob) return "unavailable";
    try {
      await adMob.requestTrackingAuthorization();
      return await this.admobStatus();
    } catch {
      return "unavailable";
    }
  }
}

export const trackingService = new TrackingService();
