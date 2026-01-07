import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Loader2, Globe, Lock, ChevronDown, ChevronUp } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { QuestionIconPicker } from "./QuestionIconPicker";

interface EditableQuestion {
  question_text?: string;
  question?: string;
  correct_answer: string;
  incorrect_answers: string[];
  icon_slug?: string | null;
}

interface EditQuizModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quiz: any | null;
  onQuizUpdated?: () => void;
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
  "radial-gradient(ellipse 90% 110% at 30% 60%, rgba(16,185,129,0.8) 0%, transparent 50%), radial-gradient(ellipse 120% 90% at 75% 25%, rgba(52,211,153,0.6) 0%, transparent 50%), linear-gradient(160deg, #064E3B 0%, #047857 100%)",
  "radial-gradient(ellipse 100% 80% at 60% 30%, rgba(249,115,22,0.75) 0%, transparent 45%), radial-gradient(ellipse 80% 100% at 25% 75%, rgba(239,68,68,0.7) 0%, transparent 45%), linear-gradient(145deg, #7C2D12 0%, #991B1B 100%)",
];

export function EditQuizModal({ open, onOpenChange, quiz, onQuizUpdated }: EditQuizModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedGradient, setSelectedGradient] = useState(COVER_GRADIENTS[0]);
  const [isPublic, setIsPublic] = useState(true);
  const [questions, setQuestions] = useState<EditableQuestion[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showGradientPicker, setShowGradientPicker] = useState(false);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);

  // Initialize form when quiz changes
  useEffect(() => {
    if (quiz) {
      setTitle(quiz.title || "");
      setDescription(quiz.description || "");
      setSelectedGradient(quiz.cover_gradient || COVER_GRADIENTS[0]);
      setIsPublic(quiz.is_public !== false);
      setQuestions(quiz.questions || []);
    }
  }, [quiz]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleSave = async () => {
    if (!user || !quiz) return;

    setIsSaving(true);
    try {
      const hashtags = description
        .split(/[\s,#]+/)
        .filter(word => word.length > 1)
        .slice(0, 5);

      const { error } = await supabase
        .from("user_quiz_posts")
        .update({
          title,
          description,
          cover_gradient: selectedGradient,
          is_public: isPublic,
          questions: JSON.parse(JSON.stringify(questions)),
          hashtags,
          updated_at: new Date().toISOString(),
        })
        .eq("id", quiz.id)
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "შენახულია! ✅",
        description: "ცვლილებები წარმატებით შეინახა",
      });

      queryClient.invalidateQueries({ queryKey: ["my-quiz-posts"] });
      queryClient.invalidateQueries({ queryKey: ["quiz-posts-with-profiles"] });
      
      onQuizUpdated?.();
      handleClose();
    } catch (error) {
      console.error("Error updating quiz:", error);
      toast({
        title: "შეცდომა",
        description: "ცვლილებების შენახვა ვერ მოხერხდა",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateQuestionIcon = (index: number, iconSlug: string | null) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], icon_slug: iconSlug };
    setQuestions(updated);
  };

  const getQuestionText = (q: EditableQuestion) => q.question_text || q.question || "";

  if (!quiz) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">რედაქტირება</h2>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Gradient Preview & Picker */}
          <div>
            <button
              onClick={() => setShowGradientPicker(!showGradientPicker)}
              className="w-full rounded-xl overflow-hidden relative"
            >
              <div
                className="h-32 flex items-center justify-center"
                style={{ background: selectedGradient }}
              >
                <div className="absolute inset-0 bg-black/20" />
                <span className="relative text-white font-bold text-lg px-4 text-center drop-shadow-lg">
                  {title || "სათაური"}
                </span>
              </div>
              <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
                შეცვალე ფონი
              </div>
            </button>

            <AnimatePresence>
              {showGradientPicker && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-5 gap-2 pt-3">
                    {COVER_GRADIENTS.map((gradient, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setSelectedGradient(gradient);
                          setShowGradientPicker(false);
                        }}
                        className={`aspect-square rounded-lg transition-all ${
                          selectedGradient === gradient
                            ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
                            : "hover:scale-105"
                        }`}
                        style={{ background: gradient }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Title */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">სათაური</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Trivia-ს სათაური"
              className="h-12 rounded-xl"
            />
          </div>

          {/* Description/Hashtags */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">აღწერა / ჰეშთეგები</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="#ისტორია #საინტერესო"
              className="rounded-xl resize-none"
              rows={2}
            />
          </div>

          {/* Visibility Toggle */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">ხილვადობა</label>
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

          {/* Questions with Icons */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              კითხვები ({questions.length})
            </label>
            <div className="space-y-2">
              {questions.map((q, i) => (
                <div
                  key={i}
                  className="bg-muted/50 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedQuestion(expandedQuestion === i ? null : i)}
                    className="w-full flex items-center gap-3 p-3 text-left"
                  >
                    <QuestionIconPicker
                      selectedSlug={q.icon_slug || null}
                      onSelect={(slug) => updateQuestionIcon(i, slug)}
                      questionText={getQuestionText(q)}
                    />
                    <span className="flex-1 text-sm text-foreground line-clamp-1">
                      {getQuestionText(q)}
                    </span>
                    {expandedQuestion === i ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                  
                  <AnimatePresence>
                    {expandedQuestion === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-3 pb-3 space-y-2">
                          <div className="text-xs text-green-600 font-medium">
                            ✓ {q.correct_answer}
                          </div>
                          {q.incorrect_answers?.map((ans, j) => (
                            <div key={j} className="text-xs text-muted-foreground">
                              ✗ {ans}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <ChunkyButton
            onClick={handleSave}
            disabled={isSaving || !title.trim()}
            className="w-full"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ინახება...
              </>
            ) : (
              <>
                <Check className="w-5 h-5 mr-2" />
                შენახვა
              </>
            )}
          </ChunkyButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
