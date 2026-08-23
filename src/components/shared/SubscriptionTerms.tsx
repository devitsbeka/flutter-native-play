import { Link } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * The auto-renewal disclosure Apple requires beside every subscription
 * purchase button (Guideline 3.1.2): renewal terms, how billing works, how
 * to cancel, and links to the Terms of Use and Privacy Policy. The copy has
 * existed in every locale (extra.autoRenewalDesc / paymentDesc /
 * cancellationDesc) since the paywalls were built — nothing rendered it,
 * which is a stock metadata rejection.
 *
 * Render it directly under the buy button on every surface that can start a
 * subscription purchase: the PRO banner reel, the desktop shop sidebar, and
 * ProRequiredModal.
 *
 * **Native only.** The requirement is Apple's, and so is the copy — it names
 * the iTunes/Apple ID account and the App Store's subscription settings,
 * neither of which is where a web purchase goes. On the web the buy button
 * opens Stripe Checkout, which states the renewal terms and the price on
 * Stripe's own page before anything is charged. Showing App Store wording
 * beside a Stripe button is not just noise, it is wrong.
 *
 * Do not "simplify" this back to always-on or always-off. Always-off is the
 * rejection above; always-on tells web buyers to cancel somewhere they never
 * subscribed.
 */
export function SubscriptionTerms({
  className = "",
  onNavigate,
}: {
  className?: string;
  /** Modals pass their close handler so the legal page isn't opened underneath them. */
  onNavigate?: () => void;
}) {
  const { t, language } = useLanguage();
  const suffix = language === "ka" ? "" : "-en";

  // Read at render rather than module load: Capacitor resolves the platform
  // synchronously, and a module-level constant would be captured before the
  // native bridge is ready in some launch orders.
  if (!Capacitor.isNativePlatform()) return null;

  return (
    <div className={`text-[11px] leading-snug text-muted-foreground ${className}`}>
      <p>
        {t("extra.autoRenewalDesc")} {t("extra.paymentDesc")} {t("extra.cancellationDesc")}
      </p>
      <p className="mt-1">
        <Link to={`/terms${suffix}`} onClick={onNavigate} className="underline underline-offset-2">
          {t("extra.termsLink")}
        </Link>
        <span className="mx-1.5">·</span>
        <Link to={`/privacy-policy${suffix}`} onClick={onNavigate} className="underline underline-offset-2">
          {t("extra.privacyLink")}
        </Link>
      </p>
    </div>
  );
}
