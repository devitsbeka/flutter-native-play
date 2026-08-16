import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Loader2, ChevronLeft, Sparkles, Settings, ChevronRight, Check, Play, Users } from "lucide-react";
import pencilIcon from "@/assets/classic-yellow-pencil.png";
import lockIcon from "@/assets/lock-icon.png";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { GameStyleQuestionEditor, convertToEditorQuestions, convertToGeneratedQuestions, EditorQuestion, createEmptyQuestion } from "./GameStyleQuestionEditor";
import confetti from "canvas-confetti";
import iconCollections from "@/assets/icon-collections.png";
import triviaBuzzer from "@/assets/trivia-buzzer.png";
import { shuffleArray } from "@/utils/shuffle";

type DifficultyLevel = "mixed" | "easy" | "medium" | "hard";
type CreatorMode = "edit" | "play" | null;

interface CollectionRound {
  subject: string;
  questionCount: number;
  answerFormat: "4_answers" | "true_false";
  difficulty: DifficultyLevel;
}

interface CreateCollectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCollectionCreated?: () => void;
  draftId?: string | null;
  initialRoundSubject?: string;
}

// Topic pool for rotating suggestions - specific, engaging topics
const COLLECTION_TOPIC_POOL = [
  // TV Shows & Entertainment
  { label: "Squid Game", icon_slug: "tv" },
  { label: "House of the Dragon", icon_slug: "dragon" },
  { label: "Wednesday", icon_slug: "gothic" },
  { label: "The Last of Us", icon_slug: "zombie" },
  
  // Trending & Pop Culture
  { label: "Taylor Swift", icon_slug: "music" },
  { label: "Marvel ფილმები", icon_slug: "superhero" },
  { label: "K-Pop", icon_slug: "star" },
  { label: "TikTok ტრენდები", icon_slug: "phone" },
  
  // Facts & Knowledge
  { label: "უცნაური ფაქტები", icon_slug: "lightbulb" },
  { label: "კოსმოსის საიდუმლოებები", icon_slug: "rocket" },
  { label: "ცხოველთა სამყარო", icon_slug: "paw" },
  { label: "ადამიანის სხეული", icon_slug: "heart" },
  
  // Georgian Topics  
  { label: "ქართული კინო", icon_slug: "film" },
  { label: "თბილისის ისტორია", icon_slug: "castle" },
  { label: "ქართული სამზარეულო", icon_slug: "food" },
  { label: "საქართველოს ბუნება", icon_slug: "mountain" },
  
  // Sports Specific
  { label: "Champions League", icon_slug: "trophy" },
  { label: "NBA ვარსკვლავები", icon_slug: "basketball" },
  { label: "ფორმულა 1", icon_slug: "car" },
  { label: "ოლიმპიური თამაშები", icon_slug: "medal" },
  
  // Science & Tech
  { label: "AI და რობოტები", icon_slug: "robot" },
  { label: "iPhone vs Android", icon_slug: "phone" },
  { label: "Video Games", icon_slug: "gamepad" },
  { label: "Social Media", icon_slug: "share" },
];

const COVER_GRADIENTS = [
  "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)",
  "linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)",
  "linear-gradient(135deg, #F97316 0%, #EF4444 100%)",
  "linear-gradient(135deg, #10B981 0%, #34D399 100%)",
  "linear-gradient(135deg, #6366F1 0%, #8B5B95 100%)",
  "linear-gradient(135deg, #F59E0B 0%, #F97316 100%)",
];

const DEFAULT_QUESTIONS_PER_ROUND = 5;

export function CreateCollectionModal({ open, onOpenChange, onCollectionCreated, draftId, initialRoundSubject }: CreateCollectionModalProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [step, setStep] = useState(1);
  const [creatorMode, setCreatorMode] = useState<CreatorMode>(null);
  const [title, setTitle] = useState("");
  const [coverGradient] = useState(COVER_GRADIENTS[0]);
  const [isPublic, setIsPublic] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [showRoundSettings, setShowRoundSettings] = useState(false);
  
  // Step 2: Round names
  const [roundNames, setRoundNames] = useState<string[]>(["", ""]);
  
  // Step 3: Generation progress
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<{current: number; total: number; currentRound: string}>({ current: 0, total: 0, currentRound: "" });
  
  // Step 4: Editor state
  const [rounds, setRounds] = useState<CollectionRound[]>([]);
  const [roundQuestions, setRoundQuestions] = useState<EditorQuestion[][]>([]);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  
  // Rotating topic suggestions
  const [topicSuggestions, setTopicSuggestions] = useState<string[]>([]);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  
  // Load specific draft if draftId provided
  useEffect(() => {
    if (draftId && open) {
      loadDraft(draftId);
    }
  }, [draftId, open]);

  // Reset when modal opens without draft
  useEffect(() => {
    if (open && !draftId) {
      resetForm();
      // If coming from trivia modal with initial subject, set it
      if (initialRoundSubject) {
        setRoundNames([initialRoundSubject, ""]);
      }
    }
  }, [open, draftId, initialRoundSubject]);
  
  // Initialize and rotate topic suggestions
  useEffect(() => {
    if (open) {
      const shuffled = shuffleArray(COLLECTION_TOPIC_POOL);
      setTopicSuggestions(shuffled.map(t => t.label));
      setSuggestionIndex(0);
      
      const interval = setInterval(() => {
        setSuggestionIndex(prev => (prev + 4) % shuffled.length);
      }, 4000);
      
      return () => clearInterval(interval);
    }
  }, [open]);

  const loadDraft = async (id: string) => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("collection_drafts")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    
    if (error || !data) {
      toast.error("დრაფტის ჩატვირთვა ვერ მოხერხდა");
      return;
    }
    
    setCurrentDraftId(id);
    setTitle(data.title || "");
    setIsPublic(data.is_public ?? true);
    
    if (data.rounds_config) {
      const config = data.rounds_config as unknown as CollectionRound[];
      setRounds(config);
      setRoundNames(config.map(r => r.subject));
    }
    
    // Load saved questions if available
    if (data.generated_data && (data.generated_data as any).roundQuestions) {
      setRoundQuestions((data.generated_data as any).roundQuestions);
      setCreatorMode("edit"); // Assume edit mode for drafts
      setStep(4); // Go directly to editor
    }
    
    toast.success("დრაფტი ჩაიტვირთა");
  };

  const resetForm = () => {
    setStep(1);
    setCreatorMode(null);
    setTitle("");
    setIsPublic(false);
    setRoundNames(["", ""]);
    setRounds([]);
    setRoundQuestions([]);
    setIsPosting(false);
    setCurrentDraftId(null);
    setCurrentRoundIndex(0);
    setShowRoundSettings(false);
    setIsGenerating(false);
    setGenerationProgress({ current: 0, total: 0, currentRound: "" });
  };

  const handleClose = async () => {
    // Auto-save draft if there's content in editor
    const hasContent = roundQuestions.some(rq => rq.some(q => q.question.trim().length > 0));
    
    if (user && hasContent && !isPosting && step === 4) {
      try {
        const draftData = {
          user_id: user.id,
          title: title || null,
          description: null,
          cover_image: null,
          cover_gradient: coverGradient,
          is_public: isPublic,
          rounds_config: rounds as unknown as any,
          generated_data: { roundQuestions } as unknown as any,
        };

        if (currentDraftId) {
          await supabase
            .from("collection_drafts")
            .update(draftData)
            .eq("id", currentDraftId);
        } else {
          await supabase
            .from("collection_drafts")
            .insert([draftData]);
        }
        
        queryClient.invalidateQueries({ queryKey: ["collection-drafts"] });
        toast.success("დრაფტი ავტომატურად შეინახა");
      } catch (error) {
        console.error("Auto-save failed:", error);
      }
    }
    
    resetForm();
    onOpenChange(false);
  };

  // Round name management
  const addRoundName = () => {
    if (roundNames.length < 5) {
      setRoundNames([...roundNames, ""]);
    }
  };

  const removeRoundName = (index: number) => {
    if (roundNames.length > 1) {
      setRoundNames(roundNames.filter((_, i) => i !== index));
    }
  };

  const updateRoundName = (index: number, value: string) => {
    const updated = [...roundNames];
    updated[index] = value;
    setRoundNames(updated);
  };

  // Check if we can proceed to generation
  const canGenerate = roundNames.filter(name => name.trim()).length >= 1;

  // Generate questions for all rounds
  const generateAllRounds = async () => {
    const validRounds = roundNames.filter(name => name.trim());
    if (validRounds.length === 0) return;

    setIsGenerating(true);
    setStep(3);
    setGenerationProgress({ current: 0, total: validRounds.length, currentRound: validRounds[0] });

    const generatedRounds: CollectionRound[] = [];
    const allQuestions: EditorQuestion[][] = [];

    try {
      for (let i = 0; i < validRounds.length; i++) {
        const roundName = validRounds[i];
        setGenerationProgress({ current: i, total: validRounds.length, currentRound: roundName });

        const { data, error } = await supabase.functions.invoke("generate-custom-quiz", {
          body: { 
            subject: roundName, 
            questionCount: DEFAULT_QUESTIONS_PER_ROUND, 
            answerFormat: "4_answers", 
            difficulty: "mixed" 
          },
        });

        // Check for FunctionsHttpError (422, 500, etc.)
        if (error) {
          const errorMessage = error.message || `რაუნდი "${roundName}" ვერ დაგენერირდა`;
          throw new Error(errorMessage);
        }

        // Also check for error in the data itself (edge function error response)
        if (data?.error) {
          throw new Error(`რაუნდი "${roundName}": ${data.error}`);
        }

        const generatedQuestions = data?.questions || [];
        if (!generatedQuestions.length) {
          throw new Error(`კითხვები ვერ დაგენერირდა: ${roundName}`);
        }

        generatedRounds.push({
          subject: roundName,
          questionCount: DEFAULT_QUESTIONS_PER_ROUND,
          answerFormat: "4_answers",
          difficulty: "mixed"
        });

        allQuestions.push(convertToEditorQuestions(generatedQuestions));
      }

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      setRounds(generatedRounds);
      setRoundQuestions(allQuestions);
      setTitle(validRounds.length > 1 ? `${validRounds[0]} & ${validRounds.length - 1} სხვა` : validRounds[0]);
      
      setTimeout(() => setStep(4), 300);
    } catch (error) {
      console.error("Error generating quiz:", error);
      toast.error(error instanceof Error ? error.message : "კითხვების გენერაცია ვერ მოხერხდა");
      setStep(2);
    } finally {
      setIsGenerating(false);
    }
  };

  // Editor handlers
  const addRound = () => {
    if (rounds.length < 5) {
      const newRoundNum = rounds.length + 1;
      setRounds([...rounds, { 
        subject: `რაუნდი ${newRoundNum}`, 
        questionCount: 5, 
        answerFormat: "4_answers", 
        difficulty: "mixed" 
      }]);
      setRoundQuestions([...roundQuestions, [createEmptyQuestion("4_answers")]]);
      setCurrentRoundIndex(rounds.length);
      toast.success(`რაუნდი ${newRoundNum} დაემატა`);
    }
  };

  const removeRound = (index: number) => {
    if (rounds.length > 1) {
      setRounds(rounds.filter((_, i) => i !== index));
      setRoundQuestions(roundQuestions.filter((_, i) => i !== index));
      if (currentRoundIndex >= rounds.length - 1) {
        setCurrentRoundIndex(Math.max(0, currentRoundIndex - 1));
      }
      toast.success("რაუნდი წაიშალა");
    }
  };

  const handleRoundChange = (newIndex: number) => {
    if (newIndex === currentRoundIndex) return;
    setCurrentRoundIndex(newIndex);
  };

  const handleQuestionsChange = (newQuestions: EditorQuestion[]) => {
    const updated = [...roundQuestions];
    updated[currentRoundIndex] = newQuestions;
    setRoundQuestions(updated);
  };

  const validateAllQuestions = (): boolean => {
    for (let roundIdx = 0; roundIdx < roundQuestions.length; roundIdx++) {
      const questions = roundQuestions[roundIdx];
      for (let qIdx = 0; qIdx < questions.length; qIdx++) {
        const q = questions[qIdx];
        if (!q.question.trim()) {
          toast.error(`რაუნდი ${roundIdx + 1}, კითხვა ${qIdx + 1}: კითხვა არ არის შევსებული`);
          setCurrentRoundIndex(roundIdx);
          return false;
        }
        for (const answer of q.answers) {
          if (!answer.text.trim()) {
            toast.error(`რაუნდი ${roundIdx + 1}, კითხვა ${qIdx + 1}: პასუხი არ არის შევსებული`);
            setCurrentRoundIndex(roundIdx);
            return false;
          }
        }
      }
    }
    return true;
  };

  const handlePublish = async () => {
    if (!user) return;
    if (!validateAllQuestions()) return;

    setIsPosting(true);

    try {
      const { data: collection, error: collectionError } = await supabase
        .from("quiz_collections")
        .insert({
          user_id: user.id,
          title: title || `კოლექცია: ${rounds.map(r => r.subject).join(", ")}`,
          description: null,
          cover_gradient: coverGradient,
          cover_image: null,
          is_public: isPublic,
        })
        .select()
        .single();

      if (collectionError) throw collectionError;

      for (let i = 0; i < rounds.length; i++) {
        const round = rounds[i];
        const questions = roundQuestions[i];
        const convertedQuestions = convertToGeneratedQuestions(questions).map(q => ({
          ...q,
          difficulty: round.difficulty || "medium",
          icon_slug: q.icon_slug || null,
        }));
        
        const { error: postError } = await supabase
          .from("user_quiz_posts")
          .insert([{
            user_id: user.id,
            title: round.subject,
            subject: round.subject,
            questions: convertedQuestions as unknown as any,
            question_count: questions.length,
            answer_format: round.answerFormat,
            cover_gradient: coverGradient,
            cover_image: null,
            is_public: isPublic,
            collection_id: collection.id,
            round_number: i + 1,
            is_blind: creatorMode === "play", // Track if creator saw answers
          }]);

        if (postError) throw postError;
      }

      if (currentDraftId) {
        await supabase
          .from("collection_drafts")
          .delete()
          .eq("id", currentDraftId);
      }

      toast.success("კოლექცია წარმატებით გამოქვეყნდა!");
      queryClient.invalidateQueries({ queryKey: ["my-quiz-posts"] });
      queryClient.invalidateQueries({ queryKey: ["my-collections"] });
      queryClient.invalidateQueries({ queryKey: ["quiz-posts-with-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["collection-drafts"] });
      onCollectionCreated?.();
      handleClose();
    } catch (error: any) {
      console.error("Error publishing collection:", error);
      toast.error(error.message || "გამოქვეყნება ვერ მოხერხდა");
    } finally {
      setIsPosting(false);
    }
  };

  // Save for play mode
  const handleSaveAndStartGame = async () => {
    if (!user) return;

    setIsPosting(true);

    try {
      const { data: collection, error: collectionError } = await supabase
        .from("quiz_collections")
        .insert({
          user_id: user.id,
          title: title || `კოლექცია: ${rounds.map(r => r.subject).join(", ")}`,
          description: null,
          cover_gradient: coverGradient,
          cover_image: null,
          is_public: false, // Private by default for play mode
        })
        .select()
        .single();

      if (collectionError) throw collectionError;

      for (let i = 0; i < rounds.length; i++) {
        const round = rounds[i];
        const questions = roundQuestions[i];
        const convertedQuestions = convertToGeneratedQuestions(questions).map(q => ({
          ...q,
          difficulty: round.difficulty || "medium",
          icon_slug: q.icon_slug || null,
        }));
        
        const { error: postError } = await supabase
          .from("user_quiz_posts")
          .insert([{
            user_id: user.id,
            title: round.subject,
            subject: round.subject,
            questions: convertedQuestions as unknown as any,
            question_count: questions.length,
            answer_format: round.answerFormat,
            cover_gradient: coverGradient,
            cover_image: null,
            is_public: false,
            collection_id: collection.id,
            round_number: i + 1,
            is_blind: true, // Creator never saw answers (play mode)
          }]);

        if (postError) throw postError;
      }

      if (currentDraftId) {
        await supabase
          .from("collection_drafts")
          .delete()
          .eq("id", currentDraftId);
      }

      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.5 }
      });

      toast.success("მზადაა! კოლექცია შენახულია თამაშისთვის");
      queryClient.invalidateQueries({ queryKey: ["my-quiz-posts"] });
      queryClient.invalidateQueries({ queryKey: ["my-collections"] });
      queryClient.invalidateQueries({ queryKey: ["my-trivias-for-room"] });
      queryClient.invalidateQueries({ queryKey: ["collection-drafts"] });
      onCollectionCreated?.();
      handleClose();
    } catch (error: any) {
      console.error("Error saving collection:", error);
      toast.error(error.message || "შენახვა ვერ მოხერხდა");
    } finally {
      setIsPosting(false);
    }
  };

  const currentQuestions = roundQuestions[currentRoundIndex] || [];
  const currentRound = rounds[currentRoundIndex];

  // Round tabs header for editor
  const roundTabsHeader = (
    <div className="px-4 pb-2">
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {rounds.map((round, index) => (
          <button
            key={index}
            onClick={() => handleRoundChange(index)}
            className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
              currentRoundIndex === index
                ? "bg-emerald-500 text-white shadow-lg"
                : "bg-white/30 text-white hover:bg-white/40"
            }`}
          >
            {round.subject || `Round ${index + 1}`}
          </button>
        ))}
        {rounds.length < 5 && (
          <button
            onClick={addRound}
            className="p-2 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
        <button
          onClick={() => setShowRoundSettings(true)}
          className="p-2 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors ml-auto"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
      <div className="flex justify-center gap-1.5 mt-2">
        {rounds.map((_, index) => (
          <div
            key={index}
            className={`h-2.5 w-2.5 rounded-full transition-all ${
              currentRoundIndex === index ? "bg-white" : "bg-white/40"
            }`}
          />
        ))}
      </div>
    </div>
  );

  // Round settings modal
  const renderRoundSettings = () => (
    <AnimatePresence>
      {showRoundSettings && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowRoundSettings(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#5B21B6] rounded-2xl p-5 w-full max-w-sm space-y-4"
          >
            <h3 className="text-lg font-bold text-white text-center">რაუნდის პარამეტრები</h3>
            
            <div>
              <label className="text-sm text-white/80 mb-2 block">სახელი</label>
              <Input
                value={currentRound?.subject || ""}
                onChange={(e) => {
                  const updated = [...rounds];
                  updated[currentRoundIndex] = { ...updated[currentRoundIndex], subject: e.target.value };
                  setRounds(updated);
                }}
                placeholder="რაუნდის სახელი"
                className="bg-white/95 border-0 text-slate-800"
              />
            </div>

            <div>
              <label className="text-sm text-white/80 mb-2 block">სირთულე</label>
              <div className="flex gap-2">
                {[
                  { value: "mixed" as const, emoji: "🎲" },
                  { value: "easy" as const, emoji: "🟢" },
                  { value: "medium" as const, emoji: "🟡" },
                  { value: "hard" as const, emoji: "🔴" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      const updated = [...rounds];
                      updated[currentRoundIndex] = { ...updated[currentRoundIndex], difficulty: opt.value };
                      setRounds(updated);
                    }}
                    className={`flex-1 py-3 rounded-xl text-2xl transition-all ${
                      currentRound?.difficulty === opt.value
                        ? "bg-white shadow-lg"
                        : "bg-white/20 hover:bg-white/30"
                    }`}
                  >
                    {opt.emoji}
                  </button>
                ))}
              </div>
            </div>

            {rounds.length > 1 && (
              <button
                onClick={() => {
                  removeRound(currentRoundIndex);
                  setShowRoundSettings(false);
                }}
                className="w-full py-3 rounded-xl bg-red-500/20 text-red-300 font-medium flex items-center justify-center gap-2 hover:bg-red-500/30 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                რაუნდის წაშლა
              </button>
            )}

            <button
              onClick={() => setShowRoundSettings(false)}
              className="w-full py-3 rounded-xl bg-white text-[#6B5B95] font-bold"
            >
              დახურვა
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const handleModeSelect = (mode: CreatorMode) => {
    setCreatorMode(mode);
    setStep(2);
  };

  // Calculate total questions for summary
  const totalQuestions = roundQuestions.reduce((sum, rq) => sum + rq.length, 0);

  if (!open) return null;

  // Step 4: Question Editor or Play Mode Summary
  if (step === 4) {
    // Play mode: show summary
    if (creatorMode === "play") {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50"
          style={{ background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 50%, #4C1D95 100%)" }}
        >
          {/* Header */}
          <div className="fixed top-0 left-0 right-0 z-50 safe-top">
            <div className="max-w-[700px] md:max-w-[520px] mx-auto w-full flex items-center justify-between px-4 py-3">
              <button 
                onClick={handleClose} 
                className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
              
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 rounded-full">
                <Users className="w-4 h-4 text-white" />
                <span className="text-xs font-semibold text-white">თამაში</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="h-full overflow-y-auto pt-[60px] pb-24">
            <div className="max-w-[700px] md:max-w-[520px] mx-auto w-full p-5">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Success header */}
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", duration: 0.6 }}
                    className="inline-flex items-center justify-center w-20 h-20 mb-4 rounded-full bg-emerald-500/30"
                  >
                    <Check className="w-10 h-10 text-emerald-400" />
                  </motion.div>
                  <h3 className="text-2xl font-bold text-white mb-2">კოლექცია მზადაა!</h3>
                  <p className="text-white/70">პასუხები დამალულია - ითამაშე მეგობრებთან</p>
                </div>

                {/* Summary */}
                <div className="p-4 rounded-xl bg-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white/70">რაუნდები</span>
                    <span className="text-white font-bold">{rounds.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/70">სულ კითხვები</span>
                    <span className="text-white font-bold">{totalQuestions}</span>
                  </div>
                  <div className="border-t border-white/20 pt-3 space-y-1.5">
                    {rounds.map((round, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-white/80">{round.subject}</span>
                        <span className="text-white/60">{roundQuestions[i]?.length || 0} კითხვა</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Title input */}
                <div className="space-y-2">
                  <label className="text-sm text-white/80 block text-center">სათაური</label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="კოლექციის სათაური..."
                    className="text-center text-lg h-14 rounded-xl bg-white/95 text-slate-800 placeholder:text-slate-400 border-0"
                  />
                </div>

                {/* Save button */}
                <ChunkyButton
                  onClick={handleSaveAndStartGame}
                  disabled={isPosting || !title.trim()}
                  className="w-full"
                  style={{ marginBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
                >
                  {isPosting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      ინახება...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 mr-2" />
                      შეინახე
                    </>
                  )}
                </ChunkyButton>
              </motion.div>
            </div>
          </div>
        </motion.div>
      );
    }

    // Edit mode: show editor
    return (
      <>
        <GameStyleQuestionEditor
          questions={currentQuestions}
          onQuestionsChange={handleQuestionsChange}
          title={title || "კოლექცია"}
          onTitleChange={setTitle}
          onSave={handlePublish}
          onBack={handleClose}
          saveButtonText={isPosting ? "ინახება..." : "შენახვა"}
          showTitleEditor={true}
          subject={currentRound?.subject || "კოლექცია"}
          answerFormat={currentRound?.answerFormat || "4_answers"}
          headerContent={roundTabsHeader}
          isSaving={isPosting}
          isPublic={isPublic}
          onPublicChange={setIsPublic}
        />
        {renderRoundSettings()}
      </>
    );
  }

  // Step 1: Mode Selection
  // Step 2: Round Names Entry
  // Step 3: Generation Progress
  return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50"
        style={{ background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 50%, #4C1D95 100%)" }}
      >
        {/* Header */}
        <div className="fixed top-0 left-0 right-0 z-50 safe-top">
          <div className="max-w-[700px] md:max-w-[520px] mx-auto w-full flex items-center justify-between px-4 py-3">
            <button 
              onClick={step === 1 ? handleClose : () => setStep(step - 1)} 
              className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
              disabled={isGenerating}
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            
            <div className="flex items-center gap-1.5">
              {[1, 2, 3].map((dot) => (
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

        {/* Content */}
        <div className="h-full overflow-y-auto pt-[60px] pb-24">
          <div className="max-w-[700px] md:max-w-[520px] mx-auto w-full p-5">
            <AnimatePresence>
              {/* Step 1: Mode Selection */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center mb-4">
                      <img src={iconCollections} alt="Create Collection" className="w-16 h-16 object-contain" />
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
                </motion.div>
              )}

              {/* Step 2: Round Names */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-5"
                >
                   {/* Header - dynamic based on round count */}
                   <div className="text-center">
                     <div className="inline-flex items-center justify-center mb-4">
                       <img 
                         src={roundNames.filter(n => n.trim()).length <= 1 ? triviaBuzzer : iconCollections} 
                         alt="Create" 
                         className="w-16 h-16 object-contain" 
                       />
                     </div>
                     <h3 className="text-2xl font-bold text-white mb-2">
                       {roundNames.filter(n => n.trim()).length <= 1 ? t("extra.createTriviaTitle2") : t("extra.createCollectionTitle2")}
                     </h3>
                     <p className="text-white/70">
                       {roundNames.filter(n => n.trim()).length <= 1 
                         ? t("extra.writeTopicSingle") 
                         : t("extra.writeTopicsMulti")}
                     </p>
                   </div>

                  {/* Round name inputs */}
                  <div className="space-y-3">
                    {roundNames.map((name, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center gap-3"
                      >
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold flex-shrink-0">
                          {index + 1}
                        </div>
                        <Input
                          value={name}
                          onChange={(e) => updateRoundName(index, e.target.value)}
                          placeholder={`${t("extra.exSport")}${index === 0 ? "" : index === 1 ? `, ${t("extra.exMusic")}` : `, ${t("extra.exMovies")}`}`}
                          className="flex-1 h-12 text-base rounded-xl border-0 bg-white/95 text-slate-800 placeholder:text-slate-400"
                        />
                        {roundNames.length > 1 && (
                          <button
                            onClick={() => removeRoundName(index)}
                            className="w-10 h-10 rounded-full bg-white/20 hover:bg-red-500/50 flex items-center justify-center text-white transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </motion.div>
                    ))}
                  </div>

                  {/* Rotating topic suggestions */}
                  <div className="space-y-2">
                    <span className="text-sm text-white/70">💡 {t("extra.ideasLabel2")}</span>
                    <div className="flex flex-wrap gap-2">
                      <AnimatePresence mode="popLayout">
                        {topicSuggestions.slice(suggestionIndex, suggestionIndex + 4).map((topic) => (
                          <motion.button
                            key={topic}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => {
                              // Find first empty round or add new round
                              const emptyIndex = roundNames.findIndex(n => !n.trim());
                              if (emptyIndex !== -1) {
                                updateRoundName(emptyIndex, topic);
                              } else if (roundNames.length < 5) {
                                setRoundNames([...roundNames, topic]);
                              }
                            }}
                            className="px-4 py-2 rounded-full text-sm font-medium bg-white/20 text-white hover:bg-white/30 transition-colors"
                          >
                            {topic}
                          </motion.button>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* AI info text */}
                   <p className="text-sm text-white/80 text-center">
                    ✨ {t("extra.aiWillGenerate2", { count: DEFAULT_QUESTIONS_PER_ROUND })}
                  </p>

                  {/* Add round button */}
                  {roundNames.length < 5 && (
                    <button
                      onClick={addRoundName}
                      className="w-full py-3 rounded-xl bg-white/20 text-white font-medium flex items-center justify-center gap-2 hover:bg-white/30 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                      {t("extra.addRoundBtn2")}
                    </button>
                  )}

                  {/* Generate button */}
                  <ChunkyButton
                    variant="whitePurple"
                    onClick={generateAllRounds}
                    disabled={!canGenerate}
                    className="w-full"
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    {t("extra.generateBtnLabel")}
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </ChunkyButton>
                </motion.div>
              )}

              {/* Step 3: Generation Progress */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  {/* Header */}
                  <div className="text-center">
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
                      transition={{ type: "spring", duration: 0.6 }}
                      className="inline-flex items-center justify-center w-24 h-24 mb-4 rounded-full bg-white/20 backdrop-blur-sm"
                    >
                      <Sparkles className="w-12 h-12 text-white" />
                    </motion.div>
                    <h3 className="text-2xl font-bold text-white mb-2">იქმნება კითხვები...</h3>
                    <p className="text-white/70">{generationProgress.currentRound}</p>
                  </div>

                  {/* Progress */}
                  <div className="space-y-4">
                    {roundNames.filter(n => n.trim()).map((name, index) => {
                      const isComplete = index < generationProgress.current;
                      const isCurrent = index === generationProgress.current;
                      
                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className={`flex items-center gap-4 p-4 rounded-xl ${
                            isComplete 
                              ? "bg-emerald-500/30" 
                              : isCurrent 
                              ? "bg-white/20" 
                              : "bg-white/10"
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                            isComplete 
                              ? "bg-emerald-500 text-white" 
                              : isCurrent 
                              ? "bg-white text-[#6B5B95]" 
                              : "bg-white/20 text-white/60"
                          }`}>
                            {isComplete ? (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring" }}
                              >
                                ✓
                              </motion.span>
                            ) : (
                              index + 1
                            )}
                          </div>
                          <div className="flex-1">
                            <p className={`font-medium ${isComplete || isCurrent ? "text-white" : "text-white/60"}`}>
                              {name}
                            </p>
                            <p className={`text-sm ${isComplete ? "text-emerald-300" : isCurrent ? "text-white/70" : "text-white/40"}`}>
                              {isComplete ? "მზადაა ✨" : isCurrent ? "გენერირება..." : "იცდის..."}
                            </p>
                          </div>
                          {isCurrent && (
                            <Loader2 className="w-5 h-5 text-white animate-spin" />
                          )}
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Overall progress bar */}
                  <div className="space-y-2">
                    <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-white"
                        initial={{ width: 0 }}
                        animate={{ 
                          width: `${((generationProgress.current + 0.5) / generationProgress.total) * 100}%` 
                        }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                    <p className="text-center text-sm text-white/60">
                      {generationProgress.current}/{generationProgress.total} რაუნდი
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
    </motion.div>
  );
}
