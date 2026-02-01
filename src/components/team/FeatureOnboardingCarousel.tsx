import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QuizCategoryIcon } from "@/components/ui/quiz-category-icon";

const ONBOARDING_KEY = "mytrivia_feature_onboarding_seen";

interface FeatureTooltip {
  id: string;
  icon: string;
  title: string;
  description: string;
  targetTab: string;
}

const FEATURE_TOOLTIPS: FeatureTooltip[] = [
  {
    id: "rooms",
    icon: "retro-tv",
    title: "ოთახები",
    description: "შექმენი სათამაშო ოთახი, აირჩიე რას ითამაშებთ, და მოიწვიე მეგობრები სათამაშოდ. თამაში TV-ზეც შესაძლებელია",
    targetTab: "rooms",
  },
  {
    id: "my-trivia",
    icon: "sparkles",
    title: "ჩემი ტრივია",
    description: "შექმენი შენი Trivia, გამოაქვეყნე ან შექმენი My Trivia Party მეგობრებთან ერთად სათამაშოდ, შენი კითხვებით / შენი პასუხებით",
    targetTab: "my-content",
  },
  {
    id: "explore",
    icon: "compass",
    title: "აღმოაჩინე",
    description: "ითამაშე სხვა მოთამაშეების მიერ შექმნილი Trivia სხვადასხვა თემაზე",
    targetTab: "explore",
  },
];

interface FeatureOnboardingCarouselProps {
  onNavigateToTab?: (tab: string) => void;
  onComplete?: () => void;
  showAllCards?: boolean; // For preview page
}

export function FeatureOnboardingCarousel({ 
  onNavigateToTab, 
  onComplete,
  showAllCards = false 
}: FeatureOnboardingCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-rotate every 4 seconds
  useEffect(() => {
    if (showAllCards || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % FEATURE_TOOLTIPS.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [showAllCards, isPaused]);

  const handleCardClick = useCallback((tooltip: FeatureTooltip) => {
    // Mark onboarding as seen
    localStorage.setItem(ONBOARDING_KEY, "true");
    
    // Navigate to the corresponding tab
    onNavigateToTab?.(tooltip.targetTab);
    onComplete?.();
  }, [onNavigateToTab, onComplete]);

  const handleDotClick = (index: number) => {
    setCurrentIndex(index);
    setIsPaused(true);
    // Resume auto-rotation after 6 seconds
    setTimeout(() => setIsPaused(false), 6000);
  };

  if (showAllCards) {
    return (
      <div className="flex flex-col gap-6">
        {FEATURE_TOOLTIPS.map((tooltip, index) => (
          <FeatureCard 
            key={tooltip.id} 
            tooltip={tooltip} 
            onClick={() => handleCardClick(tooltip)}
            index={index}
          />
        ))}
      </div>
    );
  }

  const currentTooltip = FEATURE_TOOLTIPS[currentIndex];

  return (
    <div className="flex flex-col items-center gap-4 py-4 px-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentTooltip.id}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="w-full max-w-sm"
        >
          <FeatureCard 
            tooltip={currentTooltip} 
            onClick={() => handleCardClick(currentTooltip)}
            index={currentIndex}
          />
        </motion.div>
      </AnimatePresence>

      {/* Dot indicators */}
      <div className="flex gap-2">
        {FEATURE_TOOLTIPS.map((_, index) => (
          <button
            key={index}
            onClick={() => handleDotClick(index)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === currentIndex 
                ? "bg-primary w-6 scale-110" 
                : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
            }`}
            aria-label={`Go to tooltip ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

interface FeatureCardProps {
  tooltip: FeatureTooltip;
  onClick: () => void;
  index: number;
}

function FeatureCard({ tooltip, onClick, index }: FeatureCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left focus:outline-none group"
    >
      <div className="relative">
        {/* Animated gradient border */}
        <div className="absolute -inset-[2px] rounded-2xl overflow-hidden">
          <div 
            className="absolute inset-0 animate-spin-slow"
            style={{
              background: `conic-gradient(from ${index * 120}deg, 
                hsl(var(--primary)), 
                hsl(280, 80%, 60%), 
                hsl(320, 80%, 60%), 
                hsl(var(--primary))
              )`,
            }}
          />
        </div>
        
        {/* Card content */}
        <div className="relative bg-card rounded-2xl p-5 transition-transform duration-200 group-hover:scale-[0.99] group-active:scale-[0.97]">
          {/* Animated shadow glow */}
          <div 
            className="absolute inset-0 rounded-2xl opacity-50 animate-pulse-shadow pointer-events-none"
            style={{
              boxShadow: "0 0 30px hsl(var(--primary) / 0.3)",
            }}
          />
          
          <div className="relative z-10 flex flex-col gap-3">
            {/* Icon */}
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
              <QuizCategoryIcon iconSlug={tooltip.icon} size={36} />
            </div>
            
            {/* Title */}
            <h3 className="text-lg font-bold text-foreground">
              {tooltip.title}
            </h3>
            
            {/* Description */}
            <p className="text-sm text-muted-foreground leading-relaxed">
              {tooltip.description}
            </p>
          </div>
        </div>
      </div>
    </button>
  );
}

// Utility to check if onboarding has been seen
export function hasSeenFeatureOnboarding(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === "true";
}

// Utility to reset onboarding (for testing)
export function resetFeatureOnboarding(): void {
  localStorage.removeItem(ONBOARDING_KEY);
}
