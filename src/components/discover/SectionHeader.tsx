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
            RailHeader): font-hero at 19px in the app's aubergine. Discover
            was the one browsing surface still setting its own — a semibold
            slate sans — so scrolling from home to here changed typeface for
            no reason a reader could name.

            font-hero is Slackey with TASolivare behind it. Slackey carries
            no Georgian, so a Georgian title falls through to TASolivare,
            which is the face the home rails already show for these. */}
        <h2 className="font-hero text-[19px] capitalize leading-[22px] tracking-[-0.16px] text-[#402666]">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-[2px] font-[Nunito] text-[12px] font-normal leading-[15px] tracking-[-0.16px] text-[#6b5b86]/85">
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
