import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  trackWelcomeOnboardingStarted,
  trackWelcomeOnboardingStepViewed,
  trackWelcomeOnboardingCompleted,
  trackWelcomeOnboardingSkipped,
} from "@/lib/analytics";

import exploreIcon from "@/assets/icons/explore-icon.png";
import roomsIcon from "@/assets/icons/rooms-icon.png";
import groupIcon from "@/assets/icons/group-of-people.png";
import aiSparkleIcon from "@/assets/icons/icon-ai-sparkle.png";

const WELCOME_ONBOARDING_KEY = "mytrivia_welcome_onboarding_seen";

interface WelcomeOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS = [
  { key: "discover", icon: exploreIcon },
  { key: "tvMode", icon: roomsIcon },
  { key: "gameRooms", icon: groupIcon },
  { key: "createTrivia", icon: aiSparkleIcon },
] as const;

export function WelcomeOnboardingModal({ isOpen, onClose }: WelcomeOnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const { t } = useLanguage();

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      trackWelcomeOnboardingStarted();
      trackWelcomeOnboardingStepViewed(0, STEPS[0].key);
    }
  }, [isOpen]);

  const dismiss = useCallback(() => {
    localStorage.setItem(WELCOME_ONBOARDING_KEY, "true");
    onClose();
  }, [onClose]);

  const handleNext = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      const next = currentStep + 1;
      setCurrentStep(next);
      trackWelcomeOnboardingStepViewed(next, STEPS[next].key);
    } else {
      trackWelcomeOnboardingCompleted(STEPS.length);
      dismiss();
    }
  }, [currentStep, dismiss]);

  const handleSkip = useCallback(() => {
    trackWelcomeOnboardingSkipped(currentStep);
    dismiss();
  }, [currentStep, dismiss]);

  const step = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;

  const titleKey = `extra.welcomeOnboardingStep${currentStep + 1}Title` as const;
  const descKey = `extra.welcomeOnboardingStep${currentStep + 1}Desc` as const;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm"
          >
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 to-purple-500/20 backdrop-blur-xl border border-white/30 shadow-2xl">
              <div className="bg-white/90 dark:bg-slate-900/90 p-6 relative">
                {/* Close button */}
                <button
                  onClick={handleSkip}
                  className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-muted/80 hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>

                {/* Content with slide animation */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 60 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -60 }}
                    transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
                    className="flex flex-col items-center text-center pt-2"
                  >
                    {/* Icon */}
                    <motion.div
                      initial={{ scale: 0.5 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", delay: 0.1, bounce: 0.5 }}
                      className="mb-4"
                    >
                      <img
                        src={step.icon}
                        alt=""
                        className="w-20 h-20 object-contain"
                      />
                    </motion.div>

                    {/* Title */}
                    <motion.h3
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 }}
                      className="text-lg font-bold text-foreground mb-2"
                    >
                      {t(titleKey)}
                    </motion.h3>

                    {/* Description */}
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-sm text-muted-foreground leading-relaxed px-2"
                    >
                      {t(descKey)}
                    </motion.p>
                  </motion.div>
                </AnimatePresence>

                {/* Step dots */}
                <div className="flex items-center justify-center gap-2 mt-6 mb-4">
                  {STEPS.map((_, i) => (
                    <div
                      key={i}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        i === currentStep
                          ? "w-6 bg-primary"
                          : "w-2 bg-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>

                {/* Buttons */}
                <div className="flex flex-col gap-2 w-full">
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    onClick={handleNext}
                    className="w-full px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
                  >
                    {isLastStep ? t("common.letsGo") : t("common.next")}
                  </motion.button>

                  {!isLastStep && (
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      onClick={handleSkip}
                      className="w-full px-6 py-2.5 rounded-full bg-muted text-muted-foreground font-semibold text-sm hover:bg-muted/80 transition-colors"
                    >
                      {t("common.skip")}
                    </motion.button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
