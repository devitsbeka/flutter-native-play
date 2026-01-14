import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
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

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Desktop: Show all 3 leaderboards side by side */}
      <div className="hidden lg:block flex-1 pb-28">
        <DesktopLeaderboards userTier={userTier} region={region} />
      </div>

      {/* Mobile/Tablet: Single leaderboard with trophy tabs */}
      <div className="lg:hidden flex-1 flex flex-col pb-28">
        {/* Hero Background with Map and Trophies */}
        <LeaderboardHeroBackground
          tier={activeTier || 1}
          onTierSelect={handleSelectTier}
          userTier={userTier}
        >
          {/* League Header */}
          <div className="text-center py-2">
            <h1 className="text-xl font-bold text-foreground">
              {language === 'ka' ? currentLeague?.nameKa : currentLeague?.name}
            </h1>
          </div>

          {/* Countdown */}
          <div className="px-4 pb-2">
            <LeagueCountdown />
          </div>
        </LeaderboardHeroBackground>

        {/* Swipeable Leaderboard Content */}
        <div className="flex-1 overflow-hidden">
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
                {LEAGUES.map((league) => (
                  <CarouselItem key={league.tier} className="pl-0">
                    <MobileLeagueContent
                      tier={league.tier}
                      isCurrentTier={league.tier === activeTier}
                      leaderboard={leaderboard}
                      user={user}
                      userRowRef={userRowRef}
                      previousRank={previousRank}
                      userTier={userTier}
                      viewingTier={viewingTier}
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          )}
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
  const [viewingTier, setViewingTier] = useState(userTier || 1);
  
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
    <LeaderboardHeroBackground
      tier={viewingTier}
      onTierSelect={setViewingTier}
      userTier={userTier}
    >
      {/* Countdown - top right */}
      <div className="absolute top-6 right-6 z-30">
        <div className="w-64">
          <LeagueCountdown />
        </div>
      </div>

      {/* Content area - leaderboards pushed down */}
      <div className="pt-[300px]">
        {/* 3 Column Layout with trophies floating above */}
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-3 gap-6">
            {tiers.map(({ tier, data, name, nameKa }) => (
              <div key={tier} className="flex flex-col items-center">
                {/* Trophy floating above - positioned to align with podiums */}
                <img
                  src={TROPHY_IMAGES[tier]}
                  alt={language === 'ka' ? nameKa : name}
                  style={{ width: 160, height: 160 }}
                  className="object-contain drop-shadow-2xl mb-[-60px] z-10 relative"
                />
                <DesktopLeagueColumn
                  tier={tier}
                  name={language === 'ka' ? nameKa : name}
                  leaderboard={data.leaderboard}
                  isLoading={data.isLoading}
                  userTier={userTier}
                  previousRank={data.previousRank}
                />
              </div>
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
      className={`bg-card/50 backdrop-blur-sm rounded-2xl border overflow-hidden flex flex-col ${
        isUserTier ? 'border-primary/50 ring-2 ring-primary/20' : 'border-border/30'
      }`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: tier * 0.1 }}
    >
      {/* Header - left aligned */}
      <div className="flex items-center justify-between py-4 px-4 bg-gradient-to-b from-primary/5 to-transparent">
        <div>
          <h2 className="text-lg font-bold text-foreground">{name}</h2>
          {isUserTier && (
            <span className="text-xs text-primary font-medium">შენი ლიგა</span>
          )}
        </div>
      </div>

      {/* Leaderboard List */}
      <ScrollArea className="flex-1 h-[400px]">
        <div className="px-3 pb-3 space-y-1">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-8">
              <img src={glitchIcon} alt="" className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">ჯერ არავინ</p>
            </div>
          ) : (
            (() => {
              const userInTop10 = leaderboard.slice(0, 10).some(e => e.user_id === user?.id);
              const userEntryOutside = !userInTop10 ? leaderboard.find(e => e.user_id === user?.id) : null;
              // If user is outside top 10, show top 9 + user = 10 total
              const top = userEntryOutside ? leaderboard.slice(0, 9) : leaderboard.slice(0, 10);
              
              return (
                <>
                  {top.map((entry, index) => {
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
                  })}
                  {userEntryOutside && (
                    <>
                      <div className="text-center text-muted-foreground text-xs py-1">• • •</div>
                      <LeaguePlayerRow
                        entry={userEntryOutside}
                        isCurrentUser={true}
                        index={leaderboard.indexOf(userEntryOutside)}
                        previousRank={previousRank}
                        shouldAnimate={false}
                        totalPlayers={leaderboard.length}
                        isPromotionZone={false}
                        isDemotionZone={tier > 1 && userEntryOutside.rank > leaderboard.length - 10}
                      />
                    </>
                  )}
                </>
              );
            })()
          )}
        </div>
      </ScrollArea>
    </motion.div>
  );
}

// Mobile league content
interface MobileLeagueContentProps {
  tier: number;
  isCurrentTier: boolean;
  leaderboard: LeagueEntry[];
  user: any;
  userRowRef: React.RefObject<HTMLDivElement>;
  previousRank: number | null;
  userTier: number;
  viewingTier: number | undefined;
}

function MobileLeagueContent({
  tier,
  isCurrentTier,
  leaderboard,
  user,
  userRowRef,
  previousRank,
  userTier,
  viewingTier,
}: MobileLeagueContentProps) {
  const { t } = useLanguage();
  
  if (!isCurrentTier) {
    return (
      <div className="h-full flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="px-4 space-y-1 pt-2"
    >
      <AnimatePresence mode="popLayout">
        {leaderboard.map((entry, index) => {
          const isCurrentUser = entry.user_id === user?.id;
          const shouldAnimate = isCurrentUser && previousRank !== null;
          const totalPlayers = leaderboard.length;
          const isPromotionZone = (viewingTier ?? userTier) < 5 && entry.rank <= 10;
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

      {leaderboard.length === 0 && (
        <motion.div
          className="text-center py-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-16 h-16 rounded-2xl overflow-hidden mx-auto mb-4">
            <img src={glitchIcon} alt="" className="w-full h-full object-cover" />
          </div>
          <p className="text-muted-foreground">{t('leaderboard.noPlayersYet')}</p>
        </motion.div>
      )}
    </motion.div>
  );
}
