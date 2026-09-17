import { GameModal } from "@/components/ui/game-modal";
import { useLanguage } from "@/contexts/LanguageContext";
import { restoreOutcomeKeys } from "@/utils/restoreOutcome";
import type { RestoreOutcome } from "@/hooks/useInAppPurchases";

/**
 * What a restore did, said properly.
 *
 * The outcome used to render as a 12px grey line tucked under the Restore
 * link — on the paywall that put it between a four-line renewal paragraph and
 * the Terms row, in the palest colour on the screen. Every other result in
 * this app gets a modal: not enough gems, not enough coins, level up, daily
 * reward, purchase success. Restore is the one thing a player taps when they
 * believe they have already paid, and it was the one thing answered in a
 * whisper.
 *
 * Same `GameModal` shell as the rest, so it looks like the app rather than
 * like a form validation error.
 *
 * `restored` is the celebration; everything else is a plain statement of fact,
 * which is why the variant differs. None of them are framed as errors —
 * "you own nothing here" is a perfectly ordinary answer and dressing it in a
 * red alert is what made Restore feel broken.
 */
export function RestoreResultModal({
  outcome,
  onClose,
}: {
  outcome: RestoreOutcome | null;
  onClose: () => void;
}) {
  const { t } = useLanguage();

  if (!outcome) return null;

  const message = restoreOutcomeKeys(outcome)
    .map((key) => t(key))
    .join(" ");

  const restored = outcome === "restored";

  return (
    <GameModal
      isOpen
      onClose={onClose}
      variant={restored ? "success" : "info"}
      iconEmoji={restored ? "🎉" : "🧾"}
      title={t(restored ? "iap.purchasesRestored" : "extra.restorePurchases")}
      subtitle={message}
      showSparkles={restored}
      primaryLabel={t("shop.continue")}
      onPrimaryClick={onClose}
    />
  );
}
