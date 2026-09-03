import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { ensureTrackingConsent } from "@/native/trackingConsent";
import { useAuth } from "@/hooks/useAuth";

/**
 * Mounts push registration for the lifetime of the app, and asks a new player
 * for permission once.
 *
 * Renders nothing. It exists because `usePushNotifications` is a hook, and a
 * hook nobody calls does nothing at all — which is precisely the bug it was
 * written to fix. The FCM sender had been reading an empty `push_tokens`
 * table because no client ever registered; adding the hook without mounting
 * it left the table exactly as empty.
 *
 * On a launch where permission is still unasked, it prompts. Two guards on
 * that, because iOS shows the system dialog **once for the lifetime of the
 * install** — a player who dismisses it can never be asked again from inside
 * the app, and the Settings toggle can then only send them to iOS Settings.
 *
 *  1. Signed in first. An invitation notification is addressed to an account,
 *     so asking before there is one spends the single dialog on a device that
 *     cannot yet be notified about anything.
 *  2. Once per install — but recorded only once iOS has actually been asked.
 *     See below; writing it first is what broke this.
 *
 * The short delay is not cosmetic. A permission sheet over a still-painting
 * first screen reads as an interruption by something the player has not seen
 * yet, and gets dismissed on reflex — which on iOS is permanent.
 *
 * ## Why the flag moved, and why the callback is a ref
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
 *
 * So the callback is held in a ref and kept out of the dependency list — the
 * timer survives an auth refresh — and the flag is written after the request
 * resolves. A cancelled timer now simply asks again next launch, which is the
 * failure this should have.
 */

const ASKED_KEY = "push:prompted";
const ASK_DELAY_MS = 4000;

export function PushRegistrar() {
  const { permission, requestPermission } = usePushNotifications();
  const { user } = useAuth();
  const asked = useRef(false);

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

    const timer = setTimeout(() => {
      void (async () => {
        try {
          // Never stack two system dialogs. On iOS the launch-time ATT flow
          // may still be on screen, and a permission sheet arriving over it is
          // dismissed on reflex. Resolves immediately once tracking is decided,
          // and on every non-iOS target.
          await ensureTrackingConsent();
          await requestRef.current();
        } finally {
          // Recorded here, not before the timer: the flag means "iOS has been
          // asked", and until this line it has not been.
          try {
            localStorage.setItem(ASKED_KEY, "1");
          } catch {
            /* private mode; the in-memory guard still holds for this session */
          }
        }
      })();
    }, ASK_DELAY_MS);

    return () => clearTimeout(timer);
    // `requestPermission` is deliberately absent — see the note above.
  }, [user?.id, permission]);

  return null;
}
