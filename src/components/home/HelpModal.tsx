import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, HelpCircle, Mail, MessageCircle, FileText, ExternalLink } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const { t } = useLanguage();

  const helpItems = [
    {
      icon: HelpCircle,
      label: t("help.faq"),
      sublabel: t("help.faqSubtitle"),
      action: () => window.open("#faq", "_blank"),
    },
    {
      icon: MessageCircle,
      label: t("help.supportChat"),
      sublabel: t("help.supportSubtitle"),
      action: () => window.open("#support", "_blank"),
    },
    {
      icon: Mail,
      label: t("help.email"),
      sublabel: "support@mytrivia.io",
      action: () => window.open("mailto:support@mytrivia.io", "_blank"),
    },
    {
      icon: FileText,
      label: t("help.guide"),
      sublabel: t("help.guideSubtitle"),
      action: () => window.open("#guide", "_blank"),
    },
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-background flex flex-col"
        >
          {/* Fixed Header */}
          <div className="flex-shrink-0 sticky top-0 z-10 bg-background border-b border-border">
            <div className="flex items-center h-14 px-4">
              <motion.button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ChevronLeft className="w-6 h-6 text-foreground" />
              </motion.button>
              
              <h1 className="flex-1 text-center font-display text-lg font-bold text-foreground">
                {t("help.title")}
              </h1>
              
              <div className="w-10" />
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {helpItems.map((item, index) => (
              <motion.button
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={item.action}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-foreground">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.sublabel}</p>
                </div>
                <ExternalLink className="h-5 w-5 text-muted-foreground" />
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
