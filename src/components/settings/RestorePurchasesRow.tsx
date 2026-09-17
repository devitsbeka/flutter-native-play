import { useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Loader2 } from "lucide-react";
import { useInAppPurchases, type RestoreOutcome } from "@/hooks/useInAppPurchases";
import { useLanguage } from "@/contexts/LanguageContext";
import { RestoreResultModal } from "@/components/purchases/RestoreResultModal";

/**
 * Restore previously bought purchases.
 *
 * `restorePurchases` existed and worked, wired into an ad-free purchase modal
 * that `Index.tsx` rendered and never opened. So the only route to restore was
 * behind a modal with no way in, and there was no restore button anywhere in
 * the app. (That modal has since been deleted along with the product it sold —
 * see the note on `IAP_PRODUCTS`.)
 *
 * That is a guideline 3.1.1 rejection on its own. Apple requires a way to
 * restore purchases in any app selling subscriptions or non-consumables, and
 * a reviewer looks for it before they look at anything else. Beyond review it
 * is the only repair a player has: a reinstall, a new device, or a purchase
 * that landed against the wrong identity all leave them paid and empty with
 * nothing to press.
 *
 * Settings, because that is the first place a reviewer looks and the first
 * place a player looks — near the top of it, above the collapsible name and
 * password rows, because a row far enough down the page to need scrolling is a
 * row that gets reported as missing.
 *
 * **Rendered on every platform.** It used to return null off native, and that
 * is a failure mode with no symptom: the row simply is not there, and nothing
 * on the screen distinguishes "this build has no restore" from "this platform
 * hides it". The web answer is one line of honest text — restoring happens in
 * the app — which is worth more than an absence.
 */
export function RestorePurchasesRow({ delay = 0.24 }: { delay?: number }) {
  const { t } = useLanguage();
  const { restorePurchases, restoring } = useInAppPurchases();
  const [outcome, setOutcome] = useState<RestoreOutcome | null>(null);

  const run = async () => {
    setOutcome(null);
    setOutcome(await restorePurchases());
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <button
        type="button"
        disabled={restoring}
        onClick={() => void run()}
        className="w-full flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors disabled:opacity-60"
      >
        <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center shrink-0">
          {restoring ? (
            <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
          ) : (
            <RefreshCw className="w-6 h-6 text-teal-500" />
          )}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <span className="font-medium text-foreground block">
            {restoring ? t("extra.restoring") : t("extra.restorePurchases")}
          </span>
          {/* The row keeps its description. The answer to the tap arrives in
              the same modal every other surface uses — see RestoreResultModal.
              This line used to carry the result in 14px muted grey, which is
              the whisper the paywall footer was rightly criticised for. */}
          <span className="text-sm text-muted-foreground block">
            {t("extra.restoreDescription")}
          </span>
        </div>
      </button>

      {/* Same answer, same modal, as the paywall and the shop. */}
      {!restoring && (
        <RestoreResultModal outcome={outcome} onClose={() => setOutcome(null)} />
      )}
    </motion.div>
  );
}
