import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Sparkles, ChevronRight, Check, Loader2, RefreshCw, Globe, Lock } from "lucide-react";
import triviaBuzzer from "@/assets/trivia-buzzer.png";
import { Input } from "@/components/ui/input";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import confetti from "canvas-confetti";
import { GameStyleQuestionEditor, convertToEditorQuestions, EditorQuestion, convertToGeneratedQuestions } from "@/components/social/GameStyleQuestionEditor";

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

const QUESTION_COUNTS = [5, 10, 15];

// Creative topic pool - specific, fun topics that inspire users
const TRIVIA_TOPIC_POOL = [
  { label: "Friends", icon_slug: "television" },
  { label: "Star Wars", icon_slug: "rocket" },
  { label: "Marvel", icon_slug: "superhero" },
  { label: "Harry Potter", icon_slug: "magic-wand" },
  { label: "Game of Thrones", icon_slug: "crown" },
  { label: "Breaking Bad", icon_slug: "chemistry" },
  { label: "Netflix სერიალები", icon_slug: "film-reel" },
  { label: "Disney ფილმები", icon_slug: "castle" },
  { label: "NBA ლეგენდები", icon_slug: "basketball" },
  { label: "ჩემპიონთა ლიგა", icon_slug: "trophy" },
  { label: "Formula 1", icon_slug: "racing-car" },
  { label: "K-Pop", icon_slug: "music-note" },
  { label: "Taylor Swift", icon_slug: "microphone" },
  { label: "BTS", icon_slug: "star" },
  { label: "მემები", icon_slug: "smiley" },
  { label: "Minecraft", icon_slug: "cube" },
  { label: "კოსმოსი და ვარსკვლავები", icon_slug: "planet" },
  { label: "საქართველოს ისტორია", icon_slug: "flag" },
  { label: "ქართული კერძები", icon_slug: "food" },
  { label: "ცხოველთა სამყარო", icon_slug: "paw" },
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
  const [answerFormat] = useState<"4_answers" | "true_false">("4_answers");
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

  const fetchTopicSuggestions = useCallback(async () => {
    setIsLoadingTopics(true);
    
    const shuffled = [...TRIVIA_TOPIC_POOL].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 6);
    
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
    setDifficulty("mixed");
    setTitle("");
    setGenerationProgress(0);
    setEditorQuestions([]);
    setIsPublic(true);
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
        body: { subject, questionCount, answerFormat, difficulty },
      });

      clearInterval(progressInterval);
      setGenerationProgress(100);

      if (error) throw error;
      
      const generatedQuestions = data?.questions || [];
      if (!generatedQuestions.length) {
        throw new Error("კითხვები ვერ დაგენერირდა");
      }

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Convert to editor format
      const converted = convertToEditorQuestions(generatedQuestions);
      setEditorQuestions(converted);
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

  const handleStartGame = () => {
    // Convert back to GeneratedQuestion format
    const questions = convertToGeneratedQuestions(editorQuestions);
    onTriviaReady(questions, title, subject);
    handleClose();
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
              <div className="inline-flex items-center justify-center mb-4">
                <img src={triviaBuzzer} alt="Create Trivia" className="w-16 h-16 object-contain" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">შექმენი Trivia</h3>
              <p className="text-white/70">1 რაუნდი, სწრაფი შექმნა</p>
            </div>

            <div className="space-y-4">
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="მაგ: Friends TV Show, NBA, K-Pop..."
                className="w-full text-base h-14 px-5 rounded-2xl border-0 bg-white/95 text-slate-800 placeholder:text-slate-400 shadow-lg"
              />
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/80">💡 იდეები:</span>
                  <button
                    onClick={fetchTopicSuggestions}
                    disabled={isLoadingTopics}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 text-white/80 text-sm hover:bg-white/30 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTopics ? 'animate-spin' : ''}`} />
                    სხვა
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-2 justify-center">
                  {isLoadingTopics ? (
                    Array.from({ length: 6 }).map((_, i) => (
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

      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-5"
          >
            <div className="text-center">
              <h3 className="text-2xl font-bold text-white mb-2">რამდენი კითხვა? 🎯</h3>
              <p className="text-white/70">აირჩიე რაოდენობა და სირთულე</p>
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

            {/* Difficulty */}
            <div className="grid grid-cols-4 gap-2">
              {DIFFICULTY_OPTIONS.map((option) => (
                <motion.button
                  key={option.value}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setDifficulty(option.value)}
                  className={`p-3 rounded-2xl transition-all text-center ${
                    difficulty === option.value
                      ? "bg-white text-[#5B21B6] shadow-lg"
                      : "bg-white/20 text-white hover:bg-white/30"
                  }`}
                >
                  <span className="text-2xl block mb-1">{option.emoji}</span>
                  <span className="text-xs font-medium block">{option.label}</span>
                </motion.button>
              ))}
            </div>

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
                  ✨ AI ქმნის კითხვებს...
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
    if (step === 1) {
      return (
        <ChunkyButton
          variant="whitePurple"
          onClick={() => setStep(2)}
          disabled={!subject.trim()}
          className="w-full"
        >
          შემდეგი
          <ChevronRight className="w-5 h-5 ml-2" />
        </ChunkyButton>
      );
    }

    if (step === 2) {
      return (
        <div className="flex gap-3">
          <button 
            onClick={() => setStep(1)} 
            className="flex-1 h-14 rounded-2xl bg-white/20 text-white font-medium flex items-center justify-center gap-2 hover:bg-white/30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            უკან
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
                დაგენერირება
              </>
            )}
          </ChunkyButton>
        </div>
      );
    }

    return null;
  };

  const totalSteps = 2;
  const progressDots = Array.from({ length: totalSteps }, (_, i) => i + 1);

  if (!open) return null;

  // Step 4: Show GameStyleQuestionEditor
  if (step === 4) {
    return (
      <GameStyleQuestionEditor
        questions={editorQuestions}
        onQuestionsChange={setEditorQuestions}
        title={title}
        onTitleChange={setTitle}
        onSave={handleStartGame}
        onBack={() => setStep(2)}
        saveButtonText="მზადაა! 🚀"
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
          className="fixed inset-0 z-50 max-w-[700px] md:max-w-[600px] mx-auto"
          style={{ background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 50%, #4C1D95 100%)" }}
        >
          <div className="fixed top-0 left-0 right-0 z-50 safe-top">
            <div className="flex items-center justify-between px-4 py-3">
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

          <div className="h-full overflow-y-auto pt-[60px] pb-32 safe-top">
            <div className="p-5">
              <AnimatePresence mode="wait">
                {renderStep()}
              </AnimatePresence>
            </div>
          </div>

          {/* Fixed bottom CTA */}
          <div className="fixed bottom-0 left-0 right-0 p-4 pb-6 safe-bottom" style={{ background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 50%, #4C1D95 100%)" }}>
            {renderBottomCTA()}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
