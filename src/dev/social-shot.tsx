/**
 * Social Shot — a still of the real solo game screen, for social posts.
 *
 * Served by the dev server only (social-shot.html is not a build input), and
 * screenshot by the posting pipeline. The markup below is the solo-mode
 * branch of QuizGameScreenProd lifted verbatim with its live state pinned:
 * same components, same classes, same tokens — so a post shows exactly what
 * a player sees, minus the parts that only exist to change (timers ticking,
 * handlers, power-up effects).
 *
 * Everything is overridable via query params so the pipeline can render any
 * question: ?question=…&answers=a|b|c|d&category=…&iconSlug=…&difficulty=easy
 * &seconds=11&total=15&dots=10&dot=2&lang=ka
 */
import { createRoot } from "react-dom/client";
import { ArrowLeft } from "lucide-react";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";
import { QuizQuestionCard } from "@/components/ui/quiz-question-card";
import { QuizProgressDots } from "@/components/ui/quiz-progress-dots";
import { QuizAnswerButton } from "@/components/ui/quiz-answer-button";
import { QuizPowerUpBar } from "@/components/ui/quiz-power-up-bar";
import { TimerBadge } from "@/components/game/TimerBadge";
import { DynamicIcon } from "@/components/shared/DynamicIcon";
import "@/index.css";

const params = new URLSearchParams(window.location.search);
const get = (key: string, fallback: string) => params.get(key) ?? fallback;

const shot = {
  question: get("question", "რომელი ცხოველი დებს ყველაზე დიდ კვერცხს?"),
  answers: get("answers", "ქათამი|არწივი|ნიანგი|სირაქლემა").split("|"),
  category: get("category", "ბიოლოგია"),
  iconSlug: get("iconSlug", "biology-class"),
  categoryId: get("categoryId", "biology"),
  difficulty: get("difficulty", "easy"),
  seconds: Number(get("seconds", "11")),
  total: Number(get("total", "15")),
  dots: Number(get("dots", "10")),
  dot: Number(get("dot", "2")),
  lang: get("lang", "ka"),
};

// The provider reads this key in its initial state, so it must be set before
// the first render.
localStorage.setItem("preferredLanguage", shot.lang);

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "bg-success",
  medium: "bg-amber-500",
  hard: "bg-destructive",
};

function SoloGameStill() {
  const { t } = useLanguage();

  const ANSWER_LABELS = [t("game.labelA"), t("game.labelB"), t("game.labelC"), t("game.labelD")];
  const difficultyLabel = t(`game.difficulty.${shot.difficulty}`) || shot.difficulty;

  const progressResults: ("correct" | "wrong" | null)[] = Array.from(
    { length: shot.dots },
    (_, i) => (i < shot.dot ? "correct" : null),
  );

  const powerUpsForUI = [
    { type: "5050" as const, count: 2, state: "default" as const },
    { type: "freeze" as const, count: 1, state: "default" as const },
    { type: "replace" as const, count: 1, state: "default" as const },
    { type: "hint" as const, count: 3, state: "default" as const },
  ];

  return (
    <div className="w-full h-full bg-[#7E7ADB] overflow-hidden">
      <div className="w-full h-full flex flex-col max-w-[700px] md:max-w-[520px] mx-auto">
        {/* Header — solo mode: back, category name, timer */}
        <div className="flex items-center justify-between px-4 pt-3 py-1 mb-2 [@media(max-height:700px)]:py-0.5 [@media(max-height:700px)]:mb-1 [@media(max-height:600px)]:pt-1 [@media(max-height:600px)]:py-0 [@media(max-height:600px)]:mb-0.5 flex-shrink-0">
          <button className="w-10 h-10 [@media(max-height:700px)]:w-8 [@media(max-height:700px)]:h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors">
            <ArrowLeft className="w-5 h-5 [@media(max-height:700px)]:w-4 [@media(max-height:700px)]:h-4 text-white" />
          </button>
          <span className="text-white font-bold text-base [@media(max-height:700px)]:text-sm truncate max-w-[160px] text-center">
            {shot.category}
          </span>
          <TimerBadge seconds={shot.seconds} maxSeconds={shot.total} compact />
        </div>

        {/* Question card with overlapping category icon */}
        <div className="px-4 flex-shrink-0 -mt-1 mb-0 [@media(max-height:700px)]:-mt-2 [@media(max-height:600px)]:-mt-3 relative">
          <div className="absolute left-1/2 -translate-x-1/2 -top-[33px] z-20">
            <DynamicIcon
              slug={shot.iconSlug}
              categoryId={shot.categoryId}
              size={64}
              className="drop-shadow-lg"
              hideIfEmpty={true}
            />
          </div>
          <QuizQuestionCard
            questionText={shot.question}
            progressPercent={(shot.seconds / shot.total) * 100}
            state="default"
            difficultyLabel={difficultyLabel}
            difficultyColor={DIFFICULTY_COLORS[shot.difficulty] || DIFFICULTY_COLORS.medium}
            timerSeconds={shot.seconds}
            timerMaxSeconds={shot.total}
            reserveTopSpace
          />
        </div>

        {/* Progress dots */}
        <div className="flex justify-center py-2 [@media(max-height:700px)]:py-1.5 [@media(max-height:600px)]:py-1 flex-shrink-0">
          <QuizProgressDots total={shot.dots} current={shot.dot} results={progressResults} />
        </div>

        {/* Answers */}
        <div className="flex-1 px-4 mt-0 flex flex-col gap-3 [@media(max-height:700px)]:gap-2 [@media(max-height:600px)]:gap-1.5 overflow-y-auto min-h-0 pb-2">
          {shot.answers.map((answer, index) => (
            <div key={index} className="flex-shrink-0 w-full relative">
              <QuizAnswerButton
                label={ANSWER_LABELS[index]}
                text={answer}
                state="default"
                showLabel={true}
              />
            </div>
          ))}
        </div>

        {/* Power-up bar */}
        <div className="px-4 pb-2 [@media(max-height:700px)]:pb-1 [@media(max-height:600px)]:pb-0.5 flex-shrink-0">
          <div className="pb-[env(safe-area-inset-bottom)]">
            <QuizPowerUpBar powerUps={powerUpsForUI} onPowerUpClick={() => {}} />
          </div>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <LanguageProvider>
    <div style={{ width: "100vw", height: "100dvh" }}>
      <SoloGameStill />
    </div>
  </LanguageProvider>,
);
