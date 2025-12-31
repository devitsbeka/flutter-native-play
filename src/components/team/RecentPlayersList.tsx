import { motion, AnimatePresence } from "framer-motion";
import { useRecentPlayers } from "@/hooks/useRecentPlayers";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface RecentPlayersListProps {
  onViewAll?: () => void;
}

export function RecentPlayersList({ onViewAll }: RecentPlayersListProps) {
  const { recentPlayers, loading } = useRecentPlayers();

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-white/80">ბოლო მოთამაშეები</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-shrink-0 w-20 h-24 animate-pulse rounded-2xl bg-white/10" />
          ))}
        </div>
      </div>
    );
  }

  if (recentPlayers.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white/80">ბოლო მოთამაშეები</span>
        <button onClick={onViewAll} className="text-sm font-medium text-orange-400">ყველა</button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
        <AnimatePresence>
          {recentPlayers.map((player, index) => (
            <motion.div
              key={player.oderId}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: index * 0.05 }}
              className="flex-shrink-0 flex flex-col items-center"
            >
              <Avatar className="w-16 h-16 border-2 border-white/20 mb-2">
                <AvatarImage src={player.oderAvatarUrl || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-bold text-lg">
                  {player.odername.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <p className="text-white text-xs font-bold uppercase tracking-wide text-center max-w-[70px] truncate">
                {player.odername}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
