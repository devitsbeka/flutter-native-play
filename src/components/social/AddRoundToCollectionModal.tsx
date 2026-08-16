import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronRight, ChevronLeft, Check, Loader2, RefreshCw } from "lucide-react";
import bullseyeIcon from "@/assets/bullseye.png";
import checkmarkIcon from "@/assets/checkmark.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import confetti from "canvas-confetti";
import { useQueryClient } from "@tanstack/react-query";

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

// Creative topic pool - specific, fun topics that inspire users
const TRIVIA_TOPIC_POOL = [
  { labelKey: "Friends", icon_slug: "television" },
  { labelKey: "Star Wars", icon_slug: "rocket" },
  { labelKey: "Marvel", icon_slug: "superhero" },
  { labelKey: "Harry Potter", icon_slug: "magic-wand" },
  { labelKey: "Game of Thrones", icon_slug: "crown" },
  { labelKey: "Breaking Bad", icon_slug: "chemistry" },
  { labelKey: "extra.topicNetflixShows", icon_slug: "film-reel", isTranslationKey: true },
  { labelKey: "extra.topicDisneyMovies", icon_slug: "castle", isTranslationKey: true },
  { labelKey: "extra.topicNBALegends", icon_slug: "basketball", isTranslationKey: true },
  { labelKey: "extra.topicChampionsLeague", icon_slug: "trophy", isTranslationKey: true },
  { labelKey: "Formula 1", icon_slug: "racing-car" },
  { labelKey: "K-Pop", icon_slug: "music-note" },
  { labelKey: "Taylor Swift", icon_slug: "microphone" },
  { labelKey: "BTS", icon_slug: "star" },
  { labelKey: "extra.topicMemes", icon_slug: "smiley", isTranslationKey: true },
  { labelKey: "extra.arcTopicTikTokTrends", icon_slug: "smartphone", isTranslationKey: true },
  { labelKey: "Minecraft", icon_slug: "cube" },
  { labelKey: "extra.inspirationalAnime", icon_slug: "ninja", isTranslationKey: true },
  { labelKey: "extra.inspirationalSpace", icon_slug: "planet", isTranslationKey: true },
  { labelKey: "extra.topicPsychology", icon_slug: "brain", isTranslationKey: true },
  { labelKey: "extra.topicGeorgianHistory", icon_slug: "flag", isTranslationKey: true },
  { labelKey: "extra.topicGeorgianFood", icon_slug: "food", isTranslationKey: true },
  { labelKey: "extra.topicAnimals", icon_slug: "paw", isTranslationKey: true },
  { labelKey: "extra.arcTopicSuperCars", icon_slug: "sports-car", isTranslationKey: true },
];

interface TopicSuggestion {
  label: string;
  value: string;
  icon_url: string | null;
  icon_slug: string;
}

export function AddRoundToCollectionModal({ 
  open, 
  onOpenChange, 
  collectionId, 
  roundNumber,
  onRoundCreated 
}: AddRoundToCollectionModalProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
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
  
  // Topic suggestions state
  const [topicSuggestions, setTopicSuggestions] = useState<TopicSuggestion[]>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);

  const fetchTopicSuggestions = useCallback(async () => {
    setIsLoadingTopics(true);
    
    // Shuffle and pick 6 random topics
    const shuffled = [...TRIVIA_TOPIC_POOL].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 6);
    
    // Fetch icons from database
    const iconSlugs = [...new Set(selected.map(t => t.icon_slug))];
    
    const { data: icons } = await supabase
      .from("icon_library")
      .select("slug, icon_url")
      .in("slug", iconSlugs);
    
    const iconMap = new Map(icons?.map(i => [i.slug, i.icon_url]) || []);

    setTopicSuggestions(
      selected.map(topic => {
        const label = topic.isTranslationKey ? t(topic.labelKey) : topic.labelKey;
        return {
          label,
          value: label,
          icon_slug: topic.icon_slug,
          icon_url: iconMap.get(topic.icon_slug) || null
        };
      })
    );

    setIsLoadingTopics(false);
  }, [t]);

  useEffect(() => {
    if (open) {
      resetForm();
      fetchTopicSuggestions();
    }
  }, [open, fetchTopicSuggestions]);

  const resetForm = () => {
    setStep(1);
    setSubject("");
    setQuestionCount(10);
    setAnswerFormat("4_answers");
    setQuestions([]);
    setTitle(t("extra.arcRoundDefaultTitle", { n: roundNumber }));
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
        throw new Error(t("extra.questionsGenFailed"));
      }

      setQuestions(generatedQuestions);
      setTitle(data?.suggestedTitle || t("extra.roundFallbackTitle", { n: roundNumber, subject }));
      
      // Auto-save after generation
      setTimeout(() => saveRound(generatedQuestions, data?.suggestedTitle), 300);
    } catch (error) {
      clearInterval(progressInterval);
      console.error("Error generating quiz:", error);
      toast({
        title: t("extra.errorEmoji"),
        description: error instanceof Error ? error.message : t("extra.editorGenerationFailed"),
        variant: "destructive",
      });
      setIsGenerating(false);
    }
  };

  const saveRound = async (generatedQuestions: GeneratedQuestion[], suggestedTitle?: string) => {
    if (!user) {
      toast({
        title: t("extra.loginRequiredTitle"),
        description: t("extra.loginRequiredDesc"),
        variant: "destructive",
      });
      setIsGenerating(false);
      return;
    }

    setIsPosting(true);
    try {
      const iconSlug = generatedQuestions[0]?.icon_slug || null;
      const finalTitle = suggestedTitle || t("extra.roundFallbackTitle", { n: roundNumber, subject });

      const { error } = await supabase.from("user_quiz_posts").insert([{
        user_id: user.id,
        title: finalTitle,
        subject,
        cover_gradient: selectedGradient,
        question_count: generatedQuestions.length,
        answer_format: answerFormat,
        questions: structuredClone(generatedQuestions) as unknown as Json,
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
        title: t("extra.successRoundTitle"),
        description: t("extra.roundAddedDesc", { n: roundNumber }),
      });

      // Invalidate collection quizzes query
      queryClient.invalidateQueries({ queryKey: ['collection-quizzes', collectionId] });
      
      handleClose();
      onRoundCreated?.();
    } catch (error) {
      console.error("Error saving round:", error);
      toast({
        title: t("common.error"),
        description: t("extra.roundSaveError"),
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
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-1">{t("extra.roundNTitle", { n: roundNumber })}</h3>
              <p className="text-sm text-purple-200">{t("extra.whatTopicQuestion")}</p>
            </div>

            {/* Topic suggestions with refresh */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-purple-200">{t("extra.ideasLabel")}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={fetchTopicSuggestions}
                  disabled={isLoadingTopics}
                  className="h-6 px-2 text-xs text-purple-200 hover:text-white hover:bg-white/10"
                >
                  <RefreshCw className={`w-3 h-3 mr-1 ${isLoadingTopics ? 'animate-spin' : ''}`} />
                  {t("extra.otherTopicsBtn")}
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {isLoadingTopics ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="p-3 rounded-xl border-2 border-white/20">
                      <div className="w-8 h-8 mx-auto mb-1 bg-white/20 rounded-full animate-pulse" />
                      <div className="w-12 h-3 mx-auto bg-white/20 rounded animate-pulse" />
                    </div>
                  ))
                ) : (
                  topicSuggestions.map((topic) => (
                    <button
                      key={topic.value}
                      onClick={() => setSubject(topic.value)}
                      className={`p-3 rounded-xl border-2 transition-all text-center ${
                        subject === topic.value
                          ? "border-white bg-white/20 scale-105"
                          : "border-white/20 hover:border-white/50 hover:bg-white/10"
                      }`}
                    >
                      {topic.icon_url ? (
                        <img src={topic.icon_url} alt={topic.label} className="w-8 h-8 mx-auto mb-1 object-contain" />
                      ) : (
                        <div className="w-8 h-8 mx-auto mb-1 bg-white/20 rounded-full" />
                      )}
                      <span className="text-xs font-medium text-white">{topic.label}</span>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-transparent px-3 text-xs text-purple-200">{t("extra.orWriteLabel")}</span>
              </div>
            </div>

            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t("extra.topicPlaceholder")}
              className="text-center text-lg h-14 rounded-xl bg-white/10 border-white/20 text-white placeholder:text-purple-300"
            />

            <ChunkyButton
              onClick={() => setStep(2)}
              disabled={!subject.trim()}
              className="w-full"
            >
              {t("extra.nextStepBtn")}
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
              <h3 className="text-xl font-bold text-white mb-1">{t("extra.howManyQuestions")}</h3>
              <p className="text-sm text-purple-200">{t("extra.chooseCountLabel")}</p>
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
                      ? "bg-white text-purple-700 shadow-lg shadow-white/30"
                      : "bg-white/20 text-white hover:bg-white/30"
                  }`}
                >
                  {count}
                </motion.button>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-12 rounded-xl bg-white/10 border-white/30 text-white hover:bg-white/20">
                <ChevronLeft className="w-4 h-4 mr-2" />
                {t("extra.backStepBtn")}
              </Button>
              <ChunkyButton onClick={() => setStep(3)} className="flex-1">
                {t("extra.nextStepBtn")}
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
              <h3 className="text-xl font-bold text-white mb-1">{t("extra.formatTitle")}</h3>
              <p className="text-sm text-purple-200">{t("extra.whatFormatQuestions")}</p>
            </div>

            <div className="space-y-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setAnswerFormat("4_answers")}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-4 ${
                  answerFormat === "4_answers"
                    ? "border-white bg-white/20"
                    : "border-white/20 hover:border-white/50"
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center overflow-hidden">
                  <img src={bullseyeIcon} alt="" className="w-10 h-10 object-contain" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-white">{t("extra.fourOptionsLabel")}</div>
                  <div className="text-sm text-purple-200">{t("extra.classicQuizFormat")}</div>
                </div>
                {answerFormat === "4_answers" && (
                  <Check className="w-5 h-5 text-white" />
                )}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setAnswerFormat("true_false")}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-4 ${
                  answerFormat === "true_false"
                    ? "border-white bg-white/20"
                    : "border-white/20 hover:border-white/50"
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center overflow-hidden">
                  <img src={checkmarkIcon} alt="" className="w-10 h-10 object-contain" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-white">{t("extra.trueFalseFormat")}</div>
                  <div className="text-sm text-purple-200">{t("extra.fastTrueFalse")}</div>
                </div>
                {answerFormat === "true_false" && (
                  <Check className="w-5 h-5 text-white" />
                )}
              </motion.button>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1 h-12 rounded-xl bg-white/10 border-white/30 text-white hover:bg-white/20">
                <ChevronLeft className="w-4 h-4 mr-2" />
                {t("extra.backStepBtn")}
              </Button>
              <ChunkyButton onClick={generateQuestions} disabled={isGenerating || isPosting} className="flex-1">
                {isGenerating || isPosting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {isPosting ? t("extra.savingProgressLabel") : `${Math.round(generationProgress)}%`}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    {t("extra.generateBtn2")}
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
          className="fixed inset-0 z-50 bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900"
        >
          {/* Fixed Header */}
          <div className="fixed top-0 left-0 right-0 z-50 bg-purple-900/90 backdrop-blur-md border-b border-white/10 safe-top">
            <div className="max-w-[700px] md:max-w-[520px] mx-auto w-full flex items-center justify-between px-4 py-3">
              <button 
                onClick={handleClose} 
                className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
              
              {/* Progress dots */}
              <div className="flex items-center gap-1.5">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className={`h-2 rounded-full transition-all ${
                      s === step ? "w-6 bg-white" : s < step ? "w-2 bg-white/60" : "w-2 bg-white/30"
                    }`}
                  />
                ))}
              </div>
              
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 rounded-full">
                <Sparkles className="w-4 h-4 text-white" />
                <span className="text-xs font-semibold text-white">AI</span>
              </div>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="h-full overflow-y-auto pt-[60px] pb-6">
            <div className="max-w-[700px] md:max-w-[520px] mx-auto w-full p-5">
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
