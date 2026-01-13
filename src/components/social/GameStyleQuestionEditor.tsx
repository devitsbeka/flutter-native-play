import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Sparkles, Copy, Trash2, Check, Loader2, Globe, Lock, Edit3, RefreshCw, X, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { QuestionIconPicker } from "./QuestionIconPicker";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import useEmblaCarousel from "embla-carousel-react";

const ICON_STORAGE_URL = "https://sqwpzezkhpqkdyltvsim.supabase.co/storage/v1/object/public/icon-library";

interface GeneratedQuestion {
  question_text: string;
  correct_answer: string;
  incorrect_answers: string[];
  difficulty?: string;
  icon_slug?: string;
}

interface GameStyleQuestionEditorProps {
  questions: GeneratedQuestion[];
  onQuestionsChange: (questions: GeneratedQuestion[]) => void;
  onClose: () => void;
  onPublish: () => void;
  subject: string;
  answerFormat: "4_answers" | "true_false";
  title: string;
  onTitleChange: (title: string) => void;
  coverImageUrl: string | null;
  selectedGradient: string;
  isPublic: boolean;
  onPublicChange: (isPublic: boolean) => void;
  isPosting: boolean;
  onRegenerateCover: () => void;
  isGeneratingCover: boolean;
  coverGenerationCount: number;
}

export function GameStyleQuestionEditor({
  questions,
  onQuestionsChange,
  onClose,
  onPublish,
  subject,
  answerFormat,
  title,
  onTitleChange,
  coverImageUrl,
  selectedGradient,
  isPublic,
  onPublicChange,
  isPosting,
  onRegenerateCover,
  isGeneratingCover,
  coverGenerationCount,
}: GameStyleQuestionEditorProps) {
  const { toast } = useToast();
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false);
  const [editingField, setEditingField] = useState<"question" | "correct" | number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Character limits
  const QUESTION_MAX = 65;
  const ANSWER_MAX = 20;

  // Sync carousel index
  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setCurrentIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi]);

  // Focus input when editing
  useEffect(() => {
    if (editingField !== null && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingField]);

  const currentQuestion = questions[currentIndex];

  const handleGenerateQuestion = async () => {
    if (isGeneratingQuestion) return;
    setIsGeneratingQuestion(true);

    try {
      const existingQuestions = questions.map(q => q.question_text);
      
      const { data, error } = await supabase.functions.invoke("generate-single-question", {
        body: { 
          subject, 
          answerFormat,
          difficulty: currentQuestion?.difficulty || "medium",
          existingQuestions
        },
      });

      if (error) throw error;
      if (!data?.question_text) throw new Error("No question generated");

      // Replace current question with generated one
      const newQuestions = [...questions];
      newQuestions[currentIndex] = {
        question_text: data.question_text,
        correct_answer: data.correct_answer,
        incorrect_answers: data.incorrect_answers,
        difficulty: data.difficulty,
        icon_slug: data.icon_slug,
      };
      onQuestionsChange(newQuestions);

      toast({
        title: "✨ ახალი კითხვა შეიქმნა!",
        duration: 2000,
      });
    } catch (error) {
      console.error("Error generating question:", error);
      toast({
        title: "შეცდომა",
        description: "კითხვის გენერაცია ვერ მოხერხდა",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingQuestion(false);
    }
  };

  const handleDuplicate = () => {
    const newQuestions = [...questions];
    const duplicated = { ...currentQuestion };
    newQuestions.splice(currentIndex + 1, 0, duplicated);
    onQuestionsChange(newQuestions);
    
    // Navigate to the duplicated question
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
    
    // Navigate to previous or stay at same index
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

  const handleIconChange = (slug: string | null) => {
    const newQuestions = [...questions];
    newQuestions[currentIndex] = {
      ...newQuestions[currentIndex],
      icon_slug: slug || undefined,
    };
    onQuestionsChange(newQuestions);
  };

  const startEditing = (field: "question" | "correct" | number, value: string) => {
    setEditingField(field);
    setEditValue(value);
  };

  const saveEdit = () => {
    if (editingField === null) return;

    const newQuestions = [...questions];
    const question = { ...newQuestions[currentIndex] };

    if (editingField === "question") {
      question.question_text = editValue.slice(0, QUESTION_MAX);
    } else if (editingField === "correct") {
      question.correct_answer = editValue.slice(0, ANSWER_MAX);
    } else if (typeof editingField === "number") {
      const newIncorrect = [...question.incorrect_answers];
      newIncorrect[editingField] = editValue.slice(0, ANSWER_MAX);
      question.incorrect_answers = newIncorrect;
    }

    newQuestions[currentIndex] = question;
    onQuestionsChange(newQuestions);
    setEditingField(null);
    setEditValue("");
  };

  const letters = ["ა", "ბ", "გ", "დ"];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-gradient-to-b from-[#9B8AC4] to-[#8B7AB8] flex flex-col"
    >
      {/* Header */}
      <div className="pt-[env(safe-area-inset-top,8px)] px-4 py-3 flex items-center justify-between">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        
        <div className="flex items-center gap-2 text-white">
          <span className="text-sm font-medium opacity-80">კითხვა</span>
          <span className="text-lg font-bold">{currentIndex + 1}/{questions.length}</span>
        </div>

        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Action Toolbar */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-center gap-2">
          {/* AI Generate Button */}
          <button
            onClick={handleGenerateQuestion}
            disabled={isGeneratingQuestion}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
              "bg-white/20 hover:bg-white/30 text-white",
              isGeneratingQuestion && "opacity-70"
            )}
          >
            {isGeneratingQuestion ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            იდეა
          </button>

          {/* Icon Picker */}
          <QuestionIconPicker
            selectedSlug={currentQuestion?.icon_slug || null}
            onSelect={handleIconChange}
            questionText={currentQuestion?.question_text}
            correctAnswer={currentQuestion?.correct_answer}
            incorrectAnswers={currentQuestion?.incorrect_answers}
          />

          {/* Duplicate Button */}
          <button
            onClick={handleDuplicate}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/20 hover:bg-white/30 text-white text-sm font-medium transition-all"
          >
            <Copy className="w-4 h-4" />
          </button>

          {/* Delete Button */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/20 hover:bg-red-500/50 text-white text-sm font-medium transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Carousel */}
      <div className="flex-1 overflow-hidden" ref={emblaRef}>
        <div className="flex h-full">
          {questions.map((question, index) => (
            <div
              key={index}
              className="flex-[0_0_100%] min-w-0 px-4 flex flex-col"
            >
              {/* Question Card */}
              <div className="bg-[#7B6BA8] rounded-3xl p-5 shadow-lg mb-4">
                {/* Icon */}
                <div className="flex justify-center mb-4">
                  {question.icon_slug ? (
                    <img
                      src={`${ICON_STORAGE_URL}/${question.icon_slug}.png`}
                      alt=""
                      className="w-16 h-16 object-contain"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-white/50" />
                    </div>
                  )}
                </div>

                {/* Timer bar (decorative) */}
                <div className="mb-4 h-2 bg-white/30 rounded-full overflow-hidden">
                  <div className="h-full w-full bg-white rounded-full" />
                </div>

                {/* Question Text - Editable */}
                {editingField === "question" && index === currentIndex ? (
                  <div className="space-y-2">
                    <Textarea
                      ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={saveEdit}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && saveEdit()}
                      className="min-h-[80px] text-center text-lg font-bold bg-white/20 border-white/30 text-white placeholder:text-white/50 resize-none"
                      maxLength={QUESTION_MAX}
                    />
                    <div className="text-xs text-white/60 text-center">
                      {editValue.length}/{QUESTION_MAX}
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => startEditing("question", question.question_text)}
                    className="w-full text-center group"
                  >
                    <p className="text-xl font-bold text-white leading-relaxed group-hover:text-white/80 transition-colors">
                      {question.question_text}
                    </p>
                    <Edit3 className="w-4 h-4 text-white/50 mx-auto mt-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                )}
              </div>

              {/* Answer Buttons */}
              <div className="flex-1 flex flex-col gap-3 min-h-0 overflow-y-auto pb-4">
                {/* Correct Answer */}
                {editingField === "correct" && index === currentIndex ? (
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-emerald-500 shadow-[0_4px_0_0_#059669]">
                    <span className="w-11 h-11 rounded-full bg-white flex items-center justify-center text-emerald-500 font-bold flex-shrink-0">
                      <Check className="w-5 h-5" />
                    </span>
                    <Input
                      ref={inputRef as React.RefObject<HTMLInputElement>}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={saveEdit}
                      onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                      className="flex-1 bg-white/20 border-0 text-white placeholder:text-white/50 font-semibold"
                      maxLength={ANSWER_MAX}
                    />
                    <span className="text-xs text-white/70">{editValue.length}/{ANSWER_MAX}</span>
                  </div>
                ) : (
                  <button
                    onClick={() => startEditing("correct", question.correct_answer)}
                    className="flex items-center gap-4 p-3 rounded-2xl bg-emerald-500 shadow-[0_4px_0_0_#059669] text-left group hover:brightness-105 transition-all"
                  >
                    <span className="w-11 h-11 rounded-full bg-white flex items-center justify-center text-emerald-500 font-bold flex-shrink-0">
                      <Check className="w-5 h-5" />
                    </span>
                    <span className="flex-1 font-semibold text-white">
                      {question.correct_answer}
                    </span>
                    <Edit3 className="w-4 h-4 text-white/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                )}

                {/* Incorrect Answers */}
                {question.incorrect_answers.map((answer, answerIndex) => (
                  editingField === answerIndex && index === currentIndex ? (
                    <div key={answerIndex} className="flex items-center gap-3 p-3 rounded-2xl bg-white shadow-[0_4px_0_0_#d1d5db]">
                      <span className="w-11 h-11 rounded-full bg-[#7DD3FC] flex items-center justify-center text-white font-bold flex-shrink-0">
                        {letters[answerIndex + 1]}:
                      </span>
                      <Input
                        ref={inputRef as React.RefObject<HTMLInputElement>}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={saveEdit}
                        onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                        className="flex-1 border-0 font-semibold"
                        maxLength={ANSWER_MAX}
                      />
                      <span className="text-xs text-muted-foreground">{editValue.length}/{ANSWER_MAX}</span>
                    </div>
                  ) : (
                    <button
                      key={answerIndex}
                      onClick={() => startEditing(answerIndex, answer)}
                      className="flex items-center gap-4 p-3 rounded-2xl bg-white shadow-[0_4px_0_0_#d1d5db] text-left group hover:bg-gray-50 transition-all"
                    >
                      <span className="w-11 h-11 rounded-full bg-[#7DD3FC] flex items-center justify-center text-white font-bold flex-shrink-0">
                        {letters[answerIndex + 1]}:
                      </span>
                      <span className="flex-1 font-semibold text-slate-700">
                        {answer}
                      </span>
                      <Edit3 className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  )
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Dots */}
      <div className="flex justify-center gap-1.5 py-3">
        {questions.map((_, index) => (
          <button
            key={index}
            onClick={() => emblaApi?.scrollTo(index)}
            className={cn(
              "w-2 h-2 rounded-full transition-all",
              index === currentIndex ? "w-6 bg-white" : "bg-white/40"
            )}
          />
        ))}
      </div>

      {/* Footer with Cover Preview & Publish */}
      <div className="px-4 pb-[env(safe-area-inset-bottom,16px)] pt-2 space-y-3">
        {/* Mini Cover Preview */}
        <div 
          className="p-3 rounded-2xl text-white relative overflow-hidden flex items-center gap-3"
          style={{ 
            background: coverImageUrl 
              ? `linear-gradient(to right, rgba(0,0,0,0.5), rgba(0,0,0,0.3)), url(${coverImageUrl}) center/cover`
              : selectedGradient 
          }}
        >
          {/* Loading overlay */}
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

          {/* Controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => onPublicChange(!isPublic)}
              className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"
            >
              {isPublic ? <Globe className="w-4 h-4 text-white" /> : <Lock className="w-4 h-4 text-white" />}
            </button>
            <button
              onClick={onRegenerateCover}
              disabled={isGeneratingCover || coverGenerationCount >= 3}
              className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center disabled:opacity-50"
            >
              <RefreshCw className={cn("w-4 h-4 text-white", isGeneratingCover && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Publish Button */}
        <ChunkyButton 
          onClick={onPublish} 
          disabled={isPosting || !title.trim()}
          className="w-full"
          variant="success"
        >
          {isPosting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ქვეყნდება...
            </>
          ) : (
            <>
              <Check className="w-5 h-5 mr-2" />
              გამოქვეყნება
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
              className="bg-background rounded-2xl p-6 max-w-sm w-full space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
                  <Trash2 className="w-6 h-6 text-destructive" />
                </div>
                <h3 className="text-lg font-bold text-foreground">კითხვის წაშლა?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  ეს მოქმედება ვერ გაუქმდება
                </p>
              </div>
              <div className="flex gap-3">
                <ChunkyButton
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1"
                >
                  გაუქმება
                </ChunkyButton>
                <ChunkyButton
                  variant="danger"
                  onClick={handleDelete}
                  className="flex-1"
                >
                  წაშლა
                </ChunkyButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
