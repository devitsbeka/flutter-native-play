import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { readAppLanguage } from "@/utils/appLanguage";
import { toast } from "@/lib/toast";

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

function useCountdown(deadline: string | undefined, onExpire: () => void) {
  const [left, setLeft] = useState(0);
  const firedRef = useRef<string | null>(null);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (!deadline) {
      setLeft(0);
      return;
    }
    const compute = () => Math.max(0, (new Date(deadline).getTime() - Date.now()) / 1000);
    setLeft(compute());
    const id = setInterval(() => {
      const remaining = compute();
      setLeft(remaining);
      if (remaining <= 0 && firedRef.current !== deadline) {
        firedRef.current = deadline;
        onExpireRef.current();
      }
    }, 250);
    return () => clearInterval(id);
  }, [deadline]);

  return Math.ceil(left);
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
  const { user } = useAuth();
  const [stage, setStage] = useState<Stage>("intro");
  const [state, setState] = useState<KingState | null>(null);
  const [reveal, setReveal] = useState<KingState | null>(null);
  const [busy, setBusy] = useState(false);

  const matchIdRef = useRef<string | null>(null);
  matchIdRef.current = state?.match_id ?? matchIdRef.current;

  const fail = useCallback(
    (error: { message?: string } | null) => {
      if (error?.message?.includes("KING_NO_QUESTIONS")) {
        toast.error(t("king.noQuestions"));
      } else if (error) {
        console.error("[King]", error);
        toast.error(error.message ?? "error");
      }
    },
    [t],
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

  // The server grants 2s of wire grace past the visible deadline before it
  // accepts an expiry claim, so wait the grace out — and if a submit landed
  // in the meantime the claim fails with "no live question", which is not an
  // error worth showing.
  const expire = useCallback(() => {
    setTimeout(async () => {
      const matchId = matchIdRef.current;
      if (!matchId || stageRef.current !== "commit") return;
      const { data, error } = await supabase.rpc("king_expire_question", { p_match_id: matchId });
      if (error || stageRef.current !== "commit") {
        if (error) console.warn("[King] expire skipped:", error.message);
        return;
      }
      const s = data as unknown as KingState;
      setState(s);
      setReveal(s);
      setStage("reveal");
    }, 2600);
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

  const thinkSeconds = useCountdown(
    stage === "thinking" ? state?.question?.think_deadline : undefined,
    showOptions,
  );
  const commitSeconds = useCountdown(
    stage === "commit" ? state?.commit_deadline : undefined,
    expire,
  );

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

        {state && stage !== "intro" && (
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

        {stage === "intro" && (
          <div className="flex flex-col gap-4 mt-6">
            <div
              className="rounded-[24px] p-6"
              style={{ background: "rgba(252,247,255,0.92)", boxShadow: CARD_SHADOW }}
            >
              <p className="font-bold text-[#402666] mb-2">{t("king.introTitle")}</p>
              <p className="text-sm text-[#402666]/60">{t("king.introBody")}</p>
            </div>
            <button
              onClick={() => void draw()}
              disabled={busy || !state}
              className="rounded-[20px] p-4 bg-[#7C3AED] text-white font-bold disabled:opacity-50"
            >
              {t("king.start")}
            </button>
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
