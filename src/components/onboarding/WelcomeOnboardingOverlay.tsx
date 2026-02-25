import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  trackWelcomeOnboardingStarted,
  trackWelcomeOnboardingStepViewed,
  trackWelcomeOnboardingCompleted,
  trackWelcomeOnboardingSkipped,
} from "@/lib/analytics";

import rocketIcon from "@/assets/onboarding/rocket.png";
import shopIcon from "@/assets/onboarding/magical-shop.png";
import rankIcon from "@/assets/onboarding/competition.png";
import teamIcon from "@/assets/onboarding/group-of-people.png";
import playIcon from "@/assets/onboarding/trivia-buzzer.png";

const WELCOME_ONBOARDING_KEY = "mytrivia_welcome_onboarding_seen";

interface WelcomeOnboardingOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS = [
  { id: "explore", titleKey: "extra.onboardingExploreTitle", descKey: "extra.onboardingExploreDesc", icon: rocketIcon },
  { id: "shop", titleKey: "extra.onboardingShopTitle", descKey: "extra.onboardingShopDesc", icon: shopIcon },
  { id: "rank", titleKey: "extra.onboardingRankTitle", descKey: "extra.onboardingRankDesc", icon: rankIcon },
  { id: "team", titleKey: "extra.onboardingTeamTitle", descKey: "extra.onboardingTeamDesc", icon: teamIcon },
  { id: "play", titleKey: "extra.onboardingPlayTitle", descKey: "extra.onboardingPlayDesc", icon: playIcon },
] as const;

const TOOLTIP_WIDTH = 280;
const PADDING = 12;

const gradientStyle = {
  background: "linear-gradient(135deg, #7C3AED, #6366F1, #8B5CF6, #7C3AED)",
  backgroundSize: "300% 300%",
  animation: "onboarding-gradient-shift 4s ease infinite",
};

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

  // Tooltip always goes above the target on mobile (bottom nav)
  const getTooltipPosition = () => {
    if (!targetRect) return { bottom: 100, left: PADDING };
    const centerX = targetRect.left + targetRect.width / 2;
    let left = centerX - TOOLTIP_WIDTH / 2;
    if (left < PADDING) left = PADDING;
    if (left + TOOLTIP_WIDTH > window.innerWidth - PADDING) {
      left = window.innerWidth - PADDING - TOOLTIP_WIDTH;
    }
    const bottom = window.innerHeight - targetRect.top + 16;
    return { bottom, left };
  };

  const getArrowLeft = () => {
    if (!targetRect) return TOOLTIP_WIDTH / 2;
    const centerX = targetRect.left + targetRect.width / 2;
    const pos = getTooltipPosition();
    return Math.max(20, Math.min(TOOLTIP_WIDTH - 20, centerX - pos.left));
  };

  const pos = getTooltipPosition();

  return (
    <>
      {/* Inject keyframes */}
      <style>{`
        @keyframes onboarding-gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
      <AnimatePresence>
        {isOpen && targetRect && (
          <div className="fixed inset-0" style={{ zIndex: 10000 }}>
            {/* SVG mask backdrop */}
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
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", duration: 0.35, bounce: 0.15, delay: 0.1 }}
              className="absolute"
              style={{
                width: TOOLTIP_WIDTH,
                left: pos.left,
                bottom: pos.bottom,
                zIndex: 10001,
              }}
            >
              {/* Arrow pointing down */}
              <div
                className="absolute w-3 h-3 rotate-45"
                style={{
                  left: getArrowLeft() - 6,
                  bottom: -6,
                  background: "#7C3AED",
                }}
              />

              <div
                className="relative rounded-2xl shadow-2xl p-4 overflow-hidden"
                style={gradientStyle}
              >
                {/* Icon + text */}
                <div className="flex items-start gap-3 mb-3">
                  <img
                    src={step.icon}
                    alt=""
                    className="w-10 h-10 flex-shrink-0 drop-shadow-lg"
                  />
                  <div>
                    <h3 className="text-sm font-bold text-white mb-0.5">
                      {t(step.titleKey)}
                    </h3>
                    <p className="text-xs text-white/80 leading-relaxed">
                      {t(step.descKey)}
                    </p>
                  </div>
                </div>

                {/* Step dots + counter */}
                <div className="flex items-center gap-1.5 mb-3">
                  {STEPS.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === currentStep
                          ? "w-5 bg-white"
                          : i < currentStep
                          ? "w-1.5 bg-white/50"
                          : "w-1.5 bg-white/20"
                      }`}
                    />
                  ))}
                  <span className="ml-auto text-[11px] text-white/60">
                    {currentStep + 1}/{STEPS.length}
                  </span>
                </div>

                {/* Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleNext}
                    className="flex-1 px-4 py-2 rounded-full bg-white text-violet-700 font-semibold text-xs hover:bg-white/90 transition-opacity"
                  >
                    {isLastStep ? t("common.letsGo") : t("common.next")}
                  </button>
                  {!isLastStep && (
                    <button
                      onClick={handleSkip}
                      className="px-3 py-2 rounded-full text-xs text-white/70 hover:text-white transition-colors"
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
    </>
  );
}
