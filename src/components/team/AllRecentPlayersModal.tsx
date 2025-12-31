import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, Swords } from "lucide-react";
import { useRecentPlayers, RecentPlayer } from "@/hooks/useRecentPlayers";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AllRecentPlayersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AllRecentPlayersModal({ isOpen, onClose }: AllRecentPlayersModalProps) {
  const { recentPlayers, loading } = useRecentPlayers();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh]"
          >
            <div className="bg-gradient-to-b from-[#7E7BDC] to-[#5855A8] rounded-t-3xl shadow-2xl border-t border-white/20">
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full bg-white/30" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 pb-4">
                <h2 className="text-xl font-bold text-white">ბოლო მოთამაშეები</h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="px-5 pb-8 overflow-y-auto max-h-[70vh]">
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="animate-pulse rounded-2xl bg-white/10 h-16" />
                    ))}
                  </div>
                ) : recentPlayers.length === 0 ? (
                  <div className="text-center py-12">
                    <Swords className="w-12 h-12 text-white/30 mx-auto mb-3" />
                    <p className="text-white/60">ჯერ არავინ გითამაშიხარ</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentPlayers.map((player, index) => (
                      <PlayerListItem key={player.oderId} player={player} index={index} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function PlayerListItem({ player, index }: { player: RecentPlayer; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className="flex items-center gap-3 p-3 rounded-2xl bg-white/10 border border-white/10"
    >
      <Avatar className="w-12 h-12 border-2 border-white/20">
        <AvatarImage src={player.oderAvatarUrl || undefined} />
        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-bold">
          {player.odername.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="font-bold text-white text-sm uppercase tracking-wide">{player.odername}</p>
        <p className="text-white/50 text-xs">{player.gamesPlayed} თამაში</p>
      </div>

      {/* Win/Loss Stats */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-500/20">
          <Trophy className="w-3 h-3 text-green-300" />
          <span className="text-xs text-green-300 font-medium">{player.wins}</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/20">
          <span className="text-xs text-red-300 font-medium">{player.losses}</span>
        </div>
      </div>
    </motion.div>
  );
}
