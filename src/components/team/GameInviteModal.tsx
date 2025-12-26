import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gamepad2, X, Check, Clock } from "lucide-react";
import { GameInvitation } from "@/hooks/useGameInvitations";
import { useSound } from "@/contexts/SoundContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChunkyButton } from "@/components/ui/chunky-button";

interface GameInviteModalProps {
  invitation: GameInvitation | null;
  onAccept: (invitationId: string) => Promise<string | null>;
  onDecline: (invitationId: string) => Promise<boolean>;
  onJoinRoom: (roomCode: string) => void;
}

export function GameInviteModal({
  invitation,
  onAccept,
  onDecline,
  onJoinRoom,
}: GameInviteModalProps) {
  const { playSound, vibrate } = useSound();
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);

  // Calculate time remaining
  useEffect(() => {
    if (!invitation) return;

    const updateTime = () => {
      const expiresAt = new Date(invitation.expires_at).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setTimeRemaining(remaining);

      if (remaining === 0) {
        // Auto-decline when expired
        onDecline(invitation.id);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [invitation, onDecline]);

  // Play sound when invitation appears
  useEffect(() => {
    if (invitation) {
      playSound("notification");
      vibrate(200);
    }
  }, [invitation, playSound, vibrate]);

  const handleAccept = async () => {
    if (!invitation || isAccepting) return;
    
    setIsAccepting(true);
    playSound("button-click");
    
    const roomCode = await onAccept(invitation.id);
    if (roomCode) {
      onJoinRoom(roomCode);
    }
    
    setIsAccepting(false);
  };

  const handleDecline = async () => {
    if (!invitation || isDeclining) return;
    
    setIsDeclining(true);
    playSound("button-click");
    
    await onDecline(invitation.id);
    
    setIsDeclining(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getCountryFlag = (countryCode: string | null | undefined): string => {
    if (!countryCode) return "";
    const codePoints = countryCode
      .toUpperCase()
      .split("")
      .map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  return (
    <AnimatePresence>
      {invitation && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleDecline}
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="relative w-full max-w-sm"
          >
            {/* Glowing border */}
            <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 opacity-75 blur-lg animate-pulse" />
            
            <div className="relative rounded-3xl bg-gradient-to-b from-purple-900/95 to-purple-950/95 border border-purple-500/30 p-6 backdrop-blur-xl overflow-hidden">
              {/* Sparkle decorations */}
              <div className="absolute top-4 left-4 w-2 h-2 rounded-full bg-white/40 animate-ping" />
              <div className="absolute top-8 right-6 w-1.5 h-1.5 rounded-full bg-pink-400/50 animate-ping" style={{ animationDelay: "0.5s" }} />
              <div className="absolute bottom-12 left-8 w-1 h-1 rounded-full bg-purple-400/50 animate-ping" style={{ animationDelay: "1s" }} />

              {/* Close button */}
              <motion.button
                onClick={handleDecline}
                className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 text-white/60 hover:text-white hover:bg-white/20"
                whileTap={{ scale: 0.95 }}
              >
                <X className="w-4 h-4" />
              </motion.button>

              {/* Content */}
              <div className="flex flex-col items-center">
                {/* Icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, rotate: [0, -10, 10, -10, 0] }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4 shadow-lg shadow-purple-500/30"
                >
                  <Gamepad2 className="w-8 h-8 text-white" />
                </motion.div>

                {/* Title */}
                <h2 className="font-display text-xl text-white mb-1">თამაშის მოწვევა</h2>
                <p className="text-white/60 text-sm mb-4">გიწვევს თამაშში!</p>

                {/* Sender info */}
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/10 w-full mb-4">
                  <Avatar className="w-14 h-14 border-2 border-purple-400/50">
                    <AvatarImage src={invitation.sender?.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-lg font-bold">
                      {invitation.sender?.nickname?.charAt(0).toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white">
                        {invitation.sender?.nickname || "მეგობარი"}
                      </p>
                      {invitation.sender?.country_code && (
                        <span>{getCountryFlag(invitation.sender.country_code)}</span>
                      )}
                    </div>
                    {invitation.room?.category_name && (
                      <p className="text-white/60 text-sm">
                        კატეგორია: {invitation.room.category_name}
                      </p>
                    )}
                  </div>
                </div>

                {/* Timer */}
                <div className="flex items-center gap-2 mb-6">
                  <Clock className={`w-4 h-4 ${timeRemaining < 30 ? "text-red-400" : "text-white/60"}`} />
                  <span className={`text-sm font-mono ${timeRemaining < 30 ? "text-red-400" : "text-white/60"}`}>
                    {formatTime(timeRemaining)}
                  </span>
                  <span className="text-white/40 text-sm">დარჩენილია</span>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 w-full">
                  <ChunkyButton
                    variant="secondary"
                    className="flex-1"
                    onClick={handleDecline}
                    disabled={isDeclining}
                    icon={<X className="w-4 h-4" />}
                  >
                    უარყოფა
                  </ChunkyButton>
                  
                  <ChunkyButton
                    variant="primary"
                    className="flex-1"
                    onClick={handleAccept}
                    disabled={isAccepting}
                    icon={<Check className="w-4 h-4" />}
                  >
                    მიღება
                  </ChunkyButton>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
