import { useState, useRef, useEffect, useCallback, memo, useMemo, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLeagueLeaderboard, LEAGUES, LeagueEntry } from "@/hooks/useLeagueLeaderboard";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";
import glitchIcon from "@/assets/glitch.png";
import trophyBronze from "@/assets/trophy-bronze.png";
import trophySilver from "@/assets/trophy-silver.png";
import trophyGold from "@/assets/trophy-gold.png";
import awardCeremonyIcon from "@/assets/award-ceremony.png";

import { LeaguePlayerRow } from "@/components/leaderboard/LeaguePlayerRow";
import { LeagueCountdown } from "@/components/leaderboard/LeagueCountdown";
import { LeaderboardHeroBackground } from "@/components/leaderboard/LeaderboardHeroBackground";
import { MainLayout } from "@/components/layout/MainLayout";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { LeaderboardCardSkeleton, MobileLeaderboardSkeleton, DesktopLeaderboardsSkeleton } from "@/components/leaderboard/LeaderboardSkeleton";
import { HeaderActions } from "@/components/shared/HeaderActions";
import { useLeaderboardPrefetch } from "@/hooks/useLeaderboardPrefetch";
import { AuthRequiredModal } from "@/components/shared/AuthRequiredModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChunkyButton } from "@/components/ui/chunky-button";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";

// Trophy images by tier
const TROPHY_IMAGES: Record<number, string> = {
  1: trophyBronze,
  2: trophySilver,
  3: trophyGold,
};

// Trophy sizes
const TROPHY_SIZES = {
  desktop: 120,
  mobile: 100,
};

// League-colored "ნახე რეიტინგი" button that opens ratings
const AnimatedLeagueBadge = ({ tier, onClick }: { tier: number; onClick?: () => void }) => {
  const { t } = useLanguage();
  const variant = tier === 3 ? "gold" : tier === 2 ? "silver" : "bronze";
  
  return (
    <ChunkyButton 
      variant={variant} 
      size="sm" 
      onClick={onClick}
    >
      {t("extra.viewRating")}
    </ChunkyButton>
  );
};

export default function Leaderboards() {
  const { user } = useAuth();
  const { region, language, t } = useLanguage();
  const isMobile = useIsMobile();
  const [viewingTier, setViewingTier] = useState<number | undefined>(undefined);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Check if user is a guest
  const isGuest = !user;
  
  // Prefetch leaderboard data as soon as userTier is known
  const { prefetchLeaderboard } = useLeaderboardPrefetch();
  
  // For mobile, we fetch one tier at a time
  const {
    leaderboard,
    isLoading,
    userTier,
    currentLeague,
    userEntry,
    previousRank,
    isLeagueLocked,
  } = useLeagueLeaderboard(viewingTier, region);

  const [showFixedBar, setShowFixedBar] = useState(true);
  const userRowRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Sync carousel with viewingTier (mobile only)
  useEffect(() => {
    if (!carouselApi) return;
    
    const handleSelect = () => {
      const selectedIndex = carouselApi.selectedScrollSnap();
      const tier = selectedIndex + 1;
      if (tier !== viewingTier) {
        setViewingTier(tier);
      }
    };
    
    carouselApi.on("select", handleSelect);
    return () => {
      carouselApi.off("select", handleSelect);
    };
  }, [carouselApi, viewingTier]);

  // Initialize carousel to user's tier
  useEffect(() => {
    if (carouselApi && userTier && viewingTier === undefined) {
      carouselApi.scrollTo(userTier - 1, true);
      setViewingTier(userTier);
    }
  }, [carouselApi, userTier, viewingTier]);

  // Use IntersectionObserver to detect when user's row is visible within scroll container
  useEffect(() => {
    if (!userEntry || !isExpanded) {
      setShowFixedBar(false);
      return;
    }

    const scrollRoot = scrollContainerRef.current;
    if (!scrollRoot) {
      setShowFixedBar(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowFixedBar(!entry.isIntersecting);
      },
      { root: scrollRoot, threshold: 0.1 }
    );

    const currentRef = userRowRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    } else {
      // User row not rendered yet, show bar
      setShowFixedBar(true);
    }
    return () => {
      if (currentRef) observer.unobserve(currentRef);
    };
  }, [userEntry, isExpanded]);

  const activeTier = viewingTier ?? userTier;

  // League names - language-aware
  const LEAGUE_NAMES: Record<number, string> = Object.fromEntries(
    LEAGUES.map(l => [l.tier, language === 'ka' ? l.nameKa : l.name])
  );

  const handleSelectTier = useCallback((tier: number) => {
    if (tier >= 1 && tier <= LEAGUES.length) {
      setViewingTier(tier);
      if (carouselApi) {
        carouselApi.scrollTo(tier - 1);
      }
    }
  }, [carouselApi]);

  const handlePrevTier = useCallback(() => {
    const getPrevTier = (t: number) => {
      if (t === 1) return 3;
      if (t === 3) return 2;
      return 1;
    };
    handleSelectTier(getPrevTier(activeTier || 1));
  }, [activeTier, handleSelectTier]);

  const handleNextTier = useCallback(() => {
    const getNextTier = (t: number) => {
      if (t === 2) return 3;
      if (t === 3) return 1;
      return 2;
    };
    handleSelectTier(getNextTier(activeTier || 1));
  }, [activeTier, handleSelectTier]);

  // Sync carousel slide changes with the background
  useEffect(() => {
    if (!carouselApi) return;

    const onSelect = () => {
      const selectedIndex = carouselApi.selectedScrollSnap();
      const newTier = selectedIndex + 1;
      if (newTier !== viewingTier) {
        setViewingTier(newTier);
      }
    };

    carouselApi.on('select', onSelect);
    return () => {
      carouselApi.off('select', onSelect);
    };
  }, [carouselApi, viewingTier]);

  // Prefetch leaderboard data when userTier is known (before user clicks)
  useEffect(() => {
    if (userTier) {
      prefetchLeaderboard(userTier);
    }
  }, [userTier, prefetchLeaderboard]);

  // Show auth modal for guests on mount
  useEffect(() => {
    // Once per session (shared key with /team) - guests kept getting the same
    // sign-in wall on every single tab navigation
    if (isGuest && !sessionStorage.getItem("auth_prompt_shown")) {
      sessionStorage.setItem("auth_prompt_shown", "true");
      setShowAuthModal(true);
    }
  }, [isGuest]);

  return (
    <MainLayout showPlayButton={false}>
    {/* Auth Required Modal for guests */}
    <AuthRequiredModal
      isOpen={showAuthModal}
      onClose={() => setShowAuthModal(false)}
      returnToPath="/leaderboards"
      message={t("extra.signInForLeaderboard")}
    />
    <div className="min-h-screen w-full max-w-[100vw] flex flex-col overflow-x-hidden bg-background">
      {/* Header Bar - sticky with white background */}
      <div className="sticky top-0 left-0 right-0 z-50">
        <div className="px-4 py-3 bg-background/95 backdrop-blur-md border-b border-border/30">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-display font-bold text-foreground uppercase tracking-wide">
              {language === 'ka' ? 'რეიტინგი' : 'Leaderboard'}
            </h1>
            <HeaderActions />
          </div>
        </div>
        
        {/* League Navigation - Mobile only, at TOP - with blur */}
        <div className="md:hidden bg-background/70 backdrop-blur-md">
          <div className="flex items-center justify-between py-3 px-4">
            {/* Left Arrow */}
            <button
              onClick={handlePrevTier}
              className="p-2 rounded-full bg-background/30 backdrop-blur-sm text-foreground hover:bg-background/50 transition-all"
              aria-label="Previous tier"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            {/* Title */}
            <div className="text-center flex-1 min-w-0">
              <h2 className="text-lg text-foreground font-bold whitespace-nowrap drop-shadow-md" style={{ fontFamily: "'Google Sans', sans-serif" }}>
                {LEAGUE_NAMES[activeTier || 1]?.toUpperCase() || 'LEAGUE'}
              </h2>
            </div>
            
            {/* Right Arrow */}
            <button
              onClick={handleNextTier}
              className="p-2 rounded-full bg-background/30 backdrop-blur-sm text-foreground hover:bg-background/50 transition-all"
              aria-label="Next tier"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop: Show all 3 leaderboards side by side */}
      <div className="hidden lg:block flex-1 pb-28">
        <DesktopLeaderboards userTier={userTier} region={region} />
      </div>

      {/* Tablet: Full background with league nav and View Rating button */}
      <div className="hidden md:block lg:hidden flex-1 relative">
        <TabletLeaderboards 
          userTier={userTier} 
          region={region}
          activeTier={activeTier}
          onTierChange={handleSelectTier}
          onPrevTier={handlePrevTier}
          onNextTier={handleNextTier}
        />
      </div>

      {/* Mobile: Fullscreen league view with collapsed/expanded */}
      <div id="leaderboard-scroll-container" className="md:hidden flex-1 flex flex-col overflow-hidden relative">
        {/* Background Hero - fixed behind everything */}
        <LeaderboardHeroBackground 
          isMobile 
          currentTier={activeTier} 
          onTierChange={handleSelectTier}
          isFullscreen={!isExpanded}
        />
        
        {/* "ნახე რეიტინგი" button + "შენი ლიგა" label when collapsed */}
        {!isExpanded && (
          <div className="fixed top-[140px] left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5">
            <AnimatedLeagueBadge tier={activeTier} onClick={() => setIsExpanded(true)} />
            {activeTier === userTier && (
              <span 
                className="text-xs font-bold text-white"
                style={{ textShadow: '0 1px 6px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,0.5)' }}
              >
                {t("extra.yourLeague")}
              </span>
            )}
          </div>
        )}

        {/* Bottom section: Expandable list */}
        <AnimatePresence>
          {isExpanded && (
            <>
              {/* Overlay to close when clicking outside */}
              <motion.div 
                className="absolute inset-0 z-20 bg-black/20"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsExpanded(false)}
              />
              
              <motion.div 
                className="absolute bottom-0 left-0 right-0 z-30 flex flex-col bg-background rounded-t-3xl shadow-lg overflow-hidden"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                style={{ maxHeight: "70vh" }}
              >
                {/* Tappable header to collapse */}
                <button
                  onClick={() => setIsExpanded(false)}
                  className="py-3 px-4 w-full"
                >
                  <div className="w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto" />
                </button>

                {/* Full scrollable list */}
                <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-3 pb-4">
                  {isLoading && leaderboard.length === 0 ? (
                    // Show skeleton rows while loading
                    Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 py-3 px-3 border-b border-border/40 last:border-b-0">
                        <div className="relative shrink-0">
                          <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-muted animate-pulse" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="h-5 w-24 bg-muted animate-pulse rounded" />
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="w-6 h-6 rounded-full bg-muted animate-pulse" />
                          <div className="h-5 w-12 bg-muted animate-pulse rounded" />
                        </div>
                      </div>
                    ))
                  ) : leaderboard.length === 0 ? (
                    <div className="text-center py-8">
                      <img src={glitchIcon} alt="" className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm text-muted-foreground">ჯერ არავინ</p>
                    </div>
                  ) : (
                    leaderboard.map((entry, index) => {
                      const isCurrentUser = entry.user_id === user?.id;
                      return (
                        <div 
                          key={entry.user_id} 
                          ref={isCurrentUser ? userRowRef : undefined}
                          className={isCurrentUser ? "relative z-10 my-3 mx-1" : ""}
                        >
                          <LeaguePlayerRow
                            entry={entry}
                            isCurrentUser={isCurrentUser}
                            index={index}
                            previousRank={isCurrentUser ? previousRank : null}
                            shouldAnimate={false}
                            totalPlayers={leaderboard.length}
                            isPromotionZone={(activeTier || 1) < 5 && entry.rank <= 10}
                            isDemotionZone={(activeTier || 1) > 1 && entry.rank > leaderboard.length - 10}
                          />
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Sticky User Position Bar - inside bottom sheet */}
                <AnimatePresence>
                  {userEntry && !isLeagueLocked && showFixedBar && (
                    <motion.div
                      className="sticky bottom-0 left-0 right-0 z-10 px-3 py-2 bg-background/95 backdrop-blur-lg border-t border-border/30"
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 20, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <button
                        onClick={() => {
                          userRowRef.current?.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'center' 
                          });
                        }}
                        className="w-full text-left cursor-pointer active:scale-[0.98] transition-transform"
                      >
                        <LeaguePlayerRow
                          entry={userEntry}
                          isCurrentUser={true}
                          index={0}
                          previousRank={previousRank}
                          shouldAnimate={false}
                          totalPlayers={leaderboard.length}
                          isPromotionZone={(viewingTier ?? userTier) < 5 && userEntry.rank <= 10}
                          isDemotionZone={(viewingTier ?? userTier) > 1 && userEntry.rank > leaderboard.length - 10}
                          isFixed={true}
                        />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
    </MainLayout>
  );
}

// Desktop: Match tablet layout with league nav and View Rating button
function DesktopLeaderboards({ userTier, region }: { userTier: number; region?: string }) {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [activeTier, setActiveTier] = useState(2); // Default to Silver
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const {
    leaderboard,
    isLoading,
    userEntry,
    previousRank,
  } = useLeagueLeaderboard(activeTier, region);
  
  const LEAGUE_NAMES: Record<number, string> = Object.fromEntries(
    LEAGUES.map(l => [l.tier, language === 'ka' ? l.nameKa : l.name])
  );
  
  const handlePrevTier = useCallback(() => {
    setActiveTier(t => {
      if (t === 1) return 3;
      if (t === 3) return 2;
      return 1;
    });
  }, []);
  
  const handleNextTier = useCallback(() => {
    setActiveTier(t => {
      if (t === 2) return 3;
      if (t === 3) return 1;
      return 2;
    });
  }, []);

  return (
    <LeaderboardHeroBackground>
      <div className="relative flex flex-col h-[calc(100vh-120px)]">
        {/* League Navigation Header with blur - DARK text for visibility */}
        <div className="mx-6 mt-6 flex justify-center">
          <div className="bg-white/50 backdrop-blur-xl rounded-2xl p-3 px-5 border border-white/40 shadow-lg">
            <div className="flex items-center gap-4">
              <button
                onClick={handlePrevTier}
                className="p-2 rounded-full bg-foreground/10 hover:bg-foreground/20 transition-all"
                aria-label="Previous tier"
              >
                <ChevronLeft className="w-5 h-5 text-foreground" />
              </button>
              
              <div className="flex items-center gap-2.5 min-w-[200px] justify-center">
                <img 
                  src={TROPHY_IMAGES[activeTier]} 
                  alt="" 
                  className="w-7 h-7 object-contain"
                />
                <span className="text-foreground font-bold text-lg whitespace-nowrap" style={{ fontFamily: "'Google Sans', sans-serif" }}>
                  {LEAGUE_NAMES[activeTier]?.toUpperCase()}
                </span>
              </div>
              
              <button
                onClick={handleNextTier}
                className="p-2 rounded-full bg-foreground/10 hover:bg-foreground/20 transition-all"
                aria-label="Next tier"
              >
                <ChevronRight className="w-5 h-5 text-foreground" />
              </button>
            </div>
          </div>
        </div>
        
        {/* "ნახე რეიტინგი" button + "შენი ლიგა" label */}
        <div className="flex justify-center mt-4 flex-col items-center gap-1.5">
          <AnimatedLeagueBadge tier={activeTier} onClick={() => setIsModalOpen(true)} />
          {activeTier === userTier && (
            <span 
              className="text-xs font-bold text-white"
              style={{ textShadow: '0 1px 6px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,0.5)' }}
            >
              {t("extra.yourLeague")}
            </span>
          )}
        </div>
        
        {/* Spacer - trophies visible in background */}
        <div className="flex-1" />
      </div>
      
      {/* Rating Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent 
          className="max-w-lg max-h-[80vh] p-0 overflow-hidden"
          onInteractOutside={() => setIsModalOpen(false)}
          onEscapeKeyDown={() => setIsModalOpen(false)}
        >
          <DialogHeader className="p-4 pb-2 border-b border-border/30">
            <DialogTitle className="text-center font-bold" style={{ fontFamily: "'Google Sans', sans-serif" }}>
              {LEAGUE_NAMES[activeTier]?.toUpperCase() || 'LEAGUE'}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 max-h-[60vh]">
            <div className="px-3 pb-4">
              {isLoading && leaderboard.length === 0 ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 py-3 px-3 border-b border-border/40 last:border-b-0">
                    <div className="relative shrink-0">
                      <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-muted animate-pulse" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="h-5 w-24 bg-muted animate-pulse rounded" />
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="w-6 h-6 rounded-full bg-muted animate-pulse" />
                      <div className="h-5 w-12 bg-muted animate-pulse rounded" />
                    </div>
                  </div>
                ))
              ) : leaderboard.length === 0 ? (
                <div className="text-center py-8">
                  <img src={glitchIcon} alt="" className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm text-muted-foreground">ჯერ არავინ</p>
                </div>
              ) : (
                leaderboard.map((entry, index) => {
                  const isCurrentUser = entry.user_id === user?.id;
                  return (
                    <div 
                      key={entry.user_id}
                      className={isCurrentUser ? "relative z-10 my-3 mx-1" : ""}
                    >
                      <LeaguePlayerRow
                        entry={entry}
                        isCurrentUser={isCurrentUser}
                        index={index}
                        previousRank={isCurrentUser ? previousRank : null}
                        shouldAnimate={false}
                        totalPlayers={leaderboard.length}
                        isPromotionZone={activeTier < 5 && entry.rank <= 10}
                        isDemotionZone={activeTier > 1 && entry.rank > leaderboard.length - 10}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </LeaderboardHeroBackground>
  );
}

// Tablet: Full background with league nav at top and View Rating button
function TabletLeaderboards({ 
  userTier, 
  region,
  activeTier,
  onTierChange,
  onPrevTier,
  onNextTier,
}: { 
  userTier: number; 
  region?: string;
  activeTier: number | undefined;
  onTierChange: (tier: number) => void;
  onPrevTier: () => void;
  onNextTier: () => void;
}) {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const {
    leaderboard,
    isLoading,
    userEntry,
    previousRank,
  } = useLeagueLeaderboard(activeTier, region);
  
  const LEAGUE_NAMES: Record<number, string> = Object.fromEntries(
    LEAGUES.map(l => [l.tier, language === 'ka' ? l.nameKa : l.name])
  );
  
  const currentTier = activeTier || 2;
  
  return (
    <LeaderboardHeroBackground isTablet currentTier={currentTier}>
      <div className="relative flex flex-col h-[calc(100vh-120px)]">
        {/* League Navigation at top with blur container - DARK text for visibility */}
        <div className="mx-6 mt-4 flex justify-center">
          <div className="bg-white/50 backdrop-blur-xl rounded-2xl p-3 px-5 border border-white/40 shadow-lg">
            <div className="flex items-center gap-4">
              <button
                onClick={onPrevTier}
                className="p-2 rounded-full bg-foreground/10 hover:bg-foreground/20 transition-all"
                aria-label="Previous tier"
              >
                <ChevronLeft className="w-5 h-5 text-foreground" />
              </button>
              
              <div className="flex items-center gap-2.5 min-w-[180px] justify-center">
                <img 
                  src={TROPHY_IMAGES[currentTier]} 
                  alt="" 
                  className="w-7 h-7 object-contain"
                />
                <span className="text-lg text-foreground font-bold whitespace-nowrap" style={{ fontFamily: "'Google Sans', sans-serif" }}>
                  {LEAGUE_NAMES[currentTier]?.toUpperCase() || 'LEAGUE'}
                </span>
              </div>
              
              <button
                onClick={onNextTier}
                className="p-2 rounded-full bg-foreground/10 hover:bg-foreground/20 transition-all"
                aria-label="Next tier"
              >
                <ChevronRight className="w-5 h-5 text-foreground" />
              </button>
            </div>
          </div>
        </div>
        
        {/* "ნახე რეიტინგი" button + "შენი ლიგა" label */}
        <div className="flex justify-center mt-4 flex-col items-center gap-1.5">
          <AnimatedLeagueBadge tier={currentTier} onClick={() => setIsModalOpen(true)} />
          {currentTier === userTier && (
            <span 
              className="text-xs font-bold text-white"
              style={{ textShadow: '0 1px 6px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,0.5)' }}
            >
              {t("extra.yourLeague")}
            </span>
          )}
        </div>
        
        {/* Spacer - trophy is already visible in the background */}
        <div className="flex-1" />
      </div>
      
      {/* Rating Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent 
          className="max-w-lg max-h-[80vh] p-0 overflow-hidden"
          onInteractOutside={() => setIsModalOpen(false)}
          onEscapeKeyDown={() => setIsModalOpen(false)}
        >
          <DialogHeader className="p-4 pb-2 border-b border-border/30">
            <DialogTitle className="text-center font-bold" style={{ fontFamily: "'Google Sans', sans-serif" }}>
              {LEAGUE_NAMES[currentTier]?.toUpperCase() || 'LEAGUE'}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 max-h-[60vh]">
            <div className="px-3 pb-4">
              {isLoading && leaderboard.length === 0 ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 py-3 px-3 border-b border-border/40 last:border-b-0">
                    <div className="relative shrink-0">
                      <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-muted animate-pulse" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="h-5 w-24 bg-muted animate-pulse rounded" />
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="w-6 h-6 rounded-full bg-muted animate-pulse" />
                      <div className="h-5 w-12 bg-muted animate-pulse rounded" />
                    </div>
                  </div>
                ))
              ) : leaderboard.length === 0 ? (
                <div className="text-center py-8">
                  <img src={glitchIcon} alt="" className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm text-muted-foreground">ჯერ არავინ</p>
                </div>
              ) : (
                leaderboard.map((entry, index) => {
                  const isCurrentUser = entry.user_id === user?.id;
                  return (
                    <div 
                      key={entry.user_id}
                      className={isCurrentUser ? "relative z-10 my-3 mx-1" : ""}
                    >
                      <LeaguePlayerRow
                        entry={entry}
                        isCurrentUser={isCurrentUser}
                        index={index}
                        previousRank={isCurrentUser ? previousRank : null}
                        shouldAnimate={false}
                        totalPlayers={leaderboard.length}
                        isPromotionZone={currentTier < 5 && entry.rank <= 10}
                        isDemotionZone={currentTier > 1 && entry.rank > leaderboard.length - 10}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </LeaderboardHeroBackground>
  );
}

// Single column for desktop
function DesktopLeagueColumn({
  tier,
  name,
  leaderboard,
  isLoading,
  userTier,
  previousRank,
  isActive,
}: {
  tier: number;
  name: string;
  leaderboard: LeagueEntry[];
  isLoading: boolean;
  userTier: number;
  previousRank: number | null;
  isActive?: boolean;
}) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const isUserTier = tier === userTier;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: tier * 0.1 }}
    >
      <Card className={`backdrop-blur-sm overflow-hidden flex flex-col rounded-3xl transition-all ${
        isActive 
          ? 'bg-white/90 border-primary/60 ring-2 ring-primary/30 scale-[1.02] shadow-xl' 
          : isUserTier 
            ? 'bg-white/80 border-primary/50 ring-2 ring-primary/20' 
            : 'bg-white/80 border-border/30'
      }`}>
        <CardHeader className="py-4 px-4 bg-gradient-to-b from-primary/5 to-transparent text-center">
          <CardTitle className="text-lg text-foreground" style={{ fontFamily: "'Google Sans', sans-serif", fontWeight: 700 }}>{name.toUpperCase()}</CardTitle>
          {isUserTier && (
            <CardDescription className="text-xs text-primary font-medium">{t("extra.yourLeague")}</CardDescription>
          )}
        </CardHeader>

        <CardContent className="px-3 pb-3 pt-0">
          {isLoading && leaderboard.length === 0 ? (
            // Show skeleton rows while loading
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-3 px-3 border-b border-border/40 last:border-b-0">
                <div className="relative shrink-0">
                  <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-muted animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="h-5 w-24 bg-muted animate-pulse rounded" />
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="w-6 h-6 rounded-full bg-muted animate-pulse" />
                  <div className="h-5 w-12 bg-muted animate-pulse rounded" />
                </div>
              </div>
            ))
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-8">
              <img src={glitchIcon} alt="" className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">ჯერ არავინ</p>
            </div>
          ) : (
            leaderboard.slice(0, 10).map((entry, index) => {
              const isCurrentUser = entry.user_id === user?.id;
              return (
                <LeaguePlayerRow
                  key={entry.user_id}
                  entry={entry}
                  isCurrentUser={isCurrentUser}
                  index={index}
                  previousRank={isCurrentUser ? previousRank : null}
                  shouldAnimate={false}
                  totalPlayers={leaderboard.length}
                  isPromotionZone={tier < 5 && entry.rank <= 10}
                  isDemotionZone={tier > 1 && entry.rank > leaderboard.length - 10}
                />
              );
            })
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Mobile/Tablet league card (same style as desktop)
interface MobileLeagueCardProps {
  tier: number;
  name: string;
  isCurrentTier: boolean;
  leaderboard: LeagueEntry[];
  isLoading: boolean;
  user: any;
  userRowRef: React.RefObject<HTMLDivElement>;
  previousRank: number | null;
  userTier: number;
  viewingTier: number | undefined;
  onPrevTier?: () => void;
  onNextTier?: () => void;
}

function MobileLeagueCard({
  tier,
  name,
  isCurrentTier,
  leaderboard,
  isLoading,
  user,
  userRowRef,
  previousRank,
  userTier,
  viewingTier,
  onPrevTier,
  onNextTier,
}: MobileLeagueCardProps) {
  const { t } = useLanguage();
  const isUserTier = tier === userTier;
  
  // Show skeleton if loading and this is the current tier being viewed
  if (isLoading && isCurrentTier) {
    return <LeaderboardCardSkeleton isUserTier={isUserTier} />;
  }
  
  if (!isCurrentTier) {
    return (
      <Card className="backdrop-blur-sm overflow-hidden flex flex-col rounded-3xl bg-card/50 border-border/30 min-h-[500px]">
        <CardContent className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`backdrop-blur-sm overflow-hidden flex flex-col rounded-3xl ${
      isUserTier ? 'bg-white/80 border-primary/50 ring-2 ring-primary/20' : 'bg-white/80 border-border/30'
    }`}>
      <CardHeader className="py-4 px-4 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="flex items-center justify-between">
          {/* Left Arrow */}
          <button
            onClick={onPrevTier}
            className="p-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-all"
            aria-label="Previous tier"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          {/* Title */}
          <div className="text-center flex-1">
            <CardTitle className="text-lg text-foreground" style={{ fontFamily: "'Google Sans', sans-serif", fontWeight: 700 }}>{name.toUpperCase()}</CardTitle>
            {isUserTier && (
              <CardDescription className="text-xs text-primary font-medium">{t("extra.yourLeague")}</CardDescription>
            )}
          </div>
          
          {/* Right Arrow */}
          <button
            onClick={onNextTier}
            className="p-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-all"
            aria-label="Next tier"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </CardHeader>

      <CardContent className="px-3 pb-3 pt-0">
        {leaderboard.length === 0 ? (
          <div className="text-center py-8">
            <img src={glitchIcon} alt="" className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm text-muted-foreground">ჯერ არავინ</p>
          </div>
        ) : (
          leaderboard.slice(0, 10).map((entry, index) => {
            const isCurrentUser = entry.user_id === user?.id;
            return (
              <div key={entry.user_id} ref={isCurrentUser ? userRowRef : undefined}>
                <LeaguePlayerRow
                  entry={entry}
                  isCurrentUser={isCurrentUser}
                  index={index}
                  previousRank={isCurrentUser ? previousRank : null}
                  shouldAnimate={false}
                  totalPlayers={leaderboard.length}
                  isPromotionZone={tier < 5 && entry.rank <= 10}
                  isDemotionZone={tier > 1 && entry.rank > leaderboard.length - 10}
                />
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
