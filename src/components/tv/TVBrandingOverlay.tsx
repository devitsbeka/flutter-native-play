import React from 'react';
import { useTVGame } from '@/contexts/TVGameContext';

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

  return (
    <>
      {/* Logo - Top Left (hidden when compact) */}
      {showLogo && !compact && (
        <div className="absolute top-4 left-4 z-20">
          <div className="flex items-center gap-2">
            <span 
              className="text-2xl font-slackey text-white"
              style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}
            >
              MyTrivia
            </span>
            <span className="px-2 py-1 rounded-md text-xs font-bold text-white bg-red-500 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              LIVE
            </span>
          </div>
        </div>
      )}

      {/* Join Code - Top Right or Bottom Right when compact */}
      {showCode && code && (
        <div className={`absolute z-20 ${compact ? 'bottom-4 right-4' : 'top-4 right-4'}`}>
          <div className={`bg-black/40 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/20 flex items-center gap-2 ${compact ? 'text-sm' : ''}`}>
            <span className="text-white/60 text-xs">კოდი:</span>
            <span className="text-white font-bold text-lg tracking-wider">{code}</span>
          </div>
        </div>
      )}
    </>
  );
};
