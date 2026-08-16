import { motion } from "framer-motion";
import { Bell, Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useLanguage } from "@/contexts/LanguageContext";

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
 */
export function NotificationSettingsRow({ delay = 0.22 }: { delay?: number }) {
  const { t } = useLanguage();
  const { supported, permission, requestPermission } = usePushNotifications();
  const [asking, setAsking] = useState(false);

  if (!supported) return null;

  const granted = permission === "granted";
  // Denied is terminal in-app: iOS will not show the dialog a second time, so
  // offering a button that silently does nothing would be worse than saying
  // where the switch actually lives.
  const denied = permission === "denied";

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

      {granted ? (
        <span className="flex items-center gap-1 text-success font-bold text-sm shrink-0">
          <Check className="w-5 h-5" />
          {t("extra.pushEnabled")}
        </span>
      ) : denied ? null : (
        <button
          type="button"
          disabled={asking}
          onClick={async () => {
            setAsking(true);
            try {
              await requestPermission();
            } finally {
              setAsking(false);
            }
          }}
          className="shrink-0 rounded-full px-4 py-2 text-sm font-bold text-white shadow-[0_3px_0_0_#6d28d9] active:translate-y-0.5 active:shadow-[0_1px_0_0_#6d28d9] transition-all disabled:opacity-50"
          style={{ background: "linear-gradient(to bottom, #a78bfa, #8b5cf6 50%, #7c3aed)" }}
        >
          {asking ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            t("extra.pushEnable")
          )}
        </button>
      )}
    </motion.div>
  );
}
