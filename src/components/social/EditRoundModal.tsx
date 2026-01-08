import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Globe, Lock, Trash2, ChevronDown, ChevronRight, Check, AlertTriangle, ImageIcon } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { QuestionIconPicker } from "./QuestionIconPicker";
import { CoverImagePicker } from "./CoverImagePicker";
import { DynamicIcon } from "@/components/shared/DynamicIcon";
import { ScrollArea } from "@/components/ui/scroll-area";
import { hasAnswerInQuestion } from "@/utils/questionValidation";
import { validateIconKeyword } from "@/utils/iconAnswerValidation";

interface Question {
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
  difficulty?: string;
  icon_slug?: string;
}

interface EditRoundModalProps {
  round: any | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EditRoundModal({ round, isOpen, onClose }: EditRoundModalProps) {
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
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);

  useEffect(() => {
    if (round) {
      setTitle(round.title || "");
      setSelectedGradient(round.cover_gradient || "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)");
      setCoverImage(round.cover_image || null);
      setIsPublic(round.is_public !== false);
      setIconSlug(round.icon_slug || null);
      setShowDeleteConfirm(false);
      
      // Parse questions from JSON
      const parsedQuestions = Array.isArray(round.questions) 
        ? round.questions 
        : typeof round.questions === 'string' 
          ? JSON.parse(round.questions)
          : [];
      setQuestions(parsedQuestions);
      setExpandedQuestion(null);
      setEditingQuestionIndex(null);
    }
  }, [round]);

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

  const updateQuestion = (index: number, updates: Partial<Question>) => {
    setQuestions(prev => prev.map((q, i) => 
      i === index ? { ...q, ...updates } : q
    ));
  };

  if (!round) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">რაუნდის რედაქტირება</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <ScrollArea className="flex-1 max-h-[calc(90vh-80px)]">
          <div className="p-4 space-y-5">
            {/* Cover Image Picker */}
            <CoverImagePicker
              currentImage={coverImage}
              currentGradient={selectedGradient}
              onImageChange={setCoverImage}
              onGradientChange={setSelectedGradient}
              suggestPrompt={round.subject}
              title={title}
            />

            {/* Title & Icon Row */}
            <div className="flex gap-3 items-end">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium text-foreground">სათაური</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="რაუნდის სათაური"
                  className="h-12 rounded-xl"
                />
              </div>
              
              {/* Round Icon Picker */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">აიქონი</label>
                <QuestionIconPicker
                  selectedSlug={iconSlug}
                  onSelect={setIconSlug}
                  questionText={title}
                />
              </div>
            </div>

            {/* Questions Section */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                კითხვები ({questions.length})
              </label>
              <div className="space-y-2">
                {questions.map((q, index) => {
                  // Validation checks for each question
                  const answerInQuestion = hasAnswerInQuestion(q.question, q.correct_answer);
                  const iconRevealsAnswer = q.icon_slug && !validateIconKeyword(q.icon_slug, q.correct_answer, q.incorrect_answers).isValid;
                  const missingIcon = !q.icon_slug;
                  const hasCriticalIssue = answerInQuestion || iconRevealsAnswer;
                  
                  return (
                  <div 
                    key={index}
                    className={`border rounded-xl overflow-hidden ${
                      hasCriticalIssue 
                        ? "border-destructive bg-destructive/5" 
                        : missingIcon 
                          ? "border-yellow-500/50 bg-yellow-500/5"
                          : "border-border bg-muted/30"
                    }`}
                  >
                    {/* Question Header */}
                    <button
                      onClick={() => setExpandedQuestion(expandedQuestion === index ? null : index)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                    >
                      {/* Question Icon */}
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        iconRevealsAnswer 
                          ? "bg-destructive/20" 
                          : missingIcon 
                            ? "bg-yellow-500/20" 
                            : "bg-background"
                      }`}>
                        {q.icon_slug ? (
                          <DynamicIcon slug={q.icon_slug} size={28} />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-yellow-600" />
                        )}
                      </div>
                      
                      <p className="flex-1 text-left text-sm font-medium text-foreground line-clamp-1">
                        {q.question}
                      </p>

                      {/* Validation status badge */}
                      {hasCriticalIssue ? (
                        <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
                      ) : missingIcon ? (
                        <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                      ) : (
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      )}
                      
                      {expandedQuestion === index ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>

                    {/* Expanded Question Editor */}
                    <AnimatePresence>
                      {expandedQuestion === index && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-3 pt-0 space-y-3 border-t border-border">
                            {/* Validation Warnings */}
                            {answerInQuestion && (
                              <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                                <span>კითხვა შეიცავს სწორ პასუხს!</span>
                              </div>
                            )}
                            {iconRevealsAnswer && (
                              <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                                <span>აიკონი მინიშნებაა პასუხზე!</span>
                              </div>
                            )}
                            {missingIcon && !hasCriticalIssue && (
                              <div className="flex items-center gap-2 text-xs text-yellow-600 bg-yellow-500/10 px-3 py-2 rounded-lg">
                                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                                <span>აიკონი არ არის არჩეული</span>
                              </div>
                            )}

                            {/* Question Text */}
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">კითხვა</label>
                              <Input
                                value={q.question}
                                onChange={(e) => updateQuestion(index, { question: e.target.value })}
                                className={`h-10 text-sm ${answerInQuestion ? "border-destructive" : ""}`}
                              />
                            </div>

                            {/* Correct Answer */}
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground flex items-center gap-1">
                                <Check className="w-3 h-3 text-green-500" />
                                სწორი პასუხი
                              </label>
                              <Input
                                value={q.correct_answer}
                                onChange={(e) => updateQuestion(index, { correct_answer: e.target.value })}
                                className="h-10 text-sm border-green-500/30 bg-green-500/5"
                              />
                            </div>

                            {/* Wrong Answers */}
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">არასწორი პასუხები</label>
                              <div className="space-y-2">
                                {q.incorrect_answers.map((ans, ansIndex) => (
                                  <Input
                                    key={ansIndex}
                                    value={ans}
                                    onChange={(e) => {
                                      const newIncorrect = [...q.incorrect_answers];
                                      newIncorrect[ansIndex] = e.target.value;
                                      updateQuestion(index, { incorrect_answers: newIncorrect });
                                    }}
                                    className="h-10 text-sm"
                                    placeholder={`პასუხი ${ansIndex + 2}`}
                                  />
                                ))}
                              </div>
                            </div>

                            {/* Question Icon */}
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground">აიკონი:</span>
                              <QuestionIconPicker
                                selectedSlug={q.icon_slug || null}
                                onSelect={(slug) => updateQuestion(index, { icon_slug: slug || undefined })}
                                questionText={q.question}
                                correctAnswer={q.correct_answer}
                                incorrectAnswers={q.incorrect_answers}
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  );
                })}
              </div>
            </div>

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

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <ChunkyButton
                onClick={handleSave}
                disabled={isSaving || !title.trim()}
                className="flex-1"
              >
                {isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "შენახვა"
                )}
              </ChunkyButton>
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
                      დარწმუნებული ხარ? ეს ქმედება შეუქცევადია.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="flex-1"
                      >
                        გაუქმება
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="flex-1"
                      >
                        {isDeleting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "წაშლა"
                        )}
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full flex items-center justify-center gap-2 py-2 text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="text-sm font-medium">რაუნდის წაშლა</span>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
