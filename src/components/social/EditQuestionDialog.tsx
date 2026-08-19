import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Check, ChevronLeft } from "lucide-react";
import { QuestionIconPicker } from "./QuestionIconPicker";
import { ChunkyButton } from "@/components/ui/chunky-button";

interface EditQuestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: {
    question_text: string;
    correct_answer: string;
    incorrect_answers?: string[];
    difficulty?: string;
    icon_slug?: string | null;
  };
  onSave: (updated: {
    question_text: string;
    correct_answer: string;
    incorrect_answers?: string[];
    difficulty?: string;
    icon_slug?: string | null;
  }) => void;
  answerFormat?: "4_answers" | "true_false";
}

// Difficulty options removed per design update

export function EditQuestionDialog({
  open,
  onOpenChange,
  question,
  onSave,
  answerFormat = "4_answers"
}: EditQuestionDialogProps) {
  const { t } = useLanguage();
  const [questionText, setQuestionText] = useState(question.question_text);
  const [correctAnswer, setCorrectAnswer] = useState(question.correct_answer);
  const [incorrectAnswers, setIncorrectAnswers] = useState<string[]>(
    question.incorrect_answers || ["", "", ""]
  );
  const [iconSlug, setIconSlug] = useState<string | null>(question.icon_slug || null);

  // Reset when question changes
  useEffect(() => {
    if (open) {
      setQuestionText(question.question_text);
      setCorrectAnswer(question.correct_answer);
      setIncorrectAnswers(question.incorrect_answers || ["", "", ""]);
      setIconSlug(question.icon_slug || null);
    }
  }, [open, question]);

  const handleSave = () => {
    onSave({
      question_text: questionText,
      correct_answer: correctAnswer,
      incorrect_answers: incorrectAnswers,
      icon_slug: iconSlug,
    });
  };

  const updateIncorrectAnswer = (index: number, value: string) => {
    const updated = [...incorrectAnswers];
    updated[index] = value;
    setIncorrectAnswers(updated);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 safe-screen z-[200] bg-[#7E7ADB]"
        >
          {/* Fixed Header */}
          <div className="fixed top-0 left-0 right-0 z-50 bg-[#7E7ADB]/90 backdrop-blur-md border-b border-white/10 safe-top">
            <div className="flex items-center gap-3 px-4 py-3">
              <button 
                onClick={() => onOpenChange(false)} 
                className="p-2 -ml-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <div className="flex-1">
                <h1 className="text-lg font-bold text-white">✏️ {t("extra.editQuestion")}</h1>
              </div>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="h-full overflow-y-auto pt-[60px] pb-24">
            <div className="max-w-[700px] md:max-w-[520px] mx-auto w-full">
              <div className="p-5 space-y-5">
              {/* Icon Picker - 86px large version */}
              <div className="flex justify-center">
                <QuestionIconPicker
                  selectedSlug={iconSlug}
                  onSelect={setIconSlug}
                  questionText={questionText}
                  large
                  creatorMode
                />
              </div>

              {/* Question Text */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-white/80">{t("extra.questionLabel")}</Label>
                <Textarea
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder={t("extra.enterQuestion")}
                  className="min-h-[100px] resize-none text-base bg-white/10 border-white/20 text-white placeholder:text-white/50 focus-visible:ring-white/30"
                />
              </div>

              {/* Correct Answer - Game style */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-emerald-300">✓ {t("extra.correctAnswerLabel")}</Label>
                <div className="relative">
                  <div className="absolute inset-0 bg-emerald-700 rounded-xl translate-y-1" />
                  <Input
                    value={correctAnswer}
                    onChange={(e) => setCorrectAnswer(e.target.value)}
                    placeholder={t("extra.correctAnswerPlaceholder")}
                    className="relative h-12 bg-emerald-500 border-0 text-white placeholder:text-emerald-200 font-semibold"
                  />
                </div>
              </div>

              {/* Incorrect Answers (only for 4_answers format) */}
              {answerFormat === "4_answers" && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-red-300">✗ {t("extra.incorrectAnswersLabel")}</Label>
                  <div className="space-y-2.5">
                    {incorrectAnswers.map((answer, idx) => (
                      <div key={idx} className="relative">
                        <div className="absolute inset-0 bg-gray-400 rounded-xl translate-y-1" />
                        <div className="relative flex items-center">
                          <div className="absolute left-3 w-7 h-7 rounded-full bg-sky-300 flex items-center justify-center z-10">
                            <span className="text-slate-700 font-bold text-sm">
                              {[t("extra.answerLabelB"), t("extra.answerLabelC"), t("extra.answerLabelD")][idx]}
                            </span>
                          </div>
                          <Input
                            value={answer}
                            onChange={(e) => updateIncorrectAnswer(idx, e.target.value)}
                            placeholder={t("extra.incorrectAnswerPlaceholder", { n: idx + 1 })}
                            className="h-12 bg-white border-0 text-slate-700 placeholder:text-slate-400 pl-14 font-medium"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              </div>
            </div>
          </div>

          {/* Fixed Footer */}
          <div className="fixed bottom-0 left-0 right-0 z-[60] p-5 pb-[calc(1.25rem_+_var(--safe-bottom))] border-t border-white/10 bg-[#7E7ADB]/95 backdrop-blur-sm">
            <div className="max-w-[700px] md:max-w-[520px] mx-auto w-full">
              <ChunkyButton
              onClick={handleSave}
              disabled={!questionText.trim() || !correctAnswer.trim()}
              className="w-full"
              variant="success"
            >
                <Check className="w-5 h-5 mr-2" />
                {t("extra.editSaveBtn")}
              </ChunkyButton>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
