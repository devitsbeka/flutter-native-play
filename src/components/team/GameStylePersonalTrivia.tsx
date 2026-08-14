import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, Reorder, useDragControls } from "framer-motion";
import { ChevronLeft, Copy, Trash2, Check, Plus, Edit3, ImageIcon, PartyPopper, GripVertical, Upload, X, Sparkles, Image, RefreshCw, Lightbulb, Save, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast as sonnerToast } from "sonner";
import { cn } from "@/lib/utils";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { QuestionIconPicker } from "@/components/social/QuestionIconPicker";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import useEmblaCarousel from "embla-carousel-react";
import { useTriviaDrafts } from "@/hooks/useTriviaDrafts";
import { IconOnboardingTooltip } from "@/components/shared/IconOnboardingTooltip";
import { partyStarterPack } from "@/config/partyStarterPack";

const ICON_STORAGE_URL = "https://sqwpzezkhpqkdyltvsim.supabase.co/storage/v1/object/public/icon-library";

const MAX_QUESTIONS = 20;

interface Answer {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface PersonalQuestion {
  id: string;
  question: string;
  answers: Answer[];
  iconSlug?: string;
  backgroundImageUrl?: string;
}

/**
 * The ten cards a new party opens on — see config/partyStarterPack.
 *
 * The first answer of each is the correct one, which is what the pack is
 * written for: a party card needs a right answer even before anybody has
 * decided what it is.
 */
function starterQuestions(language: string): PersonalQuestion[] {
  return partyStarterPack(language).map((q, idx) => ({
    id: `starter-${idx}`,
    question: q.question,
    answers: q.answers.map((text, i) => ({
      id: `a-starter-${idx}-${i}`,
      text,
      isCorrect: i === 0,
    })),
    iconSlug: q.iconSlug,
  }));
}

/**
 * The key the autosave compares against to decide whether anything changed.
 *
 * Shared with the seeding, so a party that was opened and closed without a
 * single edit does not land in Drafts as ten questions nobody wrote.
 */
function draftPayloadKey(title: string, questions: PersonalQuestion[]): string {
  return JSON.stringify({
    title: title?.trim() || null,
    questions: questions.map((q) => ({
      question: q.question,
      answers: q.answers.map((a) => ({ text: a.text, isCorrect: a.isCorrect })),
      iconSlug: q.iconSlug,
      backgroundImageUrl: q.backgroundImageUrl,
    })),
  });
}

interface ValidationError {
  questionIndex: number;
  field: "question" | "answer";
  answerIndex?: number;
  message: string;
}

interface GameStylePersonalTriviaProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (questions: Array<{
    question_text: string;
    correct_answer: string;
    incorrect_answers: string[];
    icon_slug?: string | null;
  }>, title: string) => void;
  initialData?: {
    title: string;
    questions: Array<{
      question_text: string;
      correct_answer: string;
      incorrect_answers: string[];
      icon_slug?: string | null;
    }>;
  } | null;
  resumeDraftId?: string | null;
  onDraftResumed?: () => void;
}

// Draggable Answer Item Component
function DraggableAnswerItem({
  answer,
  onEdit,
  onSetCorrect,
  isEditing,
  editValue,
  onEditChange,
  onEditBlur,
  onEditKeyDown,
  inputRef,
  answerMax,
  letter,
  hasError,
  correctPlaceholder,
  wrongPlaceholder,
  correctTitle,
  setCorrectTitle,
}: {
  answer: Answer;
  onEdit: () => void;
  onSetCorrect: () => void;
  isEditing: boolean;
  editValue: string;
  onEditChange: (value: string) => void;
  onEditBlur: () => void;
  onEditKeyDown: (e: React.KeyboardEvent) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  answerMax: number;
  letter: string;
  hasError: boolean;
  correctPlaceholder: string;
  wrongPlaceholder: string;
  correctTitle: string;
  setCorrectTitle: string;
}) {
  const dragControls = useDragControls();

  if (isEditing) {
    if (answer.isCorrect) {
      return (
        <Reorder.Item value={answer} dragListener={false} dragControls={dragControls}>
          <div className={cn(
            "flex items-center gap-3 p-3 rounded-2xl bg-emerald-500 shadow-[0_4px_0_0_#059669]",
            hasError && "ring-2 ring-red-500 animate-pulse"
          )}>
            <span className="w-11 h-11 rounded-full bg-white flex items-center justify-center text-emerald-500 font-bold flex-shrink-0">
              <Check className="w-5 h-5" />
            </span>
            <Input
              ref={inputRef}
              value={editValue}
              onChange={(e) => onEditChange(e.target.value)}
              onBlur={onEditBlur}
              onKeyDown={onEditKeyDown}
              className="flex-1 bg-white/20 border-0 text-white placeholder:text-white/50 font-semibold"
              maxLength={answerMax}
              placeholder={correctPlaceholder}
            />
            <span className="text-xs text-white/70">{editValue.length}/{answerMax}</span>
          </div>
        </Reorder.Item>
      );
    } else {
      return (
        <Reorder.Item value={answer} dragListener={false} dragControls={dragControls}>
          <div className={cn(
            "flex items-center gap-3 p-3 rounded-2xl bg-white shadow-[0_4px_0_0_#d1d5db]",
            hasError && "ring-2 ring-red-500 animate-pulse"
          )}>
            <span className="w-11 h-11 rounded-full bg-[#7DD3FC] flex items-center justify-center text-white font-bold flex-shrink-0">
              {letter}:
            </span>
            <Input
              ref={inputRef}
              value={editValue}
              onChange={(e) => onEditChange(e.target.value)}
              onBlur={onEditBlur}
              onKeyDown={onEditKeyDown}
              className="flex-1 border-0 font-semibold"
              maxLength={answerMax}
              placeholder={wrongPlaceholder}
            />
            <span className="text-xs text-muted-foreground">{editValue.length}/{answerMax}</span>
          </div>
        </Reorder.Item>
      );
    }
  }

  return (
    <Reorder.Item
      value={answer}
      dragControls={dragControls}
      whileDrag={{
        scale: 1.02,
        boxShadow: "0 8px 20px rgba(0,0,0,0.2)",
        zIndex: 50,
      }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
    >
      <motion.div
        className={cn(
          "flex items-center gap-3 p-3 rounded-2xl text-left group transition-all",
          answer.isCorrect 
            ? "bg-emerald-500 shadow-[0_4px_0_0_#059669]" 
            : "bg-white shadow-[0_4px_0_0_#d1d5db] hover:bg-gray-50",
          hasError && "ring-2 ring-red-500 animate-pulse"
        )}
        layout
      >
        {/* Clickable circle to set as correct */}
        <button
          onClick={onSetCorrect}
          className={cn(
            "w-11 h-11 rounded-full flex items-center justify-center font-bold flex-shrink-0 transition-colors",
            answer.isCorrect 
              ? "bg-white text-emerald-500" 
              : "bg-[#7DD3FC] hover:bg-emerald-400 text-white"
          )}
          title={answer.isCorrect ? correctTitle : setCorrectTitle}
        >
          {answer.isCorrect ? <Check className="w-5 h-5" /> : `${letter}:`}
        </button>
        
        {/* Clickable text to edit */}
        <button
          onClick={onEdit}
          className="flex-1 text-left"
        >
          <span className={cn(
            "font-semibold min-h-[24px] flex items-center",
            answer.isCorrect ? "text-white" : "text-slate-700"
          )}>
            {answer.text || (
              <span className={answer.isCorrect ? "text-white/70" : "text-slate-400"}>
                {answer.isCorrect ? correctPlaceholder : wrongPlaceholder}
              </span>
            )}
          </span>
        </button>
        
        <Edit3 className={cn(
          "w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity",
          answer.isCorrect ? "text-white/50" : "text-muted-foreground"
        )} />
        
        {/* Drag handle */}
        <div
          onPointerDown={(e) => dragControls.start(e)}
          className={cn(
            "cursor-grab active:cursor-grabbing p-1 -mr-1 touch-none",
            answer.isCorrect ? "text-white/60" : "text-slate-400"
          )}
        >
          <GripVertical className="w-5 h-5" />
        </div>
      </motion.div>
    </Reorder.Item>
  );
}

export function GameStylePersonalTrivia({
  isOpen,
  onClose,
  onSave,
  initialData,
  resumeDraftId,
  onDraftResumed,
}: GameStylePersonalTriviaProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { saveDraft, loadDraft } = useTriviaDrafts();
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [editingField, setEditingField] = useState<"question" | string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showDraftNameInput, setShowDraftNameInput] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const { user } = useAuth();
  const [title, setTitle] = useState(initialData?.title || "");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);
  const [errorField, setErrorField] = useState<{questionIndex: number; field: string; answerId?: string} | null>(null);
  const [iconPickerIndex, setIconPickerIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize questions with new Answer structure
  const [questions, setQuestions] = useState<PersonalQuestion[]>(() => {
    if (initialData?.questions) {
      return initialData.questions.map((q, idx) => ({
        id: `init-${idx}`,
        question: q.question_text,
        answers: [
          { id: `a-${idx}-0`, text: q.correct_answer, isCorrect: true },
          ...q.incorrect_answers.map((ans, i) => ({ id: `a-${idx}-${i+1}`, text: ans, isCorrect: false }))
        ],
        iconSlug: q.icon_slug || undefined,
      }));
    }
    return starterQuestions(language);
  });

  // Track current draft ID for updates
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);

  // Debounced auto-save so a "stuck" session still appears in Drafts.
  const autosaveTimerRef = useRef<number | null>(null);
  const lastAutosavedPayloadRef = useRef<string>("");

  // Load draft when resumeDraftId is provided
  useEffect(() => {
    if (!resumeDraftId || !user || !isOpen) return;
    
    const loadDraftData = async () => {
      const data = await loadDraft(resumeDraftId);
      if (!data) return;
      
      // Convert stored format to component format
      const loadedQuestions: PersonalQuestion[] = (data.questions as any[]).map((q: any, idx: number) => ({
        id: `loaded-${idx}`,
        question: q.question || "",
        answers: (q.answers || []).map((a: any, i: number) => ({
          id: `a-loaded-${idx}-${i}`,
          text: a.text || "",
          isCorrect: a.isCorrect || false,
        })),
        iconSlug: q.iconSlug,
        backgroundImageUrl: q.backgroundImageUrl,
      }));
      
      if (loadedQuestions.length > 0) {
        setQuestions(loadedQuestions);
      }
      setTitle(data.title || "");
      setCurrentDraftId(resumeDraftId);
      onDraftResumed?.();
      sonnerToast.success(t("extra.ptDraftLoaded"));
    };
    
    loadDraftData();
  }, [resumeDraftId, user, isOpen, onDraftResumed, loadDraft]);

  // Reset to fresh state when opening without a draft or initial data
  useEffect(() => {
    if (isOpen && !resumeDraftId && !initialData) {
      const starter = starterQuestions(language);
      setQuestions(starter);
      setTitle("");
      setCurrentDraftId(null);
      setCurrentIndex(0);
      // The pack as handed over counts as "nothing written yet": autosave
      // skips a payload it has already seen, so priming it with the untouched
      // pack keeps ten unedited questions out of Drafts until one is changed.
      lastAutosavedPayloadRef.current = draftPayloadKey("", starter);
    }
  }, [isOpen, resumeDraftId, initialData, language]);

  // Auto-save personal trivia drafts (debounced). This ensures the draft shows up in DraftsList
  // even if the user closes the modal or the UI freezes before manual save.
  useEffect(() => {
    if (!isOpen || !user) return;

    // Only auto-save if there's *some* content.
    const hasAnyContent =
      (title && title.trim().length > 0) ||
      questions.some((q) =>
        (q.question || "").trim().length > 0 ||
        q.answers.some((a) => (a.text || "").trim().length > 0)
      );

    if (!hasAnyContent) return;

    const questionsData = questions.map((q) => ({
      question: q.question,
      answers: q.answers.map((a) => ({ text: a.text, isCorrect: a.isCorrect })),
      iconSlug: q.iconSlug,
      backgroundImageUrl: q.backgroundImageUrl,
    }));

    // Skip if payload hasn't changed (prevents redundant writes, and keeps an
    // untouched starter pack out of Drafts — see where it is seeded).
    const payloadKey = draftPayloadKey(title, questions);
    if (payloadKey === lastAutosavedPayloadRef.current) return;

    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = window.setTimeout(async () => {
      try {
        const saved = await saveDraft({
          draftId: currentDraftId || undefined,
          title: title?.trim() || null,
          questions: questionsData,
          draft_type: "personal",
        });

        if (saved?.id) {
          setCurrentDraftId(saved.id);
        }

        lastAutosavedPayloadRef.current = payloadKey;
      } catch {
        // Silent autosave failure (user can still try manual save)
      }
    }, 1200);

    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [isOpen, user, title, questions, currentDraftId, saveDraft]);

  // Character limits
  const QUESTION_MAX = 65;
  const ANSWER_MAX = 25;

  // Letters for answer labels
  const letters = language === 'ka' ? ["ა", "ბ", "გ", "დ"] : ["A", "B", "C", "D"];

  // Sync carousel index
  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setCurrentIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi]);

  // Reindex on questions change
  useEffect(() => {
    if (emblaApi) {
      emblaApi.reInit();
    }
  }, [questions.length, emblaApi]);

  // Focus input when editing
  useEffect(() => {
    if (editingField !== null) {
      if (editingField === "question" && textareaRef.current) {
        textareaRef.current.focus();
      } else if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  }, [editingField]);

  // Clear error when user starts editing
  useEffect(() => {
    if (editingField !== null) {
      setErrorField(null);
    }
  }, [editingField]);

  const currentQuestion = questions[currentIndex];

  const handleAddQuestion = () => {
    if (questions.length >= MAX_QUESTIONS) {
      toast({
        title: t("extra.ptMax20Questions"),
        description: t("extra.ptDeleteExtraToAdd"),
        variant: "destructive",
      });
      return;
    }

    const newQuestion: PersonalQuestion = {
      id: `new-${Date.now()}`,
      question: "",
      answers: [
        { id: `a-${Date.now()}-0`, text: "", isCorrect: true },
        { id: `a-${Date.now()}-1`, text: "", isCorrect: false },
        { id: `a-${Date.now()}-2`, text: "", isCorrect: false },
        { id: `a-${Date.now()}-3`, text: "", isCorrect: false },
      ],
    };
    const newQuestions = [...questions, newQuestion];
    setQuestions(newQuestions);
    
    setTimeout(() => {
      emblaApi?.scrollTo(newQuestions.length - 1);
    }, 100);

    toast({
      title: t("extra.ptQuestionAdded"),
      duration: 2000,
    });
  };

  const handleDuplicate = () => {
    if (questions.length >= MAX_QUESTIONS) {
      toast({
        title: t("extra.ptMax20Questions"),
        description: t("extra.ptDeleteExtraToDuplicate"),
        variant: "destructive",
      });
      return;
    }

    const duplicated: PersonalQuestion = {
      ...currentQuestion,
      id: `dup-${Date.now()}`,
      answers: currentQuestion.answers.map((a, i) => ({
        ...a,
        id: `a-dup-${Date.now()}-${i}`,
      })),
    };
    const newQuestions = [...questions];
    newQuestions.splice(currentIndex + 1, 0, duplicated);
    setQuestions(newQuestions);
    
    setTimeout(() => {
      emblaApi?.scrollTo(currentIndex + 1);
    }, 100);

    toast({
      title: t("extra.ptQuestionDuplicated"),
      duration: 2000,
    });
  };

  const handleDelete = () => {
    if (questions.length <= 1) {
      toast({
        title: t("extra.ptCannotDelete"),
        description: t("extra.ptMinOneQuestion"),
        variant: "destructive",
      });
      return;
    }

    const newQuestions = questions.filter((_, i) => i !== currentIndex);
    setQuestions(newQuestions);
    
    const newIndex = Math.min(currentIndex, newQuestions.length - 1);
    setTimeout(() => {
      emblaApi?.scrollTo(newIndex);
    }, 100);

    setShowDeleteConfirm(false);
    toast({
      title: t("extra.ptQuestionDeleted"),
      duration: 2000,
    });
  };

  const handleIconChange = (slug: string | null, index?: number) => {
    const targetIndex = index !== undefined ? index : currentIndex;
    const newQuestions = [...questions];
    newQuestions[targetIndex] = {
      ...newQuestions[targetIndex],
      iconSlug: slug || undefined,
    };
    setQuestions(newQuestions);
  };

  const startEditing = (field: "question" | string, value: string) => {
    setEditingField(field);
    setEditValue(value);
  };

  const saveEdit = () => {
    if (editingField === null) return;

    const newQuestions = [...questions];
    const question = { ...newQuestions[currentIndex] };

    if (editingField === "question") {
      question.question = editValue.slice(0, QUESTION_MAX);
    } else {
      // editingField is the answer id
      const answerIndex = question.answers.findIndex(a => a.id === editingField);
      if (answerIndex !== -1) {
        question.answers = question.answers.map((a, i) => 
          i === answerIndex ? { ...a, text: editValue.slice(0, ANSWER_MAX) } : a
        );
      }
    }

    newQuestions[currentIndex] = question;
    setQuestions(newQuestions);
    setEditingField(null);
    setEditValue("");
  };

  const setCorrectAnswer = (answerId: string) => {
    const newQuestions = [...questions];
    const question = { ...newQuestions[currentIndex] };
    
    question.answers = question.answers.map(a => ({
      ...a,
      isCorrect: a.id === answerId,
    }));
    
    newQuestions[currentIndex] = question;
    setQuestions(newQuestions);
  };

  const handleReorder = (newOrder: Answer[]) => {
    const newQuestions = [...questions];
    newQuestions[currentIndex] = {
      ...newQuestions[currentIndex],
      answers: newOrder,
    };
    setQuestions(newQuestions);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: t("common.error"),
        description: t("extra.ptImageOnlyError"),
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t("common.error"),
        description: t("extra.ptImageTooBig"),
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `trivia-bg-${Date.now()}.${fileExt}`;
      const filePath = `trivia-backgrounds/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('trivia-backgrounds')
        .upload(filePath, file);

      if (uploadError) {
        // Bucket might not exist, try to use a generic bucket or handle gracefully
        console.error('Upload error:', uploadError);
        
        // Create a local URL for preview (fallback)
        const localUrl = URL.createObjectURL(file);
        const newQuestions = [...questions];
        newQuestions[currentIndex] = {
          ...newQuestions[currentIndex],
          backgroundImageUrl: localUrl,
        };
        setQuestions(newQuestions);
        
        toast({
          title: t("extra.ptImageAddedLocal"),
          description: t("extra.ptLocalPreview"),
          duration: 2000,
        });
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('trivia-backgrounds')
        .getPublicUrl(filePath);

      const newQuestions = [...questions];
      newQuestions[currentIndex] = {
        ...newQuestions[currentIndex],
        backgroundImageUrl: publicUrl,
      };
      setQuestions(newQuestions);

      toast({
        title: t("extra.ptImageUploaded"),
        duration: 2000,
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: t("common.error"),
        description: t("extra.ptUploadFailed"),
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeBackgroundImage = () => {
    const newQuestions = [...questions];
    newQuestions[currentIndex] = {
      ...newQuestions[currentIndex],
      backgroundImageUrl: undefined,
    };
    setQuestions(newQuestions);
  };

  const handleGenerateAI = async (index: number) => {
    setIsGeneratingAI(true);
    setGeneratingIndex(index);
    
    try {
      // Get ALL existing question texts including current one to avoid similar results
      const existingQuestions = questions
        .filter(q => q.question.trim())
        .map(q => q.question);

      // Generate random seed for variety on each click
      const randomSeed = Math.random().toString(36).substring(2, 10);

      const { data, error } = await supabase.functions.invoke('generate-single-question', {
        body: { 
          subject: title || 'ოჯახი და მეგობრები',
          answerFormat: '4_answers',
          difficulty: 'medium',
          existingQuestions,
          randomSeed,
          mode: 'personal', // Personal/family questions for MyTrivia Party
        }
      });
      
      if (error) throw error;
      
      if (data?.question_text) {
        const newQuestions = [...questions];
        newQuestions[index] = {
          ...newQuestions[index],
          question: data.question_text || "",
          answers: [
            { id: `a-ai-${Date.now()}-0`, text: data.correct_answer || "", isCorrect: true },
            ...(data.incorrect_answers || []).slice(0, 3).map((ans: string, i: number) => ({
              id: `a-ai-${Date.now()}-${i+1}`,
              text: ans,
              isCorrect: false,
            })),
          ],
          iconSlug: data.icon_slug || undefined,
        };
        setQuestions(newQuestions);
        
        toast({
          title: t("extra.ptAIFilled"),
          duration: 2000,
        });
      } else {
        throw new Error("No question data returned");
      }
    } catch (error) {
      console.error('AI generation error:', error);
      toast({
        title: t("common.error"),
        description: t("extra.ptAIFailed"),
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAI(false);
      setGeneratingIndex(null);
    }
  };

  const validateQuestions = (): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    questions.forEach((q, idx) => {
      if (!q.question.trim()) {
        errors.push({
          questionIndex: idx,
          field: "question",
          message: t("extra.ptQuestionEmpty"),
        });
      }
      
      q.answers.forEach((answer, answerIdx) => {
        if (!answer.text.trim()) {
          errors.push({
            questionIndex: idx,
            field: "answer",
            answerIndex: answerIdx,
            message: t("extra.ptAnswerEmpty"),
          });
        }
      });
    });
    
    return errors;
  };

  const handleSave = () => {
    const errors = validateQuestions();
    
    if (errors.length > 0) {
      const firstError = errors[0];
      
      // Navigate to the slide with error
      emblaApi?.scrollTo(firstError.questionIndex);
      
      // Set error field for visual indication
      const question = questions[firstError.questionIndex];
      setErrorField({
        questionIndex: firstError.questionIndex,
        field: firstError.field,
        answerId: firstError.field === "answer" && firstError.answerIndex !== undefined 
          ? question.answers[firstError.answerIndex]?.id 
          : undefined,
      });
      
      // Show toast with error message
      toast({
        title: t("extra.ptValidationError"),
        description: `${t("extra.questionNofM", { n: String(firstError.questionIndex + 1), total: String(questions.length) })}: ${firstError.message}`,
        variant: "destructive",
      });
      
      return;
    }

    const formattedQuestions = questions.map(q => {
      const correctAnswer = q.answers.find(a => a.isCorrect);
      const incorrectAnswers = q.answers.filter(a => !a.isCorrect);
      
      return {
        question_text: q.question,
        correct_answer: correctAnswer?.text || "",
        incorrect_answers: incorrectAnswers.map(a => a.text),
        icon_slug: q.iconSlug || null,
      };
    });

    onSave(formattedQuestions, title || "MyTrivia Party");
    onClose();
  };

  // Get letter for answer based on its position in the reordered list
  const getLetterForAnswer = (answers: Answer[], answerId: string): string => {
    const index = answers.findIndex(a => a.id === answerId);
    return letters[index] || "?";
  };

  // Check if user has made any progress
  const hasProgress = useCallback((): boolean => {
    // Check if title was changed
    if (title.trim()) return true;
    
    // Check questions for any content
    for (const q of questions) {
      if (q.question.trim()) return true;
      if (q.iconSlug) return true;
      if (q.backgroundImageUrl) return true;
      for (const answer of q.answers) {
        if (answer.text.trim()) return true;
      }
    }
    return false;
  }, [title, questions]);

  // Handle back button click
  const handleBackClick = () => {
    // If this session is already tied to an existing draft, we don't need to prompt
    // to “save as draft” again — autosave/update will keep it.
    if (currentDraftId) {
      onClose();
      return;
    }

    if (hasProgress()) {
      setShowExitConfirm(true);
      return;
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          // The editor is a 700px column down the middle of the screen, so on
          // anything wider than a phone the page it opened from was still
          // sitting there in full focus on either side — rooms, tabs, the
          // sidebar, all live and all clickable. Behind glass now, and inert:
          // it swallows the clicks that used to reach the page.
          //
          // Above 50 on purpose: the desktop nav and the bottom bar are both
          // z-50, and a backdrop under them would have left the chrome sharp
          // on top of the blur. The panel stays one step higher again.
          className="fixed inset-0 z-[90] bg-[#2A0E4F]/55 backdrop-blur-md"
        />
      )}
      {isOpen && (
        <motion.div
          key="panel"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex flex-col max-w-[700px] md:max-w-[600px] mx-auto"
          style={{
            background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 50%, #4C1D95 100%)",
          }}
        >
          {/* Header with Title - Added more top spacing */}
          <div className="pt-[calc(env(safe-area-inset-top,8px)+16px)] px-4 py-3 flex items-center justify-between">
            <button
              onClick={handleBackClick}
              className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            
            {/* Title in center */}
            {isEditingTitle ? (
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => setIsEditingTitle(false)}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
                autoFocus
                className="max-w-[180px] bg-white/20 border-white/30 text-white placeholder:text-white/70 font-bold text-center"
                placeholder={t("extra.editorGameNamePlaceholder")}
              />
            ) : (
              <button 
                onClick={() => setIsEditingTitle(true)}
                className="flex items-center gap-2 text-white"
              >
                <span className="font-bold truncate max-w-[150px]">
                  {title || t("extra.editorGameNamePlaceholder")}
                </span>
                <Edit3 className="w-4 h-4 text-white/70" />
              </button>
            )}

            {/* Add Question Button */}
            <button
              onClick={handleAddQuestion}
              className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
            >
              <Plus className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* Action Toolbar - circular buttons */}
          <div className="px-4 pb-3">
            <div className="flex items-center justify-center gap-2">
              {/* Photo Upload Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="h-10 w-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-all disabled:opacity-50"
              >
                {isUploading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Image className="w-4 h-4" />
                )}
              </button>

              {/* Duplicate Button */}
              <button
                onClick={handleDuplicate}
                className="h-10 w-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-all"
              >
                <Copy className="w-4 h-4" />
              </button>

              {/* Delete Button */}
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="h-10 w-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-red-500/50 text-white transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />

          {/* Carousel */}
          <div className="flex-1 overflow-hidden" ref={emblaRef}>
            <div className="flex h-full">
              {questions.map((question, index) => (
                <div
                  key={question.id}
                  className="flex-[0_0_100%] min-w-0 px-4 flex flex-col"
                >
                  {/* Question Card with optional background image */}
                  <div className="relative rounded-3xl overflow-hidden shadow-lg mb-4">
                    {/* Background Image */}
                    {question.backgroundImageUrl && (
                      <>
                        <img 
                          src={question.backgroundImageUrl} 
                          className="absolute inset-0 w-full h-full object-cover"
                          alt=""
                        />
                        {/* Purple gradient overlay for readability */}
                        <div className="absolute inset-0 bg-gradient-to-b from-[#5B21B6]/80 via-[#5B21B6]/70 to-[#5B21B6]/90" />
                        {/* Remove background button */}
                        <button
                          onClick={removeBackgroundImage}
                          className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    
                    {/* Content */}
                    <div className={cn(
                      "relative z-10 p-5",
                      !question.backgroundImageUrl && "bg-[#5B21B6]"
                    )}>
                      {/* Question Counter */}
                      <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/20 text-white text-xs font-medium">
                        {index + 1}/{questions.length}
                      </div>

                      {/* AI Generate Button - top right, positioned left of X button when bg exists */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGenerateAI(index);
                        }}
                        disabled={isGeneratingAI}
                        className={cn(
                          "absolute top-3 z-30 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all disabled:opacity-50",
                          question.backgroundImageUrl ? "right-14" : "right-3"
                        )}
                      >
                        {isGeneratingAI && generatingIndex === index ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : question.question.trim() ? (
                          <RefreshCw className="w-4 h-4" />
                        ) : (
                          <Lightbulb className="w-4 h-4" />
                        )}
                      </button>

                      {/* Icon - clickable to open global picker */}
                      <div className="flex justify-center mb-3 relative z-20">
                        <button
                          type="button"
                          onClick={() => setIconPickerIndex(index)}
                          className="rounded-full flex items-center justify-center transition-all flex-shrink-0 relative active:scale-95 overflow-visible bg-white/15 border-2 border-dashed border-white/30 hover:bg-white/20 hover:border-white/40"
                          style={{ width: 80, height: 80 }}
                        >
                          {question.iconSlug ? (
                            <>
                              <img
                                src={`${ICON_STORAGE_URL}/${question.iconSlug}.png`}
                                alt=""
                                style={{ width: 80, height: 80 }}
                                className="object-contain"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                              <div className="absolute -top-1 -right-1 w-6 h-6 bg-white/90 rounded-full flex items-center justify-center shadow-sm border border-slate-200/50">
                                <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
                              </div>
                            </>
                          ) : (
                            <>
                              <ImageIcon style={{ width: 50, height: 50 }} className="text-white/60" />
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-200">
                                <Plus className="w-3 h-3 text-slate-600" />
                              </div>
                            </>
                          )}
                        </button>
                        {index === 0 && !question.iconSlug && <IconOnboardingTooltip />}
                      </div>

                      {/* Question Text - Editable */}
                      {editingField === "question" && index === currentIndex ? (
                        <div className="space-y-2">
                          <Textarea
                            ref={textareaRef}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={saveEdit}
                            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && saveEdit()}
                            className="min-h-[70px] text-center text-lg font-bold bg-white/20 border-white/30 text-white placeholder:text-white/50 resize-none"
                            maxLength={QUESTION_MAX}
                            placeholder={t("extra.ptEnterQuestion")}
                          />
                          <div className="text-xs text-white/60 text-center">
                            {editValue.length}/{QUESTION_MAX}
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditing("question", question.question)}
                          className={cn(
                            "w-full text-center group",
                            errorField?.questionIndex === index && errorField?.field === "question" && "animate-pulse"
                          )}
                        >
                          <p className={cn(
                            "text-xl font-bold text-white leading-relaxed group-hover:text-white/80 transition-colors min-h-[50px] flex items-center justify-center",
                            errorField?.questionIndex === index && errorField?.field === "question" && "text-red-300"
                          )}>
                            {question.question || <span className="text-white/50">{t("extra.editorTapToAddQuestion")}</span>}
                          </p>
                          <Edit3 className="w-4 h-4 text-white/50 mx-auto mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      )}

                    </div>
                  </div>

                  {/* Reorderable Answer Buttons */}
                  <Reorder.Group
                    axis="y"
                    values={question.answers}
                    onReorder={(newOrder) => {
                      if (index === currentIndex) {
                        handleReorder(newOrder);
                      }
                    }}
                    className="flex-1 flex flex-col gap-3 min-h-0 overflow-y-auto pb-4"
                  >
                    {question.answers.map((answer) => (
                      <DraggableAnswerItem
                        key={answer.id}
                        answer={answer}
                        onEdit={() => startEditing(answer.id, answer.text)}
                        onSetCorrect={() => setCorrectAnswer(answer.id)}
                        isEditing={editingField === answer.id && index === currentIndex}
                        editValue={editValue}
                        onEditChange={setEditValue}
                        onEditBlur={saveEdit}
                        onEditKeyDown={(e) => e.key === "Enter" && saveEdit()}
                        inputRef={inputRef}
                        answerMax={ANSWER_MAX}
                        letter={getLetterForAnswer(question.answers, answer.id)}
                        hasError={errorField?.questionIndex === index && errorField?.answerId === answer.id}
                        correctPlaceholder={t("extra.editorCorrectAnswerPlaceholder")}
                        wrongPlaceholder={t("extra.editorAnswerPlaceholder")}
                        correctTitle={t("extra.editorCorrectAnswerTitle")}
                        setCorrectTitle={t("extra.editorSetCorrectTitle")}
                      />
                    ))}
                  </Reorder.Group>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Dots - with more spacing */}
          <div className="flex justify-center gap-1.5 py-4 overflow-x-auto px-4">
            {questions.map((_, index) => (
              <button
                key={index}
                onClick={() => emblaApi?.scrollTo(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all flex-shrink-0",
                  index === currentIndex ? "w-6 bg-white" : "bg-white/40"
                )}
              />
            ))}
          </div>

          {/* Footer with Save Button - More bottom spacing */}
          <div className="px-4 pb-[calc(env(safe-area-inset-bottom,16px)+12px)] pt-2">
            <ChunkyButton 
              onClick={handleSave}
              className="w-full"
              variant="success"
            >
              <Check className="w-5 h-5 mr-2" />
              {t("extra.editorSaveBtn")}
            </ChunkyButton>
          </div>

          {/* Delete Confirmation Modal */}
          <AnimatePresence>
            {showDeleteConfirm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
                onClick={() => setShowDeleteConfirm(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-background rounded-2xl p-6 max-w-sm w-full space-y-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
                      <Trash2 className="w-6 h-6 text-destructive" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground">{t("extra.ptDeleteQuestionTitle")}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t("extra.ptDeleteIrreversible")}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <ChunkyButton
                      variant="outline"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1"
                    >
                      {t("common.cancel")}
                    </ChunkyButton>
                    <ChunkyButton
                      variant="danger"
                      onClick={handleDelete}
                      className="flex-1"
                    >
                      {t("extra.editorDeleteBtn")}
                    </ChunkyButton>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Exit Confirmation Modal */}
          <AnimatePresence>
            {showExitConfirm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
                onClick={() => {
                  if (!showDraftNameInput) {
                    setShowExitConfirm(false);
                  }
                }}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-background rounded-2xl p-6 max-w-sm w-full space-y-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  {!showDraftNameInput ? (
                    <>
                      <div className="text-center">
                        <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
                          <ChevronLeft className="w-6 h-6 text-amber-500" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground">{t("extra.ptExitTitle")}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {t("extra.ptProgressLost")}
                        </p>
                      </div>
                      <div className="flex flex-col gap-3">
                        <ChunkyButton
                          variant="outline"
                          onClick={() => setShowExitConfirm(false)}
                          className="w-full"
                        >
                          {t("extra.ptStay")}
                        </ChunkyButton>
                        <ChunkyButton
                          variant="secondary"
                          onClick={() => setShowDraftNameInput(true)}
                          className="w-full"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {t("extra.ptSaveAsDraft")}
                        </ChunkyButton>
                        <ChunkyButton
                          variant="danger"
                          onClick={() => {
                            setShowExitConfirm(false);
                            setShowDraftNameInput(false);
                            onClose();
                          }}
                          className="w-full"
                        >
                          {t("extra.ptExit")}
                        </ChunkyButton>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-center">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                          <Save className="w-6 h-6 text-primary" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground">{t("extra.ptDraftNameTitle")}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {t("extra.ptDraftNameDesc")}
                        </p>
                      </div>
                      <Input
                        placeholder={t("extra.ptDraftPlaceholder")}
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        autoFocus
                        className="text-center"
                      />
                      <div className="flex gap-3">
                        <ChunkyButton
                          variant="outline"
                          onClick={() => {
                            setShowDraftNameInput(false);
                            setDraftName("");
                          }}
                          className="flex-1"
                        >
                          {t("extra.ptBack")}
                        </ChunkyButton>
                        <ChunkyButton
                          onClick={async () => {
                            if (!user || !draftName.trim()) return;
                            
                            setIsSavingDraft(true);
                            try {
                              const questionsData = questions.map(q => ({
                                question: q.question,
                                answers: q.answers.map(a => ({ text: a.text, isCorrect: a.isCorrect })),
                                iconSlug: q.iconSlug,
                                backgroundImageUrl: q.backgroundImageUrl
                              }));

                              const saved = await saveDraft({
                                draftId: currentDraftId || undefined,
                                title: draftName.trim(),
                                questions: questionsData,
                                draft_type: "personal",
                              });

                              if (saved?.id) {
                                setCurrentDraftId(saved.id);
                              }
                              
                              sonnerToast.success(t("extra.ptDraftSaved"));
                              setShowExitConfirm(false);
                              setShowDraftNameInput(false);
                              setDraftName("");
                              setCurrentDraftId(null);
                              onClose();
                            } catch (error) {
                              sonnerToast.error(t("extra.ptDraftSaveFailed"));
                            } finally {
                              setIsSavingDraft(false);
                            }
                          }}
                          disabled={!draftName.trim() || isSavingDraft}
                          className="flex-1"
                        >
                          {isSavingDraft ? <Loader2 className="w-4 h-4 animate-spin" /> : t("extra.editorSaveBtn")}
                        </ChunkyButton>
                      </div>
                    </>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Global Icon Picker - rendered via portal to escape carousel stacking context */}
    {iconPickerIndex !== null && questions[iconPickerIndex] && createPortal(
      <QuestionIconPicker
        isOpen={true}
        onClose={() => setIconPickerIndex(null)}
        selectedSlug={questions[iconPickerIndex]?.iconSlug || null}
        onSelect={(slug) => {
          handleIconChange(slug, iconPickerIndex);
          setIconPickerIndex(null);
        }}
        // We're creating trivia here, so allow searching/selecting icons that match the answer.
        creatorMode
        questionText={questions[iconPickerIndex]?.question}
        correctAnswer={questions[iconPickerIndex]?.answers.find(a => a.isCorrect)?.text}
        incorrectAnswers={questions[iconPickerIndex]?.answers.filter(a => !a.isCorrect).map(a => a.text)}
        large
      />,
      document.body
    )}
  </>
  );
}
