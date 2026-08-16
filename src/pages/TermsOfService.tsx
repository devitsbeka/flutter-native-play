import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { FileText, Mail, Globe } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function TermsOfService() {
  const { t, language } = useLanguage();
  const isEnglish = language === 'en';

  return (
    <div className="h-[calc(100dvh_-_var(--safe-top)_-_var(--safe-bottom))] overflow-y-auto bg-background">
      <PageHeader title={t("legal.termsOfService")} />
      
      <div className="p-4 pb-12 max-w-[700px] md:max-w-[600px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-5 border border-border"
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-foreground">{t("legal.termsOfServiceFull")}</h1>
              <p className="text-sm text-muted-foreground">{t("legal.effectiveDate")}</p>
            </div>
          </div>

          <div className="space-y-6 text-foreground">
            {/* Acceptance */}
            <section>
              <h2 className="text-lg font-semibold mb-2">1. {t("legal.acceptance")}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("legal.acceptanceText")}
              </p>
            </section>

            {/* Account Rules */}
            <section>
              <h2 className="text-lg font-semibold mb-2">2. {t("legal.accountRules")}</h2>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>{t("legal.accountRule1")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>{t("legal.accountRule2")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>{t("legal.accountRule3")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>{t("legal.accountRule4")}</span>
                </li>
              </ul>
            </section>

            {/* Prohibited Conduct */}
            <section>
              <h2 className="text-lg font-semibold mb-2">3. {t("legal.prohibitedConduct")}</h2>
              <p className="text-sm text-muted-foreground mb-2">{t("legal.youCannot")}</p>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-destructive mt-1">✕</span>
                  <span>{t("legal.prohibited1")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive mt-1">✕</span>
                  <span>{t("legal.prohibited2")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive mt-1">✕</span>
                  <span>{t("legal.prohibited3")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive mt-1">✕</span>
                  <span>{t("legal.prohibited4")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-destructive mt-1">✕</span>
                  <span>{t("legal.prohibited5")}</span>
                </li>
              </ul>
            </section>

            {/* Virtual Items */}
            <section>
              <h2 className="text-lg font-semibold mb-2">4. {t("legal.virtualItems")}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("legal.virtualItemsText")}
              </p>
            </section>

            {/* Subscriptions */}
            <section>
              <h2 className="text-lg font-semibold mb-2">5. {t("legal.vipSubscription")}</h2>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>{t("legal.vip1")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>{t("legal.vip2")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>{t("legal.vip3")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>{t("legal.vip4")}</span>
                </li>
              </ul>
            </section>

            {/* IP Rights */}
            <section>
              <h2 className="text-lg font-semibold mb-2">6. {t("legal.ipRights")}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("legal.ipRightsText")}
              </p>
            </section>

            {/* Disclaimers */}
            <section>
              <h2 className="text-lg font-semibold mb-2">7. {t("legal.disclaimers")}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("legal.disclaimersText")}
              </p>
            </section>

            {/* Termination */}
            <section>
              <h2 className="text-lg font-semibold mb-2">8. {t("legal.termination")}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("legal.terminationText")}
              </p>
            </section>

            {/* Changes */}
            <section>
              <h2 className="text-lg font-semibold mb-2">9. {t("legal.changes")}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("legal.changesText")}
              </p>
            </section>

            {/* Governing Law */}
            <section>
              <h2 className="text-lg font-semibold mb-2">10. {t("legal.governingLaw")}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("legal.governingLawText")}
              </p>
            </section>

            {/* Language Toggle - only show for non-English users */}
            {!isEnglish && (
              <section className="bg-primary/5 rounded-xl p-4 border border-primary/20">
                <Link 
                  to="/terms-en"
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium text-foreground">
                      English Version
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    View in English →
                  </span>
                </Link>
              </section>
            )}

            {/* Contact */}
            <section className="bg-muted/50 rounded-xl p-4">
              <h2 className="text-lg font-semibold mb-2">{t("legal.contact")}</h2>
              <p className="text-sm text-muted-foreground mb-3">
                {t("legal.contactText")}
              </p>
              <a 
                href="mailto:support@mytrivia.io" 
                className="inline-flex items-center gap-2 text-sm text-primary font-medium"
              >
                <Mail className="w-4 h-4" />
                support@mytrivia.io
              </a>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}