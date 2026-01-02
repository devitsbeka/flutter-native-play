import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gamepad2, X, Check, Clock } from "lucide-react";
import { GameInvitation } from "@/hooks/useGameInvitations";
import { useSound } from "@/contexts/SoundContext";
import { SmartAvatar } from "@/components/shared/SmartAvatar";
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
            className="absolute inset-0 bg-black/60"
            onClick={handleDecline}
          />

          {/* Modal - New whitish 3D chunky style */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="relative w-full max-w-sm"
          >
            {/* Subtle glow */}
            <div 
              className="absolute -inset-1 rounded-3xl opacity-50 blur-lg"
              style={{
                background: "linear-gradient(135deg, rgba(147, 51, 234, 0.3) 0%, rgba(236, 72, 153, 0.3) 100%)",
              }}
            />
            
            <div 
              className="relative rounded-3xl p-6 overflow-hidden"
              style={{
                background: "linear-gradient(180deg, #FFFFFF 0%, #F8F6FB 100%)",
                boxShadow: "0 8px 0 #E8E4EC, 0 12px 32px rgba(0, 0, 0, 0.18)",
                border: "3px solid rgba(255, 255, 255, 0.95)",
              }}
            >
              {/* Close button */}
              <motion.button
                onClick={handleDecline}
                className="absolute top-4 right-4 p-2 rounded-xl transition-colors"
                style={{
                  background: "#F3F4F6",
                  boxShadow: "0 2px 0 #D1D5DB",
                }}
                whileTap={{ scale: 0.95, y: 2 }}
              >
                <X className="w-4 h-4 text-gray-500" />
              </motion.button>

              {/* Content */}
              <div className="flex flex-col items-center">
                {/* Icon - 3D chunky badge */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, rotate: [0, -10, 10, -10, 0] }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                  style={{
                    background: "linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 100%)",
                    boxShadow: "0 4px 0 #C4B5FD",
                  }}
                >
                  <Gamepad2 className="w-8 h-8 text-purple-600" />
                </motion.div>

                {/* Title */}
                <h2 className="font-display text-xl text-gray-900 mb-1">თამაშის მოწვევა</h2>
                <p className="text-gray-500 text-sm mb-4">გიწვევს თამაშში!</p>

                {/* Sender info - 3D card */}
                <div 
                  className="flex items-center gap-3 p-3 rounded-2xl w-full mb-4"
                  style={{
                    background: "#F9FAFB",
                    boxShadow: "0 3px 0 #E5E7EB, inset 0 1px 2px rgba(255,255,255,0.8)",
                  }}
                >
                  <SmartAvatar
                    avatarUrl={invitation.sender?.avatar_url}
                    fallback={invitation.sender?.nickname || "?"}
                    size="lg"
                    className="border-2 border-white shadow-md"
                    showSparkle={false}
                    autoPlay={false}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-800">
                        {invitation.sender?.nickname || "მეგობარი"}
                      </p>
                      {invitation.sender?.country_code && (
                        <span>{getCountryFlag(invitation.sender.country_code)}</span>
                      )}
                    </div>
                    {invitation.room?.category_name && (
                      <p className="text-gray-500 text-sm">
                        კატეგორია: {invitation.room.category_name}
                      </p>
                    )}
                  </div>
                </div>

                {/* Timer - 3D badge */}
                <div 
                  className="flex items-center gap-2 mb-6 px-4 py-2 rounded-full"
                  style={{
                    background: timeRemaining < 30 
                      ? "linear-gradient(180deg, #FEE2E2 0%, #FECACA 100%)"
                      : "#F3F4F6",
                    boxShadow: timeRemaining < 30 
                      ? "0 2px 0 #FCA5A5"
                      : "0 2px 0 #E5E7EB",
                  }}
                >
                  <Clock className={`w-4 h-4 ${timeRemaining < 30 ? "text-red-500" : "text-gray-500"}`} />
                  <span className={`text-sm font-mono font-bold ${timeRemaining < 30 ? "text-red-600" : "text-gray-600"}`}>
                    {formatTime(timeRemaining)}
                  </span>
                  <span className="text-gray-400 text-sm">დარჩენილია</span>
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
                    variant="success"
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
