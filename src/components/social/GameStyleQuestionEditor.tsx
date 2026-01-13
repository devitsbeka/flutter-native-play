import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, Reorder, useDragControls } from "framer-motion";
import { ChevronLeft, Copy, Trash2, Check, Plus, Edit3, ImageIcon, GripVertical, X, Lightbulb, Image, Globe, Lock, RefreshCw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
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
  return questions.map((q, idx) => ({
    id: `gen-${idx}-${Date.now()}`,
    question: q.question_text,
    answers: [
      { id: `a-${idx}-0`, text: q.correct_answer, isCorrect: true },
      ...q.incorrect_answers.map((ans, i) => ({ id: `a-${idx}-${i+1}`, text: ans, isCorrect: false }))
    ],
    iconSlug: q.icon_slug || undefined,
  }));
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
              placeholder="სწორი პასუხი..."
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
              placeholder="პასუხი..."
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
        <button
          onClick={onSetCorrect}
          className={cn(
            "w-11 h-11 rounded-full flex items-center justify-center font-bold flex-shrink-0 transition-colors",
            answer.isCorrect 
              ? "bg-white text-emerald-500" 
              : "bg-[#7DD3FC] hover:bg-emerald-400 text-white"
          )}
          title={answer.isCorrect ? "სწორი პასუხი" : "დააჭირე სწორად დასაყენებლად"}
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
                {answer.isCorrect ? "სწორი პასუხი..." : "პასუხი..."}
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
  saveButtonText = "შენახვა",
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
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);
  const [errorField, setErrorField] = useState<{questionIndex: number; field: string; answerId?: string} | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        newQuestions[index] = {
          ...newQuestions[index],
          question: data.question_text || "",
          answers: [
            { id: `a-ai-${Date.now()}-0`, text: data.correct_answer || "", isCorrect: true },
            ...(data.incorrect_answers || []).slice(0, answerFormat === "true_false" ? 1 : 3).map((ans: string, i: number) => ({
              id: `a-ai-${Date.now()}-${i+1}`,
              text: ans,
              isCorrect: false,
            })),
          ],
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
      className="fixed inset-0 z-50 bg-[#6B5B95] flex flex-col"
    >
      {/* Header */}
      <div className="pt-[calc(env(safe-area-inset-top,8px)+16px)] px-4 py-3 flex items-center justify-between">
        <button
          onClick={onBack}
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
              placeholder="თამაშის სახელი..."
            />
          ) : (
            <button 
              onClick={() => setIsEditingTitle(true)}
              className="flex items-center gap-2 text-white"
            >
              <span className="font-bold truncate max-w-[150px]">
                {title || "თამაშის სახელი..."}
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
          onClick={handleAddQuestion}
          className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
        >
          <Plus className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Header Content (for round tabs) */}
      {headerContent}

          {/* Action Toolbar */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-center gap-2">
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

          <button
            onClick={handleDuplicate}
            className="h-10 w-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-all"
          >
            <Copy className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="h-10 w-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-red-500/50 text-white transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

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
              {/* Question Card */}
              <div className="relative rounded-3xl overflow-hidden shadow-lg mb-4">
                {question.backgroundImageUrl && (
                  <>
                    <img 
                      src={question.backgroundImageUrl} 
                      className="absolute inset-0 w-full h-full object-cover"
                      alt=""
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-[#5A4A7A]/80 via-[#5A4A7A]/70 to-[#5A4A7A]/90" />
                    <button
                      onClick={removeBackgroundImage}
                      className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                )}
                
            <div className={cn(
              "relative z-10 p-5",
              !question.backgroundImageUrl && "bg-[#5A4A7A]"
            )}>
              {/* Question Counter */}
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/20 text-white text-xs font-medium">
                {index + 1}/{questions.length}
              </div>

              {/* Icon */}
                  <div className="flex justify-center mb-3">
                    <QuestionIconPicker
                      selectedSlug={question.iconSlug || null}
                      onSelect={(slug) => handleIconChange(slug, index)}
                      questionText={question.question}
                      correctAnswer={question.answers.find(a => a.isCorrect)?.text}
                      incorrectAnswers={question.answers.filter(a => !a.isCorrect).map(a => a.text)}
                    />
                  </div>

                  {/* Question Text */}
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
                        "text-xl font-bold text-white leading-relaxed group-hover:text-white/80 transition-colors min-h-[50px] flex items-center justify-center",
                        errorField?.questionIndex === index && errorField?.field === "question" && "text-red-300"
                      )}>
                        {question.question || <span className="text-white/50">დააჭირე კითხვის დასამატებლად...</span>}
                      </p>
                      <Edit3 className="w-4 h-4 text-white/50 mx-auto mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  )}

                  {/* AI Generate Button */}
                  <button
                    onClick={() => handleGenerateAI(index)}
                    disabled={isGeneratingAI}
                    className="mx-auto mt-4 flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 hover:bg-white/30 text-white text-sm font-medium transition-all disabled:opacity-50"
                  >
                    {isGeneratingAI && generatingIndex === index ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        გენერირება...
                      </>
                    ) : (
                      <>
                        <Lightbulb className="w-4 h-4" />
                        {question.question.trim() ? "სცადე სხვა" : "იდეა"}
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Reorderable Answers */}
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
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Dots */}
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
              ინახება...
            </>
          ) : (
            <>
              <Check className="w-5 h-5 mr-2" />
              {saveButtonText}
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
    </motion.div>
  );
}
