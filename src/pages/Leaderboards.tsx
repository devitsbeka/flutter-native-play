import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { ArrowLeft, Trophy, Medal, Award, Crown } from "lucide-react";
import { getCountryFlag, getRankFromPoints } from "@/data/opponents";
import { cn } from "@/lib/utils";

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
  const [timeFilter, setTimeFilter] = useState<"all" | "weekly" | "monthly">("all");
  const navigate = useNavigate();

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

  const getRankIcon = (position: number) => {
    if (position === 0) return <Crown className="w-6 h-6 text-yellow-500" />;
    if (position === 1) return <Medal className="w-6 h-6 text-gray-400" />;
    if (position === 2) return <Award className="w-6 h-6 text-amber-600" />;
    return <span className="w-6 text-center font-bold text-muted-foreground">#{position + 1}</span>;
  };

  return (
    <div className="min-h-screen flex flex-col p-4 bg-gradient-to-b from-background via-background to-primary/10">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate("/")}
          className="p-2 rounded-xl bg-card hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Trophy className="w-6 h-6 text-primary" />
            Leaderboards
          </h1>
        </div>
      </div>

      {/* Time Filter */}
      <div className="flex gap-2 mb-6">
        {(["all", "weekly", "monthly"] as const).map((filter) => (
          <ChunkyButton
            key={filter}
            variant={timeFilter === filter ? "primary" : "ghost"}
            size="sm"
            onClick={() => setTimeFilter(filter)}
            className="flex-1"
          >
            {filter === "all" ? "All Time" : filter === "weekly" ? "Weekly" : "Monthly"}
          </ChunkyButton>
        ))}
      </div>

      {/* Leaderboard List */}
      <div className="flex-1 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading leaderboard...
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No players yet!</p>
            <p className="text-sm text-muted-foreground/70">Be the first to play and claim the top spot.</p>
          </div>
        ) : (
          entries.map((entry, index) => {
            const rank = getRankFromPoints(entry.total_points);
            const isTopThree = index < 3;

            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-2xl border transition-colors",
                  isTopThree
                    ? "bg-card border-primary/30 shadow-md"
                    : "bg-card/50 border-border"
                )}
              >
                {/* Rank */}
                <div className="w-8 flex justify-center">
                  {getRankIcon(index)}
                </div>

                {/* Avatar & Name */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="text-2xl">
                    {getCountryFlag(entry.country_code)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {entry.nickname}
                    </p>
                    <p className={cn("text-xs", rank.color)}>
                      {rank.name}
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div className="text-right">
                  <p className="font-bold text-primary">
                    {entry.total_points.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {entry.games_won}W / {entry.games_played}G
                  </p>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
