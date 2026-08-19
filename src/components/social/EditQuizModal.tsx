import { useState, useEffect, useCallback, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { anyBlockedText } from "@/utils/contentFilter";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Loader2, Globe, Lock, Trash2, Check, AlertTriangle, ImageIcon, Pencil, Smile, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useToast } from "@/hooks/use-toast";
import { PUBLIC_SHARING_ENABLED } from "@/config/features";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useQueryClient } from "@tanstack/react-query";
import { QuestionIconPicker } from "./QuestionIconPicker";
import { CoverImagePicker } from "./CoverImagePicker";
import { DynamicIcon } from "@/components/shared/DynamicIcon";
import { EditQuestionDialog } from "./EditQuestionDialog";
import { hasAnswerInQuestion } from "@/utils/questionValidation";
import { IconOnboardingTooltip } from "@/components/shared/IconOnboardingTooltip";
import { validateIconKeyword } from "@/utils/iconAnswerValidation";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";

interface Question {
  question_text: string;
  correct_answer: string;
  incorrect_answers: string[];
  difficulty?: string;
  icon_slug?: string;
}

interface EditQuizModalProps {
  quiz: any | null;
  isOpen: boolean;
  onClose: () => void;
}

const COVER_GRADIENTS = [
  "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)",
  "linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)",
  "linear-gradient(135deg, #F97316 0%, #EF4444 100%)",
  "linear-gradient(135deg, #10B981 0%, #34D399 100%)",
  "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)",
  "linear-gradient(135deg, #F59E0B 0%, #F97316 100%)",
];

type ViewMode = "info" | "questions";

export function EditQuizModal({ quiz, isOpen, onClose }: EditQuizModalProps) {
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
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const editingIndexRef = useRef<number | null>(null);
  editingIndexRef.current = editingQuestionIndex;
  const [iconPickerIndex, setIconPickerIndex] = useState<number | null>(null);
  // Determine if this is a collection or a quiz
  const isCollection = quiz?.hasOwnProperty('quiz_collections') || (quiz && !quiz.hasOwnProperty('questions'));
  const tableName = isCollection ? "quiz_collections" : "user_quiz_posts";

  useEffect(() => {
    if (quiz) {
      setTitle(quiz.title || "");
      setSelectedGradient(quiz.cover_gradient || COVER_GRADIENTS[0]);
      setCoverImage(quiz.cover_image || null);
      setIsPublic(quiz.is_public !== false);
      setIconSlug(quiz.icon_slug || null);
      setShowDeleteConfirm(false);
      setViewMode("info");
      setCurrentQuestionIndex(0);
      setDeleteQuestionIndex(null);
      
      // Parse questions from JSON if it's a quiz post (not collection)
      if (!isCollection && quiz.questions) {
        const parsedQuestions = Array.isArray(quiz.questions) 
          ? quiz.questions 
          : typeof quiz.questions === 'string' 
            ? JSON.parse(quiz.questions)
            : [];
        setQuestions(parsedQuestions);
      } else {
        setQuestions([]);
      }
    }
  }, [quiz, isCollection]);

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
      title: t("extra.questionDeleted"),
      description: t("extra.questionDeletedDesc"),
    });
  }, [questions, carouselApi, toast]);

  const handleSave = async () => {
    if (!quiz) return;

    // Same screen as creation — editing was a free pass around it: publish
    // clean, then rename. Title always; question text only for quiz posts.
    const editedTexts = [title, ...(!isCollection ? questions.flatMap((q) => [q.question_text, q.correct_answer, ...(q.incorrect_answers || [])]) : [])];
    if (anyBlockedText(editedTexts)) {
      toast({ title: t("extra.textNotAllowed"), variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const updateData: any = {
        title,
        cover_gradient: selectedGradient,
        cover_image: coverImage,
        is_public: isPublic,
      };

      // Only add icon_slug and questions for quiz posts, not collections
      if (!isCollection) {
        updateData.icon_slug = iconSlug;
        updateData.questions = structuredClone(questions) as unknown as Json;
      }

      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq("id", quiz.id);

      if (error) throw error;

      toast({
        title: t("extra.savedToast"),
        description: t("extra.changesSavedDesc"),
      });

      queryClient.invalidateQueries({ queryKey: ["my-quiz-posts"] });
      queryClient.invalidateQueries({ queryKey: ["my-collections"] });
      queryClient.invalidateQueries({ queryKey: ["quiz-posts-with-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["collection-quizzes"] });
      queryClient.invalidateQueries({ queryKey: ["trivia-details-with-creator", quiz.id] });
      queryClient.invalidateQueries({ queryKey: ["trivia-leaderboard", quiz.id] });
      queryClient.invalidateQueries({ queryKey: ["trivia-stats", quiz.id] });
      onClose();
    } catch (error) {
      console.error("Error updating:", error);
      toast({
        title: t("extra.errorTitle"),
        description: t("extra.editorChangesSaveFailed"),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!quiz) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq("id", quiz.id);

      if (error) throw error;

      toast({
        title: t("extra.deletedToast"),
        description: isCollection ? t("extra.collectionDeletedDesc") : t("extra.triviaDeletedDesc"),
      });

      queryClient.invalidateQueries({ queryKey: ["my-quiz-posts"] });
      queryClient.invalidateQueries({ queryKey: ["my-collections"] });
      onClose();
    } catch (error) {
      console.error("Error deleting:", error);
      toast({
        title: t("extra.errorTitle"),
        description: t("extra.deleteFailedToast"),
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!quiz || !isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 safe-screen z-[100] flex flex-col ${
            viewMode === "questions" ? "bg-[#7E7ADB]" : "bg-gradient-to-b from-[#FDFAFF] to-[#F6E8FF]"
          }`}
        >
          {/* Fixed Header */}
          <div className={`flex-shrink-0 fixed top-0 left-0 right-0 z-[110] safe-top ${
            viewMode === "questions" 
              ? "bg-[#7E7ADB]/90 backdrop-blur-sm border-b border-white/10" 
              : "bg-background border-b border-border"
          }`}>
            <div className="flex items-center h-14 px-4">
              <motion.button
                onClick={() => viewMode === "questions" ? setViewMode("info") : onClose()}
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  viewMode === "questions" ? "bg-white/20" : "bg-muted"
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ChevronLeft className={`w-6 h-6 ${viewMode === "questions" ? "text-white" : "text-foreground"}`} />
              </motion.button>
              
              <h1 className={`flex-1 text-center font-display text-lg font-bold ${
                viewMode === "questions" ? "text-white" : "text-foreground"
              }`}>
                {viewMode === "questions" 
                  ? t("extra.questionNofM", { n: currentQuestionIndex + 1, total: questions.length })
                  : t("extra.editBtn")
                }
              </h1>
              
              <div className="w-10" />
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
                className="flex-1 min-h-0 overflow-y-auto pt-[72px] px-4 pb-[140px]"
              >
                <div className="mx-auto w-full max-w-[720px] space-y-5">
                  {/* Cover Image Picker */}
                  <CoverImagePicker
                    currentImage={coverImage}
                    currentGradient={selectedGradient}
                    onImageChange={setCoverImage}
                    onGradientChange={setSelectedGradient}
                    suggestPrompt={quiz?.subject}
                    title={title}
                    roundId={quiz?.id}
                  />

                  {/* Title Input */}
                  <div className="flex gap-3 items-end">
                    <div className="flex-1 space-y-2">
                      <label className="text-sm font-medium text-foreground">{t("extra.editTitleLabel")}</label>
                      <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={t("extra.editTriviaTitlePlaceholder")}
                        className="h-12 rounded-xl"
                      />
                    </div>
                    
                    {/* Icon Picker - only for quizzes, not collections */}
                    {!isCollection && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">{t("extra.editIconLabel")}</label>
                        <QuestionIconPicker
                          selectedSlug={iconSlug}
                          onSelect={setIconSlug}
                          creatorMode
                          questionText={title}
                        />
                      </div>
                    )}
                  </div>

                  {/* Questions Button - only for quiz posts with questions */}
                  {!isCollection && questions.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">{t("extra.editQuestionsLabel")}</label>
                      <button
                        onClick={() => setViewMode("questions")}
                        className="w-full flex items-center justify-between p-4 bg-muted/50 rounded-xl border border-border hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <span className="text-lg font-bold text-primary">{questions.length}</span>
                          </div>
                          <span className="font-medium text-foreground">{t("extra.editViewQuestions")}</span>
                        </div>
                        <ChevronLeft className="w-5 h-5 text-muted-foreground rotate-180" />
                      </button>
                    </div>
                  )}

                  {/* Visibility Toggle — hidden while public sharing is off;
                      isPublic keeps the record's stored value untouched. */}
                  {PUBLIC_SHARING_ENABLED && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">{t("extra.editVisibilityLabel")}</label>
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
                        <span className="font-medium">{t("extra.editPublicLabel")}</span>
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
                        <span className="font-medium">{t("extra.editPrivateLabel")}</span>
                      </button>
                    </div>
                  </div>
                  )}

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
                            {t("extra.editDeleteConfirm")}
                          </p>
                          <div className="flex gap-2">
                            <ChunkyButton
                              variant="outline"
                              onClick={() => setShowDeleteConfirm(false)}
                              className="flex-1"
                            >
                              {t("extra.editCancelLabel")}
                            </ChunkyButton>
                            <ChunkyButton
                              variant="danger"
                              onClick={handleDelete}
                              disabled={isDeleting}
                              className="flex-1"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              {t("extra.editDeleteLabel")}
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
                            <span className="font-medium">{t("extra.editDeleteLabel")}</span>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="questions"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex-1 flex flex-col relative pt-[100px]"
              >
                {/* Left Arrow Navigation */}
                {questions.length > 1 && currentQuestionIndex > 0 && (
                  <button
                    onClick={() => carouselApi?.scrollTo(currentQuestionIndex - 1)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-[5] w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors pointer-events-auto"
                  >
                    <ChevronLeft className="w-6 h-6 text-white" />
                  </button>
                )}
                
                {/* Right Arrow Navigation */}
                {questions.length > 1 && currentQuestionIndex < questions.length - 1 && (
                  <button
                    onClick={() => carouselApi?.scrollTo(currentQuestionIndex + 1)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-[5] w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors pointer-events-auto"
                  >
                    <ChevronRight className="w-6 h-6 text-white" />
                  </button>
                )}

                {/* Swipe Carousel for Questions */}
                <Carousel
                  setApi={setCarouselApi}
                  opts={{ 
                    align: "center",
                    loop: false,
                    watchDrag: false,
                  }}
                  className="flex-1"
                >
                  <CarouselContent className="h-full">
                    {questions.map((q, index) => {
                      const answerInQuestion = hasAnswerInQuestion(q.question_text, q.correct_answer);
                      const iconRevealsAnswer = q.icon_slug && !validateIconKeyword(q.icon_slug, q.correct_answer, q.incorrect_answers).isValid;
                      const missingIcon = !q.icon_slug;
                      const hasCriticalIssue = answerInQuestion || iconRevealsAnswer;
                      
                      return (
                        <CarouselItem key={index} className="flex items-start justify-center px-4 pb-24">
                          <div className="w-full max-w-sm bg-[#6B5B95] rounded-2xl border border-white/10 p-5 space-y-4 shadow-xl mb-36">
                            {/* Validation Warnings */}
                            {hasCriticalIssue && (
                              <div className="flex items-center gap-2 text-xs text-red-200 bg-red-500/20 px-3 py-2 rounded-lg border border-red-400/30">
                                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                                <span>
                                  {answerInQuestion 
                                    ? t("extra.questionContainsAnswer")
                                    : t("extra.iconHintsAnswer")}
                                </span>
                              </div>
                            )}
                            
                            {/* Large Tappable Icon - opens portal picker */}
                            <div className="relative flex flex-col items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setIconPickerIndex(index)}
                                className="rounded-2xl flex items-center justify-center transition-all flex-shrink-0 relative active:scale-95 overflow-visible bg-white/15 border-2 border-dashed border-white/30 hover:bg-white/20 hover:border-white/40"
                                style={{ width: 80, height: 80 }}
                              >
                                {q.icon_slug ? (
                                  <>
                                    <img
                                      key={q.icon_slug}
                                      src={`https://sqwpzezkhpqkdyltvsim.supabase.co/storage/v1/object/public/icon-library/${q.icon_slug}.png`}
                                      alt=""
                                      style={{ width: 80, height: 80 }}
                                      className="object-contain"
                                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                    />
                                  </>
                                ) : (
                                  <>
                                    <Smile style={{ width: 50, height: 50 }} className="text-white/60" />
                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-200">
                                      <Plus className="w-3 h-3 text-slate-600" />
                                    </div>
                                  </>
                                )}
                              </button>
                              {missingIcon && !hasCriticalIssue && (
                                <span className="text-xs text-yellow-200/80 font-medium">{t("extra.addIconLabel")}</span>
                              )}
                              {index === 0 && !q.icon_slug && <IconOnboardingTooltip />}
                            </div>
                            
                            {/* Question Text - Tappable to edit */}
                            <button
                              onClick={() => setEditingQuestionIndex(index)}
                              className="text-center w-full rounded-xl p-2 hover:bg-white/10 transition-colors"
                            >
                              <p className="text-lg font-medium text-white leading-relaxed">
                                {q.question_text}
                              </p>
                              <span className="text-xs text-white/50 mt-1 flex items-center justify-center gap-1">
                                <Pencil className="w-3 h-3" /> შეცვლა
                              </span>
                            </button>
                            
                            {/* Answers (READ-ONLY) - Game Style */}
                            <button
                              onClick={() => setEditingQuestionIndex(index)}
                              className="space-y-2.5 w-full text-left rounded-xl p-1 hover:bg-white/5 transition-colors"
                            >
                              {/* Correct Answer - Green chunky button */}
                              <div className="relative">
                                <div className="absolute inset-0 bg-emerald-700 rounded-xl translate-y-1" />
                                <div className="relative p-3.5 rounded-xl bg-emerald-500 flex items-center gap-3">
                                  <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                                    <Check className="w-4 h-4 text-emerald-600" />
                                  </div>
                                  <span className="text-white font-semibold">
                                    {q.correct_answer}
                                  </span>
                                </div>
                              </div>
                              {/* Incorrect Answers - White chunky buttons */}
                              {q.incorrect_answers.map((ans, i) => (
                                <div key={i} className="relative">
                                  <div className="absolute inset-0 bg-gray-300 rounded-xl translate-y-1" />
                                  <div className="relative p-3.5 rounded-xl bg-white flex items-center gap-3">
                                    <div className="w-7 h-7 rounded-full bg-sky-300 flex items-center justify-center flex-shrink-0">
                                      <span className="text-slate-700 font-bold text-sm">
                                        {[t("extra.answerLabelB"), t("extra.answerLabelC"), t("extra.answerLabelD")][i]}
                                      </span>
                                    </div>
                                    <span className="text-slate-700 font-medium">{ans}</span>
                                  </div>
                                </div>
                              ))}
                            </button>
                            
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
                                    {t("extra.deleteThisQuestion")}
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
                                      {t("extra.deleteBtn")}
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

          {/* Edit Question Dialog */}
          {editingQuestionIndex !== null && questions[editingQuestionIndex] && (
            <EditQuestionDialog
              open={editingQuestionIndex !== null}
              onOpenChange={(open) => {
                if (!open) setEditingQuestionIndex(null);
              }}
              question={questions[editingQuestionIndex]}
              onSave={(updated) => {
                const idx = editingIndexRef.current;
                if (idx !== null) {
                  setQuestions(prev => {
                    const newQuestions = [...prev];
                    newQuestions[idx] = { ...newQuestions[idx], ...updated };
                    return newQuestions;
                  });
                }
                setEditingQuestionIndex(null);
              }}
            />
          )}

          {/* Portal-rendered Icon Picker for question cards */}
          {iconPickerIndex !== null && questions[iconPickerIndex] && createPortal(
            <QuestionIconPicker
              selectedSlug={questions[iconPickerIndex].icon_slug || null}
              onSelect={(slug) => {
                updateQuestionIcon(iconPickerIndex, slug || undefined);
                setIconPickerIndex(null);
              }}
              creatorMode
              questionText={questions[iconPickerIndex].question_text}
              correctAnswer={questions[iconPickerIndex].correct_answer}
              incorrectAnswers={questions[iconPickerIndex].incorrect_answers}
              isOpen={true}
              onClose={() => setIconPickerIndex(null)}
            />,
            document.body
          )}

          {/* Fixed Footer - Save Button (always visible) */}
          <div className={`flex-shrink-0 fixed bottom-0 left-0 right-0 z-50 p-4 pb-[calc(1rem_+_var(--safe-bottom))] ${
            viewMode === "questions" 
              ? "bg-[#7E7ADB]/90 backdrop-blur-sm border-t border-white/10" 
              : "bg-background border-t border-border"
          }`}>
            <div className="mx-auto w-full max-w-xl">
            <ChunkyButton
              onClick={handleSave}
              disabled={isSaving}
              className="w-full"
              size="lg"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {t("extra.editorSavingBtn")}
                </>
              ) : (
                t("extra.editorSaveBtn")
              )}
            </ChunkyButton>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
