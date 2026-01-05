import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { Shield, Mail, Globe } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function PrivacyPolicy() {
  const { t, language } = useLanguage();
  const isEnglish = language === 'en';

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title={t("legal.privacyPolicy")} />
      
      <div className="p-4 pb-12">
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
            {/* Introduction */}
            <section>
              <h2 className="text-lg font-semibold mb-2">{t("legal.introduction")}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("legal.introText")}
              </p>
            </section>

            {/* Data Collection */}
            <section>
              <h2 className="text-lg font-semibold mb-2">{t("legal.dataCollection")}</h2>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>{t("legal.accountInfo")}</strong> {t("legal.accountInfoDesc")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>{t("legal.profileData")}</strong> {t("legal.profileDataDesc")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>{t("legal.gameData")}</strong> {t("legal.gameDataDesc")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>{t("legal.technicalData")}</strong> {t("legal.technicalDataDesc")}</span>
                </li>
              </ul>
            </section>

            {/* Data Usage */}
            <section>
              <h2 className="text-lg font-semibold mb-2">{t("legal.dataUsage")}</h2>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>{t("legal.dataUsage1")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>{t("legal.dataUsage2")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>{t("legal.dataUsage3")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>{t("legal.dataUsage4")}</span>
                </li>
              </ul>
            </section>

            {/* Data Sharing */}
            <section>
              <h2 className="text-lg font-semibold mb-2">{t("legal.dataSharing")}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("legal.dataSharingText")}
              </p>
              <ul className="text-sm text-muted-foreground space-y-2 mt-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>{t("legal.withConsent")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>{t("legal.byLaw")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>{t("legal.withProviders")}</span>
                </li>
              </ul>
            </section>

            {/* Data Retention */}
            <section>
              <h2 className="text-lg font-semibold mb-2">{t("legal.dataRetention")}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("legal.dataRetentionText")}
              </p>
            </section>

            {/* User Rights */}
            <section>
              <h2 className="text-lg font-semibold mb-2">{t("legal.userRights")}</h2>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>{t("legal.access")}</strong> {t("legal.accessDesc")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>{t("legal.correction")}</strong> {t("legal.correctionDesc")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>{t("legal.deletion")}</strong> {t("legal.deletionDesc")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>{t("legal.portability")}</strong> {t("legal.portabilityDesc")}</span>
                </li>
              </ul>
            </section>

            {/* Children's Privacy */}
            <section>
              <h2 className="text-lg font-semibold mb-2">{t("legal.childrenPrivacy")}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("legal.childrenPrivacyText")}
              </p>
            </section>

            {/* Language Toggle */}
            <section className="bg-primary/5 rounded-xl p-4 border border-primary/20">
              <Link 
                to={isEnglish ? "/privacy-policy" : "/privacy-policy-en"}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium text-foreground">
                    {isEnglish ? "ქართული ვერსია" : "English Version"}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {isEnglish ? "ნახე ქართულად →" : "View in English →"}
                </span>
              </Link>
            </section>

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