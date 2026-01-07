import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, ChevronRight, ChevronLeft, Check, Loader2, Wand2, Zap, Brain, Trophy, Edit3, RefreshCw } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import confetti from "canvas-confetti";
import { QuestionIconPicker } from "./QuestionIconPicker";

interface GeneratedQuestion {
  question_text: string;
  correct_answer: string;
  incorrect_answers: string[];
  difficulty?: string;
  icon_slug?: string;
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

const POPULAR_TOPICS = [
  { emoji: "🎬", label: "კინო", value: "კინო და ფილმები" },
  { emoji: "⚽", label: "სპორტი", value: "სპორტი და ფეხბურთი" },
  { emoji: "🎵", label: "მუსიკა", value: "მუსიკა და მომღერლები" },
  { emoji: "🌍", label: "გეოგრაფია", value: "გეოგრაფია და ქვეყნები" },
  { emoji: "📚", label: "ისტორია", value: "ისტორია" },
  { emoji: "🔬", label: "მეცნიერება", value: "მეცნიერება და ტექნოლოგია" },
];

export function CreateQuizModal({ open, onOpenChange, onQuizCreated }: CreateQuizModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [subject, setSubject] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [answerFormat, setAnswerFormat] = useState<"4_answers" | "true_false">("4_answers");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [selectedGradient, setSelectedGradient] = useState(COVER_GRADIENTS[0]);

  // Reset on open
  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setStep(1);
    setSubject("");
    setQuestionCount(10);
    setAnswerFormat("4_answers");
    setQuestions([]);
    setTitle("");
    setDescription("");
    setGenerationProgress(0);
    setSelectedGradient(COVER_GRADIENTS[Math.floor(Math.random() * COVER_GRADIENTS.length)]);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const generateQuestions = async () => {
    setIsGenerating(true);
    setGenerationProgress(0);
    
    // Simulate progress
    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => Math.min(prev + Math.random() * 15, 90));
    }, 500);

    try {
      const { data, error } = await supabase.functions.invoke("generate-custom-quiz", {
        body: { subject, questionCount, answerFormat },
      });

      clearInterval(progressInterval);
      setGenerationProgress(100);

      if (error) throw error;
      
      const generatedQuestions = data?.questions || [];
      if (!generatedQuestions.length) {
        throw new Error("კითხვები ვერ დაგენერირდა");
      }

      // Celebrate!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      setQuestions(generatedQuestions);
      setTitle(data?.suggestedTitle || `${subject} ტრივია`);
      
      setTimeout(() => setStep(4), 300);
    } catch (error) {
      clearInterval(progressInterval);
      console.error("Error generating quiz:", error);
      toast({
        title: "შეცდომა 😕",
        description: error instanceof Error ? error.message : "კითხვების გენერაცია ვერ მოხერხდა",
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
        .split(/[\s,]+/)
        .filter(word => word.length > 2)
        .slice(0, 5)
        .map(word => `#${word.replace(/[^a-zA-Zა-ჰ0-9]/g, "")}`);

      // Get icon from first question if available
      const iconSlug = questions[0]?.icon_slug || null;

      const { error } = await supabase.from("user_quiz_posts").insert([{
        user_id: user.id,
        title,
        description,
        subject,
        hashtags,
        cover_gradient: selectedGradient,
        question_count: questions.length,
        answer_format: answerFormat,
        questions: JSON.parse(JSON.stringify(questions)),
        icon_slug: iconSlug,
      }]);

      if (error) throw error;

      // Big celebration!
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.5 }
      });

      toast({
        title: "წარმატება! 🎉",
        description: "შენი Trivia გამოქვეყნდა!",
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

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-500';
      case 'medium': return 'text-yellow-500';
      case 'hard': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  const getDifficultyLabel = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy': return 'მარტივი';
      case 'medium': return 'საშუალო';
      case 'hard': return 'რთული';
      default: return '';
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-5"
          >
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 mb-4">
                <Wand2 className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-1">შექმენი Trivia ✨</h3>
              <p className="text-sm text-muted-foreground">რა თემაზე გსურს კითხვები?</p>
            </div>

            {/* Popular topics */}
            <div className="grid grid-cols-3 gap-2">
              {POPULAR_TOPICS.map((topic) => (
                <button
                  key={topic.value}
                  onClick={() => setSubject(topic.value)}
                  className={`p-3 rounded-xl border-2 transition-all text-center ${
                    subject === topic.value
                      ? "border-primary bg-primary/10 scale-105"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  }`}
                >
                  <span className="text-2xl block mb-1">{topic.emoji}</span>
                  <span className="text-xs font-medium text-foreground">{topic.label}</span>
                </button>
              ))}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-background px-3 text-xs text-muted-foreground">ან ჩაწერე</span>
              </div>
            </div>

            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="მაგ: Friends TV Show, NBA, K-Pop..."
              className="text-center text-lg h-14 rounded-xl"
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-5"
          >
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 mb-4">
                <Brain className="w-8 h-8 text-blue-500" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-1">რამდენი კითხვა? 🤔</h3>
              <p className="text-sm text-muted-foreground">აირჩიე სიმაღლე</p>
            </div>

            <div className="flex justify-center gap-3">
              {QUESTION_COUNTS.map((count) => (
                <motion.button
                  key={count}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setQuestionCount(count)}
                  className={`w-16 h-16 rounded-2xl font-bold text-xl transition-all relative overflow-hidden ${
                    questionCount === count
                      ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {count}
                  {questionCount === count && (
                    <motion.div
                      layoutId="count-indicator"
                      className="absolute inset-0 border-2 border-primary-foreground/30 rounded-2xl"
                    />
                  )}
                </motion.button>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-12 rounded-xl">
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-5"
          >
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-500/5 mb-4">
                <Zap className="w-8 h-8 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-1">ფორმატი ⚡</h3>
              <p className="text-sm text-muted-foreground">როგორი კითხვები გინდა?</p>
            </div>

            <div className="space-y-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setAnswerFormat("4_answers")}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-4 ${
                  answerFormat === "4_answers"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 flex items-center justify-center">
                  <span className="text-2xl">🎯</span>
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-foreground">4 ვარიანტი</div>
                  <div className="text-sm text-muted-foreground">კლასიკური Quiz ფორმატი</div>
                </div>
                {answerFormat === "4_answers" && (
                  <Check className="w-5 h-5 text-primary" />
                )}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setAnswerFormat("true_false")}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-4 ${
                  answerFormat === "true_false"
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-green-500/5 flex items-center justify-center">
                  <span className="text-2xl">✅</span>
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-foreground">მართალი / მცდარი</div>
                  <div className="text-sm text-muted-foreground">სწრაფი True/False</div>
                </div>
                {answerFormat === "true_false" && (
                  <Check className="w-5 h-5 text-primary" />
                )}
              </motion.button>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1 h-12 rounded-xl">
                <ChevronLeft className="w-4 h-4 mr-2" />
                უკან
              </Button>
              <ChunkyButton onClick={generateQuestions} disabled={isGenerating} className="flex-1">
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {Math.round(generationProgress)}%
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    დაგენერირება
                  </>
                )}
              </ChunkyButton>
            </div>

            {isGenerating && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-2"
              >
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary to-primary/60"
                    initial={{ width: 0 }}
                    animate={{ width: `${generationProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-xs text-center text-muted-foreground animate-pulse">
                  ✨ AI ქმნის კითხვებს...
                </p>
              </motion.div>
            )}
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-4"
          >
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500/20 to-green-500/5 mb-3"
              >
                <Trophy className="w-8 h-8 text-green-500" />
              </motion.div>
              <h3 className="text-xl font-bold text-foreground mb-1">მზადაა! 🎉</h3>
              <p className="text-sm text-muted-foreground">{questions.length} კითხვა შეიქმნა</p>
            </div>

            {/* Preview card */}
            <div className={`p-4 rounded-2xl bg-gradient-to-br ${selectedGradient} text-white`}>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Trivia-ს სახელი"
                className="bg-white/20 border-white/30 text-white placeholder:text-white/70 text-lg font-bold h-12 rounded-xl"
              />
            </div>

            {/* Gradient picker */}
            <div className="flex justify-center gap-2">
              {COVER_GRADIENTS.map((gradient) => (
                <button
                  key={gradient}
                  onClick={() => setSelectedGradient(gradient)}
                  className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradient} transition-all ${
                    selectedGradient === gradient ? "ring-2 ring-primary ring-offset-2" : ""
                  }`}
                />
              ))}
            </div>
            
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="მოკლე აღწერა (არასავალდებულო)"
              rows={2}
              className="rounded-xl resize-none"
            />

            {/* Questions preview with icon picker */}
            <div className="max-h-48 overflow-y-auto space-y-2 p-2 bg-muted/30 rounded-xl">
              {questions.map((q, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-3 bg-background rounded-xl border border-border flex gap-3 items-center"
                >
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground line-clamp-1">
                      {q.question_text}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-green-600 truncate">✓ {q.correct_answer}</span>
                      {q.difficulty && (
                        <span className={`text-xs ${getDifficultyColor(q.difficulty)}`}>
                          • {getDifficultyLabel(q.difficulty)}
                        </span>
                      )}
                    </div>
                  </div>
                  <QuestionIconPicker
                    selectedSlug={q.icon_slug || null}
                    onSelect={(slug) => {
                      setQuestions(prev => prev.map((question, idx) => 
                        idx === i ? { ...question, icon_slug: slug || undefined } : question
                      ));
                    }}
                  />
                </motion.div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setStep(3);
                  setQuestions([]);
                }} 
                className="flex-1 h-12 rounded-xl"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                თავიდან
              </Button>
              <ChunkyButton 
                onClick={handlePost} 
                disabled={isPosting || !title.trim()}
                className="flex-1"
              >
                {isPosting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ქვეყნდება...
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
      <DialogContent className="sm:max-w-md p-6 overflow-hidden">
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-full p-2 hover:bg-muted transition-colors z-10"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-4">
          {[1, 2, 3, 4].map((s) => (
            <motion.div
              key={s}
              animate={{
                width: s === step ? 24 : s < step ? 12 : 8,
                backgroundColor: s <= step ? "hsl(var(--primary))" : "hsl(var(--muted))",
              }}
              className="h-2 rounded-full"
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
