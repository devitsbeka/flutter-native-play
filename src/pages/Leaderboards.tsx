import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Clock } from "lucide-react";
import { getCountryFlag, getRankFromPoints } from "@/data/opponents";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { PodiumDisplay } from "@/components/shared/PodiumDisplay";
import { Avatar } from "@/components/shared/Avatar";
import { useGame } from "@/contexts/GameContext";

interface LeaderboardEntry {
  id: string;
  nickname: string;
  country_code: string;
  total_points: number;
  games_won: number;
  games_played: number;
}

export default function Leaderboards() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<"weekly" | "all">("weekly");
  const navigate = useNavigate();
  const { startMatchmaking } = useGame();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nickname, country_code, total_points, games_won, games_played")
        .order("total_points", { ascending: false })
        .limit(100);

      if (!error && data) {
        setEntries(data);
      }
      setLoading(false);
    };

    fetchLeaderboard();
  }, [timeFilter]);

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

      {/* Better Than Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-accent text-accent-foreground rounded-2xl px-4 py-3 mb-6 flex items-center justify-between"
      >
        <span className="font-bold">🔥 You're doing better than 60%!</span>
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
      onPlayClick={startMatchmaking}
    >
      <div className="px-6 pt-6">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading leaderboard...
          </div>
        ) : remainingEntries.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No more players</p>
          </div>
        ) : (
          <div className="space-y-3">
            {remainingEntries.map((entry, index) => {
              const rank = getRankFromPoints(entry.total_points);
              const position = index + 4; // Start from 4th position

              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="flex items-center gap-4 p-4 bg-card rounded-2xl border border-border"
                >
                  {/* Position */}
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <span className="font-bold text-sm text-foreground">{position}</span>
                  </div>

                  {/* Avatar */}
                  <Avatar
                    emoji="👤"
                    countryCode={entry.country_code}
                    size="sm"
                  />

                  {/* Name & Rank */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground truncate">
                      {entry.nickname}
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
