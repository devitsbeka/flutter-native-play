import { motion } from "framer-motion";
import { Bell, Loader2 } from "lucide-react";
import { useState } from "react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useLanguage } from "@/contexts/LanguageContext";
import { Switch } from "@/components/ui/switch";

/**
 * The switch that turns push notifications on.
 *
 * `usePushNotifications` deliberately never prompts on launch: iOS gives one
 * chance at the permission dialog, and spending it before the player knows
 * what they would be notified about wastes it. That rule was written and the
 * screen it depends on was not — nothing in the app called
 * `requestPermission`, so permission was never granted, `getToken` was never
 * reached, and `push_tokens` stayed empty on every device.
 *
 * The whole delivery path existed behind that: a mounted registrar, bound
 * listeners, an FCM v1 sender reading the table, an APNs key uploaded to
 * Firebase. All of it correct, and none of it reachable, because the one
 * thing that asks was missing.
 *
 * Native only. On the web there is nothing to grant.
 *
 * A switch rather than a button that turns into the word "On". Every other
 * setting on this screen is a switch, and one that reports a state it will
 * not let you change reads as a status line — the player asked for the
 * on/off they get everywhere else. Turning it off deletes this device's push
 * token, which is what actually stops delivery; iOS keeps the permission,
 * because an app cannot hand that back, and turning it on again re-registers
 * without a second dialog.
 */
export function NotificationSettingsRow({ delay = 0.22 }: { delay?: number }) {
  const { t } = useLanguage();
  const { supported, permission, enabled, setEnabled } = usePushNotifications();
  const [asking, setAsking] = useState(false);

  if (!supported) return null;

  // Denied is terminal in-app: iOS will not show the dialog a second time, so
  // a switch that could be flipped on and would silently do nothing is worse
  // than one held off with the reason next to it.
  const denied = permission === "denied";
  // The permission is read asynchronously on mount, and until it answers the
  // hook reports "unsupported" — which on a native device means "not asked
  // yet", not "no". Drawing the switch off during that shows a player with
  // notifications on a switch that says they are off, then flips it.
  const checking = permission === "unsupported";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="w-full flex items-center gap-4 p-4 rounded-xl bg-card border border-border"
    >
      <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
        <Bell className="w-6 h-6 text-purple-500" />
      </div>

      <div className="flex-1 min-w-0 text-left">
        <span className="font-medium text-foreground block">
          {t("extra.pushTitle")}
        </span>
        <span className="text-sm text-muted-foreground block">
          {denied ? t("extra.pushBlocked") : t("extra.pushDescription")}
        </span>
      </div>

      <span className="shrink-0 flex items-center justify-center w-11">
        {asking || checking ? (
          <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
        ) : (
          <Switch
            checked={enabled}
            disabled={denied}
            aria-label={t("extra.pushTitle")}
            onCheckedChange={async (next) => {
              setAsking(true);
              try {
                await setEnabled(next);
              } finally {
                setAsking(false);
              }
            }}
          />
        )}
      </span>
    </motion.div>
  );
}
