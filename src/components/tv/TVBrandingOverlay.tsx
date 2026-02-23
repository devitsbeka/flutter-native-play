import React from 'react';
import { useTVGame } from '@/contexts/TVGameContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { MyTriviaLiveLogo } from '@/components/shared/MyTriviaLiveLogo';

interface TVBrandingOverlayProps {
  showLogo?: boolean;
  showCode?: boolean;
  compact?: boolean;
}

export const TVBrandingOverlay: React.FC<TVBrandingOverlayProps> = ({
  showLogo = true,
  showCode = true,
  compact = false,
}) => {
  const { code } = useTVGame();
  const { t } = useLanguage();

  return (
    <>
      {/* Logo - Top Left (hidden when compact) */}
      {showLogo && !compact && (
        <div className="absolute top-4 left-4 z-20">
          <MyTriviaLiveLogo 
            size="sm" 
            textColor="light"
          />
        </div>
      )}

      {/* Join Code - Top Right or Bottom Right when compact */}
      {showCode && code && (
        <div className={`absolute z-20 ${compact ? 'bottom-4 right-4' : 'top-4 right-4'}`}>
          <div className={`bg-black/40 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/20 flex items-center gap-2 ${compact ? 'text-sm' : ''}`}>
            <span className="text-white/60 text-xs">{t("extra.tvCodeLabel")}</span>
            <span className="text-white font-bold text-lg tracking-wider">{code}</span>
          </div>
        </div>
      )}
    </>
  );
};
