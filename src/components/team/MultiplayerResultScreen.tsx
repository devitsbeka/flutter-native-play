import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useMultiplayer } from "@/contexts/MultiplayerContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSound } from "@/contexts/SoundContext";
import { useCurrency } from "@/hooks/useCurrency";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Home, RotateCcw, Star, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { REWARDS } from "@/config/rewardConfig";
import coinIcon from "@/assets/icons/icon-coin.png";

interface RankedParticipant {
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  country_code: string | null;
  score: number;
  rank: number;
  isMe: boolean;
}

export function MultiplayerResultScreen() {
  const navigate = useNavigate();
  const { user, profile, updateProfile } = useAuth();
  const { playSound, vibrate } = useSound();
  const { addCoins } = useCurrency();
  const [coinsEarned, setCoinsEarned] = useState(0);
  const { 
    myScore: localMyScore, 
    participants, 
    resetMultiplayer,
    room,
  } = useMultiplayer();

  // Sort participants by score and assign ranks
  const rankedParticipants: RankedParticipant[] = [...participants]
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .map((p, index) => ({
      user_id: p.user_id,
      nickname: p.nickname,
      avatar_url: p.avatar_url,
      country_code: p.country_code,
      score: p.score || 0,
      rank: index + 1,
      isMe: p.user_id === user?.id,
    }));

  const myParticipant = rankedParticipants.find(p => p.isMe);
  const myScore = myParticipant?.score ?? localMyScore;
  const myRank = myParticipant?.rank ?? rankedParticipants.length;

  const isWin = myRank === 1;
  const isPodium = myRank <= 3;
  const result = isWin ? "გამარჯვება!" : isPodium ? `${myRank}-ე ადგილი!` : `${myRank}-ე ადგილი`;

  const hasUpdatedStats = useRef(false);

  // Victory/loss sound and confetti
  useEffect(() => {
    if (isWin) {
      playSound("game-win");
      vibrate([100, 50, 100]);
      
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
    } else if (isPodium) {
      playSound("game-win");
      vibrate(100);
    } else {
      playSound("game-lose");
      vibrate(200);
    }
  }, [isWin, isPodium, playSound, vibrate]);

  // Update stats
  useEffect(() => {
    if (user && profile && room && !hasUpdatedStats.current) {
      hasUpdatedStats.current = true;

      const updateStats = async () => {
        // Calculate coins earned based on rank
        let earnedCoins = 0;
        if (myRank === 1) {
          earnedCoins = REWARDS.MULTIPLAYER_1ST_COINS + myScore;
        } else if (myRank === 2) {
          earnedCoins = REWARDS.MULTIPLAYER_2ND_COINS + Math.floor(myScore / 2);
        } else if (myRank === 3) {
          earnedCoins = REWARDS.MULTIPLAYER_3RD_COINS + Math.floor(myScore / 2);
        } else {
          earnedCoins = REWARDS.MULTIPLAYER_PARTICIPATION_COINS;
        }
        setCoinsEarned(earnedCoins);

        // Add coins
        await addCoins(earnedCoins);

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
        const winner = rankedParticipants[0];
        await supabase.from("game_sessions").insert({
          user_id: user.id,
          opponent_name: winner.isMe ? rankedParticipants[1]?.nickname || "Opponent" : winner.nickname,
          opponent_country: winner.isMe ? rankedParticipants[1]?.country_code || "GE" : winner.country_code || "GE",
          opponent_points: winner.isMe ? rankedParticipants[1]?.score || 0 : winner.score,
          user_score: myScore,
          opponent_score: winner.isMe ? rankedParticipants[1]?.score || 0 : winner.score,
          status: isWin ? "won" : "lost",
          completed_at: new Date().toISOString(),
        });
      };

      updateStats();
    }
  }, [user, profile, myScore, myRank, isWin, room, updateProfile, rankedParticipants, addCoins]);

  const handleBackToTeam = () => {
    resetMultiplayer();
    navigate("/team");
  };

  const handlePlayAgain = () => {
    resetMultiplayer();
    navigate("/team");
  };

  const getFlagEmoji = (countryCode: string | null) => {
    if (!countryCode) return "🏳️";
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

  // Get podium participants (top 3)
  const podiumParticipants = rankedParticipants.slice(0, 3);
  const restParticipants = rankedParticipants.slice(3);

  return (
    <div className="h-[100dvh] flex flex-col bg-gradient-to-b from-[#7C6AE5] to-[#9B89F5] overflow-auto">
      <div className="flex-1 flex flex-col items-center p-4 max-w-md mx-auto w-full">
        {/* Result Header */}
        <motion.div
          initial={{ scale: 0, y: -20 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200 }}
          className={cn(
            "w-20 h-20 rounded-full flex items-center justify-center mb-3",
            isWin ? "bg-amber-400" : isPodium ? "bg-blue-400" : "bg-slate-400"
          )}
          style={{
            boxShadow: isWin 
              ? "0 8px 30px rgba(251, 191, 36, 0.5)" 
              : "0 8px 20px rgba(0,0,0,0.2)"
          }}
        >
          <Trophy className={cn(
            "w-10 h-10",
            isWin ? "text-amber-800" : "text-white"
          )} />
        </motion.div>

        {/* Result Text */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-3xl font-display font-bold text-white mb-1 text-center"
        >
          {result}
        </motion.h1>

        {/* Stars for win */}
        {isWin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex justify-center gap-1 mb-4"
          >
            {[1, 2, 3].map((star) => (
              <motion.div
                key={star}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.3 + star * 0.1, type: "spring" }}
              >
                <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Podium */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full mb-4"
        >
          <div className="flex items-end justify-center gap-2 h-48">
            {/* 2nd Place */}
            {podiumParticipants[1] && (
              <PodiumSpot participant={podiumParticipants[1]} place={2} getFlagEmoji={getFlagEmoji} />
            )}
            
            {/* 1st Place */}
            {podiumParticipants[0] && (
              <PodiumSpot participant={podiumParticipants[0]} place={1} getFlagEmoji={getFlagEmoji} />
            )}
            
            {/* 3rd Place */}
            {podiumParticipants[2] && (
              <PodiumSpot participant={podiumParticipants[2]} place={3} getFlagEmoji={getFlagEmoji} />
            )}
          </div>
        </motion.div>

        {/* Full Rankings */}
        {restParticipants.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="w-full bg-white/95 backdrop-blur-lg rounded-2xl p-3 mb-4 shadow-xl"
          >
            <p className="text-slate-500 text-xs font-medium mb-2 text-center">სრული რანკინგი</p>
            <div className="space-y-2">
              {restParticipants.map((p) => (
                <div
                  key={p.user_id}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-xl",
                    p.isMe ? "bg-purple-100" : ""
                  )}
                >
                  <span className="w-6 text-center text-slate-500 font-bold text-sm">
                    #{p.rank}
                  </span>
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={p.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-400 to-purple-600 text-white text-sm">
                      {p.nickname?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-slate-800 text-sm truncate">
                        {p.isMe ? "შენ" : p.nickname}
                      </span>
                      <span className="text-sm">{getFlagEmoji(p.country_code)}</span>
                    </div>
                  </div>
                  <span className="font-bold text-purple-600 text-sm">{p.score}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Coins Earned */}
        {coinsEarned > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, type: "spring" }}
            className="flex items-center gap-2 mb-4 px-4 py-2 rounded-full bg-amber-500/90"
            style={{ boxShadow: "0 4px 0 rgba(180,120,0,0.4)" }}
          >
            <img src={coinIcon} alt="" className="w-6 h-6" />
            <span className="text-white font-bold text-lg">+{coinsEarned}</span>
          </motion.div>
        )}

        {/* Points Earned */}
        {myScore > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex items-center gap-2 mb-4 px-4 py-2 rounded-full bg-white/20"
          >
            <Crown className="w-5 h-5 text-amber-400 fill-amber-400" />
            <span className="text-white font-bold">+{myScore} ქულა</span>
          </motion.div>
        )}

        {/* Category badge */}
        {room?.category_name && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mb-4 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm"
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
          transition={{ delay: 0.7 }}
          className="w-full flex flex-col gap-3 pb-4"
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

// Podium spot component
function PodiumSpot({ 
  participant, 
  place, 
  getFlagEmoji 
}: { 
  participant: RankedParticipant; 
  place: 1 | 2 | 3;
  getFlagEmoji: (code: string | null) => string;
}) {
  const heights = { 1: "h-28", 2: "h-20", 3: "h-16" };
  const colors = { 
    1: "from-amber-400 to-amber-500 border-amber-300", 
    2: "from-slate-300 to-slate-400 border-slate-200", 
    3: "from-amber-600 to-amber-700 border-amber-500" 
  };
  const avatarSizes = { 1: "w-16 h-16", 2: "w-12 h-12", 3: "w-12 h-12" };
  const medals = { 1: "🥇", 2: "🥈", 3: "🥉" };

  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: place === 1 ? 0.3 : place === 2 ? 0.4 : 0.5 }}
      className="flex flex-col items-center"
    >
      {/* Avatar */}
      <div className="relative mb-2">
        <Avatar className={cn(
          avatarSizes[place],
          "border-3",
          participant.isMe ? "border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]" : "border-white/50"
        )}>
          <AvatarImage src={participant.avatar_url || undefined} />
          <AvatarFallback className="bg-gradient-to-br from-purple-400 to-purple-600 text-white font-bold">
            {participant.nickname?.charAt(0) || "?"}
          </AvatarFallback>
        </Avatar>
        <div className="absolute -bottom-1 right-1/2 translate-x-1/2 text-sm">
          {getFlagEmoji(participant.country_code)}
        </div>
      </div>

      {/* Name */}
      <p className="text-white text-xs font-medium truncate max-w-[80px] text-center mb-1">
        {participant.isMe ? "შენ" : participant.nickname}
      </p>

      {/* Score */}
      <p className="text-white/80 text-xs font-bold mb-2">{participant.score}</p>

      {/* Podium block */}
      <div className={cn(
        "w-20 rounded-t-xl bg-gradient-to-b border-t-2 flex items-start justify-center pt-2",
        heights[place],
        colors[place]
      )}>
        <span className="text-2xl">{medals[place]}</span>
      </div>
    </motion.div>
  );
}
