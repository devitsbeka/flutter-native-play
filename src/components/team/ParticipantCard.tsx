import { motion } from "framer-motion";
import { Crown, Check, Clock, User } from "lucide-react";
import { RoomParticipant } from "@/hooks/useGameRoom";

interface ParticipantCardProps {
  participant: RoomParticipant;
  isCurrentUser: boolean;
}

export function ParticipantCard({ participant, isCurrentUser }: ParticipantCardProps) {
  const isReady = participant.status === "ready";

  // Country code to flag emoji
  const getFlagEmoji = (countryCode: string) => {
    const codePoints = countryCode
      .toUpperCase()
      .split("")
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      className={`relative rounded-2xl p-4 ${
        isCurrentUser 
          ? "bg-gradient-to-br from-primary/20 to-primary/10 border-2 border-primary/30" 
          : "bg-muted/50 border-2 border-border"
      }`}
    >
      {/* Host crown */}
      {participant.is_host && (
        <motion.div
          className="absolute -top-3 left-1/2 -translate-x-1/2"
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <Crown className="w-6 h-6 text-amber-500 fill-amber-400" />
        </motion.div>
      )}

      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="relative">
          <div className="w-14 h-14 rounded-full overflow-hidden bg-muted border-2 border-border">
            {participant.avatar_url ? (
              <img 
                src={participant.avatar_url} 
                alt={participant.nickname}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/30 to-primary/10">
                <User className="w-6 h-6 text-primary" />
              </div>
            )}
          </div>
          
          {/* Country flag */}
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-card border-2 border-border flex items-center justify-center text-sm">
            {getFlagEmoji(participant.country_code)}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-display font-bold text-foreground truncate">
              {participant.nickname}
            </p>
            {isCurrentUser && (
              <span className="text-xs text-muted-foreground">(შენ)</span>
            )}
          </div>
          
          {/* Status */}
          <div className="flex items-center gap-1.5 mt-1">
            {isReady ? (
              <>
                <motion.div
                  className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <Check className="w-3 h-3 text-white" />
                </motion.div>
                <span className="text-xs text-green-600 font-medium">მზადაა</span>
              </>
            ) : (
              <>
                <motion.div
                  className="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <Clock className="w-3 h-3 text-white" />
                </motion.div>
                <span className="text-xs text-amber-600 font-medium">ელოდება...</span>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
