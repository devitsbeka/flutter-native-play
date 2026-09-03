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
 * is **ask once the app is up and the player can see what they are answering
 * about**, which `NativeBridge` triggers after the first route has painted.
 * The ad paths still call `ensureTrackingConsent()`, but only as a backstop.
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
 * The launch-time entry point, called by `NativeBridge` once the first route
 * has painted and the splash screen is down.
 *
 * Distinct from `ensureTrackingConsent()` only in intent: this is the call
 * that satisfies the store requirement, and it is deliberately not tied to
 * ads, sign-in, VIP status, or any feature a reviewer might not reach.
 * Failure is swallowed — a launch must never be blocked by it — and an
 * undetermined status is simply retried on the next launch.
 */
export async function primeTrackingConsent(): Promise<void> {
  if (!isIosNative()) return;
  try {
    await ensureTrackingConsent();
  } catch {
    /* retried next launch */
  }
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
