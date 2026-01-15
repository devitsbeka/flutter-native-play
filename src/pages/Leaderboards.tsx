import { useState, useRef, useEffect, useCallback, memo, useMemo, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLeagueLeaderboard, LEAGUES, LeagueEntry } from "@/hooks/useLeagueLeaderboard";
import { useLanguage } from "@/contexts/LanguageContext";
import glitchIcon from "@/assets/glitch.png";
import trophyBronze from "@/assets/trophy-bronze.png";
import trophySilver from "@/assets/trophy-silver.png";
import trophyGold from "@/assets/trophy-gold.png";

import { LeaguePlayerRow } from "@/components/leaderboard/LeaguePlayerRow";
import { LeagueCountdown } from "@/components/leaderboard/LeagueCountdown";
import { LeaderboardHeroBackground } from "@/components/leaderboard/LeaderboardHeroBackground";
import { UniversalBottomNav } from "@/components/layout/UniversalBottomNav";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { LeaderboardCardSkeleton, MobileLeaderboardSkeleton, DesktopLeaderboardsSkeleton } from "@/components/leaderboard/LeaderboardSkeleton";

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

export default function Leaderboards() {
  const { user } = useAuth();
  const { region, language } = useLanguage();
  const [viewingTier, setViewingTier] = useState<number | undefined>(undefined);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  
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

  // Use IntersectionObserver to detect when user's row is visible
  useEffect(() => {
    if (!userEntry) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowFixedBar(!entry.isIntersecting);
      },
      { root: null, rootMargin: "0px 0px -200px 0px", threshold: 0 }
    );

    const currentRef = userRowRef.current;
    if (currentRef) observer.observe(currentRef);
    return () => {
      if (currentRef) observer.unobserve(currentRef);
    };
  }, [userEntry]);

  const activeTier = viewingTier ?? userTier;

  const handleSelectTier = useCallback((tier: number) => {
    if (tier >= 1 && tier <= LEAGUES.length) {
      setViewingTier(tier);
      if (carouselApi) {
        carouselApi.scrollTo(tier - 1);
      }
    }
  }, [carouselApi]);

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

  return (
    <div className="min-h-screen w-full max-w-[100vw] flex flex-col overflow-x-hidden" style={{ backgroundColor: '#4E4FA6' }}>
      {/* Desktop: Show all 3 leaderboards side by side */}
      <div className="hidden lg:block flex-1 pb-28">
        <DesktopLeaderboards userTier={userTier} region={region} />
      </div>

      {/* Mobile/Tablet: Single leaderboard with swipeable cards */}
      <div className="lg:hidden h-screen overflow-y-auto">
        {/* Background Hero - fixed height, shows trophy with countdown on top */}
        <LeaderboardHeroBackground 
          isMobile 
          currentTier={activeTier} 
          onTierChange={handleSelectTier}
        >
          {/* Sticky Countdown - positioned on top of the background */}
          <div className="sticky top-0 z-50 py-4 flex justify-center">
            <LeagueCountdown />
          </div>
        </LeaderboardHeroBackground>

        {/* Sticky League Header + Scrollable List Container */}
        <div className="-mt-[42px] relative z-30">
          {/* Sticky League Name Header */}
          <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md rounded-t-3xl shadow-lg">
            <div className="flex items-center justify-between py-4 px-4">
              {/* Left Arrow */}
              <button
                onClick={() => {
                  const getPrevTier = (t: number) => {
                    if (t === 1) return 3;
                    if (t === 3) return 2;
                    return 1;
                  };
                  handleSelectTier(getPrevTier(activeTier || 1));
                }}
                className="p-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-all"
                aria-label="Previous tier"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              {/* Title */}
              <div className="text-center flex-1">
                <h2 className="text-lg text-foreground font-bold" style={{ fontFamily: "'Google Sans', sans-serif" }}>
                  {LEAGUES.find(l => l.tier === activeTier)?.[language === 'ka' ? 'nameKa' : 'name']?.toUpperCase() || 'LEAGUE'}
                </h2>
                {activeTier === userTier && (
                  <p className="text-xs text-primary font-medium">შენი ლიგა</p>
                )}
              </div>
              
              {/* Right Arrow */}
              <button
                onClick={() => {
                  const getNextTier = (t: number) => {
                    if (t === 2) return 3;
                    if (t === 3) return 1;
                    return 2;
                  };
                  handleSelectTier(getNextTier(activeTier || 1));
                }}
                className="p-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-all"
                aria-label="Next tier"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Scrollable Player List */}
          <div className="bg-white/90 backdrop-blur-sm px-3 pb-32">
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
                  <div key={entry.user_id} ref={isCurrentUser ? userRowRef : undefined}>
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
        </div>
      </div>

      {/* Fixed User Position Bar (Mobile only) */}
      <AnimatePresence>
        {userEntry && !isLeagueLocked && showFixedBar && (
          <motion.div
            className="fixed bottom-28 left-0 right-0 z-40 px-4 lg:hidden"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-background/95 backdrop-blur-lg rounded-2xl shadow-xl border border-border/50">
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <UniversalBottomNav />
    </div>
  );
}

// Desktop: All 3 leaderboards side by side with hero background
function DesktopLeaderboards({ userTier, region }: { userTier: number; region?: string }) {
  const { language } = useLanguage();
  
  // Fetch all 3 tiers
  const tier1 = useLeagueLeaderboard(1, region);
  const tier2 = useLeagueLeaderboard(2, region);
  const tier3 = useLeagueLeaderboard(3, region);
  
  const tiers = [
    { tier: 2, data: tier2, name: "Silver League", nameKa: "ვერცხლის ლიგა" },
    { tier: 3, data: tier3, name: "Gold League", nameKa: "ოქროს ლიგა" },
    { tier: 1, data: tier1, name: "Bronze League", nameKa: "ბრინჯაოს ლიგა" },
  ];

  return (
    <LeaderboardHeroBackground>
      {/* Countdown - centered at top */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30">
        <LeagueCountdown />
      </div>

      {/* Content area - leaderboards pushed down */}
      <div className="pt-[520px]">
        {/* 3 Column Layout with trophies floating above */}
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-3 gap-6">
            {tiers.map(({ tier, data, name, nameKa }) => (
              <DesktopLeagueColumn
                key={tier}
                tier={tier}
                name={language === 'ka' ? nameKa : name}
                leaderboard={data.leaderboard}
                isLoading={data.isLoading}
                userTier={userTier}
                previousRank={data.previousRank}
              />
            ))}
          </div>
        </div>
      </div>
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
}: {
  tier: number;
  name: string;
  leaderboard: LeagueEntry[];
  isLoading: boolean;
  userTier: number;
  previousRank: number | null;
}) {
  const { user } = useAuth();
  const isUserTier = tier === userTier;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: tier * 0.1 }}
    >
      <Card className={`backdrop-blur-sm overflow-hidden flex flex-col rounded-3xl ${
        isUserTier ? 'bg-white/80 border-primary/50 ring-2 ring-primary/20' : 'bg-white/80 border-border/30'
      }`}>
        <CardHeader className="py-4 px-4 bg-gradient-to-b from-primary/5 to-transparent text-center">
          <CardTitle className="text-lg text-foreground" style={{ fontFamily: "'Google Sans', sans-serif", fontWeight: 700 }}>{name.toUpperCase()}</CardTitle>
          {isUserTier && (
            <CardDescription className="text-xs text-primary font-medium">შენი ლიგა</CardDescription>
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
              <CardDescription className="text-xs text-primary font-medium">შენი ლიგა</CardDescription>
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
