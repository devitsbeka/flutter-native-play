import { Capacitor } from "@capacitor/core";
import { ensureTrackingConsent } from "@/native/trackingConsent";

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
    debugGeography?: number;
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
/**
 * The explanation screen shown immediately before Google's own consent form.
 *
 * Google's form is a wall of legal text listing 198 ad partners, and it opens
 * cold. On its own it reads as something gone wrong rather than a choice being
 * offered, which is how you get a player tapping the first button to make it
 * go away — a consent nobody can honestly call informed.
 *
 * So it gets the same treatment as the tracking and notification prompts: say
 * what the next screen is and why it exists, then hand over. Only shown when a
 * form is actually going to appear, which is the EEA, the UK and Switzerland
 * — everywhere else this never runs and the player sees nothing.
 */
type PrePromptListener = (open: boolean) => void;
let prePromptListeners: PrePromptListener[] = [];
let prePromptOpen = false;
let acknowledgePrePromptResolve: (() => void) | null = null;

/** How long to wait for the screen before going straight to Google's form. */
const AD_PRE_PROMPT_DEADLINE_MS = 8000;

function setPrePromptOpen(open: boolean) {
  prePromptOpen = open;
  for (const listener of prePromptListeners) listener(open);
}

/** Subscribe the explanation screen. Returns an unsubscribe. */
export function subscribeToAdPrePrompt(listener: PrePromptListener): () => void {
  prePromptListeners.push(listener);
  listener(prePromptOpen);
  return () => {
    prePromptListeners = prePromptListeners.filter((l) => l !== listener);
  };
}

/** Called by the explanation screen when the player is ready to continue. */
export function acknowledgeAdPrePrompt() {
  const resolve = acknowledgePrePromptResolve;
  acknowledgePrePromptResolve = null;
  setPrePromptOpen(false);
  resolve?.();
}

/**
 * Show it and wait, but never longer than the deadline.
 *
 * A screen that fails to render must cost the explanation, not the form —
 * the same rule the tracking flow follows, for the same reason: without a
 * form, ads are refused outright in the EEA.
 */
function showAdPrePrompt(): Promise<void> {
  return new Promise<void>((resolve) => {
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve();
    };

    acknowledgePrePromptResolve = settle;

    const timer = setTimeout(() => {
      if (acknowledgePrePromptResolve === settle) acknowledgePrePromptResolve = null;
      setPrePromptOpen(false);
      settle();
    }, AD_PRE_PROMPT_DEADLINE_MS);

    setPrePromptOpen(true);
  });
}

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
/**
 * How long UMP gets to answer `requestConsentInfo` before we stop waiting.
 *
 * This is a network round-trip to Google, made during a cold start, and it has
 * no timeout of its own. On build 50 that turned out to matter far more than
 * the ad it governs: `PushRegistrar` awaits this flow before showing the
 * notification explainer, so a `requestConsentInfo` that never came back took
 * the notification prompt down with it — the player got the tracking dialog,
 * then nothing, for the life of the install.
 *
 * A consent answer we could not obtain is already handled: the state stays
 * unresolved, `adRequestsAllowed()` stays false, and no ad is requested. That
 * is the correct outcome and it costs an ad. Blocking forever costs the
 * notification prompt as well, which is not a trade worth making.
 *
 * Only the network step is bounded. The form itself is not — once Google's
 * form is on screen a player is reading it, and cutting that off mid-read
 * would be the one thing worse than not showing it.
 */
const CONSENT_INFO_DEADLINE_MS = 8000;

/** Resolve with `fallback` if `work` has not settled within `ms`. */
async function withDeadline<T>(work: Promise<T>, ms: number, onTimeout: () => T): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const deadline = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(onTimeout()), ms);
  });
  try {
    return await Promise.race([work, deadline]);
  } finally {
    clearTimeout(timer!);
  }
}

function debugOptions(): {
  debugGeography?: number;
  testDeviceIdentifiers?: string[];
} {
  const id = import.meta.env.VITE_UMP_DEBUG_EEA;
  if (!id) return {};
  // A number, not "EEA".
  //
  // The native side reads this with `call.getInt("debugGeography", 0)` and
  // maps it through `DebugGeography(rawValue:)`
  // (`AdMobPlugin.swift`, `requestConsentInfo`). A string does not parse as an
  // Int, so it fell back to 0 — `disabled` — and the override did nothing at
  // all. The one switch that makes the EEA form reachable from outside Europe
  // was off the entire time it appeared to be on.
  //
  // 1 is `DebugGeography.EEA`. Google still only applies it to a device listed
  // in `testDeviceIdentifiers`, which is why the id is required alongside it.
  return { debugGeography: DEBUG_GEOGRAPHY_EEA, testDeviceIdentifiers: [String(id)] };
}

/** `UMPDebugGeography.EEA`. 0 is disabled, 2 is notEEA. */
const DEBUG_GEOGRAPHY_EEA = 1;

export async function ensureAdConsent(options?: {
  underAgeOfConsent?: boolean;
}): Promise<AdConsentState> {
  if (!isNative()) return NOT_APPLICABLE;

  // A caller that does not know the age asks for the answer we already have,
  // not for a new one under an assumption of its own.
  //
  // This defaulted to `true` unconditionally, and two callers disagreed as a
  // result: `useConsentOrchestration` resolves the flow with the real age
  // (`false` for an adult), and every no-argument caller — `PushRegistrar`,
  // `mayRequestAds` — then asked again with `true`, missed the cache on
  // `resolvedForUnderAge`, and drove a fresh native round-trip to Google. On a
  // signed-in adult that happened on every single ad tap, each one serialised
  // behind `inFlight`, and it also overwrote the correct adult treatment with
  // the under-age one. Falling back to the answer on file makes a no-argument
  // call what it reads as: "whatever we decided already".
  const underAge = options?.underAgeOfConsent ?? resolvedForUnderAge ?? true;

  if (state.resolved && resolvedForUnderAge === underAge) return state;
  if (inFlight) return inFlight;

  inFlight = (async (): Promise<AdConsentState> => {
    // Apple's dialog first, then Google's form. Two consent surfaces racing
    // each other at launch is how a player ends up tapping through one they
    // never read, and on iOS the system dialog wins the window regardless —
    // so the CMP form would be the one that got dismissed blind.
    //
    // Resolves instantly once ATT has an answer on file, and on every
    // non-iOS target, so this costs nothing after the first launch.
    await ensureTrackingConsent();

    const plugin = await loadPlugin();
    if (!plugin) return state;

    try {
      const info = await withDeadline(
        plugin.requestConsentInfo({
          tagForUnderAgeOfConsent: underAge,
          ...debugOptions(),
        }),
        CONSENT_INFO_DEADLINE_MS,
        () => {
          console.warn(
            "[ads] UMP did not answer within " +
              `${CONSENT_INFO_DEADLINE_MS}ms — carrying on without a consent ` +
              "answer. No ad will be requested this session.",
          );
          return null;
        },
      );

      // Timed out. Leave the state unresolved so nothing is served, and let
      // every caller downstream of this get on with what it was doing.
      if (!info) return state;

      let next = normalise(info);

      // A form is only shown when UMP says one is required and available.
      // Outside the EEA (and the regulated US states) this never runs.
      if (info.status === "REQUIRED" && info.isConsentFormAvailable) {
        try {
          // Explain, then hand over. Only reached where a form exists.
          await showAdPrePrompt();
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
