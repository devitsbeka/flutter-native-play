import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, ChevronRight, ChevronLeft, Check, Loader2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface GeneratedQuestion {
  question_text: string;
  correct_answer: string;
  incorrect_answers: string[];
}

interface CreateQuizModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onQuizCreated?: () => void;
}

const QUESTION_COUNTS = [5, 10, 15, 20];
const COVER_GRADIENTS = [
  "from-purple-500 to-pink-500",
  "from-blue-500 to-cyan-500",
  "from-orange-500 to-red-500",
  "from-green-500 to-emerald-500",
  "from-indigo-500 to-purple-500",
  "from-yellow-500 to-orange-500",
];

export function CreateQuizModal({ open, onOpenChange, onQuizCreated }: CreateQuizModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [subject, setSubject] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [answerFormat, setAnswerFormat] = useState<"4_answers" | "true_false">("4_answers");
  const [isGenerating, setIsGenerating] = useState(false);
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPosting, setIsPosting] = useState(false);

  const resetForm = () => {
    setStep(1);
    setSubject("");
    setQuestionCount(10);
    setAnswerFormat("4_answers");
    setQuestions([]);
    setTitle("");
    setDescription("");
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const generateQuestions = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-custom-quiz", {
        body: { subject, questionCount, answerFormat },
      });

      if (error) throw error;

      setQuestions(data.questions);
      setTitle(data.suggestedTitle || `${subject} Quiz`);
      setStep(4);
    } catch (error) {
      console.error("Error generating quiz:", error);
      toast({
        title: "შეცდომა",
        description: "კითხვების გენერაცია ვერ მოხერხდა",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePost = async () => {
    if (!user) {
      toast({
        title: "შესვლა საჭიროა",
        description: "გთხოვთ შეხვიდეთ თქვენს ანგარიშში",
        variant: "destructive",
      });
      return;
    }

    setIsPosting(true);
    try {
      const hashtags = subject
        .split(" ")
        .filter(word => word.length > 2)
        .slice(0, 5)
        .map(word => `#${word.replace(/[^a-zA-Zა-ჰ0-9]/g, "")}`);

      const coverGradient = COVER_GRADIENTS[Math.floor(Math.random() * COVER_GRADIENTS.length)];

      const { error } = await supabase.from("user_quiz_posts").insert([{
        user_id: user.id,
        title,
        description,
        subject,
        hashtags,
        cover_gradient: coverGradient,
        question_count: questions.length,
        answer_format: answerFormat,
        questions: JSON.parse(JSON.stringify(questions)),
      }]);

      if (error) throw error;

      toast({
        title: "წარმატება! 🎉",
        description: "შენი Trivia გამოქვეყნდა",
      });

      handleClose();
      onQuizCreated?.();
    } catch (error) {
      console.error("Error posting quiz:", error);
      toast({
        title: "შეცდომა",
        description: "Trivia-ს გამოქვეყნება ვერ მოხერხდა",
        variant: "destructive",
      });
    } finally {
      setIsPosting(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <h3 className="text-xl font-bold text-foreground mb-2">რა თემაზე გნებავთ?</h3>
              <p className="text-sm text-muted-foreground">შეიყვანეთ თემა ან სათაური</p>
            </div>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="მაგ: Friends TV Show, Oscars 2025..."
              className="text-center text-lg h-14"
              autoFocus
            />
            <ChunkyButton
              onClick={() => setStep(2)}
              disabled={!subject.trim()}
              className="w-full"
            >
              შემდეგი
              <ChevronRight className="w-5 h-5 ml-2" />
            </ChunkyButton>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <h3 className="text-xl font-bold text-foreground mb-2">რამდენი კითხვა?</h3>
              <p className="text-sm text-muted-foreground">აირჩიეთ კითხვების რაოდენობა</p>
            </div>
            <div className="flex justify-center gap-3">
              {QUESTION_COUNTS.map((count) => (
                <button
                  key={count}
                  onClick={() => setQuestionCount(count)}
                  className={`w-14 h-14 rounded-xl font-bold text-lg transition-all ${
                    questionCount === count
                      ? "bg-primary text-primary-foreground shadow-lg scale-110"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                <ChevronLeft className="w-4 h-4 mr-2" />
                უკან
              </Button>
              <ChunkyButton onClick={() => setStep(3)} className="flex-1">
                შემდეგი
                <ChevronRight className="w-5 h-5 ml-2" />
              </ChunkyButton>
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <h3 className="text-xl font-bold text-foreground mb-2">პასუხების ფორმატი</h3>
              <p className="text-sm text-muted-foreground">აირჩიეთ კითხვების ტიპი</p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => setAnswerFormat("4_answers")}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                  answerFormat === "4_answers"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="font-semibold text-foreground">4 პასუხი</div>
                <div className="text-sm text-muted-foreground">კლასიკური ფორმატი 4 ვარიანტით</div>
              </button>
              <button
                onClick={() => setAnswerFormat("true_false")}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                  answerFormat === "true_false"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="font-semibold text-foreground">მართალი / მცდარი</div>
                <div className="text-sm text-muted-foreground">სწრაფი True/False კითხვები</div>
              </button>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                <ChevronLeft className="w-4 h-4 mr-2" />
                უკან
              </Button>
              <ChunkyButton onClick={generateQuestions} disabled={isGenerating} className="flex-1">
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    იტვირთება...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    გენერაცია
                  </>
                )}
              </ChunkyButton>
            </div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="text-center">
              <h3 className="text-xl font-bold text-foreground mb-2">შენი Trivia მზადაა!</h3>
              <p className="text-sm text-muted-foreground">{questions.length} კითხვა დაგენერირდა</p>
            </div>
            
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Trivia-ს სახელი"
              className="text-lg font-semibold"
            />
            
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="მოკლე აღწერა (არასავალდებულო)"
              rows={2}
            />

            <div className="max-h-48 overflow-y-auto space-y-2 p-2 bg-muted/50 rounded-xl">
              {questions.map((q, i) => (
                <div key={i} className="p-3 bg-background rounded-lg border border-border">
                  <div className="text-sm font-medium text-foreground">
                    {i + 1}. {q.question_text}
                  </div>
                  <div className="text-xs text-green-600 mt-1">✓ {q.correct_answer}</div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(3)} className="flex-1">
                <ChevronLeft className="w-4 h-4 mr-2" />
                უკან
              </Button>
              <ChunkyButton 
                onClick={handlePost} 
                disabled={isPosting || !title.trim()}
                className="flex-1"
              >
                {isPosting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    იტვირთება...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    გამოქვეყნება
                  </>
                )}
              </ChunkyButton>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-6">
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-full p-1 hover:bg-muted transition-colors"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all ${
                s <= step ? "bg-primary w-8" : "bg-muted w-4"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {renderStep()}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
