import { motion } from "framer-motion";
import { PageHeader } from "@/components/shared/PageHeader";
import { AmbientBlobBackdrop, AMBIENT_HEADER_CLASS } from "@/components/shared/AmbientBlobBackdrop";
import { HelpCircle, Mail, MessageCircle, Bug, Lightbulb, ChevronRight, ExternalLink } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Support() {
  const { t } = useLanguage();

  const faqs = [
    { question: t("extra.faq1Q"), answer: t("extra.faq1A") },
    { question: t("extra.faq2Q"), answer: t("extra.faq2A") },
    { question: t("extra.faq3Q"), answer: t("extra.faq3A") },
    { question: t("extra.faq4Q"), answer: t("extra.faq4A") },
    { question: t("extra.faq5Q"), answer: t("extra.faq5A") },
  ];

  const contactOptions = [
    {
      icon: Mail,
      title: t("extra.emailContact"),
      description: t("extra.emailContactDesc"),
      action: "mailto:support@mytrivia.io",
      color: "from-blue-400 to-cyan-500",
    },
    {
      icon: Bug,
      title: t("extra.bugReport"),
      description: t("extra.bugReportDesc"),
      action: "mailto:bugs@mytrivia.io?subject=Bug Report",
      color: "from-red-400 to-orange-500",
    },
    {
      icon: Lightbulb,
      title: t("extra.suggestion"),
      description: t("extra.suggestionDesc"),
      action: "mailto:ideas@mytrivia.io?subject=Feature Request",
      color: "from-amber-400 to-yellow-500",
    },
  ];

  return (
    <div className="relative h-[calc(100dvh_-_var(--safe-top)_-_var(--safe-bottom))] overflow-hidden">
      <AmbientBlobBackdrop />
      {/* The page owns its scrolling (CLAUDE.md 4b); the backdrop stays put
          beneath it. */}
      <div className="absolute inset-0 z-10 overflow-y-auto">
      <PageHeader title={t("extra.supportTitle")} className={AMBIENT_HEADER_CLASS} />

      <div className="p-4 pb-12 space-y-6 max-w-[700px] md:max-w-[600px] mx-auto">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-6 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-xl font-display font-bold text-foreground mb-2">
            {t("extra.howCanWeHelp")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("extra.findAnswers")}
          </p>
        </motion.div>

        {/* Contact Options */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-lg font-display font-bold text-foreground mb-3">
            {t("extra.contactUs")}
          </h2>
          <div className="grid gap-3">
            {contactOptions.map((option) => (
              <a
                key={option.title}
                href={option.action}
                className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${option.color} flex items-center justify-center`}>
                  <option.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{option.title}</h3>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </div>
                <ExternalLink className="w-5 h-5 text-muted-foreground" />
              </a>
            ))}
          </div>
        </motion.div>

        {/* FAQs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-lg font-display font-bold text-foreground mb-3">
            {t("extra.faqTitle")}
          </h2>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            {faqs.map((faq, index) => (
              <details
                key={index}
                className={`group ${index !== faqs.length - 1 ? "border-b border-border" : ""}`}
              >
                <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="font-medium text-foreground text-left">
                      {faq.question}
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground transition-transform group-open:rotate-90" />
                </summary>
                <div className="px-4 pb-4 pl-12">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </details>
            ))}
          </div>
        </motion.div>

        {/* App Version */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center pt-4"
        >
          <p className="text-xs text-muted-foreground">
            MyTrivia v1.0.0
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            © 2025 MyTrivia. {t("extra.allRightsReserved")}
          </p>
        </motion.div>
      </div>
      </div>
    </div>
  );
}
