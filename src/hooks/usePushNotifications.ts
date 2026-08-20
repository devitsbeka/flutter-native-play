import { useCallback, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Device registration for push notifications.
 *
 * The server half of this has existed for a while: `send-push-notification`
 * is a complete FCM v1 sender with an APNs payload block, reading device
 * tokens from `push_tokens`. Nothing ever wrote a row to that table — there
 * was no `register()` call anywhere in the app — so the query returned
 * nothing and every send was a silent no-op.
 *
 * Two rules shape this:
 *
 * 1. **Never prompt on launch.** iOS gives one chance at the permission
 *    dialog; asking before the player understands what they would be
 *    notified about spends it for nothing. `requestPermission` is called from
 *    a settings toggle or a contextual moment, not from mount.
 * 2. **Registering is not the same as being asked.** If permission is already
 *    granted — a reinstall, a returning player — the token is refreshed
 *    quietly on every launch, because tokens rotate and a stale one fails
 *    silently.
 *
 * The token comes from `@capacitor-firebase/messaging`, not from
 * `@capacitor/push-notifications`, and that distinction is the whole reason
 * push still would not have worked once it was mounted. The two return
 * different things: the Capacitor plugin hands back the **APNs device
 * token**, while `send-push-notification` posts to FCM's `messages:send`,
 * whose `token` field wants an **FCM registration token**. FCM answers an
 * APNs token with INVALID_ARGUMENT.
 *
 * `@capacitor/push-notifications` is now GONE from the project for a second
 * reason: never imported, its native pod still loaded, and its `load()`
 * runs after this plugin's — overwriting Capacitor's single
 * `pushNotificationHandler` slot. Every notification tap was then emitted
 * on a plugin nobody listened to, so `notificationActionPerformed` below
 * never fired and a tap "just opened the app". Do not reinstall it
 * alongside this plugin.
 *
 * So the shape of the original bug survived being fixed: registration
 * succeeded, `push_tokens` filled up, the sender reported success per call,
 * and nothing was ever delivered. One FCM sender now serves iOS and Android
 * alike, which is also why Firebase is in the iOS build at all.
 *
 * Only this plugin registers. Calling `PushNotifications.register()` as well
 * would have both racing to claim APNs.
 */

export type PushPermission = "granted" | "denied" | "prompt" | "unsupported";

// Where a tapped notification wanted to go, held across the moment between
// the tap arriving and the router being able to honour it.
const PENDING_ROUTE_KEY = "push:pendingRoute";

// Module scope, not a ref.
//
// A ref is per-instance, and this hook now has two callers: PushRegistrar at
// the app root and the notifications row in Settings. Two instances would
// each bind their own tokenReceived and notificationActionPerformed
// listeners, so one tapped notification would navigate twice and one token
// would be upserted twice.
//
// Never torn down either. PushRegistrar lives for the life of the app, and
// push listeners are app-lifetime things: unbinding them because a settings
// screen closed would drop the token refresh that arrives while the player is
// elsewhere.
let listenersBound = false;

/**
 * Whether the player wants notifications, separately from whether iOS has
 * been asked.
 *
 * These are not the same switch and the app needs both. iOS grants permission
 * once and never takes it back from inside the app, so a settings toggle that
 * only read the permission could be turned on and never off — and turning it
 * off by deleting the token alone does not hold, because the launch refresh
 * below would put the row straight back on the next launch.
 *
 * Stored locally rather than on the profile: it describes this device, and
 * the row it controls in `push_tokens` is this device's row.
 */
const ENABLED_KEY = "push:enabled";

function readEnabled(): boolean {
  try {
    return localStorage.getItem(ENABLED_KEY) !== "false";
  } catch {
    return true;
  }
}

function writeEnabled(value: boolean): void {
  try {
    localStorage.setItem(ENABLED_KEY, String(value));
  } catch {
    /* private mode; the in-memory state still holds for this session */
  }
}

export function usePushNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [permission, setPermission] = useState<PushPermission>("unsupported");
  const [token, setToken] = useState<string | null>(null);
  const [enabled, setEnabledState] = useState<boolean>(readEnabled);

  const supported = Capacitor.isNativePlatform();

  /** Store or refresh this device's token against the signed-in user. */
  const persistToken = useCallback(
    async (value: string) => {
      // Read the preference rather than closing over it: the token refresh
      // and the tokenReceived listener both land here from instances that
      // were mounted before the player turned notifications off, and writing
      // the row back is exactly what "off" has to prevent.
      if (!user || !readEnabled()) return;
      const { error } = await supabase
        .from("push_tokens")
        .upsert(
          {
            user_id: user.id,
            token: value,
            platform: Capacitor.getPlatform(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,token" },
        );

      if (error) console.error("[push] Could not store token:", error);
    },
    [user],
  );

  // Bind listeners once. They must be attached before register() is called,
  // or the registration callback fires into nothing and the token is lost
  // until the next launch.
  useEffect(() => {
    if (!supported || listenersBound) return;
    listenersBound = true;

    (async () => {
      try {
        const { FirebaseMessaging } = await import("@capacitor-firebase/messaging");

        await FirebaseMessaging.addListener("tokenReceived", ({ token: t }) => {
          setToken(t);
          void persistToken(t);
        });

        // Tapping a notification should land on the thing it is about, not
        // just open the app on whatever screen it was last showing.
        await FirebaseMessaging.addListener(
          "notificationActionPerformed",
          ({ notification }) => {
            const data = notification.data as Record<string, unknown> | undefined;
            const route = data?.route ?? data?.deep_link;
            if (typeof route !== "string" || !route.startsWith("/")) return;

            // Parked before navigating, and drained on mount.
            //
            // A tap that cold-starts the app delivers this while the router
            // may still be mounting, and a navigate() into a router that is
            // not ready goes nowhere quietly — the app opens on the home
            // screen and the tap looks ignored. Writing it down first means
            // the destination survives that race and is applied as soon as
            // there is somewhere to apply it to.
            try {
              sessionStorage.setItem(PENDING_ROUTE_KEY, route);
            } catch {
              /* private mode; the direct navigate below still covers the
                 common case where the app was already running */
            }
            navigate(route);
          },
        );
      } catch (error) {
        console.warn("[push] Listener setup failed:", error);
      }
    })();
  }, [supported, persistToken, navigate]);

  // Apply a destination left behind by a tap that arrived before the router
  // could handle it. Cleared first, so a failed navigation cannot strand the
  // player on the same screen every launch from then on.
  useEffect(() => {
    let route: string | null = null;
    try {
      route = sessionStorage.getItem(PENDING_ROUTE_KEY);
      if (route) sessionStorage.removeItem(PENDING_ROUTE_KEY);
    } catch {
      return;
    }
    if (route && route.startsWith("/")) navigate(route);
  }, [navigate]);

  // Read the current permission on every mount, separately from binding.
  //
  // These were one effect, which meant the permission state was a side effect
  // of being the instance that happened to bind the listeners. The settings
  // row would then have sat at "unsupported" forever and rendered nothing,
  // whatever the real permission was.
  //
  // Shows no prompt: checkPermissions only reports. The token refresh is here
  // too, because tokens rotate and a stale one fails silently.
  useEffect(() => {
    if (!supported) return;
    let cancelled = false;

    (async () => {
      try {
        const { FirebaseMessaging } = await import("@capacitor-firebase/messaging");
        const status = await FirebaseMessaging.checkPermissions();
        if (cancelled) return;

        setPermission(status.receive === "prompt-with-rationale" ? "prompt" : status.receive);

        if (status.receive === "granted") {
          const { token: current } = await FirebaseMessaging.getToken();
          if (!cancelled && current) {
            setToken(current);
            void persistToken(current);
          }
        }
      } catch (error) {
        console.warn("[push] Permission check failed:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supported, persistToken]);

  /**
   * Ask for permission. Call from a settings toggle or a moment where the
   * player has just done something notifications relate to — never on launch.
   */
  const requestPermission = useCallback(async (): Promise<PushPermission> => {
    if (!supported) return "unsupported";

    try {
      const { FirebaseMessaging } = await import("@capacitor-firebase/messaging");
      const result = await FirebaseMessaging.requestPermissions();
      const next: PushPermission =
        result.receive === "prompt-with-rationale" ? "prompt" : result.receive;
      setPermission(next);

      if (next === "granted") {
        const { token: fresh } = await FirebaseMessaging.getToken();
        if (fresh) {
          setToken(fresh);
          void persistToken(fresh);
        }
      }
      return next;
    } catch (error) {
      console.error("[push] Permission request failed:", error);
      return "denied";
    }
  }, [supported, persistToken]);

  /**
   * Drop this device's token.
   *
   * Turning notifications off in the app has to remove the row, not just stop
   * asking — the sender reads the table directly, so a token left behind
   * keeps receiving.
   *
   * The token is asked for again rather than trusted from state: this hook
   * has two instances, and the one the settings row renders may never have
   * seen a `tokenReceived`. Leaving the row behind because `token` was null
   * would be the same silent failure as not deleting it at all.
   */
  const unregister = useCallback(async () => {
    if (!user) return;

    let value = token;
    if (!value && supported) {
      try {
        const { FirebaseMessaging } = await import("@capacitor-firebase/messaging");
        value = (await FirebaseMessaging.getToken()).token ?? null;
      } catch {
        /* nothing to look up; fall through */
      }
    }
    if (!value) return;

    await supabase.from("push_tokens").delete().eq("user_id", user.id).eq("token", value);
    setToken(null);
  }, [user, token, supported]);

  /**
   * The settings toggle.
   *
   * On means "this device may be sent notifications", which needs both the
   * iOS permission and a stored token. Off removes the token — iOS keeps the
   * permission, because the app cannot give it back, but nothing is sent.
   *
   * Returns where it landed rather than what was asked for: turning it on
   * when the player then declines the iOS dialog leaves it off, and the
   * switch has to follow.
   */
  const setEnabled = useCallback(
    async (next: boolean): Promise<boolean> => {
      writeEnabled(next);
      setEnabledState(next);

      if (!supported) return next;

      if (!next) {
        await unregister();
        return false;
      }

      let granted = permission === "granted";
      if (!granted) {
        granted = (await requestPermission()) === "granted";
      } else {
        try {
          const { FirebaseMessaging } = await import("@capacitor-firebase/messaging");
          const { token: fresh } = await FirebaseMessaging.getToken();
          if (fresh) {
            setToken(fresh);
            await persistToken(fresh);
          }
        } catch (error) {
          console.warn("[push] Could not refresh token:", error);
        }
      }

      if (!granted) {
        // Declined, or previously denied and never asked again. Saying it is
        // on when nothing can arrive is the lie this whole feature has
        // already told once.
        writeEnabled(false);
        setEnabledState(false);
        return false;
      }
      return true;
    },
    [supported, permission, requestPermission, persistToken, unregister],
  );

  // A token that arrived before sign-in belongs to whoever signs in next.
  useEffect(() => {
    if (user && token) persistToken(token);
  }, [user, token, persistToken]);

  return {
    supported,
    permission,
    token,
    // On only when iOS agrees as well: permission denied in Settings means
    // nothing is delivered whatever this device last chose.
    enabled: enabled && permission === "granted",
    requestPermission,
    setEnabled,
    unregister,
  };
}
