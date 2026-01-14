import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Loader2, Globe, Lock, Trash2, Check, AlertTriangle, ImageIcon, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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
      title: "კითხვა წაიშალა",
      description: "კითხვა წარმატებით წაიშალა",
    });
  }, [questions, carouselApi, toast]);

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
          questions: JSON.parse(JSON.stringify(questions)),
        })
        .eq("id", round.id);

      if (error) throw error;

      toast({
        title: "შენახულია! ✓",
        description: "ცვლილებები წარმატებით შეინახა",
      });

      queryClient.invalidateQueries({ queryKey: ["my-quiz-posts"] });
      queryClient.invalidateQueries({ queryKey: ["my-collections"] });
      queryClient.invalidateQueries({ queryKey: ["collection-quizzes"] });
      onClose();
    } catch (error) {
      console.error("Error updating:", error);
      toast({
        title: "შეცდომა",
        description: "ცვლილებების შენახვა ვერ მოხერხდა",
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
        title: "წაიშალა",
        description: "რაუნდი წარმატებით წაიშალა",
      });

      queryClient.invalidateQueries({ queryKey: ["my-quiz-posts"] });
      queryClient.invalidateQueries({ queryKey: ["my-collections"] });
      queryClient.invalidateQueries({ queryKey: ["collection-quizzes"] });
      onClose();
    } catch (error) {
      console.error("Error deleting:", error);
      toast({
        title: "შეცდომა",
        description: "წაშლა ვერ მოხერხდა",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!round || !isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 z-[100] flex flex-col ${
            viewMode === "questions" ? "bg-[#7E7ADB]" : "bg-background"
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
                    ? `კითხვა ${currentQuestionIndex + 1} / ${questions.length}`
                    : "რაუნდის რედაქტირება"
                  }
                </h1>
              </div>
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
                className="flex-1 h-full overflow-y-auto pt-[60px] pb-32 safe-top"
              >
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
                    <label className="text-sm font-medium text-foreground">სათაური</label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="რაუნდის სათაური"
                      className="h-12 rounded-xl"
                    />
                  </div>

                  {/* Questions Button */}
                  {questions.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">კითხვები</label>
                      <button
                        onClick={() => setViewMode("questions")}
                        className="w-full flex items-center justify-between p-4 bg-muted/50 rounded-xl border border-border hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <span className="text-lg font-bold text-primary">{questions.length}</span>
                          </div>
                          <span className="font-medium text-foreground">კითხვების ნახვა</span>
                        </div>
                        <ChevronLeft className="w-5 h-5 text-muted-foreground rotate-180" />
                      </button>
                    </div>
                  )}

                  {/* Visibility Toggle */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">ხილვადობა</label>
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
                        <span className="font-medium">საჯარო</span>
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
                        <span className="font-medium">პირადი</span>
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
                            დარწმუნებული ხარ რომ გსურს წაშლა?
                          </p>
                        <div className="flex gap-2">
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
                            disabled={isDeleting}
                            className="flex-1"
                          >
                              <Trash2 className="w-4 h-4 mr-2" />
                              წაშლა
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
                            <span className="font-medium">რაუნდის წაშლა</span>
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
                        <span className="font-medium">რაუნდის დამატება</span>
                      </button>
                    </div>
                  )}
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
                          <div className="w-full space-y-3 max-h-[calc(100vh-220px)] overflow-y-auto px-2">
                            {/* Validation Warnings */}
                            {hasCriticalIssue && (
                              <div className="flex items-center gap-2 text-xs text-red-200 bg-red-500/20 px-3 py-2 rounded-lg border border-red-400/30">
                                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                                <span>
                                  {answerInQuestion 
                                    ? "კითხვა შეიცავს სწორ პასუხს!" 
                                    : "აიკონი მინიშნებაა პასუხზე!"}
                                </span>
                              </div>
                            )}
                            
                            {/* Large Tappable Icon */}
                            <div className="flex flex-col items-center gap-1">
                              <QuestionIconPicker
                                selectedSlug={q.icon_slug || null}
                                onSelect={(slug) => updateQuestionIcon(index, slug || undefined)}
                                questionText={q.question_text}
                                correctAnswer={q.correct_answer}
                                incorrectAnswers={q.incorrect_answers}
                                large
                              />
                              {missingIcon && !hasCriticalIssue && (
                                <span className="text-xs text-yellow-200/80 font-medium">აიკონის დამატება</span>
                              )}
                            </div>
                            
                            {/* Question Text (READ-ONLY) */}
                            <div className="text-center">
                              <p className="text-lg font-medium text-white leading-relaxed">
                                {q.question_text}
                              </p>
                            </div>
                            
                            {/* Answers (READ-ONLY) - Game Style */}
                            <div className="space-y-2">
                              {/* Correct Answer - Green chunky button */}
                              <div className="relative">
                                <div className="absolute inset-0 bg-emerald-700 rounded-xl translate-y-1" />
                                <div className="relative p-3 rounded-xl bg-emerald-500 flex items-center gap-3">
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
                                  <div className="relative p-3 rounded-xl bg-white flex items-center gap-3">
                                    <div className="w-7 h-7 rounded-full bg-sky-300 flex items-center justify-center flex-shrink-0">
                                      <span className="text-slate-700 font-bold text-sm">
                                        {String.fromCharCode(66 + i)}
                                      </span>
                                    </div>
                                    <span className="text-slate-700 font-medium">{ans}</span>
                                  </div>
                                </div>
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
                                    წაიშალოს ეს კითხვა?
                                  </p>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => setDeleteQuestionIndex(null)}
                                      className="flex-1 py-2.5 rounded-xl border border-white/20 text-white text-sm font-medium"
                                    >
                                      გაუქმება
                                    </button>
                                    <button
                                      onClick={() => deleteQuestion(index)}
                                      className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium flex items-center justify-center gap-1.5"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      წაშლა
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
                                  <span className="font-medium">კითხვის წაშლა</span>
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
          <div className={`flex-shrink-0 fixed bottom-0 left-0 right-0 z-[110] p-4 pb-10 space-y-2 safe-bottom ${
            viewMode === "questions" 
              ? "bg-[#7E7ADB]/90 backdrop-blur-sm border-t border-white/10" 
              : "bg-background border-t border-border"
          }`}>
            {hasChanges && (
              <p className={`text-xs text-center font-medium ${
                viewMode === "questions" ? "text-yellow-200" : "text-amber-600"
              }`}>
                ცვლილებები შესანახია
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
                  ინახება...
                </>
              ) : hasChanges ? (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  შენახვა
                </>
              ) : (
                "შენახვა"
              )}
            </ChunkyButton>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
