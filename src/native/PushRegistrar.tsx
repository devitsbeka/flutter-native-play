import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { PushConsentGate } from "@/native/PushConsentGate";
import { ensureTrackingConsent } from "@/native/trackingConsent";
import { useAuth } from "@/hooks/useAuth";

/**
 * Mounts push registration for the lifetime of the app, and asks a new player
 * for permission once — after explaining what is being asked.
 *
 * It exists because `usePushNotifications` is a hook, and a hook nobody calls
 * does nothing at all — which is precisely the bug it was written to fix. The
 * FCM sender had been reading an empty `push_tokens` table because no client
 * ever registered; adding the hook without mounting it left the table exactly
 * as empty.
 *
 * On a launch where permission is still unasked, it prompts. Three guards on
 * that, because iOS shows the system dialog **once for the lifetime of the
 * install** — a player who dismisses it can never be asked again from inside
 * the app, and the Settings toggle can then only send them to iOS Settings.
 *
 *  1. Signed in first. An invitation notification is addressed to an account,
 *     so asking before there is one spends the single dialog on a device that
 *     cannot yet be notified about anything.
 *  2. Once per install — but recorded only once iOS has actually been asked.
 *     See below; writing it first is what broke this.
 *  3. Tracking first, if tracking is being asked about on this launch. Two
 *     system sheets must not stack: the second arrives over the first and is
 *     dismissed on reflex, which on iOS is permanent.
 *
 * The short delay is not cosmetic. A permission sheet over a still-painting
 * first screen reads as an interruption by something the player has not seen
 * yet, and gets dismissed on reflex.
 *
 * ## Why there is a screen in front of it
 *
 * The system dialog used to go up cold, over the home screen. "MyTrivia Would
 * Like to Send You Notifications" describes the mechanism and not the offer,
 * and the answer is permanent, so it was the most expensive tap in the app to
 * leave unexplained. `PushConsentGate` says what would actually be sent and
 * then hands over to Apple — the same shape the tracking prompt already had.
 *
 * The flag is written when that hand-over happens, not when the screen opens:
 * a player who never reaches the system dialog is asked again next launch,
 * which is the failure this should have.
 *
 * ## Why the callback is a ref
 *
 * The delay used to be armed by an effect that depended on `requestPermission`,
 * and the "already asked" flag was written *before* the timer, deliberately, so
 * a rejected promise could not leave it unset.
 *
 * Both halves of that were wrong together. `requestPermission` is rebuilt
 * whenever `user` changes identity, and `AuthContext` hands out a fresh `User`
 * object from both `onAuthStateChange` and `getSession()` — twice, within the
 * first second of launch. Each new identity re-ran this effect; the cleanup
 * cleared the pending timer, and the re-run returned early at the `asked`
 * guard, so nothing re-armed it. The prompt never fired. The flag, already
 * persisted, then suppressed every future launch: build 35 shipped with iOS
 * still reporting `notDetermined`, and the only way to reach the dialog was
 * the Settings row.
 */

const ASKED_KEY = "push:prompted";
const ASK_DELAY_MS = 4000;

export function PushRegistrar() {
  const { permission, requestPermission } = usePushNotifications();
  const { user } = useAuth();
  const asked = useRef(false);
  const [explaining, setExplaining] = useState(false);

  // Latest callback without depending on its identity. The effect below arms a
  // timer; re-running it on a new function reference cancels that timer, and
  // the guard inside stops it being armed a second time.
  const requestRef = useRef(requestPermission);
  useEffect(() => {
    requestRef.current = requestPermission;
  }, [requestPermission]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (!user?.id) return;
    // "prompt" is the only state worth acting on. Granted needs nothing, and
    // denied cannot be undone from here — iOS will not show the dialog twice.
    if (permission !== "prompt") return;
    if (asked.current) return;

    try {
      if (localStorage.getItem(ASKED_KEY)) return;
    } catch {
      // Private mode or a full store. Falling through means this player may
      // be asked again on a later launch, which is better than never asking.
    }
    asked.current = true;

    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        // Resolves immediately once tracking is decided, and on every non-iOS
        // target. When the launch-time ATT flow is still on screen, this waits
        // for it rather than opening a second screen behind it.
        await ensureTrackingConsent();
        if (!cancelled) setExplaining(true);
      })();
    }, ASK_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // `requestPermission` is deliberately absent — see the note above.
  }, [user?.id, permission]);

  const handleContinue = useCallback(() => {
    setExplaining(false);
    void (async () => {
      try {
        await requestRef.current();
      } finally {
        // Recorded here, not when the screen opened: the flag means "iOS has
        // been asked", and until this line it has not been.
        try {
          localStorage.setItem(ASKED_KEY, "1");
        } catch {
          /* private mode; the in-memory guard still holds for this session */
        }
      }
    })();
  }, []);

  return <PushConsentGate open={explaining} onContinue={handleContinue} />;
}
