import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Crown, Zap, Check, Pencil, ImagePlus } from 'lucide-react';
import { DynamicIcon } from '@/components/shared/DynamicIcon';
import { Badge } from '@/components/ui/badge';

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

const QUESTION_MAX_LENGTH = 110;
const ANSWER_MAX_LENGTH = 25;

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
      {/* iPhone Frame */}
      <div className="relative w-[300px] h-[600px] bg-black rounded-[44px] p-2.5 shadow-2xl">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-b-2xl z-10" />
        
        {/* Screen */}
        <div className="w-full h-full bg-gradient-to-b from-[#9B89F5] to-[#7C6AE5] rounded-[36px] overflow-hidden relative">
          {/* Header with avatars and scores */}
          <div className="px-4 pt-10 pb-3 flex items-center justify-between">
            {/* Player 1 */}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-[#5B4BC4] flex items-center justify-center border-2 border-white/30 shadow-lg">
                <span className="text-lg">😊</span>
              </div>
              <div className="flex items-center gap-1 bg-white/15 px-2 py-1 rounded-full backdrop-blur-sm">
                <Crown className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                <span className="text-white font-bold text-xs">0</span>
              </div>
            </div>
            
            <span className="text-white/60 text-xs font-medium">vs</span>
            
            {/* Player 2 */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-white/15 px-2 py-1 rounded-full backdrop-blur-sm">
                <Crown className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                <span className="text-white font-bold text-xs">0</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-[#5B4BC4] flex items-center justify-center border-2 border-white/30 shadow-lg">
                <span className="text-lg">🤖</span>
              </div>
              <Zap className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            </div>
          </div>

          {/* Power-ups row */}
          <div className="px-4 py-2 flex justify-center gap-2">
            {['50:50', '❄️', '🔄', '⏱️'].map((item, i) => (
              <div key={i} className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/10">
                <span className="text-sm font-bold text-white">{item}</span>
              </div>
            ))}
          </div>

          {/* Question Card */}
          <div className="mx-3 mt-3 bg-[#5B4BC4]/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-white/10">
            {/* Timer bar */}
            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden mb-3">
              <div className="h-full bg-gradient-to-r from-green-400 to-green-300 rounded-full w-3/4 transition-all" />
            </div>

            {/* Top row: Question number, Icon, Difficulty */}
            <div className="flex items-center justify-between mb-3">
              {/* Question number */}
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center">
                  <span className="text-[#5B4BC4] font-bold text-xs">{questionNumber}</span>
                </div>
              </div>
              
              {/* Icon - clickable */}
              <button
                onClick={isEditable ? onIconClick : undefined}
                className={cn(
                  "w-12 h-12 rounded-full bg-white/15 flex items-center justify-center relative group border border-white/20",
                  isEditable && "cursor-pointer hover:bg-white/25 transition-colors"
                )}
                disabled={!isEditable}
              >
                {iconSlug ? (
                  <DynamicIcon slug={iconSlug.split(',')[0]} size={36} />
                ) : (
                  <ImagePlus className="w-5 h-5 text-white/50" />
                )}
                {isEditable && (
                  <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Pencil className="w-4 h-4 text-white" />
                  </div>
                )}
              </button>

              {/* Difficulty badge */}
              <Badge 
                variant="secondary" 
                className={cn(
                  "text-[10px] px-2 py-0.5",
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
                <Badge variant="outline" className="text-[10px] bg-white/10 text-white/80 border-white/20">
                  🏷️ {iconKeyword}
                </Badge>
              </div>
            )}

            {/* Question text - editable */}
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
                    "w-full bg-white/10 text-white text-sm font-bold text-center rounded-lg px-3 py-2 outline-none border-2 resize-none",
                    tempQuestion.length > QUESTION_MAX_LENGTH 
                      ? "border-red-400" 
                      : "border-white/30"
                  )}
                  rows={3}
                />
                <span className={cn(
                  "absolute -bottom-5 right-0 text-[10px]",
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
                  "text-white font-bold text-center leading-snug min-h-[48px] flex items-center justify-center",
                  isEditable && "cursor-text hover:bg-white/5 rounded-lg px-2 py-1 transition-colors"
                )}
              >
                {question || 'კითხვა აქ გამოჩნდება...'}
              </p>
            )}
          </div>

          {/* Answer buttons */}
          <div className="flex-1 flex flex-col gap-2.5 px-3 mt-4">
            {tempAnswers.map((answer, index) => {
              const isCorrect = index === 0;
              const isEditing = editingAnswerIndex === index;
              
              return (
                <div
                  key={index}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl text-left relative transition-all",
                    isCorrect 
                      ? "bg-green-500 shadow-[0_3px_0_0_#16A34A]" 
                      : "bg-white shadow-[0_3px_0_0_#CBD5E1]"
                  )}
                >
                  <span className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0",
                    isCorrect ? "bg-white text-green-500" : "bg-[#7DD3FC] text-white"
                  )}>
                    {isCorrect ? <Check className="w-4 h-4" /> : letters[index]}
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
                          "w-full bg-transparent font-bold text-sm outline-none border-b-2",
                          isCorrect ? "text-white border-white/50" : "text-[#2A2550] border-[#2A2550]/30",
                          answer.length > ANSWER_MAX_LENGTH && "border-red-500"
                        )}
                        maxLength={ANSWER_MAX_LENGTH + 5}
                      />
                      <span className={cn(
                        "absolute -bottom-4 right-0 text-[9px]",
                        answer.length > ANSWER_MAX_LENGTH ? "text-red-500" : "text-current opacity-50"
                      )}>
                        {answer.length}/{ANSWER_MAX_LENGTH}
                      </span>
                    </div>
                  ) : (
                    <span 
                      onClick={() => isEditable && setEditingAnswerIndex(index)}
                      className={cn(
                        "flex-1 font-bold text-sm",
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

          {/* Home indicator */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-28 h-1 bg-white/30 rounded-full" />
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
