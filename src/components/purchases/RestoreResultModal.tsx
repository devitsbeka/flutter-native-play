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
 * believe they have already paid, and it was answered in a whisper.
 *
 * Moving it into GameModal fixed where it appeared but not how it read: the
 * message went into `subtitle`, which GameModal draws as `text-sm
 * text-gray-500` — a caption style, meant for "500 gems required" under a
 * heading, not for the whole answer. A full sentence set in it is the same
 * whisper in a nicer frame.
 *
 * So the heading carries the outcome and the body carries the explanation, at
 * the size body copy is set everywhere else in the app. `subtitle` is left
 * unused on purpose.
 *
 * `restored` is the celebration; everything else is a plain statement of fact,
 * which is why the variant differs. None of them are framed as errors —
 * "you own nothing here" is an ordinary answer, and dressing it in a red
 * alert is what made Restore feel broken.
 */

/** The heading for each outcome. Short, and it answers the tap on its own. */
function titleKey(outcome: RestoreOutcome): string {
  switch (outcome) {
    case "restored":
      return "iap.purchasesRestored";
    case "signedOut":
      return "iap.pleaseSignIn";
    case "none":
      return "iap.noPreviousPurchases";
    case "failed":
      return "iap.restoreFailed";
    case "notMobile":
      return "extra.restorePurchases";
  }
}

export function RestoreResultModal({
  outcome,
  onClose,
}: {
  outcome: RestoreOutcome | null;
  onClose: () => void;
}) {
  const { t } = useLanguage();

  if (!outcome) return null;

  const body = restoreOutcomeKeys(outcome)
    .map((key) => t(key))
    .join(" ");

  const restored = outcome === "restored";

  return (
    <GameModal
      isOpen
      onClose={onClose}
      variant={restored ? "success" : "info"}
      iconEmoji={restored ? "🎉" : "🧾"}
      title={t(titleKey(outcome))}
      showSparkles={restored}
      primaryLabel={t("shop.continue")}
      onPrimaryClick={onClose}
    >
      {/* Body copy, not a caption. GameModal's own `subtitle` slot is
          text-sm/gray-500 — right for a one-line qualifier under a heading,
          wrong for the sentence that is the entire answer. */}
      <p className="px-2 pb-1 text-center text-base leading-relaxed text-foreground">
        {body}
      </p>
    </GameModal>
  );
}
