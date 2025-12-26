import { motion, AnimatePresence } from "framer-motion";
import { Clock, Trophy, Swords, User } from "lucide-react";
import { useRecentPlayers } from "@/hooks/useRecentPlayers";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { ka } from "date-fns/locale";

export function RecentPlayersList() {
  const { recentPlayers, loading } = useRecentPlayers();

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse rounded-2xl bg-white/10 h-16" />
        ))}
      </div>
    );
  }

  if (recentPlayers.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-6 rounded-2xl bg-white/5 border border-white/10"
      >
        <Swords className="w-10 h-10 text-white/30 mx-auto mb-2" />
        <p className="text-white/60 text-sm">ჯერ არავინ გითამაშიხარ</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-white/80 mb-2">
        <Clock className="w-4 h-4" />
        <span className="text-sm font-medium">ბოლო მოთამაშეები</span>
      </div>

      <AnimatePresence>
        {recentPlayers.map((player, index) => (
          <motion.div
            key={player.oderId}
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center gap-3 p-3 rounded-2xl bg-white/10 backdrop-blur-sm"
          >
            <Avatar className="w-10 h-10 border-2 border-white/30">
              <AvatarImage src={player.oderAvatarUrl || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-bold text-sm">
                {player.odername.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <p className="font-medium text-white truncate text-sm">{player.odername}</p>
              <p className="text-xs text-white/50">
                {formatDistanceToNow(new Date(player.lastPlayedAt), { addSuffix: true, locale: ka })}
              </p>
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
        ))}
      </AnimatePresence>
    </div>
  );
}
