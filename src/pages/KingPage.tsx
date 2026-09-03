import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Tables } from "@/integrations/supabase/types";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, Crown } from "lucide-react";
import { DynamicIcon } from "@/components/shared/DynamicIcon";
import { containsBlockedText } from "@/utils/contentFilter";
import iconKingMascot from "@/assets/play-chooser/icon-king.webp";
import crownIconAsset from "@/assets/crown-icon.png";
import iconAnswerCorrect from "@/assets/answer-correct-3d.png";
import iconAnswerWrong from "@/assets/answer-wrong-3d.png";
import { resolveAvatarUrl } from "@/utils/avatarUtils";
import { supabase } from "@/integrations/supabase/client";
import { roomVisibilityFields } from "@/utils/roomVisibility";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useServerDeadline } from "@/hooks/useServerDeadline";
import { useGameInvitations } from "@/hooks/useGameInvitations";
import { usePlayerProfile } from "@/contexts/PlayerProfileContext";
import { readAppLanguage } from "@/utils/appLanguage";
import { toast } from "@/lib/toast";
import { InviteFriendsModal } from "@/components/team/InviteFriendsModal";
import { RoomIconPickerModal } from "@/components/team/RoomIconPickerModal";
import { UniversalLobby, type LobbyPlayer } from "@/components/lobby/UniversalLobby";
import { LOBBY_SCENES } from "@/utils/lobbyScene";
import { useFriends } from "@/hooks/useFriends";
import { useNotifications } from "@/hooks/useNotifications";
import coinIconAsset from "@/assets/tb-lobby/coin.png";
import {
  CaptainChip,
  CaptainInfoModal,
  AnimatedCoinPill,
  type InviteEntry,
  PlusSeat,
  Seat,
  SeatMenu,
  StartButton,
} from "@/components/lobby/LilacLobby";

const CARD_SHADOW = "0px 2px 8px 0px rgba(102,51,153,0.06), 0px 8px 24px 0px rgba(102,51,153,0.12)";

// The duel plays on the game screens' periwinkle (same as Team Battle), so
// the light cards carry the contrast and the purple CTA no longer sinks
// into a near-identical background — CTAs are white with purple type.
// A column: the header, score and question scroll in the middle; the one
// action of the moment — "I know it!", the captain's lock, "next" — sits in
// a footer pinned to the bottom, where every other game screen keeps its
// button. It used to ride under the question, which put it at a different
// height every phase and, on a tall puzzle, below the fold.
const DUEL_SHELL =
  "h-[calc(100dvh_-_var(--safe-top)_-_var(--safe-bottom))] overflow-hidden bg-[#7E7BDC] flex flex-col";
const DUEL_BODY = "flex-1 min-h-0 overflow-y-auto";
const DUEL_FOOTER = "shrink-0 max-w-md mx-auto w-full px-5 pt-3 pb-5";
const DUEL_CTA =
  "rounded-[20px] p-4 bg-white text-[#6D28D9] font-bold shadow-[0px_4px_0px_0px_rgba(64,38,102,0.25)] active:translate-y-[2px] transition-transform";

// Logic puzzles run long: the type steps down with length so the whole
// question fits a small viewport without the page needing to scroll.
const qTextSize = (s: string) =>
  s.length > 260
    ? "text-[13px] leading-snug"
    : s.length > 150
      ? "text-[15px] leading-snug"
      : "text-[17px] leading-relaxed";

const OPTION_LABELS = ["A", "B", "C", "D", "E", "F"];

/**
 * Phase-flip tap guard. Every duel phase puts its CTA in the same spot, so
 * the tap that ends one phase lands where the next phase's button appears —
 * the captain tapped "next", the fresh question's "I know it!" was already
 * under their finger, and the options opened before anyone had read the
 * question. The button that arrives on a phase change ignores taps for a
 * beat; a deliberate press half a second later works exactly as before.
 */
function useArmedCta(key: unknown) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    setArmed(false);
    const id = window.setTimeout(() => setArmed(true), 800);
    return () => window.clearTimeout(id);
  }, [key]);
  return armed;
}

/**
 * The duel scoreboard — two chunky score chips instead of bare numbers on
 * white. The King wears his own blue (the mascot's), the challenger side
 * wears gold; the "first to 6" rule sits between them. Shared by the solo
 * and the co-op duel, which kept two identical bare rows before.
 */
function DuelScoreRow({
  youLabel,
  youScore,
  kingScore,
  ruleLabel,
  kingLabel,
}: {
  youLabel: string;
  youScore: number;
  kingScore: number;
  ruleLabel: string;
  kingLabel: string;
}) {
  const chip = (label: string, score: number, stroke: string, depth: string, labelColor: string) => (
    <div
      className="min-w-[104px] px-4 py-1.5 text-center rounded-2xl bg-white/90"
      style={{ border: `2px solid ${stroke}`, boxShadow: `0px 3px 0px 0px ${depth}` }}
    >
      <p className="text-[11px] font-bold" style={{ color: labelColor }}>
        {label}
      </p>
      <p className="font-display text-2xl font-bold leading-7 text-[#402666]">{score}</p>
    </div>
  );
  return (
    <div className="flex items-center justify-center gap-3 py-2">
      {chip(youLabel, youScore, "#F2C14E", "#E3AC30", "#A16207")}
      <span className="text-white/70 text-xs">{ruleLabel}</span>
      {chip(kingLabel, kingScore, "#7BA3F0", "#5F8BE0", "#3565C9")}
    </div>
  );
}

/**
 * The duel is billed like a fight card: "Trivia King VS <the team>", with
 * the team's icon when the host has dressed one (owner's direction). A
 * lounge that hasn't been named yet falls back to the plain game title.
 */
function DuelTitle({
  t,
  teamName,
  teamIcon,
}: {
  t: (k: string) => string;
  teamName?: string | null;
  teamIcon?: string | null;
}) {
  return (
    <h1 className="font-display text-xl font-bold text-white flex items-center gap-2 min-w-0">
      <img alt="" src={iconKingMascot} className="w-8 h-8 object-contain shrink-0" />
      {teamName ? (
        <>
          <span className="shrink-0 whitespace-nowrap">{t("king.vsTitle")}</span>
          {teamIcon && <img alt="" src={teamIcon} className="w-7 h-7 object-contain shrink-0" />}
          <span className="truncate min-w-0">{teamName}</span>
        </>
      ) : (
        <span className="truncate">{t("king.title")}</span>
      )}
    </h1>
  );
}

// What king_state() sends back; the reveal fields ride only on submit/expire.
interface KingState {
  match_id: string;
  status: "playing" | "won" | "lost" | "abandoned";
  player_score: number;
  king_score: number;
  question_number: number;
  question?: {
    question_text: string;
    image_url?: string | null;
    icon_slug?: string | null;
    think_deadline: string;
  };
  options?: string[];
  commit_deadline?: string;
  correct?: boolean;
  correct_answer?: string;
  explanation?: string;
}

type Stage = "intro" | "thinking" | "commit" | "reveal" | "result";

/** The shared co-op duel state (king_team_state, 20260921170000). */
interface TeamView {
  match_id: string;
  room_id: string;
  status: "playing" | "won" | "lost";
  captain: string;
  team_score: number;
  king_score: number;
  question_number: number;
  suggestions: Record<string, string>;
  last_result?: {
    question_text: string;
    chosen: string | null;
    correct: boolean;
    correct_answer: string;
    explanation?: string | null;
  } | null;
  question?: {
    question_text: string;
    image_url?: string | null;
    icon_slug?: string | null;
    think_deadline: string;
  };
  options?: string[];
  commit_deadline?: string;
}

/**
 * /king — MyTrivia King (docs/GAME_TYPES_DESIGN.md §3). Solo and entirely
 * RPC-driven: the server holds the question pool, both deadlines, the
 * judgment, and the payout. This page's whole job is the ritual — a minute
 * of thinking with nothing to tap, a short commit, and the explanation.
 */
export default function KingPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  const [stage, setStage] = useState<Stage>("intro");
  const [state, setState] = useState<KingState | null>(null);
  const [reveal, setReveal] = useState<KingState | null>(null);
  const [busy, setBusy] = useState(false);
  const { friends } = useFriends();
  const { unreadCount } = useNotifications();
  // The pool for the player's language can be empty; a toast alone made the
  // start button look dead, so the intro card says it in place.
  const [noPool, setNoPool] = useState(false);

  const matchIdRef = useRef<string | null>(null);
  matchIdRef.current = state?.match_id ?? matchIdRef.current;

  const fail = useCallback(
    (error: { message?: string } | null) => {
      if (error?.message?.includes("KING_NO_QUESTIONS")) {
        setNoPool(true);
        setStage("intro");
      } else if (error) {
        console.error("[King]", error);
        toast.error(error.message ?? "error");
      }
    },
    [],
  );

  // Where a state row puts the UI: mid-question resumes into the right
  // stage; a finished match goes straight to the scoreboard.
  const applyState = useCallback((s: KingState) => {
    setState(s);
    if (s.status !== "playing") setStage("result");
    else if (s.options) setStage("commit");
    else if (s.question) setStage("thinking");
    else setStage("intro");
  }, []);

  const start = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("king_start_match", {
      p_language: readAppLanguage("en"),
    });
    setBusy(false);
    if (error) return fail(error);
    applyState(data as unknown as KingState);
  }, [busy, applyState, fail]);

  const draw = useCallback(async () => {
    const matchId = matchIdRef.current;
    if (!matchId || busy) return;
    setBusy(true);
    setReveal(null);
    const { data, error } = await supabase.rpc("king_draw_question", { p_match_id: matchId });
    setBusy(false);
    if (error) return fail(error);
    setNoPool(false);
    applyState(data as unknown as KingState);
  }, [busy, applyState, fail]);

  const showOptions = useCallback(async () => {
    const matchId = matchIdRef.current;
    if (!matchId) return;
    const { data, error } = await supabase.rpc("king_show_options", { p_match_id: matchId });
    if (error) return fail(error);
    applyState(data as unknown as KingState);
  }, [applyState, fail]);

  // What THIS device sent, for the reveal's "you picked" row — the server
  // reveal carries only the truth, and a timeout locked nothing.
  const [myPick, setMyPick] = useState<string | null>(null);
  const submit = useCallback(
    async (answer: string) => {
      const matchId = matchIdRef.current;
      if (!matchId || busy) return;
      setBusy(true);
      const { data, error } = await supabase.rpc("king_submit_answer", {
        p_match_id: matchId,
        p_answer: answer,
      });
      setBusy(false);
      if (error) return fail(error);
      const s = data as unknown as KingState;
      setMyPick(answer);
      setState(s);
      setReveal(s);
      setStage("reveal");
    },
    [busy, fail],
  );

  const stageRef = useRef<Stage>("intro");
  stageRef.current = stage;

  // The expiry claim is retried by useServerDeadline until the SERVER clock
  // agrees (it refuses inside the 2s wire grace, and a fast device clock
  // just means a couple of refused early tries). A claim that fails because
  // a submit landed meanwhile is not an error worth showing.
  const expire = useCallback(async () => {
    const matchId = matchIdRef.current;
    if (!matchId || stageRef.current !== "commit") return;
    const { data, error } = await supabase.rpc("king_expire_question", { p_match_id: matchId });
    if (error || stageRef.current !== "commit") {
      if (error) console.warn("[King] expire not accepted yet:", error.message);
      return;
    }
    const s = data as unknown as KingState;
    setMyPick(null);
    setState(s);
    setReveal(s);
    setStage("reveal");
  }, []);

  const abandon = useCallback(async () => {
    const matchId = matchIdRef.current;
    if (!matchId) return navigate(-1);
    await supabase.rpc("king_abandon_match", { p_match_id: matchId });
    navigate(-1);
  }, [navigate]);

  // Resume a running match the moment a signed-in player lands here.
  useEffect(() => {
    if (user) void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ── the lounge is a real room ────────────────────────────────────────────
  // /king carries a king-typed game_rooms row: created on arrival (the code
  // goes into the URL so refresh and share address the same room), or joined
  // via ?code. Friends invited from here land IN this room. Everyone still
  // plays their own duel against the King — the host's Start broadcasts so
  // the whole couch begins together; the co-op captain engine comes next.
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [kingRoom, setKingRoom] = useState<Tables<"game_rooms"> | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const nameAttempted = useRef(false);
  const [kingParts, setKingParts] = useState<Tables<"room_participants">[]>([]);
  const [kingPending, setKingPending] = useState<Tables<"room_participants">[]>([]);
  const [seatMenu, setSeatMenu] = useState<Tables<"room_participants"> | null>(null);
  // The captain sheet: who leads the couch, and the vote that decides it.
  const [captainInfoOpen, setCaptainInfoOpen] = useState(false);
  const roomAttempted = useRef(false);
  // Versus King is friends-only by owner's decision: the couch fills by
  // invitation, never by being found. Whatever the create screen said, this
  // lounge's room is private — and the public feed drops king rooms too
  // (filterPublicRooms), so one published by an older build stays unlisted.
  const publishRef = useRef<boolean>(false);
  const kingRoomRef = useRef<Tables<"game_rooms"> | null>(null);
  kingRoomRef.current = kingRoom;
  const channelRef = useRef<RealtimeChannel | null>(null);
  const seatOpRef = useRef(0);

  useEffect(() => {
    if (!user || !profile || roomAttempted.current) return;
    roomAttempted.current = true;
    const code = searchParams.get("code");
    void (async () => {
      if (code) {
        const { data: row } = await supabase
          .from("game_rooms")
          .select("*")
          .eq("room_code", code.toUpperCase())
          .eq("game_type_key", "king")
          .maybeSingle();
        if (row) {
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
          setKingRoom(row);
          return;
        }
      }
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      const newCode = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
      const { data: room, error } = await supabase
        .from("game_rooms")
        .insert({
          host_user_id: user.id,
          room_code: newCode,
          status: "waiting",
          game_type_key: "king",
          game_mode: "king",
          min_players: 1,
          max_players: 11,
          ...(await roomVisibilityFields(publishRef.current)),
          last_activity_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error || !room) return;
      await supabase.from("room_participants").insert({
        room_id: room.id,
        user_id: user.id,
        nickname: profile.nickname || "Player",
        avatar_url: profile.avatar_url,
        country_code: profile.country_code,
        is_host: true,
        status: "joined",
      });
      setKingRoom(room);
      navigate(`/king?code=${room.room_code}`, { replace: true });
    })();
  }, [user, profile, searchParams, navigate]);

  // A team needs a name. The host's device asks the same AI namer the
  // classic create screen uses the first time an unnamed lounge opens;
  // everyone else picks the name up off the room row (realtime below).
  useEffect(() => {
    if (!kingRoom || kingRoom.room_name || nameAttempted.current) return;
    if (kingRoom.host_user_id !== user?.id) return;
    nameAttempted.current = true;
    const roomId = kingRoom.id;
    void supabase.functions
      .invoke("generate-room-name", { body: { language: readAppLanguage() } })
      .then(async ({ data }) => {
        const name = ((data?.name as string) || "")
          .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1F100}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1FA00}-\u{1FAFF}]/gu, "")
          .trim();
        if (!name) return;
        await supabase.from("game_rooms").update({ room_name: name }).eq("id", roomId);
        setKingRoom((prev) => (prev && prev.id === roomId ? { ...prev, room_name: name } : prev));
      });
  }, [kingRoom, user?.id]);

  // The host dresses the team: an icon and a name in one sheet (the same
  // picker the classic create screen uses, with the AI namer silenced so it
  // never fights what the host typed). Both land on the room row and ride
  // realtime to everyone on the couch — and into the duel's header.
  const saveTeamLook = async (iconUrl: string, newName: string) => {
    const name = newName.trim();
    if (!kingRoom || !name) return;
    if (containsBlockedText(name)) {
      toast.error(t("extra.textNotAllowed"));
      return;
    }
    setRenameOpen(false);
    const { error } = await supabase
      .from("game_rooms")
      .update({ room_name: name, room_icon: iconUrl })
      .eq("id", kingRoom.id);
    if (error) toast.error(error.message);
    else setKingRoom((prev) => (prev ? { ...prev, room_name: name, room_icon: iconUrl } : prev));
  };

  const refreshKingParts = useCallback(async () => {
    const roomId = kingRoomRef.current?.id;
    if (!roomId) return;
    // Skip realtime refetches while a seat removal is in flight — reading the
    // not-yet-deleted row would resurrect the seat for a frame. The removal
    // handler refetches once the server answers.
    if (seatOpRef.current > 0) return;
    const { data } = await supabase
      .from("room_participants")
      .select("*")
      .eq("room_id", roomId)
      .in("status", ["joined", "ready", "playing", "invited"])
      .order("joined_at", { ascending: true });
    if (data) {
      // Participant rows carry avatar SNAPSHOTS taken at insert time — stale
      // after a profile change or a redeploy of a hashed asset path — so
      // overlay the live profile avatar and recover what remains.
      const ids = data.map((part) => part.user_id);
      const { data: profs } = ids.length
        ? await supabase.from("profiles").select("user_id, avatar_url").in("user_id", ids)
        : { data: [] as { user_id: string; avatar_url: string | null }[] };
      const fresh = new Map((profs ?? []).map((pr) => [pr.user_id, pr.avatar_url]));
      const resolved = data.map((part) => ({
        ...part,
        avatar_url: resolveAvatarUrl(fresh.get(part.user_id) ?? part.avatar_url) ?? null,
      }));
      setKingParts(resolved.filter((part) => part.status !== "invited"));
      setKingPending(resolved.filter((part) => part.status === "invited"));
    }
  }, []);

  // Any seated human: cast (or change) a captain vote. The couch is one
  // team, so the server tallies everyone on it and the plurality leader
  // wears is_captain — the same tb_vote_captain the arena uses, which
  // serves King rooms since 20260925100000. The host is a candidate like
  // anybody else: the couch can vote them out of the armband before the
  // duel starts, and king_team_start seats whoever wears it.
  const voteKingCaptain = useCallback(
    async (candidateId: string) => {
      const roomId = kingRoomRef.current?.id;
      if (!roomId) return;
      const { error } = await supabase.rpc("tb_vote_captain", {
        p_room_id: roomId,
        p_candidate: candidateId,
      });
      if (error) {
        console.error("[king] captain vote failed", error);
        toast.error(error.message);
      } else {
        void refreshKingParts();
      }
    },
    [refreshKingParts],
  );

  useEffect(() => {
    if (!kingRoom) return;
    const fetchParts = refreshKingParts;
    void fetchParts();
    const ch = supabase
      .channel(`king-room-${kingRoom.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_participants", filter: `room_id=eq.${kingRoom.id}` },
        () => void fetchParts(),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "game_rooms", filter: `id=eq.${kingRoom.id}` },
        (payload) => setKingRoom(payload.new as Tables<"game_rooms">),
      )
      .on("broadcast", { event: "start" }, () => {
        if (stageRef.current === "intro") void draw();
      })
      .subscribe();
    channelRef.current = ch;
    return () => {
      channelRef.current = null;
      void supabase.removeChannel(ch);
    };
  }, [kingRoom, draw, refreshKingParts]);

  // The host's Start begins the duel for the whole couch; a broadcast never
  // reaches its own sender, so the host draws locally too.
  const startForEveryone = useCallback(() => {
    void channelRef.current?.send({ type: "broadcast", event: "start", payload: {} });
    void draw();
  }, [draw]);

  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const inviteToGame = useCallback(
    async (entry: InviteEntry) => {
      if (!kingRoom) return;
      const { data: existing } = await supabase
        .from("room_participants")
        .select("id")
        .eq("room_id", kingRoom.id)
        .eq("user_id", entry.id)
        .maybeSingle();
      if (existing) {
        setInvitedIds((prev) => new Set([...prev, entry.id]));
        return;
      }
      const { error } = await supabase.from("room_participants").insert({
        room_id: kingRoom.id,
        user_id: entry.id,
        status: "invited",
        nickname: entry.nickname,
        avatar_url: entry.avatarUrl,
        is_host: false,
      });
      if (error) {
        console.error("[King] invite failed", error);
        toast.error(t("extra.inviteFailed"));
        return;
      }
      setInvitedIds((prev) => new Set([...prev, entry.id]));
      toast.success(t("extra.inviteSent"));
    },
    [kingRoom, t],
  );

  // Friends and room members picked on the create screen ride in via router
  // state, captured at mount (the ?code= replace would drop it) and seated
  // as invited the moment this lounge's room exists.
  const { sendInvitation } = useGameInvitations();
  const { openProfile } = usePlayerProfile();
  const handoffRef = useRef<{ id: string; nickname: string; avatarUrl: string | null }[] | null>(
    (location.state as { invite?: { id: string; nickname: string; avatarUrl: string | null }[] } | null)
      ?.invite ?? null,
  );
  useEffect(() => {
    const list = handoffRef.current;
    if (!kingRoom || !list || list.length === 0) return;
    handoffRef.current = null;
    void (async () => {
      for (const person of list) {
        await inviteToGame({
          id: person.id,
          nickname: person.nickname,
          avatarUrl: person.avatarUrl,
          online: false,
        });
        await sendInvitation(person.id, kingRoom.id);
      }
    })();
  }, [kingRoom, inviteToGame, sendInvitation]);

  // ── the co-op duel (20260921170000): one match, the captain decides ──────
  // With two or more humans on the couch, Start begins ONE shared match:
  // everyone sees the same question, teammates tap the answer they believe
  // in, and the captain locks the team's answer. Solo play keeps the old
  // personal duel.
  const [team, setTeamView] = useState<TeamView | null>(null);
  const [teamDismissed, setTeamDismissed] = useState<string | null>(null);
  const teamSeenRef = useRef<string | null>(null);

  const refetchTeam = useCallback(async () => {
    const roomId = kingRoomRef.current?.id;
    if (!roomId) return;
    const { data, error } = await supabase.rpc("king_team_view", { p_room_id: roomId });
    if (!error) setTeamView((data as unknown as TeamView) ?? null);
  }, []);

  const runTeam = useCallback(async (call: PromiseLike<{ data: unknown; error: { message: string } | null }>) => {
    const { data, error } = await call;
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data) setTeamView(data as TeamView);
  }, []);

  const teamStart = useCallback(() => {
    const roomId = kingRoomRef.current?.id;
    if (!roomId) return;
    void runTeam(supabase.rpc("king_team_start", { p_room_id: roomId, p_language: readAppLanguage("en") }));
  }, [runTeam]);
  const teamOptions = useCallback(() => {
    const roomId = kingRoomRef.current?.id;
    if (roomId) void runTeam(supabase.rpc("king_team_options", { p_room_id: roomId }));
  }, [runTeam]);
  const teamSuggest = useCallback((answer: string) => {
    const roomId = kingRoomRef.current?.id;
    if (roomId) void runTeam(supabase.rpc("king_team_suggest", { p_room_id: roomId, p_answer: answer }));
  }, [runTeam]);
  const teamCommit = useCallback((answer: string) => {
    const roomId = kingRoomRef.current?.id;
    if (roomId) void runTeam(supabase.rpc("king_team_commit", { p_room_id: roomId, p_answer: answer }));
  }, [runTeam]);
  const teamNext = useCallback(() => {
    const roomId = kingRoomRef.current?.id;
    if (roomId) void runTeam(supabase.rpc("king_team_next", { p_room_id: roomId }));
  }, [runTeam]);
  // The deadline pump: every device fires it; races and already-moved
  // states come back as errors that mean "someone else got there" — silent.
  const teamAdvance = useCallback(async () => {
    const roomId = kingRoomRef.current?.id;
    if (!roomId) return;
    const { data, error } = await supabase.rpc("king_team_advance", { p_room_id: roomId });
    if (!error && data) setTeamView(data as unknown as TeamView);
  }, []);

  // Resume into a live duel on entry, and remember which match this device
  // actually watched so a finished one only shows its result to the couch
  // that fought it.
  useEffect(() => {
    if (kingRoom) void refetchTeam();
  }, [kingRoom, refetchTeam]);
  useEffect(() => {
    if (!kingRoom) return;
    const ch = supabase
      .channel(`king-team-${kingRoom.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "king_team_matches", filter: `room_id=eq.${kingRoom.id}` },
        () => void refetchTeam(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [kingRoom, refetchTeam]);
  useEffect(() => {
    if (team?.status === "playing") teamSeenRef.current = team.match_id;
  }, [team?.status, team?.match_id]);

  // Inviting opens the app's invite modal (search, friends, copy link,
  // social share) wired to this lounge's real room — an invited friend gets
  // the notification and lands on this couch.
  const [inviteOpen, setInviteOpen] = useState(false);
  const inviteFriends = useCallback(() => setInviteOpen(true), []);


  const thinkSeconds = useServerDeadline(
    stage === "thinking" ? state?.question?.think_deadline : undefined,
    showOptions,
  );
  const commitSeconds = useServerDeadline(
    stage === "commit" ? state?.commit_deadline : undefined,
    () => void expire(),
  );

  // Same trap as the co-op duel: "next" and the fresh question's "I know
  // it!" share a spot, so a fast double-tap skipped the think minute.
  const soloCtaArmed = useArmedCta(`${stage}:${state?.question_number ?? 0}`);

  // A live (or just-finished-here) team duel takes the whole screen.
  const showTeamDuel =
    !!team &&
    (team.status === "playing" ||
      (teamSeenRef.current === team.match_id && team.match_id !== teamDismissed));
  if (team && showTeamDuel) {
    return (
      <KingTeamDuel
        view={team}
        parts={kingParts}
        meId={user?.id ?? ""}
        isHost={kingRoom?.host_user_id === user?.id}
        teamName={kingRoom?.room_name}
        teamIcon={kingRoom?.room_icon}
        onOptions={teamOptions}
        onSuggest={teamSuggest}
        onCommit={teamCommit}
        onNext={teamNext}
        onAdvance={teamAdvance}
        onRestart={teamStart}
        onExit={() => {
          if (team.status === "playing") navigate("/");
          else setTeamDismissed(team.match_id);
        }}
      />
    );
  }

  // Who leads the couch: the elected captain, and until anybody has been
  // voted in, the host — the same fallback king_team_start applies when it
  // seats the duel's captain.
  const kingCaptain =
    kingParts.find((p) => p.is_captain && !p.is_bot) ??
    kingParts.find((p) => p.is_host) ??
    kingParts[0];
  const meSeated = !!user && kingParts.some((p) => p.user_id === user.id && !p.is_bot);

  // The lobby is the Versus King frame (Figma 940:7474) rendered at design
  // coordinates: the King's lounge scene, your friends in the invite row,
  // seats around the couch, and the Start CTA driving the existing match.
  // Header, friends strip, and the Start CTA are flow elements — always on
  // screen, strip scrolling edge to edge. Only the scene region (design
  // y160–841, re-based below) is scale-fitted into the flexible middle.
  if (stage === "intro") {
    const isKingHost = kingRoom?.host_user_id === user?.id;
    const humans = kingParts.filter((p) => !p.is_bot).length;
    const couch: LobbyPlayer[] = [
      ...kingParts.map((p) => ({
        id: p.user_id,
        name: p.nickname,
        avatarUrl: p.avatar_url,
        isHost: p.user_id === kingRoom?.host_user_id,
        isYou: p.user_id === user?.id,
        // A seated human opens their profile in place; the host's tap on
        // somebody else is the seat menu.
        onPress:
          isKingHost && p.user_id !== user?.id
            ? () => setSeatMenu(p)
            : p.is_bot
              ? undefined
              : () => openProfile(p.user_id),
      })),
      ...kingPending.map((p) => ({
        id: p.user_id,
        name: p.nickname,
        avatarUrl: p.avatar_url,
        isHost: false,
        isYou: false,
        pending: true,
        onPress: isKingHost ? () => setSeatMenu(p) : () => openProfile(p.user_id),
      })),
    ];
    const inviteFaces = [...friends]
      .filter((f) => f.status === "accepted")
      .sort((a, b) => Number(!!b.isOnline) - Number(!!a.isOnline))
      .slice(0, 3)
      .map((f) => ({ url: f.avatarUrl, online: !!f.isOnline }));
    const coins = 200 * Math.max(1, kingParts.length);
    return (
      <UniversalLobby
        sceneArt={LOBBY_SCENES.king}
        roomName={kingRoom?.room_name || t("lobby.teamName")}
        onRename={isKingHost ? () => setRenameOpen(true) : undefined}
        onBack={() => navigate(-1)}
        unreadCount={unreadCount}
        labels={{
          rules: t("lobby.uGameRules"),
          players: t("lobby.uPlayersTab"),
          invite: t("lobby.uInvite"),
          you: t("lobby.uYou"),
          rounds: (count) => t("lobby.uRoundsShort", { count }),
        }}
        rules={[
          {
            // Versus King is friends-only: its lounge never publishes.
            key: "visibility",
            label: t("lobby.uVisibility"),
            options: [
              { value: "public", label: t("extra.roomPublic") },
              { value: "private", label: t("extra.roomPrivate") },
            ],
            value: "private",
          },
        ]}
        rulesExtra={
          <div className="flex h-[84px] items-center justify-between rounded-[20px] border border-[rgba(156,100,181,0.5)] pl-[26px] pr-[20px]">
            <span className="font-[Nunito] text-[16px] font-medium leading-[19.5px] tracking-[-0.16px] text-[#402666]">
              {t("lobby.winnerTakes")}
            </span>
            <span className="flex items-center gap-2 font-[Nunito] text-[18px] font-black leading-6 tracking-[-0.16px] text-[#402666]">
              <img alt="" src={coinIconAsset} className="h-6 w-6 object-contain" />
              {coins}
            </span>
          </div>
        }
        players={couch}
        playersHint={null}
        // The couch: one to ten humans against the King (the room row's
        // 11 counts the King's own seat).
        capacity={{
          min: 1,
          max: Math.max(1, (kingRoom?.max_players ?? 11) - 1),
          taken: humans + kingPending.length,
          fullLabel: t("extra.mpRoomFull"),
        }}
        inviteFaces={inviteFaces}
        onInvite={inviteFriends}
        playersExtra={
          <button
            type="button"
            onClick={() => setCaptainInfoOpen(true)}
            className="mt-[16px] flex h-[56px] w-full items-center gap-3 rounded-[20px] border border-[rgba(156,100,181,0.5)] pl-[12px] pr-[15px] text-left"
          >
            <span className="block h-8 w-8 overflow-hidden rounded-full bg-[#e9d8ff] shadow-[0px_0px_0px_2px_rgba(148,163,184,0.75)]">
              {(kingCaptain?.avatar_url ?? profile?.avatar_url) && (
                <img alt="" src={kingCaptain?.avatar_url ?? profile?.avatar_url ?? undefined} className="h-full w-full object-cover" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-[Nunito] text-[12px] leading-4 text-[#402666]/60">{t("lobby.captainLabel")}</span>
              <span className="block truncate font-[Nunito] text-[15px] font-bold leading-5 text-[#402666]">
                {kingCaptain?.nickname ?? profile?.nickname ?? t("lobby.chooseCaptain")}
              </span>
            </span>
          </button>
        }
        initialTab="players"
        start={{
          label: t("lobby.startGame"),
          onPress: () => {
            // Two or more humans on the couch fight ONE King together; a
            // lone player keeps the personal duel.
            if (humans > 1) teamStart();
            else startForEveryone();
          },
          disabled: busy || (humans > 1 ? !isKingHost : !state),
          loading: busy,
          caption: noPool ? t("king.noQuestions") : null,
        }}
      >
        {/* Somebody asking onto this couch, when the lounge was published */}
        {/* The doorstep is app-wide now — GlobalJoinRequestGate in App. */}

        <CaptainInfoModal
          open={captainInfoOpen}
          onClose={() => setCaptainInfoOpen(false)}
          title={meSeated ? t("lobby.chooseCaptainTitle") : t("lobby.captainInfoTitle")}
          body={t("king.captainInfoBody")}
          pickLabel={t("lobby.votePick")}
          myVoteUserId={kingParts.find((p) => p.user_id === user?.id)?.captain_vote ?? null}
          members={kingParts.map((p) => ({
            userId: p.user_id,
            nickname: p.nickname,
            avatarUrl: p.avatar_url,
            isCaptain: p.user_id === kingCaptain?.user_id,
            // Live tally: how many humans on the couch back this member
            votes: kingParts.filter((voter) => !voter.is_bot && voter.captain_vote === p.user_id).length,
            // Only humans can wear the armband — and nobody votes for
            // themselves (owner's rule), so your own face carries no pill.
            selectable: !p.is_bot && p.user_id !== user?.id,
          }))}
          onChoose={meSeated ? (userId) => void voteKingCaptain(userId) : undefined}
        />

        <InviteFriendsModal
          isOpen={inviteOpen}
          onClose={() => setInviteOpen(false)}
          inviteLink={kingRoom ? `https://mytrivia.io/king?code=${kingRoom.room_code}` : "https://mytrivia.io/king"}
          roomId={kingRoom?.id}
          roomCode={kingRoom?.room_code}
        />

        <SeatMenu
          target={seatMenu ? { nickname: seatMenu.nickname, avatarUrl: seatMenu.avatar_url } : null}
          onClose={() => setSeatMenu(null)}
          actions={
            seatMenu
              ? [
                  {
                    label: t("lobby.removeSeat"),
                    destructive: true,
                    onPress: () => {
                      if (!kingRoom) return;
                      const target = seatMenu.user_id;
                      // Instant: the seat pops out now; a refusal restores it.
                      seatOpRef.current += 1;
                      setKingParts((prev) => prev.filter((part) => part.user_id !== target));
                      setKingPending((prev) => prev.filter((part) => part.user_id !== target));
                      void supabase
                        .rpc("lobby_manage_seat", {
                          p_room_id: kingRoom.id,
                          p_user_id: target,
                          p_action: "remove",
                        })
                        .then(({ error }) => {
                          if (error) toast.error(error.message);
                          seatOpRef.current -= 1;
                          void refreshKingParts();
                        });
                    },
                  },
                ]
              : []
          }
        />

        {/* host dresses the team — icon and name in the shared picker */}
        {renameOpen && kingRoom && (
          <RoomIconPickerModal
            isOpen
            autoName={false}
            currentIconUrl={kingRoom.room_icon}
            roomName={kingRoom.room_name ?? ""}
            onClose={() => setRenameOpen(false)}
            onConfirm={(iconUrl, newName) => void saveTeamLook(iconUrl, newName)}
          />
        )}

      </UniversalLobby>
    );
  }

  return (
    <div className={DUEL_SHELL}>
      <div className={DUEL_BODY}>
      <div className="max-w-md mx-auto px-5 pb-4">
        <div className="flex items-center gap-2 pt-3 pb-1">
          <button
            onClick={() => void abandon()}
            aria-label={t("common.back")}
            className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-white active:scale-95 transition-transform"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <DuelTitle t={t} teamName={kingRoom?.room_name} teamIcon={kingRoom?.room_icon} />
        </div>

        {state && (
          <DuelScoreRow
            youLabel={t("king.you")}
            youScore={state.player_score}
            kingScore={state.king_score}
            ruleLabel={t("king.firstTo6")}
            kingLabel={t("king.king")}
          />
        )}

        {stage === "thinking" && state?.question && (
          <div className="flex flex-col gap-3 mt-1">
            <p className="text-xs text-white/60 text-center">
              {t("king.questionNo", { n: state.question_number })}
            </p>
            <div
              className="rounded-[24px] p-5"
              style={{ background: "rgba(252,247,255,0.95)", boxShadow: CARD_SHADOW }}
            >
              {/* Every puzzle wears its icon (20260921160000); rows without
                  a slug fall back to a per-question seeded pick. */}
              <div className="flex justify-center mb-3">
                <DynamicIcon
                  slug={state.question.icon_slug ?? undefined}
                  seedText={state.question.question_text}
                  size={68}
                />
              </div>
              <p className={`font-bold text-[#402666] ${qTextSize(state.question.question_text)}`}>
                {state.question.question_text}
              </p>
              {state.question.image_url && (
                <img src={state.question.image_url} alt="" className="mt-4 rounded-xl max-w-full" />
              )}
            </div>
            <p className="font-mono text-3xl text-white font-bold text-center">{thinkSeconds}</p>
            <p className="text-sm text-white/70 text-center -mt-2">{t("king.thinkHint")}</p>
          </div>
        )}

        {stage === "commit" && state?.question && (
          <div className="flex flex-col gap-2.5 mt-1">
            <div
              className="rounded-[24px] p-4"
              style={{ background: "rgba(252,247,255,0.95)", boxShadow: CARD_SHADOW }}
            >
              <div className="flex items-center gap-3">
                <DynamicIcon
                  slug={state.question.icon_slug ?? undefined}
                  seedText={state.question.question_text}
                  size={47}
                  className="shrink-0"
                />
                <p
                  className={`font-bold text-[#402666] ${
                    state.question.question_text.length > 150 ? "text-[13px] leading-snug" : "text-sm"
                  }`}
                >
                  {state.question.question_text}
                </p>
              </div>
            </div>
            <p className="font-mono text-2xl text-red-300 font-bold text-center">{commitSeconds}</p>
            <p className="text-sm text-white/70 text-center -mt-1.5">{t("king.commitHint")}</p>
            <div className="flex flex-col gap-2">
              {(state.options ?? []).map((option, i) => (
                <motion.button
                  key={option}
                  whileTap={{ scale: 0.97 }}
                  // The tap that opened the options must not also answer:
                  // these commit the team's fate, so they arm with the CTA.
                  disabled={busy || !soloCtaArmed}
                  onClick={() => void submit(option)}
                  className="rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[#402666] disabled:opacity-60 flex items-center gap-2.5"
                  style={{ background: "rgba(252,247,255,0.95)", boxShadow: CARD_SHADOW }}
                >
                  <span className="w-7 h-7 shrink-0 rounded-full bg-[#7C3AED]/10 text-[#7C3AED] text-xs font-bold flex items-center justify-center">
                    {OPTION_LABELS[i]}
                  </span>
                  <span className="flex-1 min-w-0">{option}</span>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {stage === "reveal" && reveal && (
          <div className="flex flex-col gap-4 mt-4">
            <motion.p
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`font-display text-2xl font-bold text-center ${
                reveal.correct ? "text-emerald-300" : "text-red-300"
              }`}
            >
              {reveal.correct ? t("king.cracked") : t("king.kingScores")}
            </motion.p>
            <div
              className="rounded-[24px] p-5"
              style={{ background: "rgba(252,247,255,0.95)", boxShadow: CARD_SHADOW }}
            >
              {/* On a miss, what was sent (or that time ran out) shows red
                  above the truth — same read as the co-op reveal. The rows
                  wear the 3D cross and check (owner's pick), and the type
                  runs a size up: the old xs/sm read as fine print. */}
              {!reveal.correct && (
                <>
                  <p className="text-sm font-semibold text-[#402666]/60 mb-1.5">{t("king.yourPickLabel")}</p>
                  <p className="flex items-start gap-2 text-lg font-bold text-red-500 mb-4">
                    <img alt="" src={iconAnswerWrong} className="w-6 h-6 mt-0.5 shrink-0 object-contain" />
                    <span className="min-w-0">{myPick ?? t("king.nothingLocked")}</span>
                  </p>
                </>
              )}
              <p className="text-sm font-semibold text-[#402666]/60 mb-1.5">{t("king.answerLabel")}</p>
              <p className={`flex items-start gap-2 text-lg font-bold mb-4 ${reveal.correct ? "text-emerald-600" : "text-[#402666]"}`}>
                <img alt="" src={iconAnswerCorrect} className="w-6 h-6 mt-0.5 shrink-0 object-contain" />
                <span className="min-w-0">{reveal.correct_answer}</span>
              </p>
              <p className="text-sm font-semibold text-[#402666]/60 mb-1.5">{t("king.logicLabel")}</p>
              <p className="text-base text-[#402666]/90 leading-relaxed">{reveal.explanation}</p>
            </div>
          </div>
        )}

        {stage === "result" && state && (
          <div className="flex flex-col items-center gap-4 pt-16">
            {/* Won: the golden crown is yours. Lost: the King himself hops
                in to gloat — a grey crown outline said nothing. */}
            {state.status === "won" ? (
              <Crown className="w-16 h-16 text-amber-300" />
            ) : (
              <motion.img
                alt=""
                src={iconKingMascot}
                initial={{ scale: 0.3, y: 24, rotate: -12 }}
                animate={{ scale: 1, y: 0, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 14 }}
                className="w-24 h-24 object-contain drop-shadow-lg"
              />
            )}
            <p className="font-display text-2xl font-bold text-white text-center">
              {state.status === "won" ? t("king.youWon") : t("king.kingWon")}
            </p>
            <p className="text-white/70">
              {state.player_score} : {state.king_score}
            </p>
            <button
              onClick={() => {
                setState(null);
                matchIdRef.current = null;
                setStage("intro");
                void start();
              }}
              className={`${DUEL_CTA} px-8`}
            >
              {t("king.playAgain")}
            </button>
            <button onClick={() => navigate(-1)} className="text-sm font-semibold text-white/80">
              ← {t("common.back")}
            </button>
          </div>
        )}
      </div>
      </div>

      {stage === "thinking" && state?.question && (
        <div className={DUEL_FOOTER}>
          <button onClick={() => void showOptions()} disabled={!soloCtaArmed} className={`${DUEL_CTA} w-full`}>
            {t("king.haveIt")}
          </button>
        </div>
      )}
      {stage === "reveal" && reveal && (
        <div className={DUEL_FOOTER}>
          <button
            onClick={() => (state?.status === "playing" ? void draw() : setStage("result"))}
            disabled={busy || !soloCtaArmed}
            className={`${DUEL_CTA} w-full ${busy ? "opacity-50" : ""}`}
          >
            {state?.status === "playing" ? t("king.next") : t("common.continue")}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * The co-op duel (20260921170000): the whole couch fights ONE King. Everyone
 * sees the same question; during the commit window teammates tap the answer
 * they believe in (their faces gather on it live) and the captain locks the
 * team's answer — or the majority locks itself at the deadline. First to 6.
 */
function KingTeamDuel({
  view,
  parts,
  meId,
  isHost,
  teamName,
  teamIcon,
  onOptions,
  onSuggest,
  onCommit,
  onNext,
  onAdvance,
  onRestart,
  onExit,
}: {
  view: TeamView;
  parts: Tables<"room_participants">[];
  meId: string;
  isHost: boolean;
  teamName?: string | null;
  teamIcon?: string | null;
  onOptions: () => void;
  onSuggest: (answer: string) => void;
  onCommit: (answer: string) => void;
  onNext: () => void;
  onAdvance: () => Promise<void>;
  onRestart: () => void;
  onExit: () => void;
}) {
  const { t } = useLanguage();
  const isCaptain = meId === view.captain;
  const captain = parts.find((p) => p.user_id === view.captain);
  const phase: "think" | "commit" | "reveal" | "result" =
    view.status !== "playing"
      ? "result"
      : view.question
        ? view.options
          ? "commit"
          : "think"
        : "reveal";

  // The captain's provisional pick, cleared on every new question.
  const [capPick, setCapPick] = useState<string | null>(null);
  useEffect(() => setCapPick(null), [view.question_number]);

  // The CTA that just materialised under the finger stays cold for a beat.
  const ctaArmed = useArmedCta(`${phase}:${view.question_number}`);

  const thinkLeft = useServerDeadline(
    phase === "think" ? view.question?.think_deadline : undefined,
    onAdvance,
  );
  const commitLeft = useServerDeadline(
    phase === "commit" ? view.commit_deadline : undefined,
    onAdvance,
  );

  const mySuggestion = view.suggestions[meId];
  const backers = (option: string) =>
    parts.filter((p) => view.suggestions[p.user_id] === option);

  return (
    <div className={DUEL_SHELL}>
      <div className={DUEL_BODY}>
      <div className="max-w-md mx-auto px-5 pb-4">
        <div className="flex items-center gap-2 pt-3 pb-1">
          <button
            onClick={onExit}
            aria-label={t("common.back")}
            className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-white active:scale-95 transition-transform"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <DuelTitle t={t} teamName={teamName} teamIcon={teamIcon} />
          {captain && (
            <span className="ml-auto flex items-center gap-1.5 bg-white/90 rounded-full pl-2 pr-3 py-1 shrink-0">
              <span className="relative w-6 h-6">
                {captain.avatar_url ? (
                  <img alt="" src={captain.avatar_url} className="w-6 h-6 rounded-full object-cover" />
                ) : (
                  <span className="w-6 h-6 rounded-full bg-[#8858d5]/30 flex items-center justify-center text-[10px] font-bold text-[#523b76]">
                    {captain.nickname.charAt(0).toUpperCase()}
                  </span>
                )}
                <img alt="" src={crownIconAsset} className="pointer-events-none absolute -top-[7px] left-[4px] w-[14px] object-contain -rotate-12" />
              </span>
              <span className="text-xs font-bold text-[#523b76] max-w-[90px] truncate">{captain.nickname}</span>
            </span>
          )}
        </div>

        <DuelScoreRow
          youLabel={t("king.teamLabel")}
          youScore={view.team_score}
          kingScore={view.king_score}
          ruleLabel={t("king.firstTo6")}
          kingLabel={t("king.king")}
        />

        {phase === "think" && view.question && (
          <div className="flex flex-col gap-3 mt-1">
            <p className="text-xs text-white/60 text-center">
              {t("king.questionNo", { n: view.question_number })}
            </p>
            <div
              className="rounded-[24px] p-5"
              style={{ background: "rgba(252,247,255,0.95)", boxShadow: CARD_SHADOW }}
            >
              <div className="flex justify-center mb-3">
                <DynamicIcon
                  slug={view.question.icon_slug ?? undefined}
                  seedText={view.question.question_text}
                  size={68}
                />
              </div>
              <p className={`font-bold text-[#402666] ${qTextSize(view.question.question_text)}`}>
                {view.question.question_text}
              </p>
            </div>
            <p className="font-mono text-3xl text-white font-bold text-center">{thinkLeft}</p>
            {!isCaptain && (
              <p className="text-sm text-white/70 text-center">{t("king.teamDiscussHint")}</p>
            )}
          </div>
        )}

        {phase === "commit" && view.question && (
          <div className="flex flex-col gap-2.5 mt-1">
            <div
              className="rounded-[24px] p-4"
              style={{ background: "rgba(252,247,255,0.95)", boxShadow: CARD_SHADOW }}
            >
              <div className="flex items-center gap-3">
                <DynamicIcon
                  slug={view.question.icon_slug ?? undefined}
                  seedText={view.question.question_text}
                  size={47}
                  className="shrink-0"
                />
                <p
                  className={`font-bold text-[#402666] ${
                    view.question.question_text.length > 150 ? "text-[13px] leading-snug" : "text-sm"
                  }`}
                >
                  {view.question.question_text}
                </p>
              </div>
            </div>
            <p className="font-mono text-2xl text-red-300 font-bold text-center">{commitLeft}</p>
            <p className="text-sm text-white/70 text-center -mt-1.5">
              {t("king.teamSuggestHint")}
            </p>
            <div className="flex flex-col gap-2">
              {(view.options ?? []).map((option, i) => {
                const mine = mySuggestion === option;
                const picked = isCaptain && capPick === option;
                return (
                  <motion.button
                    key={option}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      if (isCaptain) setCapPick(option);
                      onSuggest(option);
                    }}
                    className={`rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[#402666] flex items-center gap-2.5 ${
                      picked
                        ? "ring-2 ring-[#7C3AED]"
                        : mine
                          ? "ring-2 ring-[#7C3AED]/40"
                          : ""
                    }`}
                    style={{ background: "rgba(252,247,255,0.95)", boxShadow: CARD_SHADOW }}
                  >
                    <span className="w-7 h-7 shrink-0 rounded-full bg-[#7C3AED]/10 text-[#7C3AED] text-xs font-bold flex items-center justify-center">
                      {OPTION_LABELS[i]}
                    </span>
                    <span className="flex-1 min-w-0">{option}</span>
                    {/* the teammates backing this answer, live */}
                    <span className="flex -space-x-1.5 shrink-0">
                      {backers(option).map((p) => (
                        <motion.span
                          key={p.user_id}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 480, damping: 20 }}
                          className="w-5 h-5 rounded-full ring-2 ring-white overflow-hidden bg-[#8858d5]/30 flex items-center justify-center"
                        >
                          {p.avatar_url ? (
                            <img alt="" src={p.avatar_url} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[9px] font-bold text-[#523b76]">
                              {p.nickname.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </motion.span>
                      ))}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

        {phase === "reveal" && view.last_result && (
          <div className="flex flex-col gap-4 mt-4">
            <motion.p
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`font-display text-2xl font-bold text-center ${
                view.last_result.correct ? "text-emerald-300" : "text-red-300"
              }`}
            >
              {view.last_result.correct ? t("king.cracked") : t("king.kingScores")}
            </motion.p>
            <div
              className="rounded-[24px] p-5"
              style={{ background: "rgba(252,247,255,0.95)", boxShadow: CARD_SHADOW }}
            >
              {/* What the captain locked, next to the truth — "the King
                  scored" alone never said WHY. On a miss the team's pick
                  shows red above the green answer; on a timeout it says so. */}
              {!view.last_result.correct && (
                <>
                  <p className="text-sm font-semibold text-[#402666]/60 mb-1.5">{t("king.teamPickedLabel")}</p>
                  <p className="flex items-start gap-2 text-lg font-bold text-red-500 mb-4">
                    <img alt="" src={iconAnswerWrong} className="w-6 h-6 mt-0.5 shrink-0 object-contain" />
                    <span className="min-w-0">{view.last_result.chosen ?? t("king.nothingLocked")}</span>
                  </p>
                </>
              )}
              <p className="text-sm font-semibold text-[#402666]/60 mb-1.5">{t("king.answerLabel")}</p>
              <p className={`flex items-start gap-2 text-lg font-bold mb-4 ${view.last_result.correct ? "text-emerald-600" : "text-[#402666]"}`}>
                <img alt="" src={iconAnswerCorrect} className="w-6 h-6 mt-0.5 shrink-0 object-contain" />
                <span className="min-w-0">{view.last_result.correct_answer}</span>
              </p>
              {view.last_result.explanation && (
                <>
                  <p className="text-sm font-semibold text-[#402666]/60 mb-1.5">{t("king.logicLabel")}</p>
                  <p className="text-base text-[#402666]/90 leading-relaxed">
                    {view.last_result.explanation}
                  </p>
                </>
              )}
            </div>
            {!isCaptain && (
              <p className="text-sm text-white/70 text-center">
                {t("king.captainNextHint")}
              </p>
            )}
          </div>
        )}

        {phase === "result" && (
          <div className="flex flex-col items-center gap-4 pt-16">
            {view.status === "won" ? (
              <Crown className="w-16 h-16 text-amber-300" />
            ) : (
              <motion.img
                alt=""
                src={iconKingMascot}
                initial={{ scale: 0.3, y: 24, rotate: -12 }}
                animate={{ scale: 1, y: 0, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 14 }}
                className="w-24 h-24 object-contain drop-shadow-lg"
              />
            )}
            <p className="font-display text-2xl font-bold text-white text-center">
              {view.status === "won" ? t("king.teamWon") : t("king.teamLost")}
            </p>
            <p className="text-white/70">
              {view.team_score} : {view.king_score}
            </p>
            {isHost && (
              <button onClick={onRestart} className={`${DUEL_CTA} px-8`}>
                {t("king.playAgain")}
              </button>
            )}
            <button onClick={onExit} className="text-sm font-semibold text-white/80">
              ← {t("common.back")}
            </button>
          </div>
        )}
      </div>
      </div>

      {/* The captain's one action of the moment, pinned to the bottom. */}
      {isCaptain && phase === "think" && view.question && (
        <div className={DUEL_FOOTER}>
          <button onClick={onOptions} disabled={!ctaArmed} className={`${DUEL_CTA} w-full`}>
            {t("king.haveIt")}
          </button>
        </div>
      )}
      {isCaptain && phase === "commit" && view.question && (
        <div className={DUEL_FOOTER}>
          <button
            onClick={() => capPick && onCommit(capPick)}
            disabled={!capPick || !ctaArmed}
            className={`${DUEL_CTA} w-full ${capPick ? "" : "opacity-40"}`}
          >
            {t("king.captainLock")}
          </button>
        </div>
      )}
      {isCaptain && phase === "reveal" && view.last_result && (
        <div className={DUEL_FOOTER}>
          <button onClick={onNext} disabled={!ctaArmed} className={`${DUEL_CTA} w-full`}>
            {t("king.next")}
          </button>
        </div>
      )}
    </div>
  );
}
