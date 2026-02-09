import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronLeft, ChevronRight, Edit, Copy, Trash2, Rocket, Library } from 'lucide-react';
import { StudioQuestion, getQuestionType, ProductionStatus } from '@/hooks/useQuestionStudio';
import { QuizQuestionCard } from '@/components/ui/quiz-question-card';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { QuestionTypeIndicator } from './QuestionTypeIndicator';

interface QuestionPreviewPanelProps {
  question: StudioQuestion | null;
  questionIndex: number;
  totalQuestions: number;
  productionStatus: ProductionStatus;
  onPrevious: () => void;
  onNext: () => void;
  onEdit: (question: StudioQuestion) => void;
  onDuplicate: (question: StudioQuestion) => void;
  onDelete: (question: StudioQuestion) => void;
  onToggleProduction: (question: StudioQuestion) => void;
}

export function QuestionPreviewPanel({
  question,
  questionIndex,
  totalQuestions,
  productionStatus,
  onPrevious,
  onNext,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleProduction,
}: QuestionPreviewPanelProps) {
  if (!question) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <p>აირჩიეთ კითხვა გადახედვისთვის</p>
      </div>
    );
  }

  const type = getQuestionType(question);
  const allAnswers = [question.correct_answer, ...question.incorrect_answers];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <QuestionTypeIndicator type={type} showLabel />
          <Badge variant={productionStatus === 'production' ? 'default' : 'secondary'}>
            {productionStatus === 'production' ? 'Production' : 'Library'}
          </Badge>
        </div>
        <span className="text-sm text-muted-foreground">
          {questionIndex + 1} / {totalQuestions}
        </span>
      </div>

      {/* Preview Content */}
      <ScrollArea className="flex-1 p-4">
        <div className="flex flex-col items-center">
          {/* iPhone Frame */}
          <div className="relative w-[320px] bg-black rounded-[50px] p-3 shadow-2xl">
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-7 bg-black rounded-b-3xl z-10" />
            
            {/* Screen */}
            <div 
              className="w-full rounded-[40px] overflow-hidden"
              style={{
                background: 'linear-gradient(180deg, #7C6AE5 0%, #9B89F5 100%)',
              }}
            >
              {/* Status bar placeholder */}
              <div className="h-10" />
              
              {/* Game content */}
              <div className="px-4 pb-6 space-y-4">
                {/* Question Card */}
                <QuizQuestionCard
                  questionText={question.question_text}
                  imageUrl={question.image_url}
                  videoUrl={question.video_url}
                  audioUrl={question.audio_url}
                  progressPercent={75}
                  difficultyLabel={
                    question.difficulty === 'easy' ? 'მარტივი' :
                    question.difficulty === 'medium' ? 'საშუალო' : 'რთული'
                  }
                  difficultyColor={
                    question.difficulty === 'easy' ? 'bg-green-500' :
                    question.difficulty === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                  }
                  timerSeconds={15}
                  reserveTopSpace={!question.image_url && !question.video_url && !question.audio_url}
                  hideQuestionText={!!question.image_url}
                />

                {/* Answer Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  {allAnswers.slice(0, 4).map((answer, i) => (
                    <button
                      key={i}
                      className={cn(
                        "py-3 px-2 rounded-xl text-sm font-medium text-center transition-colors",
                        i === 0 
                          ? "bg-green-500 text-white ring-2 ring-green-300" 
                          : "bg-white/90 text-gray-800"
                      )}
                      style={{
                        boxShadow: '0 4px 0 rgba(0,0,0,0.1)',
                      }}
                    >
                      <span className="line-clamp-2">{answer}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Question Details */}
          <div className="w-full max-w-[320px] mt-6 space-y-3">
            <div className="text-sm">
              <span className="text-muted-foreground">სწორი პასუხი: </span>
              <span className="font-medium text-green-600">{question.correct_answer}</span>
            </div>
            
            <div className="text-sm">
              <span className="text-muted-foreground">არასწორი პასუხები: </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {question.incorrect_answers.map((ans, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {ans}
                  </Badge>
                ))}
              </div>
            </div>

            {question.icon_slug && (
              <div className="text-sm">
                <span className="text-muted-foreground">აიკონი: </span>
                <span className="font-medium">{question.icon_slug}</span>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Navigation and Actions */}
      <div className="p-3 border-t border-border space-y-2">
        {/* Navigation */}
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onPrevious}
            disabled={questionIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
            წინა
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onNext}
            disabled={questionIndex >= totalQuestions - 1}
          >
            შემდეგი
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center justify-center gap-2">
          <Button size="sm" variant="outline" onClick={() => onEdit(question)}>
            <Edit className="h-3.5 w-3.5 mr-1" />
            რედაქტირება
          </Button>
          <Button size="sm" variant="outline" onClick={() => onDuplicate(question)}>
            <Copy className="h-3.5 w-3.5 mr-1" />
            დუბლირება
          </Button>
          <Button
            size="sm"
            variant={productionStatus === 'library' ? 'default' : 'outline'}
            onClick={() => onToggleProduction(question)}
          >
            {productionStatus === 'library' ? (
              <>
                <Rocket className="h-3.5 w-3.5 mr-1" />
                Push
              </>
            ) : (
              <>
                <Library className="h-3.5 w-3.5 mr-1" />
                Library
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => onDelete(question)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
