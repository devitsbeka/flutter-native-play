import { useState, useEffect } from "react";
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
    onOpenChange(false);
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
          className="fixed inset-0 z-50 bg-background"
        >
          {/* Fixed Header */}
          <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/30 safe-top">
            <div className="flex items-center gap-3 px-4 py-3">
              <button 
                onClick={() => onOpenChange(false)} 
                className="p-2 -ml-2 hover:bg-muted rounded-xl transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-foreground" />
              </button>
              <div className="flex-1">
                <h1 className="text-lg font-bold text-foreground">✏️ კითხვის რედაქტირება</h1>
              </div>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="h-full overflow-y-auto pt-[60px] pb-24 safe-top">
            <div className="p-5 space-y-5">
              {/* Icon Picker - 86px large version */}
              <div className="flex justify-center">
                <QuestionIconPicker
                  selectedSlug={iconSlug}
                  onSelect={setIconSlug}
                  questionText={questionText}
                  large
                />
              </div>

              {/* Question Text */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">კითხვა</Label>
                <Textarea
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="შეიყვანეთ კითხვა..."
                  className="min-h-[100px] resize-none text-base"
                />
              </div>

              {/* Correct Answer */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-green-600">✓ სწორი პასუხი</Label>
                <Input
                  value={correctAnswer}
                  onChange={(e) => setCorrectAnswer(e.target.value)}
                  placeholder="სწორი პასუხი"
                  className="h-12 border-green-500/30 focus-visible:ring-green-500/50"
                />
              </div>

              {/* Incorrect Answers (only for 4_answers format) */}
              {answerFormat === "4_answers" && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-red-500">✗ არასწორი პასუხები</Label>
                  <div className="space-y-2">
                    {incorrectAnswers.map((answer, idx) => (
                      <Input
                        key={idx}
                        value={answer}
                        onChange={(e) => updateIncorrectAnswer(idx, e.target.value)}
                        placeholder={`არასწორი პასუხი ${idx + 1}`}
                        className="h-12 border-red-500/20"
                      />
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Fixed Footer */}
          <div className="fixed bottom-0 left-0 right-0 p-5 border-t border-border/30 bg-background safe-bottom">
            <ChunkyButton
              onClick={handleSave}
              disabled={!questionText.trim() || !correctAnswer.trim()}
              className="w-full"
              variant="success"
            >
              <Check className="w-5 h-5 mr-2" />
              შენახვა
            </ChunkyButton>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
