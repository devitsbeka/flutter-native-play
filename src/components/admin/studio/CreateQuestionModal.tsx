import { useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { QuestionTypeSelector } from './QuestionTypeSelector';
import { MediaPreview } from './MediaPreview';
import { QuestionType, CategoryWithCounts } from '@/hooks/useQuestionStudio';
import { QuestionIconPicker } from '@/components/social/QuestionIconPicker';

interface CreateQuestionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryWithCounts[];
  onSubmit: (question: NewQuestionData) => Promise<boolean>;
}

export interface NewQuestionData {
  category_id: string;
  question_text: string;
  correct_answer: string;
  incorrect_answers: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  image_url?: string;
  video_url?: string;
  audio_url?: string;
  icon_slug?: string;
}

export function CreateQuestionModal({
  open,
  onOpenChange,
  categories,
  onSubmit,
}: CreateQuestionModalProps) {
  const [step, setStep] = useState<'type' | 'form'>('type');
  const [selectedType, setSelectedType] = useState<QuestionType | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    category_id: '',
    question_text: '',
    correct_answer: '',
    incorrect_answers: ['', '', ''],
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    media_url: '',
    icon_slug: '',
  });

  const resetForm = () => {
    setStep('type');
    setSelectedType(null);
    setForm({
      category_id: '',
      question_text: '',
      correct_answer: '',
      incorrect_answers: ['', '', ''],
      difficulty: 'medium',
      media_url: '',
      icon_slug: '',
    });
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(resetForm, 200);
  };

  const handleTypeSelect = (type: QuestionType) => {
    setSelectedType(type);
    setStep('form');
  };

  const handleSubmit = async () => {
    if (!selectedType || !form.category_id || !form.question_text || !form.correct_answer) {
      return;
    }

    // Validate media URL for non-text types
    if (selectedType !== 'text' && !form.media_url) {
      return;
    }

    // Validate at least one incorrect answer
    const validIncorrect = form.incorrect_answers.filter(a => a.trim());
    if (validIncorrect.length === 0) {
      return;
    }

    setSubmitting(true);
    try {
      const questionData: NewQuestionData = {
        category_id: form.category_id,
        question_text: form.question_text,
        correct_answer: form.correct_answer,
        incorrect_answers: validIncorrect,
        difficulty: form.difficulty,
      };

      // Add icon slug if selected
      if (form.icon_slug) {
        questionData.icon_slug = form.icon_slug;
      }

      // Add media URL based on type
      if (selectedType === 'image') {
        questionData.image_url = form.media_url;
      } else if (selectedType === 'video') {
        questionData.video_url = form.media_url;
      } else if (selectedType === 'audio') {
        questionData.audio_url = form.media_url;
      }

      const success = await onSubmit(questionData);
      if (success) {
        handleClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isFormValid =
    form.category_id &&
    form.question_text.trim() &&
    form.correct_answer.trim() &&
    form.incorrect_answers.some(a => a.trim()) &&
    (selectedType === 'text' || form.media_url.trim());

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'form' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setStep('type')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {step === 'type' ? 'კითხვის ტიპის არჩევა' : 'ახალი კითხვა'}
          </DialogTitle>
        </DialogHeader>

        {step === 'type' && (
          <div className="py-4">
            <QuestionTypeSelector
              selectedType={selectedType}
              onSelect={handleTypeSelect}
            />
          </div>
        )}

        {step === 'form' && selectedType && (
          <div className="space-y-4 py-4">
            {/* Category */}
            <div className="space-y-2">
              <Label>კატეგორია *</Label>
              <Select
                value={form.category_id}
                onValueChange={(v) => setForm(f => ({ ...f, category_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="აირჩიეთ კატეგორია" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Icon Picker */}
            <div className="flex justify-center">
              <QuestionIconPicker
                selectedSlug={form.icon_slug || null}
                onSelect={(slug) => setForm(f => ({ ...f, icon_slug: slug || '' }))}
                large
                creatorMode
              />
            </div>

            {/* Media URL (for non-text types) */}
            {selectedType !== 'text' && (
              <div className="space-y-2">
                <Label>
                  {selectedType === 'image' && 'სურათის URL *'}
                  {selectedType === 'video' && 'ვიდეოს URL * (YouTube ან პირდაპირი)'}
                  {selectedType === 'audio' && 'აუდიოს URL *'}
                </Label>
                <Input
                  value={form.media_url}
                  onChange={(e) => setForm(f => ({ ...f, media_url: e.target.value }))}
                  placeholder="https://..."
                />
                {form.media_url && (
                  <MediaPreview
                    type={selectedType}
                    url={form.media_url}
                    className="h-40 mt-2"
                  />
                )}
              </div>
            )}

            {/* Question Text */}
            <div className="space-y-2">
              <Label>კითხვა *</Label>
              <Textarea
                value={form.question_text}
                onChange={(e) => setForm(f => ({ ...f, question_text: e.target.value }))}
                rows={selectedType === 'text' ? 3 : 2}
                placeholder={selectedType === 'text' ? 'კითხვის ტექსტი...' : 'მოკლე კითხვა (2-3 სიტყვა)...'}
              />
            </div>

            {/* Correct Answer */}
            <div className="space-y-2">
              <Label>სწორი პასუხი *</Label>
              <Input
                value={form.correct_answer}
                onChange={(e) => setForm(f => ({ ...f, correct_answer: e.target.value }))}
                placeholder="სწორი პასუხი"
              />
            </div>

            {/* Incorrect Answers */}
            <div className="space-y-2">
              <Label>არასწორი პასუხები *</Label>
              {form.incorrect_answers.map((ans, i) => (
                <Input
                  key={i}
                  value={ans}
                  onChange={(e) => {
                    const newAnswers = [...form.incorrect_answers];
                    newAnswers[i] = e.target.value;
                    setForm(f => ({ ...f, incorrect_answers: newAnswers }));
                  }}
                  placeholder={`პასუხი ${i + 1}`}
                />
              ))}
            </div>

            {/* Difficulty */}
            <div className="space-y-2">
              <Label>სირთულე *</Label>
              <Select
                value={form.difficulty}
                onValueChange={(v) => setForm(f => ({ ...f, difficulty: v as 'easy' | 'medium' | 'hard' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">მარტივი</SelectItem>
                  <SelectItem value="medium">საშუალო</SelectItem>
                  <SelectItem value="hard">რთული</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleClose}>
                გაუქმება
              </Button>
              <Button onClick={handleSubmit} disabled={!isFormValid || submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                შექმნა
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
