import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { LeagueInfo, LEAGUES } from "@/hooks/useLeagueLeaderboard";

interface LeagueHeroHeaderProps {
  league: LeagueInfo;
  onPrevTier?: () => void;
  onNextTier?: () => void;
  userTier?: number;
}

export function LeagueHeroHeader({ league, onPrevTier, onNextTier, userTier = 1 }: LeagueHeroHeaderProps) {
  const { t, language, currentLanguage } = useLanguage();
  
  // Use language-aware league name
  const leagueName = language === 'ka' ? league.nameKa : league.name;
  
  // Championship title based on region
  const championshipTitle = language === 'ka' 
    ? 'საქართველოს ჩემპიონატი' 
    : 'Georgian Championship';

  const canGoPrev = league.tier > 1;
  const canGoNext = league.tier < LEAGUES.length && league.tier < userTier;
  
  return (
    <div className="pt-6 pb-4 px-4">
      {/* Country flag and championship title */}
      <motion.div
        className="text-center mb-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center justify-center gap-2 mb-1">
          <span className="text-2xl">{currentLanguage.flag}</span>
          <h1 className="text-lg font-bold text-foreground/90 uppercase tracking-wider">
            {championshipTitle}
          </h1>
        </div>
      </motion.div>
      
      {/* League name with arrows */}
      <motion.div
        className="flex items-center justify-center gap-4"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
      >
        {/* Left arrow */}
        <motion.button
          onClick={onPrevTier}
          disabled={!canGoPrev}
          className={`p-1 rounded-full transition-opacity ${canGoPrev ? 'opacity-70 hover:opacity-100' : 'opacity-20 cursor-not-allowed'}`}
          whileTap={canGoPrev ? { scale: 0.9 } : {}}
        >
          <ChevronLeft className="w-6 h-6 text-foreground" strokeWidth={1.5} />
        </motion.button>

        <motion.h2 
          key={league.tier}
          className="text-2xl font-extrabold text-foreground drop-shadow-lg min-w-[200px] text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          {leagueName}
        </motion.h2>

        {/* Right arrow */}
        <motion.button
          onClick={onNextTier}
          disabled={!canGoNext}
          className={`p-1 rounded-full transition-opacity ${canGoNext ? 'opacity-70 hover:opacity-100' : 'opacity-20 cursor-not-allowed'}`}
          whileTap={canGoNext ? { scale: 0.9 } : {}}
        >
          <ChevronRight className="w-6 h-6 text-foreground" strokeWidth={1.5} />
        </motion.button>
      </motion.div>
    </div>
  );
}
