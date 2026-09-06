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
      <div className="min-w-0 flex-1">
        {/* The same heading the home feed's rails wear (MobileHomeFeed's
            RailHeader): the display face at 26px in the home frame's deep
            aubergine (Figma 1076:2116). Discover was the one browsing
            surface still setting its own — a semibold slate sans — so
            scrolling from home to here changed typeface for no reason a
            reader could name. */}
        {/* 34px of line, matching the home rails. At the frame's 22.5 the
            line box is shorter than the type, and Georgian descenders — the
            tails in "კლასიკური ტრივია" — were sliced along the bottom. */}
        <h2 className="min-w-0 truncate font-display text-[26px] leading-[34px] tracking-[-0.16px] text-[#552d7a]">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-[2px] font-[Nunito] text-[12px] font-medium leading-[15px] tracking-[-0.16px] text-[#6b5b86]">
            {subtitle}
          </p>
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
