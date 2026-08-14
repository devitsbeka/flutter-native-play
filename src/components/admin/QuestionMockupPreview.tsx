import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Crown, Zap, Check, Pencil } from 'lucide-react';
import { DynamicIcon } from '@/components/shared/DynamicIcon';
import { QUALITY_CONSTANTS } from '@/constants/questionQuality';

interface QuestionMockupPreviewProps {
  question: string;
  correctAnswer: string;
  incorrectAnswers: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  iconSlug?: string;
  isEditable?: boolean;
  onIconClick?: () => void;
  onQuestionEdit?: (text: string) => void;
  onAnswerEdit?: (correct: string, incorrect: string[]) => void;
}

// Was 65/16 — the 16 existed nowhere else in the codebase and flagged answers
// the game renders comfortably. Take the shared values.
const { QUESTION_MAX_LENGTH, ANSWER_MAX_LENGTH } = QUALITY_CONSTANTS;

export function QuestionMockupPreview({
  question,
  correctAnswer,
  incorrectAnswers,
  iconSlug,
  isEditable = false,
  onIconClick,
  onQuestionEdit,
  onAnswerEdit,
}: QuestionMockupPreviewProps) {
  const allAnswers = [correctAnswer, ...incorrectAnswers].slice(0, 4);
  const letters = ['A', 'B', 'C', 'D'];
  
  const [editingQuestion, setEditingQuestion] = useState(false);
  const [editingAnswerIndex, setEditingAnswerIndex] = useState<number | null>(null);
  const [tempQuestion, setTempQuestion] = useState(question);
  const [tempAnswers, setTempAnswers] = useState(allAnswers);
  
  const questionInputRef = useRef<HTMLInputElement>(null);
  const answerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTempQuestion(question);
    setTempAnswers([correctAnswer, ...incorrectAnswers].slice(0, 4));
  }, [question, correctAnswer, incorrectAnswers]);

  useEffect(() => {
    if (editingQuestion && questionInputRef.current) {
      questionInputRef.current.focus();
      questionInputRef.current.select();
    }
  }, [editingQuestion]);

  useEffect(() => {
    if (editingAnswerIndex !== null && answerInputRef.current) {
      answerInputRef.current.focus();
      answerInputRef.current.select();
    }
  }, [editingAnswerIndex]);

  const handleQuestionSave = () => {
    if (onQuestionEdit && tempQuestion !== question) {
      onQuestionEdit(tempQuestion);
    }
    setEditingQuestion(false);
  };

  const handleAnswerSave = () => {
    if (onAnswerEdit && editingAnswerIndex !== null) {
      const newCorrect = tempAnswers[0];
      const newIncorrect = tempAnswers.slice(1);
      if (newCorrect !== correctAnswer || JSON.stringify(newIncorrect) !== JSON.stringify(incorrectAnswers)) {
        onAnswerEdit(newCorrect, newIncorrect);
      }
    }
    setEditingAnswerIndex(null);
  };

  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...tempAnswers];
    newAnswers[index] = value;
    setTempAnswers(newAnswers);
  };

  return (
    <div className="flex flex-col items-center">
      {/* iPhone Frame */}
      <div className="relative w-[280px] h-[560px] bg-black rounded-[40px] p-2 shadow-2xl">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl z-10" />
        
        {/* Screen */}
        <div className="w-full h-full bg-gradient-to-b from-[#7C6AE5] to-[#9B89F5] rounded-[32px] overflow-hidden">
          {/* Header */}
          <div className="px-3 pt-8 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-full bg-[#5B4BC4] flex items-center justify-center border border-white/30">
                <span className="text-sm">😊</span>
              </div>
              <div className="flex items-center gap-0.5 bg-white/10 px-1.5 py-0.5 rounded-full">
                <Crown className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
                <span className="text-white font-bold text-[10px]">0</span>
              </div>
            </div>
            <span className="text-white/60 text-[10px]">vs</span>
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-0.5 bg-white/10 px-1.5 py-0.5 rounded-full">
                <Crown className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
                <span className="text-white font-bold text-[10px]">0</span>
              </div>
              <div className="w-7 h-7 rounded-full bg-[#5B4BC4] flex items-center justify-center border border-white/30">
                <span className="text-sm">🤖</span>
              </div>
              <Zap className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            </div>
          </div>

          {/* Power-ups placeholder */}
          <div className="px-3 py-1.5 flex justify-center gap-2">
            {['5️⃣', '❄️', '🔄', '⏱️'].map((emoji, i) => (
              <div key={i} className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                <span className="text-sm">{emoji}</span>
              </div>
            ))}
          </div>

          {/* Question Card */}
          <div className="mx-3 mt-2 bg-[#5B4BC4] rounded-2xl p-3">
            {/* Timer bar */}
            <div className="h-1 bg-white/20 rounded-full overflow-hidden mb-3">
              <div className="h-full bg-white rounded-full w-3/4" />
            </div>

            {/* Icon display - clickable */}
            <div className="flex justify-center mb-2">
              <button
                onClick={isEditable ? onIconClick : undefined}
                className={cn(
                  "w-10 h-10 rounded-full bg-white/10 flex items-center justify-center relative group",
                  isEditable && "cursor-pointer hover:bg-white/20 transition-colors"
                )}
                disabled={!isEditable}
              >
                {iconSlug ? (
                  <DynamicIcon slug={iconSlug.split(',')[0]} size={28} />
                ) : (
                  <span className="text-white/40 text-lg">?</span>
                )}
                {isEditable && (
                  <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Pencil className="w-4 h-4 text-white" />
                  </div>
                )}
              </button>
            </div>

            {/* Question text - editable */}
            {editingQuestion && isEditable ? (
              <div className="relative">
                <input
                  ref={questionInputRef}
                  type="text"
                  value={tempQuestion}
                  onChange={(e) => setTempQuestion(e.target.value)}
                  onBlur={handleQuestionSave}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleQuestionSave();
                    if (e.key === 'Escape') {
                      setTempQuestion(question);
                      setEditingQuestion(false);
                    }
                  }}
                  className={cn(
                    "w-full bg-white/10 text-white text-sm font-bold text-center rounded-lg px-2 py-1 outline-none border-2",
                    tempQuestion.length > QUESTION_MAX_LENGTH 
                      ? "border-red-400" 
                      : "border-white/30"
                  )}
                  maxLength={QUESTION_MAX_LENGTH + 20}
                />
                <span className={cn(
                  "absolute -bottom-4 right-0 text-[10px]",
                  tempQuestion.length > QUESTION_MAX_LENGTH ? "text-red-300" : "text-white/50"
                )}>
                  {tempQuestion.length}/{QUESTION_MAX_LENGTH}
                </span>
              </div>
            ) : (
              <p 
                onClick={() => isEditable && setEditingQuestion(true)}
                className={cn(
                  "text-white text-sm font-bold italic text-center leading-snug min-h-[40px]",
                  isEditable && "cursor-text hover:bg-white/5 rounded-lg px-2 py-1 transition-colors"
                )}
              >
                {question || 'კითხვა აქ გამოჩნდება...'}
              </p>
            )}
          </div>

          {/* Answer buttons - editable */}
          <div className="flex-1 flex flex-col gap-2 px-3 mt-3">
            {tempAnswers.map((answer, index) => {
              const isCorrect = index === 0;
              const isEditing = editingAnswerIndex === index;
              
              return (
                <div
                  key={index}
                  className={cn(
                    "flex items-center gap-2 p-2.5 rounded-xl text-left relative",
                    isCorrect 
                      ? "bg-green-500 shadow-[0_2px_0_0_#16A34A]" 
                      : "bg-white shadow-[0_2px_0_0_#CBD5E1]"
                  )}
                >
                  <span className={cn(
                    "w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0",
                    isCorrect ? "bg-white text-green-500" : "bg-[#7DD3FC] text-white"
                  )}>
                    {isCorrect ? <Check className="w-3 h-3" /> : `${letters[index]}:`}
                  </span>
                  
                  {isEditing && isEditable ? (
                    <div className="flex-1 relative">
                      <input
                        ref={answerInputRef}
                        type="text"
                        value={answer}
                        onChange={(e) => handleAnswerChange(index, e.target.value)}
                        onBlur={handleAnswerSave}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAnswerSave();
                          if (e.key === 'Escape') {
                            setTempAnswers([correctAnswer, ...incorrectAnswers].slice(0, 4));
                            setEditingAnswerIndex(null);
                          }
                        }}
                        className={cn(
                          "w-full bg-transparent font-bold text-xs outline-none border-b-2",
                          isCorrect ? "text-white border-white/50" : "text-[#2A2550] border-[#2A2550]/30",
                          answer.length > ANSWER_MAX_LENGTH && "border-red-500"
                        )}
                        maxLength={ANSWER_MAX_LENGTH + 5}
                      />
                      <span className={cn(
                        "absolute -bottom-3 right-0 text-[8px]",
                        answer.length > ANSWER_MAX_LENGTH ? "text-red-500" : "text-current opacity-50"
                      )}>
                        {answer.length}/{ANSWER_MAX_LENGTH}
                      </span>
                    </div>
                  ) : (
                    <span 
                      onClick={() => isEditable && setEditingAnswerIndex(index)}
                      className={cn(
                        "flex-1 font-bold text-xs truncate",
                        isCorrect ? "text-white" : "text-[#2A2550]",
                        isEditable && "cursor-text hover:opacity-80"
                      )}
                    >
                      {answer || `პასუხი ${letters[index]}`}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Home indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-24 h-1 bg-white/30 rounded-full" />
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        {isEditable ? 'Click to edit • Tap icon to change' : 'თამაშში ჩვენება'}
      </p>
    </div>
  );
}
