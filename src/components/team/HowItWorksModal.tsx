import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useLanguage } from "@/contexts/LanguageContext";
import storyDice from "@/assets/story-dice.png";
import secretBookcase from "@/assets/secret-bookcase.png";
import triviaBuzzer from "@/assets/trivia-buzzer-3.png";
import groupIcon from "@/assets/group-of-people-how.png";

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowItWorksModal = ({ isOpen, onClose }: HowItWorksModalProps) => {
  const { t } = useLanguage();

  const steps = [
    { 
      icon: storyDice, 
      title: t("extra.howItWorksRandom"), 
      desc: t("extra.howItWorksRandomDesc"),
      color: "from-purple-500 to-pink-500"
    },
    { 
      icon: secretBookcase, 
      title: t("extra.howItWorksLibrary"), 
      desc: t("extra.howItWorksLibraryDesc"),
      color: "from-orange-500 to-amber-500"
    },
    { 
      icon: triviaBuzzer, 
      title: t("extra.howItWorksCreate"), 
      desc: t("extra.howItWorksCreateDesc"),
      color: "from-emerald-500 to-teal-500"
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
          className="fixed inset-0 z-50 bg-gradient-to-b from-[#FDFAFF] to-[#F6E8FF] flex flex-col"
        >
          {/* Fixed Header */}
          <div className="flex-shrink-0 border-b border-border/50 bg-background/95 backdrop-blur-sm">
            <div className="max-w-[700px] md:max-w-[520px] mx-auto w-full flex items-center gap-3 px-4 py-3">
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-muted-foreground" />
              </button>
              <h2 className="text-lg font-bold text-foreground">{t("extra.howItWorksTitle")}</h2>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-[700px] md:max-w-[520px] mx-auto w-full px-4 py-6">
            {/* Friends explanation */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20"
            >
              <div className="flex items-center gap-2 mb-2">
                <img src={groupIcon} alt="" className="w-8 h-8 object-contain" />
                <h3 className="font-semibold text-foreground">{t("extra.howItWorksFriends")}</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("extra.howItWorksFriendsDesc")} {t("extra.howItWorksFriendsWins")}
              </p>
            </motion.div>

            <div className="space-y-3">
              {steps.map((step, index) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center flex-shrink-0`}>
                    <img src={step.icon} alt="" className="w-7 h-7 object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            </div>
          </div>

          {/* Fixed Footer */}
          <div className="flex-shrink-0 border-t border-border/50 bg-background">
            <div className="max-w-[700px] md:max-w-[520px] mx-auto w-full p-4">
              <ChunkyButton onClick={onClose} className="w-full">
                {t("extra.howItWorksGotIt")}
              </ChunkyButton>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
