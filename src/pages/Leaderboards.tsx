import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Clock, Users, Trophy, Medal } from "lucide-react";
import { getRankFromPoints } from "@/data/opponents";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/shared/Avatar";
import { useAuth } from "@/hooks/useAuth";

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

export default function Leaderboards() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<"weekly" | "all">("weekly");
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

  const getPercentile = () => {
    if (!userRank || entries.length === 0) return null;
    const percentile = Math.round(((entries.length - userRank) / entries.length) * 100);
    return Math.max(1, percentile);
  };

  const topThree = entries.slice(0, 3);
  const remainingEntries = entries.slice(3);
  const percentile = getPercentile();

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Sky Background */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          background: "linear-gradient(180deg, hsl(195 85% 75%) 0%, hsl(195 80% 85%) 50%, hsl(45 40% 90%) 100%)"
        }}
      />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="px-4 pt-4 pb-2 safe-top">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="h-11 w-11 rounded-2xl flex items-center justify-center bg-white/70 backdrop-blur-sm shadow-sm"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <h1 className="text-xl font-display font-bold text-slate-800">
              რეიტინგი
            </h1>
          </div>
        </header>

        {/* Filter Tabs */}
        <div className="px-4 py-3">
          <div className="flex gap-2 p-1 rounded-2xl bg-white/50 backdrop-blur-sm">
            <button
              onClick={() => setTimeFilter("weekly")}
              className={cn(
                "flex-1 py-3 rounded-xl font-semibold text-sm transition-all",
                timeFilter === "weekly"
                  ? "bg-purple-500 text-white shadow-lg"
                  : "text-slate-600 hover:bg-white/50"
              )}
            >
              ყოველკვირეული
            </button>
            <button
              onClick={() => setTimeFilter("all")}
              className={cn(
                "flex-1 py-3 rounded-xl font-semibold text-sm transition-all",
                timeFilter === "all"
                  ? "bg-purple-500 text-white shadow-lg"
                  : "text-slate-600 hover:bg-white/50"
              )}
            >
              სულ
            </button>
          </div>
        </div>

        {/* Status Banner */}
        <div className="px-4 pb-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl px-4 py-3 flex items-center justify-between"
            style={{ background: "linear-gradient(90deg, hsl(30 90% 55%) 0%, hsl(35 90% 50%) 100%)" }}
          >
            {percentile ? (
              <span className="font-bold text-white text-sm">🔥 შენ უკეთესი ხარ ვიდრე {percentile}%!</span>
            ) : entries.length > 0 ? (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-white" />
                <span className="font-bold text-white text-sm">{entries.length} მოთამაშე ასპარეზობს</span>
              </div>
            ) : (
              <span className="font-bold text-white text-sm">იყავი პირველი!</span>
            )}
            <div className="flex items-center gap-1.5 text-white/90">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">{getTimeUntilReset()}</span>
            </div>
          </motion.div>
        </div>

        {/* Podium Section */}
        {!loading && topThree.length > 0 && (
          <div className="px-4 pb-6">
            <div className="flex items-end justify-center gap-3">
              {/* 2nd Place */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col items-center"
              >
                <div className="relative mb-2">
                  <div className="w-16 h-16 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center border-2 border-slate-300 shadow-lg">
                    {topThree[1] ? (
                      <Avatar
                        imageUrl={topThree[1].avatar_url || undefined}
                        emoji={topThree[1].nickname?.charAt(0) || "👤"}
                        size="md"
                      />
                    ) : (
                      <span className="text-2xl text-slate-400">👤</span>
                    )}
                  </div>
                </div>
                <span className="text-xs font-semibold text-slate-700 mb-1 truncate max-w-[70px]">
                  {topThree[1]?.nickname || "---"}
                </span>
                <span className="text-xs text-slate-500 mb-2">
                  {topThree[1]?.total_points || 0} ქულა
                </span>
                <div 
                  className="w-20 h-24 rounded-t-xl flex items-center justify-center"
                  style={{ background: "linear-gradient(180deg, hsl(0 0% 80%) 0%, hsl(0 0% 70%) 100%)" }}
                >
                  <span className="text-3xl font-bold text-white">2</span>
                </div>
              </motion.div>

              {/* 1st Place */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex flex-col items-center"
              >
                <div className="relative mb-2">
                  <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -top-6 left-1/2 -translate-x-1/2 text-2xl"
                  >
                    👑
                  </motion.div>
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center border-4 border-amber-400 shadow-xl">
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
                  {topThree[0]?.country_code && (
                    <div className="absolute -bottom-1 -right-1 text-lg">
                      {getCountryFlag(topThree[0].country_code)}
                    </div>
                  )}
                </div>
                <span className="text-sm font-bold text-slate-800 mb-1 truncate max-w-[80px]">
                  {topThree[0]?.nickname || "---"}
                </span>
                <span className="text-xs text-amber-600 font-semibold mb-2">
                  {topThree[0]?.total_points || 0} ქულა
                </span>
                <div 
                  className="w-24 h-32 rounded-t-xl flex items-center justify-center"
                  style={{ background: "linear-gradient(180deg, hsl(45 90% 55%) 0%, hsl(40 85% 45%) 100%)" }}
                >
                  <span className="text-4xl font-bold text-white">1</span>
                </div>
              </motion.div>

              {/* 3rd Place */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col items-center"
              >
                <div className="relative mb-2">
                  <div className="w-14 h-14 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center border-2 border-orange-300 shadow-lg">
                    {topThree[2] ? (
                      <Avatar
                        imageUrl={topThree[2].avatar_url || undefined}
                        emoji={topThree[2].nickname?.charAt(0) || "👤"}
                        size="sm"
                      />
                    ) : (
                      <span className="text-xl text-slate-400">👤</span>
                    )}
                  </div>
                </div>
                <span className="text-xs font-semibold text-slate-700 mb-1 truncate max-w-[60px]">
                  {topThree[2]?.nickname || "---"}
                </span>
                <span className="text-xs text-slate-500 mb-2">
                  {topThree[2]?.total_points || 0} ქულა
                </span>
                <div 
                  className="w-16 h-16 rounded-t-xl flex items-center justify-center"
                  style={{ background: "linear-gradient(180deg, hsl(25 70% 50%) 0%, hsl(20 65% 40%) 100%)" }}
                >
                  <span className="text-2xl font-bold text-white">3</span>
                </div>
              </motion.div>
            </div>
          </div>
        )}

        {/* List Section */}
        <div className="flex-1 bg-background/95 backdrop-blur-sm rounded-t-3xl px-4 pt-5 pb-24">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              იტვირთება...
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🏆</div>
              <h3 className="text-lg font-bold text-foreground mb-2">ჯერ მოთამაშეები არ არიან!</h3>
              <p className="text-muted-foreground">
                ითამაშე რომ გამოჩნდე რეიტინგში
              </p>
            </div>
          ) : remainingEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              სხვა მოთამაშეები ჯერ არ არიან
            </div>
          ) : (
            <div className="space-y-2">
              {remainingEntries.map((entry, index) => {
                const rank = getRankFromPoints(entry.total_points);
                const position = index + 4;
                const isCurrentUser = user && entry.user_id === user.id;

                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-2xl",
                      isCurrentUser 
                        ? "bg-primary/10 border-2 border-primary" 
                        : "bg-muted/50"
                    )}
                  >
                    {/* Position */}
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                      isCurrentUser ? "bg-primary text-primary-foreground" : "bg-muted-foreground/20"
                    )}>
                      <span className="font-bold text-sm">{position}</span>
                    </div>

                    {/* Avatar */}
                    <Avatar
                      imageUrl={entry.avatar_url || undefined}
                      emoji={entry.nickname?.charAt(0) || "👤"}
                      countryCode={entry.country_code}
                      size="sm"
                    />

                    {/* Name & Rank */}
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "font-semibold text-sm truncate",
                        isCurrentUser ? "text-primary" : "text-foreground"
                      )}>
                        {entry.nickname}
                        {isCurrentUser && " (შენ)"}
                      </p>
                      <p className={cn("text-xs font-medium", rank.color)}>
                        {rank.name}
                      </p>
                    </div>

                    {/* Points */}
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-primary text-sm">
                        {entry.total_points.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">ქულა</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
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
