import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Sparkles, Copy, Trash2, Check, Loader2, Plus, Edit3, ImageIcon, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { QuestionIconPicker } from "@/components/social/QuestionIconPicker";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import useEmblaCarousel from "embla-carousel-react";

const ICON_STORAGE_URL = "https://sqwpzezkhpqkdyltvsim.supabase.co/storage/v1/object/public/icon-library";

// Example questions for the "Idea" button
const EXAMPLE_QUESTIONS = [
  "როდის მიდის ნინო პარიზში?",
  "რამდენი ძაღლი ჰყავს გიორგის?",
  "რა არის ბექას საყვარელი საჭმელი?",
  "სად დაიბადა დედა?",
  "რა ფერის მანქანა აქვს გიოს?",
  "რამდენი წლის არის ბებია?",
  "რომელ ქალაქში ცხოვრობს დათო?",
  "რა არის მამის საყვარელი ფილმი?",
  "ვინ მოიგო პირველი თამაში?",
  "რომელ წელს გავიცანით ერთმანეთი?",
  "სად შევხვდით პირველად?",
  "ვინ აგვიანებს ყოველთვის?",
  "ვინ არის ყველაზე მხიარული?",
  "რა არის ჩემი საყვარელი ფერი?",
  "რომელი სეზონი მომწონს ყველაზე მეტად?",
];

interface PersonalQuestion {
  id: string;
  question: string;
  answers: string[];
  correctIndex: number;
  iconSlug?: string;
}

interface GameStylePersonalTriviaProps {
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

export function GameStylePersonalTrivia({
  isOpen,
  onClose,
  onSave,
  initialData,
}: GameStylePersonalTriviaProps) {
  const { toast } = useToast();
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [editingField, setEditingField] = useState<"question" | "correct" | number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [title, setTitle] = useState(initialData?.title || "");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Initialize questions
  const [questions, setQuestions] = useState<PersonalQuestion[]>(() => {
    if (initialData?.questions) {
      return initialData.questions.map((q, idx) => ({
        id: `init-${idx}`,
        question: q.question_text,
        answers: [q.correct_answer, ...q.incorrect_answers],
        correctIndex: 0,
        iconSlug: q.icon_slug || undefined,
      }));
    }
    return [{ id: "1", question: "", answers: ["", "", "", ""], correctIndex: 0 }];
  });

  // Character limits
  const QUESTION_MAX = 65;
  const ANSWER_MAX = 25;

  // Sync carousel index
  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setCurrentIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi]);

  // Reindex on questions change
  useEffect(() => {
    if (emblaApi) {
      emblaApi.reInit();
    }
  }, [questions.length, emblaApi]);

  // Focus input when editing
  useEffect(() => {
    if (editingField !== null && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingField]);

  const currentQuestion = questions[currentIndex];

  const handleInsertIdea = () => {
    const randomIdea = EXAMPLE_QUESTIONS[Math.floor(Math.random() * EXAMPLE_QUESTIONS.length)];
    const newQuestions = [...questions];
    newQuestions[currentIndex] = {
      ...newQuestions[currentIndex],
      question: randomIdea,
    };
    setQuestions(newQuestions);
    
    toast({
      title: "💡 იდეა ჩაისვა!",
      duration: 2000,
    });
  };

  const handleAddQuestion = () => {
    const newQuestion: PersonalQuestion = {
      id: `new-${Date.now()}`,
      question: "",
      answers: ["", "", "", ""],
      correctIndex: 0,
    };
    const newQuestions = [...questions, newQuestion];
    setQuestions(newQuestions);
    
    // Navigate to the new question
    setTimeout(() => {
      emblaApi?.scrollTo(newQuestions.length - 1);
    }, 100);

    toast({
      title: "➕ ახალი კითხვა დაემატა",
      duration: 2000,
    });
  };

  const handleDuplicate = () => {
    const duplicated: PersonalQuestion = {
      ...currentQuestion,
      id: `dup-${Date.now()}`,
    };
    const newQuestions = [...questions];
    newQuestions.splice(currentIndex + 1, 0, duplicated);
    setQuestions(newQuestions);
    
    setTimeout(() => {
      emblaApi?.scrollTo(currentIndex + 1);
    }, 100);

    toast({
      title: "📋 კითხვა დუბლირდა",
      duration: 2000,
    });
  };

  const handleDelete = () => {
    if (questions.length <= 1) {
      toast({
        title: "არ შეიძლება",
        description: "მინიმუმ 1 კითხვა უნდა იყოს",
        variant: "destructive",
      });
      return;
    }

    const newQuestions = questions.filter((_, i) => i !== currentIndex);
    setQuestions(newQuestions);
    
    const newIndex = Math.min(currentIndex, newQuestions.length - 1);
    setTimeout(() => {
      emblaApi?.scrollTo(newIndex);
    }, 100);

    setShowDeleteConfirm(false);
    toast({
      title: "🗑️ კითხვა წაიშალა",
      duration: 2000,
    });
  };

  const handleIconChange = (slug: string | null) => {
    const newQuestions = [...questions];
    newQuestions[currentIndex] = {
      ...newQuestions[currentIndex],
      iconSlug: slug || undefined,
    };
    setQuestions(newQuestions);
  };

  const startEditing = (field: "question" | "correct" | number, value: string) => {
    setEditingField(field);
    setEditValue(value);
  };

  const saveEdit = () => {
    if (editingField === null) return;

    const newQuestions = [...questions];
    const question = { ...newQuestions[currentIndex] };

    if (editingField === "question") {
      question.question = editValue.slice(0, QUESTION_MAX);
    } else if (editingField === "correct") {
      const newAnswers = [...question.answers];
      newAnswers[question.correctIndex] = editValue.slice(0, ANSWER_MAX);
      question.answers = newAnswers;
    } else if (typeof editingField === "number") {
      const newAnswers = [...question.answers];
      // editingField is the visual index (0-2 for incorrect answers)
      // We need to map it to the actual answer index
      const incorrectIndices = question.answers.map((_, i) => i).filter(i => i !== question.correctIndex);
      const actualIndex = incorrectIndices[editingField];
      if (actualIndex !== undefined) {
        newAnswers[actualIndex] = editValue.slice(0, ANSWER_MAX);
        question.answers = newAnswers;
      }
    }

    newQuestions[currentIndex] = question;
    setQuestions(newQuestions);
    setEditingField(null);
    setEditValue("");
  };

  const setCorrectAnswer = (visualIndex: number) => {
    // visualIndex 0 = current correct (already set), 1-3 = incorrect answers
    if (visualIndex === 0) return; // Already correct
    
    const newQuestions = [...questions];
    const question = { ...newQuestions[currentIndex] };
    
    // Get incorrect answer indices
    const incorrectIndices = question.answers.map((_, i) => i).filter(i => i !== question.correctIndex);
    const newCorrectIndex = incorrectIndices[visualIndex - 1];
    
    if (newCorrectIndex !== undefined) {
      question.correctIndex = newCorrectIndex;
      newQuestions[currentIndex] = question;
      setQuestions(newQuestions);
    }
  };

  const handleSave = () => {
    const validQuestions = questions.filter(q => 
      q.question.trim() && 
      q.answers.every(a => a.trim())
    );

    if (validQuestions.length === 0) {
      toast({
        title: "შეცდომა",
        description: "შეავსეთ მინიმუმ 1 სრული კითხვა",
        variant: "destructive",
      });
      return;
    }

    const formattedQuestions = validQuestions.map(q => ({
      question_text: q.question,
      correct_answer: q.answers[q.correctIndex],
      incorrect_answers: q.answers.filter((_, i) => i !== q.correctIndex),
      icon_slug: q.iconSlug || null,
    }));

    onSave(formattedQuestions, title || "MyTrivia Party");
    onClose();
  };

  const letters = ["ა", "ბ", "გ", "დ"];

  // Get incorrect answers for display
  const getIncorrectAnswers = () => {
    if (!currentQuestion) return [];
    return currentQuestion.answers.filter((_, i) => i !== currentQuestion.correctIndex);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-gradient-to-b from-[#9B8AC4] to-[#8B7AB8] flex flex-col"
        >
          {/* Header */}
          <div className="pt-[env(safe-area-inset-top,8px)] px-4 py-3 flex items-center justify-between">
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            
            <div className="flex items-center gap-2 text-white">
              <PartyPopper className="w-5 h-5" />
              <span className="text-lg font-bold">{currentIndex + 1}/{questions.length}</span>
            </div>

            {/* Add Question Button */}
            <button
              onClick={handleAddQuestion}
              className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"
            >
              <Plus className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* Action Toolbar */}
          <div className="px-4 pb-3">
            <div className="flex items-center justify-center gap-2">
              {/* Idea Button */}
              <button
                onClick={handleInsertIdea}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 hover:bg-white/30 text-white text-sm font-medium transition-all"
              >
                <Sparkles className="w-4 h-4" />
                იდეა
              </button>

              {/* Icon Picker */}
              <QuestionIconPicker
                selectedSlug={currentQuestion?.iconSlug || null}
                onSelect={handleIconChange}
                questionText={currentQuestion?.question}
                correctAnswer={currentQuestion?.answers[currentQuestion?.correctIndex]}
                incorrectAnswers={getIncorrectAnswers()}
              />

              {/* Duplicate Button */}
              <button
                onClick={handleDuplicate}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/20 hover:bg-white/30 text-white text-sm font-medium transition-all"
              >
                <Copy className="w-4 h-4" />
              </button>

              {/* Delete Button */}
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/20 hover:bg-red-500/50 text-white text-sm font-medium transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Carousel */}
          <div className="flex-1 overflow-hidden" ref={emblaRef}>
            <div className="flex h-full">
              {questions.map((question, index) => (
                <div
                  key={question.id}
                  className="flex-[0_0_100%] min-w-0 px-4 flex flex-col"
                >
                  {/* Question Card */}
                  <div className="bg-[#7B6BA8] rounded-3xl p-5 shadow-lg mb-4">
                    {/* Icon */}
                    <div className="flex justify-center mb-4">
                      {question.iconSlug ? (
                        <img
                          src={`${ICON_STORAGE_URL}/${question.iconSlug}.png`}
                          alt=""
                          className="w-16 h-16 object-contain"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-white/50" />
                        </div>
                      )}
                    </div>

                    {/* Timer bar (decorative) */}
                    <div className="mb-4 h-2 bg-white/30 rounded-full overflow-hidden">
                      <div className="h-full w-full bg-white rounded-full" />
                    </div>

                    {/* Question Text - Editable */}
                    {editingField === "question" && index === currentIndex ? (
                      <div className="space-y-2">
                        <Textarea
                          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={saveEdit}
                          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && saveEdit()}
                          className="min-h-[80px] text-center text-lg font-bold bg-white/20 border-white/30 text-white placeholder:text-white/50 resize-none"
                          maxLength={QUESTION_MAX}
                          placeholder="შეიყვანე კითხვა..."
                        />
                        <div className="text-xs text-white/60 text-center">
                          {editValue.length}/{QUESTION_MAX}
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditing("question", question.question)}
                        className="w-full text-center group"
                      >
                        <p className="text-xl font-bold text-white leading-relaxed group-hover:text-white/80 transition-colors min-h-[60px] flex items-center justify-center">
                          {question.question || <span className="text-white/50">დააჭირე კითხვის დასამატებლად...</span>}
                        </p>
                        <Edit3 className="w-4 h-4 text-white/50 mx-auto mt-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    )}
                  </div>

                  {/* Answer Buttons */}
                  <div className="flex-1 flex flex-col gap-3 min-h-0 overflow-y-auto pb-4">
                    {/* Correct Answer */}
                    {editingField === "correct" && index === currentIndex ? (
                      <div className="flex items-center gap-3 p-3 rounded-2xl bg-emerald-500 shadow-[0_4px_0_0_#059669]">
                        <span className="w-11 h-11 rounded-full bg-white flex items-center justify-center text-emerald-500 font-bold flex-shrink-0">
                          <Check className="w-5 h-5" />
                        </span>
                        <Input
                          ref={inputRef as React.RefObject<HTMLInputElement>}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={saveEdit}
                          onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                          className="flex-1 bg-white/20 border-0 text-white placeholder:text-white/50 font-semibold"
                          maxLength={ANSWER_MAX}
                          placeholder="სწორი პასუხი..."
                        />
                        <span className="text-xs text-white/70">{editValue.length}/{ANSWER_MAX}</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditing("correct", question.answers[question.correctIndex])}
                        className="flex items-center gap-4 p-3 rounded-2xl bg-emerald-500 shadow-[0_4px_0_0_#059669] text-left group hover:brightness-105 transition-all"
                      >
                        <span className="w-11 h-11 rounded-full bg-white flex items-center justify-center text-emerald-500 font-bold flex-shrink-0">
                          <Check className="w-5 h-5" />
                        </span>
                        <span className="flex-1 font-semibold text-white min-h-[24px] flex items-center">
                          {question.answers[question.correctIndex] || <span className="text-white/70">სწორი პასუხი...</span>}
                        </span>
                        <Edit3 className="w-4 h-4 text-white/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    )}

                    {/* Incorrect Answers */}
                    {getIncorrectAnswers().map((answer, answerIndex) => (
                      editingField === answerIndex && index === currentIndex ? (
                        <div key={answerIndex} className="flex items-center gap-3 p-3 rounded-2xl bg-white shadow-[0_4px_0_0_#d1d5db]">
                          <span className="w-11 h-11 rounded-full bg-[#7DD3FC] flex items-center justify-center text-white font-bold flex-shrink-0">
                            {letters[answerIndex + 1]}:
                          </span>
                          <Input
                            ref={inputRef as React.RefObject<HTMLInputElement>}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={saveEdit}
                            onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                            className="flex-1 border-0 font-semibold"
                            maxLength={ANSWER_MAX}
                            placeholder={`არასწორი პასუხი ${answerIndex + 1}...`}
                          />
                          <span className="text-xs text-muted-foreground">{editValue.length}/{ANSWER_MAX}</span>
                        </div>
                      ) : (
                        <button
                          key={answerIndex}
                          onClick={() => startEditing(answerIndex, answer)}
                          className="flex items-center gap-4 p-3 rounded-2xl bg-white shadow-[0_4px_0_0_#d1d5db] text-left group hover:bg-gray-50 transition-all"
                        >
                          <span className="w-11 h-11 rounded-full bg-[#7DD3FC] flex items-center justify-center text-white font-bold flex-shrink-0">
                            {letters[answerIndex + 1]}:
                          </span>
                          <span className="flex-1 font-semibold text-slate-700 min-h-[24px] flex items-center">
                            {answer || <span className="text-slate-400">არასწორი პასუხი {answerIndex + 1}...</span>}
                          </span>
                          <Edit3 className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      )
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Dots */}
          <div className="flex justify-center gap-1.5 py-3 overflow-x-auto px-4">
            {questions.map((_, index) => (
              <button
                key={index}
                onClick={() => emblaApi?.scrollTo(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all flex-shrink-0",
                  index === currentIndex ? "w-6 bg-white" : "bg-white/40"
                )}
              />
            ))}
          </div>

          {/* Footer with Title & Save */}
          <div className="px-4 pb-[env(safe-area-inset-bottom,16px)] pt-2 space-y-3">
            {/* Title Input */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/10 border border-white/20">
              <PartyPopper className="w-6 h-6 text-white flex-shrink-0" />
              {isEditingTitle ? (
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => setIsEditingTitle(false)}
                  onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
                  autoFocus
                  className="flex-1 bg-white/20 border-white/30 text-white placeholder:text-white/70 font-bold"
                  placeholder="თამაშის სახელი..."
                />
              ) : (
                <button 
                  onClick={() => setIsEditingTitle(true)}
                  className="flex-1 text-left flex items-center gap-2 group"
                >
                  <span className="font-bold text-white truncate">
                    {title || "თამაშის სახელი..."}
                  </span>
                  <Edit3 className="w-4 h-4 text-white/70 group-hover:text-white transition-colors flex-shrink-0" />
                </button>
              )}
            </div>

            {/* Save Button */}
            <ChunkyButton 
              onClick={handleSave}
              className="w-full"
              variant="success"
            >
              <Check className="w-5 h-5 mr-2" />
              დაწყება
            </ChunkyButton>
          </div>

          {/* Delete Confirmation Modal */}
          <AnimatePresence>
            {showDeleteConfirm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
                onClick={() => setShowDeleteConfirm(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-background rounded-2xl p-6 max-w-sm w-full space-y-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
                      <Trash2 className="w-6 h-6 text-destructive" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground">კითხვის წაშლა?</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      ეს მოქმედება ვერ გაუქმდება
                    </p>
                  </div>
                  <div className="flex gap-3">
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
                      className="flex-1"
                    >
                      წაშლა
                    </ChunkyButton>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
