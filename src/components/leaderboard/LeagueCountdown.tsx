import { useState, useEffect } from "react";

interface CountdownTime {
  hours: number;
  minutes: number;
  seconds: number;
}

function getTimeUntilReset(): CountdownTime {
  const now = new Date();
  
  // 24-hour countdown - reset at next midnight
  const nextMidnight = new Date(now);
  nextMidnight.setDate(now.getDate() + 1);
  nextMidnight.setHours(0, 0, 0, 0);
  
  const diff = nextMidnight.getTime() - now.getTime();
  
  if (diff <= 0) {
    return { hours: 0, minutes: 0, seconds: 0 };
  }
  
  return {
    hours: Math.floor(diff / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  };
}

function padZero(num: number): string {
  return num.toString().padStart(2, "0");
}

// 3D Purplish Flip Digit
function FlipDigit3D({ digit }: { digit: string }) {
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

  return (
    <div 
      className="relative font-black select-none"
      style={{ 
        width: 45, 
        height: 60,
        perspective: '125px'
      }}
    >
      {/* 3D purplish card with shadow */}
      <div 
        className="absolute inset-0 rounded-lg"
        style={{
          background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 50%, #4F46E5 100%)',
          boxShadow: `
            0 5px 0 0 #3730A3,
            0 8px 5px rgba(0,0,0,0.3),
            inset 0 1px 0 rgba(255,255,255,0.3)
          `,
          transform: 'translateZ(0)'
        }}
      />
      
      {/* Digit */}
      <div 
        className="absolute inset-0 flex items-center justify-center text-white text-3xl font-black"
        style={{
          textShadow: '0 2px 4px rgba(0,0,0,0.3)',
          transform: isFlipping ? 'scale(0.95)' : 'scale(1)',
          transition: 'transform 0.15s ease-out'
        }}
      >
        {currentDigit}
      </div>
      
      {/* Highlight/shine effect */}
      <div 
        className="absolute inset-x-0 top-0 h-1/2 rounded-t-lg pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(255,255,255,0.25) 0%, transparent 100%)'
        }}
      />
    </div>
  );
}

function TimeUnit3D({ value }: { value: string }) {
  return (
    <div className="flex gap-1">
      {value.split('').map((digit, i) => (
        <FlipDigit3D key={i} digit={digit} />
      ))}
    </div>
  );
}

export function LeagueCountdown() {
  const [time, setTime] = useState<CountdownTime>(getTimeUntilReset);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(getTimeUntilReset());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="flex items-center justify-center gap-2">
      <TimeUnit3D value={padZero(time.hours)} />
      <span 
        className="text-3xl font-black drop-shadow-lg"
        style={{ 
          color: 'rgba(255,255,255,0.6)',
          textShadow: '0 2px 4px rgba(0,0,0,0.3)'
        }}
      >
        :
      </span>
      <TimeUnit3D value={padZero(time.minutes)} />
      <span 
        className="text-3xl font-black drop-shadow-lg"
        style={{ 
          color: 'rgba(255,255,255,0.6)',
          textShadow: '0 2px 4px rgba(0,0,0,0.3)'
        }}
      >
        :
      </span>
      <TimeUnit3D value={padZero(time.seconds)} />
    </div>
  );
}
