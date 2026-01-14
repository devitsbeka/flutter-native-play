import React, { useState, useEffect, useMemo } from 'react';

const cn = (...inputs: (string | undefined | null | boolean)[]) =>
  inputs.filter(Boolean).join(' ');

const FlipUnit = ({
  digit,
  cardStyle,
}: {
  digit: string;
  cardStyle: React.CSSProperties;
}) => {
  const [currentDigit, setCurrentDigit] = useState(digit);
  const [previousDigit, setPreviousDigit] = useState(digit);
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    if (digit !== currentDigit) {
      setPreviousDigit(currentDigit);
      setCurrentDigit(digit);
      setIsFlipping(true);
    }
  }, [digit, currentDigit]);

  const handleAnimationEnd = () => {
    setIsFlipping(false);
    setPreviousDigit(digit);
  };

  return (
    <div 
      className="relative w-[1em] h-[1.4em] text-[2rem] font-bold"
      style={cardStyle}
    >
      {/* Static top half */}
      <div className="absolute inset-x-0 top-0 h-1/2 overflow-hidden rounded-t-md bg-[var(--flip-card-bg,hsl(var(--card)))] border-b border-black/20">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[var(--flip-card-text,hsl(var(--foreground)))]">
          {currentDigit}
        </div>
      </div>

      {/* Static bottom half */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 overflow-hidden rounded-b-md bg-[var(--flip-card-bg,hsl(var(--card)))]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 text-[var(--flip-card-text,hsl(var(--foreground)))]">
          {previousDigit}
        </div>
      </div>

      {/* Flipping cards */}
      <div 
        className={cn(
          "absolute inset-0",
          isFlipping && "[perspective:300px]"
        )}
        onAnimationEnd={handleAnimationEnd}
      >
        {/* Top flipping card */}
        <div 
          className={cn(
            "absolute inset-x-0 top-0 h-1/2 overflow-hidden rounded-t-md bg-[var(--flip-card-bg,hsl(var(--card)))] origin-bottom",
            isFlipping && "animate-[flip-top_0.3s_ease-in_forwards]"
          )}
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[var(--flip-card-text,hsl(var(--foreground)))]">
            {previousDigit}
          </div>
        </div>

        {/* Bottom flipping card */}
        <div 
          className={cn(
            "absolute inset-x-0 bottom-0 h-1/2 overflow-hidden rounded-b-md bg-[var(--flip-card-bg,hsl(var(--card)))] origin-top",
            isFlipping && "animate-[flip-bottom_0.3s_ease-out_0.3s_forwards]"
          )}
          style={{ 
            backfaceVisibility: 'hidden',
            transform: isFlipping ? 'rotateX(180deg)' : 'rotateX(0deg)'
          }}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 text-[var(--flip-card-text,hsl(var(--foreground)))]">
            {currentDigit}
          </div>
        </div>
      </div>
    </div>
  );
};

export const FlipCountdown = ({
  countFrom = 99,
  countTo = 0,
  className,
  cardBgColor,
  textColor,
}: {
  countFrom?: number | string | bigint;
  countTo?: number | string | bigint;
  className?: string;
  cardBgColor?: string;
  textColor?: string;
}) => {
  const from = useMemo(() => BigInt(countFrom), [countFrom]);
  const to = useMemo(() => BigInt(countTo), [countTo]);

  const isCountingDown = from > to;
  const [count, setCount] = useState(from);

  useEffect(() => {
    if ((isCountingDown && count <= to) || (!isCountingDown && count >= to)) {
      return;
    }

    const timer = setInterval(() => {
      setCount((prevCount) => (isCountingDown ? prevCount - 1n : prevCount + 1n));
    }, 1000);

    return () => clearInterval(timer);
  }, [count, to, isCountingDown]);

  const paddedCount = useMemo(() => {
    const maxVal = from > to ? from : to;
    const numDigits = String(maxVal).length;
    const displayCount = count < 0n ? 0n : count;
    
    return String(displayCount).padStart(numDigits, '0');
  }, [count, from, to]);

  const cardStyle: React.CSSProperties = {
    '--flip-card-bg': cardBgColor,
    '--flip-card-text': textColor,
  } as React.CSSProperties;

  return (
    <div className={cn("flex gap-1", className)}>
      {paddedCount.split('').map((digit, index) => (
        <FlipUnit key={index} digit={digit} cardStyle={cardStyle} />
      ))}
    </div>
  );
};
