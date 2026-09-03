import { registerPlugin } from "@capacitor/core";

/**
 * The bridge to `AppTrackingPlugin.swift`.
 *
 * Deliberately thin: it knows how to ask iOS about tracking and nothing about
 * when that should happen. The policy — what the player is shown first, when
 * it is safe to ask, what a refusal means — lives in `trackingConsent.ts`.
 *
 * The web implementation is not a stub for tests. `registerPlugin` resolves it
 * on every non-iOS target, so Android and the browser get "unavailable" from
 * the same call the iOS build uses, and no caller needs a platform branch.
 */

export type NativeTrackingStatus =
  | "authorized"
  | "denied"
  | "notDetermined"
  | "restricted"
  | "unavailable";

export interface AppTrackingPlugin {
  /** The stored answer, without prompting. */
  getStatus(): Promise<{ status: NativeTrackingStatus }>;
  /**
   * Show the system dialog, waiting for the app to be active first.
   *
   * `shown` reports whether iOS actually presented it: false means the answer
   * was already on file, which is not a failure and not something to retry.
   */
  request(): Promise<{ status: NativeTrackingStatus; shown: boolean }>;
}

export const AppTracking = registerPlugin<AppTrackingPlugin>("AppTracking", {
  web: () => ({
    getStatus: async () => ({ status: "unavailable" as const }),
    request: async () => ({ status: "unavailable" as const, shown: false }),
  }),
});
