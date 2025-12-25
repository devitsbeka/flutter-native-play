import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Clock, Users, Diamond, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/shared/Avatar";
import { useAuth } from "@/hooks/useAuth";

// Bottom nav icons
import iconCompass from "@/assets/icons/icon-compass.png";
import iconMap3d from "@/assets/icons/icon-map-3d.png";
import iconTrophy3d from "@/assets/icons/icon-trophy-3d.png";

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

// 3D Play button component (same as Index)
function PlayButton3D({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      className="relative"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95, y: 4 }}
    >
      {/* Outer glow */}
      <div 
        className="absolute inset-0 rounded-full blur-xl"
        style={{ 
          background: "rgba(255,255,255,0.4)",
          transform: "scale(1.2)",
        }}
      />
      
      {/* Button base (shadow/depth) */}
      <div 
        className="absolute inset-0 rounded-full"
        style={{
          background: "linear-gradient(180deg, #7C3AED 0%, #5B21B6 100%)",
          transform: "translateY(4px)",
        }}
      />
      
      {/* Button face */}
      <div 
        className="relative w-20 h-20 rounded-full flex items-center justify-center"
        style={{
          background: "linear-gradient(180deg, #A78BFA 0%, #8B5CF6 50%, #7C3AED 100%)",
          boxShadow: "inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.2)",
        }}
      >
        <Play className="w-8 h-8 text-white fill-white ml-1" />
      </div>
    </motion.button>
  );
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

  const topThree = entries.slice(0, 3);
  const remainingEntries = entries.slice(3);

  return (
    <div className="min-h-screen relative overflow-hidden pb-28">
      {/* Sky Background - matching Index page */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          background: "linear-gradient(180deg, hsl(195 85% 75%) 0%, hsl(195 80% 85%) 50%, hsl(45 40% 90%) 100%)"
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="px-4 pt-4 pb-3 safe-top">
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
          <div className="flex gap-1 p-1 rounded-2xl bg-white/50 backdrop-blur-sm">
            <button
              onClick={() => setTimeFilter("weekly")}
              className={cn(
                "flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all",
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
                "flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all",
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
            {entries.length > 0 ? (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-white" />
                <span className="font-bold text-white text-sm">{entries.length} მოთამაშე</span>
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

        {/* Top 3 Podium */}
        {!loading && topThree.length > 0 && (
          <div className="px-4 pb-6">
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
                    <div className="w-full h-full rounded-full overflow-hidden bg-white/80 flex items-center justify-center">
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
                </div>
                <span className="text-sm font-semibold text-slate-700 mb-0.5 truncate max-w-[80px] text-center">
                  {topThree[1]?.nickname || "---"}
                </span>
                <div className="flex items-center gap-1 text-emerald-600">
                  <Diamond className="w-3 h-3 fill-current" />
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
                    <div className="w-full h-full rounded-full overflow-hidden bg-white/80 flex items-center justify-center">
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
                <span className="text-base font-bold text-slate-800 mb-0.5 truncate max-w-[90px] text-center">
                  {topThree[0]?.nickname || "---"}
                </span>
                <div className="flex items-center gap-1 text-emerald-600">
                  <Diamond className="w-3.5 h-3.5 fill-current" />
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
                    <div className="w-full h-full rounded-full overflow-hidden bg-white/80 flex items-center justify-center">
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
                </div>
                <span className="text-xs font-semibold text-slate-700 mb-0.5 truncate max-w-[70px] text-center">
                  {topThree[2]?.nickname || "---"}
                </span>
                <div className="flex items-center gap-1 text-emerald-600">
                  <Diamond className="w-3 h-3 fill-current" />
                  <span className="text-xs font-bold">{(topThree[2]?.total_points || 0).toLocaleString()}</span>
                </div>
              </motion.div>
            </div>
          </div>
        )}

        {/* Divider with "Top Ranking" label */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-400/50 to-transparent" />
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
              ◆ ტოპ რეიტინგი ◆
            </span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-400/50 to-transparent" />
          </div>
        </div>

        {/* List Section */}
        <div className="px-4">
          {loading ? (
            <div className="text-center py-12 text-slate-500">
              იტვირთება...
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🏆</div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">ჯერ მოთამაშეები არ არიან!</h3>
              <p className="text-slate-500">
                ითამაშე რომ გამოჩნდე რეიტინგში
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry, index) => {
                const position = index + 1;
                const isCurrentUser = user && entry.user_id === user.id;
                const isTopThree = position <= 3;

                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-2xl",
                      isCurrentUser 
                        ? "bg-purple-100/80 border border-purple-300" 
                        : "bg-white/60 backdrop-blur-sm"
                    )}
                  >
                    {/* Avatar */}
                    <div className="relative">
                      <Avatar
                        imageUrl={entry.avatar_url || undefined}
                        emoji={entry.nickname?.charAt(0) || "👤"}
                        countryCode={entry.country_code}
                        size="sm"
                      />
                    </div>

                    {/* Name & Points */}
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "font-semibold text-sm truncate",
                        isCurrentUser ? "text-purple-700" : "text-slate-700"
                      )}>
                        {entry.nickname}
                        {isCurrentUser && " (შენ)"}
                      </p>
                      <div className="flex items-center gap-1 text-emerald-600">
                        <Diamond className="w-3 h-3 fill-current" />
                        <span className="text-sm font-bold">{entry.total_points.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Rank Badge with Medal or Number */}
                    {isTopThree ? (
                      <RankMedal rank={position as 1 | 2 | 3} size="sm" />
                    ) : (
                      <span className="text-sm font-bold text-slate-500 w-8 text-center">
                        #{position}
                      </span>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Gradient fade overlay at bottom */}
      <div 
        className="fixed bottom-0 left-0 right-0 h-40 pointer-events-none z-10"
        style={{
          background: "linear-gradient(to top, hsl(45 40% 88%) 0%, hsl(45 40% 88% / 0.8) 30%, transparent 100%)",
        }}
      />

      {/* Bottom Navigation - Liquid Glass Effect */}
      <div className="fixed bottom-0 left-0 right-0 z-20 safe-bottom">
        {/* Glass container with blur */}
        <motion.div 
          className="mx-3 mb-4 rounded-3xl overflow-hidden"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.45) 100%)",
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            border: "1px solid rgba(255,255,255,0.5)",
            boxShadow: "0 -4px 30px rgba(0,0,0,0.06), inset 0 1px 1px rgba(255,255,255,0.7)",
          }}
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 120 }}
        >
          <div className="relative px-4 py-3 flex items-end justify-between">
            {/* Explore */}
            <motion.button
              onClick={() => navigate("/discover")}
              className="flex flex-col items-center gap-1"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white/40">
                <img src={iconCompass} alt="Explore" className="w-9 h-9 object-contain" />
              </div>
              <span className="text-[9px] uppercase tracking-wider text-slate-700 font-medium">Explore</span>
            </motion.button>

            {/* Map */}
            <motion.button
              onClick={() => navigate("/adventure-map")}
              className="flex flex-col items-center gap-1"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white/40">
                <img src={iconMap3d} alt="Map" className="w-9 h-9 object-contain" />
              </div>
              <span className="text-[9px] uppercase tracking-wider text-slate-700 font-medium">Map</span>
            </motion.button>

            {/* Center Play Button - elevated */}
            <div className="-mt-6">
              <PlayButton3D onClick={() => navigate("/game")} />
            </div>

            {/* Rank - active state */}
            <motion.button
              onClick={() => navigate("/leaderboards")}
              className="flex flex-col items-center gap-1"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-purple-200/60">
                <img src={iconTrophy3d} alt="Rank" className="w-9 h-9 object-contain" />
              </div>
              <span className="text-[9px] uppercase tracking-wider text-purple-600 font-semibold">Rank</span>
            </motion.button>

            {/* Headphones/Audio */}
            <motion.button
              className="flex flex-col items-center gap-1"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white/40">
                <span className="text-2xl">🎧</span>
              </div>
              <span className="text-[9px] uppercase tracking-wider text-slate-700 font-medium">Sound</span>
            </motion.button>
          </div>
        </motion.div>
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
