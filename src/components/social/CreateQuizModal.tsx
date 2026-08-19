import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { containsBlockedText } from "@/utils/contentFilter";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronRight, ChevronLeft, Check, Loader2, X, RefreshCw, Globe, Lock, Play, Users } from "lucide-react";
import triviaBuzzer from "@/assets/trivia-buzzer.png";
import pencilIcon from "@/assets/classic-yellow-pencil.png";
import lockIcon from "@/assets/lock-icon.png";
import bullseyeIcon from "@/assets/bullseye.png";
import checkmarkIcon from "@/assets/checkmark.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { useBackgroundGeneration } from "@/contexts/BackgroundGenerationContext";
import { useQueryClient } from "@tanstack/react-query";
import confetti from "canvas-confetti";
import { removeDuplicatesFromBatch } from "@/utils/duplicateDetection";
import { GameStyleQuestionEditor, convertToEditorQuestions, convertToGeneratedQuestions, EditorQuestion } from "./GameStyleQuestionEditor";
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
  onSwitchToCollection?: () => void;
  overrideUserId?: string;
}

type DifficultyLevel = "mixed" | "easy" | "medium" | "hard";
type CreatorMode = "edit" | "play" | null;

const DIFFICULTY_KEYS: { value: DifficultyLevel; emoji: string; labelKey: string; descKey: string }[] = [
  { value: "mixed", emoji: "🎲", labelKey: "extra.diffMixed", descKey: "extra.diffMixedDesc" },
  { value: "easy", emoji: "🟢", labelKey: "extra.diffEasy", descKey: "extra.diffEasyDesc" },
  { value: "medium", emoji: "🟡", labelKey: "extra.diffMedium", descKey: "extra.diffMediumDesc" },
  { value: "hard", emoji: "🔴", labelKey: "extra.diffHard", descKey: "extra.diffHardDesc" },
];

const TITLE_SUGGESTION_KEYS = [
  (subject: string, t: (k: string) => string) => `${subject} ${t("extra.cqmTitleMaster")}`,
  (subject: string, t: (k: string) => string) => `${t("extra.cqmTitleHowMuch")} ${subject}${t("extra.cqmTitleAbout")}`,
  (subject: string, t: (k: string) => string) => `${subject} ${t("extra.cqmTitleChampionship")}`,
  (subject: string, t: (k: string) => string) => `${subject} ${t("extra.cqmTitleChallenge")}`,
];

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

interface TopicSuggestion {
  label: string;
  value: string;
  icon_url: string | null;
  icon_slug: string;
}

// Curated trivia-worthy topics with icon slugs
const TRIVIA_TOPIC_POOL = [
  // Entertainment
  { labelKey: "Friends", icon_slug: "television" },
  { labelKey: "Star Wars", icon_slug: "rocket" },
  { labelKey: "Marvel", icon_slug: "superhero" },
  { labelKey: "extra.topicTVShows", icon_slug: "television", isTranslationKey: true },
  { labelKey: "Netflix", icon_slug: "film-reel" },
  { labelKey: "Harry Potter", icon_slug: "magic-wand" },
  { labelKey: "Disney", icon_slug: "castle" },
  { labelKey: "extra.topicHollywood", icon_slug: "cinema", isTranslationKey: true },
  { labelKey: "Game of Thrones", icon_slug: "crown" },
  { labelKey: "Breaking Bad", icon_slug: "chemistry" },
  { labelKey: "The Office", icon_slug: "office" },
  // Sports
  { labelKey: "NBA", icon_slug: "basketball" },
  { labelKey: "extra.topicFootball", icon_slug: "soccer-ball", isTranslationKey: true },
  { labelKey: "extra.topicChampionsLeague", icon_slug: "trophy", isTranslationKey: true },
  { labelKey: "F1", icon_slug: "racing-car" },
  { labelKey: "extra.topicOlympics", icon_slug: "medal", isTranslationKey: true },
  { labelKey: "extra.topicTennis", icon_slug: "tennis", isTranslationKey: true },
  { labelKey: "extra.topicCricket", icon_slug: "cricket", isTranslationKey: true },
  // Music
  { labelKey: "K-Pop", icon_slug: "music-note" },
  { labelKey: "Taylor Swift", icon_slug: "microphone" },
  { labelKey: "extra.topicGeorgianMusic", icon_slug: "guitar", isTranslationKey: true },
  { labelKey: "Hip-Hop", icon_slug: "headphones" },
  { labelKey: "extra.topicNinetiesMusic", icon_slug: "vinyl", isTranslationKey: true },
  { labelKey: "BTS", icon_slug: "star" },
  { labelKey: "Queen", icon_slug: "crown" },
  // Knowledge
  { labelKey: "extra.topicGeography", icon_slug: "globe", isTranslationKey: true },
  { labelKey: "extra.topicHistory", icon_slug: "hourglass", isTranslationKey: true },
  { labelKey: "extra.topicScience", icon_slug: "microscope", isTranslationKey: true },
  { labelKey: "extra.topicAstronomy", icon_slug: "planet", isTranslationKey: true },
  { labelKey: "extra.topicBiology", icon_slug: "dna", isTranslationKey: true },
  { labelKey: "extra.topicMath", icon_slug: "calculator", isTranslationKey: true },
  { labelKey: "extra.topicPhysics", icon_slug: "atom", isTranslationKey: true },
  // Pop Culture & Gaming
  { labelKey: "extra.topicMemes", icon_slug: "smiley", isTranslationKey: true },
  { labelKey: "TikTok", icon_slug: "smartphone" },
  { labelKey: "extra.topicVideoGames", icon_slug: "game-controller", isTranslationKey: true },
  { labelKey: "Anime", icon_slug: "ninja" },
  { labelKey: "extra.topicGeorgia", icon_slug: "flag", isTranslationKey: true },
  { labelKey: "Minecraft", icon_slug: "cube" },
  { labelKey: "FIFA", icon_slug: "soccer-ball" },
  // Food & Lifestyle
  { labelKey: "extra.topicCulinary", icon_slug: "chef-hat", isTranslationKey: true },
  { labelKey: "extra.topicWine", icon_slug: "wine", isTranslationKey: true },
  { labelKey: "extra.topicGeorgianFood", icon_slug: "food", isTranslationKey: true },
  { labelKey: "extra.topicCocktails", icon_slug: "cocktail", isTranslationKey: true },
  // Other
  { labelKey: "extra.topicPsychology", icon_slug: "brain", isTranslationKey: true },
  { labelKey: "extra.topicBusiness", icon_slug: "briefcase", isTranslationKey: true },
  { labelKey: "extra.topicAnimals", icon_slug: "paw", isTranslationKey: true },
  { labelKey: "extra.topicCars", icon_slug: "car", isTranslationKey: true },
  { labelKey: "extra.topicFashion", icon_slug: "dress", isTranslationKey: true },
];

export function CreateQuizModal({ open, onOpenChange, onQuizCreated, onSwitchToCollection, overrideUserId }: CreateQuizModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { startCoverGeneration, isGenerating: isGeneratingCover } = useBackgroundGeneration();
  const queryClient = useQueryClient();
  
  const [step, setStep] = useState(1);
  const [creatorMode, setCreatorMode] = useState<CreatorMode>(null);
  const [subject, setSubject] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [answerFormat, setAnswerFormat] = useState<"4_answers" | "true_false">("4_answers");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("mixed");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [editorQuestions, setEditorQuestions] = useState<EditorQuestion[]>([]);
  const [title, setTitle] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [selectedGradient, setSelectedGradient] = useState(COVER_GRADIENTS[0]);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [isGeneratingCoverLocal, setIsGeneratingCoverLocal] = useState(false);
  const [coverGenerationCount, setCoverGenerationCount] = useState(0);
  const [isPublic, setIsPublic] = useState(false);
  const [suggestedTitles, setSuggestedTitles] = useState<string[]>([]);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const { t } = useLanguage();
  const [topicSuggestions, setTopicSuggestions] = useState<TopicSuggestion[]>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);

  // Fetch random topic suggestions with icons from library
  const fetchTopicSuggestions = useCallback(async () => {
    setIsLoadingTopics(true);
    
    // Shuffle and pick 6 random topics from the pool
    const shuffled = [...TRIVIA_TOPIC_POOL].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 6);
    
    const iconSlugs = [...new Set(selected.map(tp => tp.icon_slug))];
    
    try {
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
    } catch (e) {
      console.error("Failed to fetch topic icons:", e);
      setTopicSuggestions(
        selected.map(topic => {
          const label = topic.isTranslationKey ? t(topic.labelKey) : topic.labelKey;
          return {
            label,
            value: label,
            icon_slug: topic.icon_slug,
            icon_url: null
          };
        })
      );
    } finally {
      setIsLoadingTopics(false);
    }
  }, []);
  // Reset on open
  useEffect(() => {
    if (open) {
      resetForm();
      fetchTopicSuggestions();
    }
  }, [open, fetchTopicSuggestions]);

  const resetForm = () => {
    setStep(1);
    setCreatorMode(null);
    setSubject("");
    setQuestionCount(10);
    setAnswerFormat("4_answers");
    setDifficulty("mixed");
    setQuestions([]);
    setEditorQuestions([]);
    setTitle("");
    setGenerationProgress(0);
    setSelectedGradient(COVER_GRADIENTS[Math.floor(Math.random() * COVER_GRADIENTS.length)]);
    setCoverImageUrl(null);
    setIsGeneratingCoverLocal(false);
    setCoverGenerationCount(0);
    setIsPublic(false);
    setSuggestedTitles([]);
    setIsEditingTitle(false);
  };

  // Auto-generate cover image when entering step 6
  const handleGenerateCover = async () => {
    if (!user || isGeneratingCoverLocal || coverGenerationCount >= 3) return;
    
    setIsGeneratingCoverLocal(true);
    setCoverGenerationCount(prev => prev + 1);
    
    try {
      await startCoverGeneration(
        { title: title || subject, subject },
        (imageUrl) => {
          setCoverImageUrl(imageUrl);
          setIsGeneratingCoverLocal(false);
        }
      );
    } catch (error) {
      console.error("Cover generation failed:", error);
      setIsGeneratingCoverLocal(false);
      // Fall back to gradient - already set
    }
  };

  // Trigger cover generation when entering step 6
  useEffect(() => {
    if (step === 6 && questions.length > 0 && !coverImageUrl && !isGeneratingCoverLocal && coverGenerationCount === 0) {
      handleGenerateCover();
    }
  }, [step, questions.length]);

  // Generate title suggestions when subject changes
  useEffect(() => {
    if (subject.trim()) {
      const suggestions = TITLE_SUGGESTION_KEYS.map(fn => fn(subject.trim(), t));
      setSuggestedTitles(suggestions);
    } else {
      setSuggestedTitles([]);
    }
  }, [subject]);

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
        body: { subject, questionCount, answerFormat, difficulty },
      });

      clearInterval(progressInterval);
      setGenerationProgress(100);

      if (error) throw error;
      
      const generatedQuestions = data?.questions || [];
      if (!generatedQuestions.length) {
        throw new Error(t("extra.cbtGenerationFailed"));
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
      setEditorQuestions(convertToEditorQuestions(uniqueQuestions));
      setTitle(data?.suggestedTitle || `${subject} ${t("extra.cbtTriviaSuffix")}`);
      
      setTimeout(() => setStep(6), 300);
    } catch (error) {
      clearInterval(progressInterval);
      console.error("Error generating quiz:", error);
      toast({
        title: t("extra.errorTitle") + " 😕",
        description: error instanceof Error ? error.message : t("extra.editorGenerationFailed"),
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Handler for when editor questions change - sync back to GeneratedQuestion format
  const handleEditorQuestionsChange = (newEditorQuestions: EditorQuestion[]) => {
    setEditorQuestions(newEditorQuestions);
    setQuestions(convertToGeneratedQuestions(newEditorQuestions));
  };

  const handlePost = async () => {
    if (!user) {
      toast({
        title: t("extra.cqmLoginRequired"),
        description: t("extra.cqmPleaseLogin"),
        variant: "destructive",
      });
      return;
    }

    // Everything published here lands on the public Explore feed (and quiz
    // titles can be voted onto a shared TV screen) — screen the text first.
    const textsToScreen = [
      title,
      subject,
      ...editorQuestions.flatMap((q) => [q.question, ...q.answers.map((a) => a.text)]),
    ];
    if (textsToScreen.some((s) => containsBlockedText(s))) {
      toast({ title: t("extra.textNotAllowed"), variant: "destructive" });
      return;
    }

    setIsPosting(true);
    try {
      // Convert editor questions to the format needed for saving
      const questionsToSave = convertToGeneratedQuestions(editorQuestions);
      
      const hashtags = subject
        .split(/[\s,]+/)
        .filter(word => word.length > 2)
        .slice(0, 5)
        .map(word => `#${word.replace(/[^a-zA-Zა-ჰ0-9]/g, "")}`);

      // Get icon from first question if available
      const iconSlug = editorQuestions[0]?.iconSlug || null;

      const { error } = await supabase.from("user_quiz_posts").insert([{
        user_id: overrideUserId || user.id,
        title,
        subject,
        hashtags,
        cover_image: coverImageUrl,
        cover_gradient: selectedGradient,
        question_count: questionsToSave.length,
        answer_format: answerFormat,
        questions: structuredClone(questionsToSave) as unknown as Json,
        icon_slug: iconSlug,
        is_public: isPublic,
        is_blind: creatorMode === "play", // Track if creator saw answers
      }]);

      if (error) throw error;

      // Big celebration!
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.5 }
      });

      toast({
        title: t("extra.cqmSuccessTitle"),
        description: t("extra.cqmSuccessDesc"),
      });

      // Invalidate queries to refresh the trivia list immediately
      queryClient.invalidateQueries({ queryKey: ["my-quiz-posts"] });
      queryClient.invalidateQueries({ queryKey: ["quiz-posts-with-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["my-trivias-for-room"] });
      queryClient.invalidateQueries({ queryKey: ["my-collections"] });

      handleClose();
      onQuizCreated?.();
    } catch (error) {
      console.error("Error posting quiz:", error);
      toast({
        title: t("extra.errorTitle"),
        description: t("extra.editorPublishFailed"),
        variant: "destructive",
      });
    } finally {
      setIsPosting(false);
    }
  };

  // Save and start game for play mode
  const handleSaveAndStartGame = async () => {
    if (!user) {
      toast({
        title: t("extra.cqmLoginRequired"),
        description: t("extra.cqmPleaseLogin"),
        variant: "destructive",
      });
      return;
    }

    setIsPosting(true);
    try {
      const questionsToSave = convertToGeneratedQuestions(editorQuestions);
      
      const hashtags = subject
        .split(/[\s,]+/)
        .filter(word => word.length > 2)
        .slice(0, 5)
        .map(word => `#${word.replace(/[^a-zA-Zა-ჰ0-9]/g, "")}`);

      const iconSlug = editorQuestions[0]?.iconSlug || null;

      const { error } = await supabase.from("user_quiz_posts").insert([{
        user_id: user.id,
        title,
        subject,
        hashtags,
        cover_image: coverImageUrl,
        cover_gradient: selectedGradient,
        question_count: questionsToSave.length,
        answer_format: answerFormat,
        questions: structuredClone(questionsToSave) as unknown as Json,
        icon_slug: iconSlug,
        is_public: false, // Private by default for play mode
        is_blind: true, // Creator never saw answers (play mode)
      }]);

      if (error) throw error;

      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.5 }
      });

      toast({
        title: t("extra.cqmReadyTitle"),
        description: t("extra.cqmReadyDesc"),
      });

      queryClient.invalidateQueries({ queryKey: ["my-quiz-posts"] });
      queryClient.invalidateQueries({ queryKey: ["my-trivias-for-room"] });

      handleClose();
      onQuizCreated?.();
    } catch (error) {
      console.error("Error saving quiz:", error);
      toast({
        title: t("extra.errorTitle"),
        description: t("extra.editorSaveFailed"),
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
      case 'easy': return t("extra.cqmDiffEasy");
      case 'medium': return t("extra.cqmDiffMedium");
      case 'hard': return t("extra.cqmDiffHard");
      default: return '';
    }
  };

  const handleModeSelect = (mode: CreatorMode) => {
    setCreatorMode(mode);
    setStep(2);
  };

  const renderStep = () => {
    switch (step) {
      // Step 1: Mode Selection (NEW)
      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col min-h-[calc(100vh-120px)]"
          >
            <div className="flex-1 space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 mb-4">
                  <img src={triviaBuzzer} alt="Create Trivia" className="w-16 h-16 object-contain" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">{t("extra.createTitle")}</h3>
                <p className="text-white/70">{t("extra.createSubtitle")}</p>
              </div>

              <div className="flex flex-col gap-3">
                {/* Edit Mode Card */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleModeSelect("edit")}
                  className="relative p-4 rounded-2xl text-left transition-all bg-white/15 border border-white/20 hover:bg-white/25 hover:border-white/30 flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    <img src={pencilIcon} alt="" className="w-10 h-10 object-contain" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base">{t("extra.openType")}</h4>
                    <p className="text-white/60 text-xs mt-1">{t("extra.openTypeDesc")}</p>
                  </div>
                </motion.button>

                {/* Play Mode Card */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleModeSelect("play")}
                  className="relative p-4 rounded-2xl text-left transition-all bg-white/15 border border-white/20 hover:bg-white/25 hover:border-white/30 flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    <img src={lockIcon} alt="" className="w-10 h-10 object-contain" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base">{t("extra.lockedType")}</h4>
                    <p className="text-white/60 text-xs mt-1">{t("extra.lockedTypeDesc")}</p>
                  </div>
                </motion.button>
              </div>
            </div>
          </motion.div>
        );

      // Step 2: Topic Input (was step 1)
      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col min-h-[calc(100vh-120px)]"
          >
            <div className="flex-1 space-y-5">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 mb-4">
                  <img src={triviaBuzzer} alt="Create Trivia" className="w-16 h-16 object-contain" />
                </div>
                <h3 className="text-xl font-bold text-white mb-1">{t("extra.cqmCreateYourTrivia")}</h3>
                <p className="text-sm text-white/70">{t("extra.cqmWhatTopic")}</p>
              </div>

              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t("extra.cqmTopicPlaceholder")}
                className="text-center text-lg h-14 rounded-xl bg-white/95 text-slate-800 placeholder:text-slate-400 border-0"
              />

              {/* Topic suggestions as text chips */}
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                {isLoadingTopics ? (
                  // Loading skeletons
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-8 w-20 rounded-full bg-white/20 animate-pulse" />
                  ))
                ) : (
                  <>
                    {topicSuggestions.map((topic) => (
                      <button
                        key={topic.value}
                        onClick={() => setSubject(topic.value)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all ${
                          subject === topic.value
                            ? "bg-white text-slate-800"
                            : "bg-white/20 hover:bg-white/30 text-white"
                        }`}
                      >
                        {topic.icon_url && (
                          <img 
                            src={topic.icon_url} 
                            alt="" 
                            className="w-4 h-4 object-contain"
                          />
                        )}
                        <span>{topic.label}</span>
                      </button>
                    ))}
                    
                    {/* Refresh button */}
                    <button
                      onClick={fetchTopicSuggestions}
                      disabled={isLoadingTopics}
                      className="w-8 h-8 rounded-full border border-dashed border-white/30 hover:border-white/50 transition-all flex items-center justify-center"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-white/70 ${isLoadingTopics ? 'animate-spin' : ''}`} />
                    </button>
                  </>
                )}
              </div>

              {/* Title suggestions */}
              {subject.trim() && suggestedTitles.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs text-white/70 mb-2 text-center">💡 {t("extra.cqmTitleIdeas")}</p>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {suggestedTitles.slice(0, 3).map((suggestedTitle) => (
                      <button
                        key={suggestedTitle}
                        onClick={() => setTitle(suggestedTitle)}
                        className={`px-3 py-1.5 text-xs rounded-full transition-all ${
                          title === suggestedTitle
                            ? "bg-white text-slate-800"
                            : "bg-white/20 text-white hover:bg-white/30"
                        }`}
                      >
                        {suggestedTitle}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Fixed bottom section */}
            <div className="mt-auto pt-4 space-y-3" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
              <ChunkyButton
                onClick={() => setStep(3)}
                disabled={!subject.trim()}
                className="w-full"
              >
                {t("extra.nextBtn")}
                <ChevronRight className="w-5 h-5 ml-2" />
              </ChunkyButton>

              {/* Switch to collection prompt */}
              <div className="flex items-center justify-center gap-2 pt-3 border-t border-white/20">
                <span className="text-xs text-white/70">{t("extra.cqmWantMultipleRounds")}</span>
                <button
                  onClick={() => {
                    handleClose();
                    onSwitchToCollection?.();
                  }}
                  className="text-xs text-white font-medium hover:underline"
                >
                  {t("extra.cqmCreateCollection")}
                </button>
              </div>
            </div>
          </motion.div>
        );

      // Step 3: Difficulty (was step 2)
      case 3:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-5"
          >
            <div className="text-center">
              <h3 className="text-xl font-bold text-white mb-1">{t("extra.cqmDifficultyTitle")}</h3>
              <p className="text-sm text-white/70">{t("extra.cqmDifficultySubtitle")}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {DIFFICULTY_KEYS.map((option) => (
                <motion.button
                  key={option.value}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setDifficulty(option.value)}
                  className={`p-4 rounded-xl border-2 transition-all text-center ${
                    difficulty === option.value
                      ? "border-white bg-white/20"
                      : "border-white/30 hover:border-white/50 bg-white/10"
                  }`}
                >
                  <span className="text-2xl block mb-1">{option.emoji}</span>
                  <span className="font-semibold text-white block">{t(option.labelKey)}</span>
                  <span className="text-xs text-white/70">{t(option.descKey)}</span>
                </motion.button>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1 h-12 rounded-xl bg-white/10 border-white/30 text-white hover:bg-white/20">
                <ChevronLeft className="w-4 h-4 mr-2" />
                {t("extra.backBtn")}
              </Button>
              <ChunkyButton onClick={() => setStep(4)} className="flex-1">
                {t("extra.nextBtn")}
                <ChevronRight className="w-5 h-5 ml-2" />
              </ChunkyButton>
            </div>
          </motion.div>
        );

      // Step 4: Question Count (was step 3)
      case 4:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-5"
          >
            <div className="text-center">
              <h3 className="text-xl font-bold text-white mb-1">{t("extra.howManyQuestions2")} 🤔</h3>
              <p className="text-sm text-white/70">{t("extra.chooseQuestionCount2")}</p>
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
                      ? "bg-white text-slate-800 shadow-lg"
                      : "bg-white/20 text-white hover:bg-white/30"
                  }`}
                >
                  {count}
                  {questionCount === count && (
                    <motion.div
                      layoutId="count-indicator"
                      className="absolute inset-0 border-2 border-white/30 rounded-2xl"
                    />
                  )}
                </motion.button>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(3)} className="flex-1 h-12 rounded-xl bg-white/10 border-white/30 text-white hover:bg-white/20">
                <ChevronLeft className="w-4 h-4 mr-2" />
                {t("extra.backBtn")}
              </Button>
              <ChunkyButton onClick={() => setStep(5)} className="flex-1">
                {t("extra.nextBtn")}
                <ChevronRight className="w-5 h-5 ml-2" />
              </ChunkyButton>
            </div>
          </motion.div>
        );

      // Step 5: Format & Generate (was step 4)
      case 5:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] space-y-5"
          >
            <div className="text-center">
              <h3 className="text-xl font-bold text-white mb-1">{t("extra.cqmFormatTitle")}</h3>
              <p className="text-sm text-white/70">{t("extra.cqmFormatSubtitle")}</p>
            </div>

            <div className="space-y-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setAnswerFormat("4_answers")}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-4 ${
                  answerFormat === "4_answers"
                    ? "border-white bg-white/20"
                    : "border-white/30 hover:border-white/50 bg-white/10"
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center overflow-hidden">
                  <img src={bullseyeIcon} alt="" className="w-10 h-10 object-contain" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-white">{t("extra.fourOptions2")}</div>
                  <div className="text-sm text-white/70">{t("extra.fourOptionsDesc2")}</div>
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
                    : "border-white/30 hover:border-white/50 bg-white/10"
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center overflow-hidden">
                  <img src={checkmarkIcon} alt="" className="w-10 h-10 object-contain" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-white">{t("extra.trueFalseOption2")}</div>
                  <div className="text-sm text-white/70">{t("extra.trueFalseDesc2")}</div>
                </div>
                {answerFormat === "true_false" && (
                  <Check className="w-5 h-5 text-white" />
                )}
              </motion.button>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(4)} className="flex-1 h-12 rounded-xl bg-white/10 border-white/30 text-white hover:bg-white/20">
                <ChevronLeft className="w-4 h-4 mr-2" />
                {t("extra.backBtn")}
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
                    {t("extra.cqmGenerateBtn")}
                  </>
                )}
              </ChunkyButton>
            </div>

            {isGenerating && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="fixed bottom-0 left-0 right-0 p-4 pb-[calc(1.5rem_+_var(--safe-bottom))] z-[201]"
                style={{ background: "linear-gradient(to top, rgba(76,29,149,0.98) 0%, rgba(76,29,149,0.9) 50%, transparent 100%)" }}
              >
                <div className="space-y-2 max-w-sm mx-auto">
                  <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-white"
                      initial={{ width: 0 }}
                      animate={{ width: `${generationProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className="text-sm text-center text-white/80 animate-pulse">
                    ✨ {t("extra.cqmAiCreating")}
                  </p>
                </div>
              </motion.div>
            )}
          </motion.div>
        );

      // Step 6: Editor or Play Mode Summary (was step 5)
      case 6:
        // Play mode: show summary without questions
        if (creatorMode === "play") {
          return (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col min-h-[calc(100vh-120px)]"
            >
              <div className="flex-1 space-y-6">
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", duration: 0.6 }}
                    className="inline-flex items-center justify-center w-20 h-20 mb-4 rounded-full bg-emerald-500/30"
                  >
                    <Check className="w-10 h-10 text-emerald-400" />
                  </motion.div>
                  <h3 className="text-2xl font-bold text-white mb-2">{t("extra.editorQuestionsReady", { count: questions.length })}</h3>
                  <p className="text-white/70">{t("extra.editorAnswersHiddenPlay")}</p>
                </div>

                {/* Title input */}
                <div className="space-y-2">
                  <label className="text-sm text-white/80 block text-center">{t("extra.cqmPlayTitleLabel")}</label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t("extra.cqmPlayTitlePlaceholder")}
                    className="text-center text-lg h-14 rounded-xl bg-white/95 text-slate-800 placeholder:text-slate-400 border-0"
                  />
                </div>

                {/* Info card */}
                <div className="p-4 rounded-xl bg-white/10 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500/30 flex items-center justify-center">
                      <Users className="w-5 h-5 text-purple-300" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-white font-medium">{t("extra.cqmPlayMode")}</p>
                      <p className="text-xs text-white/60">{t("extra.cqmPlayModeDesc")}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom buttons */}
              <div className="mt-auto pt-4 space-y-3" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
                <ChunkyButton
                  onClick={handleSaveAndStartGame}
                  disabled={isPosting || !title.trim()}
                  className="w-full"
                >
                  {isPosting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      {t("extra.savingState")}
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 mr-2" />
                      {t("extra.saveBtn2")}
                    </>
                  )}
                </ChunkyButton>
              </div>
            </motion.div>
          );
        }

        // Edit mode: show full editor
        return (
          <GameStyleQuestionEditor
            questions={editorQuestions}
            onQuestionsChange={handleEditorQuestionsChange}
            onBack={() => setStep(5)}
            onSave={handlePost}
            subject={subject}
            answerFormat={answerFormat}
            title={title}
            onTitleChange={setTitle}
            coverImageUrl={coverImageUrl}
            selectedGradient={selectedGradient}
            isPublic={isPublic}
            onPublicChange={setIsPublic}
            isSaving={isPosting}
            onRegenerateCover={handleGenerateCover}
            isGeneratingCover={isGeneratingCoverLocal}
            coverGenerationCount={coverGenerationCount}
          />
        );

      default:
        return null;
    }
  };

  if (!open) return null;

  // Step 6 uses a fullscreen editor in edit mode, render it separately
  if (step === 6 && editorQuestions.length > 0 && creatorMode === "edit") {
    return (
      <GameStyleQuestionEditor
        questions={editorQuestions}
        onQuestionsChange={handleEditorQuestionsChange}
        onBack={() => setStep(5)}
        onSave={handlePost}
        subject={subject}
        answerFormat={answerFormat}
        title={title}
        onTitleChange={setTitle}
        coverImageUrl={coverImageUrl}
        selectedGradient={selectedGradient}
        isPublic={isPublic}
        onPublicChange={setIsPublic}
        isSaving={isPosting}
        onRegenerateCover={handleGenerateCover}
        isGeneratingCover={isGeneratingCoverLocal}
        coverGenerationCount={coverGenerationCount}
      />
    );
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 safe-screen z-[200] flex flex-col"
            style={{ background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 50%, #4C1D95 100%)" }}
          >
            {/* Fixed Header */}
            <div className="fixed top-0 left-0 right-0 z-[201] safe-top">
              <div className="max-w-[700px] md:max-w-[600px] mx-auto w-full flex items-center justify-between px-4 py-3">
                <button
                  onClick={step === 1 ? handleClose : () => setStep(step - 1)}
                  className="p-2 -ml-2 rounded-xl hover:bg-white/10 transition-colors"
                >
                  {step === 1 ? <X className="w-6 h-6 text-white" /> : <ChevronLeft className="w-6 h-6 text-white" />}
                </button>
                
                <h2 className="text-lg font-bold text-white">{t("extra.createTriviaTitle2")}</h2>
                
                {/* Progress dots */}
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5, 6].map((s) => (
                    <motion.div
                      key={s}
                      animate={{
                        width: s === step ? 16 : 6,
                        backgroundColor: s <= step ? "#ffffff" : "rgba(255,255,255,0.3)",
                      }}
                      className="h-1.5 rounded-full"
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="h-full overflow-y-auto pt-[60px] pb-8">
              <div className="max-w-[700px] md:max-w-[600px] mx-auto w-full px-4">
                <AnimatePresence mode="wait">
                  {renderStep()}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </>
  );
}
