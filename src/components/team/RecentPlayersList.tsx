import { motion, AnimatePresence } from "framer-motion";
import { useRecentPlayers } from "@/hooks/useRecentPlayers";
import { SmartAvatar } from "@/components/shared/SmartAvatar";

interface RecentPlayersListProps {
  onViewAll?: () => void;
}

export function RecentPlayersList({ onViewAll }: RecentPlayersListProps) {
  const { recentPlayers, loading } = useRecentPlayers();

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-slate-800 tracking-wide">ბოლო მოთამაშეები</span>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-shrink-0 w-20 h-28 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      </div>
    );
  }

  if (recentPlayers.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-slate-800 tracking-wide">ბოლო მოთამაშეები</span>
        <button onClick={onViewAll} className="text-sm font-semibold text-orange-600 px-3 py-1 rounded-full bg-orange-100 hover:bg-orange-200 transition-colors">ყველა</button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
        <AnimatePresence>
          {recentPlayers.map((player, index) => (
            <motion.div
              key={player.oderId}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: index * 0.05 }}
              className="flex-shrink-0 flex flex-col items-center p-2 rounded-xl bg-white/80 backdrop-blur-sm shadow-sm"
            >
              <SmartAvatar
                avatarUrl={player.oderAvatarUrl}
                animatedAvatarUrl={player.oderAnimatedAvatarUrl}
                fallback={player.odername}
                size="xl"
                className="ring-3 ring-purple-400/40 shadow-lg shadow-purple-500/25 mb-2"
                showSparkle={true}
                playOnHover={true}
              />
              <p className="text-slate-800 text-xs font-bold uppercase tracking-wide text-center max-w-[70px] truncate">
                {player.odername}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
