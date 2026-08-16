import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { Shield, Mail, Globe } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function PrivacyPolicy() {
  const { t, language } = useLanguage();
  const isEnglish = language === 'en';

  return (
    <div className="h-[calc(100dvh_-_var(--safe-top)_-_var(--safe-bottom))] overflow-y-auto bg-background">
      <PageHeader title={t("legal.privacyPolicy")} />
      
      <div className="p-4 pb-12 max-w-[700px] md:max-w-[600px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-5 border border-border"
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-foreground">{t("legal.privacyPolicyFull")}</h1>
              <p className="text-sm text-muted-foreground">{t("legal.effectiveDate")}</p>
            </div>
          </div>

          <div className="space-y-6 text-foreground">
            {/* 1. Introduction */}
            <section>
              <h2 className="text-lg font-semibold mb-2">1. {t("legal.introduction")}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("legal.introText")}
              </p>
            </section>

            {/* 2. Data Collection */}
            <section>
              <h2 className="text-lg font-semibold mb-2">2. {t("legal.dataCollection")}</h2>
              <ul className="text-sm text-muted-foreground space-y-2">
                <BulletItem bold={t("legal.accountInfo")} text={t("legal.accountInfoDesc")} />
                <BulletItem bold={t("legal.profileData")} text={t("legal.profileDataDesc")} />
                <BulletItem bold={t("legal.gameData")} text={t("legal.gameDataDesc")} />
                <BulletItem bold={t("legal.technicalData")} text={t("legal.technicalDataDesc")} />
              </ul>
            </section>

            {/* 3. Data Usage */}
            <section>
              <h2 className="text-lg font-semibold mb-2">3. {t("legal.dataUsage")}</h2>
              <ul className="text-sm text-muted-foreground space-y-2">
                <Bullet text={t("legal.dataUsage1")} />
                <Bullet text={t("legal.dataUsage2")} />
                <Bullet text={t("legal.dataUsage3")} />
                <Bullet text={t("legal.dataUsage4")} />
              </ul>
            </section>

            {/* 4. Third-Party Services */}
            <section>
              <h2 className="text-lg font-semibold mb-2">4. {t("legal.thirdPartyServices")}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                {t("legal.thirdPartyServicesText")}
              </p>
              <ul className="text-sm text-muted-foreground space-y-2">
                <Bullet text={t("legal.thirdPartySupabase")} />
                <Bullet text={t("legal.thirdPartyFirebase")} />
                <Bullet text={t("legal.thirdPartyAdMob")} />
                <Bullet text={t("legal.thirdPartyRevenueCat")} />
                <Bullet text={t("legal.thirdPartyApple")} />
              </ul>
            </section>

            {/* 5. Advertising & Tracking */}
            <section>
              <h2 className="text-lg font-semibold mb-2">5. {t("legal.advertisingTracking")}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("legal.advertisingTrackingText")}
              </p>
            </section>

            {/* 6. Data Security */}
            <section>
              <h2 className="text-lg font-semibold mb-2">6. {t("legal.dataSecurity")}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                {t("legal.dataSecurityText")}
              </p>
              <ul className="text-sm text-muted-foreground space-y-2">
                <Bullet text={t("legal.dataSecurity1")} />
                <Bullet text={t("legal.dataSecurity2")} />
                <Bullet text={t("legal.dataSecurity3")} />
                <Bullet text={t("legal.dataSecurity4")} />
              </ul>
              <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                {t("legal.dataSecurityDisclaimer")}
              </p>
            </section>

            {/* 7. Data Sharing */}
            <section>
              <h2 className="text-lg font-semibold mb-2">7. {t("legal.dataSharing")}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("legal.dataSharingText")}
              </p>
              <ul className="text-sm text-muted-foreground space-y-2 mt-2">
                <Bullet text={t("legal.withConsent")} />
                <Bullet text={t("legal.byLaw")} />
                <Bullet text={t("legal.withProviders")} />
              </ul>
            </section>

            {/* 8. Data Retention */}
            <section>
              <h2 className="text-lg font-semibold mb-2">8. {t("legal.dataRetention")}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("legal.dataRetentionText")}
              </p>
            </section>

            {/* 9. International Data Transfers */}
            <section>
              <h2 className="text-lg font-semibold mb-2">9. {t("legal.internationalTransfers")}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("legal.internationalTransfersText")}
              </p>
            </section>

            {/* 10. Your Rights */}
            <section>
              <h2 className="text-lg font-semibold mb-2">10. {t("legal.userRights")}</h2>
              <ul className="text-sm text-muted-foreground space-y-2">
                <BulletItem bold={t("legal.access")} text={t("legal.accessDesc")} />
                <BulletItem bold={t("legal.correction")} text={t("legal.correctionDesc")} />
                <BulletItem bold={t("legal.deletion")} text={t("legal.deletionDesc")} />
                <BulletItem bold={t("legal.portability")} text={t("legal.portabilityDesc")} />
              </ul>
            </section>

            {/* 11. GDPR */}
            <section>
              <h2 className="text-lg font-semibold mb-2">11. {t("legal.gdprRights")}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                {t("legal.gdprRightsText")}
              </p>
              <div className="mb-2">
                <BulletItem bold={t("legal.gdprLegalBasis")} text={t("legal.gdprLegalBasisDesc")} />
              </div>
              <ul className="text-sm text-muted-foreground space-y-2">
                <Bullet text={t("legal.gdprRight1")} />
                <Bullet text={t("legal.gdprRight2")} />
                <Bullet text={t("legal.gdprRight3")} />
                <Bullet text={t("legal.gdprRight4")} />
                <Bullet text={t("legal.gdprRight5")} />
                <Bullet text={t("legal.gdprRight6")} />
                <Bullet text={t("legal.gdprRight7")} />
              </ul>
              <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                {t("legal.gdprDPO")}
              </p>
            </section>

            {/* 12. CCPA */}
            <section>
              <h2 className="text-lg font-semibold mb-2">12. {t("legal.ccpaRights")}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                {t("legal.ccpaRightsText")}
              </p>
              <ul className="text-sm text-muted-foreground space-y-2">
                <Bullet text={t("legal.ccpaRight1")} />
                <Bullet text={t("legal.ccpaRight2")} />
                <Bullet text={t("legal.ccpaRight3")} />
                <Bullet text={t("legal.ccpaRight4")} />
              </ul>
              <p className="text-sm text-muted-foreground leading-relaxed mt-2 font-medium">
                {t("legal.ccpaNoSell")}
              </p>
            </section>

            {/* 13. Account Deletion */}
            <section>
              <h2 className="text-lg font-semibold mb-2">13. {t("legal.accountDeletion")}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                {t("legal.accountDeletionText")}
              </p>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside mb-2">
                <li>{t("legal.accountDeletionStep1")}</li>
                <li>{t("legal.accountDeletionStep2")}</li>
                <li>{t("legal.accountDeletionStep3")}</li>
                <li>{t("legal.accountDeletionStep4")}</li>
              </ol>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("legal.accountDeletionNote")}
              </p>
            </section>

            {/* 14. Push Notifications */}
            <section>
              <h2 className="text-lg font-semibold mb-2">14. {t("legal.pushNotifications")}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("legal.pushNotificationsText")}
              </p>
            </section>

            {/* 15. Children's Privacy */}
            <section>
              <h2 className="text-lg font-semibold mb-2">15. {t("legal.childrenPrivacy")}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("legal.childrenPrivacyText")}
              </p>
            </section>

            {/* 16. Policy Changes */}
            <section>
              <h2 className="text-lg font-semibold mb-2">16. {t("legal.policyChanges")}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("legal.policyChangesText")}
              </p>
            </section>

            {/* Language Toggle */}
            {!isEnglish && (
              <section className="bg-primary/5 rounded-xl p-4 border border-primary/20">
                <Link 
                  to="/privacy-policy-en"
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

            {/* 17. Contact */}
            <section className="bg-muted/50 rounded-xl p-4">
              <h2 className="text-lg font-semibold mb-2">17. {t("legal.contact")}</h2>
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

// Helper components
function BulletItem({ bold, text }: { bold: string; text: string }) {
  return (
    <li className="flex items-start gap-2">
      <span className="text-primary mt-1">•</span>
      <span><strong>{bold}</strong> {text}</span>
    </li>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2">
      <span className="text-primary mt-1">•</span>
      <span>{text}</span>
    </li>
  );
}
