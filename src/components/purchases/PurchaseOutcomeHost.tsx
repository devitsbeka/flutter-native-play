import { useCallback, useState } from "react";
import {
  usePurchaseAnnouncements,
  type PurchaseAnnouncement,
} from "@/hooks/useInAppPurchases";
import { useLanguage } from "@/contexts/LanguageContext";
import { PurchaseSuccessModal } from "@/components/shop/PurchaseSuccessModal";
import { GameModal } from "@/components/ui/game-modal";

/**
 * The one place a completed purchase is confirmed.
 *
 * Nothing in the app told a player their purchase had worked. Every success
 * path in `purchase()` ended at `toast.success(...)`, and `src/lib/toast.ts`
 * swallows those app-wide — so the App Store showed its own confirmation and
 * then the app went silent: no modal, no message, and a gem balance that
 * appeared unchanged whenever RevenueCat had not propagated yet.
 *
 * `PurchaseSuccessModal` was already built and already used for coins and
 * power-ups. It had simply never been wired to the things people pay real
 * money for, because `useGemPurchase` discarded the purchase result entirely.
 *
 * Mounted once, at the app root, and driven from the announcement channel in
 * `useInAppPurchases` rather than from any one screen. The paywall closes
 * itself on success and the shop sheet unmounts on navigation — a confirmation
 * owned by either of those disappears with them, which is half of why this was
 * never noticed. This one outlives whatever opened it.
 */
export function PurchaseOutcomeHost() {
  const { t } = useLanguage();
  const [announcement, setAnnouncement] = useState<PurchaseAnnouncement | null>(null);

  // Stable identity: usePurchaseAnnouncements keys its effect on the callback,
  // so an inline arrow would re-subscribe on every render.
  const onPurchase = useCallback((a: PurchaseAnnouncement) => setAnnouncement(a), []);
  usePurchaseAnnouncements(onPurchase);

  if (!announcement) return null;

  const { gems, failed, reason } = announcement;

  // Billed, not credited. Never framed as "the purchase failed" — the money
  // has moved, and telling someone their purchase failed when they have been
  // charged is worse than saying nothing. The reason is shown verbatim
  // underneath: it is the only route a failure has out of a shipped build,
  // since webview logs are dropped in a release Capacitor app, and a
  // screenshot of it is a complete bug report.
  if (failed) {
    return (
      <GameModal
        isOpen
        onClose={() => setAnnouncement(null)}
        variant="info"
        iconEmoji="🧾"
        title={t("extra.iapActivationFailed")}
        subtitle={t("paywall.purchaseSyncFailed")}
        primaryLabel={t("shop.continue")}
        onPrimaryClick={() => setAnnouncement(null)}
      >
        {reason && (
          <p className="mt-2 break-words text-center font-mono text-[11px] leading-snug text-muted-foreground">
            {reason}
          </p>
        )}
      </GameModal>
    );
  }

  // Gems name themselves by count; anything else sold through this path is
  // PRO. The modal renders "+{quantity}x {itemName}", so these stay short.
  //
  // `pending` deliberately does not change the wording. The purchase is a fact
  // either way — the money moved and the pack is owed — and the only
  // difference is whether the balance has caught up yet, which pollForCredit
  // is already chasing. Saying "…shortly" in the headline would make a
  // completed purchase read as a half-finished one.
  const itemName = gems ? t("extra.gemsLabel") : t("extra.proLabel");

  return (
    <PurchaseSuccessModal
      isOpen
      onClose={() => setAnnouncement(null)}
      itemName={itemName}
      quantity={gems ?? 1}
    />
  );
}
