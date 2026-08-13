import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Loader2, Globe, Lock, Trash2, Check, AlertTriangle, ImageIcon, Plus, Smile, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useQueryClient } from "@tanstack/react-query";
import { QuestionIconPicker } from "./QuestionIconPicker";
import { CoverImagePicker } from "./CoverImagePicker";
import { DynamicIcon } from "@/components/shared/DynamicIcon";
import { hasAnswerInQuestion } from "@/utils/questionValidation";
import { validateIconKeyword } from "@/utils/iconAnswerValidation";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";

interface Question {
  question_text: string;
  correct_answer: string;
  incorrect_answers: string[];
  difficulty?: string;
  icon_slug?: string;
}

interface EditRoundModalProps {
  round: any | null;
  isOpen: boolean;
  onClose: () => void;
  onAddRound?: (collectionId: string, nextRoundNumber: number) => void;
}

type ViewMode = "info" | "questions";

export function EditRoundModal({ round, isOpen, onClose, onAddRound }: EditRoundModalProps) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  
  const [title, setTitle] = useState("");
  const [selectedGradient, setSelectedGradient] = useState("");
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [iconSlug, setIconSlug] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("info");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [deleteQuestionIndex, setDeleteQuestionIndex] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [iconPickerIndex, setIconPickerIndex] = useState<number | null>(null);
  
  // Edit state for question text and answers
  const [editingField, setEditingField] = useState<{
    type: 'question' | 'correct' | 'incorrect';
    questionIndex: number;
    answerIndex?: number;
  } | null>(null);
  const [editValue, setEditValue] = useState("");
  
  // Track original values to detect changes
  const [originalValues, setOriginalValues] = useState<{
    title: string;
    isPublic: boolean;
    gradient: string;
    coverImage: string | null;
    questions: Question[];
  } | null>(null);

  useEffect(() => {
    if (round) {
      const initialTitle = round.title || "";
      const initialGradient = round.cover_gradient || "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)";
      const initialCoverImage = round.cover_image || null;
      const initialIsPublic = round.is_public !== false;
      
      setTitle(initialTitle);
      setSelectedGradient(initialGradient);
      setCoverImage(initialCoverImage);
      setIsPublic(initialIsPublic);
      setIconSlug(round.icon_slug || null);
      setShowDeleteConfirm(false);
      setViewMode("info");
      setCurrentQuestionIndex(0);
      setDeleteQuestionIndex(null);
      setHasChanges(false);
      setIconPickerIndex(null);
      
      // Parse questions from JSON
      const parsedQuestions = Array.isArray(round.questions) 
        ? round.questions 
        : typeof round.questions === 'string' 
          ? JSON.parse(round.questions)
          : [];
      setQuestions(parsedQuestions);
      
      // Store original values for change detection
      setOriginalValues({
        title: initialTitle,
        isPublic: initialIsPublic,
        gradient: initialGradient,
        coverImage: initialCoverImage,
        questions: parsedQuestions,
      });
    }
  }, [round]);
  
  // Detect changes
  useEffect(() => {
    if (originalValues) {
      const changed = 
        title !== originalValues.title ||
        isPublic !== originalValues.isPublic ||
        selectedGradient !== originalValues.gradient ||
        coverImage !== originalValues.coverImage ||
        JSON.stringify(questions) !== JSON.stringify(originalValues.questions);
      setHasChanges(changed);
    }
  }, [title, isPublic, selectedGradient, coverImage, questions, originalValues]);

  // Listen to carousel selection changes
  useEffect(() => {
    if (!carouselApi) return;
    
    const onSelect = () => {
      setCurrentQuestionIndex(carouselApi.selectedScrollSnap());
    };
    
    carouselApi.on("select", onSelect);
    return () => {
      carouselApi.off("select", onSelect);
    };
  }, [carouselApi]);

  const updateQuestionIcon = useCallback((index: number, iconSlug: string | undefined) => {
    setQuestions(prev => prev.map((q, i) => 
      i === index ? { ...q, icon_slug: iconSlug } : q
    ));
  }, []);

  const updateQuestionText = useCallback((index: number, newText: string) => {
    setQuestions(prev => prev.map((q, i) => 
      i === index ? { ...q, question_text: newText } : q
    ));
  }, []);

  const updateCorrectAnswer = useCallback((index: number, newText: string) => {
    setQuestions(prev => prev.map((q, i) => 
      i === index ? { ...q, correct_answer: newText } : q
    ));
  }, []);

  const updateIncorrectAnswer = useCallback((questionIndex: number, answerIndex: number, newText: string) => {
    setQuestions(prev => prev.map((q, qIdx) => {
      if (qIdx !== questionIndex) return q;
      const newIncorrect = [...q.incorrect_answers];
      newIncorrect[answerIndex] = newText;
      return { ...q, incorrect_answers: newIncorrect };
    }));
  }, []);

  const handleEditSave = useCallback(() => {
    if (!editingField || !editValue.trim()) return;
    
    if (editingField.type === 'question') {
      updateQuestionText(editingField.questionIndex, editValue.trim());
    } else if (editingField.type === 'correct') {
      updateCorrectAnswer(editingField.questionIndex, editValue.trim());
    } else if (editingField.type === 'incorrect' && editingField.answerIndex !== undefined) {
      updateIncorrectAnswer(editingField.questionIndex, editingField.answerIndex, editValue.trim());
    }
    
    setEditingField(null);
    setEditValue("");
  }, [editingField, editValue, updateQuestionText, updateCorrectAnswer, updateIncorrectAnswer]);

  const deleteQuestion = useCallback((index: number) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    setQuestions(newQuestions);
    setDeleteQuestionIndex(null);
    
    // Navigate to valid index after delete
    if (newQuestions.length === 0) {
      setViewMode("info");
    } else if (index >= newQuestions.length) {
      setTimeout(() => {
        carouselApi?.scrollTo(newQuestions.length - 1);
      }, 100);
    }
    
    toast({
      title: t("extra.ermQuestionDeleted"),
      description: t("extra.ermQuestionDeletedDesc"),
    });
  }, [questions, carouselApi, toast]);

  const addQuestion = useCallback(() => {
    const newQuestion: Question = {
      question_text: "",
      correct_answer: "",
      incorrect_answers: ["", "", ""],
      icon_slug: undefined,
    };
    const newQuestions = [...questions, newQuestion];
    setQuestions(newQuestions);
    
    // Navigate to the new question after a short delay
    setTimeout(() => {
      carouselApi?.scrollTo(newQuestions.length - 1);
    }, 100);
  }, [questions, carouselApi]);

  const handleSave = async () => {
    if (!round) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("user_quiz_posts")
        .update({
          title,
          cover_gradient: selectedGradient,
          cover_image: coverImage,
          is_public: isPublic,
          icon_slug: iconSlug,
          questions: structuredClone(questions) as unknown as Json,
        })
        .eq("id", round.id);

      if (error) throw error;

      toast({
        title: t("extra.ermSaved"),
        description: t("extra.ermSavedDesc"),
      });

      queryClient.invalidateQueries({ queryKey: ["my-quiz-posts"] });
      queryClient.invalidateQueries({ queryKey: ["my-collections"] });
      queryClient.invalidateQueries({ queryKey: ["collection-quizzes"] });
      onClose();
    } catch (error) {
      console.error("Error updating:", error);
      toast({
        title: t("extra.errorTitle"),
        description: t("extra.saveChangesFailed"),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!round) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("user_quiz_posts")
        .delete()
        .eq("id", round.id);

      if (error) throw error;

      toast({
        title: t("extra.ermDeleted"),
        description: t("extra.ermDeletedDesc"),
      });

      queryClient.invalidateQueries({ queryKey: ["my-quiz-posts"] });
      queryClient.invalidateQueries({ queryKey: ["my-collections"] });
      queryClient.invalidateQueries({ queryKey: ["collection-quizzes"] });
      onClose();
    } catch (error) {
      console.error("Error deleting:", error);
      toast({
        title: t("extra.ermDeleteError"),
        description: t("extra.ermDeleteErrorDesc"),
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!round || !isOpen) return null;

  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 z-[100] flex flex-col ${
            viewMode === "questions" ? "bg-[#7E7ADB]" : "bg-gradient-to-b from-[#FDFAFF] to-[#F6E8FF]"
          }`}
        >
          {/* Fixed Header */}
          <div className={`flex-shrink-0 fixed top-0 left-0 right-0 z-[110] safe-top ${
            viewMode === "questions" 
              ? "bg-[#7E7ADB]/90 backdrop-blur-sm border-b border-white/10" 
              : "bg-background border-b border-border"
          }`}>
            <div className="flex items-center gap-3 px-4 py-3">
              <button 
                onClick={() => viewMode === "questions" ? setViewMode("info") : onClose()} 
                className={`p-2 -ml-2 rounded-xl transition-colors ${
                  viewMode === "questions" ? "hover:bg-white/10" : "hover:bg-muted"
                }`}
              >
                <ChevronLeft className={`w-6 h-6 ${viewMode === "questions" ? "text-white" : "text-foreground"}`} />
              </button>
              <div className="flex-1 text-center">
                <h1 className={`text-lg font-bold ${viewMode === "questions" ? "text-white" : "text-foreground"}`}>
                  {viewMode === "questions" 
                    ? t("extra.questionNofM", { n: currentQuestionIndex + 1, total: questions.length })
                    : t("extra.editRoundTitle")
                  }
                </h1>
              </div>
              {viewMode === "questions" ? (
                <button
                  onClick={addQuestion}
                  className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors active:scale-95"
                  title={t("extra.ermAddQuestionTitle")}
                >
                  <Plus className="w-5 h-5 text-white" />
                </button>
              ) : (
                <div className="w-10" />
              )}
            </div>
            
            {/* Progress dots for questions view */}
            {viewMode === "questions" && questions.length > 0 && (
              <div className="flex justify-center gap-1.5 pb-3">
                {questions.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => carouselApi?.scrollTo(idx)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      idx === currentQuestionIndex 
                        ? "bg-white w-4" 
                        : "bg-white/30"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Content based on view mode */}
          <AnimatePresence mode="wait">
            {viewMode === "info" ? (
              <motion.div
                key="info"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 h-full overflow-y-auto pt-[60px] pb-32 safe-top"
              >
                <div className="max-w-[700px] md:max-w-[520px] mx-auto w-full">
                  <div className="p-4 space-y-5">
                  {/* Cover Image Picker */}
                  <CoverImagePicker
                    currentImage={coverImage}
                    currentGradient={selectedGradient}
                    onImageChange={setCoverImage}
                    onGradientChange={setSelectedGradient}
                    suggestPrompt={round.subject}
                    title={title}
                    roundId={round.id}
                  />

                  {/* Title */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t("extra.titleLabel")}</label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={t("extra.roundTitlePlaceholder")}
                      className="h-12 rounded-xl"
                    />
                  </div>

                  {/* Questions Button */}
                  {questions.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">{t("extra.questionsSectionLabel")}</label>
                      <button
                        onClick={() => setViewMode("questions")}
                        className="w-full flex items-center justify-between p-4 bg-muted/50 rounded-xl border border-border hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <span className="text-lg font-bold text-primary">{questions.length}</span>
                          </div>
                          <span className="font-medium text-foreground">{t("extra.viewQuestionsBtn")}</span>
                        </div>
                        <ChevronLeft className="w-5 h-5 text-muted-foreground rotate-180" />
                      </button>
                    </div>
                  )}

                  {/* Visibility Toggle */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t("extra.visibilityLabel")}</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsPublic(true)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all ${
                          isPublic
                            ? "border-green-500 bg-green-500/10 text-green-600"
                            : "border-border text-muted-foreground hover:border-green-500/50"
                        }`}
                      >
                        <Globe className="w-4 h-4" />
                        <span className="font-medium">{t("extra.publicVisibility")}</span>
                      </button>
                      <button
                        onClick={() => setIsPublic(false)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all ${
                          !isPublic
                            ? "border-muted-foreground bg-muted text-foreground"
                            : "border-border text-muted-foreground hover:border-muted-foreground/50"
                        }`}
                      >
                        <Lock className="w-4 h-4" />
                        <span className="font-medium">{t("extra.privateVisibility")}</span>
                      </button>
                    </div>
                  </div>

                  {/* Delete Section */}
                  <div className="pt-4 border-t border-border">
                    <AnimatePresence mode="wait">
                      {showDeleteConfirm ? (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-3"
                        >
                          <p className="text-sm text-center text-destructive font-medium">
                            {t("extra.ermDeleteConfirm")}
                          </p>
                        <div className="flex gap-2">
                          <ChunkyButton
                            variant="outline"
                            onClick={() => setShowDeleteConfirm(false)}
                            className="flex-1"
                          >
                            {t("extra.cancelBtn")}
                          </ChunkyButton>
                          <ChunkyButton
                            variant="danger"
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="flex-1"
                          >
                              <Trash2 className="w-4 h-4 mr-2" />
                               {t("extra.ermDeleteBtn")}
                            </ChunkyButton>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="w-full flex items-center justify-center gap-2 py-3 text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="font-medium">{t("extra.deleteRoundBtn")}</span>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Add Round Button - Only if part of a collection */}
                  {round.collection_id && onAddRound && (
                    <div className="pt-4 border-t border-border">
                      <button
                        onClick={() => {
                          const nextRoundNumber = (round.round_number || 1) + 1;
                          onAddRound(round.collection_id, nextRoundNumber);
                          onClose();
                        }}
                        className="w-full py-3 rounded-xl border-2 border-dashed border-primary/30 
                                   bg-primary/5 hover:bg-primary/10 transition-colors 
                                   flex items-center justify-center gap-2 text-primary"
                      >
                        <Plus className="w-4 h-4" />
                        <span className="font-medium">{t("extra.ermAddRound")}</span>
                      </button>
                    </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="questions"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="absolute inset-0 flex items-center justify-center pt-[100px] pb-[130px] px-4 overflow-hidden"
              >
                {/* Swipe Carousel for Questions */}
                <Carousel
                  setApi={setCarouselApi}
                  opts={{ 
                    align: "center",
                    loop: false,
                  }}
                  className="w-full"
                >
                  <CarouselContent className="ml-4">
                    {questions.map((q, index) => {
                      const answerInQuestion = hasAnswerInQuestion(q.question_text, q.correct_answer);
                      const iconRevealsAnswer = q.icon_slug && !validateIconKeyword(q.icon_slug, q.correct_answer, q.incorrect_answers).isValid;
                      const missingIcon = !q.icon_slug;
                      const hasCriticalIssue = answerInQuestion || iconRevealsAnswer;
                      
                      return (
                        <CarouselItem key={index} className="flex items-center justify-center w-full px-6">
                          <div className="w-full max-w-[700px] md:max-w-[520px] mx-auto space-y-3 max-h-[calc(100vh-220px)] overflow-y-auto px-2 scrollbar-hide">
                            {/* Validation Warnings */}
                            {hasCriticalIssue && (
                              <div className="flex items-center gap-2 text-xs text-red-200 bg-red-500/20 px-3 py-2 rounded-lg border border-red-400/30">
                                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                                <span>
                                 {answerInQuestion 
                                    ? t("extra.ermQuestionHasAnswer")
                                    : t("extra.ermIconHint")}
                                </span>
                              </div>
                            )}
                            
                            {/* Large Tappable Icon - Trigger Button */}
                            <div className="flex flex-col items-center gap-1">
                              {/* Outer wrapper with padding to make space for badge */}
                              <div className="relative pt-3 pr-3">
                                <button
                                  type="button"
                                  onClick={() => setIconPickerIndex(index)}
                                  className="rounded-full flex items-center justify-center transition-all flex-shrink-0 relative active:scale-95 bg-white/15 border-2 border-dashed border-white/30 hover:bg-white/20 hover:border-white/40"
                                  style={{ width: 80, height: 80 }}
                                >
                                  {q.icon_slug ? (
                                    <img
                                      src={`https://sqwpzezkhpqkdyltvsim.supabase.co/storage/v1/object/public/icon-library/${q.icon_slug}.png`}
                                      alt=""
                                      style={{ width: 80, height: 80 }}
                                      className="object-contain"
                                    />
                                  ) : (
                                    <>
                                      <Smile style={{ width: 50, height: 50 }} className="text-white/60" />
                                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-200">
                                        <Plus className="w-3 h-3 text-slate-600" />
                                      </div>
                                    </>
                                  )}
                                </button>
                                
                                {/* Badge positioned relative to the padded wrapper - NOT inside the button */}
                                {q.icon_slug && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setIconPickerIndex(index);
                                    }}
                                    className="absolute top-0 right-0 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md border border-slate-200/50 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer"
                                  >
                                    <RefreshCw className="w-4 h-4 text-slate-600" />
                                  </button>
                                )}
                              </div>
                              {missingIcon && !hasCriticalIssue && (
                                <span className="text-xs text-yellow-200/80 font-medium">{t("extra.addIconLabel")}</span>
                              )}
                            </div>
                            
                            {/* Question Text - Editable */}
                            <button
                              onClick={() => {
                                setEditingField({ type: 'question', questionIndex: index });
                                setEditValue(q.question_text);
                              }}
                              className="text-center w-full group cursor-pointer"
                            >
                              <p className="text-base font-medium text-white leading-relaxed group-hover:bg-white/10 rounded-lg px-2 py-1 transition-colors line-clamp-3">
                                {q.question_text}
                              </p>
                              <span className="text-xs text-white/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                {t("extra.editHint")}
                              </span>
                            </button>
                            
                            {/* Answers - Editable Game Style */}
                            <div className="space-y-2">
                              {/* Correct Answer - Green chunky button */}
                              <button
                                onClick={() => {
                                  setEditingField({ type: 'correct', questionIndex: index });
                                  setEditValue(q.correct_answer);
                                }}
                                className="relative w-full group cursor-pointer text-left"
                              >
                                <div className="absolute inset-0 bg-emerald-700 rounded-xl translate-y-1" />
                                <div className="relative p-3 rounded-xl bg-emerald-500 flex items-center gap-3 group-hover:bg-emerald-400 transition-colors">
                                  <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                                    <Check className="w-4 h-4 text-emerald-600" />
                                  </div>
                                  <span className="text-white font-semibold flex-1">
                                    {q.correct_answer}
                                  </span>
                                </div>
                              </button>
                              {/* Incorrect Answers - White chunky buttons */}
                              {q.incorrect_answers.map((ans, i) => (
                                <button
                                  key={i}
                                  onClick={() => {
                                    setEditingField({ type: 'incorrect', questionIndex: index, answerIndex: i });
                                    setEditValue(ans);
                                  }}
                                  className="relative w-full group cursor-pointer text-left"
                                >
                                  <div className="absolute inset-0 bg-gray-300 rounded-xl translate-y-1" />
                                  <div className="relative p-3 rounded-xl bg-white flex items-center gap-3 group-hover:bg-gray-100 transition-colors">
                                    <div className="w-7 h-7 rounded-full bg-sky-300 flex items-center justify-center flex-shrink-0">
                                      <span className="text-slate-700 font-bold text-sm">
                                        {['B', 'C', 'D'][i]}
                                      </span>
                                    </div>
                                    <span className="text-slate-700 font-medium flex-1">{ans}</span>
                                  </div>
                                </button>
                              ))}
                            </div>
                            
                            {/* Delete Question Button */}
                            <AnimatePresence mode="wait">
                              {deleteQuestionIndex === index ? (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  className="space-y-2"
                                >
                                  <p className="text-xs text-center text-red-200">
                                    {t("extra.ermDeleteQuestionConfirm")}
                                  </p>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => setDeleteQuestionIndex(null)}
                                      className="flex-1 py-2.5 rounded-xl border border-white/20 text-white text-sm font-medium"
                                    >
                                      {t("extra.cancelBtn")}
                                    </button>
                                    <button
                                      onClick={() => deleteQuestion(index)}
                                      className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium flex items-center justify-center gap-1.5"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      {t("extra.ermDeleteBtn")}
                                    </button>
                                  </div>
                                </motion.div>
                              ) : (
                                <motion.button 
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  onClick={() => setDeleteQuestionIndex(index)}
                                  className="w-full py-3 rounded-xl bg-red-500/20 text-red-200 flex items-center justify-center gap-2 hover:bg-red-500/30 transition-colors border border-red-400/20"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span className="font-medium">{t("extra.deleteQuestionBtn")}</span>
                                </motion.button>
                              )}
                            </AnimatePresence>
                          </div>
                        </CarouselItem>
                      );
                    })}
                  </CarouselContent>
                </Carousel>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Fixed Footer - Save Button (always visible) */}
          <div className={`flex-shrink-0 fixed bottom-0 left-0 right-0 z-[110] p-4 pb-10 safe-bottom ${
            viewMode === "questions" 
              ? "bg-[#7E7ADB]/90 backdrop-blur-sm border-t border-white/10" 
              : "bg-background border-t border-border"
          }`}>
            <div className="max-w-[700px] md:max-w-[520px] mx-auto w-full space-y-2">
              {hasChanges && (
              <p className={`text-xs text-center font-medium ${
                viewMode === "questions" ? "text-yellow-200" : "text-amber-600"
              }`}>
                {t("extra.changesNeedSaving")}
              </p>
            )}
            <ChunkyButton
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className={`w-full transition-all ${hasChanges ? "!bg-green-500 hover:!bg-green-600" : ""}`}
              size="lg"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {t("extra.savingState")}
                </>
              ) : hasChanges ? (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  {t("extra.saveChanges")}
                </>
              ) : (
                t("extra.saveChanges")
                )}
              </ChunkyButton>
            </div>
          </div>
        </motion.div>
      )}

    </AnimatePresence>

    {/* Global Icon Picker - rendered via portal OUTSIDE AnimatePresence to escape stacking context */}
    {iconPickerIndex !== null && questions[iconPickerIndex] && createPortal(
      <QuestionIconPicker
        isOpen={true}
        onClose={() => setIconPickerIndex(null)}
        creatorMode
        selectedSlug={questions[iconPickerIndex]?.icon_slug || null}
        onSelect={(slug) => {
          updateQuestionIcon(iconPickerIndex, slug || undefined);
          setIconPickerIndex(null);
        }}
        questionText={questions[iconPickerIndex]?.question_text}
        correctAnswer={questions[iconPickerIndex]?.correct_answer}
        incorrectAnswers={questions[iconPickerIndex]?.incorrect_answers}
        large
      />,
      document.body
    )}

    {/* Edit Text Dialog */}
    {editingField !== null && createPortal(
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60"
        onClick={() => {
          setEditingField(null);
          setEditValue("");
        }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-background rounded-2xl p-4 w-full max-w-md space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-lg font-bold text-foreground">
            {editingField.type === 'question' 
              ? t("extra.editQuestion")
              : editingField.type === 'correct'
                ? t("extra.editCorrectAnswer")
                : t("extra.editIncorrectAnswer")
            }
          </h3>
          {editingField.type === 'question' ? (
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full min-h-[120px] p-3 rounded-lg border border-input bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
          ) : (
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="h-12"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleEditSave();
                }
              }}
            />
          )}
          <div className="flex gap-2">
            <ChunkyButton
              variant="outline"
              onClick={() => {
                setEditingField(null);
                setEditValue("");
              }}
              className="flex-1"
            >
              {t("extra.cancelBtn")}
            </ChunkyButton>
            <ChunkyButton
              onClick={handleEditSave}
              disabled={!editValue.trim()}
              className="flex-1"
            >
              {t("extra.editSaveBtn")}
            </ChunkyButton>
          </div>
        </motion.div>
      </motion.div>,
      document.body
    )}
    </>
  );
}
