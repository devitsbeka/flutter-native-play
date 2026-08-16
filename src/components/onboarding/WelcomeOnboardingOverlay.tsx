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

// The card and everything in it is sized 15% up from the original
// 280/16px layout — the text was the smallest on any surface of the app.
const TOOLTIP_WIDTH = 322;
const PADDING = 12;
const DESKTOP_TOOLTIP_HEIGHT = 253;
const SPOTLIGHT_PADDING = 10;

// 322 unless the screen cannot take it. A 320px-wide phone has no room for
// 322 plus both margins, and a fixed width there pushes the card's left edge
// off-screen — at 280 it still fit, so the width had never had to bend.
const tooltipWidth = () => Math.min(TOOLTIP_WIDTH, window.innerWidth - PADDING * 2);

const NAV_STEP_IDS = ["explore", "shop", "rank", "team"];

/**
 * Find the best visible element for a given onboarding step.
 * On md+ screens, prefer side-nav for nav steps and desktop play button for play step.
 * On mobile, prefer bottom-nav elements.
 */
function findVisibleTarget(stepId: string): { rect: DOMRect; isWide: boolean } | null {
  const elements = document.querySelectorAll(`[data-onboarding-id="${stepId}"]`);
  if (elements.length === 0) return null;

  const isDesktop = window.innerWidth >= 768;
  const isNavStep = NAV_STEP_IDS.includes(stepId);

  let bestEl: Element | null = null;
  let bestScore = -1;

  elements.forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return;

    // Check viewport
    const inViewport =
      rect.top >= -rect.height &&
      rect.left >= -rect.width &&
      rect.bottom <= window.innerHeight + rect.height &&
      rect.right <= window.innerWidth + rect.width;
    if (!inViewport) return;

    let score = 1;

    if (isDesktop) {
      // Prefer side-nav (left < 300) for nav steps
      if (isNavStep && rect.left < 300) score += 10;
      // Prefer desktop play button (not in bottom nav)
      if (stepId === "play" && rect.top < window.innerHeight - 100) score += 10;
    } else {
      // Mobile: prefer bottom nav (bottom area)
      if (rect.top > window.innerHeight - 150) score += 10;
    }

    if (score > bestScore) {
      bestScore = score;
      bestEl = el;
    }
  });

  if (!bestEl) return null;
  const rect = (bestEl as Element).getBoundingClientRect();
  // "Wide" means the target is a row (wider than tall, e.g. desktop nav row)
  const isWide = rect.width > rect.height * 1.5;
  return { rect, isWide };
}

/**
 * Build spotlight rect. For wide targets (desktop nav rows), keep rectangular shape.
 * For compact targets (icons, play button), use square/circular spotlight.
 */
function buildSpotlightRect(rawRect: DOMRect, isWide: boolean, stepId: string): DOMRect {
  if (isWide) {
    // Rectangular: preserve the row shape with small padding
    return new DOMRect(
      rawRect.left,
      rawRect.top,
      rawRect.width,
      rawRect.height
    );
  }

  // Square/circular for icon-only or play button
  const isPlay = stepId === "play";
  const minSize = isPlay ? 96 : 48;
  const centerX = rawRect.left + rawRect.width / 2;
  const centerY = rawRect.top + rawRect.height / 2;
  const size = Math.max(rawRect.width, rawRect.height, minSize);
  return new DOMRect(centerX - size / 2, centerY - size / 2, size, size);
}

export function WelcomeOnboardingOverlay({ isOpen, onClose }: WelcomeOnboardingOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isWideTarget, setIsWideTarget] = useState(false);
  const rafRef = useRef<number>();
  const retryRef = useRef<ReturnType<typeof setTimeout>>();
  const { t } = useLanguage();

  const updateTargetRect = useCallback(() => {
    if (!isOpen) return;
    const step = STEPS[currentStep];

    const result = findVisibleTarget(step.id);
    if (result) {
      setIsWideTarget(result.isWide);
      setTargetRect(buildSpotlightRect(result.rect, result.isWide, step.id));
      return;
    }

    // Fallback: retry after a short delay (DOM may not be ready)
    setTargetRect(null);
    retryRef.current = setTimeout(() => {
      const retryResult = findVisibleTarget(step.id);
      if (retryResult) {
        setIsWideTarget(retryResult.isWide);
        setTargetRect(buildSpotlightRect(retryResult.rect, retryResult.isWide, step.id));
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
  const isSideNavTarget = !!targetRect && targetRect.left < 300 && targetRect.top < window.innerHeight * 0.5;
  const useBottomAnchor = step.id === "play" ? isBottomNavTarget : isBottomNavTarget;

  // For play step on desktop (not bottom nav), position above the button
  const isDesktopPlayTarget = step.id === "play" && !!targetRect && !isBottomNavTarget;

  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect) return { opacity: 0, pointerEvents: "none" };

    if (isSideNavTarget && !useBottomAnchor) {
      // Side nav: position to the right of the row
      const anchorCenterY = targetRect.top + targetRect.height / 2;
      const unclampedTop = anchorCenterY - 60;
      const top = Math.max(PADDING, Math.min(window.innerHeight - DESKTOP_TOOLTIP_HEIGHT - PADDING, unclampedTop));
      const width = tooltipWidth();
      const left = Math.min(targetRect.right + 16, window.innerWidth - width - PADDING);
      return { position: "absolute", top, left, width };
    }

    // Bottom nav or desktop play: position above the target
    const anchorCenterX = targetRect.left + targetRect.width / 2;
    const width = tooltipWidth();
    let left = anchorCenterX - width / 2;
    if (left < PADDING) left = PADDING;
    if (left + width > window.innerWidth - PADDING) {
      left = window.innerWidth - PADDING - width;
    }
    const tooltipEstimatedHeight = 170;
    const top = targetRect.top - tooltipEstimatedHeight - 10;
    return { position: "absolute", top: Math.max(PADDING, top), left, width };
  };

  const getArrowStyle = (): React.CSSProperties => {
    if (!targetRect) return {};

    if (isSideNavTarget && !useBottomAnchor) {
      // Arrow points left toward the nav row
      const anchorCenterY = targetRect.top + targetRect.height / 2;
      const tooltipStyle = getTooltipStyle();
      const tooltipTop = (tooltipStyle.top as number) || 0;
      const arrowTop = Math.max(16, Math.min(180, anchorCenterY - tooltipTop));
      return {
        position: "absolute",
        top: arrowTop - 7,
        left: -7,
        width: 14,
        height: 14,
        transform: "rotate(45deg)",
        background: "hsl(var(--card))",
        borderLeft: "2px solid hsl(var(--primary))",
        borderBottom: "2px solid hsl(var(--primary))",
      };
    }

    // Arrow points down toward the target
    const anchorCenterX = targetRect.left + targetRect.width / 2;
    const tooltipStyle = getTooltipStyle();
    const tooltipLeft = (tooltipStyle.left as number) || 0;
    const arrowLeft = Math.max(20, Math.min(tooltipWidth() - 20, anchorCenterX - tooltipLeft));
    return {
      position: "absolute",
      bottom: -7,
      left: arrowLeft - 7,
      width: 14,
      height: 14,
      transform: "rotate(45deg)",
      background: "hsl(var(--card))",
      borderRight: "2px solid hsl(var(--primary))",
      borderBottom: "2px solid hsl(var(--primary))",
    };
  };

  // Determine spotlight shape
  const isRoundSpotlight = step.id === "play" && !isWideTarget;
  const isRectSpotlight = isWideTarget;
  const spotlightRx = isRoundSpotlight ? 999 : isRectSpotlight ? 12 : 16;

  return (
    <AnimatePresence>
      {isOpen && targetRect && (
        <div className="fixed inset-0" style={{ zIndex: 10000 }}>
          {/* SVG mask backdrop - pointer-events-none so tooltip buttons work */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <mask id="spotlight-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect
                  x={targetRect.left - SPOTLIGHT_PADDING}
                  y={targetRect.top - SPOTLIGHT_PADDING}
                  width={targetRect.width + SPOTLIGHT_PADDING * 2}
                  height={targetRect.height + SPOTLIGHT_PADDING * 2}
                  rx={spotlightRx}
                  ry={spotlightRx}
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

          {/* Click-catcher for backdrop dismiss */}
          <div className="absolute inset-0" onClick={handleSkip} />

          {/* Spotlight border glow */}
          <motion.div
            key={`spotlight-${currentStep}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.2 }}
            className={`absolute pointer-events-none ${isRoundSpotlight ? "rounded-full" : isRectSpotlight ? "rounded-xl" : "rounded-2xl"}`}
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
            style={{ ...getTooltipStyle(), zIndex: 10001, pointerEvents: "auto" as const }}
          >
            {/* Arrow */}
            <div style={getArrowStyle() as React.CSSProperties} />

            {/* Card with spinning conic-gradient border */}
            <div className="relative">
              {/* Spinning conic-gradient border */}
              <div className="absolute -inset-[2px] rounded-[18px] overflow-hidden">
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
              <div className="relative bg-card rounded-[18px] p-[18px]">
                {/* Pulse glow */}
                <div
                  className="absolute inset-0 rounded-[18px] opacity-50 animate-pulse-shadow pointer-events-none"
                  style={{ boxShadow: "0 0 30px hsl(var(--primary) / 0.3)" }}
                />

                <div className="relative z-10 flex flex-col gap-[14px]">
                  {/* Icon + text */}
                  <div className="flex items-start gap-[14px]">
                    <img
                      src={step.icon}
                      alt=""
                      className="w-[46px] h-[46px] flex-shrink-0 drop-shadow-lg"
                    />
                    <div>
                      <h3 className="text-base font-bold text-foreground mb-0.5">
                        {t(step.titleKey)}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {t(step.descKey)}
                      </p>
                    </div>
                  </div>

                  {/* Step dots + counter */}
                  <div className="flex items-center gap-[7px]">
                    {STEPS.map((_, i) => (
                      <div
                        key={i}
                        className={`h-[7px] rounded-full transition-all duration-300 ${
                          i === currentStep
                            ? "w-[23px] bg-primary"
                            : i < currentStep
                            ? "w-[7px] bg-primary/50"
                            : "w-[7px] bg-muted-foreground/20"
                        }`}
                      />
                    ))}
                    <span className="ml-auto text-[13px] text-muted-foreground">
                      {currentStep + 1}/{STEPS.length}
                    </span>
                  </div>

                  {/* Buttons */}
                  <div className="flex items-center gap-[9px]">
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
                      className="flex-1 px-[18px] py-[9px] rounded-full font-semibold text-sm text-white cursor-pointer"
                      style={{
                        background: "linear-gradient(135deg, hsl(var(--primary)), hsl(280, 80%, 60%))",
                      }}
                    >
                      {isLastStep ? t("common.letsGo") : t("common.next")}
                    </motion.button>
                    {!isLastStep && (
                      <button
                        onClick={handleSkip}
                        className="px-[14px] py-[9px] rounded-full text-sm text-muted-foreground hover:text-foreground transition-colors"
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
