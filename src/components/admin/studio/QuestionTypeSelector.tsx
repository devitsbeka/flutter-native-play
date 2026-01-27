import { FileText, Image, Video, Volume2, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QuestionType } from '@/hooks/useQuestionStudio';

interface TypeOption {
  type: QuestionType;
  label: string;
  icon: LucideIcon;
  description: string;
}

const typeOptions: TypeOption[] = [
  { type: 'text', label: 'ტექსტი', icon: FileText, description: 'მხოლოდ ტექსტური კითხვა' },
  { type: 'image', label: 'სურათი', icon: Image, description: 'სურათიანი კითხვა' },
  { type: 'video', label: 'ვიდეო', icon: Video, description: 'ვიდეო კლიპით' },
  { type: 'audio', label: 'აუდიო', icon: Volume2, description: 'აუდიო ფაილით' },
];

interface QuestionTypeSelectorProps {
  selectedType: QuestionType | null;
  onSelect: (type: QuestionType) => void;
}

export function QuestionTypeSelector({ selectedType, onSelect }: QuestionTypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {typeOptions.map(({ type, label, icon: Icon, description }) => (
        <button
          key={type}
          onClick={() => onSelect(type)}
          className={cn(
            'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
            'hover:border-primary/50 hover:bg-primary/5',
            selectedType === type
              ? 'border-primary bg-primary/10 shadow-md'
              : 'border-border bg-card'
          )}
        >
          <div
            className={cn(
              'p-3 rounded-full',
              selectedType === type ? 'bg-primary text-primary-foreground' : 'bg-muted'
            )}
          >
            <Icon className="h-6 w-6" />
          </div>
          <span className="font-medium">{label}</span>
          <span className="text-xs text-muted-foreground text-center">{description}</span>
        </button>
      ))}
    </div>
  );
}
