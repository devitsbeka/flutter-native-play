import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Tables } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useGameInvitations } from "@/hooks/useGameInvitations";
import { resolveAvatarUrl } from "@/utils/avatarUtils";
import { roomVisibilityFields } from "@/utils/roomVisibility";
import { isWordsRoom } from "@/utils/roomRoutes";
import { emptyShared, hasNews, isSharedState, mergeShared, type SharedState } from "./shared";

/**
 * A Words board shared with one friend.
 *
 * The room is a `game_rooms` row like the King and Battle lounges use, so
 * the invite machinery the app already has — the participant row whose
 * insert raises the in-app notification, the `game_invitations` row that
 * carries the push — works unchanged. The board's own state rides on a
 * realtime broadcast channel and is reconciled by `mergeShared`; it never
 * touches the database. Each device keeps its last copy in localStorage so
 * a reload, or a friend arriving after the host has gone quiet, still lands
 * on the right level.
 *
 * Solo play makes no room at all. The room is created the moment a friend
 * is invited, or when the page was opened with a code.
 */

export interface Seat {
  userId: string;
  nickname: string;
  avatarUrl: string | null;
  animatedAvatarUrl: string | null;
  isHost: boolean;
  /** Invited but not yet on the board. */
  pending: boolean;
}

interface Options {
  /** The code from the URL, when the page was opened as a join link. */
  code: string | null;
  /** Called when a code was given and no such room exists. */
  onMissing?: () => void;
  onRoomReady?: (room: Tables<"game_rooms">) => void;
  /** Local shared state to answer a peer's request with. */
  getState: () => SharedState;
  /** A peer's copy that carries something ours does not. */
  onIncoming: (state: SharedState) => void;
  onFriendJoined?: (seat: Seat) => void;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const mintCode = () =>
  Array.from({ length: 6 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join("");

export const sharedStorageKey = (code: string) => `mytrivia.words.room.${code.toUpperCase()}`;

export function loadSharedState(code: string): SharedState | null {
  try {
    const raw = localStorage.getItem(sharedStorageKey(code));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isSharedState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function persistSharedState(code: string, state: SharedState) {
  try {
    localStorage.setItem(sharedStorageKey(code), JSON.stringify(state));
  } catch {
    // Private mode; the channel still carries the state while both are on.
  }
}

export function useWordsRoom({ code, onMissing, onRoomReady, getState, onIncoming, onFriendJoined }: Options) {
  const { user, profile } = useAuth();
  const { sendInvitation } = useGameInvitations();
  const [room, setRoom] = useState<Tables<"game_rooms"> | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [connected, setConnected] = useState<Set<string>>(() => new Set());
  const [creating, setCreating] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const attemptedCode = useRef<string | null>(null);
  const knownSeated = useRef<Set<string>>(new Set());
  const seeded = useRef(false);

  const getStateRef = useRef(getState);
  getStateRef.current = getState;
  const onIncomingRef = useRef(onIncoming);
  onIncomingRef.current = onIncoming;
  const onFriendJoinedRef = useRef(onFriendJoined);
  onFriendJoinedRef.current = onFriendJoined;
  const onRoomReadyRef = useRef(onRoomReady);
  onRoomReadyRef.current = onRoomReady;
  const onMissingRef = useRef(onMissing);
  onMissingRef.current = onMissing;

  /** Seats from the participant rows, with live avatars laid over the snapshot. */
  const refreshSeats = useCallback(async (roomId: string) => {
    const { data: parts } = await supabase
      .from("room_participants")
      .select("user_id, nickname, avatar_url, is_host, status, joined_at")
      .eq("room_id", roomId)
      .in("status", ["joined", "ready", "playing", "invited"])
      .order("joined_at", { ascending: true });
    const rows = parts ?? [];
    const ids = rows.map((p) => p.user_id).filter((id): id is string => !!id);
    const { data: profiles } = ids.length
      ? await supabase.from("profiles").select("user_id, nickname, avatar_url, animated_avatar_url").in("user_id", ids)
      : { data: [] as { user_id: string; nickname: string | null; avatar_url: string | null; animated_avatar_url: string | null }[] };
    const byId = new Map((profiles ?? []).map((p) => [p.user_id, p]));
    const next: Seat[] = rows
      .filter((p) => !!p.user_id)
      .map((p) => {
        const live = byId.get(p.user_id!);
        return {
          userId: p.user_id!,
          nickname: live?.nickname || p.nickname || "Player",
          avatarUrl: resolveAvatarUrl(live?.avatar_url ?? p.avatar_url) ?? null,
          animatedAvatarUrl: live?.animated_avatar_url ?? null,
          isHost: !!p.is_host,
          pending: p.status === "invited",
        };
      });
    setSeats(next);
    // The first load seeds who is already here without announcing them;
    // after that, a friend's first appearance on the board is announced
    // once, not on every refresh.
    const firstLoad = !seeded.current;
    seeded.current = true;
    for (const s of next) {
      if (s.pending || s.userId === user?.id || knownSeated.current.has(s.userId)) continue;
      knownSeated.current.add(s.userId);
      if (!firstLoad) onFriendJoinedRef.current?.(s);
    }
  }, [user?.id]);

  /** Sit down on a room opened by code. */
  useEffect(() => {
    if (!user || !profile || !code || attemptedCode.current === code) return;
    attemptedCode.current = code;
    void (async () => {
      const { data: row } = await supabase
        .from("game_rooms")
        .select("*")
        .eq("room_code", code.toUpperCase())
        .maybeSingle();
      if (!row || !isWordsRoom(row) || row.status === "cancelled") {
        onMissingRef.current?.();
        return;
      }
      const { data: existing } = await supabase
        .from("room_participants")
        .select("id, status")
        .eq("room_id", row.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (existing?.status === "invited") {
        await supabase.from("room_participants").update({ status: "joined" }).eq("id", existing.id);
      } else if (!existing) {
        await supabase.from("room_participants").insert({
          room_id: row.id,
          user_id: user.id,
          nickname: profile.nickname || "Player",
          avatar_url: profile.avatar_url,
          country_code: profile.country_code,
          is_host: false,
          status: "joined",
        });
      }
      setRoom(row);
      onRoomReadyRef.current?.(row);
    })();
  }, [user, profile, code]);

  /**
   * Make the room. Tried with the catalog key first; a live database that
   * has not had the `words` row applied refuses the foreign key, and the
   * room is stored keyless with `game_mode = 'words'` instead, which every
   * reader understands (src/utils/roomRoutes.ts).
   */
  const createRoom = useCallback(async (): Promise<Tables<"game_rooms"> | null> => {
    if (!user || !profile || room || creating) return room;
    setCreating(true);
    try {
      const base = {
        host_user_id: user.id,
        room_code: mintCode(),
        status: "waiting" as const,
        game_mode: "words",
        min_players: 1,
        max_players: 2,
        ...(await roomVisibilityFields(false)),
        last_activity_at: new Date().toISOString(),
      };
      let created: Tables<"game_rooms"> | null = null;
      const first = await supabase
        .from("game_rooms")
        .insert({ ...base, game_type_key: "words" })
        .select()
        .single();
      if (!first.error && first.data) created = first.data;
      else {
        const second = await supabase.from("game_rooms").insert(base).select().single();
        if (second.error || !second.data) {
          console.error("[Words] room create failed", first.error, second.error);
          return null;
        }
        created = second.data;
      }
      await supabase.from("room_participants").insert({
        room_id: created.id,
        user_id: user.id,
        nickname: profile.nickname || "Player",
        avatar_url: profile.avatar_url,
        country_code: profile.country_code,
        is_host: true,
        status: "joined",
      });
      attemptedCode.current = created.room_code;
      setRoom(created);
      onRoomReadyRef.current?.(created);
      return created;
    } finally {
      setCreating(false);
    }
  }, [user, profile, room, creating]);

  /** Invite one friend: a seat, the bell, the push. */
  const invite = useCallback(
    async (friend: { id: string; nickname: string; avatarUrl: string | null }): Promise<boolean> => {
      const target = room ?? (await createRoom());
      if (!target || !user) return false;
      const { data: existing } = await supabase
        .from("room_participants")
        .select("id")
        .eq("room_id", target.id)
        .eq("user_id", friend.id)
        .maybeSingle();
      if (!existing) {
        const { error } = await supabase.from("room_participants").insert({
          room_id: target.id,
          user_id: friend.id,
          status: "invited",
          nickname: friend.nickname,
          avatar_url: friend.avatarUrl,
          is_host: false,
        });
        if (error) {
          console.error("[Words] invite failed", error);
          return false;
        }
      }
      void sendInvitation(friend.id, target.id, true);
      void refreshSeats(target.id);
      return true;
    },
    [room, createRoom, user, sendInvitation, refreshSeats],
  );

  /** Seats and the room row, live. */
  useEffect(() => {
    if (!room) return;
    void refreshSeats(room.id);
    const ch = supabase
      .channel(`words-seats-${room.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_participants", filter: `room_id=eq.${room.id}` },
        () => void refreshSeats(room.id),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "game_rooms", filter: `id=eq.${room.id}` },
        (payload) => setRoom(payload.new as Tables<"game_rooms">),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [room?.id, refreshSeats]); // eslint-disable-line react-hooks/exhaustive-deps

  /** The board's own channel: state exchange and who is actually here. */
  useEffect(() => {
    if (!room || !user) return;
    const ch = supabase.channel(`words-board-${room.id}`, {
      config: { broadcast: { self: false }, presence: { key: user.id } },
    });
    channelRef.current = ch;

    const readPresence = () => {
      const state = ch.presenceState<{ userId: string }>();
      setConnected(new Set(Object.keys(state)));
    };

    ch.on("broadcast", { event: "state" }, ({ payload }) => {
      if (!isSharedState(payload)) return;
      const mine = getStateRef.current();
      if (hasNews(mine, payload)) {
        onIncomingRef.current(payload);
      } else if (hasNews(payload, mine)) {
        // They are behind; answer with ours.
        void ch.send({ type: "broadcast", event: "state", payload: mine });
      }
    })
      .on("broadcast", { event: "hello" }, () => {
        void ch.send({ type: "broadcast", event: "state", payload: getStateRef.current() });
      })
      .on("presence", { event: "sync" }, readPresence)
      .on("presence", { event: "join" }, readPresence)
      .on("presence", { event: "leave" }, readPresence)
      .subscribe(async (status) => {
        if (status !== "SUBSCRIBED") return;
        await ch.track({ userId: user.id });
        // Ask whoever is here for their copy; they answer only if it is
        // newer than ours, and we answer them the same way.
        void ch.send({ type: "broadcast", event: "hello", payload: {} });
      });

    return () => {
      channelRef.current = null;
      setConnected(new Set());
      void supabase.removeChannel(ch);
    };
  }, [room?.id, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const broadcast = useCallback((state: SharedState) => {
    void channelRef.current?.send({ type: "broadcast", event: "state", payload: state });
  }, []);

  const me = useMemo(() => seats.find((s) => s.userId === user?.id) ?? null, [seats, user?.id]);
  const friend = useMemo(() => seats.find((s) => s.userId !== user?.id) ?? null, [seats, user?.id]);

  return {
    room,
    seats,
    me,
    friend,
    friendOnline: friend ? connected.has(friend.userId) : false,
    isHost: !!room && room.host_user_id === user?.id,
    creating,
    createRoom,
    invite,
    broadcast,
  };
}
