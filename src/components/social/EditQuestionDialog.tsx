import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Check, X } from "lucide-react";
import { QuestionIconPicker } from "./QuestionIconPicker";

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

const DIFFICULTY_OPTIONS = [
  { value: "easy", emoji: "🟢", label: "ადვილი" },
  { value: "medium", emoji: "🟡", label: "საშუალო" },
  { value: "hard", emoji: "🔴", label: "რთული" },
];

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
  const [difficulty, setDifficulty] = useState(question.difficulty || "medium");
  const [iconSlug, setIconSlug] = useState<string | null>(question.icon_slug || null);

  // Reset when question changes
  useEffect(() => {
    if (open) {
      setQuestionText(question.question_text);
      setCorrectAnswer(question.correct_answer);
      setIncorrectAnswers(question.incorrect_answers || ["", "", ""]);
      setDifficulty(question.difficulty || "medium");
      setIconSlug(question.icon_slug || null);
    }
  }, [open, question]);

  const handleSave = () => {
    onSave({
      question_text: questionText,
      correct_answer: correctAnswer,
      incorrect_answers: incorrectAnswers,
      difficulty,
      icon_slug: iconSlug,
    });
    onOpenChange(false);
  };

  const updateIncorrectAnswer = (index: number, value: string) => {
    const updated = [...incorrectAnswers];
    updated[index] = value;
    setIncorrectAnswers(updated);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            ✏️ კითხვის რედაქტირება
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Icon Picker */}
          <div className="flex items-center gap-3">
            <Label className="text-sm font-medium min-w-[60px]">აიქონი</Label>
            <QuestionIconPicker
              selectedSlug={iconSlug}
              onSelect={setIconSlug}
              questionText={questionText}
            />
          </div>

          {/* Question Text */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">კითხვა</Label>
            <Textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="შეიყვანეთ კითხვა..."
              className="min-h-[80px] resize-none"
            />
          </div>

          {/* Correct Answer */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-green-600">✓ სწორი პასუხი</Label>
            <Input
              value={correctAnswer}
              onChange={(e) => setCorrectAnswer(e.target.value)}
              placeholder="სწორი პასუხი"
              className="border-green-500/30 focus-visible:ring-green-500/50"
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
                    className="border-red-500/20"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Difficulty Selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">სირთულე</Label>
            <div className="flex gap-2">
              {DIFFICULTY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDifficulty(opt.value)}
                  className={`flex-1 py-2 px-3 rounded-lg border-2 transition-all text-sm font-medium ${
                    difficulty === opt.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {opt.emoji} {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            <X className="w-4 h-4 mr-2" />
            გაუქმება
          </Button>
          <Button
            onClick={handleSave}
            disabled={!questionText.trim() || !correctAnswer.trim()}
            className="flex-1"
          >
            <Check className="w-4 h-4 mr-2" />
            შენახვა
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
