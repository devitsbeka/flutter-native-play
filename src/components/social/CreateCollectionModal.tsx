import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Loader2, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { GameStyleQuestionEditor, convertToGeneratedQuestions, EditorQuestion, createEmptyQuestion } from "./GameStyleQuestionEditor";

type DifficultyLevel = "mixed" | "easy" | "medium" | "hard";

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
}

const COVER_GRADIENTS = [
  "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)",
  "linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)",
  "linear-gradient(135deg, #F97316 0%, #EF4444 100%)",
  "linear-gradient(135deg, #10B981 0%, #34D399 100%)",
  "linear-gradient(135deg, #6366F1 0%, #8B5B95 100%)",
  "linear-gradient(135deg, #F59E0B 0%, #F97316 100%)",
];

export function CreateCollectionModal({ open, onOpenChange, onCollectionCreated, draftId }: CreateCollectionModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [title, setTitle] = useState("");
  const [coverGradient, setCoverGradient] = useState(COVER_GRADIENTS[0]);
  const [isPublic, setIsPublic] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [showRoundSettings, setShowRoundSettings] = useState(false);
  
  // Rounds configuration
  const [rounds, setRounds] = useState<CollectionRound[]>([
    { subject: "რაუნდი 1", questionCount: 5, answerFormat: "4_answers", difficulty: "mixed" }
  ]);
  
  // Questions per round - array of EditorQuestion arrays
  const [roundQuestions, setRoundQuestions] = useState<EditorQuestion[][]>([
    [createEmptyQuestion("4_answers")]
  ]);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  
  // Initialize when modal opens
  useEffect(() => {
    if (open && roundQuestions.length === 0) {
      setRoundQuestions([[createEmptyQuestion("4_answers")]]);
      setRounds([{ subject: "რაუნდი 1", questionCount: 5, answerFormat: "4_answers", difficulty: "mixed" }]);
    }
  }, [open]);
  
  // Load specific draft if draftId provided
  useEffect(() => {
    if (draftId && open) {
      loadDraft(draftId);
    }
  }, [draftId, open]);

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
      setRounds(data.rounds_config as unknown as CollectionRound[]);
    }
    
    // Load saved questions if available
    if (data.generated_data && (data.generated_data as any).roundQuestions) {
      setRoundQuestions((data.generated_data as any).roundQuestions);
    }
    
    toast.success("დრაფტი ჩაიტვირთა");
  };

  const resetForm = () => {
    setTitle("");
    setIsPublic(true);
    setRounds([{ subject: "რაუნდი 1", questionCount: 5, answerFormat: "4_answers", difficulty: "mixed" }]);
    setRoundQuestions([[createEmptyQuestion("4_answers")]]);
    setIsPosting(false);
    setCurrentDraftId(null);
    setCurrentRoundIndex(0);
    setShowRoundSettings(false);
  };

  const handleClose = async () => {
    // Auto-save draft if there's content
    const hasContent = roundQuestions.some(rq => rq.some(q => q.question.trim().length > 0));
    
    if (user && hasContent && !isPosting) {
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

  // Handle round switching
  const handleRoundChange = (newIndex: number) => {
    if (newIndex === currentRoundIndex) return;
    setCurrentRoundIndex(newIndex);
  };

  // Handle questions change for current round
  const handleQuestionsChange = (newQuestions: EditorQuestion[]) => {
    const updated = [...roundQuestions];
    updated[currentRoundIndex] = newQuestions;
    setRoundQuestions(updated);
  };

  // Validate all questions before publishing
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
      // Create the collection
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

      // Insert all quiz posts for each round
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
          }]);

        if (postError) throw postError;
      }

      // Delete draft if exists
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

  // Get current round's questions
  const currentQuestions = roundQuestions[currentRoundIndex] || [];
  const currentRound = rounds[currentRoundIndex];

  // Render round tabs as header content
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
            Round {index + 1}
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
      </div>
      {/* Dots indicator */}
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
            className="bg-[#6B5B95] rounded-2xl p-5 w-full max-w-sm space-y-4"
          >
            <h3 className="text-lg font-bold text-white text-center">რაუნდის პარამეტრები</h3>
            
            {/* Round Name */}
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

            {/* Difficulty */}
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

            {/* Delete Round */}
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

  if (!open) return null;

  return (
    <>
      <GameStyleQuestionEditor
        questions={currentQuestions}
        onQuestionsChange={handleQuestionsChange}
        title={title || "კოლექცია"}
        onTitleChange={setTitle}
        onSave={handlePublish}
        onBack={handleClose}
        saveButtonText={isPosting ? "იქვეყნება..." : "გამოქვეყნება"}
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
