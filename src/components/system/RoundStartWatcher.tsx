import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isInterruptible } from "@/utils/roundStartRoutes";
import { RoundCountdown } from "@/components/team/RoundCountdown";
import { useRoundCountdown, useRoundStartHold } from "@/hooks/useRoundCountdown";

/**
 * Brings a player back to a room the moment its round starts, and counts them
 * in on the way.
 *
 * Waiting for a host is dead time, so people wander — to the shop, to their
 * profile, to Discover. Nothing followed them: MultiplayerProviderV2 is
 * mounted inside the /team route, so a player anywhere else had no
 * subscription to the room at all and learned the round had begun only by
 * navigating back to it, by which point the first question was already
 * running and its clock with it.
 *
 * So it is mounted outside <Routes>, where it survives every navigation.
 *
 * It draws the 3-2-1 itself rather than leaving that to the room page. TeamV2
 * can only show the count once its provider has loaded the room, and a cold
 * mount — the provider, the room, the participants, the questions — routinely
 * outlasts three seconds. Navigating alone therefore delivered the player to
 * question one with the count already spent, which is the thing this whole
 * feature exists to prevent. Drawing it here starts it on whatever screen
 * they are on, at the digit the room's clock is actually on.
 *
 * The count is not duplicated: a player already on /team is left alone (see
 * isInterruptible), because TeamV2 is showing it for them.
 */

interface StartedRound {
  startedAt: string | null;
  categoryId: string | null;
  categoryName: string | null;
}

type RoomRow = {
  id: string;
  status?: string | null;
  current_game_id?: string | null;
  started_at?: string | null;
  category_id?: string | null;
  category_name?: string | null;
  game_type_key?: string | null;
  room_code?: string | null;
};

export function RoundStartWatcher() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Read at fire time rather than closed over, so the subscription does not
  // have to be torn down and rebuilt on every navigation.
  const pathRef = useRef(location.pathname);
  pathRef.current = location.pathname;

  // The round this is currently counting in, or null between rounds.
  const [startedRound, setStartedRound] = useState<StartedRound | null>(null);
  const countdownNumber = useRoundCountdown(startedRound?.startedAt);
  const withinRoundStart = useRoundStartHold(startedRound?.startedAt);

  // Hand the screen back once the count and its grace are spent. By then the
  // room page has had its cold mount and owns whatever comes next.
  useEffect(() => {
    if (startedRound && !withinRoundStart) setStartedRound(null);
  }, [startedRound, withinRoundStart]);

  // The room whose start we already acted on, so a burst of updates on the
  // same round does not navigate repeatedly.
  const handledGameRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    let roomChannel: ReturnType<typeof supabase.channel> | null = null;

    const onRoomUpdate = (room: RoomRow) => {
      if (room.status !== "playing") return;
      // current_game_id changes per round, so it is what makes "this start,
      // once" different from "this room, ever".
      const key = `${room.id}:${room.current_game_id ?? ""}`;
      if (handledGameRef.current === key) return;
      handledGameRef.current = key;
      if (!isInterruptible(pathRef.current)) return;

      // A Team Battle starting is this room's business, not the classic
      // flow's: pull the player into ITS page, with no classic 3-2-1 (the
      // match opens with its own rock-paper-scissors phase). Navigating to
      // /team here is what used to yank a Team Battle player out of their
      // own starting match and strand them in the classic hub.
      if (room.game_type_key === "team_battle") {
        if (room.room_code) navigate(`/team-battle?code=${room.room_code}`);
        return;
      }

      // Versus King is the same shape: its match opens with the captain
      // vote, not the classic 3-2-1, so its players go to its page.
      if (room.game_type_key === "king") {
        if (room.room_code) navigate(`/king?code=${room.room_code}`);
        return;
      }

      setStartedRound({
        startedAt: room.started_at ?? null,
        categoryId: room.category_id ?? null,
        categoryName: room.category_name ?? null,
      });
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

      // started_at and the category come along because this component draws
      // the count itself — see the note above.
      const { data: rooms } = await supabase
        .from("game_rooms")
        .select("id, status, current_game_id, started_at, category_id, category_name, game_type_key, room_code, last_activity_at")
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
          (payload) => onRoomUpdate(payload.new as RoomRow),
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

  if (!startedRound || !withinRoundStart) return null;

  return (
    <RoundCountdown
      number={countdownNumber}
      categoryId={startedRound.categoryId}
      categoryName={startedRound.categoryName}
    />
  );
}
