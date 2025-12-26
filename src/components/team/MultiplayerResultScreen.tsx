import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useMultiplayer } from "@/contexts/MultiplayerContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Home, RotateCcw, Star, User, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";

export function MultiplayerResultScreen() {
  const navigate = useNavigate();
  const { user, profile, updateProfile } = useAuth();
  const { 
    myScore, 
    opponentScore, 
    participants, 
    resetMultiplayer,
    room,
  } = useMultiplayer();

  const opponent = participants.find(p => p.user_id !== user?.id);
  const myParticipant = participants.find(p => p.user_id === user?.id);

  const isWin = myScore > opponentScore;
  const isDraw = myScore === opponentScore;
  const result = isWin ? "გამარჯვება!" : isDraw ? "ფრე" : "წაგება";

  const hasUpdatedStats = useRef(false);

  // Victory confetti and stats update
  useEffect(() => {
    if (isWin) {
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

    // Update stats
    if (user && profile && room && !hasUpdatedStats.current) {
      hasUpdatedStats.current = true;

      const updateStats = async () => {
        await updateProfile({
          total_points: (profile.total_points || 0) + myScore,
          games_played: (profile.games_played || 0) + 1,
          games_won: isWin ? (profile.games_won || 0) + 1 : profile.games_won,
          current_streak: isWin ? (profile.current_streak || 0) + 1 : 0,
          best_streak: isWin 
            ? Math.max(profile.best_streak || 0, (profile.current_streak || 0) + 1)
            : profile.best_streak,
        });

        // Save game session
        await supabase.from("game_sessions").insert({
          user_id: user.id,
          opponent_name: opponent?.nickname || "Opponent",
          opponent_country: opponent?.country_code || "GE",
          opponent_points: opponentScore,
          user_score: myScore,
          opponent_score: opponentScore,
          status: isWin ? "won" : isDraw ? "draw" : "lost",
          completed_at: new Date().toISOString(),
        });
      };

      updateStats();
    }
  }, [user, profile, myScore, opponentScore, isWin, isDraw, opponent, room, updateProfile]);

  const handleBackToTeam = () => {
    resetMultiplayer();
    navigate("/team");
  };

  const handlePlayAgain = () => {
    resetMultiplayer();
    // Stay on team page to create/join another room
    navigate("/team");
  };

  // Get flag emoji
  const getFlagEmoji = (countryCode: string) => {
    try {
      const codePoints = countryCode
        .toUpperCase()
        .split("")
        .map(char => 127397 + char.charCodeAt(0));
      return String.fromCodePoint(...codePoints);
    } catch {
      return "🏳️";
    }
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-gradient-to-b from-[#7C6AE5] to-[#9B89F5]">
      <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-md mx-auto w-full">
        {/* Result Header */}
        <motion.div
          initial={{ scale: 0, y: -20 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200 }}
          className={cn(
            "w-24 h-24 rounded-full flex items-center justify-center mb-4",
            isWin ? "bg-amber-400" : isDraw ? "bg-blue-400" : "bg-slate-400"
          )}
          style={{
            boxShadow: isWin 
              ? "0 8px 30px rgba(251, 191, 36, 0.5)" 
              : "0 8px 20px rgba(0,0,0,0.2)"
          }}
        >
          <Trophy className={cn(
            "w-12 h-12",
            isWin ? "text-amber-800" : "text-white"
          )} />
        </motion.div>

        {/* Result Text */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl font-display font-bold text-white mb-2 text-center"
        >
          {result}
        </motion.h1>

        {/* Stars for win */}
        {isWin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex justify-center gap-1 mb-6"
          >
            {[1, 2, 3].map((star) => (
              <motion.div
                key={star}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.3 + star * 0.1, type: "spring" }}
              >
                <Star className="w-8 h-8 text-amber-400 fill-amber-400" />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Score Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full bg-white/95 backdrop-blur-lg rounded-3xl p-5 mb-6 shadow-xl"
        >
          <div className="flex items-center justify-between">
            {/* You */}
            <div className="text-center flex-1">
              <div className="relative mx-auto mb-2">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-purple-100 border-3 border-cyan-400 mx-auto shadow-[0_0_15px_rgba(34,211,238,0.4)]">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-purple-600">
                      <User className="w-8 h-8 text-white" />
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-1 right-1/2 translate-x-1/2 text-lg">
                  {getFlagEmoji(profile?.country_code || "GE")}
                </div>
              </div>
              <p className="font-bold text-slate-800 text-sm mb-1 truncate max-w-[100px] mx-auto">
                {profile?.nickname || "შენ"}
              </p>
              <motion.p
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: "spring" }}
                className={cn(
                  "text-3xl font-bold",
                  isWin ? "text-green-500" : isDraw ? "text-blue-500" : "text-slate-600"
                )}
              >
                {myScore}
              </motion.p>
            </div>

            {/* VS */}
            <div className="px-3">
              <div className="text-2xl font-bold text-slate-300">vs</div>
            </div>

            {/* Opponent */}
            <div className="text-center flex-1">
              <div className="relative mx-auto mb-2">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-purple-100 border-3 border-pink-400 mx-auto shadow-[0_0_15px_rgba(244,114,182,0.4)]">
                  {opponent?.avatar_url ? (
                    <img src={opponent.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-400 to-pink-600">
                      <User className="w-8 h-8 text-white" />
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-1 right-1/2 translate-x-1/2 text-lg">
                  {getFlagEmoji(opponent?.country_code || "GE")}
                </div>
              </div>
              <p className="font-bold text-slate-800 text-sm mb-1 truncate max-w-[100px] mx-auto">
                {opponent?.nickname || "მოწინააღმდეგე"}
              </p>
              <motion.p
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
                className={cn(
                  "text-3xl font-bold",
                  !isWin && !isDraw ? "text-green-500" : "text-slate-600"
                )}
              >
                {opponentScore}
              </motion.p>
            </div>
          </div>

          {/* Points Earned */}
          {myScore > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-center pt-4 mt-4 border-t border-slate-200"
            >
              <p className="text-slate-500 text-sm">მიღებული ქულები</p>
              <div className="flex items-center justify-center gap-2 mt-1">
                <Crown className="w-5 h-5 text-amber-500 fill-amber-400" />
                <p className="text-2xl font-bold text-purple-600">+{myScore}</p>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Category badge */}
        {room?.category_name && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mb-6 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm"
          >
            <span className="text-white/90 text-sm">
              კატეგორია: <strong>{room.category_name}</strong>
            </span>
          </motion.div>
        )}

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="w-full flex flex-col gap-3"
        >
          <ChunkyButton
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handlePlayAgain}
            icon={<RotateCcw className="w-5 h-5" />}
          >
            ხელახლა თამაში
          </ChunkyButton>

          <ChunkyButton
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={handleBackToTeam}
            icon={<Home className="w-5 h-5" />}
          >
            მთავარ მენიუში
          </ChunkyButton>
        </motion.div>
      </div>
    </div>
  );
}
