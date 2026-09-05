import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Tables } from "@/integrations/supabase/types";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronLeft, Crown, Flag, X } from "lucide-react";
import { DynamicIcon } from "@/components/shared/DynamicIcon";
import { containsBlockedText } from "@/utils/contentFilter";
import iconKingMascot from "@/assets/play-chooser/icon-king.webp";
import { dealtRoomIcon } from "@/utils/roomCrests";
import { useRoomIconPool } from "@/hooks/useRoomIconPool";
import crownIconAsset from "@/assets/crown-icon.png";
import { resolveAvatarUrl } from "@/utils/avatarUtils";
import { supabase } from "@/integrations/supabase/client";
import { roomVisibilityFields } from "@/utils/roomVisibility";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useServerDeadline } from "@/hooks/useServerDeadline";
import { useGameInvitations } from "@/hooks/useGameInvitations";
import { usePlayerProfile } from "@/contexts/PlayerProfileContext";
import { readAppLanguage } from "@/utils/appLanguage";
import {
  kingReportFallbackRow,
  kingReportRow,
  type KingReportInput,
} from "@/utils/kingQuestionReport";
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

// The duel plays on the LIGHT ground the design gives it (Figma 1072:6642):
// #f7e2f7, with white cards and dark ink on top. It used to be the game
// screens' periwinkle, which meant every label on the screen was white
// text floating on purple and the white cards were the only structure.
//
// A column: the header, score and question scroll in the middle; the one
// action of the moment — "I know it!", the captain's lock, "next" — sits in
// a footer pinned to the bottom, where every other game screen keeps its
// button. It used to ride under the question, which put it at a different
// height every phase and, on a tall puzzle, below the fold.
const DUEL_SHELL =
  "h-[calc(100dvh_-_var(--safe-top)_-_var(--safe-bottom))] overflow-hidden bg-[#f7e2f7] flex flex-col";
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
 * One answer, as the design draws it (Figma 1072:6642).
 *
 * A white 60px row with its own shadow BLOCK behind it — a #cbd5e1
 * rectangle offset four pixels down, not a blur — so the row reads as a key
 * you press. The letter is a 36px lilac chip, the text is 16px ink. It used
 * to be a small translucent pill with a purple circle, sized for the purple
 * ground the screen no longer has.
 *
 * `state` is the row's own: "picked" is the captain's lock, "backed" is a
 * teammate's suggestion. Both wear a ring rather than a different shape.
 */
function DuelAnswer({
  label,
  text,
  state = "idle",
  disabled,
  onClick,
  trailing,
}: {
  label: string;
  text: string;
  state?: "idle" | "picked" | "backed";
  disabled?: boolean;
  onClick?: () => void;
  /** The faces backing this answer, on the co-op duel. */
  trailing?: ReactNode;
}) {
  return (
    <div className="relative w-full">
      {/* The block the key sits on. */}
      <div aria-hidden className="absolute inset-x-0 top-[4px] h-[60px] rounded-[20px] bg-[#cbd5e1]" />
      <motion.button
        type="button"
        whileTap={disabled ? undefined : { scale: 0.985 }}
        disabled={disabled}
        onClick={onClick}
        className={`relative flex h-[60px] w-full items-center rounded-[20px] bg-white py-[10px] text-left shadow-[inset_0px_2px_0px_0px_rgba(255,255,255,0.4)] disabled:opacity-60 ${
          state === "picked"
            ? "ring-2 ring-[#7C3AED]"
            : state === "backed"
              ? "ring-2 ring-[#7C3AED]/40"
              : ""
        }`}
      >
        <span className="flex shrink-0 items-start pl-[12px]">
          <span className="flex size-9 items-center justify-center rounded-[16px] bg-[#eadffb] font-[Nunito] text-[16px] font-bold leading-6 text-[#705c8c]">
            {label}
          </span>
        </span>
        <span className="min-w-0 flex-1 px-[12px] font-[Nunito] text-[16px] font-medium leading-5 tracking-[-0.16px] text-[#402666]">
          {text}
        </span>
        {trailing}
      </motion.button>
    </div>
  );
}

/**
 * The clock, as a badge on the question card's shoulder.
 *
 * The count used to be a bare 3xl monospace number under the card, in white
 * — which on the light ground would be invisible, and which took a line of
 * its own on a screen that has none to spare. The King's blue, so it reads
 * as his clock running.
 */
function DuelTimerBadge({ seconds, urgent = false }: { seconds: number; urgent?: boolean }) {
  return (
    <span
      className="absolute right-[9px] top-[9px] flex size-10 items-center justify-center rounded-full shadow-[inset_0px_2px_0px_0px_rgba(255,255,255,0.3),inset_0px_-2px_0px_0px_rgba(0,0,0,0.2)]"
      style={{
        background: urgent
          ? "linear-gradient(180deg,#f2696a 0%,#d94b4c 100%)"
          : "linear-gradient(180deg,#3ca7dd 0%,#288cbd 100%)",
      }}
    >
      <span
        className="text-[14px] leading-5 text-white"
        style={{ fontFamily: "'TASolivare', sans-serif" }}
      >
        {seconds}
      </span>
    </span>
  );
}

/**
 * Which question this is, on the card's other shoulder.
 *
 * It used to sit above the card as a grey caption, which cost a line and
 * left the clock alone up there looking like the only thing worth knowing.
 * The two balance now: the number on the left, the clock on the right, and
 * the puzzle between them. It wears the answer chips' lilac so the card's
 * furniture reads as one set.
 */
function DuelQuestionNo({ label }: { label: string }) {
  return (
    <span className="absolute left-[14px] top-[16px] rounded-full bg-[#eadffb] px-2.5 py-1 font-[Nunito] text-[12px] font-bold leading-4 text-[#705c8c]">
      {label}
    </span>
  );
}

/**
 * One line of the reveal: a label, then a 36px status chip beside the text.
 *
 * The two chips are the SAME object in two colours — 36px, radius 16, a
 * white glyph centred in it — because they are read as a pair, one under
 * the other, and a matched pair is read in one glance. The miss used to be
 * the 3D cross the rest of the app uses: a lit sphere beside a flat disc,
 * which made the two rows look like different kinds of statement rather
 * than the same statement twice. Both colours are the frame's.
 */
function RevealRow({
  label,
  text,
  tone,
}: {
  label: string;
  text: string;
  tone: "right" | "wrong";
}) {
  return (
    <div className="pb-4">
      <p className="font-[Nunito] text-[14px] font-medium leading-5 tracking-[-0.16px] text-[#402666]">
        {label}
      </p>
      <div className="mt-1.5 flex items-center gap-3">
        <span
          className={`flex size-9 shrink-0 items-center justify-center rounded-[16px] ${
            tone === "right" ? "bg-[#34d399]" : "bg-[#ff4606]"
          }`}
        >
          {tone === "right" ? (
            <Check className="size-5 text-white" strokeWidth={3} />
          ) : (
            <X className="size-5 text-white" strokeWidth={3} />
          )}
        </span>
        <span className="min-w-0 font-[Nunito] text-[14px] font-medium leading-5 tracking-[-0.16px] text-[#402666]">
          {text}
        </span>
      </div>
    </div>
  );
}

/**
 * "This question is wrong" — the flag under the explanation.
 *
 * The pool is seeded, not authored in the app, so a bad puzzle is a data
 * bug that only the person reading the reveal is ever in a position to
 * catch. One tap files it and the row turns into its own receipt: there is
 * nothing to confirm, and a report you cannot tell you sent gets sent four
 * times.
 *
 * It writes twice on purpose. king_question_reports is the structured
 * record, and it may not exist yet — migrations reach this database by hand
 * — so the same report also goes to user_reports, which is the table the
 * admin Reports page actually reads. A report nobody can read is not a
 * report.
 */
function ReportQuestionRow({ input }: { input: KingReportInput }) {
  const { t } = useLanguage();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  // A new question is a new report; the receipt must not carry over.
  useEffect(() => {
    setSent(false);
  }, [input.questionText]);

  const file = async () => {
    if (busy || sent) return;
    setBusy(true);
    try {
      await supabase.from("king_question_reports" as never).insert(
        kingReportRow(input) as never,
      );
      const fallback = kingReportFallbackRow(input);
      if (fallback) await supabase.from("user_reports").insert(fallback);
    } catch (e) {
      // Reporting is a courtesy, not a transaction — never block the reveal.
      console.warn("[King] report failed", e);
    } finally {
      setBusy(false);
      setSent(true);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void file()}
      disabled={busy || sent}
      className="mt-2 flex h-[33px] w-full items-center justify-center gap-2 font-[Nunito] text-[14px] leading-[26px] tracking-[-0.16px] text-[#ff615d] disabled:opacity-70"
    >
      {sent ? <Check className="size-[13px]" strokeWidth={3} /> : <Flag className="size-[13px]" />}
      {sent ? t("king.reportThanks") : t("king.reportQuestion")}
    </button>
  );
}

/**
 * "+ 1 point to Brave Bats" — who the round went to, under the card.
 *
 * The scoreline at the top already moved, but it moves silently and it is
 * two numbers; this says the same thing in words, next to the crest, at the
 * moment it happened. The frame puts it below the card rather than inside
 * it because it is about the MATCH, not about the question.
 *
 * The recipient's name carries its own grammar — Georgian wants a case
 * ending on the team name and none on the King — so the two halves are
 * separate keys rather than one interpolated sentence.
 */
function PointAwardRow({
  toKing,
  teamName,
  teamIcon,
}: {
  toKing: boolean;
  teamName: string;
  teamIcon?: string | null;
}) {
  const { t } = useLanguage();
  return (
    <div className="flex items-center justify-center gap-2.5">
      <span className="font-[Nunito] text-[18px] font-extrabold uppercase leading-[26px] tracking-[-0.16px] text-[#1eb880]">
        {t("king.plusPoint")}
      </span>
      <span className="flex min-w-0 items-center">
        <img
          alt=""
          src={toKing ? iconKingMascot : (teamIcon ?? "")}
          className="size-10 shrink-0 object-contain"
        />
        <span className="truncate font-[Nunito] text-[18px] font-extrabold uppercase leading-[26px] tracking-[-0.16px] text-[#402666]/90">
          {toKing ? t("king.pointToKing") : t("king.pointToTeam", { name: teamName })}
        </span>
      </span>
    </div>
  );
}

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
 * The duel scoreboard (Figma 1072:6642): who is playing on one row, the
 * score under each of them, and the rule between.
 *
 * It used to be two chunky white chips on purple with the label inside them,
 * which said the same thing in a quarter of the space and none of the
 * personality — the team's crest and the King's mascot were nowhere on the
 * screen once the match started. Names at 20, scores at 32 in the display
 * face, and "first to 6" small between the two numbers.
 */
function DuelScoreRow({
  youLabel,
  youScore,
  kingScore,
  ruleLabel,
  kingLabel,
  teamIcon,
}: {
  youLabel: string;
  youScore: number;
  kingScore: number;
  ruleLabel: string;
  kingLabel: string;
  /** The team's crest, when the host has dressed one. */
  teamIcon?: string | null;
}) {
  const name = (text: string) => (
    <p className="font-[Nunito] text-[20px] font-bold leading-[32px] tracking-[-0.16px] text-[#402666] truncate min-w-0">
      {text}
    </p>
  );
  const score = (n: number) => (
    <p
      className="text-[32px] leading-[28px] text-[#402666] text-center"
      style={{ fontFamily: "'TASolivare', sans-serif" }}
    >
      {n}
    </p>
  );
  return (
    <div className="pt-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center justify-center gap-2">
          {/* Always a face on this side too. A couch nobody has dressed used
              to show a bare name against the King's mascot, which read as
              half a scoreboard. The fallback is the room's OWN dealt icon —
              the same one its card and its lobby show — not the mascot,
              which would put the King's face on both sides. */}
          {teamIcon && <img alt="" src={teamIcon} className="size-9 shrink-0 object-contain" />}
          {name(youLabel)}
        </div>
        <div className="flex shrink-0 items-center justify-center gap-1">
          {name(kingLabel)}
          <img alt="" src={iconKingMascot} className="size-10 shrink-0 rotate-[6.5deg] object-contain" />
        </div>
      </div>
      {/* The two numbers sit under their own side, with the rule between —
          a three-column grid so the middle stays centred whatever the
          numbers are. */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center pt-1">
        {score(youScore)}
        <span className="px-3 font-[Nunito] text-[12px] leading-4 text-[#402666]/70">{ruleLabel}</span>
        {score(kingScore)}
      </div>
    </div>
  );
}

/**
 * The screen's own name, in Slackey beside the back arrow (Figma 1072:6642).
 *
 * It used to bill the match like a fight card — "Trivia King VS <team>",
 * with the mascot and the crest inline — which on a long team name pushed
 * the player chip off the row and repeated, badly, what the scoreboard
 * directly underneath says properly.
 */
function DuelTitle({ t }: { t: (k: string) => string }) {
  return (
    <h1 className="font-slackey text-[16px] leading-4 tracking-[-0.16px] text-[#402666] truncate">
      {t("lobby.vkTitle")}
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

  // The question as it was ASKED, held for the report flag. The state the
  // reveal is built from is the post-submit one, whose `question` the
  // server is free to have dropped — and a report that names no question
  // is a row nobody can act on.
  const askedRef = useRef<string>("");
  if (state?.question?.question_text) askedRef.current = state.question.question_text;
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
  /**
   * The couch's face: the one the host dressed it in, else the one dealt
   * from its room id — the same deck (and so the same face) its card and its
   * lobby already show.
   */
  const iconPool = useRoomIconPool();
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
  // No icon picked and none to keep: the rename still lands.
  const saveTeamLook = async (iconUrl: string | null, newName: string) => {
    const name = newName.trim();
    if (!kingRoom || !name) return;
    if (containsBlockedText(name)) {
      toast.error(t("extra.textNotAllowed"));
      return;
    }
    setRenameOpen(false);
    const { error } = await supabase
      .from("game_rooms")
      .update({ room_name: name, ...(iconUrl ? { room_icon: iconUrl } : {}) })
      .eq("id", kingRoom.id);
    if (error) toast.error(error.message);
    else
      setKingRoom((prev) =>
        prev ? { ...prev, room_name: name, room_icon: iconUrl ?? prev.room_icon } : prev,
      );
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
        teamIcon={kingRoom?.room_icon ?? dealtRoomIcon(kingRoom?.id ?? "", iconPool)}
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
        // The armband, on the row of whoever wears it. It used to be stated
        // in a cell of its own under the couch, repeating a face and a name
        // already two rows above.
        isCaptain: p.user_id === kingCaptain?.user_id,
        // The mark is also the way in to the vote, which that cell used to be.
        onCaptainPress: () => setCaptainInfoOpen(true),
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
        // The crowned mascot is what Versus King looks like. A host who has
        // picked a face of their own gets theirs — what the sheet sets is
        // what the lobby shows, or the pick was theatre.
        icon={kingRoom?.room_icon || iconKingMascot}
        onRename={isKingHost ? () => setRenameOpen(true) : undefined}
        onBack={() => navigate(-1)}
        unreadCount={unreadCount}
        onBell={() => navigate("/notifications")}
        labels={{
          rules: t("lobby.uGameRules"),
          players: t("lobby.uPlayersTab"),
          invite: t("lobby.uInvite"),
          you: t("lobby.uYou"),
          rounds: (count) => t("lobby.uRoundsShort", { count }),
          notifications: t("extra.notifications"),
          captain: t("lobby.captainLabel"),
        }}
        // No visibility row. Versus King is friends-only by decision, so the
        // row could only ever read "private" with the other half greyed
        // beside it — a control that looks like a choice, is not one, and
        // invites the tap that proves it. What the room does not offer, the
        // lobby does not draw.
        rules={[]}
        rulesText={[
          { key: "rules", heading: t("lobby.rulesHeading"), body: t("lobby.rulesKing") },
          { key: "time", heading: t("lobby.timeHeading"), body: t("lobby.timeKing") },
        ]}
        reward={{ label: t("lobby.winnerTakes"), icon: coinIconAsset, amount: coins }}
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
        initialTab="players"
        start={
          // On a shared couch only the host starts it. A guest used to get
          // the same big button, greyed and unexplained; they get the line
          // instead, like the arena's guests.
          humans > 1 && !isKingHost
            ? {
                label: "",
                onPress: () => undefined,
                captionOnly: true,
                caption: noPool ? t("king.noQuestions") : t("teamBattle.waitingHost"),
                // Only the wait breathes. "No questions" is a dead end, not
                // a thing in progress.
                captionPulse: !noPool,
                // The host's face after the "…" — but only on the wait line,
                // not the "no questions" one, which is about the room.
                captionAvatarUrl: noPool ? undefined : (kingParts.find((p) => p.is_host)?.avatar_url ?? null),
                captionAvatarName: kingParts.find((p) => p.is_host)?.nickname ?? null,
              }
            : {
                label: t("lobby.startGame"),
                onPress: () => {
                  // Two or more humans on the couch fight ONE King together;
                  // a lone player keeps the personal duel.
                  if (humans > 1) teamStart();
                  else startForEveryone();
                },
                disabled: busy || !state,
                loading: busy,
                caption: noPool ? t("king.noQuestions") : null,
              }
        }
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
            className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-[#402666] active:scale-95 transition-transform"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <DuelTitle t={t} />
        </div>

        {state && (
          <DuelScoreRow
            youLabel={kingRoom?.room_name || t("king.you")}
            youScore={state.player_score}
            kingScore={state.king_score}
            ruleLabel={t("king.firstTo6")}
            kingLabel={t("king.king")}
            teamIcon={kingRoom?.room_icon ?? dealtRoomIcon(kingRoom?.id ?? "", iconPool)}
          />
        )}

        {stage === "thinking" && state?.question && (
          <div className="flex flex-col gap-3 mt-4">
            <div
              className="relative rounded-[24px] p-5 pt-[52px]"
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
              <DuelTimerBadge seconds={thinkSeconds} />
              <DuelQuestionNo label={t("king.questionNo", { n: state.question_number })} />
              <p className={`font-bold text-center text-[#402666] ${qTextSize(state.question.question_text)}`}>
                {state.question.question_text}
              </p>
              {state.question.image_url && (
                <img src={state.question.image_url} alt="" className="mt-4 rounded-xl max-w-full" />
              )}
            </div>
            <p className="text-sm text-[#402666]/70 text-center">{t("king.thinkHint")}</p>
          </div>
        )}

        {stage === "commit" && state?.question && (
          <div className="flex flex-col gap-2.5 mt-4">
            <div
              className="relative rounded-[24px] p-4 pr-14"
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
              <DuelTimerBadge seconds={commitSeconds} urgent />
            </div>
            <p className="text-sm text-[#402666]/70 text-center -mt-1">{t("king.commitHint")}</p>
            <div className="flex flex-col gap-4 pt-1">
              {(state.options ?? []).map((option, i) => (
                <DuelAnswer
                  key={option}
                  label={OPTION_LABELS[i]}
                  text={option}
                  // The tap that opened the options must not also answer:
                  // these commit the team's fate, so they arm with the CTA.
                  disabled={busy || !soloCtaArmed}
                  onClick={() => void submit(option)}
                />
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
                reveal.correct ? "text-[#1eb880]" : "text-[#ff615d]"
              }`}
            >
              {reveal.correct ? t("king.cracked") : t("king.kingScores")}
            </motion.p>
            <div className="rounded-[20px] bg-white p-5 shadow-[inset_0px_2px_0px_0px_rgba(255,255,255,0.4)]">
              {/* On a miss, what was sent (or that time ran out) shows above
                  the truth — same read as the co-op reveal. */}
              {!reveal.correct && (
                <RevealRow
                  label={t("king.yourPickLabel")}
                  text={myPick ?? t("king.nothingLocked")}
                  tone="wrong"
                />
              )}
              <RevealRow label={t("king.answerLabel")} text={reveal.correct_answer ?? ""} tone="right" />
              <p className="font-[Nunito] text-[14px] font-medium leading-5 tracking-[-0.16px] text-[#402666]">
                {t("king.logicLabel")}
              </p>
              <p className="mt-1.5 font-[Nunito] text-[16px] leading-[26px] tracking-[-0.16px] text-[#402666]/90">
                {reveal.explanation}
              </p>
              <ReportQuestionRow
                input={{
                  userId: user?.id ?? null,
                  language: readAppLanguage("en"),
                  mode: "solo",
                  matchId: reveal.match_id,
                  roomId: null,
                  questionNumber: reveal.question_number,
                  questionText: askedRef.current,
                  correctAnswer: reveal.correct_answer ?? null,
                }}
              />
            </div>
          </div>
        )}

        {stage === "result" && state && (
          <div className="flex flex-col items-center gap-4 pt-16">
            {/* Won: the golden crown is yours. Lost: the King himself hops
                in to gloat — a grey crown outline said nothing. */}
            {state.status === "won" ? (
              <Crown className="w-16 h-16 text-[#f5a623]" />
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
            <p className="font-display text-2xl font-bold text-[#402666] text-center">
              {state.status === "won" ? t("king.youWon") : t("king.kingWon")}
            </p>
            <p className="text-[#402666]/70">
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
            <button onClick={() => navigate(-1)} className="text-sm font-semibold text-[#402666]/80">
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
            className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-[#402666] active:scale-95 transition-transform"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <DuelTitle t={t} />
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
          youLabel={teamName || t("king.teamLabel")}
          youScore={view.team_score}
          kingScore={view.king_score}
          ruleLabel={t("king.firstTo6")}
          kingLabel={t("king.king")}
          teamIcon={teamIcon}
        />

        {phase === "think" && view.question && (
          <div className="flex flex-col gap-3 mt-4">
            <div
              className="relative rounded-[24px] p-5 pt-[52px]"
              style={{ background: "rgba(252,247,255,0.95)", boxShadow: CARD_SHADOW }}
            >
              <div className="flex justify-center mb-3">
                <DynamicIcon
                  slug={view.question.icon_slug ?? undefined}
                  seedText={view.question.question_text}
                  size={68}
                />
              </div>
              <DuelTimerBadge seconds={thinkLeft} />
              <DuelQuestionNo label={t("king.questionNo", { n: view.question_number })} />
              <p className={`font-bold text-center text-[#402666] ${qTextSize(view.question.question_text)}`}>
                {view.question.question_text}
              </p>
            </div>
            {!isCaptain && (
              <p className="text-sm text-[#402666]/70 text-center">{t("king.teamDiscussHint")}</p>
            )}
          </div>
        )}

        {phase === "commit" && view.question && (
          <div className="flex flex-col gap-2.5 mt-4">
            <div
              className="relative rounded-[24px] p-4 pr-14"
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
              <DuelTimerBadge seconds={commitLeft} urgent />
            </div>
            <p className="text-sm text-[#402666]/70 text-center -mt-1">
              {t("king.teamSuggestHint")}
            </p>
            <div className="flex flex-col gap-4 pt-1">
              {(view.options ?? []).map((option, i) => {
                const mine = mySuggestion === option;
                const picked = isCaptain && capPick === option;
                return (
                  <DuelAnswer
                    key={option}
                    label={OPTION_LABELS[i]}
                    text={option}
                    state={picked ? "picked" : mine ? "backed" : "idle"}
                    onClick={() => {
                      if (isCaptain) setCapPick(option);
                      onSuggest(option);
                    }}
                    trailing={
                    <span className="flex -space-x-1.5 shrink-0 pr-3">
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
                    }
                  />
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
                view.last_result.correct ? "text-[#1eb880]" : "text-[#ff615d]"
              }`}
            >
              {view.last_result.correct ? t("king.cracked") : t("king.kingScores")}
            </motion.p>
            <div className="rounded-[20px] bg-white p-5 shadow-[inset_0px_2px_0px_0px_rgba(255,255,255,0.4)]">
              {/* What the captain locked, next to the truth — "the King
                  scored" alone never said WHY. On a miss the team's pick
                  shows above the answer; on a timeout it says so. */}
              {!view.last_result.correct && (
                <RevealRow
                  label={t("king.teamPickedLabel")}
                  text={view.last_result.chosen ?? t("king.nothingLocked")}
                  tone="wrong"
                />
              )}
              <RevealRow
                label={t("king.answerLabel")}
                text={view.last_result.correct_answer ?? ""}
                tone="right"
              />
              {view.last_result.explanation && (
                <>
                  <p className="font-[Nunito] text-[14px] font-medium leading-5 tracking-[-0.16px] text-[#402666]">
                    {t("king.logicLabel")}
                  </p>
                  <p className="mt-1.5 font-[Nunito] text-[16px] leading-[26px] tracking-[-0.16px] text-[#402666]/90">
                    {view.last_result.explanation}
                  </p>
                </>
              )}
              <ReportQuestionRow
                input={{
                  userId: meId,
                  language: readAppLanguage("en"),
                  mode: "team",
                  matchId: view.match_id,
                  roomId: view.room_id,
                  questionNumber: view.question_number,
                  questionText: view.last_result.question_text,
                  correctAnswer: view.last_result.correct_answer,
                }}
              />
            </div>
            <PointAwardRow
              toKing={!view.last_result.correct}
              teamName={teamName || t("king.teamLabel")}
              teamIcon={teamIcon}
            />
            {!isCaptain && (
              <p className="text-sm text-[#402666]/70 text-center">
                {t("king.captainNextHint")}
              </p>
            )}
          </div>
        )}

        {phase === "result" && (
          <div className="flex flex-col items-center gap-4 pt-16">
            {view.status === "won" ? (
              <Crown className="w-16 h-16 text-[#f5a623]" />
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
            <p className="font-display text-2xl font-bold text-[#402666] text-center">
              {view.status === "won" ? t("king.teamWon") : t("king.teamLost")}
            </p>
            <p className="text-[#402666]/70">
              {view.team_score} : {view.king_score}
            </p>
            {isHost && (
              <button onClick={onRestart} className={`${DUEL_CTA} px-8`}>
                {t("king.playAgain")}
              </button>
            )}
            <button onClick={onExit} className="text-sm font-semibold text-[#402666]/80">
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
