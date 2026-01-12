import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence, Reorder, useDragControls } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Trash2, Check, Users, Lightbulb, PartyPopper, ImageIcon, Search, X, Copy, GripVertical, RefreshCw, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

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

interface AnswerItem {
  id: string;
  value: string;
  originalIndex: number;
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
  // Family & Personal
  "როდის მიდის ნინო პარიზში? 🗼",
  "რამდენი ძაღლი ჰყავს გიორგის? 🐕",
  "რა არის ბექას საყვარელი საჭმელი? 🍕",
  "სად დაიბადა დედა? 🏠",
  "რა ფერის მანქანა აქვს გიოს? 🚗",
  "რამდენი წლის არის ბებია? 🎂",
  "რომელ ქალაქში ცხოვრობს დათო? 🌆",
  "რა არის მამის საყვარელი ფილმი? 🎬",
  "რამდენი შვილიშვილი ჰყავს ბაბუას? 👨‍👧‍👦",
  "რა ჰქვია დის კატას? 🐱",
  "რომელ სკოლაში სწავლობდა დედა? 🎓",
  "რა არის ძმის საყვარელი სპორტი? ⚽",
  
  // Friends & Social
  "ვინ მოიგო პირველი თამაში? 🏆",
  "რომელ წელს გავიცანით ერთმანეთი? 📅",
  "სად შევხვდით პირველად? 📍",
  "რა არის ჩვენი საერთო საყვარელი სიმღერა? 🎵",
  "ვინ აგვიანებს ყოველთვის? ⏰",
  "ვინ არის ყველაზე მხიარული? 😂",
  "რომელ რესტორანში დავდივართ ხშირად? 🍽️",
  "ვინ იცის ყველაზე კარგად მზარეულობა? 👨‍🍳",
  
  // Fun & Random
  "რა არის ჩემი საყვარელი ფერი? 🎨",
  "რომელი სეზონი მომწონს ყველაზე მეტად? 🌸",
  "რა პროფესია მინდოდა ბავშვობაში? 👩‍🚀",
  "რამდენი ქვეყანა მომინახულებია? ✈️",
  "რა არის ჩემი ყველაზე უცნაური ჩვევა? 🤪",
  "რომელ სუპერძალას ავირჩევდი? ⚡",
  "რა არის ჩემი საყვარელი წიგნი? 📚",
  "რომელ ცხოველს დავემსგავსები? 🦁",
  "რა არის ჩემი საყვარელი დღესასწაული? 🎄",
  "რომელი ფილმი მინახავს ყველაზე მეტჯერ? 🎥",
];

// Check if text contains Georgian characters
const isGeorgian = (text: string) => /[\u10A0-\u10FF]/.test(text);

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

  useEffect(() => {
    if (!open) return;
    
    const searchIcons = async () => {
      setIsLoading(true);
      try {
        if (searchQuery.trim() && isGeorgian(searchQuery)) {
          // Use smart search for Georgian input
          const { data, error } = await supabase.functions.invoke('smart-icon-search', {
            body: { query: searchQuery, limit: 50 }
          });
          
          if (error) throw error;
          
          // If smart search returns results, use them; otherwise fetch random icons
          if (data?.icons && data.icons.length > 0) {
            setIcons(data.icons);
          } else {
            // Fallback: fetch random icons so user always sees something
            const { data: randomData } = await supabase
              .from("icon_library")
              .select("id, slug, title, icon_url")
              .limit(50);
            setIcons(randomData || []);
          }
        } else {
          // Standard English search or no search query
          let query = supabase
            .from("icon_library")
            .select("id, slug, title, icon_url")
            .limit(50);

          if (searchQuery.trim()) {
            query = query.or(
              `title.ilike.%${searchQuery}%,slug.ilike.%${searchQuery}%`
            );
          }

          const { data, error } = await query;
          if (error) throw error;
          
          // If no results found for English search, fetch random icons
          if (!data || data.length === 0) {
            const { data: randomData } = await supabase
              .from("icon_library")
              .select("id, slug, title, icon_url")
              .limit(50);
            setIcons(randomData || []);
          } else {
            setIcons(data);
          }
        }
      } catch (error) {
        console.error("Error searching icons:", error);
        // On error, still try to show some icons
        const { data } = await supabase
          .from("icon_library")
          .select("id, slug, title, icon_url")
          .limit(50);
        setIcons(data || []);
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
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ძებნა... (ქართულად ან English)"
              className="pl-8 h-8 text-sm"
            />
          </div>

          <ScrollArea className="h-56">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : icons.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs">
                აიკონი ვერ მოიძებნა
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2 p-1">
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
                            className="w-10 h-10 object-contain"
                          />
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

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

// Draggable Answer Item Component
function DraggableAnswer({
  answer,
  isCorrect,
  onCorrectSelect,
  onValueChange,
  answerNumber,
}: {
  answer: AnswerItem;
  isCorrect: boolean;
  onCorrectSelect: () => void;
  onValueChange: (value: string) => void;
  answerNumber: number;
}) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={answer}
      dragListener={false}
      dragControls={dragControls}
      className="flex items-center gap-2"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.15 }}
    >
      <div
        onPointerDown={(e) => dragControls.start(e)}
        className="cursor-grab active:cursor-grabbing touch-none p-1 -ml-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
      >
        <GripVertical className="w-4 h-4" />
      </div>
      <button
        onClick={onCorrectSelect}
        className={cn(
          "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
          isCorrect
            ? "border-emerald-500 bg-emerald-500 text-white"
            : "border-border hover:border-muted-foreground"
        )}
      >
        {isCorrect && <Check className="w-3.5 h-3.5" />}
      </button>
      <Input
        placeholder={`პასუხი ${answerNumber}`}
        value={answer.value}
        onChange={(e) => onValueChange(e.target.value)}
        className={cn(
          "flex-1 bg-background transition-all",
          isCorrect && "border-emerald-500/50 ring-1 ring-emerald-500/20"
        )}
      />
    </Reorder.Item>
  );
}

// Draggable Question Card Component
function DraggableQuestionCard({
  question,
  questionIndex,
  questionsCount,
  onRemove,
  onDuplicate,
  onUpdateQuestion,
  onUpdateAnswers,
  onUpdateCorrectIndex,
}: {
  question: PersonalQuestion;
  questionIndex: number;
  questionsCount: number;
  onRemove: () => void;
  onDuplicate: () => void;
  onUpdateQuestion: (field: "question" | "iconSlug", value: string | null) => void;
  onUpdateAnswers: (answers: string[], correctIndex: number) => void;
  onUpdateCorrectIndex: (index: number) => void;
}) {
  const dragControls = useDragControls();
  
  // Convert answers to AnswerItem format for Reorder
  const [answerItems, setAnswerItems] = useState<AnswerItem[]>(() =>
    question.answers.map((value, idx) => ({
      id: `${question.id}-answer-${idx}`,
      value,
      originalIndex: idx,
    }))
  );

  // Sync answerItems when question.answers changes externally
  useEffect(() => {
    setAnswerItems(
      question.answers.map((value, idx) => ({
        id: `${question.id}-answer-${idx}`,
        value,
        originalIndex: idx,
      }))
    );
  }, [question.id, question.answers]);

  const handleAnswerReorder = (newOrder: AnswerItem[]) => {
    setAnswerItems(newOrder);
    
    // Find where the correct answer moved to
    const correctAnswerItem = newOrder.find(
      (item) => item.originalIndex === question.correctIndex
    );
    const newCorrectIndex = correctAnswerItem
      ? newOrder.indexOf(correctAnswerItem)
      : 0;

    // Update parent with new order
    onUpdateAnswers(
      newOrder.map((item) => item.value),
      newCorrectIndex
    );
  };

  const handleAnswerValueChange = (answerId: string, newValue: string) => {
    const newItems = answerItems.map((item) =>
      item.id === answerId ? { ...item, value: newValue } : item
    );
    setAnswerItems(newItems);
    onUpdateAnswers(
      newItems.map((item) => item.value),
      question.correctIndex
    );
  };

  const handleCorrectSelect = (index: number) => {
    onUpdateCorrectIndex(index);
  };

  return (
    <Reorder.Item
      value={question}
      dragListener={false}
      dragControls={dragControls}
      className="p-4 rounded-2xl bg-muted/30 border border-border/50 space-y-3"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      whileDrag={{ 
        scale: 1.02, 
        boxShadow: "0 10px 30px -10px rgba(0,0,0,0.3)",
        zIndex: 50 
      }}
    >
      {/* Question Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            onPointerDown={(e) => dragControls.start(e)}
            className="cursor-grab active:cursor-grabbing touch-none p-1 -ml-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            <GripVertical className="w-4 h-4" />
          </div>
          <span className="text-sm font-semibold text-foreground">
            კითხვა {questionIndex + 1}
          </span>
          <QuestionIconPickerInline
            selectedSlug={question.iconSlug}
            onSelect={(slug) => onUpdateQuestion("iconSlug", slug)}
          />
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onDuplicate}
            className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
            title="დუბლირება"
          >
            <Copy className="w-4 h-4" />
          </button>
          {questionsCount > 1 && (
            <button
              onClick={onRemove}
              className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              title="წაშლა"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Question Input */}
      <Input
        placeholder="ჩაწერე კითხვა..."
        value={question.question}
        onChange={(e) => onUpdateQuestion("question", e.target.value)}
        className="bg-background"
      />

      {/* Answer Options with Drag Reorder */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          აირჩიე სწორი პასუხი (გადაათრიე გადასალაგებლად):
        </p>
        <Reorder.Group
          axis="y"
          values={answerItems}
          onReorder={handleAnswerReorder}
          className="space-y-2"
        >
          <AnimatePresence mode="popLayout">
            {answerItems.map((answer, aIdx) => (
              <DraggableAnswer
                key={answer.id}
                answer={answer}
                isCorrect={question.correctIndex === aIdx}
                onCorrectSelect={() => handleCorrectSelect(aIdx)}
                onValueChange={(value) => handleAnswerValueChange(answer.id, value)}
                answerNumber={aIdx + 1}
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>
      </div>
    </Reorder.Item>
  );
}

export function PersonalTriviaModal({ isOpen, onClose, onSave, initialData }: PersonalTriviaModalProps) {
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<PersonalQuestion[]>([
    { id: "1", question: "", answers: ["", "", "", ""], correctIndex: 0 }
  ]);
  const [displayedIdeas, setDisplayedIdeas] = useState<string[]>([]);

  const shuffleIdeas = useCallback(() => {
    const shuffled = [...EXAMPLE_QUESTIONS].sort(() => Math.random() - 0.5);
    setDisplayedIdeas(shuffled.slice(0, 2));
  }, []);

  // Initialize ideas when modal opens
  useEffect(() => {
    if (isOpen) {
      shuffleIdeas();
    }
  }, [isOpen, shuffleIdeas]);

  // Load initial data when editing existing trivia
  useEffect(() => {
    if (initialData && isOpen) {
      setTitle(initialData.title);
      setQuestions(initialData.questions.map((q, idx) => ({
        id: `init-${idx}-${Date.now()}`,
        question: q.question_text,
        answers: [q.correct_answer, ...q.incorrect_answers],
        correctIndex: 0,
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

  const duplicateQuestion = useCallback((id: string) => {
    setQuestions(prev => {
      const questionToDuplicate = prev.find(q => q.id === id);
      if (!questionToDuplicate) return prev;
      
      const index = prev.findIndex(q => q.id === id);
      const duplicatedQuestion: PersonalQuestion = {
        ...questionToDuplicate,
        id: `dup-${Date.now()}`,
      };
      
      const newQuestions = [...prev];
      newQuestions.splice(index + 1, 0, duplicatedQuestion);
      return newQuestions;
    });
  }, []);

  const updateQuestion = useCallback((id: string, field: "question" | "iconSlug", value: string | null) => {
    setQuestions(prev => prev.map(q => 
      q.id === id ? { ...q, [field]: value } : q
    ));
  }, []);

  const updateAnswers = useCallback((id: string, answers: string[], correctIndex: number) => {
    setQuestions(prev => prev.map(q => 
      q.id === id ? { ...q, answers, correctIndex } : q
    ));
  }, []);

  const updateCorrectIndex = useCallback((id: string, correctIndex: number) => {
    setQuestions(prev => prev.map(q => 
      q.id === id ? { ...q, correctIndex } : q
    ));
  }, []);

  const handleSave = () => {
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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background flex flex-col"
        >
          {/* Fixed Header */}
          <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-background/95 backdrop-blur-sm">
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                <PartyPopper className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">🎉 MyTrivia Party</h2>
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1 px-4">
            <div className="py-5 space-y-5 pb-24">
              {/* Title Input */}
              <div className="px-1">
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
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium text-foreground">იდეები:</span>
                  </div>
                  <button
                    onClick={shuffleIdeas}
                    className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 transition-colors px-2 py-1 rounded-lg hover:bg-amber-500/10"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>ახალი</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <AnimatePresence mode="popLayout">
                    {displayedIdeas.map((example, idx) => (
                      <motion.button
                        key={example}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.2, delay: idx * 0.05 }}
                        onClick={() => useExampleQuestion(example)}
                        className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 transition-colors"
                      >
                        {example}
                      </motion.button>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              {/* Hint for drag and drop */}
              <p className="text-xs text-muted-foreground text-center">
                💡 გადაათრიე კითხვები ან პასუხები გადასალაგებლად
              </p>

              {/* Questions List with Drag Reorder */}
              <Reorder.Group
                axis="y"
                values={questions}
                onReorder={setQuestions}
                className="space-y-4"
              >
                <AnimatePresence mode="popLayout">
                  {questions.map((q, qIdx) => (
                    <DraggableQuestionCard
                      key={q.id}
                      question={q}
                      questionIndex={qIdx}
                      questionsCount={questions.length}
                      onRemove={() => removeQuestion(q.id)}
                      onDuplicate={() => duplicateQuestion(q.id)}
                      onUpdateQuestion={(field, value) => updateQuestion(q.id, field, value)}
                      onUpdateAnswers={(answers, correctIndex) => updateAnswers(q.id, answers, correctIndex)}
                      onUpdateCorrectIndex={(index) => updateCorrectIndex(q.id, index)}
                    />
                  ))}
                </AnimatePresence>
              </Reorder.Group>

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

          {/* Fixed Footer */}
          <div className="flex-shrink-0 p-4 border-t border-border/50 bg-background">
            <Button
              onClick={handleSave}
              disabled={!isValid}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-semibold shadow-lg shadow-pink-500/25"
            >
              <Users className="w-5 h-5 mr-2" />
              შენახვა ({questions.filter(q => q.question.trim() && q.answers.every(a => a.trim())).length} კითხვა)
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
