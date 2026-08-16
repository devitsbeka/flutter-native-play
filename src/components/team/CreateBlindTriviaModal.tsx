import { useState, useEffect, useCallback, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Sparkles, ChevronRight, Check, Loader2, RefreshCw, Globe, Lock, CheckCircle, Plus } from "lucide-react";
import triviaBuzzer from "@/assets/trivia-buzzer.png";
import pencilIcon from "@/assets/classic-yellow-pencil.png";
import lockIcon from "@/assets/lock-icon.png";
import bullseyeIcon from "@/assets/bullseye.png";
import checkmarkIcon from "@/assets/checkmark.png";
import { Input } from "@/components/ui/input";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import confetti from "canvas-confetti";
import { GameStyleQuestionEditor, convertToEditorQuestions, EditorQuestion, convertToGeneratedQuestions } from "@/components/social/GameStyleQuestionEditor";
import { useTriviaDrafts } from "@/hooks/useTriviaDrafts";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface GeneratedQuestion {
  question_text: string;
  correct_answer: string;
  incorrect_answers: string[];
  difficulty?: string;
  icon_slug?: string;
}

interface CreateBlindTriviaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTriviaReady: (questions: GeneratedQuestion[], title: string, subject: string) => void;
  resumeDraftId?: string | null;
  onDraftResumed?: () => void;
  onSwitchToCollection?: (firstRoundSubject: string) => void;
}

type DifficultyLevel = "mixed" | "easy" | "medium" | "hard";
type CreatorMode = "edit" | "play" | null;

const DIFFICULTY_KEYS: { value: DifficultyLevel; emoji: string; labelKey: string; descKey: string }[] = [
  { value: "mixed", emoji: "🎲", labelKey: "extra.diffMixed", descKey: "extra.diffMixedDesc" },
  { value: "easy", emoji: "🟢", labelKey: "extra.diffEasy", descKey: "extra.diffEasyDesc" },
  { value: "medium", emoji: "🟡", labelKey: "extra.diffMedium", descKey: "extra.diffMediumDesc" },
  { value: "hard", emoji: "🔴", labelKey: "extra.diffHard", descKey: "extra.diffHardDesc" },
];

const QUESTION_COUNTS = [5, 10, 15];

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
  { labelKey: "Minecraft", icon_slug: "cube" },
  { labelKey: "extra.topicSpace", icon_slug: "planet", isTranslationKey: true },
  { labelKey: "extra.topicGeorgianHistory", icon_slug: "flag", isTranslationKey: true },
  { labelKey: "extra.topicGeorgianFood", icon_slug: "food", isTranslationKey: true },
  { labelKey: "extra.topicAnimalWorld", icon_slug: "paw", isTranslationKey: true },
];

interface TopicSuggestion {
  label: string;
  value: string;
  icon_url: string | null;
  icon_slug: string;
}

export function CreateBlindTriviaModal({ open, onOpenChange, onTriviaReady, resumeDraftId, onDraftResumed, onSwitchToCollection }: CreateBlindTriviaModalProps) {
  const { toast: toastHook } = useToast();
  const { t } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { saveDraft, loadDraft, deleteDraft } = useTriviaDrafts();
  
  const [step, setStep] = useState(1);
  const [creatorMode, setCreatorMode] = useState<CreatorMode>(null);
  const [subject, setSubject] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [answerFormat, setAnswerFormat] = useState<"4_answers" | "true_false">("4_answers");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("mixed");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [title, setTitle] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  
  // Editor state
  const [editorQuestions, setEditorQuestions] = useState<EditorQuestion[]>([]);
  
  // Topic suggestions state
  const [topicSuggestions, setTopicSuggestions] = useState<TopicSuggestion[]>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  
  // Draft state
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const isClosingRef = useRef(false);

  const fetchTopicSuggestions = useCallback(async () => {
    setIsLoadingTopics(true);
    
    const shuffled = [...TRIVIA_TOPIC_POOL].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 4);
    
    const iconSlugs = [...new Set(selected.map(tp => tp.icon_slug))];
    
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
  }, []);

  // Load draft if resumeDraftId is provided
  useEffect(() => {
    if (open && resumeDraftId) {
      loadDraft(resumeDraftId).then(draft => {
        if (draft) {
          setCurrentDraftId(draft.id);
          setTitle(draft.title || "");
          
          // Convert stored questions to editor format
          if (draft.questions && Array.isArray(draft.questions) && draft.questions.length > 0) {
            const converted = convertToEditorQuestions(draft.questions);
            setEditorQuestions(converted);
            setCreatorMode("edit"); // Drafts always go to edit mode
            setStep(5); // Go directly to editor
          }
          
          toast.success(t("extra.cbtDraftLoaded"));
          onDraftResumed?.();
        }
      });
    }
  }, [open, resumeDraftId, loadDraft, onDraftResumed]);

  useEffect(() => {
    if (open && !resumeDraftId) {
      resetForm();
      fetchTopicSuggestions();
    }
  }, [open, resumeDraftId, fetchTopicSuggestions]);

  const resetForm = () => {
    setStep(1);
    setCreatorMode(null);
    setSubject("");
    setQuestionCount(10);
    setDifficulty("mixed");
    setTitle("");
    setGenerationProgress(0);
    setEditorQuestions([]);
    setIsPublic(true);
    setCurrentDraftId(null);
    isClosingRef.current = false;
  };

  const handleModeSelect = (mode: CreatorMode) => {
    setCreatorMode(mode);
    setStep(2);
  };

  const handleSaveAndStartGame = async () => {
    if (!user) {
      toast.error(t("extra.cbtAuthRequired"));
      return;
    }

    // Delete draft if it exists
    if (currentDraftId) {
      try {
        await supabase.from("trivia_drafts").delete().eq("id", currentDraftId);
        queryClient.invalidateQueries({ queryKey: ["trivia-drafts"] });
      } catch (error) {
        console.error("Failed to delete draft:", error);
      }
    }

    // Convert questions and save as private
    const questions = convertToGeneratedQuestions(editorQuestions);
    isClosingRef.current = true;

    // Save to database as private (play mode)
    await onTriviaReady(questions, title, subject);

    resetForm();
    onOpenChange(false);
  };

  const handleClose = async () => {
    // Auto-save draft if there's content in editor (step 5) and in edit mode
    const hasContent = editorQuestions.some(q => q.question.trim().length > 0);
    
    if (user && hasContent && step === 5 && creatorMode === "edit" && !isClosingRef.current) {
      isClosingRef.current = true;
      try {
        // Convert editor questions to storage format
        const questionsData = editorQuestions.map(q => ({
          question_text: q.question,
          correct_answer: q.answers.find(a => a.isCorrect)?.text || "",
          incorrect_answers: q.answers.filter(a => !a.isCorrect).map(a => a.text),
          icon_slug: q.iconSlug,
        }));
        
        const savedDraft = await saveDraft({
          draftId: currentDraftId || undefined,
          title: title || subject || null,
          questions: questionsData,
        });
        
        if (savedDraft) {
          setCurrentDraftId(savedDraft.id);
          queryClient.invalidateQueries({ queryKey: ["trivia-drafts"] });
          toast.success(t("extra.cbtDraftAutoSaved"));
        }
      } catch (error) {
        console.error("Auto-save failed:", error);
      }
    }
    
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
        body: { subject, questionCount, answerFormat, difficulty },
      });

      clearInterval(progressInterval);
      setGenerationProgress(100);

      if (error) throw error;
      
      const generatedQuestions = data?.questions || [];
      if (!generatedQuestions.length) {
        throw new Error(t("extra.cbtGenerationFailed"));
      }

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Convert to editor format
      const converted = convertToEditorQuestions(generatedQuestions);
      setEditorQuestions(converted);
      setTitle(data?.suggestedTitle || `${subject} ${t("extra.cbtTriviaSuffix")}`);
      
      setTimeout(() => setStep(5), 300);
    } catch (error) {
      clearInterval(progressInterval);
      console.error("Error generating quiz:", error);
      toastHook({
        title: t("extra.cbtErrorToastTitle"),
        description: error instanceof Error ? error.message : t("extra.cbtErrorToastDesc"),
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartGame = async () => {
    // Delete draft if it exists (trivia is being used)
    if (currentDraftId) {
      try {
        await supabase.from("trivia_drafts").delete().eq("id", currentDraftId);
        queryClient.invalidateQueries({ queryKey: ["trivia-drafts"] });
      } catch (error) {
        console.error("Failed to delete draft:", error);
      }
    }
    
    // Convert back to GeneratedQuestion format
    const questions = convertToGeneratedQuestions(editorQuestions);
    isClosingRef.current = true; // Prevent auto-save on close
    
    // AWAIT the async callback to ensure database save completes before closing
    await onTriviaReady(questions, title, subject);
    
    // Only reset and close AFTER save is complete
    resetForm();
    onOpenChange(false);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <div className="inline-flex items-center justify-center mb-4">
                <img src={triviaBuzzer} alt="Create Trivia" className="w-16 h-16 object-contain" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">{t("extra.cbtCreateTitle")}</h3>
              <p className="text-white/70">{t("extra.cbtCreateSubtitle")}</p>
            </div>

            <div className="flex flex-col gap-3">
              {/* Edit Mode */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleModeSelect("edit")}
                className="p-4 rounded-2xl bg-white/15 border border-white/20 hover:bg-white/25 transition-all text-left flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  <img src={pencilIcon} alt="" className="w-10 h-10 object-contain" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">{t("extra.cbtOpenMode")}</h4>
                  <p className="text-white/60 text-xs mt-1">{t("extra.cbtOpenModeDesc")}</p>
                </div>
              </motion.button>

              {/* Play Mode */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleModeSelect("play")}
                className="p-4 rounded-2xl bg-white/15 border border-white/20 hover:bg-white/25 transition-all text-left flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  <img src={lockIcon} alt="" className="w-10 h-10 object-contain" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">{t("extra.cbtClosedMode")}</h4>
                  <p className="text-white/60 text-xs mt-1">{t("extra.cbtClosedModeDesc")}</p>
                </div>
              </motion.button>
            </div>
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
              <div className="inline-flex items-center justify-center mb-4">
                <img src={triviaBuzzer} alt="Create Trivia" className="w-16 h-16 object-contain" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">{t("extra.createTriviaTitle2")}</h3>
              <p className="text-white/70">{t("extra.triviaQuickCreate")}</p>
            </div>

            <div className="space-y-4">
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t("extra.topicPlaceholder2")}
                className="w-full text-base h-14 px-5 rounded-2xl border-0 bg-white/95 text-slate-800 placeholder:text-slate-400 shadow-lg"
              />
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/80">💡 {t("extra.ideasLabel2")}</span>
                  <button
                    onClick={fetchTopicSuggestions}
                    disabled={isLoadingTopics}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 text-white/80 text-sm hover:bg-white/30 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTopics ? 'animate-spin' : ''}`} />
                    {t("extra.otherIdeas2")}
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-2 justify-center">
                  {isLoadingTopics ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-9 w-24 bg-white/20 rounded-full animate-pulse" />
                    ))
                  ) : (
                    topicSuggestions.map((topic, idx) => (
                      <motion.button
                        key={topic.value}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.03 }}
                        onClick={() => setSubject(topic.value)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                          subject === topic.value
                            ? "bg-white text-[#5B21B6] shadow-lg"
                            : "bg-white/20 text-white hover:bg-white/30"
                        }`}
                      >
                        {topic.icon_url ? (
                          <img src={topic.icon_url} alt={topic.label} className="w-4 h-4 object-contain" />
                        ) : (
                          <div className="w-4 h-4 bg-white/30 rounded-full" />
                        )}
                        <span>{topic.label}</span>
                      </motion.button>
                    ))
                  )}
                </div>

              </div>
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
              <h3 className="text-2xl font-bold text-white mb-2">{t("extra.howManyQuestions2")} 🎯</h3>
              <p className="text-white/70">{t("extra.chooseQuestionCount2")}</p>
            </div>

            {/* Question Count */}
            <div className="flex justify-center gap-3">
              {QUESTION_COUNTS.map((count) => (
                <motion.button
                  key={count}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setQuestionCount(count)}
                  className={`w-20 h-20 rounded-2xl font-bold text-2xl transition-all ${
                    questionCount === count
                      ? "bg-white text-[#5B21B6] shadow-lg"
                      : "bg-white/20 text-white hover:bg-white/30"
                  }`}
                >
                  {count}
                </motion.button>
              ))}
            </div>

            {/* Answer Format */}
            <div className="grid grid-cols-2 gap-3">
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => setAnswerFormat("4_answers")}
                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                  answerFormat === "4_answers"
                    ? "border-white bg-white/20"
                    : "border-white/30 bg-white/10"
                }`}
              >
                <img src={bullseyeIcon} alt="" className="w-10 h-10 object-contain" />
                <span className="text-white font-medium text-sm">{t("extra.fourOptions2")}</span>
              </motion.button>
              
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => setAnswerFormat("true_false")}
                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                  answerFormat === "true_false"
                    ? "border-white bg-white/20"
                    : "border-white/30 bg-white/10"
                }`}
              >
                <img src={checkmarkIcon} alt="" className="w-10 h-10 object-contain" />
                <span className="text-white font-medium text-sm">{t("extra.trueFalseOption2")}</span>
              </motion.button>
            </div>

            {/* Add round button - switch to collection mode */}
            {onSwitchToCollection && !isGenerating && (
              <button
                onClick={() => {
                  onOpenChange(false);
                  onSwitchToCollection(subject);
                }}
                className="w-full py-3 rounded-xl bg-white/20 text-white font-medium flex items-center justify-center gap-2 hover:bg-white/30 transition-colors"
              >
                <Plus className="w-5 h-5" />
                {t("extra.addRoundBtn2")}
              </button>
            )}

            {/* AI info text */}
            {!isGenerating && (
              <p className="text-sm text-white/80 text-center">
                ✨ {t("extra.aiWillGenerate2", { count: questionCount })}
              </p>
            )}

            {isGenerating && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-2"
              >
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-white"
                    initial={{ width: 0 }}
                    animate={{ width: `${generationProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-sm text-center text-white/80 animate-pulse">
                  ✨ {t("extra.aiCreatingQuestions")}
                </p>
              </motion.div>
            )}
          </motion.div>
        );

      default:
        return null;
    }
  };

  const renderBottomCTA = () => {
    // Step 1 - Mode selection (no CTA, handled by buttons)
    if (step === 1) {
      return null;
    }

    // Step 2 - Topic input
    if (step === 2) {
      return (
        <div className="flex gap-3">
          <button 
            onClick={() => setStep(1)} 
            className="flex-1 h-14 rounded-2xl bg-white/20 text-white font-medium flex items-center justify-center gap-2 hover:bg-white/30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {t("extra.cbtBackBtn")}
          </button>
          <ChunkyButton
            variant="whitePurple"
            onClick={() => setStep(3)}
            disabled={!subject.trim()}
            className="flex-[2]"
          >
            {t("extra.cbtNextBtn")}
            <ChevronRight className="w-5 h-5 ml-2" />
          </ChunkyButton>
        </div>
      );
    }

    // Step 3 - Count/difficulty/format
    if (step === 3) {
      return (
        <div className="flex gap-3">
          <button 
            onClick={() => setStep(2)} 
            className="flex-1 h-14 rounded-2xl bg-white/20 text-white font-medium flex items-center justify-center gap-2 hover:bg-white/30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {t("extra.cbtBackBtn")}
          </button>
          <ChunkyButton 
            variant="whitePurple"
            onClick={generateQuestions} 
            disabled={isGenerating} 
            className="flex-[2]"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                {Math.round(generationProgress)}%
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                {t("extra.cbtCreateBtn")}
              </>
            )}
          </ChunkyButton>
        </div>
      );
    }

    return null;
  };

  const totalSteps = 3;
  const progressDots = Array.from({ length: totalSteps }, (_, i) => i + 1);

  if (!open) return null;

  // Step 5: Show Editor (conditional based on creatorMode)
  if (step === 5) {
    // Play mode - show summary without revealing answers
    if (creatorMode === "play") {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50"
          style={{ background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 50%, #4C1D95 100%)" }}
        >
          <div className="fixed top-0 left-0 right-0 z-50 safe-top">
            <div className="max-w-[700px] md:max-w-[600px] mx-auto w-full flex items-center justify-between px-4 py-3">
              <button 
                onClick={() => setStep(3)} 
                className="p-2 -ml-2 rounded-xl hover:bg-white/10 transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 rounded-full">
                <Sparkles className="w-4 h-4 text-white" />
                <span className="text-xs font-semibold text-white">AI</span>
              </div>
            </div>
          </div>

          <div className="h-full overflow-y-auto pt-[80px] pb-40">
            <div className="max-w-[700px] md:max-w-[600px] mx-auto w-full p-5">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center space-y-6"
              >
                <div className="flex justify-center">
                  <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle className="w-10 h-10 text-emerald-400" />
                  </div>
                </div>
                
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {t("extra.cbtQuestionsReady", { count: editorQuestions.length })}
                  </h3>
                  <p className="text-white/70">
                    {t("extra.cbtAnswersHidden")}
                  </p>
                </div>

                <div className="bg-white/10 rounded-2xl p-4 space-y-3">
                  <label className="text-sm text-white/70 block text-left">{t("extra.cbtTitleLabel")}</label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t("extra.cbtTitlePlaceholder")}
                    className="w-full text-base h-14 px-5 rounded-2xl border-0 bg-white/95 text-slate-800 placeholder:text-slate-400 shadow-lg"
                  />
                </div>

                <div className="pt-4">
                  <ChunkyButton
                    variant="success"
                    onClick={handleSaveAndStartGame}
                    className="w-full"
                  >
                    {t("extra.cbtSaveAndStart")}
                  </ChunkyButton>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      );
    }

    // Edit mode - show full editor
    return (
      <GameStyleQuestionEditor
        questions={editorQuestions}
        onQuestionsChange={setEditorQuestions}
        title={title}
        onTitleChange={setTitle}
        onSave={handleStartGame}
        onBack={() => setStep(3)}
        saveButtonText={t("extra.cbtEditorReady")}
        showTitleEditor={true}
        subject={subject}
        answerFormat={answerFormat}
        isPublic={isPublic}
        onPublicChange={setIsPublic}
      />
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50"
          style={{ background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 50%, #4C1D95 100%)" }}
        >
          <div className="fixed top-0 left-0 right-0 z-50 safe-top">
            <div className="max-w-[700px] md:max-w-[600px] mx-auto w-full flex items-center justify-between px-4 py-3">
              <button 
                onClick={handleClose} 
                className="p-2 -ml-2 rounded-xl hover:bg-white/10 transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              
              <div className="flex items-center gap-1.5">
                {progressDots.map((dot) => (
                  <div
                    key={dot}
                    className={`h-2 rounded-full transition-all ${
                      dot === step
                        ? "w-6 bg-white"
                        : dot < step
                        ? "w-2 bg-white/50"
                        : "w-2 bg-white/20"
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

          <div className="h-full overflow-y-auto pt-[60px] pb-32">
            <div className="max-w-[700px] md:max-w-[600px] mx-auto w-full p-5">
              <AnimatePresence mode="wait">
                {renderStep()}
              </AnimatePresence>
            </div>
          </div>

          {/* Fixed bottom CTA */}
          <div className="fixed bottom-0 left-0 right-0 safe-bottom" style={{ background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 50%, #4C1D95 100%)" }}>
            <div className="max-w-[700px] md:max-w-[600px] mx-auto w-full p-4 pb-6">
              {renderBottomCTA()}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
