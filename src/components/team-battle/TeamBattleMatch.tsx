import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { BellRing, Bot, Check, ChevronLeft, Star, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useFriends } from "@/hooks/useFriends";
import { useCategories } from "@/hooks/useCategories";
import { useServerDeadline } from "@/hooks/useServerDeadline";
import { QuizQuestionCard } from "@/components/ui/quiz-question-card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { QuizAnswerButton, type QuizAnswerState } from "@/components/ui/quiz-answer-button";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { TimerBadge } from "@/components/game/TimerBadge";
import { SmartAvatar } from "@/components/shared/SmartAvatar";
import { CategoryArtwork } from "@/components/shared/CategoryArtwork";
import { DynamicIcon } from "@/components/shared/DynamicIcon";
import { imageTreatmentFor } from "@/utils/questionImageTreatment";
import trophyWin from "@/assets/icons/trophy-win.png";
import rpsRock from "@/assets/tb-rps/rps-rock.webp";
import rpsPaper from "@/assets/tb-rps/rps-paper.webp";
import rpsScissors from "@/assets/tb-rps/rps-scissors.webp";
import {
  superQuestions,
  tileQuestions,
  useTeamBattle,
  type TBGesture,
  type TBParticipant,
  type TBQuestion,
  type TBTeam,
  type TBTile,
} from "@/contexts/TeamBattleContext";
import { dealtCrests, fetchCrestPool } from "@/utils/roomCrests";
import { createNotification } from "@/hooks/useNotifications";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";
import { useIncomingReactions } from "@/hooks/useRoomReactions";
import { ReactionBar, ReactionInbox } from "@/components/team-battle/ReactionBar";

// The app's chunky-3D language (see QuizAnswerButton/QuizTrueFalseButton):
// a solid depth layer behind a face, on the periwinkle game background.
const SHELL = "h-[100dvh] w-full overflow-hidden safe-bleed bg-[#7E7BDC]";
const COLUMN = "w-full h-full flex flex-col max-w-[700px] md:max-w-[520px] mx-auto";
const ANSWER_LABELS = ["A", "B", "C", "D"];
const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "bg-success",
  medium: "bg-amber-500",
  hard: "bg-destructive",
};
// The board tile's single price pill (Figma 1019:41214): the tier's colour
// IS the difficulty and the number inside is the prize — green/yellow/red,
// not a difficulty word beside a separate number. Dark ink on the light
// tiers, white on the red, so the value reads on each.
const DIFFICULTY_PILL: Record<string, string> = {
  easy: "bg-[#7EDC7B] text-[#1D5423]",
  medium: "bg-[#F1D45E] text-[#6E5410]",
  hard: "bg-[#E68A8A] text-white",
};
// The 3D renders from the Figma frame (966:30083) — a rock on its patch of
// grass, a paper roll, real scissors — used on the throw cards and every
// reveal badge alike.
const GESTURES: { key: TBGesture; icon: string }[] = [
  { key: "rock", icon: rpsRock },
  { key: "paper", icon: rpsPaper },
  { key: "scissors", icon: rpsScissors },
];
const GESTURE_ICONS: Record<string, string> = {
  rock: rpsRock,
  paper: rpsPaper,
  scissors: rpsScissors,
};

function GestureIcon({ g, size = 20 }: { g?: string | null; size?: number }) {
  const src = g ? GESTURE_ICONS[g] : undefined;
  if (!src) return <span>❔</span>;
  return (
    <img
      alt={g ?? ""}
      src={src}
      style={{ width: size, height: size }}
      className="inline-block object-contain align-middle"
    />
  );
}

// A side's real name (dealt at creation, renamed by its captain), falling
// back to the old letters for rooms made before names existed.
const teamLabel = (
  t: (k: string) => string,
  team: TBTeam | null | undefined,
  room?: { team_a_name?: string | null; team_b_name?: string | null } | null,
) =>
  (team === "a" ? room?.team_a_name : room?.team_b_name) ??
  (team === "a" ? t("teamBattle.teamA") : t("teamBattle.teamB"));

/** Category slug + icon for a tile, resolved from the tile's category uuid. */
function useTileCategory(tile: TBTile | undefined) {
  const { categories } = useCategories();
  return useMemo(
    () => categories.find((c) => c.uuid === tile?.category_id),
    [categories, tile?.category_id],
  );
}

function ScoreHeader({ seconds, maxSeconds }: { seconds?: number; maxSeconds?: number }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { state, myTeam, room, leaveMatch } = useTeamBattle();
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leaving, setLeaving] = useState(false);
  // The sides' crests, the same ones the lobby showed: the captains' picks
  // from the room row, or the deck's deal for a side that never chose (the
  // lobby's rule, so the match wears what the lobby wore).
  const [crestPool, setCrestPool] = useState<string[]>([]);
  useEffect(() => {
    void fetchCrestPool().then(setCrestPool);
  }, []);
  const crests = useMemo(
    () =>
      dealtCrests(room?.id ?? "", crestPool, {
        a: room?.team_a_icon ?? null,
        b: room?.team_b_icon ?? null,
      }),
    [room?.id, room?.team_a_icon, room?.team_b_icon, crestPool],
  );
  if (!state) return null;
  // While the match RUNS, the back arrow is a real exit with a real price:
  // the 200-coin desertion fee (owner's rule), behind a confirm. Once the
  // game is done — or the room already moved on — walking away is free.
  const inLiveMatch = room?.status === "playing" && state.phase !== "done";
  const confirmAndLeave = async () => {
    setLeaving(true);
    const ok = await leaveMatch();
    if (ok) {
      navigate("/");
    } else {
      setLeaving(false);
      setConfirmLeave(false);
    }
  };
  const side = (team: TBTeam) => (
    <div className={`flex flex-col ${team === "a" ? "items-start" : "items-end"}`}>
      <span className={`flex items-center gap-1.5 ${team === "a" ? "" : "flex-row-reverse"}`}>
        {crests[team] && (
          <img
            alt=""
            src={crests[team] ?? undefined}
            className="w-8 h-8 object-contain drop-shadow-sm shrink-0"
          />
        )}
        <span className="text-white/70 text-[11px] font-semibold uppercase tracking-wide">
          {teamLabel(t, team, room)}
          {myTeam === team ? ` · ${t("teamBattle.you")}` : ""}
        </span>
      </span>
      <motion.span
        key={team === "a" ? state.team_a_score : state.team_b_score}
        initial={{ scale: 1.25 }}
        animate={{ scale: 1 }}
        className="font-display text-3xl font-black text-white drop-shadow-sm"
      >
        {team === "a" ? state.team_a_score : state.team_b_score}
      </motion.span>
    </div>
  );
  return (
    <div className="flex items-center justify-between px-4 pt-3 pb-1 flex-shrink-0">
      <div className="flex items-center gap-2.5">
        {/* The way out. Mid-match it costs the desertion fee behind a
            confirm; after the game it just closes this screen. */}
        <button
          type="button"
          onClick={() => (inLiveMatch ? setConfirmLeave(true) : navigate("/"))}
          aria-label={t("common.back")}
          className="w-9 h-9 -ml-1 shrink-0 rounded-full bg-white/15 flex items-center justify-center active:scale-95 transition-transform"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <AlertDialog open={confirmLeave} onOpenChange={(open) => !leaving && setConfirmLeave(open)}>
          <AlertDialogContent className="bg-card border-border rounded-3xl max-w-sm">
            <AlertDialogHeader className="text-center">
              <AlertDialogTitle>{t("teamBattle.leaveMatchTitle")}</AlertDialogTitle>
              <AlertDialogDescription>{t("teamBattle.leaveMatchBody")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row gap-3">
              <AlertDialogCancel disabled={leaving} className="flex-1 mt-0">
                {t("extra.rlCancel")}
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={leaving}
                onClick={(e) => {
                  e.preventDefault();
                  void confirmAndLeave();
                }}
                className="flex-1 bg-destructive hover:bg-destructive/90"
              >
                {t("teamBattle.leaveMatchConfirm")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {side("a")}
      </div>
      {typeof seconds === "number" ? (
        <TimerBadge seconds={seconds} maxSeconds={maxSeconds ?? 30} compact />
      ) : (
        <span className="text-white/40 font-black text-sm">vs</span>
      )}
      {side("b")}
    </div>
  );
}

export function TeamBattleMatch({ onResultDismiss }: { onResultDismiss?: () => void }) {
  const { state, participants, reactions } = useTeamBattle();
  const { user } = useAuth();
  // Icons sent to me during my turn, held until the turn is over: the
  // inbox lives here, above the phases, so it survives the phase switch
  // that is exactly when it gets read.
  const inbox = useIncomingReactions(reactions, user?.id);
  const senders = useMemo(
    () => new Map(participants.map((p) => [p.user_id, { nickname: p.nickname, avatar_url: p.avatar_url }])),
    [participants],
  );
  if (!state) return null;
  const onSpot = state.phase === "rapid_fire" && state.active_player === user?.id;
  const strip = !onSpot && inbox.next && (
    <div className="fixed inset-x-0 z-30 flex justify-center pointer-events-none" style={{ top: "calc(var(--safe-top) + 4.5rem)" }}>
      <div className="w-full max-w-[520px] pointer-events-auto">
        <ReactionInbox
          next={inbox.next}
          remaining={inbox.remaining}
          senders={senders}
          onDismiss={inbox.dismiss}
        />
      </div>
    </div>
  );
  const phase = (() => {
    switch (state.phase) {
      case "rps":
        return <PhaseRps />;
      case "board":
        return <PhaseBoard />;
      case "rapid_fire":
        return <PhaseRapidFire />;
      case "super_vote":
        return <PhaseSuperVote />;
      case "super_round":
        return <PhaseSuperRound />;
      case "done":
        return <PhaseDone onDismiss={onResultDismiss} />;
      default:
        return null;
    }
  })();
  return (
    <>
      {phase}
      {strip}
    </>
  );
}

/** The recorded hand of an opener round (rps.last, 20260921190000). */
interface RpsReveal {
  team_a: string;
  team_b: string;
  tie: boolean;
  winner?: string;
  throws: Record<string, string>;
}


function PhaseRps() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { state, participants, room, submitRps, advance } = useTeamBattle();
  const [thrown, setThrown] = useState<TBGesture | null>(null);
  const secondsLeft = useServerDeadline(state?.deadline, advance);

  const rps = (state?.rps ?? {}) as Record<string, unknown>;
  const throws = (rps.throws ?? {}) as Record<string, string>;
  const round = (rps.round as number) ?? 0;
  const last = (rps.last as RpsReveal | undefined) ?? null;
  const mine = (user && (throws[user.id] as TBGesture)) || thrown;

  // A tie starts a fresh hand server-side: the round counter moving is the
  // signal to rearm this device's buttons.
  useEffect(() => setThrown(null), [round]);

  // The opener is the captains' duel (20260921210000): one throw per team,
  // by the armband. Everyone else watches the two captains face off.
  const amCaptain = !!participants.find((p) => p.user_id === user?.id)?.is_captain;
  const captainOf = (team: TBTeam) =>
    participants.find((p) => p.team === team && p.is_captain);

  /**
   * Nothing is shown until both hands are in.
   *
   * Whoever threw second could otherwise read the winning counter off the
   * screen, so the tiles say only THAT a captain has locked in — then both
   * turn over together, big enough to see from across the room, which is
   * the moment the whole phase exists for.
   */
  const capA = captainOf("a");
  const capB = captainOf("b");
  const throwOf = (p: typeof capA) => (p ? (throws[p.user_id] as TBGesture | undefined) : undefined);
  const bothIn = !!throwOf(capA) && !!throwOf(capB);

  /** One captain: their face, their side's name, and what they threw. */
  const CaptainSide = ({ team }: { team: TBTeam }) => {
    const p = captainOf(team);
    const live = throwOf(p);
    // After a tie the resolved hand lingers until that captain rethrows, so
    // the room can see WHY it was a tie.
    const stale = !live && last?.tie && p ? (last.throws[p.user_id] as TBGesture | undefined) : undefined;
    const shown = bothIn ? live : stale;
    return (
      <div className="flex min-w-0 flex-col items-center gap-1.5">
        {/* +15% on the 32px this used to be: the two faces are the subject
            of the screen now, not a caption on a list. */}
        <SmartAvatar
          avatarUrl={p?.avatar_url}
          fallback={p?.nickname ?? "?"}
          size="xs"
          className="w-[37px] h-[37px]"
        />
        <span className="w-full truncate text-center font-[Nunito] text-[12px] font-bold leading-4 text-[#402666]">
          {teamLabel(t, team, room)}
        </span>
        {/* The hand, under the face. It was a 13px emoji pinned to the
            avatar's corner — unreadable, and a ✅ for everyone but you. */}
        <motion.div
          key={shown ?? (live ? "locked" : "waiting")}
          initial={{ scale: 0.72, opacity: 0, rotate: -8 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 20 }}
          className={cn(
            "flex h-[84px] w-full max-w-[104px] items-center justify-center rounded-[20px]",
            shown
              ? "bg-white shadow-[0px_2px_0px_0px_#e6e0f0,0px_6px_16px_rgba(64,38,102,0.10)]"
              : live
                ? "bg-[#e9e2f7]"
                : "border-2 border-dashed border-[#c9b8ea] bg-white/50",
            stale && !bothIn && "opacity-45",
          )}
        >
          {shown ? (
            <img alt="" src={GESTURE_ICONS[shown]} className="h-[62px] w-[62px] object-contain" />
          ) : live ? (
            <Check className="h-7 w-7 text-[#7126d5]" strokeWidth={3} />
          ) : (
            <span className="animate-pulse-soft text-[26px] leading-none">💭</span>
          )}
        </motion.div>
      </div>
    );
  };

  return (
    <div className={SHELL}>
      <div className={COLUMN}>
        <ScoreHeader seconds={secondsLeft} maxSeconds={last?.tie ? 20 : 15} />
        {/* The stage is LIGHT.
            Three white cards on a lilac sheet at the bottom and everything
            above them floating on flat purple read as two screens stacked;
            the duel is one thing, so it gets one surface, and the hands are
            legible on it rather than glowing against a dark ground. */}
        <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-y-auto rounded-t-[28px] bg-[#f5f2fa] px-5 pt-6">
          <div className="shrink-0 text-center">
            <h1 className="font-hero text-[26px] capitalize leading-[32px] tracking-[-0.16px] text-[#402666]">
              {t("teamBattle.rpsTitle")}
            </h1>
            <p className="mt-1.5 font-[Nunito] text-[13px] font-medium text-[#402666]/60">
              {t("teamBattle.rpsSubtitle")}
            </p>
          </div>

          {last?.tie && (
            <p className="mt-4 flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#e9e2f7] px-4 py-2 text-center font-[Nunito] text-[13px] font-bold text-[#402666]">
              <GestureIcon g={last.team_a} size={26} /> {t("teamBattle.rpsTieBanner")}{" "}
              <GestureIcon g={last.team_b} size={26} />
            </p>
          )}

          {/* Side by side, with the VS between them: a duel is two people
              facing each other, not a two-row list. */}
          <div className="mt-5 grid shrink-0 grid-cols-[1fr_auto_1fr] items-start gap-2">
            <CaptainSide team="a" />
            <span className="mt-[10px] font-hero text-[20px] leading-6 text-[#b9a5e6]">VS</span>
            <CaptainSide team="b" />
          </div>

          {!amCaptain && (
            <p className="mt-5 shrink-0 animate-pulse-soft text-center font-[Nunito] text-[13px] font-medium text-[#402666]/60">
              {t("teamBattle.rpsCaptainsHint")}
            </p>
          )}
          <div className="min-h-[12px] flex-1" />

          {/* The captain's hand, on the same surface (966:30083): three
              white cards with the 3D renders — the rock on its grass, the
              paper roll, the scissors — and the "pick one" caption beneath. */}
          {amCaptain && (
            <div className="shrink-0 pb-[calc(1.1rem_+_var(--safe-bottom))]">
              <div className="mx-auto grid w-full max-w-sm grid-cols-3 gap-3">
                {GESTURES.map((g) => {
                  const picked = mine === g.key;
                  return (
                    <motion.button
                      key={g.key}
                      whileTap={!mine ? { scale: 0.94 } : undefined}
                      disabled={!!mine}
                      onClick={() => {
                        setThrown(g.key);
                        void submitRps(g.key);
                      }}
                      className={`relative flex h-[96px] items-center justify-center rounded-[22px] transition-shadow ${
                        picked ? "bg-[#eef7ff] ring-2 ring-[#38BDF8]" : "bg-white"
                      }`}
                      style={{
                        boxShadow: "0px 2px 0px 0px #e6e0f0, 0px 6px 16px rgba(64,38,102,0.10)",
                        opacity: mine && !picked ? 0.4 : 1,
                      }}
                    >
                      <img alt={g.key} src={g.icon} className="h-[68px] w-[68px] object-contain" />
                    </motion.button>
                  );
                })}
              </div>
              <p
                className={`mt-3.5 text-center font-[Nunito] text-sm font-semibold ${
                  mine ? "animate-pulse-soft text-[#402666]/50" : "text-[#402666]/70"
                }`}
              >
                {mine ? t("teamBattle.rpsWaiting") : t("teamBattle.rpsPickOne")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PhaseBoard() {
  const { t } = useLanguage();
  const { state, tiles, participants, room, isSpotlight, pickTile, playedBy, advance } = useTeamBattle();
  const { categories } = useCategories();
  const secondsLeft = useServerDeadline(state?.deadline, advance);
  const picker = participants.find((p) => p.user_id === state?.active_player);
  const rpsLast = (((state?.rps as Record<string, unknown>)?.last ?? null) as RpsReveal | null);
  const openingPick = tiles.length > 0 && tiles.every((tl) => !tl.claimed_by_team);

  // A bot never taps: any device pumping tb_advance makes the server play
  // the bot's whole turn. First caller wins; the rest no-op.
  useEffect(() => {
    if (state?.phase === "board" && picker?.is_bot) void advance();
  }, [state?.phase, state?.active_player, picker?.is_bot, advance]);

  return (
    <div className={SHELL}>
      <div className={COLUMN}>
        <ScoreHeader seconds={secondsLeft} maxSeconds={30} />
        <div className="flex items-center gap-2 px-4 py-2 flex-shrink-0">
          {picker && !isSpotlight && (
            <SmartAvatar avatarUrl={picker.avatar_url} fallback={picker.nickname} size="xs" />
          )}
          <p className="text-white font-bold truncate">
            {isSpotlight
              ? t("teamBattle.yourPick")
              : t("teamBattle.someonePicking", { name: picker?.nickname ?? "…" })}
          </p>
        </div>
        {/* how the opener went — shown until the first tile is claimed */}
        {rpsLast && !rpsLast.tie && openingPick && (
          <div className="px-4 pb-2 flex-shrink-0">
            <div className="rounded-xl bg-white/10 border border-white/20 px-3 py-2 text-center text-sm font-medium text-white flex items-center justify-center gap-1.5 flex-wrap">
              {/* The hands at a size that can be read: this banner is the
                  only place the room learns HOW the opener was won, and at
                  22px the two 3D renders were a pair of smudges. */}
              <GestureIcon g={rpsLast.team_a} size={34} /> vs <GestureIcon g={rpsLast.team_b} size={34} /> —{" "}
              {t("teamBattle.rpsWonBanner", { team: teamLabel(t, (rpsLast.winner ?? null) as TBTeam, room) })}
            </div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-4 pb-[calc(1rem_+_var(--safe-bottom))]">
          <div className="grid grid-cols-2 gap-3">
            {tiles.map((tile) => {
              const played = !!tile.claimed_by_team;
              const cat = categories.find((c) => c.uuid === tile.category_id);
              // Who actually played this tile — learned live from state
              // updates; a mid-match joiner falls back to the team label.
              const playedPlayer = played
                ? participants.find((p) => p.user_id === playedBy[tile.id])
                : undefined;
              return (
                <motion.button
                  key={tile.id}
                  whileTap={isSpotlight && !played ? { scale: 0.96 } : undefined}
                  disabled={!isSpotlight || played}
                  onClick={() => void pickTile(tile.id)}
                  className="relative rounded-[20px] text-left"
                  style={{ paddingBottom: 6, opacity: played ? 0.45 : 1 }}
                >
                  {/* The deeper slate lip under the card (Figma border-b-10):
                      the tile reads as a raised key, not a flat rectangle. */}
                  <div
                    className="absolute inset-0 rounded-[20px]"
                    style={{ background: "#CBD5E1", transform: "translateY(6px)" }}
                  />
                  <div
                    className="relative rounded-[20px] p-3 min-h-[128px] flex flex-col items-center justify-center gap-2 bg-white"
                    style={{ boxShadow: "inset 0 2px 0 rgba(255,255,255,0.4)" }}
                  >
                    <CategoryArtwork
                      categoryId={cat?.category_id ?? ""}
                      iconSlug={cat?.icon_slug}
                      size={64}
                    />
                    <p className="text-[#313740] font-bold text-[15px] text-center leading-tight line-clamp-2">
                      {tile.category_name}
                    </p>
                    {played ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#2A2550]/10 text-[#2A2550]/70 text-[10px] font-bold max-w-full">
                        {playedPlayer ? (
                          <>
                            {playedPlayer.avatar_url ? (
                              <img
                                alt=""
                                src={playedPlayer.avatar_url}
                                className="w-4 h-4 rounded-full object-cover shrink-0"
                              />
                            ) : (
                              <span className="w-4 h-4 rounded-full bg-[#2A2550]/20 text-[8px] flex items-center justify-center shrink-0">
                                {playedPlayer.nickname.charAt(0).toUpperCase()}
                              </span>
                            )}
                            <span className="truncate max-w-[64px]">{playedPlayer.nickname}</span>
                          </>
                        ) : (
                          teamLabel(t, tile.claimed_by_team as TBTeam, room)
                        )}
                        <span className="shrink-0">· +{tile.points_earned}</span>
                      </span>
                    ) : (
                      /* One pill: its colour is the difficulty, its number is
                         the prize (Figma 1019:41214) — no separate word. */
                      <span
                        className={`font-display text-lg font-black px-3.5 py-0.5 rounded-full leading-tight ${DIFFICULTY_PILL[tile.difficulty] ?? "bg-primary/10 text-primary"}`}
                      >
                        {tile.price}
                      </span>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/** The shared question card for a rapid-fire question, image treatment and all. */
function TurnQuestionCard({
  tile,
  question,
  secondsLeft,
  maxSeconds,
  revealAll,
}: {
  tile: TBTile;
  question: TBQuestion;
  secondsLeft: number;
  maxSeconds: number;
  revealAll?: boolean;
}) {
  const { t } = useLanguage();
  const cat = useTileCategory(tile);
  const treatment = imageTreatmentFor(cat?.category_id);
  const hasMedia = !!(question.image_url || question.video_url || question.audio_url);
  return (
    <div className={hasMedia ? "relative" : "relative mt-8"}>
      {/* The question's icon overlapping the card top — the same treatment
          the classic room game gives text questions; the pipeline's iconSlug
          rides the board (asQuestions), seeded fallback otherwise. */}
      {!hasMedia && (
        <div className="absolute left-1/2 -translate-x-1/2 -top-[41px] z-20 w-28 h-28">
          <DynamicIcon
            slug={question.icon_slug || undefined}
            seedText={question.question_text}
            size={112}
            className="drop-shadow-lg"
            hideIfEmpty={true}
          />
        </div>
      )}
      {/* No questionNumber/totalQuestions here: the card would print its own
          "8/12" dead centre under the overlapping icon — a ghost counter
          peeking out from behind the art. The top bar's pill already says it. */}
      <QuizQuestionCard
        questionText={question.question_text}
        imageUrl={question.image_url}
        videoUrl={question.video_url}
        audioUrl={question.audio_url}
        hideQuestionText={!!question.image_url}
        imageInset={treatment.inset}
        imageFramed={treatment.framed}
        imageBand={treatment.band}
        // Logos uncover a tile at a time while the clock runs — many brand
        // marks are the company's name in a typeface, so showing the whole
        // picture prints the answer on the card (same rule as solo play).
        imageReveal={treatment.inset}
        imageRevealAll={revealAll}
        reserveTopSpace={!hasMedia}
        timerSeconds={secondsLeft}
        timerMaxSeconds={maxSeconds}
        progressPercent={(secondsLeft / maxSeconds) * 100}
        difficultyLabel={t(`teamBattle.diff_${tile.difficulty}`)}
        difficultyColor={DIFFICULTY_COLORS[tile.difficulty]}
      />
    </div>
  );
}

function PhaseRapidFire() {
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  const {
    state, room, tiles, participants, isSpotlight, myTeam, submitAnswer,
    turnPicks, sendPick, lastPoke, sendPoke, advance,
  } = useTeamBattle();
  const secondsLeft = useServerDeadline(state?.deadline, advance);
  const [choice, setChoice] = useState<{ option: string; correct: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const tile = tiles.find((tl) => tl.id === state?.active_tile);
  const questions = tileQuestions(tile);
  const player = participants.find((p) => p.user_id === state?.active_player);
  const isBotTurn = !!player?.is_bot;
  const turnSeconds = isBotTurn ? 8 : state?.turn_seconds ?? 60;

  // A teammate who is not answering while the clock runs is losing the
  // team's points. Their teammates can call them: an in-app popup (the
  // realtime insert plays the sound and shows it), and a push for a player
  // away from the app. Cooldown stops the spam; the server throttles too.
  const canPoke = !isSpotlight && !isBotTurn && !!player && !!myTeam && player.team === myTeam;
  const [pokeCooldown, setPokeCooldown] = useState(false);
  const poke = async () => {
    if (!room || !player || !user || pokeCooldown) return;
    setPokeCooldown(true);
    window.setTimeout(() => setPokeCooldown(false), 30_000);
    const name = profile?.nickname || "";
    await createNotification(
      player.user_id,
      "room_ping",
      t("teamBattle.pokeNotifTitle", { name: name || "…" }),
      // Same as the lobby's call: the reader's device writes the line from
      // `kind`, and this is the fallback. A category name under "the clock
      // is running" told nobody anything.
      t("teamBattle.pokeNotifBody"),
      {
        kind: "team_poke",
        room_id: room.id,
        room_code: room.room_code,
        game_type_key: "team_battle",
        sender_nickname: name,
      },
    );
    supabase.functions
      .invoke("send-social-push", { body: { kind: "team_poke", roomId: room.id } })
      .catch(() => {});
    // The one that actually reaches somebody staring at the question. The
    // notification above plays their sound and the push finds them if they
    // have left the app; neither draws anything on the screen they are
    // looking at, because the app's toasts are delivery-suppressed.
    sendPoke(player.user_id, name);
    toast.success(t("teamBattle.pokeSent"));
  };

  /**
   * "Pick an answer!" — three seconds, and only for the player being called.
   *
   * Placed in the gap the question card already leaves above itself, so it
   * covers neither the question nor the answers; a call that hides the thing
   * it is telling you to answer is worse than no call at all.
   */
  const [called, setCalled] = useState(false);
  useEffect(() => {
    if (!lastPoke || !user || lastPoke.to !== user.id) return;
    setCalled(true);
    const timer = window.setTimeout(() => setCalled(false), 3000);
    return () => window.clearTimeout(timer);
  }, [lastPoke, user]);

  // The bot's turn is pre-rolled server-side; the showcase window animates it
  // so the room watches answers land instead of a frozen counter.
  const targetAnswers = state?.turn_answers ?? 0;
  const shownAnswers = isBotTurn
    ? Math.min(targetAnswers, Math.floor(((turnSeconds - secondsLeft) / turnSeconds) * (targetAnswers + 1)))
    : targetAnswers;
  const serverIndex = Math.min(shownAnswers, Math.max(questions.length - 1, 0));

  // Spectators hold each just-answered question ~0.9s so the pick's colour
  // actually reads before the next question flips in. The picks arrive on
  // the live broadcast; if one goes missing the server counter takes over,
  // so watching never stalls.
  const [held, setHeld] = useState(0);
  useEffect(() => setHeld(0), [state?.active_tile]);
  useEffect(() => {
    if (held >= turnPicks.length) return;
    const id = window.setTimeout(() => setHeld((h) => h + 1), 900);
    return () => window.clearTimeout(id);
  }, [turnPicks.length, held]);

  const revealPick =
    !isSpotlight && !isBotTurn && held < turnPicks.length ? turnPicks[held] : null;
  const index = revealPick
    ? Math.min(revealPick.index, Math.max(questions.length - 1, 0))
    : serverIndex;
  const question = questions[index];

  // Material exhausted before the clock: close the human turn — after a
  // beat, so the final answer's green/red actually lands (and spectators'
  // replay of it finishes) instead of the board yanking everyone away the
  // instant the last pick registers. First advance() wins server-side; the
  // rest no-op.
  useEffect(() => {
    if (!(state && tile && !isBotTurn && targetAnswers >= questions.length)) return;
    const id = window.setTimeout(() => void advance(), 1400);
    return () => window.clearTimeout(id);
  }, [state, tile, isBotTurn, targetAnswers, questions.length, advance]);

  useEffect(() => setChoice(null), [state?.active_tile]);
  useEffect(() => {
    // A fresh question clears the reveal — but the LAST answer's reveal
    // holds until the delayed close, or the buttons would briefly rearm.
    if ((state?.turn_answers ?? 0) < questions.length) setChoice(null);
  }, [state?.turn_answers, questions.length]);

  // The clock is out. tb_submit_answer refuses a late answer anyway ("Turn
  // is over", two seconds' grace), but refusing it server-side leaves the
  // buttons live and the player tapping into a hole: the RPC errors, no
  // pick registers, and the turn looks like it is still going until
  // tb_advance lands — which is a round trip away, and retried only every
  // 2.5s. The turn is over the moment the number says so.
  const timeUp = secondsLeft <= 0;

  const answer = async (option: string) => {
    if (submitting || choice || !question || timeUp) return;
    setSubmitting(true);
    const res = await submitAnswer(targetAnswers, option);
    if (res) {
      setChoice({ option, correct: res.correct });
      // Everyone else watches this land live.
      sendPick({ index: targetAnswers, option, correct: res.correct });
    }
    setSubmitting(false);
  };

  const answerState = (option: string): QuizAnswerState => {
    if (!isSpotlight) {
      // The spectator's buttons replay the spotlight player's pick: their
      // choice in green/red, and the right answer surfaced on a miss.
      if (revealPick) {
        if (option === revealPick.option) return revealPick.correct ? "correct" : "wrong";
        if (!revealPick.correct && option === question.correct_answer) return "correct";
      }
      return "disabled";
    }
    if (!choice && timeUp) return "disabled";
    if (!choice) return submitting ? "loading" : "default";
    if (option === choice.option) return choice.correct ? "correct" : "wrong";
    // A miss surfaces the right answer for the spotlight player too —
    // spectators already got it, and red alone teaches nothing.
    if (!choice.correct && option === question.correct_answer) return "correct";
    return "disabled";
  };

  if (!tile || !question) return null;

  return (
    <div className={SHELL}>
      <div className={COLUMN}>
        <ScoreHeader seconds={secondsLeft} maxSeconds={turnSeconds} />
        <div className="flex items-center justify-between gap-2 px-4 py-2 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {!isSpotlight &&
              (isBotTurn ? (
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              ) : (
                <SmartAvatar avatarUrl={player?.avatar_url} fallback={player?.nickname ?? "?"} size="xs" />
              ))}
            <p className="text-white font-bold truncate">
              {isSpotlight ? t("teamBattle.yourTurn") : t("teamBattle.watching", { name: player?.nickname ?? "…" })}
              <span className="text-white/60 font-normal"> · {tile.category_name}</span>
            </p>
          </div>
          {canPoke && (
            <button
              type="button"
              onClick={() => void poke()}
              disabled={pokeCooldown}
              aria-label={t("teamBattle.poke")}
              className="shrink-0 flex items-center gap-1 rounded-full bg-amber-400 text-[#402666] px-3 py-1.5 text-xs font-bold shadow-md active:scale-95 transition-transform disabled:opacity-40"
            >
              <BellRing className="w-3.5 h-3.5" />
              {t("teamBattle.poke")}
            </button>
          )}
          {/* Not "n / 12" any more: the turn is a fixed three minutes and
              the count is open-ended, so the pill totals the run so far. */}
          <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full shrink-0">
            <span className="text-emerald-300 font-bold text-sm">
              ✓ {turnPicks.filter((p) => p.correct).length}
            </span>
            <span className="text-red-300 font-bold text-sm">
              ✗ {turnPicks.filter((p) => !p.correct).length}
            </span>
          </div>
        </div>

        {/* the turn's running tally — a green/red dot per answered question,
            so everyone reads the turn at a glance (only the freshest twelve:
            a three-minute run would otherwise overflow the row) */}
        {!isBotTurn && turnPicks.length > 0 && (
          <div className="flex justify-center gap-1.5 px-4 pb-1 flex-shrink-0">
            {turnPicks.slice(-12).map((p) => (
              <motion.span
                key={p.index}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 480, damping: 20 }}
                className={`w-2.5 h-2.5 rounded-full ${p.correct ? "bg-emerald-400" : "bg-red-400"}`}
              />
            ))}
          </div>
        )}

        <div className="relative px-4 pt-8 flex-shrink-0">
          <AnimatePresence>
            {called && (
              <motion.div
                key="call"
                initial={{ opacity: 0, y: -6, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 480, damping: 26 }}
                className="pointer-events-none absolute left-1/2 top-0.5 z-30 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-amber-400 px-3 py-1 text-xs font-black uppercase tracking-wide text-[#402666] shadow-lg"
              >
                <BellRing className="h-3.5 w-3.5" />
                {t("teamBattle.callOut")}
              </motion.div>
            )}
          </AnimatePresence>
          <TurnQuestionCard
            tile={tile}
            question={question}
            secondsLeft={secondsLeft}
            maxSeconds={turnSeconds}
            // The full mark shows only once this question is answered — for
            // the spotlight when their pick locks, for spectators while the
            // answered question is being replayed.
            revealAll={isSpotlight ? !!choice : !!revealPick}
          />
        </div>

        <div className="flex-1 px-4 mt-3 flex flex-col gap-3 [@media(max-height:700px)]:gap-2 overflow-y-auto min-h-0 pb-[calc(0.5rem_+_var(--safe-bottom))]">
          {question.shuffled_answers.map((option, i) => (
            <div key={`${index}-${option}`} className="flex-shrink-0 w-full relative">
              <QuizAnswerButton
                label={ANSWER_LABELS[i]}
                text={option}
                state={answerState(option)}
                onClick={() => void answer(option)}
                disabled={!isSpotlight || !!choice || submitting || timeUp}
                showLabel
              />
            </div>
          ))}
          {!isSpotlight && (
            <p className="text-center text-white/60 text-xs pt-1">
              {t("teamBattle.tileWorth", { n: tile.price })}
            </p>
          )}
        </div>
        {/* Everyone watching can send the player on the spot an icon —
            a cheer from their side, a jab from the other. It waits in
            their inbox until the turn is over. */}
        {!isSpotlight && !isBotTurn && room && player && (
          <ReactionBar toUserId={player.user_id} />
        )}
      </div>
    </div>
  );
}

function PhaseSuperVote() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { state, participants, myTeam, voteSuper, advance } = useTeamBattle();
  const secondsLeft = useServerDeadline(state?.deadline, advance);
  const votes = ((state?.super as Record<string, unknown>)?.votes ?? {}) as Record<string, string>;
  const myVote = user ? votes[user.id] : undefined;
  const teammates = participants.filter((p) => p.team === myTeam && !p.is_bot);

  return (
    <div className={SHELL}>
      <div className={COLUMN}>
        <ScoreHeader seconds={secondsLeft} maxSeconds={30} />
        <div className="flex-1 flex flex-col gap-4 px-6 pt-6">
          <div className="text-center">
            <h1
              className="text-3xl font-black text-white"
              style={{ fontFamily: "'TASolivare', sans-serif", textShadow: "0 2px 10px rgba(0,0,0,0.3)" }}
            >
              {t("teamBattle.superVoteTitle")}
            </h1>
            <p className="text-white/70 text-sm mt-2">{t("teamBattle.superVoteSubtitle")}</p>
          </div>
          <div className="flex flex-col gap-3 mt-2">
            {teammates.map((p) => {
              const picked = myVote === p.user_id;
              return (
                <motion.button
                  key={p.user_id}
                  whileTap={!myVote ? { scale: 0.97 } : undefined}
                  disabled={!!myVote}
                  onClick={() => void voteSuper(p.user_id)}
                  className="relative rounded-2xl"
                  style={{ paddingBottom: 4, opacity: myVote && !picked ? 0.4 : 1 }}
                >
                  <div
                    className="absolute inset-0 rounded-2xl"
                    style={{ background: picked ? "#38BDF8" : "#CBD5E1", transform: "translateY(4px)" }}
                  />
                  <div
                    className="relative flex items-center gap-3 rounded-2xl px-4 py-3"
                    style={{
                      background: picked ? "#7DD3FC" : "#FFFFFF",
                      boxShadow: "inset 0 2px 0 rgba(255,255,255,0.4)",
                    }}
                  >
                    <SmartAvatar avatarUrl={p.avatar_url} fallback={p.nickname} size="sm" />
                    <span className={`font-bold ${picked ? "text-white" : "text-[#2A2550]"}`}>
                      {p.nickname}
                      {p.user_id === user?.id ? ` (${t("teamBattle.you")})` : ""}
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function PhaseSuperRound() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { state, participants, submitSuper, advance } = useTeamBattle();
  const secondsLeft = useServerDeadline(state?.deadline, advance);
  const [choice, setChoice] = useState<{ option: string; correct: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const sup = (state?.super ?? {}) as Record<string, unknown>;
  const index = (sup.question_index as number) ?? 0;
  const questions = superQuestions(state);
  const question = questions[index];
  const iAmChampion = !!user && [sup.champion_a, sup.champion_b].includes(user.id);
  const attempted = ((sup.attempted ?? {}) as Record<string, boolean>)[user?.id ?? ""] ?? false;
  const champ = (id: unknown) => participants.find((p) => p.user_id === id);

  useEffect(() => setChoice(null), [index]);

  const answer = async (option: string) => {
    if (submitting || choice || attempted || !question) return;
    setSubmitting(true);
    const res = await submitSuper(index, option);
    if (res) setChoice({ option, correct: res.correct });
    setSubmitting(false);
  };

  const answerState = (option: string): QuizAnswerState => {
    if (!iAmChampion || attempted) return "disabled";
    if (!choice) return submitting ? "loading" : "default";
    if (option === choice.option) return choice.correct ? "correct" : "wrong";
    return "disabled";
  };

  const champSide = (id: unknown, score: unknown) => {
    const p = champ(id);
    return (
      <div className="flex flex-col items-center gap-1">
        <SmartAvatar avatarUrl={p?.avatar_url} fallback={p?.nickname ?? "?"} size="md" />
        <span className="text-white/80 text-xs font-semibold truncate max-w-[90px]">{p?.nickname}</span>
        <span className="font-display text-2xl font-black text-white">{(score as number) ?? 0}</span>
      </div>
    );
  };

  return (
    <div className={SHELL}>
      <div className={COLUMN}>
        <div className="flex items-center justify-between px-6 pt-3 flex-shrink-0">
          {champSide(sup.champion_a, sup.score_a)}
          <div className="flex flex-col items-center gap-1">
            <h1
              className="text-xl font-black text-white"
              style={{ fontFamily: "'TASolivare', sans-serif" }}
            >
              {t("teamBattle.superRoundTitle")}
            </h1>
            <span className="text-white/60 text-[11px]">{t("teamBattle.firstTo3")}</span>
            <TimerBadge seconds={secondsLeft} maxSeconds={15} compact />
          </div>
          {champSide(sup.champion_b, sup.score_b)}
        </div>

        {question && (
          <>
            <div className="px-4 pt-6 flex-shrink-0">
              <div className={question.image_url ? "relative" : "relative mt-8"}>
                {!question.image_url && (
                  <div className="absolute left-1/2 -translate-x-1/2 -top-[41px] z-20 w-28 h-28">
                    <DynamicIcon
                      slug={question.icon_slug || undefined}
                      seedText={question.question_text}
                      size={112}
                      className="drop-shadow-lg"
                      hideIfEmpty={true}
                    />
                  </div>
                )}
                <QuizQuestionCard
                  questionText={question.question_text}
                  imageUrl={question.image_url}
                  hideQuestionText={!!question.image_url}
                  reserveTopSpace={!question.image_url}
                  timerSeconds={secondsLeft}
                  timerMaxSeconds={15}
                  progressPercent={(secondsLeft / 15) * 100}
                />
              </div>
            </div>
            <div className="flex-1 px-4 mt-3 flex flex-col gap-3 overflow-y-auto min-h-0 pb-[calc(0.5rem_+_var(--safe-bottom))]">
              {question.shuffled_answers.map((option, i) => (
                <div key={`${index}-${option}`} className="flex-shrink-0 w-full">
                  <QuizAnswerButton
                    label={ANSWER_LABELS[i]}
                    text={option}
                    state={answerState(option)}
                    onClick={() => void answer(option)}
                    disabled={!iAmChampion || attempted || !!choice || submitting}
                    showLabel
                  />
                </div>
              ))}
              {!iAmChampion && (
                <p className="text-center text-white/60 text-xs pt-1">
                  {t("teamBattle.championsPlaying")}
                </p>
              )}
              {iAmChampion && attempted && (
                <p className="text-center text-white/60 text-xs pt-1">{t("teamBattle.shotBurned")}</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** One teammate/opponent row on the done screen, with a + friend button
    for anyone not already a friend (owner's ask). */
function DonePlayerRow({
  person,
  isFriend,
}: {
  person: TBParticipant;
  isFriend: boolean;
}) {
  const { t } = useLanguage();
  const { sendFriendRequest } = useFriends();
  // Toasts are suppressed app-wide, so the button carries its own state:
  // it flips to a check the moment the request is sent.
  const [requested, setRequested] = useState(false);
  const [sending, setSending] = useState(false);
  const add = async () => {
    if (sending || requested) return;
    setSending(true);
    const ok = await sendFriendRequest(person.user_id);
    setSending(false);
    if (ok) setRequested(true);
  };
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <SmartAvatar avatarUrl={person.avatar_url} fallback={person.nickname} size="sm" />
      <span className="flex-1 min-w-0 truncate text-white font-semibold text-sm">
        {person.nickname}
      </span>
      {!isFriend && (
        <button
          type="button"
          onClick={add}
          disabled={sending || requested}
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold transition-colors ${
            requested ? "bg-white/20 text-white/70" : "bg-white text-[#6D28D9] active:scale-95"
          }`}
        >
          {requested ? (
            <>
              <Check className="w-3.5 h-3.5" />
              {t("teamBattle.friendRequested")}
            </>
          ) : (
            <>
              <UserPlus className="w-3.5 h-3.5" />
              {t("teamBattle.addFriend")}
            </>
          )}
        </button>
      )}
    </div>
  );
}

function PhaseDone({ onDismiss }: { onDismiss?: () => void }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { state, myTeam, room, participants, settle } = useTeamBattle();
  const { friends } = useFriends();

  // Idempotent server claim: pays out once and resets the room to waiting.
  // The page keeps rendering this screen until dismissed (TeamBattlePage's
  // resultSeen), so the verdict is readable, not a flash.
  useEffect(() => {
    void settle();
  }, [settle]);

  // The sides' crests, the lobby's deal — same source as the score header,
  // so the verdict wears the faces the match wore.
  const [crestPool, setCrestPool] = useState<string[]>([]);
  useEffect(() => {
    void fetchCrestPool().then(setCrestPool);
  }, []);
  const crests = useMemo(
    () =>
      dealtCrests(room?.id ?? "", crestPool, {
        a: room?.team_a_icon ?? null,
        b: room?.team_b_icon ?? null,
      }),
    [room?.id, room?.team_a_icon, room?.team_b_icon, crestPool],
  );

  const friendIds = useMemo(() => new Set(friends.map((f) => f.friendId)), [friends]);
  // Who I actually played with: every human but me, in seating order.
  const others = useMemo(
    () => participants.filter((p) => !p.is_bot && p.user_id !== user?.id),
    [participants, user?.id],
  );

  const won = state?.winner_team === myTeam;
  return (
    <div className={SHELL}>
      <div className={`${COLUMN} items-center justify-center gap-4 px-6`}>
        {won && (
          <motion.img
            src={trophyWin}
            alt=""
            initial={{ scale: 0, rotate: -12 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 14 }}
            className="w-[72px] h-[72px] object-contain"
          />
        )}
        {won && (
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15 + i * 0.12, type: "spring", stiffness: 300 }}
              >
                <Star className="w-7 h-7 text-amber-400 fill-amber-400" />
              </motion.span>
            ))}
          </div>
        )}
        <motion.h1
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-5xl font-black text-white text-center"
          style={{ fontFamily: "'TASolivare', sans-serif", textShadow: "0 2px 10px rgba(0,0,0,0.4)" }}
        >
          {won ? t("teamBattle.youWon") : t("teamBattle.youLost")}
        </motion.h1>
        {/* Each side wears its crest, name and score — the faces the match
            wore, so the verdict names who won. */}
        <div className="flex items-start justify-center gap-8">
          {(["a", "b"] as TBTeam[]).map((team) => (
            <div key={team} className="flex flex-col items-center gap-1 max-w-[130px]">
              {crests[team] && (
                <img
                  src={crests[team] ?? undefined}
                  alt=""
                  className="w-10 h-10 object-contain drop-shadow-sm"
                />
              )}
              <span className="text-white/70 text-xs font-semibold text-center truncate max-w-full">
                {teamLabel(t, team, room)}
              </span>
              <span className="font-display text-4xl font-black text-white drop-shadow-sm">
                {team === "a" ? state?.team_a_score ?? 0 : state?.team_b_score ?? 0}
              </span>
            </div>
          ))}
        </div>
        {/* Who I played with — add anyone who is not a friend yet. */}
        {others.length > 0 && (
          <div className="w-full max-w-xs bg-white/10 rounded-2xl px-3 py-2 max-h-[38vh] overflow-y-auto">
            <p className="text-white/60 text-[11px] font-bold uppercase tracking-wide px-1 pb-1">
              {t("teamBattle.playedWith")}
            </p>
            {others.map((p) => (
              <DonePlayerRow key={p.user_id} person={p} isFriend={friendIds.has(p.user_id)} />
            ))}
          </div>
        )}
        <div className="w-full max-w-xs mt-2">
          <ChunkyButton variant="white" size="lg" className="w-full" onClick={onDismiss}>
            {t("common.continue")}
          </ChunkyButton>
        </div>
      </div>
    </div>
  );
}
