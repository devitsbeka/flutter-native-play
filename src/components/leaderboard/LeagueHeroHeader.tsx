import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { LeagueInfo } from "@/hooks/useLeagueLeaderboard";
import leagueTrophy from "@/assets/league-trophy.png";

// CSS filter styles for each league tier color
const LEAGUE_FILTERS: Record<number, string> = {
  1: "none", // Original gold trophy - no filter
  2: "saturate(0) brightness(1.1) contrast(0.95)", // Silver
  3: "sepia(1) saturate(5) hue-rotate(15deg) brightness(1.05)", // Gold
  4: "sepia(1) saturate(3) hue-rotate(170deg) brightness(1.1)", // Diamond
  5: "sepia(1) saturate(4) hue-rotate(250deg) brightness(1)", // Champion
};

interface LeagueHeroHeaderProps {
  league: LeagueInfo;
}

export function LeagueHeroHeader({ league }: LeagueHeroHeaderProps) {
  const { t, language, currentLanguage } = useLanguage();
  
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
      
      {/* League name with trophy */}
      <motion.div
        className="flex items-center justify-center gap-3"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
      >
        <motion.img
          src={leagueTrophy}
          alt={leagueName}
          className="w-12 h-14 object-contain drop-shadow-lg"
          style={{
            filter: LEAGUE_FILTERS[league.tier],
          }}
          animate={{
            y: [0, -3, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <h2 className="text-2xl font-extrabold text-foreground drop-shadow-lg">
          {leagueName}
        </h2>
        <motion.img
          src={leagueTrophy}
          alt={leagueName}
          className="w-12 h-14 object-contain drop-shadow-lg scale-x-[-1]"
          style={{
            filter: LEAGUE_FILTERS[league.tier],
          }}
          animate={{
            y: [0, -3, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5,
          }}
        />
      </motion.div>
    </div>
  );
}
