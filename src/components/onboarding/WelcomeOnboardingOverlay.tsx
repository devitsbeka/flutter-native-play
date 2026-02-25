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
const DESKTOP_TOOLTIP_HEIGHT = 220;
const ICON_SPOTLIGHT_SIZE = 48;
const PLAY_SPOTLIGHT_SIZE = 96;
const SPOTLIGHT_PADDING = 10;

/**
 * Find the best visible element for a given onboarding step.
 * Queries all matches, filters for visible ones, and picks the best candidate.
 */
function findVisibleTarget(stepId: string): DOMRect | null {
  const elements = document.querySelectorAll(`[data-onboarding-id="${stepId}"]`);
  if (elements.length === 0) return null;

  let bestRect: DOMRect | null = null;
  let bestScore = -1;

  elements.forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    // Check if element is within viewport
    const inViewport =
      rect.top >= -rect.height &&
      rect.left >= -rect.width &&
      rect.bottom <= window.innerHeight + rect.height &&
      rect.right <= window.innerWidth + rect.width;
    if (!inViewport) return;

    // Score: prefer elements that are actually visible (higher = better)
    // Slight preference for bottom-positioned elements on mobile, left-positioned on desktop
    let score = 1;
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return;
    score += 1; // visible
    bestRect = rect;
    bestScore = score;
  });

  return bestRect;
}

/**
 * Build a square spotlight rect centered on the target, with controlled sizing.
 */
function buildSpotlightRect(rawRect: DOMRect, stepId: string): DOMRect {
  const isPlay = stepId === "play";
  const minSize = isPlay ? PLAY_SPOTLIGHT_SIZE : ICON_SPOTLIGHT_SIZE;
  
  const centerX = rawRect.left + rawRect.width / 2;
  const centerY = rawRect.top + rawRect.height / 2;
  
  // Use the larger of actual size or min size
  const size = Math.max(rawRect.width, rawRect.height, minSize);
  
  return new DOMRect(
    centerX - size / 2,
    centerY - size / 2,
    size,
    size
  );
}

export function WelcomeOnboardingOverlay({ isOpen, onClose }: WelcomeOnboardingOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const rafRef = useRef<number>();
  const retryRef = useRef<ReturnType<typeof setTimeout>>();
  const { t } = useLanguage();

  const updateTargetRect = useCallback(() => {
    if (!isOpen) return;
    const step = STEPS[currentStep];

    const rawRect = findVisibleTarget(step.id);
    if (rawRect) {
      setTargetRect(buildSpotlightRect(rawRect, step.id));
      return;
    }

    // Fallback: retry after a short delay (DOM may not be ready)
    setTargetRect(null);
    retryRef.current = setTimeout(() => {
      const retryRect = findVisibleTarget(step.id);
      if (retryRect) {
        setTargetRect(buildSpotlightRect(retryRect, step.id));
      }
    }, 500);
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

  // Determine anchor direction based on where the target actually is
  const isBottomNavTarget = !!targetRect && targetRect.top > window.innerHeight * 0.5;
  const isSideNavTarget = !!targetRect && targetRect.left < 250 && targetRect.top < window.innerHeight * 0.5;
  const useBottomAnchor = step.id === "play" || isBottomNavTarget;

  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect) return { opacity: 0, pointerEvents: "none" };

    if (!useBottomAnchor && isSideNavTarget) {
      // Side nav: position to the right of the icon
      const anchorCenterY = targetRect.top + targetRect.height / 2;
      const unclampedTop = anchorCenterY - 60;
      const top = Math.max(PADDING, Math.min(window.innerHeight - DESKTOP_TOOLTIP_HEIGHT - PADDING, unclampedTop));
      const left = Math.min(targetRect.right + 16, window.innerWidth - TOOLTIP_WIDTH - PADDING);
      return { position: "absolute", top, left, width: TOOLTIP_WIDTH };
    }

    // Bottom nav / play: position above the target
    const anchorCenterX = targetRect.left + targetRect.width / 2;
    let left = anchorCenterX - TOOLTIP_WIDTH / 2;
    if (left < PADDING) left = PADDING;
    if (left + TOOLTIP_WIDTH > window.innerWidth - PADDING) {
      left = window.innerWidth - PADDING - TOOLTIP_WIDTH;
    }
    const tooltipEstimatedHeight = 200;
    const top = targetRect.top - tooltipEstimatedHeight - 16;
    return { position: "absolute", top: Math.max(PADDING, top), left, width: TOOLTIP_WIDTH };
  };

  const getArrowStyle = (): React.CSSProperties => {
    if (!targetRect) return {};

    if (!useBottomAnchor && isSideNavTarget) {
      // Arrow points left toward the icon
      const anchorCenterY = targetRect.top + targetRect.height / 2;
      const tooltipStyle = getTooltipStyle();
      const tooltipTop = (tooltipStyle.top as number) || 0;
      const arrowTop = Math.max(16, Math.min(180, anchorCenterY - tooltipTop));
      return {
        position: "absolute",
        top: arrowTop - 6,
        left: -6,
        width: 12,
        height: 12,
        transform: "rotate(45deg)",
        background: "hsl(var(--card))",
        borderLeft: "2px solid hsl(var(--primary))",
        borderBottom: "2px solid hsl(var(--primary))",
      };
    }

    // Arrow points down toward the icon
    const anchorCenterX = targetRect.left + targetRect.width / 2;
    const tooltipStyle = getTooltipStyle();
    const tooltipLeft = (tooltipStyle.left as number) || 0;
    const arrowLeft = Math.max(20, Math.min(TOOLTIP_WIDTH - 20, anchorCenterX - tooltipLeft));
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
                  x={targetRect.left - SPOTLIGHT_PADDING}
                  y={targetRect.top - SPOTLIGHT_PADDING}
                  width={targetRect.width + SPOTLIGHT_PADDING * 2}
                  height={targetRect.height + SPOTLIGHT_PADDING * 2}
                  rx={step.id === "play" ? 999 : 16}
                  ry={step.id === "play" ? 999 : 16}
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
            className={`absolute pointer-events-none ${step.id === "play" ? "rounded-full" : "rounded-2xl"}`}
            style={{
              top: targetRect.top - SPOTLIGHT_PADDING,
              left: targetRect.left - SPOTLIGHT_PADDING,
              width: targetRect.width + SPOTLIGHT_PADDING * 2,
              height: targetRect.height + SPOTLIGHT_PADDING * 2,
              border: "2px solid rgba(255,255,255,0.3)",
              boxShadow: "0 0 20px rgba(147,51,234,0.3), inset 0 0 20px rgba(147,51,234,0.1)",
            }}
          />

          {/* Tooltip */}
          <motion.div
            key={`tooltip-${currentStep}`}
            initial={{ opacity: 0, y: isSideNavTarget ? 0 : 10, x: isSideNavTarget ? -10 : 0, scale: 0.95 }}
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
