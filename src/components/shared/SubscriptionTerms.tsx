import { Link } from "react-router-dom";
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
