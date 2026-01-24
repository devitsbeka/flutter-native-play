import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { QuestionIconPicker } from "@/components/social/QuestionIconPicker";
import { motion, AnimatePresence, Reorder, useDragControls } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Trash2, Check, Users, Lightbulb, PartyPopper, ImageIcon, Search, X, Copy, GripVertical, RefreshCw, ChevronLeft, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const ICON_STORAGE_URL = "https://sqwpzezkhpqkdyltvsim.supabase.co/storage/v1/object/public/icon-library";

async function getSuggestedIconSlug(questionText: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke("analyze-question-icon", {
      body: {
        question: questionText,
        category: "personal",
      },
    });
    if (error) throw error;

    const slug = (data?.slugs?.[0] as string | undefined) || null;
    return slug;
  } catch {
    return null;
  }
}

// Color palette for question headers - cycling through for visibility
const QUESTION_HEADER_COLORS = [
  'rgba(249, 115, 22, 0.15)',  // orange
  'rgba(168, 85, 247, 0.15)',  // purple
  'rgba(14, 165, 233, 0.15)',  // sky
  'rgba(34, 197, 94, 0.15)',   // green
  'rgba(236, 72, 153, 0.15)',  // pink
  'rgba(234, 179, 8, 0.15)',   // yellow
  'rgba(99, 102, 241, 0.15)',  // indigo
  'rgba(239, 68, 68, 0.15)',   // red
];

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
  "როდის მიდის ნინო პარიზში?",
  "რამდენი ძაღლი ჰყავს გიორგის?",
  "რა არის ბექას საყვარელი საჭმელი?",
  "სად დაიბადა დედა?",
  "რა ფერის მანქანა აქვს გიოს?",
  "რამდენი წლის არის ბებია?",
  "რომელ ქალაქში ცხოვრობს დათო?",
  "რა არის მამის საყვარელი ფილმი?",
  "რამდენი შვილიშვილი ჰყავს ბაბუას?",
  "რა ჰქვია დის კატას?",
  "რომელ სკოლაში სწავლობდა დედა?",
  "რა არის ძმის საყვარელი სპორტი?",
  
  // Friends & Social
  "ვინ მოიგო პირველი თამაში?",
  "რომელ წელს გავიცანით ერთმანეთი?",
  "სად შევხვდით პირველად?",
  "რა არის ჩვენი საერთო საყვარელი სიმღერა?",
  "ვინ აგვიანებს ყოველთვის?",
  "ვინ არის ყველაზე მხიარული?",
  "რომელ რესტორანში დავდივართ ხშირად?",
  "ვინ იცის ყველაზე კარგად მზარეულობა?",
  
  // Fun & Random
  "რა არის ჩემი საყვარელი ფერი?",
  "რომელი სეზონი მომწონს ყველაზე მეტად?",
  "რა პროფესია მინდოდა ბავშვობაში?",
  "რამდენი ქვეყანა მომინახულებია?",
  "რა არის ჩემი ყველაზე უცნაური ჩვევა?",
  "რომელ სუპერძალას ავირჩევდი?",
  "რა არის ჩემი საყვარელი წიგნი?",
  "რომელ ცხოველს დავემსგავსები?",
  "რა არის ჩემი საყვარელი დღესასწაული?",
  "რომელი ფილმი მინახავს ყველაზე მეტჯერ?",
];

// Check if text contains Georgian characters
const isGeorgian = (text: string) => /[\u10A0-\u10FF]/.test(text);

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
        onChange={(e) => {
          if (e.target.value.length <= 25) {
            onValueChange(e.target.value);
          }
        }}
        maxLength={25}
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
  onInsertIdea,
  onOpenIconPicker,
}: {
  question: PersonalQuestion;
  questionIndex: number;
  questionsCount: number;
  onRemove: () => void;
  onDuplicate: () => void;
  onUpdateQuestion: (field: "question" | "iconSlug", value: string | null) => void;
  onUpdateAnswers: (answers: string[], correctIndex: number) => void;
  onUpdateCorrectIndex: (index: number) => void;
  onInsertIdea: () => void;
  onOpenIconPicker: () => void;
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

  const headerColor = QUESTION_HEADER_COLORS[questionIndex % QUESTION_HEADER_COLORS.length];

  return (
    <Reorder.Item
      value={question}
      dragListener={false}
      dragControls={dragControls}
      className="rounded-2xl bg-muted/30 border border-border/50 overflow-hidden"
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
      {/* Color-coded Question Header */}
      <div 
        className="flex items-center justify-between px-3 py-2.5"
        style={{ backgroundColor: headerColor }}
      >
        <div className="flex items-center gap-2">
          <div
            onPointerDown={(e) => dragControls.start(e)}
            className="cursor-grab active:cursor-grabbing touch-none p-1 -ml-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            <GripVertical className="w-4 h-4" />
          </div>
          <span className="font-bold text-foreground" style={{ fontSize: '13px' }}>
            კითხვა {questionIndex + 1}
          </span>
        </div>
        
        {/* Action buttons row */}
        <div className="flex items-center gap-1.5">
          {/* Magical Idea button - 5% smaller */}
          <button
            onClick={onInsertIdea}
            className="h-[34px] min-w-[42px] px-2 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center gap-1.5 hover:from-amber-500/30 hover:to-orange-500/30 transition-all active:scale-95"
            title="ჩასვი იდეა"
          >
            <Sparkles className="w-[15px] h-[15px] text-amber-500" />
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">იდეა</span>
          </button>
          
          {/* Icon picker trigger button */}
          <button
            type="button"
            onClick={onOpenIconPicker}
            className={cn(
              "h-9 min-w-[44px] rounded-lg border flex items-center gap-1.5 px-2.5 hover:bg-muted transition-colors text-xs",
              question.iconSlug 
                ? "border-primary/50 bg-primary/5" 
                : "border-border bg-muted/50"
            )}
          >
            {question.iconSlug ? (
              <>
                <img
                  src={`${ICON_STORAGE_URL}/${question.iconSlug}.png`}
                  alt=""
                  className="w-5 h-5 object-contain"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                <span className="text-muted-foreground hidden sm:inline">აიკონი</span>
              </>
            ) : (
              <>
                <ImageIcon className="w-4.5 h-4.5 text-muted-foreground" />
                <Plus className="w-3 h-3 text-muted-foreground" />
              </>
            )}
          </button>
          
          {/* Copy and Delete buttons - no gap between them */}
          <div className="flex items-center gap-0">
            {/* Copy button */}
            <button
              onClick={onDuplicate}
              className="h-9 w-9 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors flex items-center justify-center"
              title="დუბლირება"
            >
              <Copy className="w-4 h-4" />
            </button>
            
            {/* Delete button */}
            {questionsCount > 1 && (
              <button
                onClick={onRemove}
                className="h-9 w-9 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex items-center justify-center"
                title="წაშლა"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Question content */}
      <div className="p-4 pt-3 space-y-3">

      {/* Question Input */}
      <div className="space-y-1">
        <Textarea
          placeholder="ჩაწერე კითხვა..."
          value={question.question}
          onChange={(e) => {
            if (e.target.value.length <= 70) {
              onUpdateQuestion("question", e.target.value);
            }
          }}
          maxLength={70}
          rows={2}
          className="bg-background resize-none min-h-[52px]"
        />
        <div className="text-xs text-muted-foreground text-right">
          {question.question.length}/70
        </div>
      </div>

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
  const [iconPickerIndex, setIconPickerIndex] = useState<number | null>(null);

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

  const assignIconForQuestion = useCallback(async (questionId: string, questionText: string) => {
    const suggested = await getSuggestedIconSlug(questionText);
    if (!suggested) return;
    // Update only if question still matches (avoid racing while user edits)
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId && q.question === questionText
          ? { ...q, iconSlug: suggested }
          : q
      )
    );
  }, []);

  const useExampleQuestion = (example: string) => {
    if (questions.length === 1 && !questions[0].question) {
      const clean = example.replace(/\s*[\u{1F300}-\u{1FAFF}]/gu, '');
      const id = questions[0].id;
      updateQuestion(id, "question", clean);
      void assignIconForQuestion(id, clean);
    } else {
      const clean = example.replace(/\s*[\u{1F300}-\u{1FAFF}]/gu, '');
      const id = Date.now().toString();
      setQuestions(prev => [
        ...prev,
        { 
          id,
          question: clean,
          answers: ["", "", "", ""], 
          correctIndex: 0 
        }
      ]);
      void assignIconForQuestion(id, clean);
    }
  };

  const insertIdeaForQuestion = useCallback((questionId: string) => {
    const randomIdea = EXAMPLE_QUESTIONS[Math.floor(Math.random() * EXAMPLE_QUESTIONS.length)];
    // Remove emoji from the idea
    const cleanIdea = randomIdea.replace(/\s*[\u{1F300}-\u{1FAFF}]/gu, '');
    updateQuestion(questionId, "question", cleanIdea);
    void assignIconForQuestion(questionId, cleanIdea);
  }, [updateQuestion, assignIconForQuestion]);

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
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500" aria-hidden />
              <div>
                <h2 className="text-lg font-bold text-foreground">My Trivia Party</h2>
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
                  placeholder="მაგ: ოჯახური ტრივია"
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
                      onInsertIdea={() => insertIdeaForQuestion(q.id)}
                      onOpenIconPicker={() => setIconPickerIndex(qIdx)}
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

          {/* Global Icon Picker - rendered via portal to escape stacking context */}
          {iconPickerIndex !== null && questions[iconPickerIndex] && createPortal(
            <QuestionIconPicker
              isOpen={true}
              onClose={() => setIconPickerIndex(null)}
              selectedSlug={questions[iconPickerIndex]?.iconSlug || null}
              onSelect={(slug) => {
                updateQuestion(questions[iconPickerIndex].id, "iconSlug", slug);
                setIconPickerIndex(null);
              }}
              questionText={questions[iconPickerIndex]?.question}
              correctAnswer={questions[iconPickerIndex]?.answers[questions[iconPickerIndex]?.correctIndex]}
              incorrectAnswers={questions[iconPickerIndex]?.answers.filter((_, i) => i !== questions[iconPickerIndex]?.correctIndex)}
              large
            />,
            document.body
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
