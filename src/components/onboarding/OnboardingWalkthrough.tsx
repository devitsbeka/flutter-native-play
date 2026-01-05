import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { t } from "@/lib/i18n";
import { ChunkyButton } from "@/components/ui/chunky-button";

interface WalkthroughStep {
  id: string;
  targetSelector: string;
  title: string;
  description: string;
  position: "top" | "bottom" | "left" | "right";
  emoji: string;
}

const walkthroughSteps: WalkthroughStep[] = [
  {
    id: "avatar",
    targetSelector: "[data-walkthrough='avatar']",
    title: "step1Title",
    description: "step1Description",
    position: "bottom",
    emoji: "👤",
  },
  {
    id: "powerups",
    targetSelector: "[data-walkthrough='powerups']",
    title: "step2Title",
    description: "step2Description",
    position: "bottom",
    emoji: "⚡",
  },
  {
    id: "play",
    targetSelector: "[data-walkthrough='play']",
    title: "step3Title",
    description: "step3Description",
    position: "top",
    emoji: "🎮",
  },
  {
    id: "explore",
    targetSelector: "[data-walkthrough='explore']",
    title: "step4Title",
    description: "step4Description",
    position: "top",
    emoji: "🧭",
  },
  {
    id: "map",
    targetSelector: "[data-walkthrough='map']",
    title: "step5Title",
    description: "step5Description",
    position: "top",
    emoji: "🗺️",
  },
  {
    id: "rank",
    targetSelector: "[data-walkthrough='rank']",
    title: "step6Title",
    description: "step6Description",
    position: "top",
    emoji: "🏆",
  },
];

// Spotlight overlay with cutout
const SpotlightOverlay = ({ targetRect }: { targetRect: DOMRect | null }) => {
  if (!targetRect) return null;
  
  const padding = 12;
  const borderRadius = 24;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] pointer-events-none"
    >
      <svg className="w-full h-full">
        <defs>
          <mask id="spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect
              x={targetRect.left - padding}
              y={targetRect.top - padding}
              width={targetRect.width + padding * 2}
              height={targetRect.height + padding * 2}
              rx={borderRadius}
              ry={borderRadius}
              fill="black"
            />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.75)"
          mask="url(#spotlight-mask)"
        />
      </svg>
      
      {/* Glowing border around target */}
      <motion.div
        className="absolute rounded-3xl pointer-events-none"
        style={{
          left: targetRect.left - padding,
          top: targetRect.top - padding,
          width: targetRect.width + padding * 2,
          height: targetRect.height + padding * 2,
          boxShadow: "0 0 0 3px rgba(168,85,247,0.6), 0 0 30px rgba(168,85,247,0.4)",
        }}
        animate={{
          boxShadow: [
            "0 0 0 3px rgba(168,85,247,0.6), 0 0 30px rgba(168,85,247,0.4)",
            "0 0 0 4px rgba(168,85,247,0.8), 0 0 40px rgba(168,85,247,0.6)",
            "0 0 0 3px rgba(168,85,247,0.6), 0 0 30px rgba(168,85,247,0.4)",
          ],
        }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
    </motion.div>
  );
};

// Tooltip component
const WalkthroughTooltip = ({
  step,
  targetRect,
  currentIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
}: {
  step: WalkthroughStep;
  targetRect: DOMRect | null;
  currentIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}) => {
  if (!targetRect) return null;
  
  const getPosition = () => {
    const tooltipWidth = 280;
    const tooltipHeight = 180;
    const offset = 20;
    
    let x = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
    let y = 0;
    
    // Clamp x to viewport
    x = Math.max(16, Math.min(x, window.innerWidth - tooltipWidth - 16));
    
    switch (step.position) {
      case "top":
        y = targetRect.top - tooltipHeight - offset;
        break;
      case "bottom":
        y = targetRect.bottom + offset;
        break;
      default:
        y = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
    }
    
    // Clamp y to viewport
    y = Math.max(16, Math.min(y, window.innerHeight - tooltipHeight - 16));
    
    return { x, y };
  };
  
  const { x, y } = getPosition();
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: step.position === "top" ? 20 : -20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed z-[100] w-[280px]"
      style={{ left: x, top: y }}
    >
      <div
        className="rounded-3xl p-5 relative overflow-hidden"
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(245,240,255,0.98) 100%)",
          boxShadow: "0 20px 40px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.5)",
        }}
      >
        {/* Close button */}
        <button
          onClick={onSkip}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-muted/80 flex items-center justify-center"
        >
          <X className="w-4 h-4" />
        </button>
        
        {/* Content */}
        <div className="flex items-start gap-3 mb-4">
          <motion.span
            className="text-3xl"
            animate={{ rotate: [0, -10, 10, 0] }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {step.emoji}
          </motion.span>
          <div className="flex-1">
            <h3 className="font-display text-lg font-bold text-foreground mb-1">
              {t(`onboarding.${step.title}`)}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t(`onboarding.${step.description}`)}
            </p>
          </div>
        </div>
        
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 mb-4">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{
                background: i === currentIndex ? "hsl(var(--primary))" : "hsl(var(--muted))",
              }}
              animate={i === currentIndex ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.5 }}
            />
          ))}
        </div>
        
        {/* Navigation buttons */}
        <div className="flex gap-2">
          {currentIndex > 0 && (
            <ChunkyButton
              variant="secondary"
              size="sm"
              onClick={onPrev}
              icon={<ChevronLeft className="w-4 h-4" />}
              className="flex-1"
            >
              {t("common.back")}
            </ChunkyButton>
          )}
          <ChunkyButton
            variant="primary"
            size="sm"
            onClick={onNext}
            icon={currentIndex === totalSteps - 1 ? undefined : <ChevronRight className="w-4 h-4" />}
            className="flex-1"
          >
            {currentIndex === totalSteps - 1 ? t("onboarding.walkthroughDone") : t("onboarding.walkthroughNext")}
          </ChunkyButton>
        </div>
      </div>
    </motion.div>
  );
};

export function OnboardingWalkthrough() {
  const { step, setStep, walkthroughStep, setWalkthroughStep, completeOnboarding } = useOnboarding();
  
  const isOpen = step === "walkthrough";
  const currentStep = walkthroughSteps[walkthroughStep];
  
  // Get target element rect
  const getTargetRect = useCallback((): DOMRect | null => {
    if (!currentStep) return null;
    const element = document.querySelector(currentStep.targetSelector);
    return element?.getBoundingClientRect() || null;
  }, [currentStep]);
  
  const targetRect = isOpen ? getTargetRect() : null;
  
  // Handle next
  const handleNext = () => {
    if (walkthroughStep < walkthroughSteps.length - 1) {
      setWalkthroughStep(walkthroughStep + 1);
    } else {
      completeOnboarding();
    }
  };
  
  // Handle prev
  const handlePrev = () => {
    if (walkthroughStep > 0) {
      setWalkthroughStep(walkthroughStep - 1);
    }
  };
  
  // Handle skip
  const handleSkip = () => {
    completeOnboarding();
  };
  
  // Re-calculate position on resize
  useEffect(() => {
    if (!isOpen) return;
    
    const handleResize = () => {
      // Force re-render by updating walkthrough step
      setWalkthroughStep(walkthroughStep);
    };
    
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isOpen, walkthroughStep, setWalkthroughStep]);
  
  if (!isOpen || !currentStep) return null;
  
  return (
    <AnimatePresence mode="wait">
      <SpotlightOverlay key={`spotlight-${currentStep.id}`} targetRect={targetRect} />
      <WalkthroughTooltip
        key={`tooltip-${currentStep.id}`}
        step={currentStep}
        targetRect={targetRect}
        currentIndex={walkthroughStep}
        totalSteps={walkthroughSteps.length}
        onNext={handleNext}
        onPrev={handlePrev}
        onSkip={handleSkip}
      />
    </AnimatePresence>
  );
}
