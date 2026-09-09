import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Check, Heart, Lightbulb, Medal, MessageSquareX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQuestionFavorites } from "@/hooks/useQuestionFavorites";
import { answerContextLine } from "@/utils/answerContext";
import {
  CHECK_VIOLATION,
  REPORT_TYPE_FALLBACK,
  TRIVIA_REPORT_TYPE,
  triviaReportFallbackRow,
  triviaReportRow,
  type TriviaReportInput,
} from "@/utils/triviaQuestionReport";

/**
 * The card that lands over the "next question" button once an answer is in
 * — Figma 1154:9157.
 *
 * It is the only moment in a round where the question stands still, so it is
 * where the two things a player can do with a question live: keep it, or
 * flag it. Under them, a line of context about the answer — authored where
 * the question has any, composed from the answer where it does not (see
 * src/utils/answerContext.ts).
 *
 * The correct and incorrect cards are the same card. Only the palette turns
 * over: mint for right, rose for wrong, with the same chunky 8px ledge under
 * both so the widget reads as one thing that changed colour rather than two
 * widgets.
 */

interface Palette {
  background: string;
  border: string;
  ledge: string;
  ink: string;
  iconTint: string;
}

const CORRECT: Palette = {
  background: "linear-gradient(90deg, #EAFFDB 0%, #B2FFEC 100%)",
  border: "#9BFFDB",
  ledge: "#89C2AE",
  ink: "#454376",
  iconTint: "#2F8F6E",
};

const INCORRECT: Palette = {
  background: "linear-gradient(90deg, #FFEFDB 0%, #FFD2DC 100%)",
  border: "#FFB3C4",
  ledge: "#C28995",
  ink: "#5C2E4A",
  iconTint: "#C2415F",
};

/**
 * The fade the answer list wears while the card is up.
 *
 * The card's scrim blurs and darkens what is behind it, but the list is a
 * scroll container and still ends in a hard clip at its own bottom edge —
 * an answer sliced through the middle. Masking the list's last 64px to
 * transparent is what actually removes the cut; the scrim then sits over
 * the fade. Applied only while the card is showing: with the card away,
 * the last answer should be solid.
 */
export const answersFadeUnderFeedback = {
  maskImage: "linear-gradient(to bottom, #000 calc(100% - 64px), transparent 100%)",
  WebkitMaskImage: "linear-gradient(to bottom, #000 calc(100% - 64px), transparent 100%)",
} as const;

type ReportState = "idle" | "busy" | "sent" | "failed";

export interface AnswerFeedbackCardProps {
  isCorrect: boolean;
  /** The question's id — what a favourite and a report are filed against. */
  questionId: string;
  questionText: string;
  correctAnswer: string;
  /** Authored context, when the question carries any. */
  explanation?: string | null;
  categoryId?: string | null;
  /** Which screen this is — rides along on the report. */
  source: TriviaReportInput["source"];
  className?: string;
}

export function AnswerFeedbackCard({
  isCorrect,
  questionId,
  questionText,
  correctAnswer,
  explanation,
  categoryId,
  source,
  className,
}: AnswerFeedbackCardProps) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useQuestionFavorites();
  const [reportState, setReportState] = useState<ReportState>("idle");

  // A new question is a new report; the receipt must not carry over.
  useEffect(() => {
    setReportState("idle");
  }, [questionId]);

  const palette = isCorrect ? CORRECT : INCORRECT;
  const saved = isFavorite(questionId);

  const context = useMemo(
    () =>
      answerContextLine(
        { isCorrect, correctAnswer, explanation, seed: questionId || questionText },
        t,
      ),
    [isCorrect, correctAnswer, explanation, questionId, questionText, t],
  );

  const fileReport = useCallback(async () => {
    if (reportState === "busy" || reportState === "sent") return;
    setReportState("busy");

    const input: TriviaReportInput = {
      userId: user?.id ?? null,
      questionId: questionId || null,
      questionText,
      correctAnswer,
      language,
      source,
    };

    try {
      const structured = await supabase
        .from("question_reports" as never)
        .insert(triviaReportRow(input) as never);
      if (structured.error) {
        console.warn("[trivia] structured report failed", structured.error);
      }

      // Filed against user_reports too, always: the admin Reports page reads
      // that table and nothing else.
      let fallbackOk = false;
      const fallback = triviaReportFallbackRow(input);
      if (fallback) {
        const { error } = await supabase.from("user_reports").insert(fallback);
        if (error?.code === CHECK_VIOLATION) {
          // The report_type CHECK has not been widened yet — file it under
          // one of the values every deployed database already accepts.
          const retry = await supabase
            .from("user_reports")
            .insert(triviaReportFallbackRow(input, REPORT_TYPE_FALLBACK)!);
          if (retry.error) console.warn("[trivia] report failed", retry.error);
          fallbackOk = !retry.error;
        } else {
          if (error) console.warn("[trivia] report failed", error);
          fallbackOk = !error;
        }
      }

      setReportState(!structured.error || fallbackOk ? "sent" : "failed");
    } catch (error) {
      // Reporting never blocks the round — but it does say so.
      console.warn("[trivia] report failed", error);
      setReportState("failed");
    }
  }, [reportState, user, questionId, questionText, correctAnswer, language, source]);

  const VerdictIcon = isCorrect ? Medal : Lightbulb;
  const reportLabel =
    reportState === "sent"
      ? t("answerFeedback.reported")
      : reportState === "failed"
        ? t("moderation.reportFailed")
        : t("answerFeedback.report");

  return (
    <motion.div
      className={`relative ${className ?? ""}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {/* What the card sits on top of.
          On a short screen the answer list runs out of room and the card
          lands over it, and an opaque edge cuts whichever answer is under
          it clean in half. This band is that edge: the blur ramps in and
          the ground darkens toward the card, so the list dissolves under
          it instead of being guillotined by it. On a tall screen there is
          nothing behind it and it costs nothing to look at.
          Bled past the page's standard 16px gutter so the fade reaches the
          screen edges, which is where the answer buttons reach. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-full h-16"
        style={{
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          maskImage: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.6) 45%, #000 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.6) 45%, #000 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-full h-16"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.08) 45%, rgba(0,0,0,0.22) 100%)",
        }}
      />

      <div
        className="relative w-full rounded-[24px] px-5 pt-4 pb-5"
        style={{
          backgroundImage: palette.background,
          border: `1px solid ${palette.border}`,
          boxShadow: `0 8px 0 ${palette.ledge}`,
        }}
        // The reveal is announced once, politely: the player is reading, not
        // being interrupted.
        role="status"
        aria-live="polite"
      >
        {/* Verdict + the two actions */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-[5px] min-w-0">
            <VerdictIcon
              className="w-6 h-6 shrink-0"
              style={{ color: palette.iconTint }}
              strokeWidth={2}
            />
            <p
              className="font-display font-bold text-[18px] leading-[21px] tracking-[-0.5px] truncate"
              style={{ color: palette.ink }}
            >
              {isCorrect ? t("answerFeedback.correctTitle") : t("answerFeedback.incorrectTitle")}
            </p>
          </div>

          <div className="flex items-center gap-[15px] shrink-0">
            <motion.button
              type="button"
              onClick={() =>
                void toggleFavorite({
                  questionId,
                  questionText,
                  categoryId,
                  language,
                })
              }
              aria-pressed={saved}
              aria-label={saved ? t("answerFeedback.favorited") : t("answerFeedback.favorite")}
              title={saved ? t("answerFeedback.favorited") : t("answerFeedback.favorite")}
              className="-m-2 p-2"
              whileTap={{ scale: 0.85 }}
            >
              <Heart
                className="w-6 h-6"
                style={{ color: palette.ink }}
                fill={saved ? palette.ink : "none"}
                strokeWidth={2}
              />
            </motion.button>

            <motion.button
              type="button"
              onClick={() => void fileReport()}
              disabled={reportState === "busy" || reportState === "sent"}
              aria-label={reportLabel}
              title={reportLabel}
              className="-m-2 p-2 disabled:opacity-70"
              whileTap={{ scale: 0.85 }}
            >
              {reportState === "sent" ? (
                <Check className="w-6 h-6" style={{ color: palette.ink }} strokeWidth={2.5} />
              ) : reportState === "failed" ? (
                <AlertTriangle className="w-6 h-6" style={{ color: palette.ink }} strokeWidth={2} />
              ) : (
                <MessageSquareX
                  className="w-6 h-6"
                  style={{ color: palette.ink }}
                  strokeWidth={2}
                />
              )}
            </motion.button>
          </div>
        </div>

        {/* The few words about the answer */}
        <p
          className="mt-[26px] font-display text-[18px] leading-[21px] tracking-[-0.5px]"
          style={{ color: palette.ink }}
        >
          {context}
        </p>

        {/* The report's receipt, so the tap has an answer of its own */}
        {(reportState === "sent" || reportState === "failed") && (
          <p
            className="mt-2 text-[13px] leading-[18px] opacity-70"
            style={{ color: palette.ink }}
          >
            {reportLabel}
          </p>
        )}
      </div>
    </motion.div>
  );
}
