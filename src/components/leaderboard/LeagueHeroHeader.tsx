import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { LeagueInfo } from "@/hooks/useLeagueLeaderboard";

interface LeagueHeroHeaderProps {
  league: LeagueInfo;
}

export function LeagueHeroHeader({ league }: LeagueHeroHeaderProps) {
  const { language, t } = useLanguage();
  
  // Use language-aware league name
  const leagueName = language === 'ka' ? league.nameKa : league.name;
  
  // Country name based on language
  const countryName = t("extra.countryGeorgia");
  
  return (
    <div className="pt-6 pb-4 px-4 text-center">
      {/* Country indicator - flag + name at top */}
      <motion.div
        className="flex items-center justify-center gap-2 mb-2"
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Georgian flag in circular avatar */}
        <div className="w-6 h-6 rounded-full overflow-hidden shadow-md border border-white/40 flex-shrink-0">
          <img 
            src="https://flagcdn.com/w40/ge.png" 
            alt="Georgia"
            className="w-full h-full object-cover"
            loading="eager"
          />
        </div>
        <span
          className="text-foreground/80"
          style={{ 
            fontFamily: 'Google Sans, sans-serif',
            fontSize: '14px',
            fontWeight: 400,
          }}
        >
          {countryName}
        </span>
      </motion.div>
      
      {/* League name - large title below (hidden on mobile, shown in floating tooltip instead) */}
      <motion.h1 
        key={league.tier}
        className="hidden md:block text-foreground drop-shadow-lg"
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
    </div>
  );
}