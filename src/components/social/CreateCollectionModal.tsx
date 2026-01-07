import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash2, Loader2, Sparkles, ChevronLeft, Layers } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface CollectionRound {
  subject: string;
  questionCount: number;
  answerFormat: "4_answers" | "true_false";
}

interface CreateCollectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCollectionCreated?: () => void;
}

const COVER_GRADIENTS = [
  "from-purple-500 to-indigo-600",
  "from-pink-500 to-rose-500",
  "from-orange-400 to-pink-500",
  "from-cyan-400 to-blue-500",
  "from-green-400 to-emerald-500",
  "from-violet-500 to-purple-600",
  "from-amber-400 to-orange-500",
  "from-teal-400 to-cyan-500",
];

export function CreateCollectionModal({ open, onOpenChange, onCollectionCreated }: CreateCollectionModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverGradient, setCoverGradient] = useState(COVER_GRADIENTS[0]);
  const [isPublic, setIsPublic] = useState(true);
  const [rounds, setRounds] = useState<CollectionRound[]>([
    { subject: "", questionCount: 5, answerFormat: "4_answers" }
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
  const [isPosting, setIsPosting] = useState(false);

  const resetForm = () => {
    setStep(1);
    setTitle("");
    setDescription("");
    setCoverGradient(COVER_GRADIENTS[0]);
    setIsPublic(true);
    setRounds([{ subject: "", questionCount: 5, answerFormat: "4_answers" }]);
    setIsGenerating(false);
    setGenerationProgress({ current: 0, total: 0 });
    setIsPosting(false);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const addRound = () => {
    if (rounds.length < 5) {
      setRounds([...rounds, { subject: "", questionCount: 5, answerFormat: "4_answers" }]);
    }
  };

  const removeRound = (index: number) => {
    if (rounds.length > 1) {
      setRounds(rounds.filter((_, i) => i !== index));
    }
  };

  const updateRound = (index: number, field: keyof CollectionRound, value: any) => {
    const updated = [...rounds];
    updated[index] = { ...updated[index], [field]: value };
    setRounds(updated);
  };

  const canProceed = rounds.every(r => r.subject.trim().length > 0);

  const handleGenerate = async () => {
    if (!user) return;

    setIsGenerating(true);
    setStep(2);
    setGenerationProgress({ current: 0, total: rounds.length });

    try {
      // Create the collection first
      const { data: collection, error: collectionError } = await supabase
        .from("quiz_collections")
        .insert({
          user_id: user.id,
          title: title || `კოლექცია: ${rounds.map(r => r.subject).join(", ")}`,
          description,
          cover_gradient: coverGradient,
          is_public: isPublic,
        })
        .select()
        .single();

      if (collectionError) throw collectionError;

      // Generate each round
      for (let i = 0; i < rounds.length; i++) {
        setGenerationProgress({ current: i + 1, total: rounds.length });
        
        const round = rounds[i];
        
        const { data: quizData, error: genError } = await supabase.functions.invoke("generate-custom-quiz", {
          body: {
            subject: round.subject,
            questionCount: round.questionCount,
            answerFormat: round.answerFormat,
          },
        });

        if (genError) throw genError;

        // Create the quiz post linked to collection
        const { error: postError } = await supabase
          .from("user_quiz_posts")
          .insert({
            user_id: user.id,
            title: quizData.title || round.subject,
            subject: round.subject,
            questions: quizData.questions,
            question_count: quizData.questions.length,
            answer_format: round.answerFormat,
            cover_gradient: coverGradient,
            is_public: isPublic,
            collection_id: collection.id,
            round_number: i + 1,
          });

        if (postError) throw postError;
      }

      toast.success("კოლექცია წარმატებით შეიქმნა!");
      queryClient.invalidateQueries({ queryKey: ["my-quiz-posts"] });
      queryClient.invalidateQueries({ queryKey: ["my-collections"] });
      queryClient.invalidateQueries({ queryKey: ["quiz-posts-with-profiles"] });
      onCollectionCreated?.();
      handleClose();
    } catch (error: any) {
      console.error("Error creating collection:", error);
      toast.error(error.message || "კოლექციის შექმნა ვერ მოხერხდა");
      setStep(1);
    } finally {
      setIsGenerating(false);
    }
  };

  const renderStep1 = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
          <Layers className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-xl font-bold text-foreground">შექმენი კოლექცია</h3>
        <p className="text-sm text-muted-foreground mt-1">რამდენიმე რაუნდი ერთად</p>
      </div>

      {/* Collection Title */}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">სახელი</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="კოლექციის სახელი (არასავალდებულო)"
          className="rounded-xl"
        />
      </div>

      {/* Description */}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">აღწერა</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="მოკლე აღწერა (არასავალდებულო)"
          className="rounded-xl resize-none"
          rows={2}
        />
      </div>

      {/* Cover Gradient */}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">ფერი</label>
        <div className="flex gap-2 flex-wrap">
          {COVER_GRADIENTS.map((gradient) => (
            <button
              key={gradient}
              onClick={() => setCoverGradient(gradient)}
              className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} transition-all ${
                coverGradient === gradient ? "ring-2 ring-primary ring-offset-2" : ""
              }`}
            />
          ))}
        </div>
      </div>

      {/* Visibility Toggle */}
      <div className="flex items-center justify-between p-3 bg-muted rounded-xl">
        <span className="text-sm font-medium">საჯარო</span>
        <button
          onClick={() => setIsPublic(!isPublic)}
          className={`w-12 h-7 rounded-full transition-colors ${
            isPublic ? "bg-primary" : "bg-muted-foreground/30"
          }`}
        >
          <motion.div
            animate={{ x: isPublic ? 22 : 4 }}
            className="w-5 h-5 bg-white rounded-full shadow-md"
          />
        </button>
      </div>

      {/* Rounds */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-foreground">რაუნდები ({rounds.length}/5)</label>
          {rounds.length < 5 && (
            <button
              onClick={addRound}
              className="flex items-center gap-1 text-xs text-primary font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              დამატება
            </button>
          )}
        </div>
        
        <div className="space-y-3">
          {rounds.map((round, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-muted rounded-xl space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground">რაუნდი {index + 1}</span>
                {rounds.length > 1 && (
                  <button
                    onClick={() => removeRound(index)}
                    className="p-1 text-destructive hover:bg-destructive/10 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              <Input
                value={round.subject}
                onChange={(e) => updateRound(index, "subject", e.target.value)}
                placeholder="თემა (მაგ: ფიზიკა, ფეხბურთი...)"
                className="rounded-lg text-sm"
              />
              
              <div className="flex gap-2">
                <select
                  value={round.questionCount}
                  onChange={(e) => updateRound(index, "questionCount", parseInt(e.target.value))}
                  className="flex-1 bg-background rounded-lg px-3 py-2 text-sm border border-border"
                >
                  <option value={5}>5 კითხვა</option>
                  <option value={7}>7 კითხვა</option>
                  <option value={10}>10 კითხვა</option>
                </select>
                
                <select
                  value={round.answerFormat}
                  onChange={(e) => updateRound(index, "answerFormat", e.target.value)}
                  className="flex-1 bg-background rounded-lg px-3 py-2 text-sm border border-border"
                >
                  <option value="4_answers">4 პასუხი</option>
                  <option value="true_false">მართალი/მცდარი</option>
                </select>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={!canProceed || isGenerating}
        className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
      >
        <Sparkles className="w-5 h-5" />
        შექმნა
      </button>
    </motion.div>
  );

  const renderStep2 = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-12"
    >
      <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${coverGradient} flex items-center justify-center mb-6`}>
        <Loader2 className="w-10 h-10 text-white animate-spin" />
      </div>
      
      <h3 className="text-xl font-bold text-foreground mb-2">იქმნება კოლექცია...</h3>
      <p className="text-muted-foreground mb-6">
        რაუნდი {generationProgress.current} / {generationProgress.total}
      </p>
      
      <div className="w-full max-w-xs bg-muted rounded-full h-2 overflow-hidden">
        <motion.div
          className={`h-full bg-gradient-to-r ${coverGradient}`}
          initial={{ width: 0 }}
          animate={{ width: `${(generationProgress.current / generationProgress.total) * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </motion.div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-3xl">
        <DialogTitle className="sr-only">შექმენი კოლექცია</DialogTitle>
        
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-border bg-background">
          {step > 1 && !isGenerating ? (
            <button onClick={() => setStep(step - 1)} className="p-2 -ml-2 hover:bg-muted rounded-xl">
              <ChevronLeft className="w-5 h-5" />
            </button>
          ) : (
            <div className="w-9" />
          )}
          
          <div className="flex gap-1.5">
            {[1, 2].map((s) => (
              <div
                key={s}
                className={`w-2 h-2 rounded-full transition-colors ${
                  s === step ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
          
          <button onClick={handleClose} className="p-2 -mr-2 hover:bg-muted rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
