import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isInterruptible } from "@/utils/roundStartRoutes";

/**
 * Brings a player back to a room the moment its round starts.
 *
 * Waiting for a host is dead time, so people wander — to the shop, to their
 * profile, to Discover. Nothing followed them: MultiplayerProviderV2 is
 * mounted inside the /team route, so a player anywhere else had no
 * subscription to the room at all and learned the round had begun only by
 * navigating back to it, by which point the first question was already
 * running and its clock with it.
 *
 * So it is mounted outside <Routes>, where it survives every navigation. It
 * watches the room the player is actually in and sends them to /team when it
 * flips to playing; the 3-2-1 they land on is drawn by TeamV2 from the room's
 * start time, so arriving late shows the count where it really is rather than
 * restarting it.
 *
 * It navigates and nothing else. No UI, no state — the room page already
 * knows how to restore an in-progress game.
 */

export function RoundStartWatcher() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Read at fire time rather than closed over, so the subscription does not
  // have to be torn down and rebuilt on every navigation.
  const pathRef = useRef(location.pathname);
  pathRef.current = location.pathname;

  // The room whose start we already acted on, so a burst of updates on the
  // same round does not navigate repeatedly.
  const handledGameRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    let roomChannel: ReturnType<typeof supabase.channel> | null = null;

    const onRoomUpdate = (room: { id: string; status?: string | null; current_game_id?: string | null }) => {
      if (room.status !== "playing") return;
      // current_game_id changes per round, so it is what makes "this start,
      // once" different from "this room, ever".
      const key = `${room.id}:${room.current_game_id ?? ""}`;
      if (handledGameRef.current === key) return;
      handledGameRef.current = key;
      if (!isInterruptible(pathRef.current)) return;
      navigate("/team");
    };

    const watchRoom = async () => {
      // The room the player is in: their participant rows, newest first,
      // narrowed to rooms that could still start.
      const { data: seats } = await supabase
        .from("room_participants")
        .select("room_id")
        .eq("user_id", user.id)
        .order("joined_at", { ascending: false })
        .limit(10);

      const roomIds = (seats ?? []).map((s) => s.room_id).filter(Boolean);
      if (cancelled || roomIds.length === 0) return;

      const { data: rooms } = await supabase
        .from("game_rooms")
        .select("id, status, current_game_id, last_activity_at")
        .in("id", roomIds)
        .in("status", ["waiting", "ready", "playing"])
        .order("last_activity_at", { ascending: false })
        .limit(1);

      const room = rooms?.[0];
      if (cancelled || !room) return;

      // A round that started while this was being resolved still counts —
      // the player may have been mid-navigation when the host pressed start.
      onRoomUpdate(room);

      roomChannel = supabase
        .channel(`round-start:${room.id}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "game_rooms", filter: `id=eq.${room.id}` },
          (payload) => onRoomUpdate(payload.new as { id: string; status?: string; current_game_id?: string }),
        )
        .subscribe();
    };

    void watchRoom();

    // Joining a room from another page (an invite, a friend's link) has to
    // re-resolve which room is being watched, or the watcher stays pointed at
    // whatever was current when it mounted.
    const seatChannel = supabase
      .channel(`round-start-seats:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "room_participants", filter: `user_id=eq.${user.id}` },
        () => {
          if (roomChannel) supabase.removeChannel(roomChannel);
          roomChannel = null;
          void watchRoom();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      if (roomChannel) supabase.removeChannel(roomChannel);
      supabase.removeChannel(seatChannel);
    };
  }, [user?.id, navigate]);

  return null;
}
