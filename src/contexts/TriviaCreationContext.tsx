import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { t } from "@/lib/i18n";
import type { Json } from "@/integrations/supabase/types";
import { cloneJson, newId } from "@/utils/compat";

/**
 * Making a trivia is something the app does, not something the player waits
 * through.
 *
 * `generate-custom-quiz` is an AI call, and it takes as long as it takes —
 * tens of seconds on a cold start. That whole time used to be spent inside
 * the create wizard, watching a progress bar that was faked on a timer
 * (`prev + Math.random() * 15`, every 500ms, capped at 90) because nothing
 * downstream reports real progress. Closing the wizard threw the work away
 * with nothing to show for it: no trivia, no error, no trace that anything
 * had happened at all (owner: "i wait too long and if i cancel it shows
 * nothing, disappears").
 *
 * So the request outlives the screen that started it. The wizard hands the
 * job over and closes; the questions are generated, saved, and the list is
 * refreshed whether or not anybody is looking. What the player gets instead
 * of the wait is a sentence saying it is coming, and a Create button that
 * shows the work is still running.
 *
 * ## One at a time
 *
 * `busy` is the whole concurrency story, and it is deliberately a single
 * job rather than a queue. Two trivias generating at once means two AI calls
 * on one account, two rows appearing in an order nobody chose, and a button
 * that cannot say which of them it is waiting for. The Create button reads
 * `busy` and stands down.
 */

export type TriviaKind = "trivia" | "party";

export interface TriviaJob {
  id: string;
  kind: TriviaKind;
  /** What the player asked for, to name the job while it runs. */
  subject: string;
  startedAt: number;
}

/** Everything the generator needs, taken from the wizard as it closes. */
export interface TriviaRequest {
  subject: string;
  questionCount: number;
  answerFormat: string;
  difficulty: string;
  isPublic: boolean;
  /** The gradient the wizard picked, when it has one. Otherwise one is drawn. */
  coverGradient?: string;
}

interface TriviaCreationValue {
  job: TriviaJob | null;
  /** A trivia is being made right now. Nothing else may start one. */
  busy: boolean;
  /**
   * Hand a trivia over to be made. Returns immediately — the caller closes
   * itself and the work carries on. Refused (returns false) while `busy`.
   */
  startTriviaGeneration: (request: TriviaRequest) => boolean;
}

const TriviaCreationContext = createContext<TriviaCreationValue | undefined>(undefined);

/**
 * A question as the generator returns it. Kept local to this file: the
 * wizard's own richer editor shape is not involved any more, because the
 * questions are saved as generated.
 */
interface GeneratedQuestion {
  question_text: string;
  correct_answer: string;
  incorrect_answers: string[];
  difficulty?: string | null;
  icon_slug?: string | null;
}

/**
 * The cover gradients the trivia save already used, kept identical so a
 * trivia made this way looks like every other one.
 */
const COVER_GRADIENTS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
];

/** The same client-side safety net the wizard applied to a batch. */
function withoutDuplicates(questions: GeneratedQuestion[]): GeneratedQuestion[] {
  const seen = new Set<string>();
  return questions.filter((q) => {
    const key = (q.question_text ?? "").trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function TriviaCreationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [job, setJob] = useState<TriviaJob | null>(null);
  // The guard the button reads is state, but the guard that actually stops a
  // second job has to be a ref: two presses in the same tick both see the
  // old state.
  const running = useRef(false);

  const refreshLists = useCallback(() => {
    for (const key of [
      "my-quiz-posts",
      "quiz-posts-with-profiles",
      "my-trivias-for-room",
      "my-collections",
      "my-recent-trivias-widget",
    ]) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
  }, [queryClient]);

  const startTriviaGeneration = useCallback(
    (request: TriviaRequest): boolean => {
      if (!user || running.current) return false;
      running.current = true;
      const started: TriviaJob = {
        id: newId(),
        kind: "trivia",
        subject: request.subject,
        startedAt: Date.now(),
      };
      setJob(started);

      void (async () => {
        try {
          const { data, error } = await supabase.functions.invoke("generate-custom-quiz", {
            body: {
              subject: request.subject,
              questionCount: request.questionCount,
              answerFormat: request.answerFormat,
              difficulty: request.difficulty,
            },
          });
          if (error) throw error;

          const generated = withoutDuplicates((data?.questions ?? []) as GeneratedQuestion[]);
          if (!generated.length) throw new Error(t("extra.cbtGenerationFailed"));

          const title: string = data?.suggestedTitle || request.subject;
          const hashtags = request.subject
            .split(/[\s,]+/)
            .filter((word) => word.length > 2)
            .slice(0, 5)
            .map((word) => `#${word.replace(/[^a-zA-Zა-ჰ0-9]/g, "")}`);

          // Stored exactly as the in-modal save stored it, so a trivia made
          // in the background is indistinguishable from one made in front of
          // you — same question shape, same answer-format sniff, same flags.
          const questionsToSave = generated.map((q) => ({
            question_text: q.question_text,
            correct_answer: q.correct_answer,
            incorrect_answers: q.incorrect_answers,
            difficulty: q.difficulty || "medium",
            iconSlug: q.icon_slug || null,
          }));

          const { error: insertError } = await supabase.from("user_quiz_posts").insert([
            {
              user_id: user.id,
              title,
              subject: request.subject,
              hashtags,
              cover_gradient:
                request.coverGradient ??
                COVER_GRADIENTS[Math.floor(Math.random() * COVER_GRADIENTS.length)],
              question_count: generated.length,
              answer_format:
                generated[0]?.incorrect_answers?.length === 1 ? "true_false" : "4_answers",
              questions: cloneJson(questionsToSave) as unknown as Json,
              icon_slug: generated[0]?.icon_slug ?? null,
              is_public: request.isPublic,
              is_blind: true,
            },
          ]);
          if (insertError) throw insertError;

          refreshLists();
          // The pair the app already uses when a trivia lands.
          toast({
            title: t("extra.triviaReady"),
            description: t("extra.triviaReadyDesc", { count: generated.length, title }),
          });
        } catch (err) {
          console.error("[TriviaCreation] generation failed:", err);
          // The player is somewhere else by now, so this is the only place
          // the failure can surface. Silence here is the bug this whole
          // context exists to fix, in a new costume.
          toast({
            title: t("extra.errorTitle"),
            description: t("extra.editorGenerationFailed"),
            variant: "destructive",
          });
        } finally {
          running.current = false;
          setJob(null);
        }
      })();

      return true;
    },
    [user, refreshLists],
  );

  const value = useMemo(
    () => ({ job, busy: job !== null, startTriviaGeneration }),
    [job, startTriviaGeneration],
  );

  return <TriviaCreationContext.Provider value={value}>{children}</TriviaCreationContext.Provider>;
}

/**
 * Safe outside the provider: a screen that is not under it simply never has
 * a job running. The create wizard and the rooms page are both inside it,
 * and those are the two that care.
 */
export function useTriviaCreation(): TriviaCreationValue {
  return (
    useContext(TriviaCreationContext) ?? {
      job: null,
      busy: false,
      startTriviaGeneration: () => false,
    }
  );
}
