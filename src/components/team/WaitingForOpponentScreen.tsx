import { motion } from "framer-motion";
import { Clock, Users, Loader2 } from "lucide-react";
import { useMultiplayer } from "@/contexts/MultiplayerContext";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function WaitingForOpponentScreen() {
  const { user } = useAuth();
  const { participants, questions, room } = useMultiplayer();

  const otherPlayers = participants
    .filter(p => p.user_id !== user?.id)
    .sort((a, b) => (b.score || 0) - (a.score || 0));
  
  const myParticipant = participants.find(p => p.user_id === user?.id);
  const finishedCount = otherPlayers.filter(p => p.status === "finished").length;
  const totalOthers = otherPlayers.length;

  return (
    <div className="h-[100dvh] flex flex-col bg-gradient-to-b from-[#7C6AE5] to-[#9B89F5]">
      <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center mb-6 relative"
        >
          <motion.div
            className="absolute inset-0 rounded-full border-4 border-white/30 border-t-white"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />
          <Clock className="w-10 h-10 text-white" />
        </motion.div>

        <h2 className="text-2xl font-display font-bold text-white mb-2 text-center">
          ველოდებით მოთამაშეებს...
        </h2>
        <p className="text-white/80 text-center mb-6">
          {finishedCount}/{totalOthers} დაასრულა
        </p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full bg-white/95 backdrop-blur-lg rounded-2xl p-4 mb-4 shadow-xl"
        >
          <p className="text-slate-500 text-sm text-center mb-3">შენი ქულა</p>
          <p className="text-4xl font-bold text-purple-600 text-center mb-2">
            {myParticipant?.score || 0}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="w-full bg-white/10 backdrop-blur-sm rounded-2xl p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-white/60" />
            <span className="text-white/80 text-sm font-medium">მოთამაშეების პროგრესი</span>
          </div>
          
          <div className="space-y-3">
            {otherPlayers.map((player) => {
              const isFinished = player.status === "finished";
              const progress = ((player.current_question || 0) / questions.length) * 100;

              return (
                <div key={player.id} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={player.avatar_url || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white text-xs">
                          {player.nickname?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-white text-sm font-medium truncate max-w-[100px]">
                        {player.nickname}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white/80 text-sm font-bold">{player.score || 0}</span>
                      {isFinished ? (
                        <span className="text-green-400 text-xs">✓</span>
                      ) : (
                        <Loader2 className="w-3 h-3 text-white/50 animate-spin" />
                      )}
                    </div>
                  </div>
                  
                  <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                    <motion.div
                      className={cn(
                        "h-full rounded-full",
                        isFinished ? "bg-green-400" : "bg-white/60"
                      )}
                      initial={{ width: 0 }}
                      animate={{ width: `${isFinished ? 100 : progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}