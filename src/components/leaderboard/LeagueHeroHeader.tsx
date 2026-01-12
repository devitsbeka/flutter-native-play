import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { LeagueInfo } from "@/hooks/useLeagueLeaderboard";

interface LeagueHeroHeaderProps {
  league: LeagueInfo;
}

export function LeagueHeroHeader({ league }: LeagueHeroHeaderProps) {
  const { language } = useLanguage();
  
  // Use language-aware league name
  const leagueName = language === 'ka' ? league.nameKa : league.name;
  
  // Championship title based on region
  const championshipTitle = language === 'ka' 
    ? 'საქართველოს ჩემპიონატი' 
    : 'Georgian Championship';
  
  return (
    <div className="pt-6 pb-4 px-4 text-center">
      {/* League name - FIRST, large and light weight */}
      <motion.h1 
        key={league.tier}
        className="text-foreground drop-shadow-lg"
        style={{ 
          fontFamily: 'Google Sans, sans-serif',
          fontSize: '32px',
          fontWeight: 300,
        }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200 }}
      >
        {leagueName}
      </motion.h1>
      
      {/* Championship subtitle - BELOW, small and regular */}
      <motion.p
        className="text-foreground/80 mt-1"
        style={{ 
          fontFamily: 'Google Sans, sans-serif',
          fontSize: '14px',
          fontWeight: 400,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        {championshipTitle}
      </motion.p>
    </div>
  );
}
