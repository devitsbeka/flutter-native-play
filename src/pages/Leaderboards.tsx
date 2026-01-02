import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Users, Diamond, Loader2, Play, TrendingUp } from "lucide-react";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/shared/Avatar";
import { useAuth } from "@/hooks/useAuth";
import { UniversalBottomNav } from "@/components/layout/UniversalBottomNav";
import { PageHeader } from "@/components/shared/PageHeader";
import { TabBar } from "@/components/shared/TabBar";

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

type TimeFilter = "weekly" | "all";

const tabs: { id: TimeFilter; label: string }[] = [
  { id: "weekly", label: "ყოველკვირეული" },
  { id: "all", label: "სულ" },
];

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
        "flex items-center gap-3 p-4 rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-200",
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
          isCurrentUser ? "text-primary" : "text-slate-800"
        )}>
          {entry.nickname}
          {isCurrentUser && " (შენ)"}
        </p>
        <p className="text-xs text-slate-600 mt-0.5">
          {entry.games_played || 0} თამაში • {entry.games_won || 0} მოგება
        </p>
      </div>

      {/* Points */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Diamond className="w-4 h-4 text-primary fill-primary/30" />
        <span className="text-sm font-bold text-slate-800">{entry.total_points.toLocaleString()}</span>
      </div>
    </motion.div>
  );
}

export default function Leaderboards() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("weekly");
  const [userRank, setUserRank] = useState<number | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, nickname, country_code, total_points, games_won, games_played, avatar_url")
        .order("total_points", { ascending: false })
        .limit(100);

      if (!error && data) {
        setEntries(data);
        
        if (user) {
          const userIndex = data.findIndex((entry) => entry.user_id === user.id);
          if (userIndex !== -1) {
            setUserRank(userIndex + 1);
          }
        }
      }
      
      setLoading(false);
    };

    fetchLeaderboard();
  }, [timeFilter, user]);

  const getTimeUntilReset = () => {
    const now = new Date();
    const nextSunday = new Date(now);
    nextSunday.setDate(now.getDate() + (7 - now.getDay()));
    nextSunday.setHours(0, 0, 0, 0);
    const diff = nextSunday.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days}დ ${hours}ს`;
  };

  const topThree = entries.slice(0, 3);
  const remainingEntries = entries.slice(3);

  return (
    <div className="min-h-screen relative overflow-hidden pb-32">
      {/* Content */}
      <div className="relative z-10 flex flex-col h-screen">
        {/* Sticky Header Container */}
        <div className="sticky top-0 z-20 shrink-0 relative backdrop-blur-xl">
          {/* Header - Title */}
          <PageHeader title="რეიტინგი" showBack={false} />

          {/* Tabs */}
          <div className="px-4 pb-4">
            <TabBar
              tabs={tabs}
              activeTab={timeFilter}
              onTabChange={(id) => setTimeFilter(id as TimeFilter)}
            />
          </div>
        </div>

        {/* Scrollable Content */}
        <div 
          className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-32 scroll-smooth"
          style={{ scrollBehavior: "smooth" }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🏆</div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">ჯერ მოთამაშეები არ არიან!</h3>
              <p className="text-slate-600">
                ითამაშე რომ გამოჩნდე რეიტინგში
              </p>
            </div>
          ) : (
            <>
              {/* Status Banner - Glass Card Style */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl px-4 py-3 flex items-center justify-between mb-4 bg-white/80 backdrop-blur-xl border border-slate-200"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-500" />
                  <span className="font-bold text-slate-800 text-sm">{entries.length} მოთამაშე</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">{getTimeUntilReset()}</span>
                </div>
              </motion.div>

              {/* Top 3 Podium - Glass Container */}
              {topThree.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-3xl p-6 mb-4 bg-white/80 backdrop-blur-xl border border-slate-200"
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
                          <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center">
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
                      <span className="text-sm font-display font-bold text-slate-800 mb-0.5 truncate max-w-[80px] text-center uppercase tracking-wide">
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
                          <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center">
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
                      <span className="text-base font-display font-bold text-slate-800 mb-0.5 truncate max-w-[90px] text-center uppercase tracking-wide">
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
                          <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center">
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
                      <span className="text-xs font-display font-bold text-slate-800 mb-0.5 truncate max-w-[70px] text-center uppercase tracking-wide">
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
                  onClick={() => navigate("/")}
                >
                  ითამაშე
                </ChunkyButton>
              </motion.div>

              {/* Divider with label */}
              <div className="flex items-center gap-3 py-3">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
                <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                  ◆ ტოპ რეიტინგი ◆
                </span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
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
            </>
          )}
        </div>
      </div>

      {/* Universal Bottom Navigation */}
      <UniversalBottomNav />
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
