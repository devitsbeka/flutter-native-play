import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Gamepad2, Trophy, Sparkles, AlertTriangle, X } from "lucide-react";
import { usePendingChallenges, PendingChallenge } from "@/hooks/usePendingChallenges";
import { SafeAvatar } from "@/components/shared/SafeAvatar";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { cn } from "@/lib/utils";

interface PendingChallengesSectionProps {
  onAcceptChallenge: (challenge: PendingChallenge) => void;
}

export function PendingChallengesSection({ onAcceptChallenge }: PendingChallengesSectionProps) {
  const { pendingChallenges, loading, declineChallenge } = usePendingChallenges();

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-amber-600">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-bold tracking-wide">გამოწვევები</span>
        </div>
        <div className="animate-pulse rounded-2xl bg-slate-200 h-24" />
      </div>
    );
  }

  if (pendingChallenges.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2 text-amber-600">
        <Sparkles className="w-4 h-4" />
        <span className="text-sm font-bold tracking-wide">მომლოდინე გამოწვევები ({pendingChallenges.length})</span>
      </div>

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {pendingChallenges.map((challenge) => (
            <ChallengeCard 
              key={challenge.id} 
              challenge={challenge}
              onAccept={() => onAcceptChallenge(challenge)}
              onDecline={() => declineChallenge(challenge.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

interface ChallengeCardProps {
  challenge: PendingChallenge;
  onAccept: () => void;
  onDecline: () => void;
}

// Hook for live countdown timer
function useCountdown(expiresAt: string) {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
    isUrgent: boolean;
  }>({ hours: 0, minutes: 0, seconds: 0, isExpired: false, isUrgent: false });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expires = new Date(expiresAt).getTime();
      const diff = expires - now;

      if (diff <= 0) {
        return { hours: 0, minutes: 0, seconds: 0, isExpired: true, isUrgent: true };
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      const isUrgent = diff < 1000 * 60 * 60; // Less than 1 hour

      return { hours, minutes, seconds, isExpired: false, isUrgent };
    };

    setTimeLeft(calculateTimeLeft());

    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  return timeLeft;
}

function ChallengeCard({ challenge, onAccept, onDecline }: ChallengeCardProps) {
  const { hours, minutes, seconds, isExpired, isUrgent } = useCountdown(challenge.expiresAt);
  const [isDeclining, setIsDeclining] = useState(false);

  const formatTime = () => {
    if (isExpired) return "ვადა ამოიწურა";
    
    if (hours > 0) {
      return `${hours}სთ ${minutes}წთ`;
    }
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleDecline = async () => {
    setIsDeclining(true);
    await onDecline();
    setIsDeclining(false);
  };

  if (isExpired) {
    return null; // Don't show expired challenges
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, x: -100 }}
      className={cn(
        "relative p-4 rounded-2xl backdrop-blur-sm border shadow-lg",
        isUrgent 
          ? "bg-gradient-to-r from-red-100 to-orange-100 border-red-300 shadow-red-200" 
          : "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300 shadow-amber-200"
      )}
    >
      {/* Decline button in top right */}
      <motion.button
        onClick={handleDecline}
        disabled={isDeclining}
        className={cn(
          "absolute top-2 right-2 p-1.5 rounded-full transition-colors",
          "bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600",
          isDeclining && "opacity-50 cursor-not-allowed"
        )}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <X className="w-4 h-4" />
      </motion.button>
      {/* Glowing effect */}
      <div className={cn(
        "absolute inset-0 rounded-2xl animate-pulse",
        isUrgent 
          ? "bg-gradient-to-r from-red-200/30 to-orange-200/30" 
          : "bg-gradient-to-r from-amber-200/30 to-orange-200/30"
      )} />
      
      <div className="relative flex items-center gap-4">
        {/* Challenger Avatar */}
        <div className="relative">
          <SafeAvatar 
            avatarUrl={challenge.challengerAvatar}
            fallback={challenge.challengerNickname || "?"}
            className={cn(
              "w-14 h-14 border-2",
              isUrgent ? "border-red-300" : "border-amber-300"
            )}
            fallbackClassName="bg-gradient-to-br from-amber-500 to-orange-500 text-white font-bold"
          />
          {challenge.challengerCountry && (
            <span className="absolute -bottom-1 -right-1 text-sm">
              {getCountryFlag(challenge.challengerCountry)}
            </span>
          )}
        </div>

        {/* Challenge Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium text-slate-800 truncate">{challenge.challengerNickname}</p>
          </div>
          
          {/* Show challenger's score prominently if they've already played */}
          {challenge.challengerScore !== null ? (
            <div className="flex items-center gap-2 mb-1">
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-sm font-semibold">
                <Trophy className="w-3.5 h-3.5" />
                {challenge.challengerScore} ქულა
              </div>
              <span className="text-slate-500 text-sm">- გადააჯობე!</span>
            </div>
          ) : (
            <p className="text-amber-600 text-sm mb-1">გამოგიწვია!</p>
          )}
          
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span className="flex items-center gap-1">
              <Gamepad2 className="w-3.5 h-3.5" />
              {challenge.categoryName || "ზოგადი"}
            </span>
          </div>

          {/* Countdown Timer */}
          <div className={cn(
            "flex items-center gap-1 mt-1 text-xs font-medium",
            isUrgent ? "text-red-600" : "text-amber-600"
          )}>
            {isUrgent ? (
              <AlertTriangle className="w-3 h-3 animate-pulse" />
            ) : (
              <Clock className="w-3 h-3" />
            )}
            <span className={isUrgent ? "animate-pulse" : ""}>
              დარჩა: {formatTime()}
            </span>
          </div>
        </div>

        {/* Accept Button - more prominent "Play Now!" */}
        <ChunkyButton
          variant="primary"
          size="sm"
          onClick={onAccept}
          icon={<Gamepad2 className="w-4 h-4" />}
          className="min-w-[100px]"
        >
          ითამაშე!
        </ChunkyButton>
      </div>
    </motion.div>
  );
}

function getCountryFlag(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}