// Versus King client engine (docs/GAME_TYPES_DESIGN.md §3).
//
// The co-op sibling of TeamBattleContext: one room of friends against the
// King. The server (supabase/migrations/20260921100000_versus_king.sql) owns
// every decision — the captain election, whose answer counts, round
// outcomes, the 3:3 blitz, the payout. This file mirrors the king_team_state
// row, renders countdowns from its deadline, and calls kt_advance when a
// countdown dies — the first device to call it wins, the rest no-op.
//
// The new tables/RPCs are not in the generated Supabase types yet (types.ts
// is regenerated only against a migrated database — CLAUDE.md rule 1), so
// reads and calls go through the same cast the other pre-migration features
// use.
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

export type VKPhase =
  | "captain_vote"
  | "question"
  | "reveal"
  | "round_result"
  | "blitz"
  | "done";

export interface VKQuestion {
  question_text: string;
  correct_answer: string;
  shuffled_answers: string[];
  image_url?: string | null;
}

export interface VKState {
  room_id: string;
  game_id: string;
  phase: VKPhase;
  round_index: number;
  question_index: number;
  deadline: string | null;
  captain_user_id: string | null;
  captain_votes: Record<string, string>;
  picks: Record<string, string>;
  final_answer: string | null;
  last_reveal: {
    final: string | null;
    correct_answer: string;
    was_correct: boolean;
    picks?: Record<string, string>;
    by_captain?: boolean;
    blitz?: boolean;
    round_index?: number;
    question_index?: number;
  } | null;
  round_correct: number;
  team_rounds: number;
  king_rounds: number;
  winner: "team" | "king" | null;
  settled: boolean;
}

export interface VKRound {
  id: string;
  room_id: string;
  game_id: string;
  round_index: number;
  category_id: string | null;
  category_name: string;
  questions: VKQuestion[];
}

export type VKRoom = Tables<"game_rooms">;
export type VKParticipant = Tables<"room_participants">;

interface VersusKingContextValue {
  room: VKRoom | null;
  participants: VKParticipant[];
  rounds: VKRound[];
  state: VKState | null;
  loading: boolean;
  isHost: boolean;
  isCaptain: boolean;
  createRoom: () => Promise<VKRoom | null>;
  joinRoom: (code: string) => Promise<boolean>;
  leaveRoom: () => Promise<void>;
  startMatch: (categories: { uuid: string; name: string }[]) => Promise<boolean>;
  voteCaptain: (candidate: string) => Promise<void>;
  pickAnswer: (option: string) => Promise<void>;
  lockFinal: (option: string) => Promise<void>;
  answerBlitz: (option: string) => Promise<{ correct: boolean } | null>;
  advance: () => Promise<void>;
  settle: () => Promise<void>;
}

const VersusKingContext = createContext<VersusKingContextValue | null>(null);

const generateRoomCode = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
};

const asQuestions = (
  qs: { question: string; correctAnswer: string; incorrectAnswers: string[]; imageUrl?: string | null }[],
): VKQuestion[] =>
  qs.map((q) => ({
    question_text: q.question,
    correct_answer: q.correctAnswer,
    shuffled_answers: shuffleArray([q.correctAnswer, ...q.incorrectAnswers]),
    image_url: q.imageUrl ?? null,
  }));

// Cast channel to the not-yet-generated tables/RPCs (see file header).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

/** The current round's material, or the blitz reserve when the state says so. */
export function currentQuestion(state: VKState | null, rounds: VKRound[]): VKQuestion | null {
  if (!state) return null;
  const roundIndex = state.phase === "blitz" ? 6 : state.round_index;
  const questionIndex = state.phase === "blitz" ? 0 : state.question_index;
  const round = rounds.find((r) => r.round_index === roundIndex);
  return round?.questions?.[questionIndex] ?? null;
}

export function VersusKingProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const [room, setRoom] = useState<VKRoom | null>(null);
  const [participants, setParticipants] = useState<VKParticipant[]>([]);
  const [rounds, setRounds] = useState<VKRound[]>([]);
  const [state, setState] = useState<VKState | null>(null);
  const [loading, setLoading] = useState(false);
  const channelsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);
  const roomIdRef = useRef<string | null>(null);

  const isHost = !!room && room.host_user_id === user?.id;
  const isCaptain = !!state && !!user && state.captain_user_id === user.id;

  const fetchParticipants = useCallback(async (roomId: string) => {
    const { data } = await supabase
      .from("room_participants")
      .select("*")
      .eq("room_id", roomId)
      .order("joined_at", { ascending: true });
    if (data) setParticipants(data);
  }, []);

  const fetchMatch = useCallback(async (roomId: string) => {
    const { data: st } = await db
      .from("king_team_state")
      .select("*")
      .eq("room_id", roomId)
      .maybeSingle();
    setState((st as VKState) ?? null);
    if (st) {
      const { data: board } = await db
        .from("king_team_board")
        .select("*")
        .eq("game_id", st.game_id)
        .order("round_index", { ascending: true });
      setRounds((board as VKRound[]) ?? []);
    } else {
      setRounds([]);
    }
  }, []);

  const cleanupChannels = useCallback(() => {
    channelsRef.current.forEach((ch) => supabase.removeChannel(ch));
    channelsRef.current = [];
  }, []);

  useEffect(() => {
    const roomId = room?.id ?? null;
    roomIdRef.current = roomId;
    cleanupChannels();
    if (!roomId) return;

    void fetchParticipants(roomId);
    void fetchMatch(roomId);

    const stateCh = supabase
      .channel(`vk-state-${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "king_team_state", filter: `room_id=eq.${roomId}` },
        () => void fetchMatch(roomId),
      )
      .subscribe();
    const partCh = supabase
      .channel(`vk-participants-${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_participants", filter: `room_id=eq.${roomId}` },
        () => void fetchParticipants(roomId),
      )
      .subscribe();
    const roomCh = supabase
      .channel(`vk-room-${roomId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "game_rooms", filter: `id=eq.${roomId}` },
        (payload) => setRoom(payload.new as VKRoom),
      )
      .subscribe();
    channelsRef.current = [stateCh, partCh, roomCh];

    return cleanupChannels;
  }, [room?.id, cleanupChannels, fetchMatch, fetchParticipants]);

  const createRoom = useCallback(async (): Promise<VKRoom | null> => {
    if (!user || !profile) {
      toast.error(tStandalone("extra.mpAuthRequired"));
      return null;
    }
    setLoading(true);
    try {
      let created: VKRoom | null = null;
      let error: { code?: string } | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const res = await supabase
          .from("game_rooms")
          .insert({
            host_user_id: user.id,
            room_code: generateRoomCode(),
            status: "waiting",
            game_type_key: "king",
            game_mode: "versus_king",
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
      });
      if (hostErr) {
        await supabase.from("game_rooms").delete().eq("id", created.id);
        throw hostErr;
      }
      setRoom(created);
      return created;
    } catch (e) {
      console.error("[VK] createRoom failed", e);
      toast.error(tStandalone("kingTeam.createFailed"));
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  const joinRoom = useCallback(
    async (code: string): Promise<boolean> => {
      if (!user || !profile) return false;
      const { data: row } = await supabase
        .from("game_rooms")
        .select("*")
        .eq("room_code", code.trim().toUpperCase())
        .eq("game_type_key", "king")
        .maybeSingle();
      if (!row) {
        toast.error(tStandalone("kingTeam.roomNotFound"));
        return false;
      }
      const { data: existing } = await supabase
        .from("room_participants")
        .select("id")
        .eq("room_id", row.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!existing) {
        // A running match takes no new players: the election happened and
        // the roster is what kt_start_match validated.
        if (row.status === "playing") {
          toast.error(tStandalone("kingTeam.matchInProgress"));
          return false;
        }
        const { count } = await supabase
          .from("room_participants")
          .select("id", { count: "exact", head: true })
          .eq("room_id", row.id);
        if ((count ?? 0) >= (row.max_players ?? 10)) {
          toast.error(tStandalone("kingTeam.roomFull"));
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
          console.error("[VK] join failed", error);
          toast.error(tStandalone("kingTeam.joinFailed"));
          return false;
        }
      }
      setRoom(row);
      return true;
    },
    [user, profile],
  );

  const leaveRoom = useCallback(async () => {
    const roomId = roomIdRef.current;
    if (roomId && user) {
      await supabase.from("room_participants").delete().eq("room_id", roomId).eq("user_id", user.id);
    }
    setRoom(null);
    setParticipants([]);
    setRounds([]);
    setState(null);
  }, [user]);

  // The host's device draws seven random categories (six rounds + the blitz
  // reserve) and fetches five questions each through the golden-standard
  // pipeline; the server validates the shape and runs the match.
  const startMatch = useCallback(
    async (categories: { uuid: string; name: string }[]): Promise<boolean> => {
      const roomId = roomIdRef.current;
      if (!roomId || categories.length === 0) return false;
      setLoading(true);
      try {
        const pool = shuffleArray(categories);
        let poolIdx = 0;
        const nextCat = () => pool[poolIdx++ % pool.length];
        const fetchFor = async (cat: { uuid: string; name: string }) => ({
          cat,
          res: await getQuestions({ mode: "vs", categoryUuid: cat.uuid, categoryName: cat.name, count: 5 }),
        });

        // Seven fetches in flight at once; a category that comes back short
        // in the player's language walks the pool for a replacement.
        const fetched = await Promise.all(Array.from({ length: 7 }, () => fetchFor(nextCat())));
        const fill = async (initial: (typeof fetched)[number]) => {
          let current = initial;
          for (let tries = 0; tries < pool.length && current.res.questions.length < 5; tries++) {
            current = await fetchFor(nextCat());
          }
          return current.res.questions.length >= 5 ? current : null;
        };

        const roundsPayload: Json[] = [];
        for (let i = 0; i < 6; i++) {
          const filled = await fill(fetched[i]);
          if (!filled) {
            toast.error(tStandalone("kingTeam.notEnoughQuestions"));
            return false;
          }
          roundsPayload.push({
            category_id: filled.cat.uuid,
            category_name: filled.cat.name,
            questions: asQuestions(filled.res.questions.slice(0, 5)) as unknown as Json,
          } as unknown as Json);
        }

        const blitzFilled = await fill(fetched[6]);
        if (!blitzFilled) {
          toast.error(tStandalone("kingTeam.notEnoughQuestions"));
          return false;
        }

        const { error } = await db.rpc("kt_start_match", {
          p_room_id: roomId,
          p_board: {
            rounds: roundsPayload,
            blitz: {
              category_id: blitzFilled.cat.uuid,
              category_name: blitzFilled.cat.name,
              questions: asQuestions(blitzFilled.res.questions.slice(0, 1)) as unknown as Json,
            },
          } as unknown as Json,
        });
        if (error) {
          console.error("[VK] start failed", error);
          toast.error(error.message);
          return false;
        }
        return true;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const voteCaptain = useCallback(async (candidate: string) => {
    const roomId = roomIdRef.current;
    if (!roomId) return;
    const { error } = await db.rpc("kt_vote_captain", { p_room_id: roomId, p_candidate: candidate });
    if (error) console.error("[VK] captain vote failed", error);
  }, []);

  const pickAnswer = useCallback(async (option: string) => {
    const roomId = roomIdRef.current;
    if (!roomId) return;
    const { error } = await db.rpc("kt_pick_answer", { p_room_id: roomId, p_option: option });
    if (error) console.error("[VK] pick failed", error);
  }, []);

  const lockFinal = useCallback(async (option: string) => {
    const roomId = roomIdRef.current;
    if (!roomId) return;
    const { error } = await db.rpc("kt_final_answer", { p_room_id: roomId, p_option: option });
    if (error) {
      console.error("[VK] final failed", error);
      toast.error(error.message);
    }
  }, []);

  const answerBlitz = useCallback(async (option: string) => {
    const roomId = roomIdRef.current;
    if (!roomId) return null;
    const { data, error } = await db.rpc("kt_blitz_answer", { p_room_id: roomId, p_option: option });
    if (error) {
      console.error("[VK] blitz failed", error);
      return null;
    }
    return { correct: !!(data as { correct?: boolean } | null)?.correct };
  }, []);

  const advance = useCallback(async () => {
    const roomId = roomIdRef.current;
    if (!roomId) return;
    const { error } = await db.rpc("kt_advance", { p_room_id: roomId });
    if (error) console.error("[VK] advance failed", error);
  }, []);

  const settle = useCallback(async () => {
    const roomId = roomIdRef.current;
    if (!roomId) return;
    const { error } = await db.rpc("kt_settle", { p_room_id: roomId });
    if (error) console.error("[VK] settle failed", error);
  }, []);

  const value = useMemo<VersusKingContextValue>(
    () => ({
      room,
      participants,
      rounds,
      state,
      loading,
      isHost,
      isCaptain,
      createRoom,
      joinRoom,
      leaveRoom,
      startMatch,
      voteCaptain,
      pickAnswer,
      lockFinal,
      answerBlitz,
      advance,
      settle,
    }),
    [room, participants, rounds, state, loading, isHost, isCaptain,
     createRoom, joinRoom, leaveRoom, startMatch, voteCaptain, pickAnswer,
     lockFinal, answerBlitz, advance, settle],
  );

  return <VersusKingContext.Provider value={value}>{children}</VersusKingContext.Provider>;
}

export function useVersusKing(): VersusKingContextValue {
  const ctx = useContext(VersusKingContext);
  if (!ctx) throw new Error("useVersusKing must be used inside VersusKingProvider");
  return ctx;
}
