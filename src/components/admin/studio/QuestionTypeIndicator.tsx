import { cn } from '@/lib/utils';
import { FileText, Image, Video, Headphones } from 'lucide-react';
import { QuestionType } from '@/hooks/useQuestionStudio';

interface QuestionTypeIndicatorProps {
  type: QuestionType;
  className?: string;
  showLabel?: boolean;
}

const typeConfig: Record<QuestionType, { icon: React.ElementType; label: string; color: string; bg: string }> = {
  text: { icon: FileText, label: 'Text', color: 'text-slate-600', bg: 'bg-slate-100' },
  image: { icon: Image, label: 'Image', color: 'text-blue-600', bg: 'bg-blue-100' },
  video: { icon: Video, label: 'Video', color: 'text-red-600', bg: 'bg-red-100' },
  audio: { icon: Headphones, label: 'Audio', color: 'text-purple-600', bg: 'bg-purple-100' },
};

export function QuestionTypeIndicator({ type, className, showLabel = false }: QuestionTypeIndicatorProps) {
  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <div 
      className={cn(
        "flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-medium",
        config.bg,
        config.color,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {showLabel && <span>{config.label}</span>}
    </div>
  );
}
