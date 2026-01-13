import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Loader2, Sparkles, ChevronLeft, Save, CheckCircle2 } from "lucide-react";
import iconCollections from "@/assets/icon-collections.png";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { GameStyleQuestionEditor, convertToEditorQuestions, convertToGeneratedQuestions, EditorQuestion } from "./GameStyleQuestionEditor";
import { ChunkyButton } from "@/components/ui/chunky-button";

type DifficultyLevel = "mixed" | "easy" | "medium" | "hard";

interface CollectionRound {
  subject: string;
  questionCount: number;
  answerFormat: "4_answers" | "true_false";
  difficulty: DifficultyLevel;
}

interface GeneratedQuestion {
  question_text: string;
  correct_answer: string;
  incorrect_answers: string[];
  difficulty: string;
  icon_slug: string | null;
}

interface GeneratedRound {
  subject: string;
  title: string;
  questions: GeneratedQuestion[];
  answerFormat: string;
}

interface GeneratedData {
  coverImage: string | null;
  coverGenerationCount: number;
  rounds: GeneratedRound[];
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
  "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)",
  "linear-gradient(135deg, #F59E0B 0%, #F97316 100%)",
  "radial-gradient(ellipse 120% 80% at 20% 30%, rgba(139,92,246,0.8) 0%, transparent 50%), radial-gradient(ellipse 100% 120% at 80% 70%, rgba(236,72,153,0.7) 0%, transparent 50%), linear-gradient(135deg, #4C1D95 0%, #831843 100%)",
  "radial-gradient(ellipse 80% 100% at 70% 20%, rgba(59,130,246,0.8) 0%, transparent 45%), radial-gradient(ellipse 100% 80% at 20% 80%, rgba(6,182,212,0.7) 0%, transparent 45%), linear-gradient(150deg, #1E3A8A 0%, #0E7490 100%)",
];

export function CreateCollectionModal({ open, onOpenChange, onCollectionCreated, draftId }: CreateCollectionModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverGradient, setCoverGradient] = useState(COVER_GRADIENTS[0]);
  const [isPublic, setIsPublic] = useState(true);
  const [rounds, setRounds] = useState<CollectionRound[]>([
    { subject: "", questionCount: 5, answerFormat: "4_answers", difficulty: "mixed" }
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0, status: "" });
  const [isPosting, setIsPosting] = useState(false);
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [lastAutoSaved, setLastAutoSaved] = useState<Date | null>(null);
  
  // Generated data for Step 3
  const [generatedData, setGeneratedData] = useState<GeneratedData | null>(null);
  const [expandedQuestion, setExpandedQuestion] = useState<{ roundIdx: number; questionIdx: number } | null>(null);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [editorQuestions, setEditorQuestions] = useState<EditorQuestion[]>([]);
  
  // Load specific draft if draftId provided
  useEffect(() => {
    if (draftId && open) {
      loadDraft(draftId);
    }
  }, [draftId, open]);

  // Auto-save every 30 seconds during creation (simplified - uses saveDraftNow)
  useEffect(() => {
    if (!open || !user || isGenerating || isPosting) return;
    
    const hasContent = rounds.some(r => r.subject.trim().length > 0) || title.trim().length > 0 || generatedData;
    if (!hasContent) return;

    const interval = setInterval(async () => {
      // Inline save logic since saveDraftNow may not be defined yet
      try {
        const draftData = {
          user_id: user.id,
          title: title || null,
          description: description || null,
          cover_image: generatedData?.coverImage || null,
          cover_gradient: coverGradient,
          is_public: isPublic,
          rounds_config: rounds as unknown as any,
          generated_data: generatedData as unknown as any,
        };

        if (currentDraftId) {
          const { error } = await supabase
            .from("collection_drafts")
            .update({ ...draftData, updated_at: new Date().toISOString() })
            .eq("id", currentDraftId);
          if (error) throw error;
          console.log("Auto-save updated draft:", currentDraftId);
        } else {
          const { data, error } = await supabase
            .from("collection_drafts")
            .insert([draftData])
            .select("id")
            .single();
          
          if (error) throw error;
          if (data) {
            setCurrentDraftId(data.id);
            console.log("Auto-save created draft:", data.id);
          }
        }
        
        setLastAutoSaved(new Date());
        queryClient.invalidateQueries({ queryKey: ["collection-drafts"] });
      } catch (error) {
        console.error("Auto-save failed:", error);
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [open, user, rounds, title, description, generatedData, isPublic, coverGradient, currentDraftId, isGenerating, isPosting, queryClient]);

  // Save immediately after generation completes
  useEffect(() => {
    if (!generatedData || !user || !open) return;
    
    const saveAfterGeneration = async () => {
      try {
        const draftData = {
          user_id: user.id,
          title: title || null,
          description: description || null,
          cover_image: generatedData?.coverImage || null,
          cover_gradient: coverGradient,
          is_public: isPublic,
          rounds_config: rounds as unknown as any,
          generated_data: generatedData as unknown as any,
        };

        if (currentDraftId) {
          await supabase
            .from("collection_drafts")
            .update({ ...draftData, updated_at: new Date().toISOString() })
            .eq("id", currentDraftId);
        } else {
          const { data } = await supabase
            .from("collection_drafts")
            .insert([draftData])
            .select("id")
            .single();
          
          if (data) {
            setCurrentDraftId(data.id);
          }
        }
        
        setLastAutoSaved(new Date());
        queryClient.invalidateQueries({ queryKey: ["collection-drafts"] });
      } catch (error) {
        console.error("Post-generation save failed:", error);
      }
    };

    saveAfterGeneration();
  }, [generatedData?.rounds.length]); // Only when generatedData.rounds changes

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
    setDescription(data.description || "");
    setIsPublic(data.is_public ?? true);
    
    if (data.rounds_config) {
      setRounds(data.rounds_config as unknown as CollectionRound[]);
    }
    
    if (data.generated_data) {
      setGeneratedData(data.generated_data as unknown as GeneratedData);
      setStep(3);
    }
    
    toast.success("დრაფტი ჩაიტვირთა");
  };

  const resetForm = () => {
    setStep(1);
    setTitle("");
    setDescription("");
    setIsPublic(true);
    setRounds([{ subject: "", questionCount: 5, answerFormat: "4_answers", difficulty: "mixed" }]);
    setIsGenerating(false);
    setGenerationProgress({ current: 0, total: 0, status: "" });
    setIsPosting(false);
    setGeneratedData(null);
    setExpandedQuestion(null);
    setIsGeneratingCover(false);
    setCurrentDraftId(null);
    setLastAutoSaved(null);
    setCurrentRoundIndex(0);
    setEditorQuestions([]);
  };

  const handleClose = async () => {
    // Auto-save draft if there's content to save
    const hasContent = rounds.some(r => r.subject.trim().length > 0) || title.trim().length > 0 || generatedData;
    
    if (user && hasContent && !isPosting) {
      try {
        const draftData = {
          user_id: user.id,
          title: title || null,
          description: description || null,
          cover_image: generatedData?.coverImage || null,
          cover_gradient: coverGradient,
          is_public: isPublic,
          rounds_config: rounds as unknown as any,
          generated_data: generatedData as unknown as any,
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
      setRounds([...rounds, { subject: "", questionCount: 5, answerFormat: "4_answers", difficulty: "mixed" }]);
    }
  };

  const removeRound = (index: number) => {
    if (rounds.length > 1) {
      setRounds(rounds.filter((_, i) => i !== index));
    }
  };

  const updateRound = (index: number, field: keyof CollectionRound, value: any) => {
    const updated = [...rounds];
    updated[index] = { ...updated[index], [field]: value };
    setRounds(updated);
  };

  const canProceed = rounds.every(r => r.subject.trim().length > 0);

  const saveDraftNow = async () => {
    if (!user) {
      console.warn("Cannot save draft: user not authenticated");
      return null;
    }
    
    try {
      const draftData = {
        user_id: user.id,
        title: title || null,
        description: description || null,
        cover_image: generatedData?.coverImage || null,
        cover_gradient: coverGradient,
        is_public: isPublic,
        rounds_config: rounds as unknown as any,
        generated_data: generatedData as unknown as any,
      };

      if (currentDraftId) {
        const { error } = await supabase
          .from("collection_drafts")
          .update({ ...draftData, updated_at: new Date().toISOString() })
          .eq("id", currentDraftId);
        
        if (error) throw error;
        console.log("Draft updated:", currentDraftId);
      } else {
        const { data, error } = await supabase
          .from("collection_drafts")
          .insert([draftData])
          .select("id")
          .single();
        
        if (error) throw error;
        if (data) {
          setCurrentDraftId(data.id);
          console.log("Draft created:", data.id);
        }
      }
      
      setLastAutoSaved(new Date());
      queryClient.invalidateQueries({ queryKey: ["collection-drafts"] });
      return currentDraftId;
    } catch (error) {
      console.error("Save draft failed:", error);
      toast.error("დრაფტის შენახვა ვერ მოხერხდა");
      return null;
    }
  };

  const handleGenerate = async () => {
    if (!user) return;

    // Save draft BEFORE generation starts
    const hasContent = rounds.some(r => r.subject.trim().length > 0);
    if (hasContent) {
      await saveDraftNow();
      toast.success("დრაფტი შეინახა");
    }

    setIsGenerating(true);
    setStep(2);
    setGenerationProgress({ current: 0, total: rounds.length + 1, status: "კითხვები" });

    try {
      const generatedRounds: GeneratedRound[] = [];

      // Generate questions for each round
      for (let i = 0; i < rounds.length; i++) {
        setGenerationProgress({ current: i + 1, total: rounds.length + 1, status: `რაუნდი ${i + 1}` });
        
        const round = rounds[i];
        
        const { data: quizData, error: genError } = await supabase.functions.invoke("generate-custom-quiz", {
          body: {
            subject: round.subject,
            questionCount: round.questionCount,
            answerFormat: round.answerFormat,
            difficulty: round.difficulty,
          },
        });

        if (genError) throw genError;

        generatedRounds.push({
          subject: round.subject,
          title: quizData.title || round.subject,
          questions: quizData.questions,
          answerFormat: round.answerFormat,
        });
      }

      // Generate cover image
      setGenerationProgress({ current: rounds.length + 1, total: rounds.length + 1, status: "გარეკანი" });
      
      let coverImageUrl: string | null = null;
      const subjects = rounds.map(r => r.subject).filter(Boolean).join(", ");
      
      try {
        const { data: coverData } = await supabase.functions.invoke("generate-cover-image", {
          body: {
            title: title || `კოლექცია: ${subjects}`,
            subject: subjects,
          },
        });
        
        if (coverData?.imageUrl) {
          coverImageUrl = coverData.imageUrl;
        }
      } catch (coverError) {
        console.error("Cover generation failed:", coverError);
      }

      // Set generated data and move to Step 3
      setGeneratedData({
        coverImage: coverImageUrl,
        coverGenerationCount: 1,
        rounds: generatedRounds,
      });
      
      // Auto-generate title if not set
      if (!title) {
        setTitle(subjects);
      }
      
      // Initialize editor questions with first round
      setCurrentRoundIndex(0);
      if (generatedRounds.length > 0) {
        setEditorQuestions(convertToEditorQuestions(generatedRounds[0].questions));
      }
      
      setStep(3);
    } catch (error: any) {
      console.error("Error generating collection:", error);
      toast.error(error.message || "კოლექციის გენერაცია ვერ მოხერხდა");
      setStep(1);
    } finally {
      setIsGenerating(false);
    }
  };

  const regenerateCover = async () => {
    if (!generatedData || generatedData.coverGenerationCount >= 3 || isGeneratingCover) return;
    
    setIsGeneratingCover(true);
    try {
      const subjects = rounds.map(r => r.subject).filter(Boolean).join(", ");
      const { data } = await supabase.functions.invoke("generate-cover-image", {
        body: { 
          title: title || `კოლექცია: ${subjects}`, 
          subject: subjects 
        },
      });
      
      if (data?.imageUrl) {
        setGeneratedData(prev => ({
          ...prev!,
          coverImage: data.imageUrl,
          coverGenerationCount: prev!.coverGenerationCount + 1,
        }));
        toast.success("ახალი გარეკანი შეიქმნა!");
      }
    } catch (error: any) {
      console.error("Error regenerating cover:", error);
      toast.error("გარეკანის გენერაცია ვერ მოხერხდა");
    } finally {
      setIsGeneratingCover(false);
    }
  };

  const updateGeneratedQuestion = (roundIdx: number, questionIdx: number, updates: Partial<GeneratedQuestion>) => {
    if (!generatedData) return;
    
    const newRounds = [...generatedData.rounds];
    newRounds[roundIdx] = {
      ...newRounds[roundIdx],
      questions: newRounds[roundIdx].questions.map((q, idx) => 
        idx === questionIdx ? { ...q, ...updates } : q
      ),
    };
    
    setGeneratedData({ ...generatedData, rounds: newRounds });
  };

  const updateIncorrectAnswer = (roundIdx: number, questionIdx: number, answerIdx: number, value: string) => {
    if (!generatedData) return;
    
    const newRounds = [...generatedData.rounds];
    const newIncorrectAnswers = [...newRounds[roundIdx].questions[questionIdx].incorrect_answers];
    newIncorrectAnswers[answerIdx] = value;
    
    newRounds[roundIdx] = {
      ...newRounds[roundIdx],
      questions: newRounds[roundIdx].questions.map((q, idx) => 
        idx === questionIdx ? { ...q, incorrect_answers: newIncorrectAnswers } : q
      ),
    };
    
    setGeneratedData({ ...generatedData, rounds: newRounds });
  };

  // Handle round switching - save current questions before switching
  const handleRoundChange = (newIndex: number) => {
    if (!generatedData || newIndex === currentRoundIndex) return;
    
    // Save current editor questions back to generatedData
    const updatedRounds = [...generatedData.rounds];
    const convertedQuestions = convertToGeneratedQuestions(editorQuestions).map(q => ({
      ...q,
      difficulty: q.difficulty || "medium",
      icon_slug: q.icon_slug || null,
    }));
    updatedRounds[currentRoundIndex] = {
      ...updatedRounds[currentRoundIndex],
      questions: convertedQuestions,
    };
    setGeneratedData({ ...generatedData, rounds: updatedRounds });
    
    // Load new round's questions into editor
    setCurrentRoundIndex(newIndex);
    setEditorQuestions(convertToEditorQuestions(generatedData.rounds[newIndex].questions));
  };

  // Handle editor questions change
  const handleEditorQuestionsChange = (newQuestions: EditorQuestion[]) => {
    setEditorQuestions(newQuestions);
    
    // Also update the generatedData in real-time
    if (generatedData) {
      const updatedRounds = [...generatedData.rounds];
      const convertedQuestions = convertToGeneratedQuestions(newQuestions).map(q => ({
        ...q,
        difficulty: q.difficulty || "medium",
        icon_slug: q.icon_slug || null,
      }));
      updatedRounds[currentRoundIndex] = {
        ...updatedRounds[currentRoundIndex],
        questions: convertedQuestions,
      };
      setGeneratedData({ ...generatedData, rounds: updatedRounds });
    }
  };

  // Sync editor questions back before publishing
  const syncEditorToGeneratedData = () => {
    if (!generatedData) return generatedData;
    
    const updatedRounds = [...generatedData.rounds];
    const convertedQuestions = convertToGeneratedQuestions(editorQuestions).map(q => ({
      ...q,
      difficulty: q.difficulty || "medium",
      icon_slug: q.icon_slug || null,
    }));
    updatedRounds[currentRoundIndex] = {
      ...updatedRounds[currentRoundIndex],
      questions: convertedQuestions,
    };
    return { ...generatedData, rounds: updatedRounds };
  };

  const handleSaveDraft = async () => {
    if (!user) return;
    
    // At least need some rounds configured to save
    const hasContent = rounds.some(r => r.subject.trim().length > 0);
    if (!hasContent) {
      toast.error("შეიყვანეთ მინიმუმ ერთი თემა");
      return;
    }
    
    setIsSavingDraft(true);
    try {
      const draftData = {
        user_id: user.id,
        title: title || null,
        description: description || null,
        cover_image: generatedData?.coverImage || null,
        cover_gradient: coverGradient,
        is_public: isPublic,
        rounds_config: rounds as unknown as any,
        generated_data: generatedData as unknown as any,
      };

      if (currentDraftId) {
        // Update existing draft
        const { error } = await supabase
          .from("collection_drafts")
          .update(draftData)
          .eq("id", currentDraftId);
        
        if (error) throw error;
        toast.success("დრაფტი განახლდა!");
      } else {
        // Create new draft
        const { data, error } = await supabase
          .from("collection_drafts")
          .insert([draftData])
          .select("id")
          .single();
        
        if (error) throw error;
        setCurrentDraftId(data.id);
        toast.success("დრაფტი შეინახა!");
      }
      
      queryClient.invalidateQueries({ queryKey: ["collection-drafts"] });
    } catch (error: any) {
      console.error("Error saving draft:", error);
      toast.error("დრაფტის შენახვა ვერ მოხერხდა");
    } finally {
      setIsSavingDraft(false);
    }
  };

  const deleteDraft = async (id: string) => {
    const { error } = await supabase
      .from("collection_drafts")
      .delete()
      .eq("id", id);
    
    if (error) {
      toast.error("დრაფტის წაშლა ვერ მოხერხდა");
      return;
    }
    
    if (currentDraftId === id) {
      setCurrentDraftId(null);
    }
    
    queryClient.invalidateQueries({ queryKey: ["collection-drafts"] });
    toast.success("დრაფტი წაიშალა");
  };

  const handlePublish = async () => {
    if (!user || !generatedData) return;

    setIsPosting(true);

    try {
      // Create the collection first
      const { data: collection, error: collectionError } = await supabase
        .from("quiz_collections")
        .insert({
          user_id: user.id,
          title: title || `კოლექცია: ${rounds.map(r => r.subject).join(", ")}`,
          description,
          cover_gradient: coverGradient,
          cover_image: generatedData.coverImage,
          is_public: isPublic,
        })
        .select()
        .single();

      if (collectionError) throw collectionError;

      // Insert all quiz posts for rounds
      for (let i = 0; i < generatedData.rounds.length; i++) {
        const round = generatedData.rounds[i];
        
        const { error: postError } = await supabase
          .from("user_quiz_posts")
          .insert([{
            user_id: user.id,
            title: round.title,
            subject: round.subject,
            questions: round.questions as unknown as any,
            question_count: round.questions.length,
            answer_format: round.answerFormat,
            cover_gradient: coverGradient,
            cover_image: generatedData.coverImage,
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

  const renderStep1 = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-5"
    >
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 mb-4 rounded-full bg-white/20 backdrop-blur-sm">
          <img src={iconCollections} alt="Create Collection" className="w-14 h-14 object-contain" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">შექმენი კოლექცია ✨</h3>
        <p className="text-white/70">რამდენიმე რაუნდი ერთად</p>
      </div>

      {/* Round Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {rounds.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentRoundIndex(index)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              currentRoundIndex === index
                ? "bg-white text-[#6B5B95] shadow-lg"
                : "bg-white/20 text-white hover:bg-white/30"
            }`}
          >
            რაუნდი {index + 1}
          </button>
        ))}
        {rounds.length < 5 && (
          <button
            onClick={addRound}
            className="p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Current Round Config Card */}
      <motion.div
        key={currentRoundIndex}
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 space-y-4 border border-white/20"
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-white">რაუნდი {currentRoundIndex + 1}</span>
          {rounds.length > 1 && (
            <button
              onClick={() => {
                removeRound(currentRoundIndex);
                if (currentRoundIndex >= rounds.length - 1) {
                  setCurrentRoundIndex(Math.max(0, currentRoundIndex - 1));
                }
              }}
              className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <Input
          value={rounds[currentRoundIndex]?.subject || ""}
          onChange={(e) => updateRound(currentRoundIndex, "subject", e.target.value)}
          placeholder="თემა (მაგ: ფიზიკა, ფეხბურთი...)"
          className="w-full text-base h-14 px-5 rounded-2xl border-0 bg-white/95 text-slate-800 placeholder:text-slate-400 shadow-lg"
        />

        <div className="flex gap-2">
          <select
            value={rounds[currentRoundIndex]?.questionCount || 5}
            onChange={(e) => updateRound(currentRoundIndex, "questionCount", parseInt(e.target.value))}
            className="flex-1 bg-white/95 rounded-xl px-3 py-3 text-sm text-slate-800 border-0 shadow-lg"
          >
            <option value={5}>5 კითხვა</option>
            <option value={7}>7 კითხვა</option>
            <option value={10}>10 კითხვა</option>
          </select>

          <select
            value={rounds[currentRoundIndex]?.answerFormat || "4_answers"}
            onChange={(e) => updateRound(currentRoundIndex, "answerFormat", e.target.value)}
            className="flex-1 bg-white/95 rounded-xl px-3 py-3 text-sm text-slate-800 border-0 shadow-lg"
          >
            <option value="4_answers">4 პასუხი</option>
            <option value="true_false">მართალი/მცდარი</option>
          </select>
        </div>

        {/* Difficulty Selector */}
        <div>
          <label className="text-xs text-white/80 mb-2 block">სირთულე</label>
          <div className="flex gap-2">
            {[
              { value: "mixed" as const, emoji: "🎲" },
              { value: "easy" as const, emoji: "🟢" },
              { value: "medium" as const, emoji: "🟡" },
              { value: "hard" as const, emoji: "🔴" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateRound(currentRoundIndex, "difficulty", opt.value)}
                className={`flex-1 py-3 px-3 rounded-xl text-2xl font-medium transition-all ${
                  rounds[currentRoundIndex]?.difficulty === opt.value
                    ? "bg-white text-[#6B5B95] shadow-lg"
                    : "bg-white/20 hover:bg-white/30"
                }`}
              >
                {opt.emoji}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Collection Title */}
      <div>
        <label className="text-sm font-medium text-white mb-2 block">სახელი</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="კოლექციის სახელი (არასავალდებულო)"
          className="w-full text-base h-12 px-5 rounded-2xl border-0 bg-white/95 text-slate-800 placeholder:text-slate-400 shadow-lg"
        />
      </div>

      {/* Description */}
      <div>
        <label className="text-sm font-medium text-white mb-2 block">აღწერა</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="მოკლე აღწერა (არასავალდებულო)"
          className="w-full px-5 py-3 rounded-2xl border-0 bg-white/95 text-slate-800 placeholder:text-slate-400 shadow-lg resize-none"
          rows={2}
        />
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        {/* Save as Draft Button */}
        <button
          onClick={handleSaveDraft}
          disabled={isSavingDraft || !canProceed}
          className="w-full py-3 rounded-xl bg-white/20 text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-white/30 transition-colors"
        >
          {isSavingDraft ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              ინახება...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              დრაფტად შენახვა
            </>
          )}
        </button>

        {/* Generate Button */}
        <ChunkyButton
          variant="whitePurple"
          onClick={handleGenerate}
          disabled={!canProceed || isGenerating}
          className="w-full"
          size="lg"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          შექმნა
        </ChunkyButton>
      </div>
    </motion.div>
  );

  const renderStep2 = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-12"
    >
      <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-6">
        <Loader2 className="w-10 h-10 text-white animate-spin" />
      </div>
      
      <h3 className="text-xl font-bold text-white mb-2">იქმნება კოლექცია...</h3>
      <p className="text-white/70 mb-6">
        {generationProgress.status} ({generationProgress.current} / {generationProgress.total})
      </p>
      
      <div className="w-full max-w-xs bg-white/20 rounded-full h-2 overflow-hidden">
        <motion.div
          className="h-full bg-white"
          initial={{ width: 0 }}
          animate={{ width: `${(generationProgress.current / generationProgress.total) * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      
      <p className="text-sm text-center text-white/80 mt-4 animate-pulse">
        ✨ AI ქმნის კითხვებს...
      </p>
    </motion.div>
  );

  const renderStep3 = () => {
    if (!generatedData) return null;

    // Render round tabs as header content for GameStyleQuestionEditor
    const roundTabsHeader = (
      <div className="px-4 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {generatedData.rounds.map((round, index) => (
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
        </div>
        {/* Dots indicator */}
        <div className="flex justify-center gap-1.5 mt-2">
          {generatedData.rounds.map((_, index) => (
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

    return (
      <GameStyleQuestionEditor
        questions={editorQuestions}
        onQuestionsChange={handleEditorQuestionsChange}
        title={title}
        onTitleChange={setTitle}
        onSave={handlePublish}
        onBack={() => setStep(1)}
        saveButtonText={isPosting ? "იქვეყნება..." : "გამოქვეყნება"}
        showTitleEditor={true}
        subject={generatedData.rounds[currentRoundIndex]?.subject}
        answerFormat={rounds[currentRoundIndex]?.answerFormat || "4_answers"}
        headerContent={roundTabsHeader}
        isSaving={isPosting}
        coverImageUrl={generatedData.coverImage}
        selectedGradient={coverGradient}
        isPublic={isPublic}
        onPublicChange={setIsPublic}
        onRegenerateCover={regenerateCover}
        isGeneratingCover={isGeneratingCover}
        coverGenerationCount={generatedData.coverGenerationCount}
      />
    );
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Step 3 uses GameStyleQuestionEditor which is its own full-screen component */}
          {step === 3 ? (
            renderStep3()
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-[#6B5B95]"
            >
              {/* Fixed Header */}
              <div className="fixed top-0 left-0 right-0 z-50 safe-top">
                <div className="flex items-center justify-between px-4 py-3">
                  {step > 1 && !isGenerating ? (
                    <button 
                      onClick={() => setStep(step - 1)} 
                      className="p-2 -ml-2 rounded-xl hover:bg-white/10 transition-colors"
                    >
                      <ChevronLeft className="w-6 h-6 text-white" />
                    </button>
                  ) : (
                    <button 
                      onClick={handleClose} 
                      className="p-2 -ml-2 rounded-xl hover:bg-white/10 transition-colors"
                    >
                      <ChevronLeft className="w-6 h-6 text-white" />
                    </button>
                  )}
                  
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex gap-1.5">
                      {[1, 2, 3].map((s) => (
                        <div
                          key={s}
                          className={`h-2 rounded-full transition-all ${
                            s === step ? "w-6 bg-white" : s < step ? "w-2 bg-white/50" : "w-2 bg-white/20"
                          }`}
                        />
                      ))}
                    </div>
                    {/* Auto-save indicator */}
                    {lastAutoSaved && !isGenerating && !isPosting && (
                      <motion.div 
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-1 text-[10px] text-white/80"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        შენახულია
                      </motion.div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 rounded-full">
                    <Sparkles className="w-4 h-4 text-white" />
                    <span className="text-xs font-semibold text-white">AI</span>
                  </div>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="h-full overflow-y-auto pt-[60px] pb-6 safe-top">
                <div className="p-5">
                  <AnimatePresence mode="wait">
                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}
