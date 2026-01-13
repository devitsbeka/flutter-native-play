import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronRight, ChevronLeft, Check, Loader2, X, RefreshCw, Edit3, Globe, Lock } from "lucide-react";
import triviaBuzzer from "@/assets/trivia-buzzer.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBackgroundGeneration } from "@/contexts/BackgroundGenerationContext";
import confetti from "canvas-confetti";
import { removeDuplicatesFromBatch } from "@/utils/duplicateDetection";
import { GameStyleQuestionEditor } from "./GameStyleQuestionEditor";
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
}

type DifficultyLevel = "mixed" | "easy" | "medium" | "hard";

const DIFFICULTY_OPTIONS: { value: DifficultyLevel; emoji: string; label: string; description: string }[] = [
  { value: "mixed", emoji: "🎲", label: "შერეული", description: "ადვილი → რთული" },
  { value: "easy", emoji: "🟢", label: "ადვილი", description: "დამწყებთათვის" },
  { value: "medium", emoji: "🟡", label: "საშუალო", description: "მცოდნეებს" },
  { value: "hard", emoji: "🔴", label: "რთული", description: "ექსპერტებს" },
];

const TITLE_SUGGESTIONS = [
  (subject: string) => `${subject} მასტერი 🏆`,
  (subject: string) => `რამდენი იცი ${subject}-ზე?`,
  (subject: string) => `${subject} ჩემპიონატი ⚡`,
  (subject: string) => `${subject} გამოწვევა 🎯`,
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
  { label: "Friends", icon_slug: "television" },
  { label: "Star Wars", icon_slug: "rocket" },
  { label: "Marvel", icon_slug: "superhero" },
  { label: "სერიალები", icon_slug: "television" },
  { label: "Netflix", icon_slug: "film-reel" },
  { label: "Harry Potter", icon_slug: "magic-wand" },
  { label: "Disney", icon_slug: "castle" },
  { label: "ჰოლივუდი", icon_slug: "cinema" },
  { label: "Game of Thrones", icon_slug: "crown" },
  { label: "Breaking Bad", icon_slug: "chemistry" },
  { label: "The Office", icon_slug: "office" },
  
  // Sports
  { label: "NBA", icon_slug: "basketball" },
  { label: "ფეხბურთი", icon_slug: "soccer-ball" },
  { label: "ჩემპიონთა ლიგა", icon_slug: "trophy" },
  { label: "F1", icon_slug: "racing-car" },
  { label: "ოლიმპიადა", icon_slug: "medal" },
  { label: "ტენისი", icon_slug: "tennis" },
  { label: "კრიკეტი", icon_slug: "cricket" },
  
  // Music
  { label: "K-Pop", icon_slug: "music-note" },
  { label: "Taylor Swift", icon_slug: "microphone" },
  { label: "ქართული მუსიკა", icon_slug: "guitar" },
  { label: "Hip-Hop", icon_slug: "headphones" },
  { label: "90s მუსიკა", icon_slug: "vinyl" },
  { label: "BTS", icon_slug: "star" },
  { label: "Queen", icon_slug: "crown" },
  
  // Knowledge
  { label: "გეოგრაფია", icon_slug: "globe" },
  { label: "ისტორია", icon_slug: "hourglass" },
  { label: "მეცნიერება", icon_slug: "microscope" },
  { label: "ასტრონომია", icon_slug: "planet" },
  { label: "ბიოლოგია", icon_slug: "dna" },
  { label: "მათემატიკა", icon_slug: "calculator" },
  { label: "ფიზიკა", icon_slug: "atom" },
  
  // Pop Culture & Gaming
  { label: "მემები", icon_slug: "smiley" },
  { label: "TikTok", icon_slug: "smartphone" },
  { label: "ვიდეო თამაშები", icon_slug: "game-controller" },
  { label: "Anime", icon_slug: "ninja" },
  { label: "საქართველო", icon_slug: "flag" },
  { label: "Minecraft", icon_slug: "cube" },
  { label: "FIFA", icon_slug: "soccer-ball" },
  
  // Food & Lifestyle
  { label: "კულინარია", icon_slug: "chef-hat" },
  { label: "ღვინო", icon_slug: "wine" },
  { label: "ქართული კერძები", icon_slug: "food" },
  { label: "კოქტეილები", icon_slug: "cocktail" },
  
  // Other
  { label: "ფსიქოლოგია", icon_slug: "brain" },
  { label: "ბიზნესი", icon_slug: "briefcase" },
  { label: "ცხოველები", icon_slug: "paw" },
  { label: "ავტომობილები", icon_slug: "car" },
  { label: "მოდა", icon_slug: "dress" },
];

export function CreateQuizModal({ open, onOpenChange, onQuizCreated, onSwitchToCollection }: CreateQuizModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { startCoverGeneration, isGenerating: isGeneratingCover } = useBackgroundGeneration();
  
  const [step, setStep] = useState(1);
  const [subject, setSubject] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [answerFormat, setAnswerFormat] = useState<"4_answers" | "true_false">("4_answers");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("mixed");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [title, setTitle] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [selectedGradient, setSelectedGradient] = useState(COVER_GRADIENTS[0]);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [isGeneratingCoverLocal, setIsGeneratingCoverLocal] = useState(false);
  const [coverGenerationCount, setCoverGenerationCount] = useState(0);
  const [isPublic, setIsPublic] = useState(true);
  const [suggestedTitles, setSuggestedTitles] = useState<string[]>([]);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [topicSuggestions, setTopicSuggestions] = useState<TopicSuggestion[]>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);

  // Fetch random topic suggestions with icons from library
  const fetchTopicSuggestions = useCallback(async () => {
    setIsLoadingTopics(true);
    
    // Shuffle and pick 6 random topics from the pool
    const shuffled = [...TRIVIA_TOPIC_POOL].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 6);
    
    // Get unique icon slugs to fetch
    const iconSlugs = [...new Set(selected.map(t => t.icon_slug))];
    
    try {
      const { data: icons } = await supabase
        .from("icon_library")
        .select("slug, icon_url")
        .in("slug", iconSlugs);
      
      const iconMap = new Map(icons?.map(i => [i.slug, i.icon_url]) || []);
      
      setTopicSuggestions(
        selected.map(topic => ({
          label: topic.label,
          value: topic.label,
          icon_slug: topic.icon_slug,
          icon_url: iconMap.get(topic.icon_slug) || null
        }))
      );
    } catch (e) {
      console.error("Failed to fetch topic icons:", e);
      // Still show topics without icons
      setTopicSuggestions(
        selected.map(topic => ({
          label: topic.label,
          value: topic.label,
          icon_slug: topic.icon_slug,
          icon_url: null
        }))
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
    setSubject("");
    setQuestionCount(10);
    setAnswerFormat("4_answers");
    setDifficulty("mixed");
    setQuestions([]);
    setTitle("");
    setGenerationProgress(0);
    setSelectedGradient(COVER_GRADIENTS[Math.floor(Math.random() * COVER_GRADIENTS.length)]);
    setCoverImageUrl(null);
    setIsGeneratingCoverLocal(false);
    setCoverGenerationCount(0);
    setIsPublic(true);
    setSuggestedTitles([]);
    setIsEditingTitle(false);
  };

  // Auto-generate cover image when entering step 5
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

  // Trigger cover generation when entering step 5
  useEffect(() => {
    if (step === 5 && questions.length > 0 && !coverImageUrl && !isGeneratingCoverLocal && coverGenerationCount === 0) {
      handleGenerateCover();
    }
  }, [step, questions.length]);

  // Generate title suggestions when subject changes
  useEffect(() => {
    if (subject.trim()) {
      const suggestions = TITLE_SUGGESTIONS.map(fn => fn(subject.trim()));
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
      
      setTimeout(() => setStep(5), 300);
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
        subject,
        hashtags,
        cover_image: coverImageUrl,
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

            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="მაგ: Friends TV Show, NBA, K-Pop..."
              className="text-center text-lg h-14 rounded-xl"
            />

            {/* Topic suggestions as text chips */}
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              {isLoadingTopics ? (
                // Loading skeletons
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-8 w-20 rounded-full bg-muted animate-pulse" />
                ))
              ) : (
                <>
                  {topicSuggestions.map((topic) => (
                    <button
                      key={topic.value}
                      onClick={() => setSubject(topic.value)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-all ${
                        subject === topic.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80 text-foreground"
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
                    className="w-8 h-8 rounded-full border border-dashed border-border hover:border-primary/50 transition-all flex items-center justify-center"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${isLoadingTopics ? 'animate-spin' : ''}`} />
                  </button>
                </>
              )}
            </div>

            {/* Title suggestions */}
            {subject.trim() && suggestedTitles.length > 0 && (
              <div className="pt-2">
                <p className="text-xs text-muted-foreground mb-2 text-center">💡 იდეები სათაურისთვის:</p>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {suggestedTitles.slice(0, 3).map((suggestedTitle) => (
                    <button
                      key={suggestedTitle}
                      onClick={() => setTitle(suggestedTitle)}
                      className={`px-3 py-1.5 text-xs rounded-full transition-all ${
                        title === suggestedTitle
                          ? "bg-primary text-primary-foreground"
                          : "bg-primary/10 text-primary hover:bg-primary/20"
                      }`}
                    >
                      {suggestedTitle}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <ChunkyButton
              onClick={() => setStep(2)}
              disabled={!subject.trim()}
              className="w-full"
            >
              შემდეგი
              <ChevronRight className="w-5 h-5 ml-2" />
            </ChunkyButton>

            {/* Switch to collection prompt */}
            <div className="flex items-center justify-center gap-2 pt-3 border-t border-border/50">
              <span className="text-xs text-muted-foreground">გინდა რამდენიმე რაუნდი?</span>
              <button
                onClick={() => {
                  handleClose();
                  onSwitchToCollection?.();
                }}
                className="text-xs text-primary font-medium hover:underline"
              >
                შექმენი კოლექცია →
              </button>
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
              <h3 className="text-xl font-bold text-foreground mb-1">სირთულე 🎯</h3>
              <p className="text-sm text-muted-foreground">რა სირთულის კითხვები გინდა?</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {DIFFICULTY_OPTIONS.map((option) => (
                <motion.button
                  key={option.value}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setDifficulty(option.value)}
                  className={`p-4 rounded-xl border-2 transition-all text-center ${
                    difficulty === option.value
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <span className="text-2xl block mb-1">{option.emoji}</span>
                  <span className="font-semibold text-foreground block">{option.label}</span>
                  <span className="text-xs text-muted-foreground">{option.description}</span>
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
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1 h-12 rounded-xl">
                <ChevronLeft className="w-4 h-4 mr-2" />
                უკან
              </Button>
              <ChunkyButton onClick={() => setStep(4)} className="flex-1">
                შემდეგი
                <ChevronRight className="w-5 h-5 ml-2" />
              </ChunkyButton>
            </div>
          </motion.div>
        );

      case 4:
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
              <Button variant="outline" onClick={() => setStep(3)} className="flex-1 h-12 rounded-xl">
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

      case 5:
        return (
          <GameStyleQuestionEditor
            questions={questions}
            onQuestionsChange={setQuestions}
            onClose={() => setStep(4)}
            onPublish={handlePost}
            subject={subject}
            answerFormat={answerFormat}
            title={title}
            onTitleChange={setTitle}
            coverImageUrl={coverImageUrl}
            selectedGradient={selectedGradient}
            isPublic={isPublic}
            onPublicChange={setIsPublic}
            isPosting={isPosting}
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

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background flex flex-col"
          >
            {/* Fixed Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-border/50 bg-background/95 backdrop-blur-sm">
              <button
                onClick={handleClose}
                className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
              
              <h2 className="text-lg font-bold text-foreground">შექმენი Trivia</h2>
              
              {/* Progress dots */}
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <motion.div
                    key={s}
                    animate={{
                      width: s === step ? 16 : 6,
                      backgroundColor: s <= step ? "hsl(var(--primary))" : "hsl(var(--muted))",
                    }}
                    className="h-1.5 rounded-full"
                  />
                ))}
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-4 py-6">
              <AnimatePresence mode="wait">
                {renderStep()}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </>
  );
}
