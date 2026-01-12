import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Trash2, Check, Users, Lightbulb, PartyPopper, ImageIcon, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { buildSearchTerms } from "@/utils/transliteration";

const ICON_STORAGE_URL = "https://sqwpzezkhpqkdyltvsim.supabase.co/storage/v1/object/public/icon-library";

interface IconItem {
  id: string;
  slug: string;
  title: string;
  icon_url: string | null;
}

interface PersonalQuestion {
  id: string;
  question: string;
  answers: string[];
  correctIndex: number;
  iconSlug?: string;
}

interface PersonalTriviaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (questions: Array<{
    question_text: string;
    correct_answer: string;
    incorrect_answers: string[];
    icon_slug?: string | null;
  }>, title: string) => void;
  initialData?: {
    title: string;
    questions: Array<{
      question_text: string;
      correct_answer: string;
      incorrect_answers: string[];
      icon_slug?: string | null;
    }>;
  } | null;
}

const EXAMPLE_QUESTIONS = [
  "როდის მიდის ნინო პარიზში? 🗼",
  "რამდენი ძაღლი ჰყავს გიორგის? 🐕",
  "რა არის ბექას საყვარელი საჭმელი? 🍕",
  "სად დაიბადა დედა? 🏠",
  "რა ფერის მანქანა აქვს გიოს? 🚗",
];

// Inline Icon Picker Component
function QuestionIconPickerInline({ 
  selectedSlug, 
  onSelect 
}: { 
  selectedSlug?: string; 
  onSelect: (slug: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [icons, setIcons] = useState<IconItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const getIconUrl = (icon: IconItem): string => {
    if (icon.icon_url) return icon.icon_url;
    return `${ICON_STORAGE_URL}/${icon.slug}.png`;
  };

  // Search icons when query changes or popover opens
  useEffect(() => {
    if (!open) return;
    
    const searchIcons = async () => {
      setIsLoading(true);
      try {
        const searchTerms = buildSearchTerms(searchQuery);
        
        let query = supabase
          .from("icon_library")
          .select("id, slug, title, icon_url")
          .limit(50);

        if (searchQuery.trim() && searchTerms.length > 0) {
          // Build OR conditions for all search terms
          const orConditions = searchTerms.map(term => 
            `title.ilike.%${term}%,slug.ilike.%${term}%`
          ).join(',');
          query = query.or(orConditions);
        }

        const { data, error } = await query;
        if (error) throw error;
        setIcons(data || []);
      } catch (error) {
        console.error("Error searching icons:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(searchIcons, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, open]);

  const handleSelect = (slug: string) => {
    onSelect(slug);
    setOpen(false);
    setSearchQuery("");
  };

  const handleRemove = () => {
    onSelect(null);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "h-7 rounded-lg border flex items-center gap-1.5 px-2 hover:bg-muted transition-colors text-xs",
            selectedSlug 
              ? "border-primary/50 bg-primary/5" 
              : "border-border bg-muted/50"
          )}
        >
          {selectedSlug ? (
            <>
              <img
                src={`${ICON_STORAGE_URL}/${selectedSlug}.png`}
                alt=""
                className="w-4 h-4 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <span className="text-muted-foreground">აიკონი</span>
            </>
          ) : (
            <>
              <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">+ აიკონი</span>
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end">
        <div className="p-3 space-y-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ძებნა... (ქართულად ან English)"
              className="pl-8 h-8 text-sm"
            />
          </div>

          {/* Icons Grid */}
          <ScrollArea className="h-48">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : icons.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs">
                აიკონი ვერ მოიძებნა
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-1.5 p-1">
                {icons.map((icon) => (
                  <button
                    key={icon.id}
                    onClick={() => handleSelect(icon.slug)}
                    className={cn(
                      "flex flex-col items-center p-1.5 rounded-lg border transition-all hover:scale-105",
                      selectedSlug === icon.slug
                        ? "border-primary bg-primary/10"
                        : "border-border bg-muted/30 hover:border-primary/50"
                    )}
                    title={icon.title}
                  >
                    <img
                      src={getIconUrl(icon)}
                      alt={icon.title}
                      className="w-8 h-8 object-contain"
                    />
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Remove Button */}
          {selectedSlug && (
            <button
              onClick={handleRemove}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-destructive hover:bg-destructive/10 rounded-lg transition-colors border border-destructive/20"
            >
              <X className="w-3 h-3" />
              წაშლა
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function PersonalTriviaModal({ isOpen, onClose, onSave, initialData }: PersonalTriviaModalProps) {
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<PersonalQuestion[]>([
    { id: "1", question: "", answers: ["", "", "", ""], correctIndex: 0 }
  ]);

  // Load initial data when editing existing trivia
  useEffect(() => {
    if (initialData && isOpen) {
      setTitle(initialData.title);
      setQuestions(initialData.questions.map((q, idx) => ({
        id: (idx + 1).toString(),
        question: q.question_text,
        answers: [q.correct_answer, ...q.incorrect_answers],
        correctIndex: 0, // Correct answer is always first in the formatted data
        iconSlug: q.icon_slug || undefined
      })));
    }
  }, [initialData, isOpen]);

  const addQuestion = useCallback(() => {
    setQuestions(prev => [
      ...prev,
      { 
        id: Date.now().toString(), 
        question: "", 
        answers: ["", "", "", ""], 
        correctIndex: 0 
      }
    ]);
  }, []);

  const removeQuestion = useCallback((id: string) => {
    if (questions.length > 1) {
      setQuestions(prev => prev.filter(q => q.id !== id));
    }
  }, [questions.length]);

  const updateQuestion = useCallback((id: string, field: "question" | "correctIndex" | "iconSlug", value: string | number | null) => {
    setQuestions(prev => prev.map(q => 
      q.id === id ? { ...q, [field]: value } : q
    ));
  }, []);

  const updateAnswer = useCallback((questionId: string, answerIndex: number, value: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id === questionId) {
        const newAnswers = [...q.answers];
        newAnswers[answerIndex] = value;
        return { ...q, answers: newAnswers };
      }
      return q;
    }));
  }, []);

  const handleSave = () => {
    // Validate: at least one question with all fields filled
    const validQuestions = questions.filter(q => 
      q.question.trim() && 
      q.answers.every(a => a.trim())
    );

    if (validQuestions.length === 0) return;

    const formattedQuestions = validQuestions.map(q => ({
      question_text: q.question,
      correct_answer: q.answers[q.correctIndex],
      incorrect_answers: q.answers.filter((_, i) => i !== q.correctIndex),
      icon_slug: q.iconSlug || null,
    }));

    onSave(formattedQuestions, title || "MyTrivia Party");
    
    // Only reset state if not editing (no initial data)
    if (!initialData) {
      setTitle("");
      setQuestions([{ id: "1", question: "", answers: ["", "", "", ""], correctIndex: 0 }]);
    }
    onClose();
  };

  const isValid = questions.some(q => 
    q.question.trim() && 
    q.answers.every(a => a.trim())
  );

  const useExampleQuestion = (example: string) => {
    if (questions.length === 1 && !questions[0].question) {
      updateQuestion(questions[0].id, "question", example.replace(/\s*[\u{1F300}-\u{1FAFF}]/gu, ''));
    } else {
      setQuestions(prev => [
        ...prev,
        { 
          id: Date.now().toString(), 
          question: example.replace(/\s*[\u{1F300}-\u{1FAFF}]/gu, ''), 
          answers: ["", "", "", ""], 
          correctIndex: 0 
        }
      ]);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="p-5 pb-3 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                <PartyPopper className="w-6 h-6 text-white" />
              </div>
              <div>
                <SheetTitle className="text-left text-lg">🎉 MyTrivia Party</SheetTitle>
                <p className="text-sm text-muted-foreground">შენი კითხვები, შენი პასუხები</p>
              </div>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 px-5">
            <div className="py-5 space-y-5 pb-24">
              {/* Title Input */}
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  ტრივიის სახელი
                </label>
                <Input
                  placeholder="მაგ: ოჯახური ტრივია 🏠"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-muted/50"
                />
              </div>

              {/* Example Questions */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium text-foreground">იდეები:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {EXAMPLE_QUESTIONS.map((example, idx) => (
                    <button
                      key={idx}
                      onClick={() => useExampleQuestion(example)}
                      className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 transition-colors"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {questions.map((q, qIdx) => (
                    <motion.div
                      key={q.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      className="p-4 rounded-2xl bg-muted/30 border border-border/50 space-y-3"
                    >
                      {/* Question Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">
                            კითხვა {qIdx + 1}
                          </span>
                          <QuestionIconPickerInline
                            selectedSlug={q.iconSlug}
                            onSelect={(slug) => updateQuestion(q.id, "iconSlug", slug)}
                          />
                        </div>
                        {questions.length > 1 && (
                          <button
                            onClick={() => removeQuestion(q.id)}
                            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Question Input */}
                      <Input
                        placeholder="ჩაწერე კითხვა..."
                        value={q.question}
                        onChange={(e) => updateQuestion(q.id, "question", e.target.value)}
                        className="bg-background"
                      />

                      {/* Answer Options */}
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                          აირჩიე სწორი პასუხი:
                        </p>
                        {q.answers.map((answer, aIdx) => (
                          <div key={aIdx} className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuestion(q.id, "correctIndex", aIdx)}
                              className={cn(
                                "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                                q.correctIndex === aIdx
                                  ? "border-emerald-500 bg-emerald-500 text-white"
                                  : "border-border hover:border-muted-foreground"
                              )}
                            >
                              {q.correctIndex === aIdx && <Check className="w-3.5 h-3.5" />}
                            </button>
                            <Input
                              placeholder={`პასუხი ${aIdx + 1}`}
                              value={answer}
                              onChange={(e) => updateAnswer(q.id, aIdx, e.target.value)}
                              className={cn(
                                "flex-1 bg-background transition-all",
                                q.correctIndex === aIdx && "border-emerald-500/50 ring-1 ring-emerald-500/20"
                              )}
                            />
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Add Question Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={addQuestion}
                className="w-full p-3 rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">დაამატე კითხვა</span>
              </motion.button>
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="p-5 pt-4 border-t border-border/50 bg-background">
            <Button
              onClick={handleSave}
              disabled={!isValid}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-semibold shadow-lg shadow-pink-500/25"
            >
              <Users className="w-5 h-5 mr-2" />
              შენახვა ({questions.filter(q => q.question.trim() && q.answers.every(a => a.trim())).length} კითხვა)
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
