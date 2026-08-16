import { motion } from "framer-motion";
import { RefreshCw, Loader2 } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { useInAppPurchases } from "@/hooks/useInAppPurchases";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * Restore previously bought purchases.
 *
 * `restorePurchases` existed and worked, wired into AdFreeModal — which
 * `Index.tsx` renders but never opens: `setIsAdFreeModalOpen(true)` appears
 * nowhere. So the only route to restore was behind a modal with no way in,
 * and there was no restore button anywhere in the app.
 *
 * That is a guideline 3.1.1 rejection on its own. Apple requires a way to
 * restore purchases in any app selling subscriptions or non-consumables, and
 * a reviewer looks for it before they look at anything else. Beyond review it
 * is the only repair a player has: a reinstall, a new device, or a purchase
 * that landed against the wrong identity all leave them paid and empty with
 * nothing to press.
 *
 * Settings, because that is the first place a reviewer looks and the first
 * place a player looks. Native only — there is nothing to restore on the web,
 * where Stripe purchases are already tied to the account.
 */
export function RestorePurchasesRow({ delay = 0.24 }: { delay?: number }) {
  const { t } = useLanguage();
  const { restorePurchases, purchasing } = useInAppPurchases();

  if (!Capacitor.isNativePlatform()) return null;

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      disabled={purchasing}
      onClick={() => void restorePurchases()}
      className="w-full flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors disabled:opacity-60"
    >
      <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center shrink-0">
        {purchasing ? (
          <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
        ) : (
          <RefreshCw className="w-6 h-6 text-teal-500" />
        )}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <span className="font-medium text-foreground block">
          {purchasing ? t("extra.restoring") : t("extra.restorePurchases")}
        </span>
        <span className="text-sm text-muted-foreground block">
          {t("extra.restoreDescription")}
        </span>
      </div>
    </motion.button>
  );
}
