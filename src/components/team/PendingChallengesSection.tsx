import { motion } from "framer-motion";
import { Clock, Gamepad2, Trophy, Sparkles } from "lucide-react";
import { usePendingChallenges, PendingChallenge } from "@/hooks/usePendingChallenges";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { formatDistanceToNow } from "date-fns";
import { ka } from "date-fns/locale";

interface PendingChallengesSectionProps {
  onAcceptChallenge: (challenge: PendingChallenge) => void;
}

export function PendingChallengesSection({ onAcceptChallenge }: PendingChallengesSectionProps) {
  const { pendingChallenges, loading } = usePendingChallenges();

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-amber-300">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-medium">გამოწვევები</span>
        </div>
        <div className="animate-pulse rounded-2xl bg-white/10 h-24" />
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
      <div className="flex items-center gap-2 text-amber-300">
        <Sparkles className="w-4 h-4" />
        <span className="text-sm font-medium">მომლოდინე გამოწვევები ({pendingChallenges.length})</span>
      </div>

      <div className="space-y-3">
        {pendingChallenges.map((challenge) => (
          <ChallengeCard 
            key={challenge.id} 
            challenge={challenge}
            onAccept={() => onAcceptChallenge(challenge)}
          />
        ))}
      </div>
    </motion.div>
  );
}

interface ChallengeCardProps {
  challenge: PendingChallenge;
  onAccept: () => void;
}

function ChallengeCard({ challenge, onAccept }: ChallengeCardProps) {
  const timeLeft = formatDistanceToNow(new Date(challenge.expiresAt), { 
    addSuffix: false,
    locale: ka 
  });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 backdrop-blur-sm border border-amber-500/30"
    >
      {/* Glowing effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-amber-400/10 to-orange-400/10 animate-pulse" />
      
      <div className="relative flex items-center gap-4">
        {/* Challenger Avatar */}
        <div className="relative">
          <Avatar className="w-14 h-14 border-2 border-amber-400/50">
            <AvatarImage src={challenge.challengerAvatar || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-500 text-white font-bold">
              {challenge.challengerNickname.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {challenge.challengerCountry && (
            <span className="absolute -bottom-1 -right-1 text-sm">
              {getCountryFlag(challenge.challengerCountry)}
            </span>
          )}
        </div>

        {/* Challenge Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium text-white truncate">{challenge.challengerNickname}</p>
            <span className="text-amber-300">გამოგიწვია!</span>
          </div>
          
          <div className="flex items-center gap-3 text-sm text-white/70">
            <span className="flex items-center gap-1">
              <Gamepad2 className="w-3.5 h-3.5" />
              {challenge.categoryName || "ზოგადი"}
            </span>
            {challenge.challengerScore !== null && (
              <span className="flex items-center gap-1 text-amber-300">
                <Trophy className="w-3.5 h-3.5" />
                {challenge.challengerScore} ქულა
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 mt-1 text-xs text-amber-300/80">
            <Clock className="w-3 h-3" />
            დარჩა: {timeLeft}
          </div>
        </div>

        {/* Accept Button */}
        <ChunkyButton
          variant="primary"
          size="sm"
          onClick={onAccept}
          icon={<Gamepad2 className="w-4 h-4" />}
        >
          თამაში
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