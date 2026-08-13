import { usePushNotifications } from "@/hooks/usePushNotifications";

/**
 * Mounts push registration for the lifetime of the app.
 *
 * Renders nothing. It exists because `usePushNotifications` is a hook, and a
 * hook nobody calls does nothing at all — which is precisely the bug it was
 * written to fix. The FCM sender had been reading an empty `push_tokens`
 * table because no client ever registered; adding the hook without mounting
 * it left the table exactly as empty.
 *
 * Mounting is deliberately not the same as prompting. The hook only calls
 * `register()` when permission has *already* been granted, so this refreshes
 * a rotated APNs token on launch and does nothing to a user who has never
 * been asked. The ask itself belongs to a contextual moment — see
 * `requestPermission` on the hook, surfaced from Settings.
 */
export function PushRegistrar() {
  usePushNotifications();
  return null;
}
