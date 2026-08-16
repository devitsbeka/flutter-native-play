import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, Reorder, useDragControls } from "framer-motion";
import { ChevronLeft, ChevronRight, Copy, Trash2, Check, Plus, Edit3, ImageIcon, GripVertical, X, Lightbulb, Image, Globe, Lock, RefreshCw, Loader2, Sparkles, Smile } from "lucide-react";
import { cn } from "@/lib/utils";
import { shuffleArray } from "@/utils/shuffle";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { QuestionIconPicker } from "@/components/social/QuestionIconPicker";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import useEmblaCarousel from "embla-carousel-react";

const ICON_STORAGE_URL = "https://sqwpzezkhpqkdyltvsim.supabase.co/storage/v1/object/public/icon-library";

interface Answer {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface EditorQuestion {
  id: string;
  question: string;
  answers: Answer[];
  iconSlug?: string;
  backgroundImageUrl?: string;
}

export interface GeneratedQuestion {
  question_text: string;
  correct_answer: string;
  incorrect_answers: string[];
  difficulty?: string;
  icon_slug?: string | null;
}

interface GameStyleQuestionEditorProps {
  questions: EditorQuestion[];
  onQuestionsChange: (questions: EditorQuestion[]) => void;
  title: string;
  onTitleChange: (title: string) => void;
  onSave: () => void;
  onBack: () => void;
  saveButtonText?: string;
  showTitleEditor?: boolean;
  subject?: string;
  answerFormat?: "4_answers" | "true_false";
  headerContent?: React.ReactNode;
  isSaving?: boolean;
  // Optional cover/footer props for trivia modal
  coverImageUrl?: string | null;
  selectedGradient?: string;
  isPublic?: boolean;
  onPublicChange?: (isPublic: boolean) => void;
  onRegenerateCover?: () => void;
  isGeneratingCover?: boolean;
  coverGenerationCount?: number;
}

// Convert from GeneratedQuestion format to EditorQuestion format
export function convertToEditorQuestions(questions: GeneratedQuestion[]): EditorQuestion[] {
  return questions.map((q, idx) => {
    const answers = [
      { id: `a-${idx}-0`, text: q.correct_answer, isCorrect: true },
      ...q.incorrect_answers.map((ans, i) => ({ id: `a-${idx}-${i+1}`, text: ans, isCorrect: false }))
    ];
    // Shuffle answers so correct answer isn't always first
    return {
      id: `gen-${idx}-${Date.now()}`,
      question: q.question_text,
      answers: shuffleArray(answers),
      iconSlug: q.icon_slug || undefined,
    };
  });
}

// Convert from EditorQuestion format to GeneratedQuestion format
export function convertToGeneratedQuestions(questions: EditorQuestion[]): GeneratedQuestion[] {
  return questions.map(q => {
    const correctAnswer = q.answers.find(a => a.isCorrect);
    const incorrectAnswers = q.answers.filter(a => !a.isCorrect);
    return {
      question_text: q.question,
      correct_answer: correctAnswer?.text || "",
      incorrect_answers: incorrectAnswers.map(a => a.text),
      icon_slug: q.iconSlug || null,
    };
  });
}

// Create empty question helper
export function createEmptyQuestion(answerFormat: "4_answers" | "true_false" = "4_answers"): EditorQuestion {
  const answerCount = answerFormat === "true_false" ? 2 : 4;
  return {
    id: `new-${Date.now()}`,
    question: "",
    answers: Array.from({ length: answerCount }, (_, i) => ({
      id: `a-${Date.now()}-${i}`,
      text: answerFormat === "true_false" ? (i === 0 ? "მართალია" : "მცდარი") : "",
      isCorrect: i === 0,
    })),
  };
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
}) {
  const { t } = useLanguage();
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
              placeholder={t("extra.editorCorrectAnswerPlaceholder")}
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
              placeholder={t("extra.editorAnswerPlaceholder")}
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
      dragListener={false}
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
        <button
          onClick={onSetCorrect}
          className={cn(
            "w-11 h-11 rounded-full flex items-center justify-center font-bold flex-shrink-0 transition-colors",
            answer.isCorrect 
              ? "bg-white text-emerald-500" 
              : "bg-[#7DD3FC] hover:bg-emerald-400 text-white"
          )}
          title={answer.isCorrect ? t("extra.editorCorrectAnswerTitle") : t("extra.editorSetCorrectTitle")}
        >
          {answer.isCorrect ? <Check className="w-5 h-5" /> : `${letter}:`}
        </button>
        
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
                {answer.isCorrect ? t("extra.editorCorrectAnswerPlaceholder") : t("extra.editorAnswerPlaceholder")}
              </span>
            )}
          </span>
        </button>
        
        <Edit3 className={cn(
          "w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity",
          answer.isCorrect ? "text-white/50" : "text-muted-foreground"
        )} />
        
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

export function GameStyleQuestionEditor({
  questions,
  onQuestionsChange,
  title,
  onTitleChange,
  onSave,
  onBack,
  saveButtonText,
  showTitleEditor = true,
  subject,
  answerFormat = "4_answers",
  headerContent,
  isSaving = false,
  // Optional cover props
  coverImageUrl,
  selectedGradient,
  isPublic,
  onPublicChange,
  onRegenerateCover,
  isGeneratingCover,
  coverGenerationCount = 0,
}: GameStyleQuestionEditorProps) {
  const { toast } = useToast();
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [editingField, setEditingField] = useState<"question" | string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const { t } = useLanguage();
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);
  const [errorField, setErrorField] = useState<{questionIndex: number; field: string; answerId?: string} | null>(null);
  const [iconPickerIndex, setIconPickerIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showIdeaGlow, setShowIdeaGlow] = useState(true);

  // Check if user has any progress that would be lost
  const hasProgress = () => {
    // Check if any question has meaningful content
    const hasQuestionContent = questions.some(q => 
      q.question.trim() !== "" ||
      q.answers.some(a => {
        const text = a.text.trim();
        // Ignore default true/false values
        return text !== "" && text !== "მართალია" && text !== "მცდარი";
      }) ||
      q.backgroundImageUrl ||
      q.iconSlug
    );
    
    // Check if title has been changed
    const hasTitleContent = title.trim() !== "";
    
    return hasQuestionContent || hasTitleContent;
  };

  const handleBackClick = () => {
    if (hasProgress()) {
      setShowBackConfirm(true);
    } else {
      onBack();
    }
  };

  const QUESTION_MAX = 65;
  const ANSWER_MAX = 25;
  const letters = ["ა", "ბ", "გ", "დ"];

  // Show cover footer section only if cover props are provided
  const showCoverFooter = coverImageUrl !== undefined || selectedGradient !== undefined;

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setCurrentIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi]);

  useEffect(() => {
    if (emblaApi) {
      emblaApi.reInit();
    }
  }, [questions.length, emblaApi]);

  useEffect(() => {
    if (editingField !== null) {
      if (editingField === "question" && textareaRef.current) {
        textareaRef.current.focus();
      } else if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  }, [editingField]);

  useEffect(() => {
    if (editingField !== null) {
      setErrorField(null);
    }
  }, [editingField]);

  // Glow effect every 5 seconds for idea button
  useEffect(() => {
    const interval = setInterval(() => {
      setShowIdeaGlow(true);
      setTimeout(() => setShowIdeaGlow(false), 1500);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const currentQuestion = questions[currentIndex];

  const handleAddQuestion = () => {
    const newQuestion = createEmptyQuestion(answerFormat);
    const newQuestions = [...questions, newQuestion];
    onQuestionsChange(newQuestions);
    
    setTimeout(() => {
      emblaApi?.scrollTo(newQuestions.length - 1);
    }, 100);

    toast({
      title: "➕ ახალი კითხვა დაემატა",
      duration: 2000,
    });
  };

  const handleDuplicate = () => {
    const duplicated: EditorQuestion = {
      ...currentQuestion,
      id: `dup-${Date.now()}`,
      answers: currentQuestion.answers.map((a, i) => ({
        ...a,
        id: `a-dup-${Date.now()}-${i}`,
      })),
    };
    const newQuestions = [...questions];
    newQuestions.splice(currentIndex + 1, 0, duplicated);
    onQuestionsChange(newQuestions);
    
    setTimeout(() => {
      emblaApi?.scrollTo(currentIndex + 1);
    }, 100);

    toast({
      title: "📋 კითხვა დუბლირდა",
      duration: 2000,
    });
  };

  const handleDelete = () => {
    if (questions.length <= 1) {
      toast({
        title: "არ შეიძლება",
        description: "მინიმუმ 1 კითხვა უნდა იყოს",
        variant: "destructive",
      });
      return;
    }

    const newQuestions = questions.filter((_, i) => i !== currentIndex);
    onQuestionsChange(newQuestions);
    
    const newIndex = Math.min(currentIndex, newQuestions.length - 1);
    setTimeout(() => {
      emblaApi?.scrollTo(newIndex);
    }, 100);

    setShowDeleteConfirm(false);
    toast({
      title: "🗑️ კითხვა წაიშალა",
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
    onQuestionsChange(newQuestions);
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
      const answerIndex = question.answers.findIndex(a => a.id === editingField);
      if (answerIndex !== -1) {
        question.answers = question.answers.map((a, i) => 
          i === answerIndex ? { ...a, text: editValue.slice(0, ANSWER_MAX) } : a
        );
      }
    }

    newQuestions[currentIndex] = question;
    onQuestionsChange(newQuestions);
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
    onQuestionsChange(newQuestions);
  };

  const handleReorder = (newOrder: Answer[]) => {
    const newQuestions = [...questions];
    newQuestions[currentIndex] = {
      ...newQuestions[currentIndex],
      answers: newOrder,
    };
    onQuestionsChange(newQuestions);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "შეცდომა",
        description: "მხოლოდ სურათის ატვირთვაა შესაძლებელი",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "შეცდომა",
        description: "სურათი ძალიან დიდია (მაქს. 5MB)",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const localUrl = URL.createObjectURL(file);
      const newQuestions = [...questions];
      newQuestions[currentIndex] = {
        ...newQuestions[currentIndex],
        backgroundImageUrl: localUrl,
      };
      onQuestionsChange(newQuestions);
      
      toast({
        title: "📷 სურათი დაემატა",
        duration: 2000,
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "შეცდომა",
        description: "სურათის ატვირთვა ვერ მოხერხდა",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
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
    onQuestionsChange(newQuestions);
  };

  const handleGenerateAI = async (index: number) => {
    setIsGeneratingAI(true);
    setGeneratingIndex(index);
    
    try {
      const existingQuestions = questions
        .filter((q, i) => i !== index && q.question.trim())
        .map(q => q.question);

      const { data, error } = await supabase.functions.invoke('generate-single-question', {
        body: { 
          subject: subject || title || 'საინტერესო ფაქტები',
          answerFormat,
          difficulty: 'medium',
          existingQuestions,
          mode: 'trivia', // Factual questions for Trivia/Collection mode
        }
      });
      
      if (error) throw error;
      
      if (data?.question_text) {
        const newQuestions = [...questions];
        // Build answers array and shuffle to randomize correct answer position
        const answersArray = [
          { id: `a-ai-${Date.now()}-0`, text: data.correct_answer || "", isCorrect: true },
          ...(data.incorrect_answers || []).slice(0, answerFormat === "true_false" ? 1 : 3).map((ans: string, i: number) => ({
            id: `a-ai-${Date.now()}-${i+1}`,
            text: ans,
            isCorrect: false,
          })),
        ];
        newQuestions[index] = {
          ...newQuestions[index],
          question: data.question_text || "",
          answers: shuffleArray(answersArray),
          iconSlug: data.icon_slug || undefined,
        };
        onQuestionsChange(newQuestions);
        
        toast({
          title: "✨ კითხვა შეივსო!",
          duration: 2000,
        });
      } else {
        throw new Error("No question data returned");
      }
    } catch (error) {
      console.error('AI generation error:', error);
      toast({
        title: "შეცდომა",
        description: "AI გენერაცია ვერ მოხერხდა. სცადეთ თავიდან.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAI(false);
      setGeneratingIndex(null);
    }
  };

  const validateQuestions = (): boolean => {
    for (let idx = 0; idx < questions.length; idx++) {
      const q = questions[idx];
      if (!q.question.trim()) {
        emblaApi?.scrollTo(idx);
        setErrorField({ questionIndex: idx, field: "question" });
        toast({
          title: "⚠️ შეცდომა",
          description: `კითხვა ${idx + 1}: კითხვა არ არის შევსებული`,
          variant: "destructive",
        });
        return false;
      }
      
      for (let answerIdx = 0; answerIdx < q.answers.length; answerIdx++) {
        const answer = q.answers[answerIdx];
        if (!answer.text.trim()) {
          emblaApi?.scrollTo(idx);
          setErrorField({ questionIndex: idx, field: "answer", answerId: answer.id });
          toast({
            title: "⚠️ შეცდომა",
            description: `კითხვა ${idx + 1}: პასუხი არ არის შევსებული`,
            variant: "destructive",
          });
          return false;
        }
      }
    }
    return true;
  };

  const handleSave = () => {
    if (!validateQuestions()) return;
    onSave();
  };

  const getLetterForAnswer = (answers: Answer[], answerId: string): string => {
    const index = answers.findIndex(a => a.id === answerId);
    return letters[index] || "?";
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 safe-screen z-50 flex flex-col"
      style={{ background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 50%, #4C1D95 100%)" }}
    >
      {/* Header */}
      <div className="pt-[calc(env(safe-area-inset-top,8px)+16px)] px-4 py-3">
        <div className="max-w-[700px] md:max-w-[600px] mx-auto w-full flex items-center justify-between">
        <button
          onClick={handleBackClick}
          className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        
        {showTitleEditor ? (
          isEditingTitle ? (
            <Input
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
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
          )
        ) : (
          <span className="font-bold text-white truncate max-w-[200px]">
            {title}
          </span>
        )}

        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="w-8 h-8 rounded-full bg-white/20 hover:bg-red-500/50 flex items-center justify-center transition-all"
        >
          <Trash2 className="w-5 h-5 text-white" />
        </button>
        </div>
      </div>

      {/* Header Content (for round tabs) */}
      {headerContent}


      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      {/* Navigation Arrows - Rendered via Portal for visibility */}
      {createPortal(
        <>
          {/* Left Arrow */}
          <button
            onClick={() => emblaApi?.scrollPrev()}
            disabled={currentIndex === 0}
            className="fixed left-2 top-1/2 -translate-y-1/2 z-[9999] w-12 h-12 rounded-full bg-white/90 shadow-lg border-2 border-purple-300 flex items-center justify-center text-purple-700 hover:bg-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ marginTop: '-40px' }}
          >
            <ChevronLeft className="w-7 h-7" />
          </button>
          
          {/* Right Arrow */}
          <button
            onClick={() => emblaApi?.scrollNext()}
            disabled={currentIndex >= questions.length - 1}
            className="fixed right-2 top-1/2 -translate-y-1/2 z-[9999] w-12 h-12 rounded-full bg-white/90 shadow-lg border-2 border-purple-300 flex items-center justify-center text-purple-700 hover:bg-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ marginTop: '-40px' }}
          >
            <ChevronRight className="w-7 h-7" />
          </button>
        </>,
        document.body
      )}

      {/* Carousel */}
      <div className="flex-1 overflow-hidden" ref={emblaRef}>
        <div className="flex h-full">
          {questions.map((question, index) => (
            <div
              key={question.id}
              className="flex-[0_0_100%] min-w-0 px-4 flex flex-col"
            >
              {/* Question Card */}
              <div className="relative rounded-3xl shadow-lg mb-4">
                {/* Background image wrapper - overflow-hidden only here */}
                <div className="absolute inset-0 rounded-3xl overflow-hidden">
                  {question.backgroundImageUrl && (
                    <>
                      <img 
                        src={question.backgroundImageUrl} 
                        className="absolute inset-0 w-full h-full object-cover"
                        alt=""
                      />
                      <div className="absolute inset-0 bg-gradient-to-b from-[#5B21B6]/80 via-[#5B21B6]/70 to-[#5B21B6]/90" />
                    </>
                  )}
                </div>
                {question.backgroundImageUrl && (
                  <button
                    onClick={removeBackgroundImage}
                    className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                
            <div className={cn(
              "relative z-10 p-3",
              !question.backgroundImageUrl && "bg-[#5B21B6]"
            )}>
              {/* Question Counter */}
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-white/20 text-white text-xs font-medium">
                {index + 1}/{questions.length}
              </div>

              {/* Action Button - Top Right */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className={cn(
                  "absolute top-2 z-20 h-7 w-7 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-all disabled:opacity-50",
                  question.backgroundImageUrl ? "right-12" : "right-2"
                )}
              >
                {isUploading ? (
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Image className="w-3 h-3" />
                )}
              </button>

              {/* Empty State with Idea Button */}
              {!question.question ? (
                <div className="flex flex-col items-center justify-center py-4 pt-6">
                  <div className="flex justify-center mb-2 pt-2 px-4 overflow-visible">
                    <button
                      type="button"
                      onClick={() => setIconPickerIndex(index)}
                      className="rounded-2xl flex items-center justify-center transition-all flex-shrink-0 relative active:scale-95 hover:scale-105"
                      style={{ width: 48, height: 48 }}
                    >
                      {question.iconSlug ? (
                        <>
                          <img
                            src={`${ICON_STORAGE_URL}/${question.iconSlug}.png`}
                            alt=""
                            style={{ width: 40, height: 40 }}
                            className="object-contain"
                          />
                          <div className="absolute -top-1 -right-1 w-6 h-6 bg-white/90 rounded-full flex items-center justify-center shadow-sm border border-slate-200/50 z-30">
                            <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
                          </div>
                        </>
                      ) : (
                        <>
                          <Smile style={{ width: 32, height: 32 }} className="text-muted-foreground" />
                          <div className="absolute bottom-0 right-0 translate-y-1/4 translate-x-1/4 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-200">
                            <Plus className="w-3 h-3 text-slate-600" />
                          </div>
                        </>
                      )}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleGenerateAI(index)}
                    disabled={isGeneratingAI}
                    className="mb-2 inline-flex items-center justify-center rounded-full active:scale-95 disabled:opacity-60"
                    aria-label="იდეა"
                  >
                    <Lightbulb className="w-10 h-10 text-white/40" />
                  </button>
                  <p className="text-white/60 text-sm mb-3">დააჭირე AI იდეას</p>
                  <button
                    onClick={() => handleGenerateAI(index)}
                    disabled={isGeneratingAI}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 text-white font-semibold transition-all hover:scale-105 active:scale-95",
                      showIdeaGlow && "animate-glow-pulse"
                    )}
                  >
                    {isGeneratingAI && generatingIndex === index ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    იდეა
                  </button>
                  <button
                    onClick={() => startEditing("question", "")}
                    className="mt-2 text-xs text-white/50 hover:text-white/70 transition-colors"
                  >
                    ან დაწერე ხელით
                  </button>
                </div>
              ) : (
                <>
                  {/* Icon */}
                  <div className="flex justify-center mb-2 pt-4 px-4 overflow-visible">
                    <button
                      type="button"
                      onClick={() => setIconPickerIndex(index)}
                      className="rounded-2xl flex items-center justify-center transition-all flex-shrink-0 relative active:scale-95 hover:scale-105"
                      style={{ width: 48, height: 48 }}
                    >
                      {question.iconSlug ? (
                        <>
                          <img
                            src={`${ICON_STORAGE_URL}/${question.iconSlug}.png`}
                            alt=""
                            style={{ width: 40, height: 40 }}
                            className="object-contain"
                          />
                          <div className="absolute -top-1 -right-1 w-6 h-6 bg-white/90 rounded-full flex items-center justify-center shadow-sm border border-slate-200/50 z-30">
                            <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
                          </div>
                        </>
                      ) : (
                        <>
                          <Smile style={{ width: 32, height: 32 }} className="text-muted-foreground" />
                          <div className="absolute bottom-0 right-0 translate-y-1/4 translate-x-1/4 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-200">
                            <Plus className="w-3 h-3 text-slate-600" />
                          </div>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Question Text */}
                  {editingField === "question" && index === currentIndex ? (
                    <div className="space-y-1">
                      <Textarea
                        ref={textareaRef}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={saveEdit}
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && saveEdit()}
                        className="min-h-[60px] text-center text-base font-bold bg-white/20 border-white/30 text-white placeholder:text-white/50 resize-none"
                        maxLength={QUESTION_MAX}
                        placeholder="შეიყვანე კითხვა..."
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
                        "text-lg font-bold text-white leading-snug group-hover:text-white/80 transition-colors min-h-[40px] flex items-center justify-center",
                        errorField?.questionIndex === index && errorField?.field === "question" && "text-red-300"
                      )}>
                        {question.question}
                      </p>
                      <Edit3 className="w-3.5 h-3.5 text-white/50 mx-auto mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  )}
                </>
              )}
                </div>
              </div>

              {/* Answers Section */}
              {answerFormat === "true_false" ? (
                // Side-by-side layout for True/False
                <div className="flex gap-4 pb-4">
                  {question.answers.map((answer) => {
                    const isTrue = answer.text === "მართალია";
                    const hasError = errorField?.questionIndex === index && errorField?.answerId === answer.id;
                    
                    return (
                      <button
                        key={answer.id}
                        onClick={() => setCorrectAnswer(answer.id)}
                        className={cn(
                          "flex-1 flex flex-col items-center justify-center gap-3 p-6 rounded-3xl transition-all min-h-[140px]",
                          answer.isCorrect
                            ? "bg-emerald-500 shadow-[0_6px_0_0_#059669]"
                            : "bg-[#E8E4F4] shadow-[0_6px_0_0_#C4BFD9]",
                          hasError && "ring-2 ring-red-500 animate-pulse"
                        )}
                      >
                        <div className={cn(
                          "w-14 h-14 rounded-full flex items-center justify-center",
                          answer.isCorrect ? "bg-white" : "bg-white/80"
                        )}>
                          {isTrue ? (
                            <Check className={cn(
                              "w-8 h-8",
                              answer.isCorrect ? "text-emerald-500" : "text-emerald-600"
                            )} strokeWidth={3} />
                          ) : (
                            <X className={cn(
                              "w-8 h-8",
                              answer.isCorrect ? "text-emerald-500" : "text-rose-500"
                            )} strokeWidth={3} />
                          )}
                        </div>
                        <span className={cn(
                          "font-bold text-lg",
                          answer.isCorrect ? "text-white" : "text-slate-700"
                        )}>
                          {answer.text}
                        </span>
                        {answer.isCorrect && (
                          <span className="text-white/80 text-xs font-medium">სწორი პასუხი</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                // Reorderable list for 4-answer questions
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
                    />
                  ))}
                </Reorder.Group>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Dots with Swipe Hint */}
      <div className="flex justify-center items-center gap-2 py-4 px-4">
        {/* Left swipe hint */}
        <ChevronLeft className="w-4 h-4 text-white/40 animate-pulse" />
        
        {/* Dots */}
        <div className="flex gap-1.5 overflow-x-auto">
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
        
        {/* Right swipe hint */}
        <ChevronRight className="w-4 h-4 text-white/40 animate-pulse" />
      </div>

      {/* Footer with Cover Preview (if applicable) or Save Button */}
      <div className="px-4 pb-[calc(env(safe-area-inset-bottom,16px)+12px)] pt-2 space-y-3">
        {/* Cover Preview for Trivia modal */}
        {showCoverFooter && (
          <div 
            className="p-3 rounded-2xl text-white relative overflow-hidden flex items-center gap-3"
            style={{ 
              background: coverImageUrl 
                ? `linear-gradient(to right, rgba(0,0,0,0.5), rgba(0,0,0,0.3)), url(${coverImageUrl}) center/cover`
                : selectedGradient || 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)'
            }}
          >
            {isGeneratingCover && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                <Loader2 className="w-5 h-5 animate-spin text-white" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              {isEditingTitle ? (
                <Input
                  value={title}
                  onChange={(e) => onTitleChange(e.target.value)}
                  onBlur={() => setIsEditingTitle(false)}
                  onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
                  autoFocus
                  className="bg-white/20 border-white/30 text-white placeholder:text-white/70 text-sm font-bold h-8 rounded-lg"
                  placeholder="Trivia-ს სახელი"
                />
              ) : (
                <button 
                  onClick={() => setIsEditingTitle(true)}
                  className="flex items-center gap-2 group"
                >
                  <span className="text-sm font-bold text-white truncate">
                    {title || "Trivia-ს სახელი"}
                  </span>
                  <Edit3 className="w-3 h-3 text-white/70 group-hover:text-white transition-colors flex-shrink-0" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {onPublicChange && (
                <button
                  onClick={() => onPublicChange(!isPublic)}
                  className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"
                >
                  {isPublic ? <Globe className="w-4 h-4 text-white" /> : <Lock className="w-4 h-4 text-white" />}
                </button>
              )}
              {onRegenerateCover && (
                <button
                  onClick={onRegenerateCover}
                  disabled={isGeneratingCover || coverGenerationCount >= 3}
                  className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center disabled:opacity-50"
                >
                  <RefreshCw className={cn("w-4 h-4 text-white", isGeneratingCover && "animate-spin")} />
                </button>
              )}
            </div>
          </div>
        )}
        
        <ChunkyButton 
          onClick={handleSave}
          className="w-full"
          variant="success"
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              {t("extra.editorSavingBtn")}
            </>
          ) : (
            <>
              <Check className="w-5 h-5 mr-2" />
              {saveButtonText || t("extra.editorSaveBtn")}
            </>
          )}
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
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl"
            >
              <h3 className="text-lg font-bold text-center mb-2">წავშალო კითხვა?</h3>
              <p className="text-muted-foreground text-center text-sm mb-6">
                კითხვა უკან ვერ დაბრუნდება
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3 rounded-xl bg-muted font-medium"
                >
                  გაუქმება
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-3 rounded-xl bg-red-500 text-white font-medium"
                >
                  წაშლა
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back Confirmation Modal */}
      <AnimatePresence>
        {showBackConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
            onClick={() => setShowBackConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl"
            >
              <h3 className="text-lg font-bold text-center mb-2">გსურთ გასვლა?</h3>
              <p className="text-muted-foreground text-center text-sm mb-6">
                თქვენი პროგრესი დაიკარგება და ვერ აღდგება
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowBackConfirm(false)}
                  className="flex-1 py-3 rounded-xl bg-muted font-medium"
                >
                  დარჩენა
                </button>
                <button
                  onClick={() => {
                    setShowBackConfirm(false);
                    onBack();
                  }}
                  className="flex-1 py-3 rounded-xl bg-red-500 text-white font-medium"
                >
                  გასვლა
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Icon Picker - rendered via portal to escape stacking context */}
      {iconPickerIndex !== null && questions[iconPickerIndex] && createPortal(
        <QuestionIconPicker
          isOpen={true}
          onClose={() => setIconPickerIndex(null)}
          selectedSlug={questions[iconPickerIndex]?.iconSlug || null}
          onSelect={(slug) => {
            handleIconChange(slug, iconPickerIndex);
            setIconPickerIndex(null);
          }}
          questionText={questions[iconPickerIndex]?.question}
          correctAnswer={questions[iconPickerIndex]?.answers.find(a => a.isCorrect)?.text}
          incorrectAnswers={questions[iconPickerIndex]?.answers.filter(a => !a.isCorrect).map(a => a.text)}
        />,
        document.body
      )}
    </motion.div>
  );
}
