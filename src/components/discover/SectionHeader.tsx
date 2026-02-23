import { ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  onSeeAll?: () => void;
}

export function SectionHeader({ title, subtitle, onSeeAll }: SectionHeaderProps) {
  const { t } = useLanguage();
  return (
    <div className="flex items-start justify-between mb-3" style={{ paddingLeft: 20, paddingRight: 20 }}>
      <div className="flex-1">
        <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
        {subtitle && (
          <p className="text-sm mt-0.5 text-slate-600">{subtitle}</p>
        )}
      </div>
      {onSeeAll && (
        <button
          onClick={onSeeAll}
          className="flex items-center gap-0.5 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
        >
          <span className="underline">{t("extra.seeAll")}</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
