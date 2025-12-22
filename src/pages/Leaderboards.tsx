import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Clock, Users } from "lucide-react";
import { getRankFromPoints } from "@/data/opponents";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { PodiumDisplay } from "@/components/shared/PodiumDisplay";
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
        .select("id, user_id, nickname, country_code, total_points, games_won, games_played")
        .order("total_points", { ascending: false })
        .limit(100);

      if (!error && data) {
        setEntries(data);
        
        // Find current user's rank
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

  // Calculate time until reset (Sunday midnight)
  const getTimeUntilReset = () => {
    const now = new Date();
    const nextSunday = new Date(now);
    nextSunday.setDate(now.getDate() + (7 - now.getDay()));
    nextSunday.setHours(0, 0, 0, 0);
    const diff = nextSunday.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days}d ${hours}h`;
  };

  // Calculate percentile
  const getPercentile = () => {
    if (!userRank || entries.length === 0) return null;
    const percentile = Math.round(((entries.length - userRank) / entries.length) * 100);
    return Math.max(1, percentile);
  };

  // Get top 3 for podium
  const topThree = entries.slice(0, 3).map((entry, index) => ({
    id: entry.id,
    nickname: entry.nickname,
    countryCode: entry.country_code,
    points: entry.total_points,
    rank: index + 1,
    emoji: ["🥇", "🥈", "🥉"][index] || "👤",
  }));

  // Remaining entries
  const remainingEntries = entries.slice(3);
  const percentile = getPercentile();

  const headerContent = (
    <div className="pt-12 pb-24 px-6">
      {/* Header Row */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate("/")}
          className="p-2 rounded-full bg-primary-foreground/10"
        >
          <ArrowLeft className="w-5 h-5 text-primary-foreground" />
        </button>
        <h1 className="text-2xl font-bold text-primary-foreground flex-1">
          Leaderboard
        </h1>
      </div>

      {/* Time Filter */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTimeFilter("weekly")}
          className={cn(
            "flex-1 py-3 rounded-full font-semibold text-sm transition-colors",
            timeFilter === "weekly"
              ? "bg-primary-foreground text-primary"
              : "bg-primary-foreground/10 text-primary-foreground"
          )}
        >
          Weekly
        </button>
        <button
          onClick={() => setTimeFilter("all")}
          className={cn(
            "flex-1 py-3 rounded-full font-semibold text-sm transition-colors",
            timeFilter === "all"
              ? "bg-primary-foreground text-primary"
              : "bg-primary-foreground/10 text-primary-foreground"
          )}
        >
          All Time
        </button>
      </div>

      {/* Status Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-accent text-accent-foreground rounded-2xl px-4 py-3 mb-6 flex items-center justify-between"
      >
        {percentile ? (
          <span className="font-bold">🔥 You're doing better than {percentile}%!</span>
        ) : entries.length > 0 ? (
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="font-bold">{entries.length} players competing</span>
          </div>
        ) : (
          <span className="font-bold">Be the first to play!</span>
        )}
        <div className="flex items-center gap-1 text-sm">
          <Clock className="w-4 h-4" />
          <span>{getTimeUntilReset()}</span>
        </div>
      </motion.div>

      {/* Podium */}
      {!loading && topThree.length > 0 && (
        <PodiumDisplay players={topThree} />
      )}
    </div>
  );

  return (
    <AppLayout 
      headerContent={headerContent} 
      headerClassName="pb-8"
    >
      <div className="px-6 pt-6">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading leaderboard...
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏆</div>
            <h3 className="text-lg font-bold text-foreground mb-2">No players yet!</h3>
            <p className="text-muted-foreground">
              Complete quizzes to appear on the leaderboard
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {remainingEntries.map((entry, index) => {
              const rank = getRankFromPoints(entry.total_points);
              const position = index + 4; // Start from 4th position
              const isCurrentUser = user && entry.user_id === user.id;

              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-2xl border",
                    isCurrentUser 
                      ? "bg-primary/10 border-primary" 
                      : "bg-card border-border"
                  )}
                >
                  {/* Position */}
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center",
                    isCurrentUser ? "bg-primary text-primary-foreground" : "bg-secondary"
                  )}>
                    <span className="font-bold text-sm">{position}</span>
                  </div>

                  {/* Avatar */}
                  <Avatar
                    emoji="👤"
                    countryCode={entry.country_code}
                    size="sm"
                  />

                  {/* Name & Rank */}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "font-bold truncate",
                      isCurrentUser ? "text-primary" : "text-foreground"
                    )}>
                      {entry.nickname}
                      {isCurrentUser && " (You)"}
                    </p>
                    <p className={cn("text-xs font-medium", rank.color)}>
                      {rank.name}
                    </p>
                  </div>

                  {/* Points */}
                  <div className="text-right">
                    <p className="font-bold text-primary">
                      {entry.total_points.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">points</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
