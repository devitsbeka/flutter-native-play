import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
}

function getTimeUntilReset(): CountdownTime {
  const now = new Date();
  const nextSunday = new Date(now);
  const dayOfWeek = now.getDay();
  
  const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
  nextSunday.setDate(now.getDate() + daysUntilSunday);
  nextSunday.setHours(0, 0, 0, 0);
  
  const diff = nextSunday.getTime() - now.getTime();
  
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 };
  }
  
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
    totalSeconds: Math.floor(diff / 1000),
  };
}

function padZero(num: number): string {
  return num.toString().padStart(2, "0");
}

// Flip unit component for each digit
function FlipDigit({ digit, prevDigit }: { digit: string; prevDigit: string }) {
  const isFlipping = digit !== prevDigit;
  
  return (
    <div className="relative w-[1.2em] h-[1.6em] text-lg font-bold">
      {/* Static top half */}
      <div className="absolute inset-x-0 top-0 h-1/2 overflow-hidden rounded-t-sm bg-card border-b border-black/10">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-foreground">
          {digit}
        </div>
      </div>

      {/* Static bottom half */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 overflow-hidden rounded-b-sm bg-card/90">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 text-foreground">
          {prevDigit}
        </div>
      </div>

      {/* Flipping cards */}
      {isFlipping && (
        <div className="absolute inset-0 [perspective:200px]">
          <div 
            className="absolute inset-x-0 top-0 h-1/2 overflow-hidden rounded-t-sm bg-card origin-bottom animate-[flip-top_0.3s_ease-in_forwards]"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-foreground">
              {prevDigit}
            </div>
          </div>
          <div 
            className="absolute inset-x-0 bottom-0 h-1/2 overflow-hidden rounded-b-sm bg-card/90 origin-top animate-[flip-bottom_0.3s_ease-out_0.3s_forwards]"
            style={{ 
              backfaceVisibility: 'hidden',
              transform: 'rotateX(180deg)'
            }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 text-foreground">
              {digit}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FlipNumber({ value }: { value: string }) {
  const [prev, setPrev] = useState(value);
  
  useEffect(() => {
    const timeout = setTimeout(() => setPrev(value), 300);
    return () => clearTimeout(timeout);
  }, [value]);
  
  return (
    <div className="flex gap-0.5">
      {value.split('').map((digit, i) => (
        <FlipDigit key={i} digit={digit} prevDigit={prev[i] || '0'} />
      ))}
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
  
  const daysLabel = language === 'ka' ? 'დღე' : 'd';
  
  return (
    <motion.div
      className="bg-card/95 backdrop-blur-md rounded-2xl p-4 border border-border/30 shadow-lg"
      whileHover={{ scale: 1.02 }}
    >
      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-3 text-center font-medium">
        {t('leaderboard.timeRemaining')}
      </div>
      <div className="flex items-center justify-center gap-3">
        <Clock className="w-5 h-5 text-amber-500" />
        <div className="flex items-center gap-2">
          {/* Days */}
          <div className="flex items-center gap-1">
            <FlipNumber value={time.days.toString()} />
            <span className="text-sm text-muted-foreground font-medium">{daysLabel}</span>
          </div>
          
          <span className="text-xl font-bold text-muted-foreground/50">:</span>
          
          {/* Hours */}
          <FlipNumber value={padZero(time.hours)} />
          
          <span className="text-xl font-bold text-muted-foreground/50">:</span>
          
          {/* Minutes */}
          <FlipNumber value={padZero(time.minutes)} />
          
          <span className="text-xl font-bold text-muted-foreground/50">:</span>
          
          {/* Seconds */}
          <FlipNumber value={padZero(time.seconds)} />
        </div>
      </div>
    </motion.div>
  );
}
