import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Crown, Lock, Star } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useServerDeadline } from "@/hooks/useServerDeadline";
import { QuizQuestionCard } from "@/components/ui/quiz-question-card";
import { QuizAnswerButton, type QuizAnswerState } from "@/components/ui/quiz-answer-button";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { TimerBadge } from "@/components/game/TimerBadge";
import { SmartAvatar } from "@/components/shared/SmartAvatar";
import trophyWin from "@/assets/icons/trophy-win.png";
import kingIcon from "@/assets/play-modes/trivia-king.png";
import {
  currentQuestion,
  useVersusKing,
  type VKParticipant,
} from "@/contexts/VersusKingContext";

// The app's chunky-3D language on the game screens' periwinkle — the same
// shell TeamBattleMatch wears.
const SHELL = "h-[100dvh] w-full overflow-hidden safe-bleed bg-[#7E7BDC]";
const COLUMN = "w-full h-full flex flex-col max-w-[700px] md:max-w-[520px] mx-auto";
const ANSWER_LABELS = ["A", "B", "C", "D"];

const VOTE_SECONDS = 30;
const QUESTION_SECONDS = 25;
const BLITZ_SECONDS = 20;

function ScoreHeader({ seconds, maxSeconds }: { seconds?: number; maxSeconds?: number }) {
  const { t } = useLanguage();
  const { state } = useVersusKing();
  if (!state) return null;
  const side = (label: string, score: number, alignEnd: boolean) => (
    <div className={`flex flex-col ${alignEnd ? "items-end" : "items-start"}`}>
      <span className="text-white/70 text-[11px] font-semibold uppercase tracking-wide">{label}</span>
      <motion.span
        key={score}
        initial={{ scale: 1.25 }}
        animate={{ scale: 1 }}
        className="font-display text-3xl font-black text-white drop-shadow-sm"
      >
        {score}
      </motion.span>
    </div>
  );
  return (
    <div className="flex items-center justify-between px-4 pt-3 pb-1 flex-shrink-0">
      {side(t("kingTeam.teamLabel"), state.team_rounds, false)}
      {typeof seconds === "number" ? (
        <TimerBadge seconds={seconds} maxSeconds={maxSeconds ?? 30} compact />
      ) : (
        <span className="text-white/40 font-black text-sm">vs</span>
      )}
      {side(t("kingTeam.kingLabel"), state.king_rounds, true)}
    </div>
  );
}

/** Avatars of everyone whose current pick is this option. */
function PickAvatars({ pickers }: { pickers: VKParticipant[] }) {
  if (pickers.length === 0) return null;
  const shown = pickers.slice(0, 4);
  return (
    <div
      className="absolute flex -space-x-1.5 pointer-events-none z-10 right-3 top-[calc(50%-2px)]"
      style={{ transform: "translateY(-50%)" }}
    >
      {shown.map((p) => (
        <div key={p.user_id} className="w-7 h-7 rounded-full border-2 border-white/80 overflow-hidden bg-white/20">
          <SmartAvatar avatarUrl={p.avatar_url} fallback={p.nickname} size="xs" />
        </div>
      ))}
      {pickers.length > shown.length && (
        <div className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center text-[10px] font-bold text-slate-600 border-2 border-slate-300">
          +{pickers.length - shown.length}
        </div>
      )}
    </div>
  );
}

export function VersusKingMatch({ onResultDismiss }: { onResultDismiss?: () => void }) {
  const { state } = useVersusKing();
  if (!state) return null;
  switch (state.phase) {
    case "captain_vote":
      return <PhaseCaptainVote />;
    case "question":
    case "reveal":
      return <PhaseQuestion />;
    case "round_result":
      return <PhaseRoundResult />;
    case "blitz":
      return <PhaseBlitz />;
    case "done":
      return <PhaseDone onDismiss={onResultDismiss} />;
    default:
      return null;
  }
}

function PhaseCaptainVote() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { state, participants, voteCaptain, advance } = useVersusKing();
  const secondsLeft = useServerDeadline(state?.deadline, advance);
  const votes = state?.captain_votes ?? {};
  const myVote = user ? votes[user.id] : undefined;
  const players = participants.filter((p) => p.status === "playing");
  const votesFor = (candidate: string) =>
    Object.values(votes).filter((c) => c === candidate).length;

  return (
    <div className={SHELL}>
      <div className={COLUMN}>
        <div className="flex justify-center pt-4">
          <TimerBadge seconds={secondsLeft} maxSeconds={VOTE_SECONDS} compact />
        </div>
        <div className="flex-1 flex flex-col gap-4 px-6 pt-4 overflow-y-auto pb-[calc(1rem_+_var(--safe-bottom))]">
          <div className="text-center">
            <img src={kingIcon} alt="" className="w-16 h-16 mx-auto mb-2 object-contain" draggable={false} />
            <h1
              className="text-3xl font-black text-white"
              style={{ fontFamily: "'TASolivare', sans-serif", textShadow: "0 2px 10px rgba(0,0,0,0.3)" }}
            >
              {t("kingTeam.voteTitle")}
            </h1>
            <p className="text-white/70 text-sm mt-2">{t("kingTeam.voteSubtitle")}</p>
          </div>
          <div className="flex flex-col gap-3 mt-2">
            {players.map((p) => {
              const picked = myVote === p.user_id;
              const n = votesFor(p.user_id);
              return (
                <motion.button
                  key={p.user_id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => void voteCaptain(p.user_id)}
                  className="relative rounded-2xl"
                  style={{ paddingBottom: 4 }}
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
                      {p.user_id === user?.id ? ` (${t("kingTeam.you")})` : ""}
                    </span>
                    {n > 0 && (
                      <span className="ml-auto px-2 py-0.5 rounded-full bg-[#7C3AED] text-white text-xs font-bold">
                        {n}
                      </span>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
          {myVote && (
            <p className="text-center text-white/60 text-sm animate-pulse-soft">
              {t("kingTeam.voteWaiting")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function PhaseQuestion() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const {
    state, participants, rounds, isCaptain, pickAnswer, lockFinal, advance,
  } = useVersusKing();
  const revealing = state?.phase === "reveal";
  const secondsLeft = useServerDeadline(state?.deadline, advance);
  const [myPick, setMyPick] = useState<string | null>(null);
  const [locking, setLocking] = useState(false);

  const question = currentQuestion(state, rounds);
  const round = rounds.find((r) => r.round_index === state?.round_index);
  const captain = participants.find((p) => p.user_id === state?.captain_user_id);

  // Server state wins over the optimistic local highlight — and a new
  // question clears it.
  const serverPick = user ? state?.picks?.[user.id] : undefined;
  useEffect(() => {
    setMyPick(null);
    setLocking(false);
  }, [state?.round_index, state?.question_index]);
  const shownPick = serverPick ?? myPick;

  const reveal = revealing ? state?.last_reveal : null;
  const pickersOf = useMemo(() => {
    const source = revealing ? reveal?.picks ?? {} : state?.picks ?? {};
    return (option: string) =>
      participants.filter((p) => source[p.user_id] === option);
  }, [participants, revealing, reveal?.picks, state?.picks]);

  if (!state || !question) return null;

  const pick = (option: string) => {
    if (revealing) return;
    setMyPick(option);
    void pickAnswer(option);
  };

  const lock = async () => {
    if (!shownPick || locking) return;
    setLocking(true);
    await lockFinal(shownPick);
    setLocking(false);
  };

  const answerState = (option: string): QuizAnswerState => {
    if (revealing && reveal) {
      if (option === reveal.correct_answer) return "correct";
      if (option === reveal.final && !reveal.was_correct) return "wrong";
      return "default";
    }
    return option === shownPick ? "selected" : "default";
  };

  // The captain watches the team's picks land live; players see the crowd
  // only at the reveal — before that their vote is their own read.
  const showPicksOn = isCaptain || revealing;

  return (
    <div className={SHELL}>
      <div className={COLUMN}>
        <ScoreHeader seconds={revealing ? undefined : secondsLeft} maxSeconds={QUESTION_SECONDS} />
        <div className="flex items-center justify-between gap-2 px-4 py-2 flex-shrink-0">
          <p className="text-white font-bold truncate">
            {round?.category_name}
            <span className="text-white/60 font-normal">
              {" "}· {t("kingTeam.roundOf", { n: state.round_index + 1, total: 6 })}
            </span>
          </p>
          <div className="flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded-full shrink-0">
            <span className="text-white font-bold text-sm">{state.question_index + 1}</span>
            <span className="text-white/60 text-sm">/ 5</span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 pb-1 flex-shrink-0">
          <Crown className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
          <p className="text-white/80 text-sm truncate">
            {isCaptain
              ? t("kingTeam.youAreCaptain")
              : t("kingTeam.captainIs", { name: captain?.nickname ?? "…" })}
          </p>
        </div>

        <div className="px-4 pt-2 flex-shrink-0">
          <QuizQuestionCard
            questionText={question.question_text}
            imageUrl={question.image_url}
            hideQuestionText={!!question.image_url}
            timerSeconds={revealing ? 0 : secondsLeft}
            timerMaxSeconds={QUESTION_SECONDS}
            progressPercent={revealing ? 0 : (secondsLeft / QUESTION_SECONDS) * 100}
          />
        </div>

        <div className="flex-1 px-4 mt-3 flex flex-col gap-3 [@media(max-height:700px)]:gap-2 overflow-y-auto min-h-0 pb-[calc(0.5rem_+_var(--safe-bottom))]">
          {question.shuffled_answers.map((option, i) => (
            <div key={`${state.round_index}-${state.question_index}-${option}`} className="flex-shrink-0 w-full relative">
              <QuizAnswerButton
                label={ANSWER_LABELS[i]}
                text={option}
                state={answerState(option)}
                onClick={() => pick(option)}
                disabled={revealing}
                showLabel
              />
              {showPicksOn && <PickAvatars pickers={pickersOf(option)} />}
            </div>
          ))}

          {revealing && reveal ? (
            <p className="text-center text-white/80 text-sm pt-1">
              {reveal.was_correct
                ? t("kingTeam.teamGotIt")
                : reveal.final
                  ? t("kingTeam.teamMissedIt")
                  : t("kingTeam.noAnswer")}
            </p>
          ) : isCaptain ? (
            <div className="pt-1">
              <ChunkyButton
                variant="secondary"
                size="lg"
                className="w-full"
                disabled={!shownPick || locking}
                onClick={() => void lock()}
                icon={<Lock className="w-4 h-4" />}
              >
                {t("kingTeam.lockFinal")}
              </ChunkyButton>
              <p className="text-center text-white/60 text-xs pt-2">{t("kingTeam.captainHint")}</p>
            </div>
          ) : (
            <p className="text-center text-white/60 text-xs pt-1">
              {shownPick ? t("kingTeam.pickWaiting") : t("kingTeam.pickHint")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function PhaseRoundResult() {
  const { t } = useLanguage();
  const { state, advance } = useVersusKing();
  useServerDeadline(state?.deadline, advance);
  if (!state) return null;
  // round_correct still carries the finished round's tally.
  const teamTookIt = state.round_correct >= 3;
  return (
    <div className={SHELL}>
      <div className={`${COLUMN} items-center justify-center gap-4 px-6`}>
        <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <img src={kingIcon} alt="" className="w-20 h-20 object-contain mx-auto" draggable={false} />
        </motion.div>
        <h1
          className="text-3xl font-black text-white text-center"
          style={{ fontFamily: "'TASolivare', sans-serif", textShadow: "0 2px 10px rgba(0,0,0,0.35)" }}
        >
          {teamTookIt ? t("kingTeam.roundWon") : t("kingTeam.roundLost")}
        </h1>
        <p className="text-white/70 text-sm">
          {t("kingTeam.roundTally", { n: state.round_correct })}
        </p>
        <div className="flex items-center gap-8 mt-2">
          <div className="flex flex-col items-center">
            <span className="text-white/70 text-xs font-semibold">{t("kingTeam.teamLabel")}</span>
            <span className="font-display text-4xl font-black text-white">{state.team_rounds}</span>
          </div>
          <span className="text-white/40 font-black">vs</span>
          <div className="flex flex-col items-center">
            <span className="text-white/70 text-xs font-semibold">{t("kingTeam.kingLabel")}</span>
            <span className="font-display text-4xl font-black text-white">{state.king_rounds}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PhaseBlitz() {
  const { t } = useLanguage();
  const { state, participants, rounds, isCaptain, answerBlitz, advance } = useVersusKing();
  const secondsLeft = useServerDeadline(state?.deadline, advance);
  const [choice, setChoice] = useState<{ option: string; correct: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const question = currentQuestion(state, rounds);
  const captain = participants.find((p) => p.user_id === state?.captain_user_id);

  if (!state || !question) return null;

  const answer = async (option: string) => {
    if (!isCaptain || submitting || choice) return;
    setSubmitting(true);
    const res = await answerBlitz(option);
    if (res) setChoice({ option, correct: res.correct });
    setSubmitting(false);
  };

  const answerState = (option: string): QuizAnswerState => {
    if (!isCaptain) return "disabled";
    if (!choice) return submitting ? "loading" : "default";
    if (option === choice.option) return choice.correct ? "correct" : "wrong";
    return "disabled";
  };

  return (
    <div className={SHELL}>
      <div className={COLUMN}>
        <div className="flex flex-col items-center gap-1 pt-4 flex-shrink-0">
          <h1
            className="text-2xl font-black text-white"
            style={{ fontFamily: "'TASolivare', sans-serif" }}
          >
            {t("kingTeam.blitzTitle")}
          </h1>
          <p className="text-white/70 text-xs">{t("kingTeam.blitzSubtitle", { name: captain?.nickname ?? "…" })}</p>
          <TimerBadge seconds={secondsLeft} maxSeconds={BLITZ_SECONDS} compact />
        </div>
        <div className="px-4 pt-4 flex-shrink-0">
          <QuizQuestionCard
            questionText={question.question_text}
            imageUrl={question.image_url}
            hideQuestionText={!!question.image_url}
            timerSeconds={secondsLeft}
            timerMaxSeconds={BLITZ_SECONDS}
            progressPercent={(secondsLeft / BLITZ_SECONDS) * 100}
          />
        </div>
        <div className="flex-1 px-4 mt-3 flex flex-col gap-3 overflow-y-auto min-h-0 pb-[calc(0.5rem_+_var(--safe-bottom))]">
          {question.shuffled_answers.map((option, i) => (
            <div key={option} className="flex-shrink-0 w-full">
              <QuizAnswerButton
                label={ANSWER_LABELS[i]}
                text={option}
                state={answerState(option)}
                onClick={() => void answer(option)}
                disabled={!isCaptain || !!choice || submitting}
                showLabel
              />
            </div>
          ))}
          {!isCaptain && (
            <p className="text-center text-white/60 text-xs pt-1">{t("kingTeam.captainPlaying")}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function PhaseDone({ onDismiss }: { onDismiss?: () => void }) {
  const { t } = useLanguage();
  const { state, settle } = useVersusKing();

  // Idempotent server claim: pays out once and resets the room to waiting.
  useEffect(() => {
    void settle();
  }, [settle]);

  const won = state?.winner === "team";
  return (
    <div className={SHELL}>
      <div className={`${COLUMN} items-center justify-center gap-4 px-6`}>
        {won ? (
          <motion.img
            src={trophyWin}
            alt=""
            initial={{ scale: 0, rotate: -12 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 14 }}
            className="w-[72px] h-[72px] object-contain"
          />
        ) : (
          <motion.img
            src={kingIcon}
            alt=""
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 14 }}
            className="w-[84px] h-[84px] object-contain"
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
          className="text-4xl font-black text-white text-center"
          style={{ fontFamily: "'TASolivare', sans-serif", textShadow: "0 2px 10px rgba(0,0,0,0.4)" }}
        >
          {won ? t("kingTeam.teamWins") : t("kingTeam.kingWins")}
        </motion.h1>
        <div className="flex items-center gap-8">
          <div className="flex flex-col items-center">
            <span className="text-white/70 text-xs font-semibold">{t("kingTeam.teamLabel")}</span>
            <span className="font-display text-4xl font-black text-white">{state?.team_rounds ?? 0}</span>
          </div>
          <span className="text-white/40 font-black">vs</span>
          <div className="flex flex-col items-center">
            <span className="text-white/70 text-xs font-semibold">{t("kingTeam.kingLabel")}</span>
            <span className="font-display text-4xl font-black text-white">{state?.king_rounds ?? 0}</span>
          </div>
        </div>
        {won && <p className="text-white/70 text-sm">{t("kingTeam.rewardLine")}</p>}
        <div className="w-full max-w-xs mt-4">
          <ChunkyButton variant="white" size="lg" className="w-full" onClick={onDismiss}>
            {t("common.continue")}
          </ChunkyButton>
        </div>
      </div>
    </div>
  );
}
