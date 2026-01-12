import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronRight, ChevronLeft, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import confetti from "canvas-confetti";
import { useQueryClient } from "@tanstack/react-query";
import { useIconLibrary } from "@/hooks/useIconLibrary";

interface GeneratedQuestion {
  question_text: string;
  correct_answer: string;
  incorrect_answers: string[];
  difficulty?: string;
  icon_slug?: string;
}

interface AddRoundToCollectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionId: string;
  roundNumber: number;
  onRoundCreated?: () => void;
}

const QUESTION_COUNTS = [5, 10, 15, 20];

const COVER_GRADIENTS = [
  "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)",
  "linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)",
  "linear-gradient(135deg, #F97316 0%, #EF4444 100%)",
  "linear-gradient(135deg, #10B981 0%, #34D399 100%)",
  "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)",
  "linear-gradient(135deg, #F59E0B 0%, #F97316 100%)",
];

const POPULAR_TOPICS = [
  { categoryId: "movies", label: "კინო", value: "კინო და ფილმები" },
  { categoryId: "sports", label: "სპორტი", value: "სპორტი და ფეხბურთი" },
  { categoryId: "music", label: "მუსიკა", value: "მუსიკა და მომღერლები" },
  { categoryId: "geography", label: "გეოგრაფია", value: "გეოგრაფია და ქვეყნები" },
  { categoryId: "world_history", label: "ისტორია", value: "ისტორია" },
  { categoryId: "science", label: "მეცნიერება", value: "მეცნიერება და ტექნოლოგია" },
];

export function AddRoundToCollectionModal({ 
  open, 
  onOpenChange, 
  collectionId, 
  roundNumber,
  onRoundCreated 
}: AddRoundToCollectionModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getIconForCategory, isLoaded: iconsLoaded } = useIconLibrary();
  
  const [step, setStep] = useState(1);
  const [subject, setSubject] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [answerFormat, setAnswerFormat] = useState<"4_answers" | "true_false">("4_answers");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [title, setTitle] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [selectedGradient, setSelectedGradient] = useState(COVER_GRADIENTS[0]);

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
    setTitle(`რაუნდი ${roundNumber}`);
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

      setQuestions(generatedQuestions);
      setTitle(data?.suggestedTitle || `რაუნდი ${roundNumber}: ${subject}`);
      
      // Auto-save after generation
      setTimeout(() => saveRound(generatedQuestions, data?.suggestedTitle), 300);
    } catch (error) {
      clearInterval(progressInterval);
      console.error("Error generating quiz:", error);
      toast({
        title: "შეცდომა 😕",
        description: error instanceof Error ? error.message : "კითხვების გენერაცია ვერ მოხერხდა",
        variant: "destructive",
      });
      setIsGenerating(false);
    }
  };

  const saveRound = async (generatedQuestions: GeneratedQuestion[], suggestedTitle?: string) => {
    if (!user) {
      toast({
        title: "შესვლა საჭიროა",
        description: "გთხოვთ შეხვიდეთ თქვენს ანგარიშში",
        variant: "destructive",
      });
      setIsGenerating(false);
      return;
    }

    setIsPosting(true);
    try {
      const iconSlug = generatedQuestions[0]?.icon_slug || null;
      const finalTitle = suggestedTitle || `რაუნდი ${roundNumber}: ${subject}`;

      const { error } = await supabase.from("user_quiz_posts").insert([{
        user_id: user.id,
        title: finalTitle,
        subject,
        cover_gradient: selectedGradient,
        question_count: generatedQuestions.length,
        answer_format: answerFormat,
        questions: JSON.parse(JSON.stringify(generatedQuestions)),
        icon_slug: iconSlug,
        collection_id: collectionId,
        round_number: roundNumber,
        is_public: true,
      }]);

      if (error) throw error;

      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.5 }
      });

      toast({
        title: "წარმატება! 🎉",
        description: `რაუნდი ${roundNumber} დაემატა!`,
      });

      // Invalidate collection quizzes query
      queryClient.invalidateQueries({ queryKey: ['collection-quizzes', collectionId] });
      
      handleClose();
      onRoundCreated?.();
    } catch (error) {
      console.error("Error saving round:", error);
      toast({
        title: "შეცდომა",
        description: "რაუნდის შენახვა ვერ მოხერხდა",
        variant: "destructive",
      });
    } finally {
      setIsPosting(false);
      setIsGenerating(false);
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
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-1">რაუნდი {roundNumber} ✨</h3>
              <p className="text-sm text-muted-foreground">რა თემაზე გსურს კითხვები?</p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {POPULAR_TOPICS.map((topic) => {
                const iconUrl = getIconForCategory(topic.categoryId);
                return (
                  <button
                    key={topic.value}
                    onClick={() => setSubject(topic.value)}
                    className={`p-3 rounded-xl border-2 transition-all text-center ${
                      subject === topic.value
                        ? "border-primary bg-primary/10 scale-105"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    {iconUrl ? (
                      <img src={iconUrl} alt={topic.label} className="w-8 h-8 mx-auto mb-1 object-contain" />
                    ) : (
                      <div className="w-8 h-8 mx-auto mb-1 bg-muted/50 rounded-full animate-pulse" />
                    )}
                    <span className="text-xs font-medium text-foreground">{topic.label}</span>
                  </button>
                );
              })}
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
              <p className="text-sm text-muted-foreground">აირჩიე რაოდენობა</p>
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
              <ChunkyButton onClick={generateQuestions} disabled={isGenerating || isPosting} className="flex-1">
                {isGenerating || isPosting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {isPosting ? "ინახება..." : `${Math.round(generationProgress)}%`}
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

      default:
        return null;
    }
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
            <div className="flex items-center justify-between px-4 py-3">
              <button 
                onClick={handleClose} 
                className="p-2 -ml-2 hover:bg-muted rounded-xl transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-foreground" />
              </button>
              
              {/* Progress dots */}
              <div className="flex items-center gap-1.5">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className={`h-2 rounded-full transition-all ${
                      s === step ? "w-6 bg-primary" : s < step ? "w-2 bg-primary/50" : "w-2 bg-muted"
                    }`}
                  />
                ))}
              </div>
              
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 rounded-full">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-primary">AI</span>
              </div>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="h-full overflow-y-auto pt-[60px] pb-6 safe-top">
            <div className="p-5">
              <AnimatePresence mode="wait">
                {renderStep()}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
