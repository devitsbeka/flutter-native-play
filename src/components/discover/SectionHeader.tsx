import { ChevronRight } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  onSeeAll?: () => void;
}

export function SectionHeader({ title, subtitle, onSeeAll }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-3" style={{ paddingLeft: 20, paddingRight: 20 }}>
      <div className="flex-1">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {subtitle && (
          <p className="text-sm mt-0.5 text-white/80">{subtitle}</p>
        )}
      </div>
      {onSeeAll && (
        <button
          onClick={onSeeAll}
          className="flex items-center gap-0.5 text-sm font-medium text-white hover:text-white/80 transition-colors"
        >
          <span className="underline">ყველა</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
