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

  // Use IntersectionObserver to detect when user's row is visible
  useEffect(() => {
    if (!userEntry) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Hide fixed bar when the actual row is visible (or has been scrolled past)
        // rootMargin accounts for bottom nav + fixed bar area
        setShowFixedBar(!entry.isIntersecting);
      },
      {
        root: null, // viewport
        rootMargin: "0px 0px -200px 0px", // 200px from bottom to account for nav
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
      <div className="flex-1 overflow-auto pb-40 relative">
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

            {/* Locked Overlay for higher tiers - render instead of list */}
            {isLeagueLocked ? (
              <div className="mt-6 px-4">
                <LeagueLockedOverlay 
                  league={currentLeague} 
                  userTier={userTier} 
                />
              </div>
            ) : (
              /* Leaderboard List */
              <div className="mt-6 px-4 space-y-1 relative">
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
                      ჯერ არავინ არ არის ამ ლიგაში
                    </p>
                  </motion.div>
                )}
              </div>
            )}
          </motion.div>
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
