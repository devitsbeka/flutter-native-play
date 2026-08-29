import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useServerDeadline } from "@/hooks/useServerDeadline";
import {
  superQuestions,
  tileQuestions,
  useTeamBattle,
  type TBGesture,
  type TBTeam,
} from "@/contexts/TeamBattleContext";

const CARD_SHADOW = "0px 2px 8px 0px rgba(102,51,153,0.06), 0px 8px 24px 0px rgba(102,51,153,0.12)";
const GESTURES: { key: TBGesture; emoji: string }[] = [
  { key: "rock", emoji: "✊" },
  { key: "paper", emoji: "✋" },
  { key: "scissors", emoji: "✌️" },
];

const teamLabel = (t: (k: string) => string, team: TBTeam | null | undefined) =>
  team === "a" ? t("teamBattle.teamA") : t("teamBattle.teamB");

function ScoreBar() {
  const { t } = useLanguage();
  const { state, myTeam } = useTeamBattle();
  if (!state) return null;
  return (
    <div className="flex items-center justify-between py-3">
      {(["a", "b"] as TBTeam[]).map((team) => (
        <div key={team} className={`text-center ${team === "b" ? "order-3" : ""}`}>
          <p className="text-[11px] text-[#402666]/50">
            {teamLabel(t, team)}
            {myTeam === team ? ` · ${t("teamBattle.you")}` : ""}
          </p>
          <p className="font-display text-2xl font-bold text-[#402666]">
            {team === "a" ? state.team_a_score : state.team_b_score}
          </p>
        </div>
      ))}
      <div className="order-2 text-[#402666]/30 font-bold">vs</div>
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
    case "rapid_fire":
      return <PhaseBoardAndTurn />;
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
    <div className="flex flex-col items-center gap-6 pt-16">
      <p className="font-display text-xl font-bold text-[#402666]">{t("teamBattle.rpsTitle")}</p>
      <p className="text-sm text-[#402666]/60 -mt-4">{t("teamBattle.rpsSubtitle")}</p>
      <p className="font-mono text-3xl text-[#7C3AED] font-bold">{secondsLeft}</p>
      <div className="flex gap-4">
        {GESTURES.map((g) => (
          <motion.button
            key={g.key}
            whileTap={{ scale: 0.9 }}
            disabled={!!mine}
            onClick={() => {
              setThrown(g.key);
              void submitRps(g.key);
            }}
            className="w-20 h-20 rounded-3xl text-4xl flex items-center justify-center disabled:opacity-40"
            style={{
              background: "rgba(252,247,255,0.92)",
              boxShadow: CARD_SHADOW,
              outline: mine === g.key ? "3px solid #7C3AED" : "none",
              opacity: mine && mine !== g.key ? 0.35 : 1,
            }}
          >
            {g.emoji}
          </motion.button>
        ))}
      </div>
      {mine && <p className="text-sm text-[#402666]/50">{t("teamBattle.rpsWaiting")}</p>}
    </div>
  );
}

function PhaseBoardAndTurn() {
  const { state } = useTeamBattle();
  return state?.phase === "rapid_fire" ? <RapidFire /> : <Board />;
}

function Board() {
  const { t } = useLanguage();
  const { state, tiles, participants, isSpotlight, pickTile, advance } = useTeamBattle();
  const secondsLeft = useServerDeadline(state?.deadline, advance);
  const picker = participants.find((p) => p.user_id === state?.active_player);

  return (
    <div className="flex flex-col gap-3">
      <ScoreBar />
      <div className="flex items-center justify-between">
        <p className="font-bold text-[#402666]">
          {isSpotlight
            ? t("teamBattle.yourPick")
            : t("teamBattle.someonePicking", { name: picker?.nickname ?? "…" })}
        </p>
        <span className="font-mono text-lg text-[#7C3AED] font-bold">{secondsLeft}</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {tiles.map((tile) => {
          const played = !!tile.claimed_by_team;
          return (
            <motion.button
              key={tile.id}
              whileTap={isSpotlight && !played ? { scale: 0.96 } : undefined}
              disabled={!isSpotlight || played}
              onClick={() => void pickTile(tile.id)}
              className="rounded-[18px] p-4 text-left relative"
              style={{
                background: "rgba(252,247,255,0.92)",
                boxShadow: CARD_SHADOW,
                opacity: played ? 0.45 : 1,
              }}
            >
              <p className="font-bold text-sm text-[#402666] truncate">{tile.category_name}</p>
              <p className="text-xs text-[#402666]/50 capitalize">{t(`teamBattle.diff_${tile.difficulty}`)}</p>
              <p className="mt-2 font-display font-bold text-[#7C3AED]">
                {played
                  ? t("teamBattle.claimedBy", { team: teamLabel(t, tile.claimed_by_team as TBTeam) })
                  : t("teamBattle.points", { n: tile.price })}
              </p>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function RapidFire() {
  const { t } = useLanguage();
  const { state, tiles, participants, isSpotlight, submitAnswer, advance } = useTeamBattle();
  const secondsLeft = useServerDeadline(state?.deadline, advance);
  const [lastResult, setLastResult] = useState<"correct" | "wrong" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const tile = tiles.find((tl) => tl.id === state?.active_tile);
  const questions = tileQuestions(tile);
  const index = state?.turn_answers ?? 0;
  const question = questions[index];
  const player = participants.find((p) => p.user_id === state?.active_player);

  // Material exhausted before the clock: close the turn.
  useEffect(() => {
    if (state && tile && index >= questions.length) void advance();
  }, [state, tile, index, questions.length, advance]);

  const answer = useCallback(
    async (option: string) => {
      if (submitting || !question) return;
      setSubmitting(true);
      const res = await submitAnswer(index, option);
      setLastResult(res?.correct ? "correct" : "wrong");
      setTimeout(() => setLastResult(null), 600);
      setSubmitting(false);
    },
    [submitting, question, index, submitAnswer],
  );

  if (!tile) return null;

  return (
    <div className="flex flex-col gap-3">
      <ScoreBar />
      <div className="flex items-center justify-between">
        <p className="font-bold text-[#402666] truncate">
          {isSpotlight
            ? t("teamBattle.yourTurn")
            : t("teamBattle.watching", { name: player?.nickname ?? "…" })}
          <span className="text-[#402666]/40 font-normal"> · {tile.category_name}</span>
        </p>
        <span className="font-mono text-lg text-[#7C3AED] font-bold">{secondsLeft}</span>
      </div>

      {isSpotlight && question ? (
        <div
          className="rounded-[20px] p-5"
          style={{ background: "rgba(252,247,255,0.92)", boxShadow: CARD_SHADOW }}
        >
          <p className="text-xs text-[#402666]/40 mb-1">
            {index + 1} / {questions.length}
          </p>
          <p className="font-bold text-[#402666] mb-4">{question.question_text}</p>
          <div className="flex flex-col gap-2">
            {question.shuffled_answers.map((option) => (
              <button
                key={option}
                disabled={submitting}
                onClick={() => void answer(option)}
                className="rounded-xl px-4 py-3 text-left text-sm font-medium text-[#402666] bg-white/70 active:scale-[0.98] transition-transform disabled:opacity-60"
                style={{ boxShadow: "0 1px 4px rgba(102,51,153,0.10)" }}
              >
                {option}
              </button>
            ))}
          </div>
          {lastResult && (
            <p
              className={`mt-3 text-center font-bold ${
                lastResult === "correct" ? "text-emerald-500" : "text-red-400"
              }`}
            >
              {lastResult === "correct" ? t("teamBattle.correct") : t("teamBattle.wrong")}
            </p>
          )}
        </div>
      ) : (
        <div
          className="rounded-[20px] p-6 text-center"
          style={{ background: "rgba(252,247,255,0.92)", boxShadow: CARD_SHADOW }}
        >
          <p className="font-display text-3xl font-bold text-[#7C3AED]">
            {index} / {questions.length}
          </p>
          <p className="text-sm text-[#402666]/50 mt-1">{t("teamBattle.answersSoFar")}</p>
          <p className="mt-4 font-bold text-[#402666]">
            {t("teamBattle.tileWorth", { n: tile.price })}
          </p>
        </div>
      )}
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
  const teammates = participants.filter((p) => p.team === myTeam);

  return (
    <div className="flex flex-col gap-4 pt-8">
      <ScoreBar />
      <p className="font-display text-xl font-bold text-[#402666] text-center">
        {t("teamBattle.superVoteTitle")}
      </p>
      <p className="text-sm text-[#402666]/60 text-center -mt-2">
        {t("teamBattle.superVoteSubtitle")}
      </p>
      <p className="font-mono text-2xl text-[#7C3AED] font-bold text-center">{secondsLeft}</p>
      <div className="flex flex-col gap-2">
        {teammates.map((p) => (
          <button
            key={p.user_id}
            disabled={!!myVote}
            onClick={() => void voteSuper(p.user_id)}
            className="rounded-[18px] p-4 flex items-center gap-3 disabled:opacity-60"
            style={{
              background: "rgba(252,247,255,0.92)",
              boxShadow: CARD_SHADOW,
              outline: myVote === p.user_id ? "2px solid #7C3AED" : "none",
            }}
          >
            {p.avatar_url ? (
              <img src={p.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#7C3AED]/20" />
            )}
            <span className="font-bold text-[#402666]">
              {p.nickname}
              {p.user_id === user?.id ? ` (${t("teamBattle.you")})` : ""}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function PhaseSuperRound() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { state, participants, submitSuper, advance } = useTeamBattle();
  const secondsLeft = useServerDeadline(state?.deadline, advance);
  const [submitting, setSubmitting] = useState(false);

  const sup = (state?.super ?? {}) as Record<string, unknown>;
  const index = (sup.question_index as number) ?? 0;
  const questions = superQuestions(state);
  const question = questions[index];
  const champions = [sup.champion_a as string, sup.champion_b as string];
  const iAmChampion = !!user && champions.includes(user.id);
  const attempted = ((sup.attempted ?? {}) as Record<string, boolean>)[user?.id ?? ""] ?? false;
  const champName = (id: string) => participants.find((p) => p.user_id === id)?.nickname ?? "…";

  return (
    <div className="flex flex-col gap-3 pt-4">
      <p className="font-display text-xl font-bold text-[#402666] text-center">
        {t("teamBattle.superRoundTitle")}
      </p>
      <div className="flex items-center justify-center gap-6 text-center">
        <div>
          <p className="text-xs text-[#402666]/50">{champName(sup.champion_a as string)}</p>
          <p className="font-display text-2xl font-bold text-[#402666]">{(sup.score_a as number) ?? 0}</p>
        </div>
        <span className="text-[#402666]/30 text-sm">{t("teamBattle.firstTo3")}</span>
        <div>
          <p className="text-xs text-[#402666]/50">{champName(sup.champion_b as string)}</p>
          <p className="font-display text-2xl font-bold text-[#402666]">{(sup.score_b as number) ?? 0}</p>
        </div>
      </div>
      <p className="font-mono text-xl text-[#7C3AED] font-bold text-center">{secondsLeft}</p>

      {question && (
        <div
          className="rounded-[20px] p-5"
          style={{ background: "rgba(252,247,255,0.92)", boxShadow: CARD_SHADOW }}
        >
          <p className="font-bold text-[#402666] mb-4">{question.question_text}</p>
          {iAmChampion ? (
            <div className="flex flex-col gap-2">
              {question.shuffled_answers.map((option) => (
                <button
                  key={option}
                  disabled={submitting || attempted}
                  onClick={async () => {
                    setSubmitting(true);
                    await submitSuper(index, option);
                    setSubmitting(false);
                  }}
                  className="rounded-xl px-4 py-3 text-left text-sm font-medium text-[#402666] bg-white/70 active:scale-[0.98] transition-transform disabled:opacity-50"
                  style={{ boxShadow: "0 1px 4px rgba(102,51,153,0.10)" }}
                >
                  {option}
                </button>
              ))}
              {attempted && (
                <p className="text-center text-sm text-[#402666]/50">{t("teamBattle.shotBurned")}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-[#402666]/50 text-center">{t("teamBattle.championsPlaying")}</p>
          )}
        </div>
      )}
    </div>
  );
}

function PhaseDone({ onDismiss }: { onDismiss?: () => void }) {
  const { t } = useLanguage();
  const { state, myTeam, settle } = useTeamBattle();

  // Idempotent server claim: pays out once and resets the room to waiting.
  // The page keeps rendering this screen after the room UPDATE lands (see
  // TeamBattlePage's resultSeen) — the win must be readable, not a flash on
  // the way back to the lobby.
  useEffect(() => {
    void settle();
  }, [settle]);

  const won = state?.winner_team === myTeam;
  return (
    <div className="flex flex-col items-center gap-4 pt-24">
      <motion.p
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="font-display text-3xl font-bold text-[#402666]"
      >
        {won ? t("teamBattle.youWon") : t("teamBattle.youLost")}
      </motion.p>
      <p className="text-[#402666]/60">
        {t("teamBattle.finalScore", {
          a: state?.team_a_score ?? 0,
          b: state?.team_b_score ?? 0,
        })}
      </p>
      <button
        onClick={onDismiss}
        className="mt-4 rounded-[20px] px-8 py-4 bg-[#7C3AED] text-white font-bold"
      >
        {t("common.continue")}
      </button>
    </div>
  );
}
