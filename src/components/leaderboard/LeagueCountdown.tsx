import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getTimeUntilReset(): CountdownTime {
  const now = new Date();
  const nextSunday = new Date(now);
  const dayOfWeek = now.getDay();
  
  // Calculate days until next Sunday (0 = Sunday)
  const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
  nextSunday.setDate(now.getDate() + daysUntilSunday);
  nextSunday.setHours(0, 0, 0, 0);
  
  const diff = nextSunday.getTime() - now.getTime();
  
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  };
}

function padZero(num: number): string {
  return num.toString().padStart(2, "0");
}

interface AnimatedDigitProps {
  value: string;
  className?: string;
}

function AnimatedDigit({ value, className = "" }: AnimatedDigitProps) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <AnimatePresence mode="popLayout">
        <motion.span
          key={value}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="block"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

export function LeagueCountdown() {
  const { t, language } = useLanguage();
  const [time, setTime] = useState<CountdownTime>(getTimeUntilReset);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(getTimeUntilReset());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  const daysLabel = language === 'ka' ? 'დ' : 'd';
  
  return (
    <motion.div
      className="bg-background/20 backdrop-blur-md rounded-2xl p-4 border border-border/30"
      whileHover={{ scale: 1.02 }}
    >
      <div className="text-xs text-foreground/70 uppercase tracking-wide mb-2 text-center font-medium">
        {t('leaderboard.timeRemaining')}
      </div>
      <div className="flex items-center justify-center gap-2">
        <Clock className="w-5 h-5 text-amber-400" />
        <div className="flex items-baseline gap-1 font-bold text-foreground">
          {/* Days */}
          <div className="flex items-baseline">
            <AnimatedDigit value={time.days.toString()} className="text-xl" />
            <span className="text-sm ml-0.5 opacity-80">{daysLabel}</span>
          </div>
          
          {/* Separator */}
          <span className="text-lg opacity-50 mx-1">:</span>
          
          {/* Hours */}
          <AnimatedDigit value={padZero(time.hours)} className="text-xl" />
          
          {/* Separator */}
          <span className="text-lg opacity-50">:</span>
          
          {/* Minutes */}
          <AnimatedDigit value={padZero(time.minutes)} className="text-xl" />
          
          {/* Separator */}
          <span className="text-lg opacity-50">:</span>
          
          {/* Seconds */}
          <AnimatedDigit value={padZero(time.seconds)} className="text-xl tabular-nums" />
        </div>
      </div>
    </motion.div>
  );
}
