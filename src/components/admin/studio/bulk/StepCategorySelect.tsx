import { useState } from 'react';
import { Users, Building2, Flag, Briefcase, Landmark, PawPrint, FileText, Image, Video, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { PRESET_CATEGORIES, PresetCategory } from './PresetCategories';
import { QuestionType } from '@/hooks/useQuestionStudio';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'users': <Users className="h-5 w-5" />,
  'building-2': <Building2 className="h-5 w-5" />,
  'flag': <Flag className="h-5 w-5" />,
  'briefcase': <Briefcase className="h-5 w-5" />,
  'landmark': <Landmark className="h-5 w-5" />,
  'paw-print': <PawPrint className="h-5 w-5" />,
};

const TYPE_OPTIONS: { type: QuestionType; label: string; icon: React.ReactNode }[] = [
  { type: 'text', label: 'ტექსტი', icon: <FileText className="h-5 w-5" /> },
  { type: 'image', label: 'სურათი', icon: <Image className="h-5 w-5" /> },
  { type: 'video', label: 'ვიდეო', icon: <Video className="h-5 w-5" /> },
  { type: 'audio', label: 'აუდიო', icon: <Volume2 className="h-5 w-5" /> },
];

interface StepCategorySelectProps {
  selectedPresets: string[];
  onPresetsChange: (presets: string[]) => void;
  customKeywords: string;
  onCustomKeywordsChange: (keywords: string) => void;
  questionType: QuestionType;
  onQuestionTypeChange: (type: QuestionType) => void;
  onNext: () => void;
}

export function StepCategorySelect({
  selectedPresets,
  onPresetsChange,
  customKeywords,
  onCustomKeywordsChange,
  questionType,
  onQuestionTypeChange,
  onNext,
}: StepCategorySelectProps) {
  const togglePreset = (id: string) => {
    if (selectedPresets.includes(id)) {
      onPresetsChange(selectedPresets.filter(p => p !== id));
    } else {
      onPresetsChange([...selectedPresets, id]);
    }
  };

  const totalKeywords = () => {
    let count = 0;
    selectedPresets.forEach(id => {
      const cat = PRESET_CATEGORIES.find(c => c.id === id);
      if (cat) count += cat.keywords.length;
    });
    if (customKeywords.trim()) {
      count += customKeywords.split(',').filter(k => k.trim()).length;
    }
    return count;
  };

  const canProceed = totalKeywords() > 0;

  return (
    <div className="space-y-6">
      {/* Preset Categories */}
      <div className="space-y-3">
        <Label className="text-base font-medium">აირჩიეთ თემატიკა</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {PRESET_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => togglePreset(cat.id)}
              className={cn(
                "flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left",
                selectedPresets.includes(cat.id)
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50 hover:bg-accent"
              )}
            >
              <div className={cn(
                "p-2 rounded-lg",
                selectedPresets.includes(cat.id) ? "bg-primary/20" : "bg-muted"
              )}>
                {CATEGORY_ICONS[cat.icon] || <FileText className="h-5 w-5" />}
              </div>
              <div>
                <div className="font-medium">{cat.label}</div>
                <div className="text-xs text-muted-foreground">
                  {cat.keywords.length} თემა
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Keywords */}
      <div className="space-y-3">
        <Label className="text-base font-medium">
          ან ჩაწერეთ საკვანძო სიტყვები
          <span className="font-normal text-muted-foreground ml-2">(მძიმით გამოყოფილი)</span>
        </Label>
        <Textarea
          value={customKeywords}
          onChange={(e) => onCustomKeywordsChange(e.target.value)}
          placeholder="Albert Einstein, Elon Musk, Leonardo da Vinci, Bill Gates..."
          rows={3}
          className="resize-none"
        />
        {customKeywords.trim() && (
          <p className="text-sm text-muted-foreground">
            {customKeywords.split(',').filter(k => k.trim()).length} საკვანძო სიტყვა
          </p>
        )}
      </div>

      {/* Question Type */}
      <div className="space-y-3">
        <Label className="text-base font-medium">კითხვის ტიპი</Label>
        <div className="grid grid-cols-4 gap-3">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.type}
              onClick={() => onQuestionTypeChange(opt.type)}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                questionType === opt.type
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50 hover:bg-accent"
              )}
            >
              <div className={cn(
                "p-2 rounded-lg",
                questionType === opt.type ? "bg-primary/20" : "bg-muted"
              )}>
                {opt.icon}
              </div>
              <span className="text-sm font-medium">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Summary & Next */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="text-sm text-muted-foreground">
          სულ: <span className="font-medium text-foreground">{totalKeywords()}</span> თემა
        </div>
        <Button onClick={onNext} disabled={!canProceed}>
          შემდეგი →
        </Button>
      </div>
    </div>
  );
}
