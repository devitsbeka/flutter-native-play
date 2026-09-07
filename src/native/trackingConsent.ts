import { Capacitor } from "@capacitor/core";
import { trackingService, type TrackingStatus } from "@/services/trackingService";

/**
 * When the App Tracking Transparency prompt is shown, and what precedes it.
 *
 * ## Why this is now a launch concern
 *
 * The prompt used to be reachable only from `adService` — from
 * `showRewardedAdWithPreload()` and `showInterstitial()`. Ads in this app are
 * strictly opt-in (see `useAds`), so reaching either meant signing in,
 * exhausting the free plays, finding the "watch ad" button, pressing it, and
 * then accepting a pre-prompt. App Review did none of that and rejected build
 * 34 under guideline 2.1: the prompt was, from outside, simply not there.
 *
 * Three further things could each suppress it on their own:
 *
 *   - the VIP bypass in both ad paths returned *before* the consent call, so
 *     a PRO or admin review account could not reach the prompt at all;
 *   - declining the pre-prompt wrote `mytrivia_att_asked` to localStorage and
 *     deliberately never showed the system dialog — one tap and the prompt was
 *     gone for the life of the install;
 *   - ATT rode on the AdMob plugin's dynamic import (see `trackingService`).
 *
 * So the ordering rule has changed. It is no longer "ask at the first ad"; it
 * is **ask once the app knows who it is asking**. The ad paths still call
 * `ensureTrackingConsent()`, but only as a backstop.
 *
 * ## Why the prompt waits for an age
 *
 * `NativeBridge` used to call `primeTrackingConsent()` inside a double
 * `requestAnimationFrame` right after the splash came down — the first painted
 * frame of a cold start, with no session, no age and no interaction. The age
 * gate lives inside `SignupOnboardingModal`, which runs *after* signup, so a
 * 13-year-old was asked to allow tracking before ever declaring an age. That
 * is guideline 5.1.4, and it is not fixable with better copy.
 *
 * `primeTrackingConsent()` now registers the intent to ask; the prompt itself
 * waits for `declareAgeGroup()` — called by `useConsentOrchestration` once the
 * profile has loaded and by the age gate once it is answered — and appears
 * only for an explicit adult. A player who is 13–17, or whose age is unknown
 * (every anonymous guest), is never asked: `isUnderAgeOfConsent` already keeps
 * them off personalised ads, so there is nothing to ask them for.
 *
 * ## Why there is no "Not now"
 *
 * There used to be, and it wrote a permanent flag. The honest place for a
 * refusal is Apple's own dialog, which offers exactly that in
 * "Ask App Not to Track" — and unlike a private flag, iOS lets the player
 * revisit it in Settings. The explanation screen's single action leads to the
 * system dialog; nothing here records a decision iOS has not recorded.
 *
 * Anything short of an explicit yes leaves ads non-personalised, so a player
 * who ignores the screen loses nothing but relevance.
 */

type Listener = (open: boolean) => void;

let listeners: Listener[] = [];
let isOpen = false;

/** Resolves when the player has acknowledged the explanation screen. */
let acknowledge: (() => void) | null = null;

/** One request at a time — two dialogs cannot be shown, and the loser would hang. */
let inFlight: Promise<TrackingStatus> | null = null;

/** Set once the launch has asked for the prompt to happen when it may. */
let launchPrimed = false;

/** The age group the app currently believes it is dealing with. */
let declaredAgeGroup: string | null = null;

/**
 * How long to wait for the explanation screen before going straight to iOS.
 *
 * A safety valve, not a timeout anyone should hit. If `TrackingConsentGate`
 * is unmounted, crashed, or covered, the store requirement still has to be
 * met — showing the system dialog without the pre-prompt is a worse
 * conversion rate and a perfectly compliant app. Never showing it is a
 * rejection.
 */
const PRE_PROMPT_DEADLINE_MS = 8000;

function setOpen(open: boolean) {
  isOpen = open;
  for (const listener of listeners) listener(open);
}

/** Subscribe the explanation screen to open/close. Returns an unsubscribe. */
export function subscribeToPrePrompt(listener: Listener): () => void {
  listeners.push(listener);
  listener(isOpen);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

/** Called by the explanation screen when the player is ready to continue. */
export function acknowledgePrePrompt() {
  const resolve = acknowledge;
  acknowledge = null;
  setOpen(false);
  resolve?.();
}

function isIosNative(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

function showPrePrompt(): Promise<void> {
  return new Promise<void>((resolve) => {
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve();
    };

    acknowledge = settle;

    const timer = setTimeout(() => {
      // Give up on the screen, not on the prompt.
      if (acknowledge === settle) acknowledge = null;
      setOpen(false);
      settle();
    }, PRE_PROMPT_DEADLINE_MS);

    setOpen(true);
  });
}

/**
 * Ask for tracking consent if iOS has no answer on file.
 *
 * Safe to call repeatedly and from anywhere: it returns immediately on the
 * web, on Android, and once iOS has decided. Concurrent callers share one
 * in-flight request rather than queueing a second dialog.
 */
export async function ensureTrackingConsent(): Promise<TrackingStatus> {
  if (!isIosNative()) return "unavailable";
  if (inFlight) return inFlight;

  inFlight = (async () => {
    await trackingService.initialize();
    const status = await trackingService.checkStatus();

    // Already answered, or the device cannot be asked.
    if (status !== "notDetermined") return status;

    await showPrePrompt();

    try {
      return await trackingService.requestAuthorization();
    } finally {
      // The screen is dismissed on acknowledgement, but a native failure must
      // not leave it on top of the app.
      setOpen(false);
    }
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

/**
 * Ask now, if both halves of the condition are met.
 *
 * The launch has to have primed (so this never fires during a background
 * refresh before the app is on screen) and the player has to have told us
 * they are an adult. Failure is swallowed — nothing about a launch may depend
 * on it — and an undetermined status is simply retried next time.
 */
function promptIfPermitted(): void {
  if (!launchPrimed) return;
  if (!isIosNative()) return;

  // No age condition, and that is deliberate — it is the whole reason the app
  // was rejected.
  //
  // This used to read `if (declaredAgeGroup !== ADULT_AGE_GROUP) return;`,
  // added to avoid asking a minor about tracking. The effect was that nobody
  // was asked at all unless they signed up AND ticked 18+, because a guest
  // never declares an age and `declareAgeGroup(null)` means "unknown". App
  // Review installed the app on an iPad, played as a guest, never found the
  // prompt, and rejected under guideline 2.1:
  //
  //   "The app uses the AppTrackingTransparency framework, but we are unable
  //    to locate the App Tracking Transparency permission request."
  //
  // Apple does not forbid showing this prompt to a minor. Only Kids Category
  // apps must not use ATT at all, and this app is not one — `madeForKids` is
  // false. What protects younger players is not withholding the question; it
  // is `tagForUnderAgeOfConsent` and the non-personalised ad path, which run
  // off `declareAgeGroup` and treat an unknown age as under-age. Those are
  // untouched.
  //
  // So: everyone is asked, once, on first launch. That is the only version of
  // this a reviewer can reliably find.
  void ensureTrackingConsent().catch(() => {
    /* retried on the next launch */
  });
}

/**
 * The launch-time entry point, called by `NativeBridge`.
 *
 * This prompts. It is the only trigger that matters, and it runs on every
 * cold start until iOS has an answer on file.
 *
 * Deliberately tied to nothing else — not ads, not sign-in, not age, not VIP.
 * Every condition placed in front of this prompt is a condition under which a
 * reviewer does not see it, and one already cost a rejection.
 */
export async function primeTrackingConsent(): Promise<void> {
  if (!isIosNative()) return;
  launchPrimed = true;
  promptIfPermitted();
}

/**
 * Tell the consent flow how old the player says they are.
 *
 * This no longer gates the ATT prompt (see `promptIfPermitted`). It is kept
 * because the age still decides how ads behave: `tagForUnderAgeOfConsent` for
 * Google's consent flow, and the restricted content rating in `adService`.
 * An unknown age counts as under-age for both.
 *
 * Safe to call repeatedly with the same value.
 */
export function declareAgeGroup(ageGroup: string | null | undefined): void {
  const next = ageGroup ?? null;
  if (next === declaredAgeGroup) return;
  declaredAgeGroup = next;
  promptIfPermitted();
}

/** The age group the prompt is currently gated on. Exposed for tests. */
export function declaredAgeGroupForTests(): string | null {
  return declaredAgeGroup;
}

/** The decided status, without prompting. */
export function currentTrackingStatus(): TrackingStatus {
  return trackingService.getStatus();
}

/**
 * Whether ads may be personalised.
 *
 * Anything short of an explicit yes means non-personalised. On Android and
 * the web there is no ATT, so this is governed by the age-group rules in
 * adService instead.
 */
export function personalizedAdsAllowed(): boolean {
  if (!isIosNative()) return true;
  return trackingService.getStatus() === "authorized";
}
