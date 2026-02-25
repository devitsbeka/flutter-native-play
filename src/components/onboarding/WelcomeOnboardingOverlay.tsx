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

export function WelcomeOnboardingOverlay({ isOpen, onClose }: WelcomeOnboardingOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const rafRef = useRef<number>();
  const retryRef = useRef<ReturnType<typeof setTimeout>>();
  const { t } = useLanguage();

  const updateTargetRect = useCallback(() => {
    if (!isOpen) return;
    const step = STEPS[currentStep];
    const el = document.querySelector(`[data-onboarding-id="${step.id}"]`);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
    } else {
      setTargetRect(null);
      // Retry after a delay if element not found
      retryRef.current = setTimeout(() => {
        const retryEl = document.querySelector(`[data-onboarding-id="${step.id}"]`);
        if (retryEl) setTargetRect(retryEl.getBoundingClientRect());
      }, 500);
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
      if (retryRef.current) clearTimeout(retryRef.current);
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
  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;

  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect) return { opacity: 0, pointerEvents: "none" };

    if (isDesktop) {
      // Desktop: position to the right of the sidebar item
      const top = targetRect.top + targetRect.height / 2 - 60;
      const left = targetRect.right + 16;
      return { position: "absolute", top, left, width: TOOLTIP_WIDTH };
    } else {
      // Mobile: position above the bottom nav item
      const centerX = targetRect.left + targetRect.width / 2;
      let left = centerX - TOOLTIP_WIDTH / 2;
      if (left < PADDING) left = PADDING;
      if (left + TOOLTIP_WIDTH > window.innerWidth - PADDING) {
        left = window.innerWidth - PADDING - TOOLTIP_WIDTH;
      }
      const bottom = window.innerHeight - targetRect.top + 16;
      return { position: "absolute", bottom, left, width: TOOLTIP_WIDTH };
    }
  };

  const getArrowStyle = (): React.CSSProperties => {
    if (!targetRect) return {};

    if (isDesktop) {
      // Arrow points left
      return {
        position: "absolute",
        top: 20,
        left: -6,
        width: 12,
        height: 12,
        transform: "rotate(45deg)",
        background: "hsl(var(--card))",
        borderLeft: "2px solid hsl(var(--primary))",
        borderBottom: "2px solid hsl(var(--primary))",
      };
    } else {
      // Arrow points down
      const centerX = targetRect.left + targetRect.width / 2;
      const tooltipStyle = getTooltipStyle();
      const tooltipLeft = (tooltipStyle.left as number) || 0;
      const arrowLeft = Math.max(20, Math.min(TOOLTIP_WIDTH - 20, centerX - tooltipLeft));
      return {
        position: "absolute",
        bottom: -6,
        left: arrowLeft - 6,
        width: 12,
        height: 12,
        transform: "rotate(45deg)",
        background: "hsl(var(--card))",
        borderRight: "2px solid hsl(var(--primary))",
        borderBottom: "2px solid hsl(var(--primary))",
      };
    }
  };

  return (
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
            initial={{ opacity: 0, y: isDesktop ? 0 : 10, x: isDesktop ? -10 : 0, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", duration: 0.35, bounce: 0.15, delay: 0.1 }}
            style={{ ...getTooltipStyle(), zIndex: 10001 }}
          >
            {/* Arrow */}
            <div style={getArrowStyle() as React.CSSProperties} />

            {/* Card with spinning conic-gradient border */}
            <div className="relative">
              {/* Spinning conic-gradient border */}
              <div className="absolute -inset-[2px] rounded-2xl overflow-hidden">
                <div
                  className="absolute inset-0 animate-spin-slow"
                  style={{
                    background: `conic-gradient(from ${currentStep * 72}deg, 
                      hsl(var(--primary)), 
                      hsl(280, 80%, 60%), 
                      hsl(320, 80%, 60%), 
                      hsl(var(--primary))
                    )`,
                  }}
                />
              </div>

              {/* Card content */}
              <div className="relative bg-card rounded-2xl p-4">
                {/* Pulse glow */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-50 animate-pulse-shadow pointer-events-none"
                  style={{ boxShadow: "0 0 30px hsl(var(--primary) / 0.3)" }}
                />

                <div className="relative z-10 flex flex-col gap-3">
                  {/* Icon + text */}
                  <div className="flex items-start gap-3">
                    <img
                      src={step.icon}
                      alt=""
                      className="w-10 h-10 flex-shrink-0 drop-shadow-lg"
                    />
                    <div>
                      <h3 className="text-sm font-bold text-foreground mb-0.5">
                        {t(step.titleKey)}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {t(step.descKey)}
                      </p>
                    </div>
                  </div>

                  {/* Step dots + counter */}
                  <div className="flex items-center gap-1.5">
                    {STEPS.map((_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          i === currentStep
                            ? "w-5 bg-primary"
                            : i < currentStep
                            ? "w-1.5 bg-primary/50"
                            : "w-1.5 bg-muted-foreground/20"
                        }`}
                      />
                    ))}
                    <span className="ml-auto text-[11px] text-muted-foreground">
                      {currentStep + 1}/{STEPS.length}
                    </span>
                  </div>

                  {/* Buttons */}
                  <div className="flex items-center gap-2">
                    <motion.button
                      onClick={handleNext}
                      animate={{
                        boxShadow: [
                          "0 0 8px hsl(var(--primary) / 0.2)",
                          "0 0 20px hsl(var(--primary) / 0.5)",
                          "0 0 8px hsl(var(--primary) / 0.2)",
                        ],
                      }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className="flex-1 px-4 py-2 rounded-full font-semibold text-xs text-white cursor-pointer"
                      style={{
                        background: "linear-gradient(135deg, hsl(var(--primary)), hsl(280, 80%, 60%))",
                      }}
                    >
                      {isLastStep ? t("common.letsGo") : t("common.next")}
                    </motion.button>
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
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
