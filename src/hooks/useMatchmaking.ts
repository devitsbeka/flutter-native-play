import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { readAppLanguage } from "@/utils/appLanguage";

// What mm_enqueue / mm_status hand back (mm_entry_state in the migration).
interface QueueEntry {
  queue_id: string;
  status: "waiting" | "matched" | "cancelled" | "expired";
  game_type_key: string;
  matched_room_id: string | null;
  room_code: string | null;
}

export type MatchmakingStatus = "idle" | "searching" | "matched" | "expired" | "error";

/**
 * The client half of global matchmaking (docs/GAME_TYPES_DESIGN.md §5).
 * Enqueues through mm_enqueue, then waits on two channels at once: realtime
 * UPDATEs on the player's own queue row (owner-only RLS scopes the event),
 * and a slow mm_status poll as the belt-and-braces path — the poll is also
 * what notices the 2-minute expiry, since an expired row may never get a
 * realtime UPDATE if nobody else touches the bucket.
 */
export function useMatchmaking(onMatched: (roomCode: string, gameTypeKey: string) => void) {
  const { user } = useAuth();
  const [status, setStatus] = useState<MatchmakingStatus>("idle");
  const statusRef = useRef(status);
  statusRef.current = status;
  const onMatchedRef = useRef(onMatched);
  onMatchedRef.current = onMatched;
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopWaiting = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const handleEntry = useCallback(
    (entry: QueueEntry | null) => {
      if (!entry || statusRef.current !== "searching") return;
      if (entry.status === "matched" && entry.room_code) {
        stopWaiting();
        setStatus("matched");
        onMatchedRef.current(entry.room_code, entry.game_type_key);
      } else if (entry.status === "expired") {
        stopWaiting();
        setStatus("expired");
      }
    },
    [stopWaiting],
  );

  const enqueue = useCallback(
    async (gameTypeKey: string, teamSize?: number) => {
      if (!user) return;
      setStatus("searching");
      const { data, error } = await supabase.rpc("mm_enqueue", {
        p_game_type_key: gameTypeKey,
        p_language: readAppLanguage("en"),
        ...(teamSize ? { p_team_size: teamSize } : {}),
      });
      if (error) {
        console.error("[MM] enqueue failed", error);
        setStatus("error");
        return;
      }
      const entry = data as unknown as QueueEntry;
      if (entry.status === "matched" && entry.room_code) {
        setStatus("matched");
        onMatchedRef.current(entry.room_code, entry.game_type_key);
        return;
      }

      stopWaiting();
      channelRef.current = supabase
        .channel(`mm-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "matchmaking_queue",
            filter: `user_id=eq.${user.id}`,
          },
          async () => {
            const { data: st } = await supabase.rpc("mm_status");
            handleEntry(st as unknown as QueueEntry | null);
          },
        )
        .subscribe();
      pollRef.current = setInterval(async () => {
        const { data: st } = await supabase.rpc("mm_status");
        handleEntry(st as unknown as QueueEntry | null);
      }, 10000);
    },
    [user, handleEntry, stopWaiting],
  );

  const cancel = useCallback(async () => {
    stopWaiting();
    setStatus("idle");
    await supabase.rpc("mm_cancel");
  }, [stopWaiting]);

  // Leaving the screen mid-search leaves the queue too — an absent player
  // must not be matched into a room they will never enter.
  useEffect(() => {
    return () => {
      stopWaiting();
      if (statusRef.current === "searching") void supabase.rpc("mm_cancel");
    };
  }, [stopWaiting]);

  return { status, enqueue, cancel };
}
