import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { LeagueInfo } from "@/hooks/useLeagueLeaderboard";

interface LeagueHeroHeaderProps {
  league: LeagueInfo;
}

export function LeagueHeroHeader({ league }: LeagueHeroHeaderProps) {
  const { language, currentLanguage } = useLanguage();
  
  // Use language-aware league name
  const leagueName = language === 'ka' ? league.nameKa : league.name;
  
  // Championship title based on region
  const championshipTitle = language === 'ka' 
    ? 'საქართველოს ჩემპიონატი' 
    : 'Georgian Championship';
  
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
      
      {/* League name */}
      <motion.div
        className="flex items-center justify-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
      >
        <motion.h2 
          key={league.tier}
          className="text-2xl font-extrabold text-foreground drop-shadow-lg text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          {leagueName}
        </motion.h2>
      </motion.div>
    </div>
  );
}
