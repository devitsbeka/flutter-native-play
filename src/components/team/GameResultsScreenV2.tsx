import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChunkyButton } from "@/components/ui/chunky-button";
import { useMultiplayerV2 } from "@/contexts/MultiplayerContextV2";
import { useAuth } from "@/contexts/AuthContext";
import { useSound } from "@/contexts/SoundContext";
import { useCurrency } from "@/hooks/useCurrency";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, RotateCcw, Star, Crown } from "lucide-react";
import trophyWinIcon from "@/assets/icons/trophy-win.png";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { REWARDS } from "@/config/rewardConfig";
import coinIcon from "@/assets/icons/icon-coin.png";
import xpIcon from "@/assets/icons/icon-xp.png";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface RankedParticipant {
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  country_code: string | null;
  score: number;
  rank: number;
  isMe: boolean;
}

export function GameResultsScreenV2() {
  const navigate = useNavigate();
  const { user, profile, updateProfile } = useAuth();
  const { playSound, vibrate } = useSound();
  const { addCoins } = useCurrency();
  const [coinsEarned, setCoinsEarned] = useState(0);
  const { 
    myScore: localMyScore, 
    participants, 
    resetMultiplayer,
    currentRoom,
    exitRoom,
    startGame,
    isHost,
  } = useMultiplayerV2();

  const [isStartingRematch, setIsStartingRematch] = useState(false);

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
  const result = isWin ? "Victory!" : isPodium ? `${myRank}${myRank === 2 ? "nd" : "rd"} Place!` : `${myRank}th Place`;

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

  // Update stats and save game
  useEffect(() => {
    if (user && profile && currentRoom && !hasUpdatedStats.current) {
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

        // Update profile stats
        await updateProfile({
          total_points: (profile.total_points || 0) + myScore,
          games_played: (profile.games_played || 0) + 1,
          games_won: isWin ? (profile.games_won || 0) + 1 : profile.games_won,
          current_streak: isWin ? (profile.current_streak || 0) + 1 : 0,
          best_streak: isWin 
            ? Math.max(profile.best_streak || 0, (profile.current_streak || 0) + 1)
            : profile.best_streak,
        });

        // Save to room_games
        const playerScores = rankedParticipants.map(p => ({
          user_id: p.user_id,
          nickname: p.nickname,
          score: p.score,
        }));
        
        if (currentRoom.current_game_id) {
          await supabase
            .from("room_games")
            .update({
              completed_at: new Date().toISOString(),
              winner_user_id: rankedParticipants[0]?.user_id,
              player_scores: playerScores,
            })
            .eq("id", currentRoom.current_game_id);
        }

        // Save to room_match_history for recent games display
        await supabase
          .from("room_match_history")
          .insert({
            room_id: currentRoom.id,
            winner_user_id: rankedParticipants[0]?.user_id || null,
            player_scores: playerScores,
          });

        // Update participant stats
        const winnerId = rankedParticipants[0]?.user_id;
        for (const p of participants) {
          const isWinner = p.user_id === winnerId;
          await supabase
            .from("room_participants")
            .update({
              total_wins: isWinner ? (p.total_wins || 0) + 1 : p.total_wins || 0,
              total_rounds_played: (p.total_rounds_played || 0) + 1,
              last_played_at: new Date().toISOString(),
              has_seen_results: p.user_id === user.id,
            })
            .eq("id", p.id);
        }
      };

      updateStats();
    }
  }, [user, profile, myScore, myRank, isWin, currentRoom, updateProfile, rankedParticipants, addCoins, participants]);

  const handleBackToRoom = () => {
    exitRoom();
    navigate("/team");
  };

  const handlePlayAgain = async () => {
    if (!isHost) {
      toast.info("Waiting for host to start next round...");
      return;
    }
    
    setIsStartingRematch(true);
    try {
      // Reset room to waiting
      await supabase
        .from("game_rooms")
        .update({
          status: "waiting",
          started_at: null,
          completed_at: null,
          current_game_id: null,
        })
        .eq("id", currentRoom!.id);
      
      // Start new game
      await startGame();
    } catch (error) {
      console.error("Error starting rematch:", error);
      toast.error("Failed to start rematch");
    } finally {
      setIsStartingRematch(false);
    }
  };

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden bg-gradient-to-b from-[#7C6AE5] to-[#9B89F5]">
      {/* Top Section: Icon + Result */}
      <div className="pt-8 text-center">
        <motion.img 
          src={trophyWinIcon} 
          alt="Trophy" 
          className="w-20 h-20 object-contain mx-auto mb-4"
          initial={{ scale: 0.5, y: -20 }}
          animate={{ 
            scale: 1, 
            y: 0,
            rotate: [0, -8, 8, -8, 0] 
          }}
          transition={{ 
            scale: { type: "spring", stiffness: 200 },
            y: { type: "spring", stiffness: 200 },
            rotate: { 
              duration: 2,
              repeat: Infinity,
              repeatDelay: 1,
              ease: "easeInOut"
            }
          }}
        />

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-3xl font-display font-bold text-white"
        >
          {result}
        </motion.h1>

        {/* Stars for win */}
        {isWin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex justify-center gap-1 mt-2"
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
      </div>

      {/* Middle Section: Category + Scorecard + Rewards (with 60px top spacing) */}
      <div className="flex-1 flex flex-col items-center justify-center gap-5 px-4" style={{ paddingTop: '60px' }}>
        {/* Category */}
        {currentRoom?.category_name && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="px-6 py-2.5 rounded-full bg-white/15 backdrop-blur-sm"
          >
            <span className="text-white font-medium">{currentRoom.category_name}</span>
          </motion.div>
        )}

        {/* Compact Scorecard */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="w-full max-w-xs bg-white/10 backdrop-blur-sm rounded-2xl p-3"
        >
          <div className="space-y-2">
          {rankedParticipants.slice(0, 4).map((p, idx) => (
              <div
                key={p.user_id}
                className={cn(
                  "flex items-center gap-4 px-4 py-3 rounded-xl",
                  p.isMe ? "bg-white/20" : ""
                )}
              >
                {/* Avatar with crown for winner */}
                <div className="relative">
                  <Avatar className="w-12 h-12 border-2 border-white/30">
                    <AvatarImage src={p.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-400 to-purple-600 text-white text-base font-bold">
                      {p.nickname?.charAt(0)?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  {idx === 0 && (
                    <Crown className="absolute -top-3 -right-1 w-5 h-5 text-amber-400 fill-amber-400 drop-shadow-md" />
                  )}
                </div>
                
                {/* Medal */}
                <span className="text-lg">
                  {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${p.rank}`}
                </span>
                
                {/* Name */}
                <span className="flex-1 text-white font-display text-lg truncate">
                  {p.isMe ? "You" : p.nickname}
                </span>
                
                {/* Score */}
                <span className="text-white font-display text-lg">{p.score}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Points + Coins Row */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-center gap-4"
        >
          {/* Coins Badge */}
          {coinsEarned > 0 && (
            <div 
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-500/90"
              style={{ boxShadow: "0 4px 0 rgba(180,120,0,0.4)" }}
            >
              <img src={coinIcon} alt="Coins" className="w-5 h-5" />
              <span className="text-white font-bold text-lg">+{coinsEarned}</span>
            </div>
          )}

          {/* XP Badge */}
          {myScore > 0 && (
            <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/20 backdrop-blur-sm">
              <img src={xpIcon} alt="XP" className="w-5 h-5" />
              <span className="text-white font-bold text-lg">+{myScore} XP</span>
            </div>
          )}
        </motion.div>
      </div>

      {/* Bottom Section: Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="p-4 pb-8 space-y-3"
      >
        {isHost ? (
          <ChunkyButton
            variant="mint"
            size="lg"
            className="w-full"
            onClick={handlePlayAgain}
            disabled={isStartingRematch}
            icon={<RotateCcw className="w-5 h-5" />}
          >
            {isStartingRematch ? "Starting..." : "Play Again"}
          </ChunkyButton>
        ) : (
          <div className="text-center py-3">
            <motion.p
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-white/80"
            >
              Waiting for host to start next round...
            </motion.p>
          </div>
        )}

        <ChunkyButton
          variant="secondary"
          size="lg"
          className="w-full"
          onClick={handleBackToRoom}
          icon={<ArrowLeft className="w-5 h-5" />}
        >
          Back to Room
        </ChunkyButton>
      </motion.div>
    </div>
  );
}
