import { cn } from '@/lib/utils';
import { Crown, Zap, Check } from 'lucide-react';
import { DynamicIcon } from '@/components/shared/DynamicIcon';

interface QuestionMockupPreviewProps {
  question: string;
  correctAnswer: string;
  incorrectAnswers: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  iconSlug?: string;
}

export function QuestionMockupPreview({
  question,
  correctAnswer,
  incorrectAnswers,
  iconSlug,
}: QuestionMockupPreviewProps) {
  const allAnswers = [correctAnswer, ...incorrectAnswers].slice(0, 4);
  const letters = ['A', 'B', 'C', 'D'];

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

            {/* Icon display */}
            {iconSlug && (
              <div className="flex justify-center mb-2">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                  <DynamicIcon slug={iconSlug.split(',')[0]} size={28} />
                </div>
              </div>
            )}

            {/* Question text */}
            <p className="text-white text-sm font-bold italic text-center leading-snug min-h-[40px]">
              {question || 'კითხვა აქ გამოჩნდება...'}
            </p>
          </div>

          {/* Answer buttons */}
          <div className="flex-1 flex flex-col gap-2 px-3 mt-3">
            {allAnswers.map((answer, index) => {
              const isCorrect = answer === correctAnswer;
              return (
                <div
                  key={index}
                  className={cn(
                    "flex items-center gap-2 p-2.5 rounded-xl text-left",
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
                  <span className={cn(
                    "flex-1 font-bold text-xs truncate",
                    isCorrect ? "text-white" : "text-[#2A2550]"
                  )}>
                    {answer || `პასუხი ${letters[index]}`}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Home indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-24 h-1 bg-white/30 rounded-full" />
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-2">თამაშში ჩვენება</p>
    </div>
  );
}
