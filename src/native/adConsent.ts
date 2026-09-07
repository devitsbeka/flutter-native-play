import { Capacitor } from "@capacitor/core";

/**
 * Google's User Messaging Platform (UMP) — the GDPR/EEA consent flow.
 *
 * ## Why this file exists
 *
 * `GoogleUserMessagingPlatform` has been linked into the iOS binary the whole
 * time (`ios/App/Podfile.lock`, pulled in transitively by
 * `CapacitorCommunityAdmob`) and was never once invoked. The app ships de, fr,
 * it, es and pt locales, so it is plainly distributed in the EEA, where AdMob
 * was serving with no consent record of any kind.
 *
 * App Tracking Transparency does not cover this. ATT is Apple's mechanism and
 * an ATT "Allow" is not a lawful basis under the GDPR — the two are separate
 * questions and both have to be asked. `trackingConsent.ts` owns the first;
 * this owns the second.
 *
 * ## The API this uses
 *
 * `@capacitor-community/admob@8.0.0` exposes the whole UMP surface through
 * `AdmobConsentDefinitions` (`dist/esm/consent/consent-definition.interface.d.ts`):
 *
 * ```ts
 * requestConsentInfo(options?: AdmobConsentRequestOptions): Promise<AdmobConsentInfo>
 * showConsentForm(): Promise<AdmobConsentInfo>
 * showPrivacyOptionsForm(): Promise<void>
 * resetConsentInfo(): Promise<void>
 * ```
 *
 * Nothing here is invented and no new dependency was added.
 *
 * ## The ordering rule
 *
 * `requestConsentInfo()` — and the form, if one is required — must complete
 * **before** `AdMob.initialize()`. `adService.initialize()` awaits
 * `ensureAdConsent()` for exactly that reason, and `useConsentOrchestration`
 * runs the flow at launch so it resolves even for a player who never opens a
 * screen that loads ads.
 *
 * ## What `canRequestAds` gates
 *
 * If UMP says ads may not be requested, no ad is loaded or shown — see
 * `adRequestsAllowed()`, which `adService` consults on every path. It also
 * gates analytics (`analyticsConsentAllowed()`): a player in the EEA who
 * refused has not consented to PostHog either.
 */

/** Mirrors `AdmobConsentStatus` in the plugin, as plain strings. */
export type AdConsentStatus = "NOT_REQUIRED" | "OBTAINED" | "REQUIRED" | "UNKNOWN";

export interface AdConsentState {
  status: AdConsentStatus;
  /** UMP's own answer to "may this app request ads at all?" */
  canRequestAds: boolean;
  /**
   * True when UMP says the app must offer a way back into the form — the
   * "privacy options" entry point an EEA user is entitled to. Drives the row
   * in Settings → Privacy.
   */
  privacyOptionsRequired: boolean;
  /** Whether the flow has completed at least once this launch. */
  resolved: boolean;
}

/** The shape this file needs from the plugin. Deliberately narrow. */
interface ConsentCapablePlugin {
  requestConsentInfo(options?: {
    tagForUnderAgeOfConsent?: boolean;
    debugGeography?: string;
    testDeviceIdentifiers?: string[];
  }): Promise<{
    status: string;
    isConsentFormAvailable?: boolean;
    canRequestAds?: boolean;
    privacyOptionsRequirementStatus?: string;
  }>;
  showConsentForm(): Promise<{
    status: string;
    canRequestAds?: boolean;
    privacyOptionsRequirementStatus?: string;
  }>;
  showPrivacyOptionsForm(): Promise<void>;
}

const UNRESOLVED: AdConsentState = {
  status: "UNKNOWN",
  canRequestAds: false,
  privacyOptionsRequired: false,
  resolved: false,
};

/**
 * Off-device there is no UMP and no real ad SDK: the web build simulates ads
 * and is governed by the site's own cookie/privacy notice, so treating it as
 * unresolved would switch off web analytics for everyone.
 */
const NOT_APPLICABLE: AdConsentState = {
  status: "NOT_REQUIRED",
  canRequestAds: true,
  privacyOptionsRequired: false,
  resolved: true,
};

let state: AdConsentState = UNRESOLVED;
let listeners: Array<(next: AdConsentState) => void> = [];

/** One flow at a time; two UMP forms cannot be presented at once. */
let inFlight: Promise<AdConsentState> | null = null;

/**
 * The under-age tag the current state was obtained with. If the age treatment
 * changes — the profile arrives, or the player finishes the age gate — the
 * request is made again so UMP is asked the right question.
 */
let resolvedForUnderAge: boolean | null = null;

function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

function publish(next: AdConsentState) {
  state = next;
  for (const listener of listeners) listener(state);
}

/** The last known state. Never blocks. */
export function getAdConsent(): AdConsentState {
  if (!isNative()) return NOT_APPLICABLE;
  return state;
}

/** Subscribe to consent changes. Fires immediately with the current state. */
export function subscribeToAdConsent(listener: (next: AdConsentState) => void): () => void {
  listeners.push(listener);
  listener(getAdConsent());
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

/**
 * Whether an ad may be requested.
 *
 * Deliberately false until the flow has resolved on a native build: requesting
 * an ad while the answer is still unknown is the exact behaviour this file
 * exists to stop. The web simulation is unaffected.
 */
export function adRequestsAllowed(): boolean {
  const current = getAdConsent();
  return current.resolved && current.canRequestAds;
}

/**
 * Whether product analytics may run.
 *
 * "Consent not required here" and "consent given" both qualify; "required and
 * not obtained" does not, and neither does "not asked yet".
 */
export function analyticsConsentAllowed(): boolean {
  const current = getAdConsent();
  if (!current.resolved) return false;
  return current.status === "NOT_REQUIRED" || current.status === "OBTAINED";
}

/** Whether Settings should offer the way back into the form. */
export function privacyOptionsRequired(): boolean {
  return getAdConsent().privacyOptionsRequired;
}

async function loadPlugin(): Promise<ConsentCapablePlugin | null> {
  try {
    const admob = await import("@capacitor-community/admob");
    return (admob.AdMob as unknown as ConsentCapablePlugin) ?? null;
  } catch (error) {
    console.warn("[ads] UMP unavailable — AdMob plugin failed to load:", error);
    return null;
  }
}

function normalise(
  info: {
    status?: string;
    canRequestAds?: boolean;
    privacyOptionsRequirementStatus?: string;
  },
): AdConsentState {
  const status = (info.status as AdConsentStatus) ?? "UNKNOWN";
  return {
    status,
    // `canRequestAds` arrived in plugin 7.0.3. If a build ever ships without
    // it, fall back to the status rather than to `false`, which would silently
    // disable every ad in the app.
    canRequestAds:
      typeof info.canRequestAds === "boolean"
        ? info.canRequestAds
        : status === "NOT_REQUIRED" || status === "OBTAINED",
    privacyOptionsRequired: info.privacyOptionsRequirementStatus === "REQUIRED",
    resolved: true,
  };
}

/**
 * Run the UMP flow, or return the answer already obtained.
 *
 * Safe to call from anywhere and as often as you like. It re-asks only when
 * the under-age treatment has changed, because that changes the question UMP
 * is being asked.
 *
 * Never throws: a failure here must not take the app or its ads down, and an
 * unresolved state already blocks ad requests on its own.
 */
/**
 * Force UMP to treat this device as being in the EEA, for testing.
 *
 * Without this the consent form is unreachable from outside Europe, which
 * includes Georgia — so the one prerequisite that decides whether the app
 * serves any ads at all in the EEA could not be verified from where it is
 * built. UMP decides geography server-side from the IP; a VPN is the only
 * alternative and it is not reliable.
 *
 * Off unless VITE_UMP_DEBUG_EEA is set, and the test-device id is required by
 * Google for debug geography to apply at all. Get the id from the Xcode
 * console on first run: the SDK logs it as
 * "To enable debug mode for this device, set: testDeviceIdentifiers = @[ ... ]".
 *
 *   VITE_UMP_DEBUG_EEA=<that-id> npm run build:ios
 *
 * Never set in a shipped build: the guard in verify-ios-bundle fails the
 * build if it leaks, because a production binary that thinks every user is in
 * the EEA would show the form to everyone.
 */
function debugOptions(): {
  debugGeography?: string;
  testDeviceIdentifiers?: string[];
} {
  const id = import.meta.env.VITE_UMP_DEBUG_EEA;
  if (!id) return {};
  return { debugGeography: "EEA", testDeviceIdentifiers: [String(id)] };
}

export async function ensureAdConsent(options?: {
  underAgeOfConsent?: boolean;
}): Promise<AdConsentState> {
  if (!isNative()) return NOT_APPLICABLE;

  const underAge = options?.underAgeOfConsent ?? true;

  if (state.resolved && resolvedForUnderAge === underAge) return state;
  if (inFlight) return inFlight;

  inFlight = (async (): Promise<AdConsentState> => {
    const plugin = await loadPlugin();
    if (!plugin) return state;

    try {
      const info = await plugin.requestConsentInfo({
        tagForUnderAgeOfConsent: underAge,
        ...debugOptions(),
      });

      let next = normalise(info);

      // A form is only shown when UMP says one is required and available.
      // Outside the EEA (and the regulated US states) this never runs.
      if (info.status === "REQUIRED" && info.isConsentFormAvailable) {
        try {
          const after = await plugin.showConsentForm();
          next = normalise(after);
        } catch (formError) {
          // The player dismissed it, or the message is not configured in the
          // AdMob console. Either way the status stands as REQUIRED and
          // `canRequestAds` stays false — no ad is served without consent.
          console.warn("[ads] UMP consent form did not complete:", formError);
        }
      }

      resolvedForUnderAge = underAge;
      publish(next);
      return next;
    } catch (error) {
      console.warn("[ads] UMP consent request failed:", error);
      return state;
    }
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

/**
 * Reopen the consent form from Settings.
 *
 * The GDPR requires consent to be as easy to withdraw as it was to give, which
 * in UMP terms is the privacy options form. Offered only when
 * `privacyOptionsRequired()` says it applies.
 */
export async function openAdPrivacyOptions(): Promise<boolean> {
  if (!isNative()) return false;
  const plugin = await loadPlugin();
  if (!plugin) return false;

  try {
    await plugin.showPrivacyOptionsForm();
  } catch (error) {
    console.warn("[ads] Could not present the privacy options form:", error);
    return false;
  }

  // The player may have just withdrawn consent — re-read rather than assume.
  try {
    const info = await plugin.requestConsentInfo({
      tagForUnderAgeOfConsent: resolvedForUnderAge ?? true,
    });
    publish(normalise(info));
  } catch (error) {
    console.warn("[ads] Could not re-read consent after the form:", error);
  }
  return true;
}

/** Test seam. Not used by the app. */
export function __resetAdConsentForTests() {
  state = UNRESOLVED;
  listeners = [];
  inFlight = null;
  resolvedForUnderAge = null;
}
