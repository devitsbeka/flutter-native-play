import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { PUBLIC_SHARING_ENABLED } from "@/config/features";

// Import feature icons
import roomsIcon from "@/assets/icons/rooms-icon.png";
import triviaIcon from "@/assets/icons/trivia-icon.png";
import exploreIcon from "@/assets/icons/explore-icon.png";

const ONBOARDING_KEY = "mytrivia_feature_onboarding_seen";

interface FeatureTooltip {
  id: string;
  iconSrc: string;
  titleKey: string;
  descKey: string;
  targetTab: string;
  actionKey?: string;
}

// The explore slide sells the public feed; it disappears with the feature.
const ALL_TOOLTIP_DEFS: FeatureTooltip[] = [
  {
    id: "rooms",
    iconSrc: roomsIcon,
    titleKey: "extra.featureRoomsTitle",
    descKey: "extra.featureRoomsDesc",
    targetTab: "rooms",
    actionKey: "extra.featureRoomsAction",
  },
  {
    id: "my-trivia",
    iconSrc: triviaIcon,
    titleKey: "extra.featureTriviaTitle",
    // The original copy invites the user to publish; while public sharing is
    // hidden the slide sells private play instead. The old key stays for the
    // flag flip.
    descKey: PUBLIC_SHARING_ENABLED ? "extra.featureTriviaDesc" : "extra.featureTriviaDescPrivate",
    targetTab: "my-content",
    actionKey: "extra.featureTriviaAction",
  },
  {
    id: "explore",
    iconSrc: exploreIcon,
    titleKey: "extra.featureExploreTitle",
    descKey: "extra.featureExploreDesc",
    targetTab: "explore",
    actionKey: "extra.featureExploreAction",
  },
];

const FEATURE_TOOLTIP_DEFS = ALL_TOOLTIP_DEFS.filter(
  (def) => PUBLIC_SHARING_ENABLED || def.id !== "explore",
);

// "My Trivia Party" is a brand name, untranslated in every locale, and the
// design wants it in the pink/purple product gradient wherever slide copy
// mentions it.
function renderWithBrandGradient(text: string) {
  const BRAND = "My Trivia Party";
  if (!text.includes(BRAND)) return text;
  return text.split(BRAND).flatMap((part, i) =>
    i === 0
      ? [part]
      : [
          <span
            key={`brand-${i}`}
            className="font-semibold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent"
          >
            {BRAND}
          </span>,
          part,
        ],
  );
}

interface FeatureOnboardingCarouselProps {
  onNavigateToTab?: (tab: string) => void;
  onComplete?: () => void;
  showAllCards?: boolean;
  onCreateRoom?: () => void;
  onCreateTrivia?: () => void;
  contextTab?: string;
}

export function FeatureOnboardingCarousel({ 
  onNavigateToTab, 
  onComplete,
  showAllCards = false,
  onCreateRoom,
  onCreateTrivia,
  contextTab,
}: FeatureOnboardingCarouselProps) {
  const { t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const orderedTooltips = (() => {
    if (!contextTab) return FEATURE_TOOLTIP_DEFS;
    const priorityId = contextTab === "rooms" ? "rooms" : contextTab === "my-content" ? "my-trivia" : null;
    if (!priorityId) return FEATURE_TOOLTIP_DEFS;
    const priority = FEATURE_TOOLTIP_DEFS.find(t => t.id === priorityId);
    if (!priority) return FEATURE_TOOLTIP_DEFS;
    return [priority, ...FEATURE_TOOLTIP_DEFS.filter(t => t.id !== priorityId)];
  })();

  useEffect(() => {
    if (showAllCards || isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % orderedTooltips.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [showAllCards, isPaused, orderedTooltips.length]);

  const getActionForTooltip = useCallback((tooltip: FeatureTooltip) => {
    if (tooltip.id === "rooms" && onCreateRoom) return onCreateRoom;
    if (tooltip.id === "my-trivia" && onCreateTrivia) return onCreateTrivia;
    return undefined;
  }, [onCreateRoom, onCreateTrivia]);

  const handleCardClick = useCallback((tooltip: FeatureTooltip) => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    onNavigateToTab?.(tooltip.targetTab);
    onComplete?.();
  }, [onNavigateToTab, onComplete]);

  const handleAction = useCallback((tooltip: FeatureTooltip) => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    const action = getActionForTooltip(tooltip);
    if (action) {
      action();
      onComplete?.();
    } else {
      onNavigateToTab?.(tooltip.targetTab);
      onComplete?.();
    }
  }, [getActionForTooltip, onNavigateToTab, onComplete]);

  const handleDotClick = (index: number) => {
    setCurrentIndex(index);
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 6000);
  };

  if (showAllCards) {
    return (
      <div className="flex flex-col gap-6">
        {orderedTooltips.map((tooltip, index) => (
          <FeatureCard 
            key={tooltip.id} 
            tooltip={tooltip} 
            onClick={() => handleCardClick(tooltip)}
            onAction={() => handleAction(tooltip)}
            index={index}
            t={t}
          />
        ))}
      </div>
    );
  }

  const currentTooltip = orderedTooltips[currentIndex];

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
            onAction={() => handleAction(currentTooltip)}
            index={currentIndex}
            t={t}
          />
        </motion.div>
      </AnimatePresence>

      <div className="flex gap-2">
        {orderedTooltips.map((_, index) => (
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
  onAction?: () => void;
  index: number;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function FeatureCard({ tooltip, onClick, onAction, index, t }: FeatureCardProps) {
  const title = t(tooltip.titleKey);
  const description = t(tooltip.descKey);
  const actionLabel = tooltip.actionKey ? t(tooltip.actionKey) : undefined;

  return (
    <button
      onClick={onClick}
      className="w-full text-left focus:outline-none group"
    >
      <div className="relative">
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
        
        <div className="relative bg-card rounded-2xl p-5 transition-transform duration-200 group-hover:scale-[0.99] group-active:scale-[0.97]">
          <div 
            className="absolute inset-0 rounded-2xl opacity-50 animate-pulse-shadow pointer-events-none"
            style={{
              boxShadow: "0 0 30px hsl(var(--primary) / 0.3)",
            }}
          />
          
          <div className="relative z-10 flex flex-col gap-3">
            <img 
              src={tooltip.iconSrc} 
              alt={title} 
              className="w-16 h-16 object-contain"
            />
            
            <h3 className="text-lg font-bold text-foreground">
              {title}
            </h3>
            
            <p className="text-sm text-muted-foreground leading-relaxed">
              {renderWithBrandGradient(description)}
            </p>

            {actionLabel && (
              <motion.div
                onClick={(e) => {
                  e.stopPropagation();
                  onAction?.();
                }}
                animate={{
                  boxShadow: [
                    "0 0 12px hsl(var(--primary) / 0.3)",
                    "0 0 28px hsl(var(--primary) / 0.6)",
                    "0 0 12px hsl(var(--primary) / 0.3)",
                  ],
                  scale: [1, 1.03, 1],
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="mt-1 w-full py-3 rounded-xl text-center font-bold text-white text-base cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, hsl(var(--primary)), hsl(280, 80%, 60%))",
                }}
              >
                {actionLabel}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

export function hasSeenFeatureOnboarding(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === "true";
}

export function resetFeatureOnboarding(): void {
  localStorage.removeItem(ONBOARDING_KEY);
}
