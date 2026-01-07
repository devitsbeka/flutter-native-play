import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Globe, Lock, Trash2, Check } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

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
  "radial-gradient(ellipse 120% 80% at 20% 30%, rgba(139,92,246,0.8) 0%, transparent 50%), radial-gradient(ellipse 100% 120% at 80% 70%, rgba(236,72,153,0.7) 0%, transparent 50%), linear-gradient(135deg, #4C1D95 0%, #831843 100%)",
  "radial-gradient(ellipse 80% 100% at 70% 20%, rgba(59,130,246,0.8) 0%, transparent 45%), radial-gradient(ellipse 100% 80% at 20% 80%, rgba(6,182,212,0.7) 0%, transparent 45%), linear-gradient(150deg, #1E3A8A 0%, #0E7490 100%)",
  "radial-gradient(ellipse 90% 110% at 30% 60%, rgba(16,185,129,0.8) 0%, transparent 50%), radial-gradient(ellipse 120% 90% at 75% 25%, rgba(52,211,153,0.6) 0%, transparent 50%), linear-gradient(160deg, #064E3B 0%, #047857 100%)",
  "radial-gradient(ellipse 100% 80% at 60% 30%, rgba(249,115,22,0.75) 0%, transparent 45%), radial-gradient(ellipse 80% 100% at 25% 75%, rgba(239,68,68,0.7) 0%, transparent 45%), linear-gradient(145deg, #7C2D12 0%, #991B1B 100%)",
];

export function EditQuizModal({ quiz, isOpen, onClose }: EditQuizModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [title, setTitle] = useState("");
  const [selectedGradient, setSelectedGradient] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (quiz) {
      setTitle(quiz.title || "");
      setSelectedGradient(quiz.cover_gradient || COVER_GRADIENTS[0]);
      setIsPublic(quiz.is_public !== false);
      setShowDeleteConfirm(false);
    }
  }, [quiz]);

  const handleSave = async () => {
    if (!quiz) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("user_quiz_posts")
        .update({
          title,
          cover_gradient: selectedGradient,
          is_public: isPublic,
        })
        .eq("id", quiz.id);

      if (error) throw error;

      toast({
        title: "შენახულია! ✓",
        description: "ცვლილებები წარმატებით შეინახა",
      });

      queryClient.invalidateQueries({ queryKey: ["my-quiz-posts"] });
      onClose();
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

  const handleDelete = async () => {
    if (!quiz) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("user_quiz_posts")
        .delete()
        .eq("id", quiz.id);

      if (error) throw error;

      toast({
        title: "წაიშალა",
        description: "Trivia წარმატებით წაიშალა",
      });

      queryClient.invalidateQueries({ queryKey: ["my-quiz-posts"] });
      onClose();
    } catch (error) {
      console.error("Error deleting quiz:", error);
      toast({
        title: "შეცდომა",
        description: "წაშლა ვერ მოხერხდა",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!quiz) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">რედაქტირება</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-4 space-y-5">
          {/* Preview */}
          <div 
            className="h-28 rounded-xl flex items-center justify-center relative overflow-hidden"
            style={{ background: selectedGradient }}
          >
            <div className="absolute inset-0 bg-black/20" />
            <h4 className="text-lg font-bold text-white text-center px-4 drop-shadow-lg relative z-10 line-clamp-2">
              {title || "სათაური"}
            </h4>
          </div>

          {/* Title Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">სათაური</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Trivia-ს სათაური"
              className="h-12 rounded-xl"
            />
          </div>

          {/* Gradient Picker */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">ფონი</label>
            <div className="grid grid-cols-5 gap-2">
              {COVER_GRADIENTS.map((gradient, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedGradient(gradient)}
                  className={`aspect-square rounded-xl transition-all ${
                    selectedGradient === gradient
                      ? "ring-2 ring-primary ring-offset-2 scale-105"
                      : "hover:scale-105"
                  }`}
                  style={{ background: gradient }}
                >
                  {selectedGradient === gradient && (
                    <div className="w-full h-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white drop-shadow" />
                    </div>
                  )}
                </button>
              ))}
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
                  <span className="text-sm font-medium">Trivia-ს წაშლა</span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
