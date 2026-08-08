import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { Gamepad2, Mail, X, Clock, Zap } from "lucide-react";
import { useGameInvitations, GameInvitation } from "@/hooks/useGameInvitations";
import { SafeAvatar } from "@/components/shared/SafeAvatar";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

interface GameInvitationsSectionProps {
  onAcceptInvitation: (invitationId: string) => Promise<string | null>;
  onJoinRoom: (roomCode: string) => void;
}

export function GameInvitationsSection({ onAcceptInvitation, onJoinRoom }: GameInvitationsSectionProps) {
  const { t } = useLanguage();
  const { pendingInvitations, loading, declineInvitation } = useGameInvitations();

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-emerald-600">
          <Mail className="w-4 h-4" />
          <span className="text-sm font-bold tracking-wide">{t("extra.invitationsLabel")}</span>
        </div>
        <div className="animate-pulse rounded-2xl bg-emerald-100 h-24" />
      </div>
    );
  }

  if (pendingInvitations.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2 text-emerald-600">
        <Mail className="w-4 h-4 animate-pulse" />
        <span className="text-sm font-bold tracking-wide">
          {t("extra.gameInvitations")} ({pendingInvitations.length})
        </span>
        <Zap className="w-3 h-3 text-emerald-500 animate-pulse" />
      </div>

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {pendingInvitations.map((invitation) => (
            <InvitationCard 
              key={invitation.id} 
              invitation={invitation}
              onAccept={async () => {
                const roomCode = await onAcceptInvitation(invitation.id);
                if (roomCode) {
                  onJoinRoom(roomCode);
                }
              }}
              onDecline={() => declineInvitation(invitation.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

interface InvitationCardProps {
  invitation: GameInvitation;
  onAccept: () => void;
  onDecline: () => void;
}

function InvitationCard({ invitation, onAccept, onDecline }: InvitationCardProps) {
  const { t } = useLanguage();
  const [isDeclining, setIsDeclining] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>("");

  // Countdown timer
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expires = new Date(invitation.expires_at).getTime();
      const diff = expires - now;

      if (diff <= 0) {
        return t("extra.expiredLabel");
      }

      const minutes = Math.floor(diff / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (minutes > 60) {
        const hours = Math.floor(minutes / 60);
        return t("extra.giHoursMinutes", { h: hours, m: minutes % 60 });
      }
      return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    };

    setTimeLeft(calculateTimeLeft());
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, [invitation.expires_at, t]);

  const handleDecline = async () => {
    setIsDeclining(true);
    await onDecline();
    setIsDeclining(false);
  };

  const [isAccepting, setIsAccepting] = useState(false);
  const handleAccept = async () => {
    if (isAccepting || isDeclining) return;
    setIsAccepting(true);
    try {
      await onAccept();
    } finally {
      setIsAccepting(false);
    }
  };

  const isExpired = timeLeft === t("extra.expiredLabel");
  if (isExpired) return null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, x: -100 }}
      onClick={handleAccept}
      role="button"
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative p-4 rounded-2xl backdrop-blur-sm cursor-pointer",
        "bg-gradient-to-r from-emerald-50 to-green-50",
        "border-2 border-emerald-400",
        "shadow-[0_0_15px_rgba(16,185,129,0.3),0_0_30px_rgba(16,185,129,0.15)]",
        "hover:brightness-[1.03] transition-[filter]",
        isAccepting && "opacity-70 pointer-events-none"
      )}
    >
      {/* Animated glow border */}
      <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
        <motion.div
          className="absolute inset-0 rounded-2xl border-2 border-emerald-400"
          animate={{
            boxShadow: [
              "0 0 10px rgba(16,185,129,0.4)",
              "0 0 20px rgba(16,185,129,0.6)",
              "0 0 10px rgba(16,185,129,0.4)",
            ],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Decline button in top right */}
      <motion.button
        onClick={(e) => {
          e.stopPropagation();
          handleDecline();
        }}
        disabled={isDeclining}
        className={cn(
          "absolute top-2 right-2 z-10 p-1.5 rounded-full transition-colors",
          "bg-white/80 hover:bg-red-100 text-slate-500 hover:text-red-600",
          isDeclining && "opacity-50 cursor-not-allowed"
        )}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <X className="w-4 h-4" />
      </motion.button>

      <div className="relative flex items-center gap-4">
        {/* Sender Avatar */}
        <div className="relative">
          <SafeAvatar 
            avatarUrl={invitation.sender?.avatar_url}
            fallback={invitation.sender?.nickname || "?"}
            className="w-14 h-14 border-2 border-emerald-300"
            fallbackClassName="bg-gradient-to-br from-emerald-500 to-green-500 text-white font-bold"
          />
          {invitation.sender?.country_code && (
            <span className="absolute -bottom-1 -right-1 text-sm">
              {getCountryFlag(invitation.sender.country_code)}
            </span>
          )}
          {/* Online pulse indicator */}
          <motion.div
            className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [1, 0.8, 1],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>

        {/* Invitation Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-bold text-slate-800 truncate">
              {invitation.sender?.nickname || t("extra.friend")}
            </p>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
              {t("extra.newBadge")}
            </span>
          </div>
          
          <p className="text-emerald-600 text-sm font-medium mb-1">{t("extra.invitesYouToPlay")}</p>
          
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span className="flex items-center gap-1">
              <Gamepad2 className="w-3.5 h-3.5" />
              {invitation.room?.category_name || t("extra.generalLabel")}
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Clock className="w-3 h-3" />
              {timeLeft}
            </span>
          </div>
        </div>

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