import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Bot, Star } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCategories } from "@/hooks/useCategories";
import { useServerDeadline } from "@/hooks/useServerDeadline";
import { QuizQuestionCard } from "@/components/ui/quiz-question-card";
import { QuizAnswerButton, type QuizAnswerState } from "@/components/ui/quiz-answer-button";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { TimerBadge } from "@/components/game/TimerBadge";
import { SmartAvatar } from "@/components/shared/SmartAvatar";
import { CategoryArtwork } from "@/components/shared/CategoryArtwork";
import { DynamicIcon } from "@/components/shared/DynamicIcon";
import { imageTreatmentFor } from "@/utils/questionImageTreatment";
import trophyWin from "@/assets/icons/trophy-win.png";
import {
  superQuestions,
  tileQuestions,
  useTeamBattle,
  type TBGesture,
  type TBQuestion,
  type TBTeam,
  type TBTile,
} from "@/contexts/TeamBattleContext";

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
const GESTURES: { key: TBGesture; emoji: string }[] = [
  { key: "rock", emoji: "✊" },
  { key: "paper", emoji: "✋" },
  { key: "scissors", emoji: "✌️" },
];

const teamLabel = (t: (k: string) => string, team: TBTeam | null | undefined) =>
  team === "a" ? t("teamBattle.teamA") : t("teamBattle.teamB");

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
  const { state, myTeam } = useTeamBattle();
  if (!state) return null;
  const side = (team: TBTeam) => (
    <div className={`flex flex-col ${team === "a" ? "items-start" : "items-end"}`}>
      <span className="text-white/70 text-[11px] font-semibold uppercase tracking-wide">
        {teamLabel(t, team)}
        {myTeam === team ? ` · ${t("teamBattle.you")}` : ""}
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
      {side("a")}
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
  const { state } = useTeamBattle();
  if (!state) return null;
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
}

function PhaseRps() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { state, submitRps, advance } = useTeamBattle();
  const [thrown, setThrown] = useState<TBGesture | null>(null);
  const secondsLeft = useServerDeadline(state?.deadline, advance);

  const throws = ((state?.rps as Record<string, unknown>)?.throws ?? {}) as Record<string, string>;
  const mine = (user && (throws[user.id] as TBGesture)) || thrown;

  return (
    <div className={SHELL}>
      <div className={COLUMN}>
        <ScoreHeader seconds={secondsLeft} maxSeconds={15} />
        <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6">
          <div className="text-center">
            <h1
              className="text-3xl font-black text-white"
              style={{ fontFamily: "'TASolivare', sans-serif", textShadow: "0 2px 10px rgba(0,0,0,0.3)" }}
            >
              {t("teamBattle.rpsTitle")}
            </h1>
            <p className="text-white/70 text-sm mt-2">{t("teamBattle.rpsSubtitle")}</p>
          </div>
          <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
            {GESTURES.map((g) => {
              const picked = mine === g.key;
              const face = picked ? "#7DD3FC" : "#E8E8F4";
              const depth = picked ? "#38BDF8" : "#D0D0E0";
              return (
                <motion.button
                  key={g.key}
                  whileTap={!mine ? { scale: 0.95 } : undefined}
                  disabled={!!mine}
                  onClick={() => {
                    setThrown(g.key);
                    void submitRps(g.key);
                  }}
                  className="relative w-full h-[100px] rounded-3xl"
                  style={{ paddingBottom: 6, opacity: mine && !picked ? 0.4 : 1 }}
                >
                  <div
                    className="absolute inset-0 rounded-3xl"
                    style={{ background: depth, transform: "translateY(6px)" }}
                  />
                  <div
                    className="relative flex items-center justify-center rounded-3xl h-full text-5xl"
                    style={{ background: face, boxShadow: "inset 0 2px 0 rgba(255,255,255,0.4)" }}
                  >
                    {g.emoji}
                  </div>
                </motion.button>
              );
            })}
          </div>
          {mine && (
            <p className="text-white/60 text-sm animate-pulse-soft">{t("teamBattle.rpsWaiting")}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function PhaseBoard() {
  const { t } = useLanguage();
  const { state, tiles, participants, isSpotlight, pickTile, playedBy, advance } = useTeamBattle();
  const { categories } = useCategories();
  const secondsLeft = useServerDeadline(state?.deadline, advance);
  const picker = participants.find((p) => p.user_id === state?.active_player);

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
                          teamLabel(t, tile.claimed_by_team as TBTeam)
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
  questionNumber,
  totalQuestions,
}: {
  tile: TBTile;
  question: TBQuestion;
  secondsLeft: number;
  maxSeconds: number;
  questionNumber: number;
  totalQuestions: number;
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
      <QuizQuestionCard
        questionText={question.question_text}
        questionNumber={questionNumber}
        totalQuestions={totalQuestions}
        imageUrl={question.image_url}
        videoUrl={question.video_url}
        audioUrl={question.audio_url}
        hideQuestionText={!!question.image_url}
        imageInset={treatment.inset}
        imageFramed={treatment.framed}
        imageBand={treatment.band}
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
  const { state, tiles, participants, isSpotlight, submitAnswer, turnPicks, sendPick, advance } =
    useTeamBattle();
  const secondsLeft = useServerDeadline(state?.deadline, advance);
  const [choice, setChoice] = useState<{ option: string; correct: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const tile = tiles.find((tl) => tl.id === state?.active_tile);
  const questions = tileQuestions(tile);
  const player = participants.find((p) => p.user_id === state?.active_player);
  const isBotTurn = !!player?.is_bot;
  const turnSeconds = isBotTurn ? 8 : state?.turn_seconds ?? 40;

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

  // Material exhausted before the clock: close the human turn.
  useEffect(() => {
    if (state && tile && !isBotTurn && targetAnswers >= questions.length) void advance();
  }, [state, tile, isBotTurn, targetAnswers, questions.length, advance]);

  useEffect(() => setChoice(null), [state?.turn_answers, state?.active_tile]);

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
          <div className="flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded-full shrink-0">
            <span className="text-white font-bold text-sm">{index + 1}</span>
            <span className="text-white/60 text-sm">/ {questions.length}</span>
          </div>
        </div>

        {/* the turn's running tally — a green/red dot per answered question,
            so everyone reads the turn at a glance */}
        {!isBotTurn && turnPicks.length > 0 && (
          <div className="flex justify-center gap-1.5 px-4 pb-1 flex-shrink-0">
            {turnPicks.map((p) => (
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
            questionNumber={index + 1}
            totalQuestions={questions.length}
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
  const { state, myTeam, settle } = useTeamBattle();

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
              <span className="text-white/70 text-xs font-semibold">{teamLabel(t, team)}</span>
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
