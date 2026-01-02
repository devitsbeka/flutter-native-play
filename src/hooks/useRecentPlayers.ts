import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface RecentPlayer {
  oderId: string;
  odername: string;
  oderAvatarUrl: string | null;
  oderAnimatedAvatarUrl: string | null;
  oderCountryCode: string | null;
  lastPlayedAt: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
}

export function useRecentPlayers() {
  const { user } = useAuth();
  const [recentPlayers, setRecentPlayers] = useState<RecentPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRecentPlayers([]);
      setLoading(false);
      return;
    }

    const fetchRecentPlayers = async () => {
      try {
        // Get recent game sessions with opponents
        const { data: sessions, error } = await supabase
          .from("game_sessions")
          .select("*")
          .eq("user_id", user.id)
          .order("completed_at", { ascending: false })
          .limit(20);

        if (error) throw error;

        if (!sessions || sessions.length === 0) {
          setRecentPlayers([]);
          setLoading(false);
          return;
        }

        // Aggregate stats per opponent
        const opponentStats = new Map<string, {
          opponentName: string;
          lastPlayedAt: string;
          gamesPlayed: number;
          wins: number;
          losses: number;
        }>();

        sessions.forEach((session) => {
          const key = session.opponent_name;
          const existing = opponentStats.get(key);
          const isWin = (session.user_score || 0) > (session.opponent_score || 0);

          if (existing) {
            existing.gamesPlayed++;
            if (isWin) existing.wins++;
            else existing.losses++;
            if (session.completed_at && session.completed_at > existing.lastPlayedAt) {
              existing.lastPlayedAt = session.completed_at;
            }
          } else {
            opponentStats.set(key, {
              opponentName: session.opponent_name,
              lastPlayedAt: session.completed_at || session.created_at,
              gamesPlayed: 1,
              wins: isWin ? 1 : 0,
              losses: isWin ? 0 : 1,
            });
          }
        });

        // Convert to array and sort by last played
        const players: RecentPlayer[] = Array.from(opponentStats.entries())
          .map(([name, stats]) => ({
            oderId: name, // Using name as ID since these are bot opponents
            odername: stats.opponentName,
            oderAvatarUrl: null,
            oderAnimatedAvatarUrl: null,
            oderCountryCode: null,
            lastPlayedAt: stats.lastPlayedAt,
            gamesPlayed: stats.gamesPlayed,
            wins: stats.wins,
            losses: stats.losses,
          }))
          .sort((a, b) => new Date(b.lastPlayedAt).getTime() - new Date(a.lastPlayedAt).getTime())
          .slice(0, 10);

        setRecentPlayers(players);
      } catch (error) {
        console.error("Error fetching recent players:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentPlayers();
  }, [user]);

  return { recentPlayers, loading };
}
