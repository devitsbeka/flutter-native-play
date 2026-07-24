import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSound } from "@/contexts/SoundContext";
import { toast } from "sonner";

export interface PendingChallenge {
  id: string;
  roomCode: string;
  categoryName: string | null;
  challengerNickname: string;
  challengerAvatar: string | null;
  challengerCountry: string | null;
  challengerScore: number | null;
  expiresAt: string;
  createdAt: string;
}

interface PendingChallengesContextValue {
  pendingChallenges: PendingChallenge[];
  loading: boolean;
  refreshChallenges: () => Promise<void>;
  declineChallenge: (challengeId: string) => Promise<boolean>;
}

const PendingChallengesContext = createContext<PendingChallengesContextValue | null>(null);

export function PendingChallengesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { playSound, vibrate } = useSound();
  const [pendingChallenges, setPendingChallenges] = useState<PendingChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const previousChallengeIds = useRef<Set<string>>(new Set());

  const fetchChallenges = useCallback(async () => {
    if (!user) {
      setPendingChallenges([]);
      setLoading(false);
      return;
    }

    try {
      const { data: rooms, error } = await supabase
        .from("game_rooms")
        .select(`
          id,
          room_code,
          category_name,
          challenge_expires_at,
          challenger_completed_at,
          created_at,
          host_user_id
        `)
        .eq("challenged_user_id", user.id)
        .eq("game_type", "async")
        .in("status", ["waiting", "playing"])
        .not("challenge_expires_at", "is", null)
        .gt("challenge_expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!rooms || rooms.length === 0) {
        setPendingChallenges([]);
        setLoading(false);
        return;
      }

      const challengerIds = rooms.map(r => r.host_user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, nickname, avatar_url, country_code")
        .in("user_id", challengerIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const roomIds = rooms.map(r => r.id);
      const { data: participants } = await supabase
        .from("room_participants")
        .select("room_id, user_id, score")
        .in("room_id", roomIds);

      const scoreMap = new Map<string, number>();
      participants?.forEach(p => {
        if (rooms.find(r => r.host_user_id === p.user_id && r.id === p.room_id)) {
          scoreMap.set(p.room_id, p.score || 0);
        }
      });

      const challenges: PendingChallenge[] = rooms.map(room => {
        const profile = profileMap.get(room.host_user_id);
        return {
          id: room.id,
          roomCode: room.room_code,
          categoryName: room.category_name,
          challengerNickname: profile?.nickname || "მოთამაშე",
          challengerAvatar: profile?.avatar_url || null,
          challengerCountry: profile?.country_code || null,
          challengerScore: scoreMap.get(room.id) ?? null,
          expiresAt: room.challenge_expires_at!,
          createdAt: room.created_at!,
        };
      });

      const currentIds = new Set(challenges.map(c => c.id));
      challenges.forEach(challenge => {
        if (!previousChallengeIds.current.has(challenge.id) && previousChallengeIds.current.size > 0) {
          playSound("friend-request");
          vibrate([100, 50, 100, 50, 100]);
          toast.success(`${challenge.challengerNickname} გამოგიწვია თამაშში!`, {
            description: challenge.categoryName || "ზოგადი ცოდნა",
            duration: 5000,
          });
        }
      });
      previousChallengeIds.current = currentIds;

      setPendingChallenges(challenges);
    } catch (error) {
      console.error("Error fetching pending challenges:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  // Single realtime subscription for the whole app
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`pending-challenges-ctx-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_rooms",
          filter: `challenged_user_id=eq.${user.id}`,
        },
        () => {
          fetchChallenges();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchChallenges]);

  const declineChallenge = useCallback(async (challengeId: string) => {
    try {
      const { error } = await supabase
        .from("game_rooms")
        .update({ status: "cancelled" as const })
        .eq("id", challengeId);

      if (error) throw error;

      setPendingChallenges(prev => prev.filter(c => c.id !== challengeId));
      toast.success("გამოწვევა უარყოფილია");
      return true;
    } catch (error) {
      console.error("Error declining challenge:", error);
      toast.error("გამოწვევის უარყოფა ვერ მოხერხდა");
      return false;
    }
  }, []);

  const value = useMemo(
    () => ({
      pendingChallenges,
      loading,
      refreshChallenges: fetchChallenges,
      declineChallenge,
    }),
    [pendingChallenges, loading, fetchChallenges, declineChallenge]
  );

  return (
    <PendingChallengesContext.Provider value={value}>
      {children}
    </PendingChallengesContext.Provider>
  );
}

export function usePendingChallenges() {
  const ctx = useContext(PendingChallengesContext);
  if (!ctx) throw new Error("usePendingChallenges must be used within PendingChallengesProvider");
  return ctx;
}
