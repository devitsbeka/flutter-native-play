import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Check, X, Folder } from 'lucide-react';
import { QuestionIconPicker } from '@/components/social/QuestionIconPicker';
import { cn } from '@/lib/utils';

interface IconReviewCardProps {
  question: {
    id: string;
    question_text: string;
    correct_answer: string;
    incorrect_answers: string[];
    icon_slug: string | null;
    category_name: string;
  };
  onIconChange: (slug: string | null) => void;
  position: 'prev' | 'current' | 'next';
  style?: React.CSSProperties;
}

const ICON_BASE_URL = 'https://sqwpzezkhpqkdyltvsim.supabase.co/storage/v1/object/public/icon-library/';

export function IconReviewCard({ question, onIconChange, position, style }: IconReviewCardProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const iconUrl = question.icon_slug 
    ? `${ICON_BASE_URL}${question.icon_slug}.png`
    : null;

  const handleIconSelect = (slug: string | null) => {
    if (slug) {
      onIconChange(slug);
    }
    setPickerOpen(false);
  };

  return (
    <>
      <motion.div
        className={cn(
          "absolute inset-x-4 rounded-3xl bg-card border border-border shadow-xl overflow-hidden",
          position === 'current' && "z-20",
          position === 'prev' && "z-10",
          position === 'next' && "z-10"
        )}
        style={{
          top: '80px',
          bottom: '100px',
          ...style
        }}
      >
        <div className="h-full flex flex-col p-6 overflow-auto">
          {/* Icon Area - Tappable */}
          <div className="flex justify-center mb-6">
            <button
              onClick={() => position === 'current' && setPickerOpen(true)}
              className={cn(
                "w-24 h-24 rounded-2xl flex items-center justify-center transition-all",
                "border-2 border-dashed",
                question.icon_slug 
                  ? "border-primary/30 bg-primary/5 hover:bg-primary/10" 
                  : "border-muted-foreground/30 bg-muted/50 hover:bg-muted",
                position !== 'current' && "pointer-events-none opacity-70"
              )}
            >
              {iconUrl ? (
                <img 
                  src={iconUrl} 
                  alt="Question icon" 
                  className="w-16 h-16 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <Plus className="w-10 h-10 text-muted-foreground" />
              )}
            </button>
          </div>

          {/* Question Text */}
          <h2 className="text-xl font-semibold text-center text-foreground mb-6 leading-relaxed">
            {question.question_text}
          </h2>

          {/* Answers */}
          <div className="flex-1 space-y-3">
            {/* Correct Answer */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/30">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <Check className="w-5 h-5 text-green-500" />
              </div>
              <span className="text-foreground font-medium">{question.correct_answer}</span>
            </div>

            {/* Incorrect Answers */}
            {question.incorrect_answers.map((answer, index) => (
              <div 
                key={index}
                className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border"
              >
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <X className="w-5 h-5 text-muted-foreground" />
                </div>
                <span className="text-muted-foreground">{answer}</span>
              </div>
            ))}
          </div>

          {/* Category Badge */}
          <div className="mt-6 flex justify-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 text-muted-foreground text-sm">
              <Folder className="w-4 h-4" />
              <span>{question.category_name}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Icon Picker - Full Screen */}
      {pickerOpen && (
        <QuestionIconPicker
          selectedSlug={question.icon_slug}
          onSelect={handleIconSelect}
          questionText={question.question_text}
          correctAnswer={question.correct_answer}
          incorrectAnswers={question.incorrect_answers}
        />
      )}
    </>
  );
}
