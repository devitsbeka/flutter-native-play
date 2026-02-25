import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  trackWelcomeOnboardingStarted,
  trackWelcomeOnboardingStepViewed,
  trackWelcomeOnboardingCompleted,
  trackWelcomeOnboardingSkipped,
} from "@/lib/analytics";

const WELCOME_ONBOARDING_KEY = "mytrivia_welcome_onboarding_seen";

interface WelcomeOnboardingOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS = [
  { id: "explore", titleKey: "extra.onboardingExploreTitle", descKey: "extra.onboardingExploreDesc" },
  { id: "shop", titleKey: "extra.onboardingShopTitle", descKey: "extra.onboardingShopDesc" },
  { id: "rank", titleKey: "extra.onboardingRankTitle", descKey: "extra.onboardingRankDesc" },
  { id: "team", titleKey: "extra.onboardingTeamTitle", descKey: "extra.onboardingTeamDesc" },
  { id: "play", titleKey: "extra.onboardingPlayTitle", descKey: "extra.onboardingPlayDesc" },
] as const;

export function WelcomeOnboardingOverlay({ isOpen, onClose }: WelcomeOnboardingOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const rafRef = useRef<number>();
  const { t } = useLanguage();

  const updateTargetRect = useCallback(() => {
    if (!isOpen) return;
    const step = STEPS[currentStep];
    const el = document.querySelector(`[data-onboarding-id="${step.id}"]`);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
    } else {
      setTargetRect(null);
    }
  }, [isOpen, currentStep]);

  useEffect(() => {
    if (!isOpen) return;
    // Small delay to let layout settle
    const timer = setTimeout(updateTargetRect, 100);

    const handleUpdate = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updateTargetRect);
    };

    window.addEventListener("resize", handleUpdate);
    window.addEventListener("scroll", handleUpdate, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleUpdate);
      window.removeEventListener("scroll", handleUpdate, true);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isOpen, updateTargetRect]);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      trackWelcomeOnboardingStarted();
      trackWelcomeOnboardingStepViewed(0, STEPS[0].id);
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
      trackWelcomeOnboardingStepViewed(next, STEPS[next].id);
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

  // Determine if tooltip goes above or below the target
  const tooltipAbove = targetRect ? targetRect.top > window.innerHeight / 2 : true;
  const tooltipWidth = 260;
  const padding = 12;

  const getTooltipLeft = () => {
    if (!targetRect) return padding;
    const centerX = targetRect.left + targetRect.width / 2;
    let left = centerX - tooltipWidth / 2;
    if (left < padding) left = padding;
    if (left + tooltipWidth > window.innerWidth - padding) {
      left = window.innerWidth - padding - tooltipWidth;
    }
    return left;
  };

  const getArrowLeftOffset = () => {
    if (!targetRect) return tooltipWidth / 2;
    const centerX = targetRect.left + targetRect.width / 2;
    const tooltipLeft = getTooltipLeft();
    return Math.max(16, Math.min(tooltipWidth - 16, centerX - tooltipLeft));
  };

  return (
    <AnimatePresence>
      {isOpen && targetRect && (
        <div className="fixed inset-0" style={{ zIndex: 10000 }}>
          {/* SVG mask backdrop - creates the spotlight hole */}
          <svg className="absolute inset-0 w-full h-full" onClick={handleSkip}>
            <defs>
              <mask id="spotlight-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect
                  x={targetRect.left - 8}
                  y={targetRect.top - 8}
                  width={targetRect.width + 16}
                  height={targetRect.height + 16}
                  rx={16}
                  ry={16}
                  fill="black"
                />
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="rgba(0,0,0,0.55)"
              mask="url(#spotlight-mask)"
            />
          </svg>

          {/* Spotlight border glow */}
          <motion.div
            key={`spotlight-${currentStep}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.2 }}
            className="absolute rounded-2xl pointer-events-none"
            style={{
              top: targetRect.top - 8,
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
              border: "2px solid rgba(255,255,255,0.3)",
              boxShadow: "0 0 20px rgba(147,51,234,0.3), inset 0 0 20px rgba(147,51,234,0.1)",
            }}
          />

          {/* Tooltip */}
          <motion.div
            key={`tooltip-${currentStep}`}
            initial={{ opacity: 0, y: tooltipAbove ? 10 : -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", duration: 0.35, bounce: 0.15, delay: 0.1 }}
            className="absolute"
            style={{
              width: tooltipWidth,
              left: getTooltipLeft(),
              ...(tooltipAbove
                ? { bottom: window.innerHeight - targetRect.top + 16 }
                : { top: targetRect.bottom + 16 }),
              zIndex: 10001,
            }}
          >
            {/* Arrow */}
            <div
              className="absolute w-3 h-3 rotate-45 bg-white dark:bg-slate-800"
              style={{
                left: getArrowLeftOffset() - 6,
                ...(tooltipAbove ? { bottom: -6 } : { top: -6 }),
              }}
            />

            <div className="relative rounded-2xl bg-white dark:bg-slate-800 shadow-2xl p-4 border border-border/30">
              {/* Step dots + counter */}
              <div className="flex items-center gap-1.5 mb-2">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === currentStep
                        ? "w-5 bg-primary"
                        : i < currentStep
                        ? "w-1.5 bg-primary/40"
                        : "w-1.5 bg-muted-foreground/20"
                    }`}
                  />
                ))}
                <span className="ml-auto text-[11px] text-muted-foreground">
                  {currentStep + 1}/{STEPS.length}
                </span>
              </div>

              <h3 className="text-sm font-bold text-foreground mb-1">
                {t(step.titleKey)}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                {t(step.descKey)}
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleNext}
                  className="flex-1 px-4 py-2 rounded-full bg-primary text-primary-foreground font-semibold text-xs hover:opacity-90 transition-opacity"
                >
                  {isLastStep ? t("common.letsGo") : t("common.next")}
                </button>
                {!isLastStep && (
                  <button
                    onClick={handleSkip}
                    className="px-3 py-2 rounded-full text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t("common.skip")}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
