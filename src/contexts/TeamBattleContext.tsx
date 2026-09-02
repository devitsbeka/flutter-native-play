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
import { roomVisibilityFields } from "@/utils/roomVisibility";
import type { Json, Tables } from "@/integrations/supabase/types";
import { useAuth } from "./AuthContext";
import { toast } from "@/lib/toast";
import { t as tStandalone } from "@/utils/standaloneTranslation";
import { getQuestions } from "@/services/questionService";
import { shuffleArray } from "@/utils/shuffle";
import { getRandomGradient } from "@/config/roomGradients";
import { botAvatarFor, resolveAvatarUrl } from "@/utils/avatarUtils";

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
  icon_slug?: string | null;
}

export type TBRoom = Tables<"game_rooms">;
export type TBParticipant = Tables<"room_participants">;
export type TBTile = Tables<"team_battle_board">;
export type TBState = Tables<"team_battle_state">;

/** One answered rapid-fire question, broadcast live so the room spectates. */
export interface TBPick {
  index: number;
  option: string;
  correct: boolean;
}

interface TeamBattleContextValue {
  room: TBRoom | null;
  participants: TBParticipant[];
  pendingInvites: TBParticipant[];
  tiles: TBTile[];
  state: TBState | null;
  loading: boolean;
  isHost: boolean;
  myTeam: TBTeam | null;
  isSpotlight: boolean;
  createRoom: (isPublic?: boolean, team?: TBTeam, teamSize?: number) => Promise<TBRoom | null>;
  joinRoom: (code: string) => Promise<boolean>;
  enterRoom: (roomId: string) => Promise<boolean>;
  leaveRoom: () => Promise<void>;
  setTeam: (team: TBTeam) => Promise<void>;
  addBot: (team: TBTeam) => Promise<void>;
  setCaptain: (userId: string) => Promise<void>;
  voteCaptain: (candidateId: string) => Promise<void>;
  manageSeat: (userId: string, action: "remove" | "move_a" | "move_b") => Promise<void>;
  removeBot: (botId: string) => Promise<void>;
  startMatch: (
    categories: { uuid: string; name: string }[],
    preferredTiles?: number,
  ) => Promise<boolean>;
  /** Why the last start attempt failed — the lobby shows it, since toasts
      are suppressed app-wide and a dead Start button explains nothing. */
  startError: string | null;
  submitRps: (gesture: TBGesture) => Promise<void>;
  pickTile: (tileId: string) => Promise<void>;
  submitAnswer: (questionIndex: number, answer: string) => Promise<{ correct: boolean } | null>;
  turnPicks: TBPick[];
  sendPick: (pick: TBPick) => void;
  playedBy: Record<string, string>;
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
    iconSlug?: string | null;
  }[],
): TBQuestion[] =>
  qs.map((q) => ({
    question_text: q.question,
    correct_answer: q.correctAnswer,
    shuffled_answers: shuffleArray([q.correctAnswer, ...q.incorrectAnswers]),
    image_url: q.imageUrl ?? null,
    video_url: q.videoUrl ?? null,
    audio_url: q.audioUrl ?? null,
    icon_slug: q.iconSlug ?? null,
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
  const [pendingInvites, setPendingInvites] = useState<TBParticipant[]>([]);
  const [tiles, setTiles] = useState<TBTile[]>([]);
  const [state, setState] = useState<TBState | null>(null);
  const [loading, setLoading] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const channelsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);
  const liveChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const roomIdRef = useRef<string | null>(null);
  const seatOpsRef = useRef(0);
  // Spectation state: the active player's answers this turn (broadcast, not
  // stored), and which player played each claimed tile (learned from state
  // updates as the match runs).
  const [turnPicks, setTurnPicks] = useState<TBPick[]>([]);
  const [playedBy, setPlayedBy] = useState<Record<string, string>>({});

  const me = participants.find((p) => p.user_id === user?.id) ?? null;
  const isHost = !!room && room.host_user_id === user?.id;
  const myTeam = (me?.team as TBTeam | null) ?? null;
  const isSpotlight = !!state && !!user && state.active_player === user.id;

  const fetchParticipants = useCallback(async (roomId: string) => {
    // While a seat operation is in flight, a realtime-triggered refetch can
    // read the row the host just optimistically removed (the server delete
    // hasn't committed yet) and resurrect the seat for a frame. manageSeat
    // refetches once the server has answered, so skipping here loses nothing.
    if (seatOpsRef.current > 0) return;
    // Invitees sit at status "invited" until they accept: shown greyed in
    // their reserved seat, but kept OUT of `participants` so they never
    // count toward the equal-teams gate or the board size. The realtime
    // channel refetches when they join.
    const { data } = await supabase
      .from("room_participants")
      .select("*")
      .eq("room_id", roomId)
      .in("status", ["joined", "ready", "playing", "invited"])
      .order("joined_at", { ascending: true });
    if (data) {
      // AI players wear one of the preset bot faces, keyed by their id, so
      // every surface shows the same face instead of an initial circle.
      // Human rows carry avatar SNAPSHOTS taken at insert time — stale after
      // a profile change or a redeploy of a hashed asset path — so overlay
      // the live profile avatar (the same fix useMyRooms carries) and run
      // the result through resolveAvatarUrl.
      const humanIds = data.filter((p) => !p.is_bot).map((p) => p.user_id);
      const { data: profs } = humanIds.length
        ? await supabase.from("profiles").select("user_id, avatar_url").in("user_id", humanIds)
        : { data: [] as { user_id: string; avatar_url: string | null }[] };
      const fresh = new Map((profs ?? []).map((pr) => [pr.user_id, pr.avatar_url]));
      const dressed = data.map((p) =>
        p.is_bot && !p.avatar_url
          ? { ...p, avatar_url: botAvatarFor(p.user_id) }
          : {
              ...p,
              avatar_url: resolveAvatarUrl(fresh.get(p.user_id) ?? p.avatar_url) ?? null,
            },
      );
      setParticipants(dressed.filter((p) => p.status !== "invited"));
      setPendingInvites(dressed.filter((p) => p.status === "invited"));
    }
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
    // The spectation feed: every answered question is broadcast here so the
    // rest of the room watches picks land in real time. self:true means the
    // spotlight player's own device shares the same history.
    const liveCh = supabase
      .channel(`tb-live-${roomId}`, { config: { broadcast: { self: true } } })
      .on("broadcast", { event: "pick" }, ({ payload }) => {
        const pick = payload as TBPick;
        setTurnPicks((prev) =>
          prev.some((p) => p.index === pick.index) ? prev : [...prev, pick],
        );
      })
      .subscribe();
    liveChannelRef.current = liveCh;
    channelsRef.current = [stateCh, boardCh, partCh, roomCh, liveCh];

    return () => {
      liveChannelRef.current = null;
      cleanupChannels();
    };
  }, [room?.id, cleanupChannels, fetchMatch, fetchParticipants]);

  // Each new tile starts a fresh pick history; a fresh game forgets who
  // played what.
  useEffect(() => {
    setTurnPicks([]);
  }, [state?.active_tile]);
  useEffect(() => {
    setTurnPicks([]);
    setPlayedBy({});
  }, [state?.game_id]);
  useEffect(() => {
    const tileId = state?.active_tile;
    const playerId = state?.active_player;
    if (!tileId || !playerId) return;
    setPlayedBy((prev) => (prev[tileId] === playerId ? prev : { ...prev, [tileId]: playerId }));
  }, [state?.active_tile, state?.active_player]);

  const sendPick = useCallback((pick: TBPick) => {
    void liveChannelRef.current?.send({ type: "broadcast", event: "pick", payload: pick });
  }, []);

  const createRoom = useCallback(async (isPublic = false, team: TBTeam = "a", teamSize = 5): Promise<TBRoom | null> => {
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
            // Two equal sides, as the host set them on the create screen.
            max_players: 2 * Math.max(2, Math.min(5, Math.round(teamSize))),
            ...(await roomVisibilityFields(isPublic)),
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
        // The side the host picked on the create screen. Everyone landed on
        // "a" before, so the host's own team was the one thing about their
        // match they could not choose.
        team,
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
        .select("id, status, team")
        .eq("room_id", row.id)
        .eq("user_id", user.id)
        .maybeSingle();
      // An invite-modal invitee arrives holding an "invited" row — accepting
      // means flipping it to joined, or they stay invisible in the lobby.
      // A team is NOT dealt: an invite from a + seat already carries its
      // side, and everyone else (approved join requests included) claims
      // one in the lobby by tapping the + seat they want.
      if (existing && existing.status === "invited") {
        await supabase
          .from("room_participants")
          .update({ status: "joined" })
          .eq("id", existing.id);
      }
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
        // No team on arrival: the seats are the choice, and the lobby
        // prompts the newcomer to claim one on the side they want. A
        // returning HOST keeps their flag — leaving deletes the row, and
        // the Public card's request short-circuits with "joined" for the
        // host without re-seating them, so this insert is how they get
        // their seat back.
        const { error } = await supabase.from("room_participants").insert({
          room_id: row.id,
          user_id: user.id,
          nickname: profile.nickname || "Player",
          avatar_url: profile.avatar_url,
          country_code: profile.country_code,
          is_host: row.host_user_id === user.id,
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
    setPendingInvites([]);
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

  // Host-only: name a team's captain — on a tied match that captain plays
  // the super round (20260921100000_tb_captains.sql).
  const setCaptain = useCallback(async (userId: string) => {
    const roomId = roomIdRef.current;
    if (!roomId) return;
    const { error } = await supabase.rpc("tb_set_captain", {
      p_room_id: roomId,
      p_user_id: userId,
    });
    if (error) {
      console.error("[TB] set captain failed", error);
      toast.error(error.message);
    }
  }, []);

  // Any teammate: cast (or change) a captain vote — the server re-tallies
  // the team and the plurality leader wears is_captain
  // (20260921150000_tb_captain_vote.sql).
  const voteCaptain = useCallback(
    async (candidateId: string) => {
      const roomId = roomIdRef.current;
      if (!roomId) return;
      const { error } = await supabase.rpc("tb_vote_captain", {
        p_room_id: roomId,
        p_candidate: candidateId,
      });
      if (error) {
        console.error("[TB] captain vote failed", error);
        toast.error(error.message);
      } else {
        void fetchParticipants(roomId);
      }
    },
    [fetchParticipants],
  );

  // Host-only seat management (lobby_manage_seat): remove a pending invite,
  // a bot, or a player, or move someone to a team. Optimistic — the seat
  // changes instantly (realtime DELETE events don't reliably reach filtered
  // channels), and a server refusal restores the truth with a toast.
  const manageSeat = useCallback(
    async (userId: string, action: "remove" | "move_a" | "move_b") => {
      const roomId = roomIdRef.current;
      if (!roomId) return;
      seatOpsRef.current += 1;
      if (action === "remove") {
        setParticipants((prev) => prev.filter((p) => p.user_id !== userId));
        setPendingInvites((prev) => prev.filter((p) => p.user_id !== userId));
      } else {
        const team = action === "move_a" ? "a" : "b";
        const move = (prev: TBParticipant[]) =>
          prev.map((p) => (p.user_id === userId ? { ...p, team, is_captain: false } : p));
        setParticipants(move);
        setPendingInvites(move);
      }
      try {
        const { error } = await supabase.rpc("lobby_manage_seat", {
          p_room_id: roomId,
          p_user_id: userId,
          p_action: action,
        });
        if (error) {
          console.error("[TB] manage seat failed", error);
          toast.error(error.message);
        }
      } finally {
        seatOpsRef.current -= 1;
        // Converge on the server's truth either way: confirms the change on
        // success, restores the seat on a refusal.
        void fetchParticipants(roomId);
      }
    },
    [fetchParticipants],
  );

  // The host's device assembles the board material through the golden-standard
  // question pipeline and hands it over; the server prices and validates it.
  const startMatch = useCallback(
    async (
      categories: { uuid: string; name: string }[],
      preferredTiles?: number,
    ): Promise<boolean> => {
      const roomId = roomIdRef.current;
      if (!roomId) return false;
      setStartError(null);
      if (categories.length === 0) {
        setStartError(tStandalone("teamBattle.notEnoughQuestions"));
        return false;
      }
      setLoading(true);
      try {
        const teamSize = participants.filter((p) => p.team === "a").length;
        // Two rounds per seated player (teams are equal by the server's own
        // rule, so 4 per team-size). Even by construction, within the
        // server's 20-tile cap (20260921210000), floored at 4 for a 1v1.
        const minTiles = Math.max(4, 4 * teamSize);
        const wanted = preferredTiles ?? minTiles;
        const tileCount = Math.min(20, Math.max(minTiles, wanted - (wanted % 2)));
        const difficulties: string[] = [];
        for (let i = 0; i < tileCount; i++) {
          difficulties.push(i < tileCount / 3 ? "easy" : i < (2 * tileCount) / 3 ? "medium" : "hard");
        }

        const pool = shuffleArray(categories);
        let poolIdx = 0;
        const nextCat = () => pool[poolIdx++ % pool.length];
        // A turn is a fixed three minutes now, not a fixed question count —
        // a fast player burns through far more than the old 12, so each
        // tile ships as many as the bank will give (a short bank just ends
        // the turn early, as before).
        const fetchFor = async (cat: { uuid: string; name: string }) => ({
          cat,
          res: await getQuestions({ mode: "vs", categoryUuid: cat.uuid, categoryName: cat.name, count: 40 }),
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
            setStartError(tStandalone("teamBattle.notEnoughQuestions"));
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
          setStartError(tStandalone("teamBattle.notEnoughQuestions"));
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
          // Three minutes on the clock, as many questions as they can
          // answer (20260924100000). On a database that still clamps at 90
          // the RPC refuses — retried once at the old maximum so a match
          // can still start before the migration lands.
          p_turn_seconds: 180,
        });
        if (error && /between 20 and 90/.test(error.message ?? "")) {
          const retry = await supabase.rpc("tb_start_match", {
            p_room_id: roomId,
            p_board: {
              tiles,
              super_questions: asQuestions(superRes.questions) as unknown as Json,
            } as unknown as Json,
            p_turn_seconds: 90,
          });
          if (!retry.error) return true;
          console.error("[TB] start failed", retry.error);
          setStartError(retry.error.message);
          toast.error(retry.error.message);
          return false;
        }
        if (error) {
          console.error("[TB] start failed", error);
          setStartError(error.message);
          toast.error(error.message);
          return false;
        }
        return true;
      } catch (e) {
        // A thrown fetch used to vanish into a void'd promise — the button
        // just did nothing. Surface it where the host is looking.
        console.error("[TB] start failed", e);
        setStartError(e instanceof Error ? e.message : String(e));
        return false;
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
      pendingInvites,
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
      setCaptain,
      voteCaptain,
      manageSeat,
      startMatch,
      startError,
      submitRps,
      pickTile,
      submitAnswer,
      turnPicks,
      sendPick,
      playedBy,
      voteSuper,
      submitSuper,
      advance,
      settle,
    }),
    [room, participants, pendingInvites, tiles, state, loading, isHost, myTeam, isSpotlight,
     createRoom, joinRoom, enterRoom, leaveRoom, setTeam, addBot, removeBot,
     setCaptain, voteCaptain, manageSeat, startMatch, startError, submitRps, pickTile, submitAnswer,
     turnPicks, sendPick, playedBy, voteSuper, submitSuper, advance, settle],
  );

  return <TeamBattleContext.Provider value={value}>{children}</TeamBattleContext.Provider>;
}

export function useTeamBattle(): TeamBattleContextValue {
  const ctx = useContext(TeamBattleContext);
  if (!ctx) throw new Error("useTeamBattle must be used inside TeamBattleProvider");
  return ctx;
}
