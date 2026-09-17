import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useInAppPurchases, type RestoreOutcome } from "@/hooks/useInAppPurchases";
import { useLanguage } from "@/contexts/LanguageContext";
import { restoreOutcomeKeys } from "@/utils/restoreOutcome";

/**
 * "Restore purchases", as a line of text rather than a row.
 *
 * For the two surfaces that sell things and have no room for a settings-style
 * card: the paywall footer and the foot of the shop. The Settings page uses
 * RestorePurchasesRow, which is the same behaviour in a tappable card.
 *
 * Three things this does that the old bare `<button>` on the paywall did not:
 *
 * 1. **It says what happened.** `restorePurchases` used to report through
 *    `toast`, which is suppressed app-wide, so the button was mute whatever
 *    the result. The outcome is rendered right underneath it instead.
 * 2. **It shows its own progress.** The restore ran on the shared `purchasing`
 *    flag, so the only feedback a tap produced was the *Subscribe* button
 *    above it going to "working" — the wrong control, reacting to a tap that
 *    wasn't on it.
 * 3. **It is legible.** 11px grey under a paragraph of legal copy was not a
 *    control anyone could find, which is exactly what App Review wrote down.
 *
 * Rendered on every platform. On the web it answers that restoring happens in
 * the app, which is a truthful answer and not the silence that a
 * `Capacitor.isNativePlatform()` guard gives.
 */
export function RestorePurchasesLink({
  className = "",
  align = "center",
  color,
  mutedColor,
  onRestored,
}: {
  className?: string;
  align?: "center" | "left";
  /**
   * Explicit colours, for a surface that does not follow the theme.
   *
   * The paywall's footer is `bg-[#F8F6FC]` in both themes — its whole skin is
   * fixed light (SKIN_WHITE), which is why every other line in it is painted
   * from `ink`/`inkSoft` rather than from a token. A `text-muted-foreground`
   * dropped into it renders light grey on near-white the moment the device is
   * in dark mode: invisible, on the one control this change exists to make
   * visible. Left unset these fall back to the theme, which is right
   * everywhere else.
   */
  color?: string;
  mutedColor?: string;
  /** The paywall closes itself once the account actually has something. */
  onRestored?: () => void;
}) {
  const { t } = useLanguage();
  const { restorePurchases, restoring } = useInAppPurchases();
  const [outcome, setOutcome] = useState<RestoreOutcome | null>(null);

  const run = async () => {
    // Clear the previous answer first: a second tap that lands on the same
    // outcome would otherwise look like nothing happened again.
    setOutcome(null);
    const result = await restorePurchases();
    setOutcome(result);
    if (result === "restored") onRestored?.();
  };

  const alignment = align === "center" ? "text-center" : "text-left";

  return (
    <div className={`${alignment} ${className}`}>
      <button
        type="button"
        onClick={() => void run()}
        disabled={restoring}
        className={`inline-flex items-center gap-2 py-1 text-[13px] font-semibold underline underline-offset-4 disabled:opacity-60 ${
          color ? "" : "text-muted-foreground"
        }`}
        style={color ? { color } : undefined}
      >
        {restoring && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {restoring ? t("extra.restoring") : t("extra.restorePurchases")}
      </button>

      {outcome && !restoring && (
        // role="status" so the result is announced rather than only drawn —
        // the tap may well have come from someone using VoiceOver, and the
        // whole point of this element is that the app stops being silent.
        <p
          role="status"
          className={`mt-1 text-[12px] leading-snug ${mutedColor ? "" : "text-muted-foreground"}`}
          style={mutedColor ? { color: mutedColor } : undefined}
        >
          {restoreOutcomeKeys(outcome)
            .map((key) => t(key))
            .join(" ")}
        </p>
      )}
    </div>
  );
}
