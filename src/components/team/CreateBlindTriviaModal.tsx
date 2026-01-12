import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Sparkles, ChevronRight, Check, Loader2, Lock, Play, RefreshCw } from "lucide-react";
import triviaBuzzer from "@/assets/trivia-buzzer.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import confetti from "canvas-confetti";

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
}

type DifficultyLevel = "mixed" | "easy" | "medium" | "hard";

const DIFFICULTY_OPTIONS: { value: DifficultyLevel; emoji: string; label: string; description: string }[] = [
  { value: "mixed", emoji: "🎲", label: "შერეული", description: "ადვილი → რთული" },
  { value: "easy", emoji: "🟢", label: "ადვილი", description: "დამწყებთათვის" },
  { value: "medium", emoji: "🟡", label: "საშუალო", description: "მცოდნეებს" },
  { value: "hard", emoji: "🔴", label: "რთული", description: "ექსპერტებს" },
];

const QUESTION_COUNTS = [5, 10, 15, 20];

// Creative topic pool - specific, fun topics that inspire users
const TRIVIA_TOPIC_POOL = [
  // Entertainment
  { label: "Friends", icon_slug: "television" },
  { label: "Star Wars", icon_slug: "rocket" },
  { label: "Marvel", icon_slug: "superhero" },
  { label: "Harry Potter", icon_slug: "magic-wand" },
  { label: "Game of Thrones", icon_slug: "crown" },
  { label: "Breaking Bad", icon_slug: "chemistry" },
  { label: "Netflix სერიალები", icon_slug: "film-reel" },
  { label: "Disney ფილმები", icon_slug: "castle" },
  { label: "The Office", icon_slug: "briefcase" },
  { label: "Stranger Things", icon_slug: "flashlight" },
  { label: "ანიმე", icon_slug: "ninja" },
  { label: "პიქსარი", icon_slug: "lamp" },
  // Sports
  { label: "NBA ლეგენდები", icon_slug: "basketball" },
  { label: "ჩემპიონთა ლიგა", icon_slug: "trophy" },
  { label: "Formula 1", icon_slug: "racing-car" },
  { label: "ოლიმპიური თამაშები", icon_slug: "medal" },
  { label: "მსოფლიო ჩემპიონატი", icon_slug: "soccer-ball" },
  { label: "UFC/MMA", icon_slug: "boxing-glove" },
  { label: "ტენისის ვარსკვლავები", icon_slug: "tennis" },
  // Music
  { label: "K-Pop", icon_slug: "music-note" },
  { label: "Taylor Swift", icon_slug: "microphone" },
  { label: "BTS", icon_slug: "star" },
  { label: "Queen", icon_slug: "crown" },
  { label: "90s მუსიკა", icon_slug: "vinyl" },
  { label: "Hip-Hop ლეგენდები", icon_slug: "headphones" },
  { label: "რეპერები", icon_slug: "microphone-stand" },
  { label: "როკ მუსიკა", icon_slug: "guitar" },
  // Pop Culture & Gaming
  { label: "მემები", icon_slug: "smiley" },
  { label: "TikTok ტრენდები", icon_slug: "smartphone" },
  { label: "Minecraft", icon_slug: "cube" },
  { label: "GTA", icon_slug: "car" },
  { label: "FIFA/EA Sports", icon_slug: "gamepad" },
  { label: "PlayStation ექსკლუზივები", icon_slug: "controller" },
  { label: "ნინტენდო", icon_slug: "joystick" },
  // Knowledge & Science
  { label: "კოსმოსი და ვარსკვლავები", icon_slug: "planet" },
  { label: "ფსიქოლოგია", icon_slug: "brain" },
  { label: "ბერძნული მითოლოგია", icon_slug: "greek-helmet" },
  { label: "დინოზავრები", icon_slug: "dinosaur" },
  { label: "ადამიანის სხეული", icon_slug: "heart" },
  { label: "ქიმია", icon_slug: "flask" },
  // Georgian specific
  { label: "საქართველოს ისტორია", icon_slug: "flag" },
  { label: "ქართული კერძები", icon_slug: "food" },
  { label: "ქართული ღვინო", icon_slug: "wine" },
  { label: "ქართველი სახეები", icon_slug: "person" },
  // Fun categories
  { label: "ცხოველთა სამყარო", icon_slug: "paw" },
  { label: "სუპერ მანქანები", icon_slug: "sports-car" },
  { label: "მზარეულის საიდუმლო", icon_slug: "chef-hat" },
  { label: "მსოფლიო რეკორდები", icon_slug: "trophy" },
  { label: "გამოცანები", icon_slug: "puzzle" },
  { label: "სახალისო ფაქტები", icon_slug: "lightbulb" },
];

interface TopicSuggestion {
  label: string;
  value: string;
  icon_url: string | null;
  icon_slug: string;
}

export function CreateBlindTriviaModal({ open, onOpenChange, onTriviaReady }: CreateBlindTriviaModalProps) {
  const { toast } = useToast();
  
  const [step, setStep] = useState(1);
  const [subject, setSubject] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [answerFormat, setAnswerFormat] = useState<"4_answers" | "true_false">("4_answers");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("mixed");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [title, setTitle] = useState("");
  
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
      selected.map(topic => ({
        label: topic.label,
        value: topic.label,
        icon_slug: topic.icon_slug,
        icon_url: iconMap.get(topic.icon_slug) || null
      }))
    );
    
    setIsLoadingTopics(false);
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
        body: { subject, questionCount, answerFormat, difficulty },
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

  const handleStartGame = () => {
    onTriviaReady(questions, title, subject);
    handleClose();
  };

  const getDifficultyLabel = (difficulty?: string) => {
    switch (difficulty) {
      case 'easy': return 'მარტივი';
      case 'medium': return 'საშუალო';
      case 'hard': return 'რთული';
      default: return 'შერეული';
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
            {/* Header */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 mb-3">
                <img src={triviaBuzzer} alt="Create Trivia" className="w-16 h-16 object-contain" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-1">შექმენი Trivia ✨</h3>
              <p className="text-sm text-muted-foreground">რა თემაზე გსურს კითხვები?</p>
            </div>

            {/* Input field - Primary focus */}
            <div className="space-y-3">
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="მაგ: Friends TV Show, NBA, K-Pop..."
                className="w-full text-base h-14 px-5 rounded-2xl border-2 border-border/60 bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/60"
              />
              
              {/* Suggestion chips with refresh */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">💡 იდეები:</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchTopicSuggestions}
                    disabled={isLoadingTopics}
                    className="h-6 px-2 text-xs hover:bg-muted"
                  >
                    <RefreshCw className={`w-3 h-3 mr-1 ${isLoadingTopics ? 'animate-spin' : ''}`} />
                    სხვა
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2 justify-center">
                  {isLoadingTopics ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-8 w-24 bg-muted/50 rounded-full animate-pulse" />
                    ))
                  ) : (
                    topicSuggestions.map((topic, idx) => (
                      <motion.button
                        key={topic.value}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.03 }}
                        onClick={() => setSubject(topic.value)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
                          subject === topic.value
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        {topic.icon_url ? (
                          <img src={topic.icon_url} alt={topic.label} className="w-4 h-4 object-contain" />
                        ) : (
                          <div className="w-4 h-4 bg-muted/50 rounded-full" />
                        )}
                        <span>{topic.label}</span>
                      </motion.button>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Continue button */}
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
                      layoutId="blind-count-indicator"
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
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-5"
          >
            {/* Success header */}
            <div className="text-center">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.5 }}
                className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 mb-4"
              >
                <Sparkles className="w-10 h-10 text-white" />
              </motion.div>
              <h3 className="text-2xl font-bold text-foreground mb-1">მზადაა! 🎉</h3>
              <p className="text-sm text-muted-foreground">{questions.length} კითხვა შეიქმნა</p>
            </div>

            {/* Hidden questions preview */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {questions.slice(0, 5).map((_, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border/50"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Lock className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">კითხვა {index + 1}</p>
                    <p className="text-xs text-muted-foreground">
                      პასუხები დამალულია • {getDifficultyLabel(questions[index]?.difficulty)}
                    </p>
                  </div>
                </motion.div>
              ))}
              
              {questions.length > 5 && (
                <div className="flex items-center justify-center gap-2 py-2">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    + {questions.length - 5} დამატებითი კითხვა
                  </span>
                </div>
              )}
            </div>

            {/* Fun message */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 text-center">
              <p className="text-sm font-medium text-foreground">
                🔐 პასუხები საიდუმლოა
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                ითამაშე და გაარკვიე პასუხები მეგობრებთან ერთად!
              </p>
            </div>

          </motion.div>
        );

      default:
        return null;
    }
  };

  // Progress dots
  const totalSteps = 5;
  const progressDots = Array.from({ length: totalSteps }, (_, i) => i + 1);

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
                {progressDots.map((dot) => (
                  <div
                    key={dot}
                    className={`h-2 rounded-full transition-all ${
                      dot === step
                        ? "w-6 bg-primary"
                        : dot < step
                        ? "w-2 bg-primary/50"
                        : "w-2 bg-muted"
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
          <div className="h-full overflow-y-auto pt-[60px] pb-24 safe-top">
            <div className="p-5">
              <AnimatePresence mode="wait">
                {renderStep()}
              </AnimatePresence>
            </div>
          </div>

          {/* Fixed CTA footer for step 5 */}
          {step === 5 && (
            <div className="fixed bottom-0 left-0 right-0 p-5 pt-3 border-t border-border/30 bg-background safe-bottom">
              <ChunkyButton
                onClick={handleStartGame}
                className="w-full"
                variant="primary"
                size="lg"
              >
                <Play className="w-5 h-5 mr-2" />
                მზადაა! 🚀
              </ChunkyButton>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
