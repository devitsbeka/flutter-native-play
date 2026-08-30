import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { Tables } from "@/integrations/supabase/types";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, Crown, Share2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useServerDeadline } from "@/hooks/useServerDeadline";
import { readAppLanguage } from "@/utils/appLanguage";
import { toast } from "@/lib/toast";
import { shareOrCopy } from "@/utils/shareLink";
import { InviteFriendsModal } from "@/components/team/InviteFriendsModal";
import { FriendsStoriesBar } from "@/components/team/FriendsStoriesBar";
import {
  CaptainChip,
  AnimatedCoinPill,
  FriendPeek,
  type InviteEntry,
  LILAC_BG,
  LilacHeader,
  FitBox,
  PlusChooser,
  PlusSeat,
  Seat,
  SeatMenu,
  StartButton,
} from "@/components/lobby/LilacLobby";
import sceneKing from "@/assets/vk-lobby/scene-king.webp";

const CARD_SHADOW = "0px 2px 8px 0px rgba(102,51,153,0.06), 0px 8px 24px 0px rgba(102,51,153,0.12)";

// What king_state() sends back; the reveal fields ride only on submit/expire.
interface KingState {
  match_id: string;
  status: "playing" | "won" | "lost" | "abandoned";
  player_score: number;
  king_score: number;
  question_number: number;
  question?: { question_text: string; image_url?: string | null; think_deadline: string };
  options?: string[];
  commit_deadline?: string;
  correct?: boolean;
  correct_answer?: string;
  explanation?: string;
}

type Stage = "intro" | "thinking" | "commit" | "reveal" | "result";

/**
 * /king — MyTrivia King (docs/GAME_TYPES_DESIGN.md §3). Solo and entirely
 * RPC-driven: the server holds the question pool, both deadlines, the
 * judgment, and the payout. This page's whole job is the ritual — a minute
 * of thinking with nothing to tap, a short commit, and the explanation.
 */
// Seat coordinates around the King's lounge, straight from the frame
// (940:7477…943:21899) — filled slots first, in the design's own order.
const KING_SEATS: [number, number][] = [
  [137, 458], [75, 480], [49, 546], [61, 618], [127, 670],
  [309, 458], [379, 480], [410, 546], [397, 618], [323, 668],
];

// The scene's edge fade (940:7551, applied twice in the frame).
const KING_SCENE_FADE =
  "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 435 780' xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='none'><rect x='0' y='0' height='100%' width='100%' fill='url(%23grad)' opacity='1'/><defs><radialGradient id='grad' gradientUnits='userSpaceOnUse' cx='0' cy='0' r='10' gradientTransform='matrix(1.5933e-14 42.3 -23.59 1.991e-14 217.5 390)'><stop stop-color='rgba(213,186,255,0)' offset='0'/><stop stop-color='rgba(229,202,255,0.51)' offset='0.5'/><stop stop-color='rgba(245,217,255,1)' offset='0.97596'/></radialGradient></defs></svg>\")";

export default function KingPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  const [stage, setStage] = useState<Stage>("intro");
  const [state, setState] = useState<KingState | null>(null);
  const [reveal, setReveal] = useState<KingState | null>(null);
  const [busy, setBusy] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
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
  const [kingRoom, setKingRoom] = useState<Tables<"game_rooms"> | null>(null);
  const [kingParts, setKingParts] = useState<Tables<"room_participants">[]>([]);
  const [kingPending, setKingPending] = useState<Tables<"room_participants">[]>([]);
  const [seatMenu, setSeatMenu] = useState<Tables<"room_participants"> | null>(null);
  const roomAttempted = useRef(false);
  const kingRoomRef = useRef<Tables<"game_rooms"> | null>(null);
  kingRoomRef.current = kingRoom;
  const channelRef = useRef<RealtimeChannel | null>(null);

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

  const refreshKingParts = useCallback(async () => {
    const roomId = kingRoomRef.current?.id;
    if (!roomId) return;
    const { data } = await supabase
      .from("room_participants")
      .select("*")
      .eq("room_id", roomId)
      .in("status", ["joined", "ready", "playing", "invited"])
      .order("joined_at", { ascending: true });
    if (data) {
      setKingParts(data.filter((part) => part.status !== "invited"));
      setKingPending(data.filter((part) => part.status === "invited"));
    }
  }, []);

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

  // Inviting opens the app's invite modal (search, friends, copy link,
  // social share) wired to this lounge's real room — an invited friend gets
  // the notification and lands on this couch.
  const [inviteOpen, setInviteOpen] = useState(false);
  const [peek, setPeek] = useState<InviteEntry | null>(null);
  const [chooserOpen, setChooserOpen] = useState(false);
  const inviteFriends = useCallback(() => setChooserOpen(true), []);

  const thinkSeconds = useServerDeadline(
    stage === "thinking" ? state?.question?.think_deadline : undefined,
    showOptions,
  );
  const commitSeconds = useServerDeadline(
    stage === "commit" ? state?.commit_deadline : undefined,
    () => void expire(),
  );

  // The lobby is the Versus King frame (Figma 940:7474) rendered at design
  // coordinates: the King's lounge scene, your friends in the invite row,
  // seats around the couch, and the Start CTA driving the existing match.
  // Header, friends strip, and the Start CTA are flow elements — always on
  // screen, strip scrolling edge to edge. Only the scene region (design
  // y160–841, re-based below) is scale-fitted into the flexible middle.
  if (stage === "intro") {
    return (
      <div
        className="h-[100dvh] w-full overflow-hidden safe-bleed flex flex-col"
        style={{ background: LILAC_BG }}
      >
        <LilacHeader
          title={t("lobby.vkTitle")}
          onBack={() => navigate(-1)}
          onHelp={() => setHelpOpen((v) => !v)}
        />

        {/* the same friends reel the home page uses — identical sizes/fonts */}
        <div className="relative z-10 w-full shrink-0 px-4" style={{ transform: "translateZ(0)" }}>
          <FriendsStoriesBar
            onAddFriendClick={inviteFriends}
            onFriendClick={(f) =>
              setPeek({ id: f.friendId, nickname: f.nickname, avatarUrl: f.avatarUrl, online: !!f.isOnline })
            }
          />
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          <FitBox width={500} height={681}>
            {/* scene (940:7476) + its double edge fade (940:7551/7666) */}
            <div className="absolute left-[32px] top-[-133px] w-[435px] h-[780px] pointer-events-none">
              <img alt="" className="absolute inset-0 max-w-none object-cover size-full" src={sceneKing} />
              <div className="absolute inset-0" style={{ backgroundImage: KING_SCENE_FADE }} />
              <div className="absolute inset-0" style={{ backgroundImage: KING_SCENE_FADE }} />
            </div>

            {/* Winner takes: (940:7510) + the coins pill (940:7560) */}
            <p className="absolute left-[32px] top-[107px] w-[435px] font-[Nunito] font-medium leading-[24px] text-[#0c172c] text-[18px] text-center tracking-[-0.16px]">
              {t("lobby.winnerTakes")}
            </p>
            <AnimatedCoinPill left={174} top={139} width={152} value={200 * Math.max(1, kingParts.length)} />

            {/* seats around the couch — participants first, then pending
                invitees greyed until they accept, the rest open */}
            <AnimatePresence>
            {KING_SEATS.map(([left, top], i) => {
              const active = kingParts[i];
              const pending = !active ? kingPending[i - kingParts.length] : undefined;
              const part = active ?? pending;
              return part ? (
                <Seat
                  key={part.user_id}
                  left={left}
                  top={top - 160}
                  avatarUrl={part.avatar_url}
                  nickname={part.nickname}
                  pending={!active}
                  onLongPress={
                    kingRoom?.host_user_id === user?.id && part.user_id !== user?.id
                      ? () => setSeatMenu(part)
                      : undefined
                  }
                  onClick={
                    !active && kingRoom?.host_user_id === user?.id
                      ? () => setSeatMenu(part)
                      : undefined
                  }
                />
              ) : (
                <PlusSeat key={`plus-${i}`} left={left} top={top - 160} onClick={inviteFriends} />
              );
            })}
            </AnimatePresence>

            {/* Captain (940:7788 + 936:21188) — the room's host */}
            <p className="absolute left-[38px] top-[576px] font-[Nunito] font-medium leading-[24px] text-[#0c172c] text-[15px] tracking-[-0.16px]">
              {t("lobby.captainLabel")}
            </p>
            <CaptainChip
              left={38}
              top={610}
              avatarUrl={(kingParts.find((p) => p.is_host) ?? kingParts[0])?.avatar_url ?? profile?.avatar_url}
              name={(kingParts.find((p) => p.is_host) ?? kingParts[0])?.nickname ?? profile?.nickname}
              placeholder={t("lobby.chooseCaptain")}
            />

            {(helpOpen || noPool) && (
              <div
                className="absolute left-[32px] top-[20px] w-[435px] rounded-[24px] p-5 bg-white/90 border border-[#e8e0f5] z-10"
                style={{ boxShadow: CARD_SHADOW }}
                onClick={() => setHelpOpen(false)}
              >
                <p className="font-bold text-[#402666] mb-1">{t("king.introTitle")}</p>
                <p className="text-sm text-[#402666]/60">{t("king.introBody")}</p>
                {noPool && (
                  <p className="text-sm font-medium text-amber-700 mt-3">{t("king.noQuestions")}</p>
                )}
              </div>
            )}
          </FitBox>
        </div>

        <StartButton
          label={t("lobby.startGame")}
          onClick={startForEveryone}
          disabled={busy || !state}
        />

        <InviteFriendsModal
          isOpen={inviteOpen}
          onClose={() => setInviteOpen(false)}
          inviteLink={kingRoom ? `https://mytrivia.io/king?code=${kingRoom.room_code}` : "https://mytrivia.io/king"}
          roomId={kingRoom?.id}
          roomCode={kingRoom?.room_code}
        />

        <PlusChooser
          open={chooserOpen}
          title={t("lobby.seatChooserTitle")}
          options={[
            {
              icon: <UserPlus className="w-5 h-5" />,
              label: t("lobby.inviteFriend"),
              sub: t("lobby.inviteToGame"),
              onPress: () => setInviteOpen(true),
            },
            {
              icon: <Share2 className="w-5 h-5" />,
              label: t("lobby.sendLink"),
              sub: kingRoom ? `mytrivia.io/king?code=${kingRoom.room_code}` : "mytrivia.io/king",
              onPress: () => {
                void shareOrCopy({
                  url: kingRoom
                    ? `https://mytrivia.io/king?code=${kingRoom.room_code}`
                    : "https://mytrivia.io/king",
                }).then((outcome) => {
                  if (outcome === "copied") toast.success(t("lobby.linkCopied"));
                  else if (outcome === "failed") toast.error(t("common.error"));
                });
              },
            },
          ]}
          onClose={() => setChooserOpen(false)}
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
                      setKingParts((prev) => prev.filter((part) => part.user_id !== target));
                      setKingPending((prev) => prev.filter((part) => part.user_id !== target));
                      void supabase
                        .rpc("lobby_manage_seat", {
                          p_room_id: kingRoom.id,
                          p_user_id: target,
                          p_action: "remove",
                        })
                        .then(({ error }) => {
                          if (error) {
                            toast.error(error.message);
                            void refreshKingParts();
                          }
                        });
                    },
                  },
                ]
              : []
          }
        />

        <FriendPeek
          friend={peek}
          onClose={() => setPeek(null)}
          actionLabel={t("lobby.inviteToGame")}
          invitedLabel={t("lobby.invitedState")}
          invited={
            !!peek &&
            (invitedIds.has(peek.id) || kingParts.some((p) => p.user_id === peek.id))
          }
          onAction={() => peek && void inviteToGame(peek)}
        />
      </div>
    );
  }

  return (
    <div className="h-[calc(100dvh_-_var(--safe-top)_-_var(--safe-bottom))] overflow-y-auto bg-background">
      <div className="max-w-md mx-auto px-5 pb-10">
        <div className="flex items-center gap-2 pt-4 pb-2">
          <button
            onClick={() => void abandon()}
            aria-label={t("common.back")}
            className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-[#402666] active:scale-95 transition-transform"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="font-display text-xl font-bold text-[#402666] flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500" /> {t("king.title")}
          </h1>
        </div>

        {state && (
          <div className="flex items-center justify-center gap-6 py-3">
            <div className="text-center">
              <p className="text-[11px] text-[#402666]/50">{t("king.you")}</p>
              <p className="font-display text-2xl font-bold text-[#402666]">{state.player_score}</p>
            </div>
            <span className="text-[#402666]/30 text-xs">{t("king.firstTo6")}</span>
            <div className="text-center">
              <p className="text-[11px] text-[#402666]/50">{t("king.king")}</p>
              <p className="font-display text-2xl font-bold text-[#402666]">{state.king_score}</p>
            </div>
          </div>
        )}

        {stage === "thinking" && state?.question && (
          <div className="flex flex-col gap-4 mt-2">
            <p className="text-xs text-[#402666]/40 text-center">
              {t("king.questionNo", { n: state.question_number })}
            </p>
            <div
              className="rounded-[24px] p-6"
              style={{ background: "rgba(252,247,255,0.92)", boxShadow: CARD_SHADOW }}
            >
              <p className="font-bold text-[17px] text-[#402666] leading-relaxed">
                {state.question.question_text}
              </p>
              {state.question.image_url && (
                <img src={state.question.image_url} alt="" className="mt-4 rounded-xl max-w-full" />
              )}
            </div>
            <p className="font-mono text-4xl text-[#7C3AED] font-bold text-center">{thinkSeconds}</p>
            <p className="text-sm text-[#402666]/50 text-center -mt-2">{t("king.thinkHint")}</p>
            <button
              onClick={() => void showOptions()}
              className="rounded-[20px] p-4 bg-[#7C3AED] text-white font-bold"
            >
              {t("king.haveIt")}
            </button>
          </div>
        )}

        {stage === "commit" && state?.question && (
          <div className="flex flex-col gap-3 mt-2">
            <div
              className="rounded-[24px] p-5"
              style={{ background: "rgba(252,247,255,0.92)", boxShadow: CARD_SHADOW }}
            >
              <p className="font-bold text-[#402666]">{state.question.question_text}</p>
            </div>
            <p className="font-mono text-3xl text-red-400 font-bold text-center">{commitSeconds}</p>
            <p className="text-sm text-[#402666]/50 text-center -mt-2">{t("king.commitHint")}</p>
            <div className="flex flex-col gap-2">
              {(state.options ?? []).map((option) => (
                <motion.button
                  key={option}
                  whileTap={{ scale: 0.97 }}
                  disabled={busy}
                  onClick={() => void submit(option)}
                  className="rounded-xl px-4 py-3 text-left text-sm font-medium text-[#402666] disabled:opacity-60"
                  style={{ background: "rgba(252,247,255,0.92)", boxShadow: CARD_SHADOW }}
                >
                  {option}
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
                reveal.correct ? "text-emerald-500" : "text-red-400"
              }`}
            >
              {reveal.correct ? t("king.cracked") : t("king.kingScores")}
            </motion.p>
            <div
              className="rounded-[24px] p-5"
              style={{ background: "rgba(252,247,255,0.92)", boxShadow: CARD_SHADOW }}
            >
              <p className="text-xs text-[#402666]/40 mb-1">{t("king.answerLabel")}</p>
              <p className="font-bold text-[#402666] mb-3">{reveal.correct_answer}</p>
              <p className="text-xs text-[#402666]/40 mb-1">{t("king.logicLabel")}</p>
              <p className="text-sm text-[#402666]/80 leading-relaxed">{reveal.explanation}</p>
            </div>
            <button
              onClick={() => (state?.status === "playing" ? void draw() : setStage("result"))}
              disabled={busy}
              className="rounded-[20px] p-4 bg-[#7C3AED] text-white font-bold disabled:opacity-50"
            >
              {state?.status === "playing" ? t("king.next") : t("common.continue")}
            </button>
          </div>
        )}

        {stage === "result" && state && (
          <div className="flex flex-col items-center gap-4 pt-16">
            <Crown
              className={`w-16 h-16 ${state.status === "won" ? "text-amber-500" : "text-[#402666]/20"}`}
            />
            <p className="font-display text-2xl font-bold text-[#402666] text-center">
              {state.status === "won" ? t("king.youWon") : t("king.kingWon")}
            </p>
            <p className="text-[#402666]/60">
              {state.player_score} : {state.king_score}
            </p>
            <button
              onClick={() => {
                setState(null);
                matchIdRef.current = null;
                setStage("intro");
                void start();
              }}
              className="rounded-[20px] px-8 py-4 bg-[#7C3AED] text-white font-bold"
            >
              {t("king.playAgain")}
            </button>
            <button onClick={() => navigate(-1)} className="text-sm text-[#402666]/40">
              {t("common.back")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
