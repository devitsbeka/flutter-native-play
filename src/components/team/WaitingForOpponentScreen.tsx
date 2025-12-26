import { motion } from "framer-motion";
import { useMultiplayer } from "@/contexts/MultiplayerContext";
import { useAuth } from "@/contexts/AuthContext";
import { Clock, User, Crown, Loader2 } from "lucide-react";

export function WaitingForOpponentScreen() {
  const { profile } = useAuth();
  const { myScore, opponentScore, participants, room } = useMultiplayer();
  const { user } = useAuth();
  
  const opponent = participants.find(p => p.user_id !== user?.id);
  const opponentCurrentScore = opponent?.score || opponentScore;
  
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
        {/* Loading animation */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center mb-6"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 className="w-12 h-12 text-white" />
          </motion.div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-display font-bold text-white mb-2 text-center"
        >
          მოწინააღმდეგეს ველოდებით...
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-white/80 text-center mb-8"
        >
          მოწინააღმდეგე ჯერ კითხვებს პასუხობს
        </motion.p>

        {/* Current scores */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="w-full bg-white/95 backdrop-blur-lg rounded-3xl p-5 shadow-xl"
        >
          <div className="flex items-center justify-between">
            {/* You */}
            <div className="text-center flex-1">
              <div className="relative mx-auto mb-2">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-purple-100 border-3 border-cyan-400 mx-auto shadow-[0_0_15px_rgba(34,211,238,0.4)]">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-purple-600">
                      <User className="w-7 h-7 text-white" />
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-1 right-1/2 translate-x-1/2 text-sm">
                  {getFlagEmoji(profile?.country_code || "GE")}
                </div>
              </div>
              <p className="font-bold text-slate-800 text-xs mb-1">შენ</p>
              <div className="flex items-center justify-center gap-1">
                <Crown className="w-4 h-4 text-amber-500 fill-amber-400" />
                <p className="text-2xl font-bold text-green-500">{myScore}</p>
              </div>
              <div className="flex items-center justify-center gap-1 mt-1 text-green-500 text-xs">
                <Clock className="w-3 h-3" />
                <span>დასრულებულია</span>
              </div>
            </div>

            {/* VS */}
            <div className="px-3">
              <div className="text-xl font-bold text-slate-300">vs</div>
            </div>

            {/* Opponent */}
            <div className="text-center flex-1">
              <div className="relative mx-auto mb-2">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-purple-100 border-3 border-pink-400 mx-auto shadow-[0_0_15px_rgba(244,114,182,0.4)]">
                  {opponent?.avatar_url ? (
                    <img src={opponent.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-400 to-pink-600">
                      <User className="w-7 h-7 text-white" />
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-1 right-1/2 translate-x-1/2 text-sm">
                  {getFlagEmoji(opponent?.country_code || "GE")}
                </div>
              </div>
              <p className="font-bold text-slate-800 text-xs mb-1">{opponent?.nickname || "მოწინააღმდეგე"}</p>
              <div className="flex items-center justify-center gap-1">
                <Crown className="w-4 h-4 text-amber-500 fill-amber-400" />
                <motion.p 
                  key={opponentCurrentScore}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="text-2xl font-bold text-slate-600"
                >
                  {opponentCurrentScore}
                </motion.p>
              </div>
              <div className="flex items-center justify-center gap-1 mt-1 text-amber-500 text-xs">
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Loader2 className="w-3 h-3 animate-spin" />
                </motion.div>
                <span>პასუხობს...</span>
              </div>
            </div>
          </div>
          
          {/* Question progress */}
          <div className="mt-4 pt-4 border-t border-slate-200">
            <div className="flex justify-between text-sm text-slate-500">
              <span>მოწინააღმდეგის პროგრესი:</span>
              <span className="font-bold">{opponent?.current_question || 0}/{room?.total_questions || 5}</span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full mt-2 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ 
                  width: `${((opponent?.current_question || 0) / (room?.total_questions || 5)) * 100}%` 
                }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}