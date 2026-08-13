import { Capacitor } from "@capacitor/core";
import { trackingService, type TrackingStatus } from "@/services/trackingService";

/**
 * When the App Tracking Transparency prompt gets shown, and what precedes it.
 *
 * The prompt used to fire from `adService.initialize()`, which runs in a bare
 * effect in `useAds` — so the system dialog appeared the instant any screen
 * mounting that hook loaded, before the player had seen the game or had any
 * idea what was being asked. A cold ATT prompt is denied by most people who
 * see it, and it can only ever be asked once: iOS remembers the answer, and
 * `requestTrackingAuthorization` returns the stored result forever after.
 *
 * So the order here is: the player reaches a moment where tracking is
 * actually relevant (they are about to watch an ad), a screen explains what
 * the choice means, and only then does the system prompt appear.
 *
 * This module owns the "has it been asked" state and the pre-prompt handoff.
 * The React side lives in `TrackingConsentGate`.
 */

const ASKED_KEY = "mytrivia_att_asked";

type Listener = (open: boolean) => void;

let listeners: Listener[] = [];
let pendingResolve: ((proceed: boolean) => void) | null = null;
let isOpen = false;

function setOpen(open: boolean) {
  isOpen = open;
  for (const listener of listeners) listener(open);
}

/** Subscribe the pre-prompt UI to open/close. Returns an unsubscribe. */
export function subscribeToPrePrompt(listener: Listener): () => void {
  listeners.push(listener);
  listener(isOpen);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

/** Called by the pre-prompt when the player answers it. */
export function answerPrePrompt(proceed: boolean) {
  setOpen(false);
  pendingResolve?.(proceed);
  pendingResolve = null;
}

function markAsked() {
  try {
    localStorage.setItem(ASKED_KEY, "1");
  } catch {
    /* storage unavailable — worst case the pre-prompt shows twice */
  }
}

function hasAsked(): boolean {
  try {
    return localStorage.getItem(ASKED_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Ask for tracking consent if it has not been decided yet.
 *
 * Safe to call repeatedly and from anywhere: it returns immediately on the
 * web, on Android, and once iOS has an answer on file. Resolves to the
 * resulting status so callers can decide about personalisation.
 *
 * Declining the pre-prompt deliberately does **not** show the system dialog.
 * Burning the one chance iOS gives us on a player who has already said no is
 * worse than leaving it undetermined — this way they can be asked again later.
 */
export async function ensureTrackingConsent(): Promise<TrackingStatus> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") {
    return "unavailable";
  }

  await trackingService.initialize();
  const status = await trackingService.checkStatus();

  // Already answered, or the device does not support the prompt.
  if (status !== "notDetermined") return status;

  if (hasAsked()) return status;

  const proceed = await new Promise<boolean>((resolve) => {
    pendingResolve = resolve;
    setOpen(true);
  });

  markAsked();

  if (!proceed) return "notDetermined";

  return trackingService.requestAuthorization();
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
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") {
    return true;
  }
  return trackingService.getStatus() === "authorized";
}
