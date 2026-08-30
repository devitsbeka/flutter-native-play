// Team Battle client engine (docs/GAME_TYPES_DESIGN.md §2).
//
// Deliberately its own context rather than a branch inside
// MultiplayerContextV2 — the TV stack set the precedent that a game type with
// its own server state machine gets its own client. The server
// (supabase/migrations/20260917100000_team_battle.sql) owns every decision:
// phases, deadlines, scoring, rotation, payouts. This file only mirrors the
// team_battle_state row, renders countdowns from its deadline, and calls
// tb_advance when a countdown dies — the first device to call it wins, the
// rest no-op.
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";
import { useAuth } from "./AuthContext";
import { toast } from "@/lib/toast";
import { t as tStandalone } from "@/utils/standaloneTranslation";
import { getQuestions } from "@/services/questionService";
import { shuffleArray } from "@/utils/shuffle";
import { getRandomGradient } from "@/config/roomGradients";

export type TBPhase = "rps" | "board" | "rapid_fire" | "super_vote" | "super_round" | "done";
export type TBTeam = "a" | "b";
export type TBGesture = "rock" | "paper" | "scissors";

export interface TBQuestion {
  question_text: string;
  correct_answer: string;
  shuffled_answers: string[];
  image_url?: string | null;
  video_url?: string | null;
  audio_url?: string | null;
}

export type TBRoom = Tables<"game_rooms">;
export type TBParticipant = Tables<"room_participants">;
export type TBTile = Tables<"team_battle_board">;
export type TBState = Tables<"team_battle_state">;

interface TeamBattleContextValue {
  room: TBRoom | null;
  participants: TBParticipant[];
  tiles: TBTile[];
  state: TBState | null;
  loading: boolean;
  isHost: boolean;
  myTeam: TBTeam | null;
  isSpotlight: boolean;
  createRoom: () => Promise<TBRoom | null>;
  joinRoom: (code: string) => Promise<boolean>;
  enterRoom: (roomId: string) => Promise<boolean>;
  leaveRoom: () => Promise<void>;
  setTeam: (team: TBTeam) => Promise<void>;
  addBot: (team: TBTeam) => Promise<void>;
  removeBot: (botId: string) => Promise<void>;
  startMatch: (categories: { uuid: string; name: string }[], tileCount?: number) => Promise<boolean>;
  submitRps: (gesture: TBGesture) => Promise<void>;
  pickTile: (tileId: string) => Promise<void>;
  submitAnswer: (questionIndex: number, answer: string) => Promise<{ correct: boolean } | null>;
  voteSuper: (candidate: string) => Promise<void>;
  submitSuper: (questionIndex: number, answer: string) => Promise<{ correct: boolean } | null>;
  advance: () => Promise<void>;
  settle: () => Promise<void>;
}

const TeamBattleContext = createContext<TeamBattleContextValue | null>(null);

const generateRoomCode = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
};

// Media rides along — dropping imageUrl here is what once shipped "Which
// athlete is pictured?" with no picture.
const asQuestions = (
  qs: {
    question: string;
    correctAnswer: string;
    incorrectAnswers: string[];
    imageUrl?: string | null;
    videoUrl?: string | null;
    audioUrl?: string | null;
  }[],
): TBQuestion[] =>
  qs.map((q) => ({
    question_text: q.question,
    correct_answer: q.correctAnswer,
    shuffled_answers: shuffleArray([q.correctAnswer, ...q.incorrectAnswers]),
    image_url: q.imageUrl ?? null,
    video_url: q.videoUrl ?? null,
    audio_url: q.audioUrl ?? null,
  }));

export function tileQuestions(tile: TBTile | undefined): TBQuestion[] {
  if (!tile) return [];
  return (tile.questions as unknown as TBQuestion[]) ?? [];
}

export function superQuestions(state: TBState | null): TBQuestion[] {
  const s = state?.super as Record<string, unknown> | null;
  return ((s?.questions as TBQuestion[] | undefined) ?? []);
}

export function TeamBattleProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const [room, setRoom] = useState<TBRoom | null>(null);
  const [participants, setParticipants] = useState<TBParticipant[]>([]);
  const [tiles, setTiles] = useState<TBTile[]>([]);
  const [state, setState] = useState<TBState | null>(null);
  const [loading, setLoading] = useState(false);
  const channelsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);
  const roomIdRef = useRef<string | null>(null);

  const me = participants.find((p) => p.user_id === user?.id) ?? null;
  const isHost = !!room && room.host_user_id === user?.id;
  const myTeam = (me?.team as TBTeam | null) ?? null;
  const isSpotlight = !!state && !!user && state.active_player === user.id;

  const fetchParticipants = useCallback(async (roomId: string) => {
    const { data } = await supabase
      .from("room_participants")
      .select("*")
      .eq("room_id", roomId)
      .order("joined_at", { ascending: true });
    if (data) setParticipants(data);
  }, []);

  const fetchMatch = useCallback(async (roomId: string) => {
    const { data: st } = await supabase
      .from("team_battle_state")
      .select("*")
      .eq("room_id", roomId)
      .maybeSingle();
    setState(st ?? null);
    if (st) {
      const { data: board } = await supabase
        .from("team_battle_board")
        .select("*")
        .eq("game_id", st.game_id)
        .order("tile_index", { ascending: true });
      setTiles(board ?? []);
    } else {
      setTiles([]);
    }
  }, []);

  const cleanupChannels = useCallback(() => {
    channelsRef.current.forEach((ch) => supabase.removeChannel(ch));
    channelsRef.current = [];
  }, []);

  // One subscription set per room. State rows drive phases; a new game_id in
  // a state UPDATE means a fresh board, so the whole match is refetched then.
  useEffect(() => {
    const roomId = room?.id ?? null;
    roomIdRef.current = roomId;
    cleanupChannels();
    if (!roomId) return;

    void fetchParticipants(roomId);
    void fetchMatch(roomId);

    const stateCh = supabase
      .channel(`tb-state-${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "team_battle_state", filter: `room_id=eq.${roomId}` },
        () => void fetchMatch(roomId),
      )
      .subscribe();
    const boardCh = supabase
      .channel(`tb-board-${roomId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "team_battle_board", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const row = payload.new as TBTile;
          setTiles((prev) => prev.map((t) => (t.id === row.id ? row : t)));
        },
      )
      .subscribe();
    const partCh = supabase
      .channel(`tb-participants-${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_participants", filter: `room_id=eq.${roomId}` },
        () => void fetchParticipants(roomId),
      )
      .subscribe();
    const roomCh = supabase
      .channel(`tb-room-${roomId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "game_rooms", filter: `id=eq.${roomId}` },
        (payload) => setRoom(payload.new as TBRoom),
      )
      .subscribe();
    channelsRef.current = [stateCh, boardCh, partCh, roomCh];

    return cleanupChannels;
  }, [room?.id, cleanupChannels, fetchMatch, fetchParticipants]);

  const createRoom = useCallback(async (): Promise<TBRoom | null> => {
    if (!user || !profile) {
      toast.error(tStandalone("extra.mpAuthRequired"));
      return null;
    }
    setLoading(true);
    try {
      let created: TBRoom | null = null;
      let error: { code?: string } | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const res = await supabase
          .from("game_rooms")
          .insert({
            host_user_id: user.id,
            room_code: generateRoomCode(),
            status: "waiting",
            game_type_key: "team_battle",
            game_mode: "team_battle",
            min_players: 2,
            max_players: 10,
            background_gradient: getRandomGradient(),
            last_activity_at: new Date().toISOString(),
          })
          .select()
          .single();
        error = res.error;
        created = res.data ?? null;
        if (!error || error.code !== "23505") break;
      }
      if (error || !created) throw error ?? new Error("room insert returned no row");

      const { error: hostErr } = await supabase.from("room_participants").insert({
        room_id: created.id,
        user_id: user.id,
        nickname: profile.nickname || "Player",
        avatar_url: profile.avatar_url,
        country_code: profile.country_code,
        is_host: true,
        status: "joined",
        team: "a",
      });
      if (hostErr) {
        await supabase.from("game_rooms").delete().eq("id", created.id);
        throw hostErr;
      }
      setRoom(created);
      return created;
    } catch (e) {
      console.error("[TB] createRoom failed", e);
      toast.error(tStandalone("teamBattle.createFailed"));
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  const enterRoomRow = useCallback(
    async (row: TBRoom): Promise<boolean> => {
      if (!user || !profile) return false;
      const { data: existing } = await supabase
        .from("room_participants")
        .select("id")
        .eq("room_id", row.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!existing) {
        // A running match takes no new players — the server-side rotation
        // and vote counts ignore mid-match joiners anyway, so don't let
        // someone sit in a room they cannot play in.
        if (row.status === "playing") {
          toast.error(tStandalone("teamBattle.matchInProgress"));
          return false;
        }
        const { count } = await supabase
          .from("room_participants")
          .select("id", { count: "exact", head: true })
          .eq("room_id", row.id);
        if ((count ?? 0) >= (row.max_players ?? 10)) {
          toast.error(tStandalone("teamBattle.roomFull"));
          return false;
        }
        const { error } = await supabase.from("room_participants").insert({
          room_id: row.id,
          user_id: user.id,
          nickname: profile.nickname || "Player",
          avatar_url: profile.avatar_url,
          country_code: profile.country_code,
          is_host: false,
          status: "joined",
        });
        if (error) {
          console.error("[TB] join failed", error);
          toast.error(tStandalone("teamBattle.joinFailed"));
          return false;
        }
      }
      setRoom(row);
      return true;
    },
    [user, profile],
  );

  const joinRoom = useCallback(
    async (code: string): Promise<boolean> => {
      const { data: row } = await supabase
        .from("game_rooms")
        .select("*")
        .eq("room_code", code.trim().toUpperCase())
        .eq("game_type_key", "team_battle")
        .maybeSingle();
      if (!row) {
        toast.error(tStandalone("teamBattle.roomNotFound"));
        return false;
      }
      return enterRoomRow(row);
    },
    [enterRoomRow],
  );

  const enterRoom = useCallback(
    async (roomId: string): Promise<boolean> => {
      const { data: row } = await supabase
        .from("game_rooms")
        .select("*")
        .eq("id", roomId)
        .maybeSingle();
      if (!row) return false;
      return enterRoomRow(row);
    },
    [enterRoomRow],
  );

  const leaveRoom = useCallback(async () => {
    const roomId = roomIdRef.current;
    if (roomId && user) {
      await supabase.from("room_participants").delete().eq("room_id", roomId).eq("user_id", user.id);
    }
    setRoom(null);
    setParticipants([]);
    setTiles([]);
    setState(null);
  }, [user]);

  const setTeam = useCallback(
    async (team: TBTeam) => {
      const roomId = roomIdRef.current;
      if (!roomId || !user) return;
      // Own-row update; RLS permits exactly this and the server re-validates
      // team shapes at start.
      await supabase
        .from("room_participants")
        .update({ team })
        .eq("room_id", roomId)
        .eq("user_id", user.id);
    },
    [user],
  );

  // Host-only, lobby-only: the server inserts a clearly-labeled AI player
  // (is_bot) whose turns it plays itself.
  const addBot = useCallback(async (team: TBTeam) => {
    const roomId = roomIdRef.current;
    if (!roomId) return;
    const { error } = await supabase.rpc("tb_add_bot", { p_room_id: roomId, p_team: team });
    if (error) {
      console.error("[TB] add bot failed", error);
      toast.error(error.message);
    }
  }, []);

  const removeBot = useCallback(async (botId: string) => {
    const roomId = roomIdRef.current;
    if (!roomId) return;
    const { error } = await supabase.rpc("tb_remove_bot", { p_room_id: roomId, p_bot_id: botId });
    if (error) console.error("[TB] remove bot failed", error);
  }, []);

  // The host's device assembles the board material through the golden-standard
  // question pipeline and hands it over; the server prices and validates it.
  const startMatch = useCallback(
    async (categories: { uuid: string; name: string }[], requestedTiles?: number): Promise<boolean> => {
      const roomId = roomIdRef.current;
      if (!roomId) return false;
      if (categories.length === 0) return false;
      setLoading(true);
      try {
        const teamSize = participants.filter((p) => p.team === "a").length;
        // Even by construction (both operands of max are even), within the
        // server's 12-tile cap, and large enough that everyone gets a turn.
        // The lobby's match-length picker can ask for a larger board; the
        // same floor and cap still apply, so the server never refuses it.
        const minTiles = Math.max(6, 2 * teamSize);
        const tileCount = requestedTiles
          ? Math.min(12, Math.max(minTiles, requestedTiles - (requestedTiles % 2)))
          : Math.min(12, minTiles);
        const difficulties: string[] = [];
        for (let i = 0; i < tileCount; i++) {
          difficulties.push(i < tileCount / 3 ? "easy" : i < (2 * tileCount) / 3 ? "medium" : "hard");
        }

        const pool = shuffleArray(categories);
        let poolIdx = 0;
        const nextCat = () => pool[poolIdx++ % pool.length];
        const fetchFor = async (cat: { uuid: string; name: string }) => ({
          cat,
          res: await getQuestions({ mode: "vs", categoryUuid: cat.uuid, categoryName: cat.name, count: 12 }),
        });

        // One fetch per tile plus the super round, all in flight at once —
        // a 10-tile board serialized was a 10-30s "Preparing…" stall on
        // mobile. Only tiles whose category came back short in the player's
        // language fall back to walking the pool sequentially.
        const fetched = await Promise.all(
          Array.from({ length: difficulties.length + 1 }, () => fetchFor(nextCat())),
        );

        const fill = async (initial: (typeof fetched)[number]) => {
          let current = initial;
          for (let tries = 0; tries < pool.length && current.res.questions.length < 5; tries++) {
            current = await fetchFor(nextCat());
          }
          return current.res.questions.length >= 5 ? current : null;
        };

        const tiles: Json[] = [];
        for (let i = 0; i < difficulties.length; i++) {
          const filled = await fill(fetched[i]);
          if (!filled) {
            toast.error(tStandalone("teamBattle.notEnoughQuestions"));
            return false;
          }
          tiles.push({
            category_id: filled.cat.uuid,
            category_name: filled.cat.name,
            difficulty: difficulties[i],
            questions: asQuestions(filled.res.questions) as unknown as Json,
          } as unknown as Json);
        }

        const superFilled = await fill(fetched[difficulties.length]);
        if (!superFilled) {
          toast.error(tStandalone("teamBattle.notEnoughQuestions"));
          return false;
        }
        const superRes = superFilled.res;

        const { error } = await supabase.rpc("tb_start_match", {
          p_room_id: roomId,
          p_board: {
            tiles,
            super_questions: asQuestions(superRes.questions) as unknown as Json,
          } as unknown as Json,
        });
        if (error) {
          console.error("[TB] start failed", error);
          toast.error(error.message);
          return false;
        }
        return true;
      } finally {
        setLoading(false);
      }
    },
    [participants],
  );

  const submitRps = useCallback(async (gesture: TBGesture) => {
    const roomId = roomIdRef.current;
    if (!roomId) return;
    const { error } = await supabase.rpc("tb_submit_rps", { p_room_id: roomId, p_throw: gesture });
    if (error) console.error("[TB] rps failed", error);
  }, []);

  const pickTile = useCallback(async (tileId: string) => {
    const roomId = roomIdRef.current;
    if (!roomId) return;
    const { error } = await supabase.rpc("tb_pick_tile", { p_room_id: roomId, p_tile_id: tileId });
    if (error) console.error("[TB] pick failed", error);
  }, []);

  const submitAnswer = useCallback(async (questionIndex: number, answer: string) => {
    const roomId = roomIdRef.current;
    if (!roomId) return null;
    const { data, error } = await supabase.rpc("tb_submit_answer", {
      p_room_id: roomId,
      p_question_index: questionIndex,
      p_answer: answer,
    });
    if (error) {
      console.error("[TB] answer failed", error);
      return null;
    }
    const result = data as { correct?: boolean; answered?: number } | null;
    // The RPC result is authoritative about where the turn stands — advance
    // the local counter from it directly, so the spotlight player's next
    // question never waits on (or is lost to) a realtime round-trip. The
    // small delay is the green/red reveal on the tapped answer.
    if (typeof result?.answered === "number") {
      const answered = result.answered;
      setTimeout(() => {
        setState((prev) =>
          prev && prev.phase === "rapid_fire" && answered > prev.turn_answers
            ? { ...prev, turn_answers: answered }
            : prev,
        );
      }, 550);
    }
    return { correct: !!result?.correct };
  }, []);

  const voteSuper = useCallback(async (candidate: string) => {
    const roomId = roomIdRef.current;
    if (!roomId) return;
    const { error } = await supabase.rpc("tb_vote_super", { p_room_id: roomId, p_candidate: candidate });
    if (error) console.error("[TB] vote failed", error);
  }, []);

  const submitSuper = useCallback(async (questionIndex: number, answer: string) => {
    const roomId = roomIdRef.current;
    if (!roomId) return null;
    const { data, error } = await supabase.rpc("tb_submit_super", {
      p_room_id: roomId,
      p_question_index: questionIndex,
      p_answer: answer,
    });
    if (error) {
      console.error("[TB] super answer failed", error);
      return null;
    }
    return { correct: !!(data as { correct?: boolean } | null)?.correct };
  }, []);

  const advance = useCallback(async () => {
    const roomId = roomIdRef.current;
    if (!roomId) return;
    const { error } = await supabase.rpc("tb_advance", { p_room_id: roomId });
    if (error) console.error("[TB] advance failed", error);
  }, []);

  const settle = useCallback(async () => {
    const roomId = roomIdRef.current;
    if (!roomId) return;
    const { error } = await supabase.rpc("tb_settle", { p_room_id: roomId });
    if (error) console.error("[TB] settle failed", error);
  }, []);

  const value = useMemo<TeamBattleContextValue>(
    () => ({
      room,
      participants,
      tiles,
      state,
      loading,
      isHost,
      myTeam,
      isSpotlight,
      createRoom,
      joinRoom,
      enterRoom,
      leaveRoom,
      setTeam,
      addBot,
      removeBot,
      startMatch,
      submitRps,
      pickTile,
      submitAnswer,
      voteSuper,
      submitSuper,
      advance,
      settle,
    }),
    [room, participants, tiles, state, loading, isHost, myTeam, isSpotlight,
     createRoom, joinRoom, enterRoom, leaveRoom, setTeam, addBot, removeBot,
     startMatch, submitRps, pickTile, submitAnswer, voteSuper, submitSuper,
     advance, settle],
  );

  return <TeamBattleContext.Provider value={value}>{children}</TeamBattleContext.Provider>;
}

export function useTeamBattle(): TeamBattleContextValue {
  const ctx = useContext(TeamBattleContext);
  if (!ctx) throw new Error("useTeamBattle must be used inside TeamBattleProvider");
  return ctx;
}
