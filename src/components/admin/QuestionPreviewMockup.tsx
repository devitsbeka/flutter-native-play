import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PreviewQuestion {
  question_text: string;
  correct_answer: string;
  incorrect_answers: string[];
  difficulty: string;
}

interface QuestionPreviewMockupProps {
  question: PreviewQuestion | null;
  className?: string;
}

export function QuestionPreviewMockup({ question, className }: QuestionPreviewMockupProps) {
  const allAnswers = question
    ? [question.correct_answer, ...question.incorrect_answers].sort(() => Math.random() - 0.5)
    : ["Answer A", "Answer B", "Answer C", "Answer D"];

  const answerLabels = ["A", "B", "C", "D"];

  return (
    <div className={cn("relative", className)}>
      {/* iPhone Frame */}
      <div className="relative mx-auto w-[220px] h-[440px]">
        {/* Device Bezel */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-800 to-slate-900 rounded-[36px] shadow-2xl p-2">
          {/* Screen */}
          <div className="relative w-full h-full bg-gradient-to-b from-[#7C6AE5] to-[#9B89F5] rounded-[30px] overflow-hidden">
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-slate-900 rounded-b-2xl z-10" />
            
            {/* Timer Bar */}
            <div className="absolute top-8 left-4 right-4 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-white rounded-full"
                initial={{ width: "100%" }}
                animate={{ width: "30%" }}
                transition={{ duration: 3, repeat: Infinity, repeatType: "reverse" }}
              />
            </div>
            
            {/* Progress Dots */}
            <div className="absolute top-12 left-1/2 -translate-x-1/2 flex gap-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-2 h-2 rounded-full",
                    i < 2 ? "bg-white" : i === 2 ? "bg-white/80" : "bg-white/30"
                  )}
                />
              ))}
            </div>
            
            {/* Question Card */}
            <div className="absolute top-20 left-3 right-3">
              <div className="bg-white/95 backdrop-blur rounded-2xl p-3 shadow-lg">
                {/* Difficulty Badge */}
                <div className="flex justify-center mb-2">
                  <span
                    className={cn(
                      "text-[9px] font-bold px-2 py-0.5 rounded-full uppercase",
                      question?.difficulty === "easy" && "bg-emerald-100 text-emerald-700",
                      question?.difficulty === "medium" && "bg-amber-100 text-amber-700",
                      question?.difficulty === "hard" && "bg-red-100 text-red-700",
                      !question && "bg-purple-100 text-purple-700"
                    )}
                  >
                    {question?.difficulty || "Medium"}
                  </span>
                </div>
                
                {/* Question Text */}
                <p className="text-[11px] font-semibold text-slate-800 text-center leading-tight">
                  {question?.question_text || "Select a question to preview how it will look in the game"}
                </p>
              </div>
            </div>
            
            {/* Answer Buttons */}
            <div className="absolute bottom-6 left-3 right-3 space-y-2">
              {answerLabels.map((label, idx) => {
                const answer = allAnswers[idx];
                const isCorrect = question && answer === question.correct_answer;
                
                return (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={cn(
                      "relative rounded-xl overflow-hidden",
                      isCorrect ? "ring-2 ring-emerald-400" : ""
                    )}
                  >
                    {/* Button Depth */}
                    <div
                      className={cn(
                        "absolute inset-0 translate-y-1 rounded-xl",
                        isCorrect ? "bg-emerald-600" : "bg-purple-700/50"
                      )}
                    />
                    {/* Button Face */}
                    <div
                      className={cn(
                        "relative flex items-center gap-2 px-2.5 py-2 rounded-xl",
                        isCorrect
                          ? "bg-emerald-500 text-white"
                          : "bg-white/90 text-slate-700"
                      )}
                    >
                      <span
                        className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                          isCorrect
                            ? "bg-white/20 text-white"
                            : "bg-purple-500/10 text-purple-600"
                        )}
                      >
                        {label}
                      </span>
                      <span className="flex-1 text-[10px] font-medium truncate">
                        {answer}
                      </span>
                      {isCorrect && (
                        <span className="text-[10px]">✓</span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      
      {/* Glow Effect */}
      <div className="absolute inset-0 blur-3xl opacity-30 bg-gradient-to-b from-purple-500 to-fuchsia-500 -z-10 scale-75" />
    </div>
  );
}
