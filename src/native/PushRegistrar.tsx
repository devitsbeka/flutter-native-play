import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { usePushNotifications } from "@/hooks/usePushNotifications";
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
 *  2. Once per install, recorded before the call rather than after. The flag
 *     is what stops a re-render, a sign-out and back in, or a second mount
 *     from re-entering; it is written first so a rejected promise cannot
 *     leave it unset and re-ask on the next launch.
 *
 * The short delay is not cosmetic. A permission sheet over a still-painting
 * first screen reads as an interruption by something the player has not seen
 * yet, and gets dismissed on reflex — which on iOS is permanent.
 */

const ASKED_KEY = "push:prompted";
const ASK_DELAY_MS = 4000;

export function PushRegistrar() {
  const { permission, requestPermission } = usePushNotifications();
  const { user } = useAuth();
  const asked = useRef(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (!user?.id) return;
    // "prompt" is the only state worth acting on. Granted needs nothing, and
    // denied cannot be undone from here — iOS will not show the dialog twice.
    if (permission !== "prompt") return;
    if (asked.current) return;

    try {
      if (localStorage.getItem(ASKED_KEY)) return;
      localStorage.setItem(ASKED_KEY, "1");
    } catch {
      // Private mode or a full store. Falling through means this player may
      // be asked again on a later launch, which is better than never asking.
    }
    asked.current = true;

    const timer = setTimeout(() => {
      void requestPermission();
    }, ASK_DELAY_MS);

    return () => clearTimeout(timer);
  }, [user?.id, permission, requestPermission]);

  return null;
}
