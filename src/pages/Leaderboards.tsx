import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, Diamond, Loader2, Play } from "lucide-react";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/shared/Avatar";
import { useAuth } from "@/hooks/useAuth";
import { UniversalBottomNav } from "@/components/layout/UniversalBottomNav";
import { PlayCategoryModal } from "@/components/leaderboard/PlayCategoryModal";
import { Skeleton } from "@/components/ui/skeleton";

interface LeaderboardEntry {
  id: string;
  nickname: string;
  country_code: string;
  total_points: number;
  games_won: number;
  games_played: number;
  user_id: string;
  avatar_url: string | null;
}

// Georgian month names
const georgianMonths = [
  "იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი",
  "ივლისი", "აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი"
];

// Get week number and year info
function getWeekInfo(weekOffset: number = 0) {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const daysSinceStart = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
  const currentWeekOfYear = Math.ceil((daysSinceStart + startOfYear.getDay() + 1) / 7);
  
  const targetWeek = currentWeekOfYear + weekOffset;
  
  // Calculate the date for the target week
  const targetDate = new Date(now);
  targetDate.setDate(targetDate.getDate() + (weekOffset * 7));
  
  return {
    weekNumber: targetWeek,
    month: georgianMonths[targetDate.getMonth()],
    year: targetDate.getFullYear(),
    isCurrent: weekOffset === 0,
    isFuture: weekOffset > 0,
    isPast: weekOffset < 0
  };
}

// Medal emoji component for ranks
function RankMedal({ rank, size = "md" }: { rank: 1 | 2 | 3; size?: "sm" | "md" | "lg" }) {
  const medals = {
    1: "🥇",
    2: "🥈", 
    3: "🥉",
  };

  const sizes = {
    sm: "text-2xl",
    md: "text-3xl",
    lg: "text-4xl",
  };

  return (
    <span className={cn("", sizes[size])}>
      {medals[rank]}
    </span>
  );
}

// Player Card Component - matches Discover page card style
function PlayerCard({ 
  entry, 
  position, 
  isCurrentUser 
}: { 
  entry: LeaderboardEntry; 
  position: number;
  isCurrentUser: boolean;
}) {
  const isTopThree = position <= 3;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: position * 0.02 }}
      className={cn(
        "flex items-center gap-3 p-4 rounded-2xl bg-card/80 backdrop-blur-xl border border-border",
        isCurrentUser && "ring-2 ring-primary bg-primary/10 border-primary/50"
      )}
    >
      {/* Rank Badge */}
      <div className="w-10 flex justify-center shrink-0">
        {isTopThree ? (
          <RankMedal rank={position as 1 | 2 | 3} size="sm" />
        ) : (
          <span className="text-sm font-bold text-muted-foreground">
            #{position}
          </span>
        )}
      </div>

      {/* Avatar */}
      <div className="relative shrink-0">
        <Avatar
          imageUrl={entry.avatar_url || undefined}
          emoji={entry.nickname?.charAt(0) || "👤"}
          countryCode={entry.country_code}
          size="sm"
        />
      </div>

      {/* Name & Stats */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "font-display font-bold text-sm truncate uppercase tracking-wide",
          isCurrentUser ? "text-primary" : "text-foreground"
        )}>
          {entry.nickname}
          {isCurrentUser && " (შენ)"}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {entry.games_played || 0} თამაში • {entry.games_won || 0} მოგება
        </p>
      </div>

      {/* Points */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Diamond className="w-4 h-4 text-primary fill-primary/30" />
        <span className="text-sm font-bold text-foreground">{entry.total_points.toLocaleString()}</span>
      </div>
    </motion.div>
  );
}

export default function Leaderboards() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("right");
  const navigate = useNavigate();
  const { user } = useAuth();

  const weekInfo = getWeekInfo(weekOffset);

  const handlePlayWithCategory = (categoryId: string | null) => {
    if (categoryId) {
      navigate(`/game?category=${categoryId}`);
    } else {
      navigate("/game");
    }
  };

  const goToPreviousWeek = () => {
    if (weekInfo.weekNumber > 1) {
      setSlideDirection("left");
      setWeekOffset(prev => prev - 1);
    }
  };

  const goToNextWeek = () => {
    setSlideDirection("right");
    setWeekOffset(prev => prev + 1);
  };

  // Swipe gesture handling
  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.x > threshold && weekInfo.weekNumber > 1) {
      goToPreviousWeek();
    } else if (info.offset.x < -threshold) {
      goToNextWeek();
    }
  };

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      
      // For current week, fetch from profiles
      if (weekOffset === 0) {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, user_id, nickname, country_code, total_points, games_won, games_played, avatar_url")
          .order("total_points", { ascending: false })
          .limit(100);

        if (!error && data) {
          setEntries(data);
        }
      } else if (weekOffset < 0) {
        // For past weeks, fetch from weekly_leaderboard_snapshots
        const { data, error } = await supabase
          .from("weekly_leaderboard_snapshots")
          .select("*")
          .eq("week_number", weekInfo.weekNumber)
          .eq("year", weekInfo.year)
          .order("rank", { ascending: true })
          .limit(100);

        if (!error && data && data.length > 0) {
          // Map snapshot data to LeaderboardEntry format
          setEntries(data.map(snapshot => ({
            id: snapshot.id,
            user_id: snapshot.user_id,
            nickname: snapshot.nickname,
            country_code: snapshot.country_code || "",
            total_points: snapshot.total_points,
            games_won: snapshot.games_won,
            games_played: snapshot.games_played,
            avatar_url: snapshot.avatar_url
          })));
        } else {
          // No historical data for this week
          setEntries([]);
        }
      } else {
        // Future weeks - no data
        setEntries([]);
      }
      
      setLoading(false);
    };

    fetchLeaderboard();
  }, [weekOffset, weekInfo.weekNumber, weekInfo.year]);

  const topThree = entries.slice(0, 3);

  return (
    <div className="min-h-screen relative overflow-hidden pb-32">
      {/* Content */}
      <div className="relative z-10 flex flex-col h-screen">
        {/* Week Selector Header */}
        <div className="sticky top-0 z-20 shrink-0 backdrop-blur-xl bg-background/80 pt-4 pb-6 px-4">
          <div className="flex items-center justify-between">
            {/* Left Arrow */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={goToPreviousWeek}
              disabled={weekInfo.weekNumber <= 1}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                weekInfo.weekNumber <= 1 
                  ? "text-muted-foreground/30 cursor-not-allowed" 
                  : "text-foreground hover:bg-muted"
              )}
            >
              <ChevronLeft className="w-6 h-6" />
            </motion.button>

            {/* Week Info - Center */}
            <AnimatePresence mode="wait">
              <motion.div
                key={weekOffset}
                initial={{ opacity: 0, x: slideDirection === "right" ? 30 : -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: slideDirection === "right" ? -30 : 30 }}
                transition={{ duration: 0.2 }}
                className="text-center"
              >
                <h1 className="text-2xl font-display font-bold text-foreground tracking-wide">
                  კვირა {weekInfo.weekNumber}
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {weekInfo.month}, {weekInfo.year}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Right Arrow */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={goToNextWeek}
              className="w-10 h-10 rounded-full flex items-center justify-center text-foreground hover:bg-muted transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </motion.button>
          </div>
        </div>

        {/* Scrollable Content with Swipe Support */}
        <motion.div 
          className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-32 scroll-smooth touch-pan-y"
          style={{ scrollBehavior: "smooth" }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
        >
          <AnimatePresence mode="wait">
            {/* Future Week - Skeleton State */}
            {weekInfo.isFuture ? (
              <motion.div
                key="future"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* Future Week Indicator */}
                <div className="rounded-2xl px-4 py-3 mb-4 bg-muted/50 border border-border text-center">
                  <p className="text-sm text-muted-foreground">მალე განახლდება</p>
                </div>

                {/* Skeleton Podium */}
                <div className="rounded-3xl p-6 mb-4 bg-card/80 backdrop-blur-xl border border-border">
                  <div className="flex items-start justify-center gap-4">
                    {/* 2nd Place Skeleton */}
                    <div className="flex flex-col items-center pt-8">
                      <Skeleton className="w-8 h-8 rounded-full mb-1" />
                      <Skeleton className="w-16 h-16 rounded-full mb-2" />
                      <Skeleton className="w-16 h-4 mb-1" />
                      <Skeleton className="w-12 h-3" />
                    </div>
                    {/* 1st Place Skeleton */}
                    <div className="flex flex-col items-center">
                      <Skeleton className="w-10 h-10 rounded-full mb-1" />
                      <Skeleton className="w-20 h-20 rounded-full mb-2" />
                      <Skeleton className="w-20 h-4 mb-1" />
                      <Skeleton className="w-14 h-3" />
                    </div>
                    {/* 3rd Place Skeleton */}
                    <div className="flex flex-col items-center pt-12">
                      <Skeleton className="w-6 h-6 rounded-full mb-1" />
                      <Skeleton className="w-14 h-14 rounded-full mb-2" />
                      <Skeleton className="w-14 h-4 mb-1" />
                      <Skeleton className="w-10 h-3" />
                    </div>
                  </div>
                </div>

                {/* Skeleton Player List */}
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-4 rounded-2xl bg-card/80 border border-border">
                      <Skeleton className="w-10 h-6" />
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="w-24 h-4 mb-1" />
                        <Skeleton className="w-32 h-3" />
                      </div>
                      <Skeleton className="w-16 h-4" />
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center py-12"
              >
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </motion.div>
            ) : entries.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-12"
              >
                <div className="text-6xl mb-4">🏆</div>
                <h3 className="text-lg font-bold text-foreground mb-2">ჯერ მოთამაშეები არ არიან!</h3>
                <p className="text-muted-foreground">
                  ითამაშე რომ გამოჩნდე რეიტინგში
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >

              {/* Top 3 Podium - Glass Container */}
              {topThree.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-3xl p-6 mb-4 bg-card/80 backdrop-blur-xl border border-border"
                >
                  <div className="flex items-start justify-center gap-4">
                    {/* 2nd Place */}
                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="flex flex-col items-center pt-8"
                    >
                      <div className="mb-1">
                        <RankMedal rank={2} size="md" />
                      </div>
                      <div className="relative mb-2">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 p-0.5 shadow-lg">
                          <div className="w-full h-full rounded-full overflow-hidden bg-card flex items-center justify-center">
                            {topThree[1] ? (
                              <Avatar
                                imageUrl={topThree[1].avatar_url || undefined}
                                emoji={topThree[1].nickname?.charAt(0) || "👤"}
                                size="md"
                              />
                            ) : (
                              <span className="text-2xl text-muted-foreground">👤</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="text-sm font-display font-bold text-foreground mb-0.5 truncate max-w-[80px] text-center uppercase tracking-wide">
                        {topThree[1]?.nickname || "---"}
                      </span>
                      <div className="flex items-center gap-1 text-primary">
                        <Diamond className="w-3 h-3 fill-primary/30" />
                        <span className="text-sm font-bold">{(topThree[1]?.total_points || 0).toLocaleString()}</span>
                      </div>
                    </motion.div>

                    {/* 1st Place */}
                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="flex flex-col items-center"
                    >
                      <div className="mb-1">
                        <RankMedal rank={1} size="lg" />
                      </div>
                      <div className="relative mb-2">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 shadow-xl shadow-amber-400/30">
                          <div className="w-full h-full rounded-full overflow-hidden bg-card flex items-center justify-center">
                            {topThree[0] ? (
                              <Avatar
                                imageUrl={topThree[0].avatar_url || undefined}
                                emoji={topThree[0].nickname?.charAt(0) || "👤"}
                                size="lg"
                              />
                            ) : (
                              <span className="text-3xl">👤</span>
                            )}
                          </div>
                        </div>
                        {topThree[0]?.country_code && (
                          <div className="absolute -bottom-1 -right-1 text-lg">
                            {getCountryFlag(topThree[0].country_code)}
                          </div>
                        )}
                      </div>
                      <span className="text-base font-display font-bold text-foreground mb-0.5 truncate max-w-[90px] text-center uppercase tracking-wide">
                        {topThree[0]?.nickname || "---"}
                      </span>
                      <div className="flex items-center gap-1 text-primary">
                        <Diamond className="w-3.5 h-3.5 fill-primary/30" />
                        <span className="text-base font-bold">{(topThree[0]?.total_points || 0).toLocaleString()}</span>
                      </div>
                    </motion.div>

                    {/* 3rd Place */}
                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="flex flex-col items-center pt-12"
                    >
                      <div className="mb-1">
                        <RankMedal rank={3} size="sm" />
                      </div>
                      <div className="relative mb-2">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 p-0.5 shadow-lg">
                          <div className="w-full h-full rounded-full overflow-hidden bg-card flex items-center justify-center">
                            {topThree[2] ? (
                              <Avatar
                                imageUrl={topThree[2].avatar_url || undefined}
                                emoji={topThree[2].nickname?.charAt(0) || "👤"}
                                size="sm"
                              />
                            ) : (
                              <span className="text-xl text-muted-foreground">👤</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-display font-bold text-foreground mb-0.5 truncate max-w-[70px] text-center uppercase tracking-wide">
                        {topThree[2]?.nickname || "---"}
                      </span>
                      <div className="flex items-center gap-1 text-primary">
                        <Diamond className="w-3 h-3 fill-primary/30" />
                        <span className="text-xs font-bold">{(topThree[2]?.total_points || 0).toLocaleString()}</span>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              )}

              {/* Play More CTA Button */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mb-4"
              >
                <ChunkyButton
                  variant="mint"
                  size="lg"
                  className="w-full"
                  icon={<Play className="w-5 h-5 fill-current" />}
                  onClick={() => setShowCategoryModal(true)}
                >
                  ითამაშე
                </ChunkyButton>
              </motion.div>

              {/* Divider with label */}
              <div className="flex items-center gap-3 py-3">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  ◆ ტოპ რეიტინგი ◆
                </span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
              </div>

                {/* Player List */}
                <div className="space-y-[15px]">
                  {entries.map((entry, index) => {
                    const position = index + 1;
                    const isCurrentUser = user && entry.user_id === user.id;

                    return (
                      <PlayerCard
                        key={entry.id}
                        entry={entry}
                        position={position}
                        isCurrentUser={!!isCurrentUser}
                      />
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Universal Bottom Navigation */}
      <UniversalBottomNav />

      {/* Category Selection Modal */}
      <PlayCategoryModal
        open={showCategoryModal}
        onOpenChange={setShowCategoryModal}
        onSelectCategory={handlePlayWithCategory}
      />
    </div>
  );
}

function getCountryFlag(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
