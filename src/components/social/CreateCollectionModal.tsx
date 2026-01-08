import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash2, Loader2, Sparkles, ChevronLeft, Check, RefreshCw, Edit2 } from "lucide-react";
import iconCollections from "@/assets/icon-collections.png";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DynamicIcon } from "@/components/shared/DynamicIcon";

type DifficultyLevel = "mixed" | "easy" | "medium" | "hard";

interface CollectionRound {
  subject: string;
  questionCount: number;
  answerFormat: "4_answers" | "true_false";
  difficulty: DifficultyLevel;
}

interface GeneratedQuestion {
  question_text: string;
  correct_answer: string;
  incorrect_answers: string[];
  difficulty: string;
  icon_slug: string | null;
}

interface GeneratedRound {
  subject: string;
  title: string;
  questions: GeneratedQuestion[];
  answerFormat: string;
}

interface GeneratedData {
  coverImage: string | null;
  coverGenerationCount: number;
  rounds: GeneratedRound[];
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
  const [coverGradient] = useState(COVER_GRADIENTS[0]);
  const [isPublic, setIsPublic] = useState(true);
  const [rounds, setRounds] = useState<CollectionRound[]>([
    { subject: "", questionCount: 5, answerFormat: "4_answers", difficulty: "mixed" }
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0, status: "" });
  const [isPosting, setIsPosting] = useState(false);
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  
  // Generated data for Step 3
  const [generatedData, setGeneratedData] = useState<GeneratedData | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<{ roundIdx: number; questionIdx: number } | null>(null);

  const resetForm = () => {
    setStep(1);
    setTitle("");
    setDescription("");
    setIsPublic(true);
    setRounds([{ subject: "", questionCount: 5, answerFormat: "4_answers", difficulty: "mixed" }]);
    setIsGenerating(false);
    setGenerationProgress({ current: 0, total: 0, status: "" });
    setIsPosting(false);
    setGeneratedData(null);
    setEditingQuestion(null);
    setIsGeneratingCover(false);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const addRound = () => {
    if (rounds.length < 5) {
      setRounds([...rounds, { subject: "", questionCount: 5, answerFormat: "4_answers", difficulty: "mixed" }]);
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
    setGenerationProgress({ current: 0, total: rounds.length + 1, status: "კითხვები" });

    try {
      const generatedRounds: GeneratedRound[] = [];

      // Generate questions for each round
      for (let i = 0; i < rounds.length; i++) {
        setGenerationProgress({ current: i + 1, total: rounds.length + 1, status: `რაუნდი ${i + 1}` });
        
        const round = rounds[i];
        
        const { data: quizData, error: genError } = await supabase.functions.invoke("generate-custom-quiz", {
          body: {
            subject: round.subject,
            questionCount: round.questionCount,
            answerFormat: round.answerFormat,
            difficulty: round.difficulty,
          },
        });

        if (genError) throw genError;

        generatedRounds.push({
          subject: round.subject,
          title: quizData.title || round.subject,
          questions: quizData.questions,
          answerFormat: round.answerFormat,
        });
      }

      // Generate cover image
      setGenerationProgress({ current: rounds.length + 1, total: rounds.length + 1, status: "გარეკანი" });
      
      let coverImageUrl: string | null = null;
      const subjects = rounds.map(r => r.subject).filter(Boolean).join(", ");
      
      try {
        const { data: coverData } = await supabase.functions.invoke("generate-cover-image", {
          body: {
            title: title || `კოლექცია: ${subjects}`,
            subject: subjects,
          },
        });
        
        if (coverData?.imageUrl) {
          coverImageUrl = coverData.imageUrl;
        }
      } catch (coverError) {
        console.error("Cover generation failed:", coverError);
        // Continue without cover image
      }

      // Set generated data and move to Step 3
      setGeneratedData({
        coverImage: coverImageUrl,
        coverGenerationCount: 1,
        rounds: generatedRounds,
      });
      
      // Auto-generate title if not set
      if (!title) {
        setTitle(subjects);
      }
      
      setStep(3);
    } catch (error: any) {
      console.error("Error generating collection:", error);
      toast.error(error.message || "კოლექციის გენერაცია ვერ მოხერხდა");
      setStep(1);
    } finally {
      setIsGenerating(false);
    }
  };

  const regenerateCover = async () => {
    if (!generatedData || generatedData.coverGenerationCount >= 3 || isGeneratingCover) return;
    
    setIsGeneratingCover(true);
    try {
      const subjects = rounds.map(r => r.subject).filter(Boolean).join(", ");
      const { data } = await supabase.functions.invoke("generate-cover-image", {
        body: { 
          title: title || `კოლექცია: ${subjects}`, 
          subject: subjects 
        },
      });
      
      if (data?.imageUrl) {
        setGeneratedData(prev => ({
          ...prev!,
          coverImage: data.imageUrl,
          coverGenerationCount: prev!.coverGenerationCount + 1,
        }));
        toast.success("ახალი გარეკანი შეიქმნა!");
      }
    } catch (error: any) {
      console.error("Error regenerating cover:", error);
      toast.error("გარეკანის გენერაცია ვერ მოხერხდა");
    } finally {
      setIsGeneratingCover(false);
    }
  };

  const updateGeneratedQuestion = (roundIdx: number, questionIdx: number, updates: Partial<GeneratedQuestion>) => {
    if (!generatedData) return;
    
    const newRounds = [...generatedData.rounds];
    newRounds[roundIdx] = {
      ...newRounds[roundIdx],
      questions: newRounds[roundIdx].questions.map((q, idx) => 
        idx === questionIdx ? { ...q, ...updates } : q
      ),
    };
    
    setGeneratedData({ ...generatedData, rounds: newRounds });
  };

  const handlePublish = async () => {
    if (!user || !generatedData) return;

    setIsPosting(true);

    try {
      // Create the collection first
      const { data: collection, error: collectionError } = await supabase
        .from("quiz_collections")
        .insert({
          user_id: user.id,
          title: title || `კოლექცია: ${rounds.map(r => r.subject).join(", ")}`,
          description,
          cover_gradient: coverGradient,
          cover_image: generatedData.coverImage,
          is_public: isPublic,
        })
        .select()
        .single();

      if (collectionError) throw collectionError;

      // Insert all quiz posts for rounds
      for (let i = 0; i < generatedData.rounds.length; i++) {
        const round = generatedData.rounds[i];
        
        const { error: postError } = await supabase
          .from("user_quiz_posts")
          .insert([{
            user_id: user.id,
            title: round.title,
            subject: round.subject,
            questions: round.questions as unknown as any,
            question_count: round.questions.length,
            answer_format: round.answerFormat,
            cover_gradient: coverGradient,
            cover_image: generatedData.coverImage,
            is_public: isPublic,
            collection_id: collection.id,
            round_number: i + 1,
          }]);

        if (postError) throw postError;
      }

      toast.success("კოლექცია წარმატებით გამოქვეყნდა!");
      queryClient.invalidateQueries({ queryKey: ["my-quiz-posts"] });
      queryClient.invalidateQueries({ queryKey: ["my-collections"] });
      queryClient.invalidateQueries({ queryKey: ["quiz-posts-with-profiles"] });
      onCollectionCreated?.();
      handleClose();
    } catch (error: any) {
      console.error("Error publishing collection:", error);
      toast.error(error.message || "გამოქვეყნება ვერ მოხერხდა");
    } finally {
      setIsPosting(false);
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
        <img src={iconCollections} alt="" className="w-14 h-14 mx-auto mb-4" />
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

              {/* Difficulty Selector */}
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">სირთულე</label>
                <div className="flex gap-1.5">
                  {[
                    { value: "mixed" as const, emoji: "🎲", label: "შერეული" },
                    { value: "easy" as const, emoji: "🟢", label: "ადვილი" },
                    { value: "medium" as const, emoji: "🟡", label: "საშუალო" },
                    { value: "hard" as const, emoji: "🔴", label: "რთული" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateRound(index, "difficulty", opt.value)}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                        round.difficulty === opt.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-background border border-border hover:border-primary/50"
                      }`}
                    >
                      <span className="block">{opt.emoji}</span>
                    </button>
                  ))}
                </div>
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
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center mb-6">
        <Loader2 className="w-10 h-10 text-white animate-spin" />
      </div>
      
      <h3 className="text-xl font-bold text-foreground mb-2">იქმნება კოლექცია...</h3>
      <p className="text-muted-foreground mb-6">
        {generationProgress.status} ({generationProgress.current} / {generationProgress.total})
      </p>
      
      <div className="w-full max-w-xs bg-muted rounded-full h-2 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-purple-500 to-indigo-600"
          initial={{ width: 0 }}
          animate={{ width: `${(generationProgress.current / generationProgress.total) * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </motion.div>
  );

  const renderStep3 = () => {
    if (!generatedData) return null;

    const remainingCoverTries = 3 - generatedData.coverGenerationCount;

    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-5"
      >
        {/* Cover Image Section */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">გარეკანი</label>
          <div className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-muted border border-border">
            {generatedData.coverImage ? (
              <img 
                src={generatedData.coverImage} 
                alt="Cover" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${coverGradient} flex items-center justify-center`}>
                <span className="text-white/60 text-sm">გარეკანი არ არის</span>
              </div>
            )}
            
            {/* Overlay with title */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-4">
              <p className="text-white font-bold text-lg truncate">{title}</p>
              <p className="text-white/70 text-sm">
                {generatedData.rounds.length} რაუნდი • {generatedData.rounds.reduce((acc, r) => acc + r.questions.length, 0)} კითხვა
              </p>
            </div>

            {/* Regenerate button */}
            {remainingCoverTries > 0 && (
              <button
                onClick={regenerateCover}
                disabled={isGeneratingCover}
                className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-background/90 backdrop-blur-sm rounded-lg text-sm font-medium hover:bg-background transition-colors disabled:opacity-50"
              >
                {isGeneratingCover ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    იქმნება...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    ახალი ({remainingCoverTries})
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Editable Title */}
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">სახელი</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="კოლექციის სახელი"
            className="rounded-xl"
          />
        </div>

        {/* Questions Preview */}
        <div className="space-y-4">
          <label className="text-sm font-medium text-foreground block">კითხვები</label>
          
          {generatedData.rounds.map((round, roundIdx) => (
            <div key={roundIdx} className="bg-muted rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-primary">რაუნდი {roundIdx + 1} - {round.subject}</span>
                <span className="text-xs text-muted-foreground">{round.questions.length} კითხვა</span>
              </div>
              
              {round.questions.map((question, questionIdx) => (
                <div 
                  key={questionIdx}
                  className="bg-background rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-start gap-2">
                    {/* Icon */}
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      {question.icon_slug ? (
                        <DynamicIcon slug={question.icon_slug} size={20} />
                      ) : (
                        <span className="text-muted-foreground text-xs">?</span>
                      )}
                    </div>
                    
                    {/* Question Text */}
                    <div className="flex-1 min-w-0">
                      {editingQuestion?.roundIdx === roundIdx && editingQuestion?.questionIdx === questionIdx ? (
                        <div className="space-y-2">
                          <Input
                            value={question.question_text}
                            onChange={(e) => updateGeneratedQuestion(roundIdx, questionIdx, { question_text: e.target.value })}
                            className="text-sm"
                            placeholder="კითხვა"
                          />
                          <Input
                            value={question.correct_answer}
                            onChange={(e) => updateGeneratedQuestion(roundIdx, questionIdx, { correct_answer: e.target.value })}
                            className="text-sm text-green-600"
                            placeholder="სწორი პასუხი"
                          />
                          <button
                            onClick={() => setEditingQuestion(null)}
                            className="text-xs text-primary font-medium flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            დასრულება
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-foreground line-clamp-2">{question.question_text}</p>
                          <p className="text-xs text-green-600 mt-1">✓ {question.correct_answer}</p>
                        </>
                      )}
                    </div>
                    
                    {/* Edit Button */}
                    {!(editingQuestion?.roundIdx === roundIdx && editingQuestion?.questionIdx === questionIdx) && (
                      <button
                        onClick={() => setEditingQuestion({ roundIdx, questionIdx })}
                        className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
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

        {/* Publish Button */}
        <button
          onClick={handlePublish}
          disabled={isPosting}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
        >
          {isPosting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              იქვეყნება...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              გამოქვეყნება
            </>
          )}
        </button>
      </motion.div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] p-0 gap-0 rounded-3xl overflow-hidden">
        <DialogTitle className="sr-only">შექმენი კოლექცია</DialogTitle>
        
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-border bg-background">
          {step > 1 && !isGenerating ? (
            <button 
              onClick={() => setStep(step - 1)} 
              className="p-2 -ml-2 hover:bg-muted rounded-xl"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          ) : (
            <div className="w-9" />
          )}
          
          <div className="flex gap-1.5">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`w-2 h-2 rounded-full transition-colors ${
                  s === step ? "bg-primary" : s < step ? "bg-primary/50" : "bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
          
          <button onClick={handleClose} className="p-2 -mr-2 hover:bg-muted rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content with ScrollArea */}
        <ScrollArea className="max-h-[calc(90vh-60px)]">
          <div className="p-6">
            <AnimatePresence mode="wait">
              {step === 1 && renderStep1()}
              {step === 2 && renderStep2()}
              {step === 3 && renderStep3()}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
