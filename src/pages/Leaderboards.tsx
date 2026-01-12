import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLeagueLeaderboard, LEAGUES } from "@/hooks/useLeagueLeaderboard";
import { useLanguage } from "@/contexts/LanguageContext";

import { LeagueInfoCard } from "@/components/leaderboard/LeagueInfoCard";
import { LeaguePlayerRow } from "@/components/leaderboard/LeaguePlayerRow";
import { LeagueLockedOverlay } from "@/components/leaderboard/LeagueLockedOverlay";
import { LeaderboardHeroBackground } from "@/components/leaderboard/LeaderboardHeroBackground";
import { LeagueHeroHeader } from "@/components/leaderboard/LeagueHeroHeader";
import { UniversalBottomNav } from "@/components/layout/UniversalBottomNav";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";

export default function Leaderboards() {
  const { user } = useAuth();
  const { region } = useLanguage();
  const [viewingTier, setViewingTier] = useState<number | undefined>(undefined);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  
  const {
    leaderboard,
    isLoading,
    userTier,
    currentLeague,
    userEntry,
    previousRank,
    rankChange,
    isLeagueLocked,
  } = useLeagueLeaderboard(viewingTier, region);

  const [showFixedBar, setShowFixedBar] = useState(true);
  const userRowRef = useRef<HTMLDivElement>(null);

  // Sync carousel with viewingTier
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
      {
        root: null,
        rootMargin: "0px 0px -200px 0px",
        threshold: 0,
      }
    );

    const currentRef = userRowRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
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

  const handlePrevTier = useCallback(() => {
    if (activeTier > 1) {
      handleSelectTier(activeTier - 1);
    }
  }, [activeTier, handleSelectTier]);

  const handleNextTier = useCallback(() => {
    if (activeTier < LEAGUES.length) {
      handleSelectTier(activeTier + 1);
    }
  }, [activeTier, handleSelectTier]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      
      {/* Hero Section with Animated Background */}
      <LeaderboardHeroBackground 
        tier={activeTier} 
        onTierSelect={handleSelectTier}
        userTier={userTier}
      >
        {/* Simplified Header */}
        <LeagueHeroHeader league={currentLeague} />
      </LeaderboardHeroBackground>

      {/* League Info Card - positioned at top of leaderboard section */}
      <div className="px-4 -mt-20 relative z-20 pb-4">
        <LeagueInfoCard
          league={currentLeague}
          rankChange={rankChange}
          isLocked={isLeagueLocked}
        />
      </div>

      {/* Main Content - Swipeable Leagues */}
      <div className="flex-1 overflow-hidden pb-28 relative">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <Carousel
            setApi={setCarouselApi}
            opts={{
              align: "start",
              loop: false,
              startIndex: (activeTier || 1) - 1,
              duration: 30,
              skipSnaps: false,
            }}
            className="w-full h-full"
          >
            <CarouselContent className="-ml-0">
              {LEAGUES.map((league) => {
                const isLocked = league.tier > userTier;
                
                return (
                  <CarouselItem key={league.tier} className="pl-0">
                    <LeagueContent
                      tier={league.tier}
                      isLocked={isLocked}
                      league={league}
                      userTier={userTier}
                      leaderboard={leaderboard}
                      user={user}
                      userRowRef={userRowRef}
                      previousRank={previousRank}
                      viewingTier={viewingTier}
                      isCurrentTier={league.tier === activeTier}
                    />
                  </CarouselItem>
                );
              })}
            </CarouselContent>
          </Carousel>
        )}
      </div>

      {/* Fixed User Position Bar */}
      <AnimatePresence>
        {userEntry && !isLeagueLocked && showFixedBar && (
          <motion.div
            className="fixed bottom-28 left-0 right-0 z-40 px-4"
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

      {/* Bottom Navigation */}
      <UniversalBottomNav />
    </div>
  );
}

// Separate component for league content to avoid re-renders
interface LeagueContentProps {
  tier: number;
  isLocked: boolean;
  league: { tier: number; name: string; nameKa: string };
  userTier: number;
  leaderboard: any[];
  user: any;
  userRowRef: React.RefObject<HTMLDivElement>;
  previousRank: number | null;
  viewingTier: number | undefined;
  isCurrentTier: boolean;
}

function LeagueContent({
  tier,
  isLocked,
  league,
  userTier,
  leaderboard,
  user,
  userRowRef,
  previousRank,
  viewingTier,
  isCurrentTier,
}: LeagueContentProps) {
  const { t } = useLanguage();
  
  // Only show actual data for current tier
  if (!isCurrentTier) {
    return (
      <div className="h-full flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="mt-6 px-4">
        <LeagueLockedOverlay 
          league={league} 
          userTier={userTier} 
        />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="px-4 space-y-1 pt-4"
    >
      {/* Divider */}
      <div className="border-t border-border/50 mb-4" />
      
      <AnimatePresence mode="popLayout">
        {leaderboard.map((entry, index) => {
          const isCurrentUser = entry.user_id === user?.id;
          const shouldAnimate = isCurrentUser && previousRank !== null;
          const totalPlayers = leaderboard.length;
          
          // Promotion zone: top 10 (except tier 5)
          const isPromotionZone = (viewingTier ?? userTier) < 5 && entry.rank <= 10;
          // Demotion zone: bottom 10 (except tier 1)
          const isDemotionZone = (viewingTier ?? userTier) > 1 && entry.rank > totalPlayers - 10;

          return (
            <div key={entry.user_id} ref={isCurrentUser ? userRowRef : undefined}>
              <LeaguePlayerRow
                entry={entry}
                isCurrentUser={isCurrentUser}
                index={index}
                previousRank={previousRank}
                shouldAnimate={shouldAnimate}
                totalPlayers={totalPlayers}
                isPromotionZone={isPromotionZone}
                isDemotionZone={isDemotionZone}
              />
            </div>
          );
        })}
      </AnimatePresence>

      {/* Empty state */}
      {leaderboard.length === 0 && (
        <motion.div
          className="text-center py-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-muted-foreground">
            {t('leaderboard.noPlayersYet')}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
