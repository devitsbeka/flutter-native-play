import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, Rocket, Trash2, Library, Globe, Languages, Loader2 } from 'lucide-react';
import { GeneratedQuestion } from '@/pages/admin/Flow';
import { QuestionMockupPreview } from '@/components/admin/QuestionMockupPreview';
import { FlowIconPicker } from './FlowIconPicker';

interface Props {
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  inLibCount: number;
  inProdCount: number;
  onPublishToLib: () => void;
  onPublishToProd: () => void;
  onClearRejected: () => void;
  onTranslateAll: () => void;
  isTranslating: boolean;
  selectedQuestion?: GeneratedQuestion;
  onUpdateQuestion: (id: string, updates: Partial<GeneratedQuestion>) => void;
}

export function QuestionQueue({
  pendingCount,
  approvedCount,
  rejectedCount,
  inLibCount,
  inProdCount,
  onPublishToLib,
  onPublishToProd,
  onClearRejected,
  onTranslateAll,
  isTranslating,
  selectedQuestion,
  onUpdateQuestion,
}: Props) {
  const [showIconPicker, setShowIconPicker] = useState(false);

  const handleQuestionEdit = (text: string) => {
    if (selectedQuestion) {
      onUpdateQuestion(selectedQuestion.id, { questionText: text });
    }
  };

  const handleAnswerEdit = (correct: string, incorrect: string[]) => {
    if (selectedQuestion) {
      onUpdateQuestion(selectedQuestion.id, { 
        correctAnswer: correct, 
        incorrectAnswers: incorrect 
      });
    }
  };

  const handleIconSelect = (slug: string) => {
    if (selectedQuestion) {
      onUpdateQuestion(selectedQuestion.id, { iconSlug: slug });
    }
    setShowIconPicker(false);
  };

  return (
    <div className="p-4 space-y-4">
        {/* iPhone Mockup Preview */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            📱 Preview
          </h3>
          
          {selectedQuestion ? (
            <div className="flex flex-col items-center">
              {showIconPicker ? (
                <div className="w-full bg-card/50 rounded-lg p-3 border border-border/50">
                  <FlowIconPicker
                    currentIconSlug={selectedQuestion.iconSlug}
                    suggestedSlugs={selectedQuestion.suggestedIconSlugs || []}
                    onSelect={handleIconSelect}
                    isExpanded={true}
                  />
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowIconPicker(false)}
                    className="w-full mt-2"
                  >
                    Close
                  </Button>
                </div>
              ) : (
                <QuestionMockupPreview
                  question={selectedQuestion.questionText}
                  correctAnswer={selectedQuestion.correctAnswer}
                  incorrectAnswers={selectedQuestion.incorrectAnswers}
                  difficulty={selectedQuestion.difficulty as 'easy' | 'medium' | 'hard'}
                  iconSlug={selectedQuestion.iconSlug}
                  isEditable={true}
                  onIconClick={() => setShowIconPicker(true)}
                  onQuestionEdit={handleQuestionEdit}
                  onAnswerEdit={handleAnswerEdit}
                />
              )}
            </div>
          ) : (
            <div className="aspect-[9/16] max-h-[400px] rounded-xl bg-muted/30 border border-border/50 flex items-center justify-center">
              <p className="text-sm text-muted-foreground text-center px-4">
                Select a question to preview
              </p>
            </div>
          )}
        </div>

        <Separator />

        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Publish Queue
        </h3>

        {/* Current Session Stats */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">This Session</p>
          <div className="grid grid-cols-3 gap-2">
            <StatCard label="Pending" value={pendingCount} color="text-amber-500" />
            <StatCard label="Approved" value={approvedCount} color="text-green-500" />
            <StatCard label="Rejected" value={rejectedCount} color="text-destructive" />
          </div>
        </div>

        <Separator />

        {/* Database Stats */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Database</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-lg bg-card/50 border border-border/50">
              <div className="flex items-center gap-2 mb-1">
                <Library className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">In Library</span>
              </div>
              <p className="text-xl font-bold">{inLibCount.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-lg bg-card/50 border border-border/50">
              <div className="flex items-center gap-2 mb-1">
                <Globe className="h-4 w-4 text-green-500" />
                <span className="text-xs text-muted-foreground">In Production</span>
              </div>
              <p className="text-xl font-bold">{inProdCount.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="space-y-2">
          <Button
            onClick={onTranslateAll}
            disabled={approvedCount === 0 || isTranslating}
            variant="outline"
            className="w-full gap-2"
          >
            {isTranslating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Translating...
              </>
            ) : (
              <>
                <Languages className="h-4 w-4" />
                Translate to All Languages
                {approvedCount > 0 && (
                  <span className="ml-auto bg-primary/20 text-primary px-2 py-0.5 rounded-full text-xs">
                    {approvedCount} × 19
                  </span>
                )}
              </>
            )}
          </Button>

          <Button
            onClick={onPublishToLib}
            disabled={approvedCount === 0}
            variant="secondary"
            className="w-full gap-2"
          >
            <Library className="h-4 w-4" />
            Publish to Library
            {approvedCount > 0 && (
              <span className="ml-auto bg-primary/20 text-primary px-2 py-0.5 rounded-full text-xs">
                {approvedCount}
              </span>
            )}
          </Button>

          <Button
            onClick={onPublishToProd}
            disabled={approvedCount === 0}
            className="w-full gap-2"
          >
            <Rocket className="h-4 w-4" />
            Publish to Production
            {approvedCount > 0 && (
              <span className="ml-auto bg-primary-foreground/20 px-2 py-0.5 rounded-full text-xs">
                {approvedCount}
              </span>
            )}
          </Button>

          {rejectedCount > 0 && (
            <Button
              onClick={onClearRejected}
              variant="ghost"
              size="sm"
              className="w-full gap-2 text-muted-foreground"
            >
              <Trash2 className="h-4 w-4" />
              Clear {rejectedCount} Rejected
            </Button>
          )}
        </div>

        {/* Help Text */}
        <div className="p-3 rounded-lg bg-muted/30 text-xs text-muted-foreground space-y-1">
          <p><strong>Translate:</strong> Creates copies in all 20 languages.</p>
          <p><strong>Library:</strong> Questions saved for review, not visible to users.</p>
          <p><strong>Production:</strong> Questions visible to all users in the app.</p>
        </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="p-2 rounded-lg bg-card/50 border border-border/50 text-center">
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
