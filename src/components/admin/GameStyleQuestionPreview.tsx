import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Crown, Zap, Check, Pencil, ImagePlus } from 'lucide-react';
import { DynamicIcon } from '@/components/shared/DynamicIcon';
import { Badge } from '@/components/ui/badge';
import { QUALITY_CONSTANTS } from '@/constants/questionQuality';

interface GameStyleQuestionPreviewProps {
  question: string;
  correctAnswer: string;
  incorrectAnswers: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  iconSlug?: string | null;
  iconKeyword?: string | null;
  questionNumber?: number;
  isEditable?: boolean;
  onIconClick?: () => void;
  onQuestionEdit?: (text: string) => void;
  onAnswerEdit?: (correct: string, incorrect: string[]) => void;
}

// These counters tell a reviewer whether what they are approving will fit.
// They used to read 110/25 against a validator enforcing 70/20, so the screen
// people approve imports on was the most permissive number in the codebase and
// content authored to it needed a repair pass later. Take the shared values.
const { QUESTION_MAX_LENGTH, ANSWER_MAX_LENGTH } = QUALITY_CONSTANTS;

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'მარტივი',
  medium: 'საშუალო',
  hard: 'რთული',
};

export function GameStyleQuestionPreview({
  question,
  correctAnswer,
  incorrectAnswers,
  difficulty = 'medium',
  iconSlug,
  iconKeyword,
  questionNumber = 1,
  isEditable = false,
  onIconClick,
  onQuestionEdit,
  onAnswerEdit,
}: GameStyleQuestionPreviewProps) {
  const allAnswers = [correctAnswer, ...incorrectAnswers].slice(0, 4);
  const letters = ['ა', 'ბ', 'გ', 'დ'];
  
  const [editingQuestion, setEditingQuestion] = useState(false);
  const [editingAnswerIndex, setEditingAnswerIndex] = useState<number | null>(null);
  const [tempQuestion, setTempQuestion] = useState(question);
  const [tempAnswers, setTempAnswers] = useState(allAnswers);
  
  const questionInputRef = useRef<HTMLTextAreaElement>(null);
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

  // Get dynamic font size based on question length
  const getQuestionFontSize = () => {
    const len = question.length;
    if (len > 100) return 'text-[11px]';
    if (len > 80) return 'text-xs';
    if (len > 60) return 'text-[13px]';
    return 'text-sm';
  };

  return (
    <div className="flex flex-col items-center">
      {/* iPhone Frame - taller to show all content */}
      <div className="relative w-[280px] h-[580px] bg-black rounded-[44px] p-2 shadow-2xl">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-b-xl z-10" />
        
        {/* Screen */}
        <div className="w-full h-full bg-gradient-to-b from-[#9B89F5] to-[#7C6AE5] rounded-[38px] overflow-hidden relative flex flex-col">
          {/* Header with avatars and scores */}
          <div className="px-3 pt-8 pb-2 flex items-center justify-between flex-shrink-0">
            {/* Player 1 */}
            <div className="flex items-center gap-1.5">
              <div className="w-8 h-8 rounded-full bg-[#5B4BC4] flex items-center justify-center border-2 border-white/30">
                <span className="text-sm">😊</span>
              </div>
              <div className="flex items-center gap-0.5 bg-white/15 px-1.5 py-0.5 rounded-full">
                <Crown className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                <span className="text-white font-bold text-[10px]">0</span>
              </div>
            </div>
            
            <span className="text-white/60 text-[10px] font-medium">vs</span>
            
            {/* Player 2 */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-0.5 bg-white/15 px-1.5 py-0.5 rounded-full">
                <Crown className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                <span className="text-white font-bold text-[10px]">0</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#5B4BC4] flex items-center justify-center border-2 border-white/30">
                <span className="text-sm">🤖</span>
              </div>
              <Zap className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            </div>
          </div>

          {/* Question Card with icon on top */}
          <div className="mx-3 mt-6 relative flex-shrink-0">
            {/* Large icon positioned above card */}
            <button
              onClick={isEditable ? onIconClick : undefined}
              className={cn(
                "absolute left-1/2 -translate-x-1/2 -top-8 z-10 w-16 h-16 rounded-full bg-white flex items-center justify-center border-4 border-[#9B89F5] shadow-lg",
                isEditable && "cursor-pointer hover:scale-105 transition-transform group"
              )}
              disabled={!isEditable}
            >
              {iconSlug ? (
                <DynamicIcon slug={iconSlug.split(',')[0]} size={44} />
              ) : (
                <ImagePlus className="w-6 h-6 text-muted-foreground" />
              )}
              {isEditable && (
                <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Pencil className="w-4 h-4 text-white" />
                </div>
              )}
            </button>

            <div className="bg-[#5B4BC4]/90 backdrop-blur-sm rounded-2xl pt-10 pb-4 px-4 shadow-lg border border-white/10">
              {/* Timer bar */}
              <div className="h-1.5 bg-white/20 rounded-full overflow-hidden mb-3">
                <div className="h-full bg-gradient-to-r from-green-400 to-green-300 rounded-full w-3/4" />
              </div>

              {/* Top row: Question number + Difficulty */}
              <div className="flex items-center justify-between mb-2">
                <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                  <span className="text-[#5B4BC4] font-bold text-[10px]">{questionNumber}</span>
                </div>
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "text-[9px] px-1.5 py-0",
                    difficulty === 'easy' && "bg-green-500/80 text-white",
                    difficulty === 'medium' && "bg-yellow-500/80 text-white",
                    difficulty === 'hard' && "bg-red-500/80 text-white"
                  )}
                >
                  {DIFFICULTY_LABELS[difficulty]}
                </Badge>
              </div>

              {/* Icon keyword badge */}
              {iconKeyword && (
                <div className="flex justify-center mb-2">
                  <Badge variant="outline" className="text-[9px] bg-white/10 text-white/80 border-white/20 py-0">
                    🏷️ {iconKeyword}
                  </Badge>
                </div>
              )}

              {/* Question text */}
              {editingQuestion && isEditable ? (
                <div className="relative">
                  <textarea
                    ref={questionInputRef}
                    value={tempQuestion}
                    onChange={(e) => setTempQuestion(e.target.value)}
                    onBlur={handleQuestionSave}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleQuestionSave();
                      }
                      if (e.key === 'Escape') {
                        setTempQuestion(question);
                        setEditingQuestion(false);
                      }
                    }}
                    className={cn(
                      "w-full bg-white/10 text-white text-xs font-bold text-center rounded-lg px-2 py-1.5 outline-none border-2 resize-none",
                      tempQuestion.length > QUESTION_MAX_LENGTH ? "border-red-400" : "border-white/30"
                    )}
                    rows={3}
                  />
                  <span className={cn(
                    "absolute -bottom-4 right-0 text-[8px]",
                    tempQuestion.length > QUESTION_MAX_LENGTH ? "text-red-300" : "text-white/50"
                  )}>
                    {tempQuestion.length}/{QUESTION_MAX_LENGTH}
                  </span>
                </div>
              ) : (
                <p 
                  onClick={() => isEditable && setEditingQuestion(true)}
                  className={cn(
                    getQuestionFontSize(),
                    "text-white font-bold text-center leading-snug min-h-[36px] flex items-center justify-center",
                    isEditable && "cursor-text hover:bg-white/5 rounded-lg px-1 py-0.5 transition-colors"
                  )}
                >
                  {question || 'კითხვა აქ გამოჩნდება...'}
                </p>
              )}
            </div>
          </div>

          {/* Answer buttons */}
          <div className="flex-1 flex flex-col gap-2 px-3 mt-3 pb-2 overflow-y-auto">
            {tempAnswers.map((answer, index) => {
              const isCorrect = index === 0;
              const isEditing = editingAnswerIndex === index;
              
              return (
                <div
                  key={index}
                  className={cn(
                    "flex items-center gap-2 p-2.5 rounded-xl text-left relative transition-all flex-shrink-0",
                    isCorrect 
                      ? "bg-green-500 shadow-[0_2px_0_0_#16A34A]" 
                      : "bg-white shadow-[0_2px_0_0_#CBD5E1]"
                  )}
                >
                  <span className={cn(
                    "w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0",
                    isCorrect ? "bg-white text-green-500" : "bg-[#7DD3FC] text-white"
                  )}>
                    {isCorrect ? <Check className="w-3 h-3" /> : letters[index]}
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
                    </div>
                  ) : (
                    <span 
                      onClick={() => isEditable && setEditingAnswerIndex(index)}
                      className={cn(
                        "flex-1 font-bold text-xs",
                        isCorrect ? "text-white" : "text-[#2A2550]",
                        isEditable && "cursor-text hover:opacity-80",
                        answer.length > ANSWER_MAX_LENGTH && "text-red-500"
                      )}
                    >
                      {answer || `პასუხი ${letters[index]}`}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Power-ups row - at bottom */}
          <div className="px-3 py-2 flex justify-center gap-1.5 flex-shrink-0">
            {['50:50', '❄️', '🔄', '⏱️'].map((item, i) => (
              <div key={i} className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/10">
                <span className="text-[10px] font-bold text-white">{item}</span>
              </div>
            ))}
          </div>

          {/* Home indicator */}
          <div className="pb-2 flex justify-center flex-shrink-0">
            <div className="w-24 h-1 bg-white/30 rounded-full" />
          </div>
        </div>
      </div>
      
      {/* Footer text */}
      <p className="text-xs text-muted-foreground mt-3 text-center">
        {isEditable ? (
          <span className="flex items-center gap-2 justify-center">
            <Pencil className="w-3 h-3" />
            დააკლიკე რედაქტირებისთვის
          </span>
        ) : (
          'თამაშში ჩვენება'
        )}
      </p>
    </div>
  );
}
