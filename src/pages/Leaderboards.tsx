import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLeagueLeaderboard, LEAGUES } from "@/hooks/useLeagueLeaderboard";
import { LeagueBadgeRow } from "@/components/leaderboard/LeagueBadgeRow";
import { LeagueInfoCard } from "@/components/leaderboard/LeagueInfoCard";
import { LeaguePlayerRow } from "@/components/leaderboard/LeaguePlayerRow";
import { LeagueLockedOverlay } from "@/components/leaderboard/LeagueLockedOverlay";
import { UniversalBottomNav } from "@/components/layout/UniversalBottomNav";

export default function Leaderboards() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [viewingTier, setViewingTier] = useState<number | undefined>(undefined);
  
  const {
    leaderboard,
    isLoading,
    userTier,
    currentLeague,
    userEntry,
    previousRank,
    rankChange,
    daysLeft,
    isLeagueLocked,
  } = useLeagueLeaderboard(viewingTier);

  const [showFixedBar, setShowFixedBar] = useState(true);
  const userRowRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Track scroll to hide fixed bar when user's actual row is visible
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !userEntry) return;

    const handleScroll = () => {
      if (!userRowRef.current) return;
      
      const containerRect = container.getBoundingClientRect();
      const rowRect = userRowRef.current.getBoundingClientRect();
      
      // Fixed bar height + some padding (roughly 100px from bottom nav)
      const fixedBarHeight = 100;
      
      // Check if user's actual row is visible above the fixed bar
      const isRowVisible = rowRect.top < containerRect.bottom - fixedBarHeight && rowRect.bottom > containerRect.top;
      
      setShowFixedBar(!isRowVisible);
    };

    container.addEventListener("scroll", handleScroll);
    handleScroll(); // Initial check
    
    return () => container.removeEventListener("scroll", handleScroll);
  }, [userEntry]);

  const handleSelectTier = (tier: number) => {
    setViewingTier(tier);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      {/* Header */}
      <motion.header
        className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border/50"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">ლიდერბორდი</h1>
          <div className="w-10" />
        </div>
      </motion.header>

      {/* Main Content */}
      <div ref={scrollContainerRef} className="flex-1 overflow-auto pb-40 relative">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="relative"
          >
            {/* League Badges Row */}
            <LeagueBadgeRow 
              currentTier={viewingTier ?? userTier} 
              userTier={userTier}
              onSelectTier={handleSelectTier}
            />

            {/* League Info Card */}
            <LeagueInfoCard
              league={currentLeague}
              daysLeft={daysLeft}
              rankChange={rankChange}
              isLocked={isLeagueLocked}
            />

            {/* Leaderboard List */}
            <div className="mt-6 px-4 space-y-1 relative">
              {/* Divider */}
              <div className="border-t border-border/50 mb-4" />
              
              <AnimatePresence mode="popLayout">
                {leaderboard.map((entry, index) => {
                  const isCurrentUser = entry.user_id === user?.id;
                  const shouldAnimate = isCurrentUser && previousRank !== null && !isLeagueLocked;
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
                    ჯერ არავინ არ არის ამ ლიგაში
                  </p>
                </motion.div>
              )}

              {/* Locked Overlay for higher tiers */}
              {isLeagueLocked && (
                <LeagueLockedOverlay 
                  league={currentLeague} 
                  userTier={userTier} 
                />
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Fixed User Position Bar */}
      <AnimatePresence>
        {userEntry && !isLeagueLocked && showFixedBar && (
          <motion.div
            className="fixed bottom-20 left-0 right-0 z-40 px-4 pb-2"
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
