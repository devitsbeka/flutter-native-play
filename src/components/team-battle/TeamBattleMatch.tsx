import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BellRing, Bot, ChevronLeft, Star } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
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
            className="w-6 h-6 object-contain drop-shadow-sm shrink-0"
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
  const { state, room, participants } = useTeamBattle();
  const { user } = useAuth();
  // Icons sent to me during my turn, held until the turn is over: the
  // inbox lives here, above the phases, so it survives the phase switch
  // that is exactly when it gets read.
  const inbox = useIncomingReactions(room?.id, user?.id);
  const senders = useMemo(
    () => new Map(participants.map((p) => [p.user_id, { nickname: p.nickname, avatar_url: p.avatar_url }])),
    [participants],
  );
  if (!state) return null;
  const onSpot = state.phase === "rapid_fire" && state.active_player === user?.id;
  const strip = !onSpot && inbox.items.length > 0 && (
    <div className="fixed inset-x-0 z-30 flex justify-center pointer-events-none" style={{ top: "calc(var(--safe-top) + 4.5rem)" }}>
      <div className="w-full max-w-[520px] pointer-events-auto">
        <ReactionInbox items={inbox.items} senders={senders} onDismiss={inbox.dismiss} />
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
  const captainsOf = (team: TBTeam) =>
    participants.filter((p) => p.team === team && p.is_captain);

  return (
    <div className={SHELL}>
      <div className={COLUMN}>
        <ScoreHeader seconds={secondsLeft} maxSeconds={last?.tie ? 20 : 15} />
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
          <div className="text-center">
            <h1
              className="text-3xl font-black text-white"
              style={{ fontFamily: "'TASolivare', sans-serif", textShadow: "0 2px 10px rgba(0,0,0,0.3)" }}
            >
              {t("teamBattle.rpsTitle")}
            </h1>
            <p className="text-white/70 text-sm mt-2">{t("teamBattle.rpsSubtitle")}</p>
          </div>

          {/* The hands, without spoilers. While a round is open, another
              player's tile only says THAT they locked in (✅) — never which
              gesture, or whoever throws second reads the winning counter off
              the screen. You see your own pick; everyone's actual hands
              reveal together when the round resolves — the tie banner here,
              the winner banner on the board. After a tie the resolved hand's
              gestures linger dimmed until that player rethrows. */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 380, damping: 22 }}
            className="w-full max-w-sm rounded-2xl bg-white/10 border border-white/20 p-4 flex flex-col gap-3"
          >
            {last?.tie && (
              <p className="text-center font-bold text-white flex items-center justify-center gap-2">
                <GestureIcon g={last.team_a} size={26} /> {t("teamBattle.rpsTieBanner")}{" "}
                <GestureIcon g={last.team_b} size={26} />
              </p>
            )}
            {(["a", "b"] as TBTeam[]).map((team) => (
              <div key={team} className="flex items-center gap-2">
                <span className="text-[11px] text-white/60 w-16 shrink-0">{teamLabel(t, team, room)}</span>
                <div className="flex flex-wrap gap-2">
                  {captainsOf(team).map((p) => {
                    const live = throws[p.user_id];
                    const isMe = p.user_id === user?.id;
                    const stale = !live && last?.tie ? last.throws[p.user_id] : undefined;
                    return (
                      <span key={p.user_id} className="relative inline-block">
                        <SmartAvatar avatarUrl={p.avatar_url} fallback={p.nickname} size="xs" />
                        <span
                          className={`absolute -bottom-1 -right-1 text-[13px] drop-shadow ${
                            live ? "" : stale ? "opacity-40" : "animate-pulse-soft"
                          }`}
                        >
                          {live ? (
                            isMe ? (
                              <GestureIcon g={live} size={18} />
                            ) : (
                              "✅"
                            )
                          ) : stale ? (
                            <GestureIcon g={stale} size={18} />
                          ) : (
                            "💭"
                          )}
                        </span>
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </motion.div>
          {!amCaptain && (
            <p className="text-white/70 text-sm text-center animate-pulse-soft">
              {t("teamBattle.rpsCaptainsHint")}
            </p>
          )}
        </div>

        {/* The captain's hand, on the frame's light bottom sheet
            (966:30083): three white cards with the 3D renders — the rock on
            its grass, the paper roll, the scissors — and the "pick one"
            caption beneath. */}
        {amCaptain && (
          <div className="w-full shrink-0 bg-[#f5f2fa] rounded-t-[28px] px-5 pt-5 pb-[calc(1.1rem_+_var(--safe-bottom))] flex flex-col gap-3.5">
            <div className="grid grid-cols-3 gap-3 w-full max-w-sm mx-auto">
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
                    className={`relative h-[96px] rounded-[22px] flex items-center justify-center transition-shadow ${
                      picked
                        ? "bg-[#eef7ff] ring-2 ring-[#38BDF8]"
                        : "bg-white"
                    }`}
                    style={{
                      boxShadow: "0px 2px 0px 0px #e6e0f0, 0px 6px 16px rgba(64,38,102,0.10)",
                      opacity: mine && !picked ? 0.4 : 1,
                    }}
                  >
                    <img alt={g.key} src={g.icon} className="w-[68px] h-[68px] object-contain" />
                  </motion.button>
                );
              })}
            </div>
            <p
              className={`text-center text-sm font-[Nunito] font-semibold ${
                mine ? "text-[#402666]/50 animate-pulse-soft" : "text-[#402666]/70"
              }`}
            >
              {mine ? t("teamBattle.rpsWaiting") : t("teamBattle.rpsPickOne")}
            </p>
          </div>
        )}
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
              <GestureIcon g={rpsLast.team_a} size={22} /> vs <GestureIcon g={rpsLast.team_b} size={22} /> —{" "}
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
                  className="relative rounded-2xl text-left"
                  style={{ paddingBottom: 4, opacity: played ? 0.45 : 1 }}
                >
                  <div
                    className="absolute inset-0 rounded-2xl"
                    style={{ background: "#CBD5E1", transform: "translateY(4px)" }}
                  />
                  <div
                    className="relative rounded-2xl p-3 min-h-[120px] flex flex-col items-center justify-between gap-1 bg-white"
                    style={{ boxShadow: "inset 0 2px 0 rgba(255,255,255,0.4)" }}
                  >
                    <CategoryArtwork
                      categoryId={cat?.category_id ?? ""}
                      iconSlug={cat?.icon_slug}
                      size={44}
                    />
                    <p className="text-[#2A2550] font-bold text-sm text-center leading-tight line-clamp-2">
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
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-white text-[10px] font-bold ${DIFFICULTY_COLORS[tile.difficulty]}`}
                        >
                          {t(`teamBattle.diff_${tile.difficulty}`)}
                        </span>
                        <span className="font-display text-lg font-black text-primary">
                          {tile.price}
                        </span>
                      </div>
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
  const { state, room, tiles, participants, isSpotlight, myTeam, submitAnswer, turnPicks, sendPick, advance } =
    useTeamBattle();
  const secondsLeft = useServerDeadline(state?.deadline, advance);
  const [choice, setChoice] = useState<{ option: string; correct: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const tile = tiles.find((tl) => tl.id === state?.active_tile);
  const questions = tileQuestions(tile);
  const player = participants.find((p) => p.user_id === state?.active_player);
  const isBotTurn = !!player?.is_bot;
  const turnSeconds = isBotTurn ? 8 : state?.turn_seconds ?? 40;

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
      tile?.category_name ?? undefined,
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
    toast.success(t("teamBattle.pokeSent"));
  };

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

  const answer = async (option: string) => {
    if (submitting || choice || !question) return;
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

        <div className="px-4 pt-8 flex-shrink-0">
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
                disabled={!isSpotlight || !!choice || submitting}
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
          <ReactionBar roomId={room.id} toUserId={player.user_id} />
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

function PhaseDone({ onDismiss }: { onDismiss?: () => void }) {
  const { t } = useLanguage();
  const { state, myTeam, room, settle } = useTeamBattle();

  // Idempotent server claim: pays out once and resets the room to waiting.
  // The page keeps rendering this screen until dismissed (TeamBattlePage's
  // resultSeen), so the verdict is readable, not a flash.
  useEffect(() => {
    void settle();
  }, [settle]);

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
        <div className="flex items-center gap-6">
          {(["a", "b"] as TBTeam[]).map((team) => (
            <div key={team} className="flex flex-col items-center">
              <span className="text-white/70 text-xs font-semibold">{teamLabel(t, team, room)}</span>
              <span className="font-display text-4xl font-black text-white drop-shadow-sm">
                {team === "a" ? state?.team_a_score ?? 0 : state?.team_b_score ?? 0}
              </span>
            </div>
          ))}
        </div>
        <div className="w-full max-w-xs mt-4">
          <ChunkyButton variant="white" size="lg" className="w-full" onClick={onDismiss}>
            {t("common.continue")}
          </ChunkyButton>
        </div>
      </div>
    </div>
  );
}
