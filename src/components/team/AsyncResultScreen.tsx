import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Clock, Trophy, ArrowRight, Home, Bell, RotateCcw, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMultiplayer } from "@/contexts/MultiplayerContext";
import { useSound } from "@/contexts/SoundContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ResolvedAvatarImage } from "@/components/ui/resolved-avatar-image";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { useLanguage } from "@/contexts/LanguageContext";

interface AsyncResultScreenProps {
  challengerInfo?: {
    nickname: string;
    avatar: string | null;
    score: number | null;
  };
  myScore: number;
  isChallenger: boolean;
  opponentCompleted: boolean;
  roomCategoryId?: string;
  roomCategoryName?: string;
  opponentUserId?: string;
}

export function AsyncResultScreen({
  challengerInfo, 
  myScore, 
  isChallenger,
  opponentCompleted,
  roomCategoryId,
  roomCategoryName,
  opponentUserId,
}: AsyncResultScreenProps) {
  const navigate = useNavigate();
  const { resetMultiplayer, createChallengeRoom } = useMultiplayer();
  const { t } = useLanguage();
  const { playSound, vibrate } = useSound();
  const hasPlayedSound = useRef(false);
  const [isRematchLoading, setIsRematchLoading] = useState(false);

  useEffect(() => {
    if (hasPlayedSound.current) return;
    
    if (opponentCompleted) {
      hasPlayedSound.current = true;
      // Both completed - play result sound and vibrate
      const iWon = challengerInfo?.score !== null && myScore > (challengerInfo.score || 0);
      playSound(iWon ? "game-win" : "game-lose");
      vibrate(iWon ? [100, 50, 100] : [200]);
      
      // Confetti for win
      if (iWon) {
        const duration = 2000;
        const end = Date.now() + duration;

        const frame = () => {
          confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#7C5CFC', '#F5A623', '#FFD6E0'],
          });
          confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#7C5CFC', '#F5A623', '#FFD6E0'],
          });

          if (Date.now() < end) {
            requestAnimationFrame(frame);
          }
        };
        frame();
      }
    } else {
      playSound("button-click");
    }
  }, [opponentCompleted, challengerInfo?.score, myScore, playSound, vibrate]);

  const handleSendReminder = () => {
    toast.success("შეხსენება გაიგზავნა!");
    // In a real implementation, this would send a push notification
  };

  const handleRematch = async () => {
    if (!opponentUserId || !roomCategoryId || !roomCategoryName) {
      toast.error("რემატჩი ვერ მოხერხდა");
      return;
    }

    setIsRematchLoading(true);
    try {
      const success = await createChallengeRoom(
        opponentUserId,
        roomCategoryId,
        roomCategoryName,
        false // async rematch
      );

      if (success) {
        toast.success("რემატჩის გამოწვევა გაიგზავნა!");
        resetMultiplayer();
        navigate("/team");
      }
    } catch (error) {
      console.error("Rematch error:", error);
      toast.error("რემატჩი ვერ მოხერხდა");
    } finally {
      setIsRematchLoading(false);
    }
  };

  const handleBackToTeam = () => {
    resetMultiplayer();
    navigate("/team");
  };

  // Waiting for opponent to play
  if (!opponentCompleted) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
        <div 
          className="fixed inset-0 z-0"
          style={{
            background: "linear-gradient(180deg, hsl(260 70% 65%) 0%, hsl(280 60% 55%) 50%, hsl(300 50% 45%) 100%)"
          }}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 max-w-md w-full mx-4"
        >
          <div className="p-8 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 text-center">
            {/* Your Score */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-6"
            >
              <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center shadow-lg">
                <Trophy className="w-12 h-12 text-white" />
              </div>
            </motion.div>

            <h2 className="font-display text-2xl text-white mb-2">{t("extra.yourScore")}</h2>
            <p className="text-5xl font-bold text-white mb-6">{myScore}</p>

            {/* Waiting Message */}
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="flex items-center justify-center gap-3 mb-6 p-4 rounded-xl bg-white/10"
            >
              <Clock className="w-6 h-6 text-amber-300" />
              <span className="text-white/80">
                {t("extra.waitingForOpponent", { name: challengerInfo?.nickname || t("extra.opponent") })}
              </span>
            </motion.div>

            {isChallenger && (
              <p className="text-white/60 text-sm mb-6">
                {t("extra.challengeSentDesc")}
              </p>
            )}

            {/* Actions */}
            <div className="space-y-3">
              <ChunkyButton
                variant="secondary"
                className="w-full"
                onClick={handleSendReminder}
                icon={<Bell className="w-5 h-5" />}
              >
                {t("extra.sendReminder")}
              </ChunkyButton>

              <ChunkyButton
                variant="primary"
                className="w-full"
                onClick={handleBackToTeam}
                icon={<Home className="w-5 h-5" />}
              >
                {t("extra.asyncGoBack")}
              </ChunkyButton>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Both completed - show comparison
  const opponentScore = challengerInfo?.score || 0;
  const iWon = myScore > opponentScore;
  const isTie = myScore === opponentScore;

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
      <div 
        className="fixed inset-0 z-0"
        style={{
          background: iWon 
            ? "linear-gradient(180deg, hsl(145 70% 45%) 0%, hsl(160 60% 40%) 50%, hsl(180 50% 35%) 100%)"
            : "linear-gradient(180deg, hsl(260 70% 65%) 0%, hsl(280 60% 55%) 50%, hsl(300 50% 45%) 100%)"
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 max-w-md w-full mx-4"
      >
        <div className="p-8 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 text-center">
          {/* Result Header */}
          <motion.h1
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`font-display text-4xl mb-6 ${
              iWon ? "text-yellow-300" : isTie ? "text-white" : "text-white/80"
            }`}
          >
            {iWon ? `🎉 ${t("extra.youWon")}` : isTie ? `🤝 ${t("extra.itsTie")}` : `😔 ${t("extra.youLost")}`}
          </motion.h1>

          {/* Score Comparison */}
          <div className="flex items-center justify-center gap-4 mb-8">
            {/* Your Score */}
            <motion.div
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-2 ${
                iWon ? "bg-gradient-to-br from-yellow-400 to-amber-500" : "bg-white/20"
              }`}>
                <span className="text-2xl font-bold text-white">{myScore}</span>
              </div>
              <p className="text-white/80 text-sm">{t("extra.youLabel")}</p>
            </motion.div>

            {/* VS */}
            <div className="text-white/50 font-display text-xl">VS</div>

            {/* Opponent Score */}
            <motion.div
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <div className="relative mb-2">
                <Avatar className={`w-20 h-20 border-3 ${
                  !iWon && !isTie ? "border-yellow-400" : "border-white/30"
                }`}>
                  <ResolvedAvatarImage src={challengerInfo?.avatar || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xl font-bold">
                    {(challengerInfo?.nickname || "?").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold text-white drop-shadow-lg">
                    {opponentScore}
                  </span>
                </div>
              </div>
              <p className="text-white/80 text-sm truncate max-w-[80px]">
                {challengerInfo?.nickname || t("extra.opponent")}
              </p>
            </motion.div>
          </div>

          {/* Point Difference */}
          {!isTie && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mb-6 p-3 rounded-xl bg-white/10"
            >
              <p className="text-white/80">
                {iWon ? "+" : "-"}{Math.abs(myScore - opponentScore)} {t("extra.pointsDiff", { diff: "", result: iWon ? t("extra.pointsBetter") : t("extra.pointsBehind") })}
              </p>
            </motion.div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            {/* Rematch Button */}
            {opponentUserId && roomCategoryId && roomCategoryName && (
              <ChunkyButton
                variant="secondary"
                className="w-full"
                onClick={handleRematch}
                disabled={isRematchLoading}
                icon={isRematchLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RotateCcw className="w-5 h-5" />}
              >
                {isRematchLoading ? t("extra.sendingRematch") : t("extra.rematch")}
              </ChunkyButton>
            )}
            
            <ChunkyButton
              variant="primary"
              className="w-full"
              onClick={handleBackToTeam}
              icon={<ArrowRight className="w-5 h-5" />}
            >
              {t("extra.continueBtn")}
            </ChunkyButton>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default AsyncResultScreen;