import { useState, useEffect } from "react";
import { motion } from "framer-motion";
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

// Single flip digit
function FlipDigit({ digit }: { digit: string }) {
  const [currentDigit, setCurrentDigit] = useState(digit);
  const [prevDigit, setPrevDigit] = useState(digit);
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    if (digit !== currentDigit) {
      setPrevDigit(currentDigit);
      setCurrentDigit(digit);
      setIsFlipping(true);
      const timer = setTimeout(() => setIsFlipping(false), 600);
      return () => clearTimeout(timer);
    }
  }, [digit, currentDigit]);

  const cardHeight = 40; // Total height in px
  const halfHeight = cardHeight / 2;

  return (
    <div 
      className="relative font-bold select-none"
      style={{ width: 28, height: cardHeight }}
    >
      {/* Top half - shows current digit (top half clipped) */}
      <div 
        className="absolute inset-x-0 top-0 overflow-hidden rounded-t-md bg-foreground/5"
        style={{ height: halfHeight }}
      >
        <div 
          className="flex items-center justify-center text-foreground text-xl"
          style={{ height: cardHeight }}
        >
          {currentDigit}
        </div>
      </div>

      {/* Bottom half - shows current digit (bottom half clipped) */}
      <div 
        className="absolute inset-x-0 overflow-hidden rounded-b-md bg-foreground/10"
        style={{ top: halfHeight, height: halfHeight }}
      >
        <div 
          className="flex items-center justify-center text-foreground text-xl"
          style={{ height: cardHeight, marginTop: -halfHeight }}
        >
          {currentDigit}
        </div>
      </div>

      {/* Divider line */}
      <div className="absolute inset-x-0 top-1/2 h-px bg-black/10 z-10" />

      {/* Flipping animation overlay */}
      {isFlipping && (
        <>
          {/* Top card flipping down - shows previous digit */}
          <div 
            className="absolute inset-x-0 top-0 overflow-hidden rounded-t-md bg-foreground/5 origin-bottom z-20"
            style={{ 
              height: halfHeight,
              animation: 'flip-top 0.3s ease-in forwards',
              backfaceVisibility: 'hidden',
            }}
          >
            <div 
              className="flex items-center justify-center text-foreground text-xl"
              style={{ height: cardHeight }}
            >
              {prevDigit}
            </div>
          </div>

          {/* Bottom card flipping up - shows current digit */}
          <div 
            className="absolute inset-x-0 overflow-hidden rounded-b-md bg-foreground/10 origin-top z-20"
            style={{ 
              top: halfHeight,
              height: halfHeight,
              animation: 'flip-bottom 0.3s ease-out 0.3s forwards',
              transform: 'rotateX(180deg)',
              backfaceVisibility: 'hidden',
            }}
          >
            <div 
              className="flex items-center justify-center text-foreground text-xl"
              style={{ height: cardHeight, marginTop: -halfHeight }}
            >
              {currentDigit}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function TimeUnit({ value, label }: { value: string; label?: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex gap-0.5">
        {value.split('').map((digit, i) => (
          <FlipDigit key={i} digit={digit} />
        ))}
      </div>
      {label && (
        <span className="text-sm text-amber-600 font-semibold ml-0.5">{label}</span>
      )}
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
  
  const daysLabel = language === 'ka' ? 'დღ' : 'd';
  
  return (
    <motion.div
      className="bg-card/95 backdrop-blur-md rounded-2xl p-4 border border-border/30 shadow-lg"
      whileHover={{ scale: 1.02 }}
    >
      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-3 text-center font-medium">
        {t('leaderboard.timeRemaining')}
      </div>
      <div className="flex items-center justify-center gap-2">
        <Clock className="w-5 h-5 text-amber-500" />
        
        <TimeUnit value={time.days.toString()} label={daysLabel} />
        
        <span className="text-xl font-bold text-foreground/30">:</span>
        
        <TimeUnit value={padZero(time.hours)} />
        
        <span className="text-xl font-bold text-foreground/30">:</span>
        
        <TimeUnit value={padZero(time.minutes)} />
        
        <span className="text-xl font-bold text-foreground/30">:</span>
        
        <TimeUnit value={padZero(time.seconds)} />
      </div>
    </motion.div>
  );
}
