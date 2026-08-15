import { useCallback, useEffect, useRef, useState } from "react";
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
 * So the shape of the original bug survived being fixed: registration
 * succeeded, `push_tokens` filled up, the sender reported success per call,
 * and nothing was ever delivered. One FCM sender now serves iOS and Android
 * alike, which is also why Firebase is in the iOS build at all.
 *
 * Only this plugin registers. Calling `PushNotifications.register()` as well
 * would have both racing to claim APNs.
 */

export type PushPermission = "granted" | "denied" | "prompt" | "unsupported";

export function usePushNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [permission, setPermission] = useState<PushPermission>("unsupported");
  const [token, setToken] = useState<string | null>(null);
  const listenersBound = useRef(false);

  const supported = Capacitor.isNativePlatform();

  /** Store or refresh this device's token against the signed-in user. */
  const persistToken = useCallback(
    async (value: string) => {
      if (!user) return;
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
    if (!supported || listenersBound.current) return;
    listenersBound.current = true;

    let disposers: Array<() => void> = [];
    let cancelled = false;

    (async () => {
      try {
        const { FirebaseMessaging } = await import("@capacitor-firebase/messaging");

        const received = await FirebaseMessaging.addListener("tokenReceived", ({ token: t }) => {
          setToken(t);
          persistToken(t);
        });

        // Tapping a notification should land on the thing it is about, not
        // just open the app on whatever screen it was last showing.
        const action = await FirebaseMessaging.addListener(
          "notificationActionPerformed",
          ({ notification }) => {
            const data = notification.data as Record<string, unknown> | undefined;
            const route = data?.route ?? data?.deep_link;
            if (typeof route === "string" && route.startsWith("/")) navigate(route);
          },
        );

        if (cancelled) {
          received.remove();
          action.remove();
          return;
        }

        disposers = [() => received.remove(), () => action.remove()];

        // Already granted (reinstall, or a returning player): fetch the token
        // again rather than waiting for it to rotate. This shows no prompt.
        const status = await FirebaseMessaging.checkPermissions();
        setPermission(status.receive === "prompt-with-rationale" ? "prompt" : status.receive);
        if (status.receive === "granted") {
          const { token: current } = await FirebaseMessaging.getToken();
          if (current) {
            setToken(current);
            void persistToken(current);
          }
        }
      } catch (error) {
        console.warn("[push] Setup failed:", error);
      }
    })();

    return () => {
      cancelled = true;
      for (const dispose of disposers) dispose();
      listenersBound.current = false;
    };
  }, [supported, persistToken, navigate]);

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
   */
  const unregister = useCallback(async () => {
    if (!user || !token) return;
    await supabase.from("push_tokens").delete().eq("user_id", user.id).eq("token", token);
    setToken(null);
  }, [user, token]);

  // A token that arrived before sign-in belongs to whoever signs in next.
  useEffect(() => {
    if (user && token) persistToken(token);
  }, [user, token, persistToken]);

  return { supported, permission, token, requestPermission, unregister };
}
