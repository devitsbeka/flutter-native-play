import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, ChevronRight, ChevronLeft, Check, Loader2, Edit3, RefreshCw, Globe, Lock } from "lucide-react";
import triviaBuzzer from "@/assets/trivia-buzzer.png";
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
import { removeDuplicatesFromBatch } from "@/utils/duplicateDetection";

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
// Smooth oval gradient backgrounds with blob overlays
const COVER_GRADIENTS = [
  "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)",
  "linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)",
  "linear-gradient(135deg, #F97316 0%, #EF4444 100%)",
  "linear-gradient(135deg, #10B981 0%, #34D399 100%)",
  "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)",
  "linear-gradient(135deg, #F59E0B 0%, #F97316 100%)",
  // New 10 oval/blob style backgrounds
  "radial-gradient(ellipse 120% 80% at 20% 30%, rgba(139,92,246,0.8) 0%, transparent 50%), radial-gradient(ellipse 100% 120% at 80% 70%, rgba(236,72,153,0.7) 0%, transparent 50%), linear-gradient(135deg, #4C1D95 0%, #831843 100%)",
  "radial-gradient(ellipse 80% 100% at 70% 20%, rgba(59,130,246,0.8) 0%, transparent 45%), radial-gradient(ellipse 100% 80% at 20% 80%, rgba(6,182,212,0.7) 0%, transparent 45%), linear-gradient(150deg, #1E3A8A 0%, #0E7490 100%)",
  "radial-gradient(ellipse 90% 110% at 30% 60%, rgba(16,185,129,0.8) 0%, transparent 50%), radial-gradient(ellipse 120% 90% at 75% 25%, rgba(52,211,153,0.6) 0%, transparent 50%), linear-gradient(160deg, #064E3B 0%, #047857 100%)",
  "radial-gradient(ellipse 100% 80% at 60% 30%, rgba(249,115,22,0.75) 0%, transparent 45%), radial-gradient(ellipse 80% 100% at 25% 75%, rgba(239,68,68,0.7) 0%, transparent 45%), linear-gradient(145deg, #7C2D12 0%, #991B1B 100%)",
  "radial-gradient(ellipse 110% 90% at 40% 70%, rgba(99,102,241,0.8) 0%, transparent 50%), radial-gradient(ellipse 90% 100% at 80% 20%, rgba(168,85,247,0.7) 0%, transparent 50%), linear-gradient(155deg, #312E81 0%, #581C87 100%)",
  "radial-gradient(ellipse 85% 115% at 25% 40%, rgba(14,165,233,0.8) 0%, transparent 50%), radial-gradient(ellipse 115% 85% at 70% 75%, rgba(34,211,238,0.7) 0%, transparent 50%), linear-gradient(140deg, #0C4A6E 0%, #155E75 100%)",
  "radial-gradient(ellipse 100% 100% at 50% 30%, rgba(217,70,239,0.8) 0%, transparent 50%), radial-gradient(ellipse 80% 120% at 30% 80%, rgba(244,114,182,0.7) 0%, transparent 50%), linear-gradient(135deg, #701A75 0%, #9D174D 100%)",
  "radial-gradient(ellipse 95% 85% at 65% 50%, rgba(245,158,11,0.8) 0%, transparent 45%), radial-gradient(ellipse 85% 95% at 25% 35%, rgba(234,179,8,0.7) 0%, transparent 45%), linear-gradient(150deg, #78350F 0%, #A16207 100%)",
  "radial-gradient(ellipse 90% 100% at 35% 25%, rgba(168,162,158,0.6) 0%, transparent 50%), radial-gradient(ellipse 100% 90% at 70% 70%, rgba(120,113,108,0.5) 0%, transparent 50%), linear-gradient(145deg, #292524 0%, #44403C 100%)",
  "radial-gradient(ellipse 105% 95% at 45% 65%, rgba(251,113,133,0.8) 0%, transparent 50%), radial-gradient(ellipse 95% 105% at 70% 25%, rgba(253,164,175,0.6) 0%, transparent 50%), linear-gradient(160deg, #881337 0%, #BE185D 100%)",
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
  const [isPublic, setIsPublic] = useState(true);

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
    setIsPublic(true);
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

      // Client-side duplicate filtering as safety net
      const uniqueQuestions = removeDuplicatesFromBatch(generatedQuestions as GeneratedQuestion[]);
      const duplicatesRemoved = generatedQuestions.length - uniqueQuestions.length;
      
      if (duplicatesRemoved > 0) {
        console.log(`Removed ${duplicatesRemoved} duplicate questions on client side`);
      }

      // Celebrate!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      setQuestions(uniqueQuestions);
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
        is_public: isPublic,
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
              <div className="inline-flex items-center justify-center w-16 h-16 mb-4">
                <img src={triviaBuzzer} alt="Create Trivia" className="w-16 h-16 object-contain" />
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
            className="space-y-3 flex flex-col max-h-[calc(100vh-120px)]"
          >
            <div className="text-center flex-shrink-0">
              <h3 className="text-lg font-bold text-foreground">მზადაა! 🎉</h3>
              <p className="text-xs text-muted-foreground">{questions.length} კითხვა შეიქმნა</p>
            </div>

            {/* Preview card */}
            <div 
              className="p-3 rounded-2xl text-white flex-shrink-0"
              style={{ background: selectedGradient }}
            >
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Trivia-ს სახელი"
                className="bg-white/20 border-white/30 text-white placeholder:text-white/70 text-base font-bold h-10 rounded-xl"
              />
            </div>

            {/* Gradient picker */}
            <div className="flex justify-center gap-1.5 flex-wrap flex-shrink-0">
              {COVER_GRADIENTS.map((gradient, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedGradient(gradient)}
                  className={`w-7 h-7 rounded-lg transition-all ${
                    selectedGradient === gradient ? "ring-2 ring-primary ring-offset-1" : ""
                  }`}
                  style={{ background: gradient }}
                />
              ))}
            </div>

            {/* Visibility Toggle + Description row */}
            <div className="flex gap-2 items-start flex-shrink-0">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="მოკლე აღწერა (არასავალდებულო)"
                rows={2}
                className="rounded-xl resize-none text-sm flex-1"
              />
              <button
                onClick={() => setIsPublic(!isPublic)}
                className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl border-2 transition-all min-w-[70px] ${
                  isPublic 
                    ? 'border-green-500 bg-green-500/10 text-green-600' 
                    : 'border-muted bg-muted/50 text-muted-foreground'
                }`}
              >
                {isPublic ? (
                  <>
                    <Globe className="w-5 h-5" />
                    <span className="text-[10px] font-medium">საჯარო</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    <span className="text-[10px] font-medium">პირადი</span>
                  </>
                )}
              </button>
            </div>

            {/* Questions preview with icon picker and edit */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2 p-2 bg-muted/30 rounded-xl">
              {questions.map((q, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-2.5 bg-background rounded-xl border border-border flex gap-2 items-start"
                >
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground line-clamp-2">
                      {q.question_text}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-green-600">✓ {q.correct_answer}</span>
                      {q.difficulty && (
                        <span className={`text-xs ${getDifficultyColor(q.difficulty)}`}>
                          • {getDifficultyLabel(q.difficulty)}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 flex-shrink-0"
                    onClick={() => {
                      const newQuestion = prompt("კითხვა:", q.question_text);
                      if (newQuestion !== null) {
                        const newAnswer = prompt("სწორი პასუხი:", q.correct_answer);
                        if (newAnswer !== null) {
                          setQuestions(prev => prev.map((question, idx) => 
                            idx === i ? { ...question, question_text: newQuestion, correct_answer: newAnswer } : question
                          ));
                        }
                      }
                    }}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </Button>
                          <QuestionIconPicker
                            selectedSlug={q.icon_slug || null}
                            onSelect={(slug) => {
                              setQuestions(prev => prev.map((question, idx) => 
                                idx === i ? { ...question, icon_slug: slug || undefined } : question
                              ));
                            }}
                            questionText={q.question_text}
                          />
                </motion.div>
              ))}
            </div>

            <div className="flex gap-3 flex-shrink-0 pt-1">
              <Button 
                variant="outline" 
                onClick={() => {
                  setStep(3);
                  setQuestions([]);
                }} 
                className="flex-1 h-11 rounded-xl"
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
