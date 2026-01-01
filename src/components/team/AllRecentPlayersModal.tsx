import { motion } from "framer-motion";
import { Trophy, Swords } from "lucide-react";
import { useRecentPlayers, RecentPlayer } from "@/hooks/useRecentPlayers";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GameModal, GameModalFooter } from "@/components/ui/game-modal";

interface AllRecentPlayersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AllRecentPlayersModal({ isOpen, onClose }: AllRecentPlayersModalProps) {
  const { recentPlayers, loading } = useRecentPlayers();

  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      title="ბოლო მოთამაშეები"
      iconEmoji="👥"
      showSparkles={false}
      className="max-w-md"
    >
      {/* Content */}
      <div className="max-h-[50vh] overflow-y-auto pr-1 -mr-1">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div 
                key={i} 
                className="animate-pulse rounded-2xl h-16"
                style={{
                  background: "#F3F4F6",
                }}
              />
            ))}
          </div>
        ) : recentPlayers.length === 0 ? (
          <div className="text-center py-8">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{
                background: "#F3F4F6",
                boxShadow: "0 3px 0 #E5E7EB",
              }}
            >
              <Swords className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">ჯერ არავინ გითამაშიხარ</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentPlayers.map((player, index) => (
              <PlayerListItem key={player.oderId} player={player} index={index} />
            ))}
          </div>
        )}
      </div>

      <div className="mt-4">
        <GameModalFooter
          primaryLabel="დახურვა"
          onPrimary={onClose}
          primaryVariant="secondary"
        />
      </div>
    </GameModal>
  );
}

function PlayerListItem({ player, index }: { player: RecentPlayer; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className="flex items-center gap-3 p-3 rounded-2xl"
      style={{
        background: "#F9FAFB",
        boxShadow: "0 2px 0 #E5E7EB, inset 0 1px 2px rgba(255,255,255,0.8)",
      }}
    >
      <Avatar className="w-12 h-12 border-3 border-white shadow-md">
        <AvatarImage src={player.oderAvatarUrl || undefined} />
        <AvatarFallback 
          className="font-bold text-white"
          style={{
            background: "linear-gradient(135deg, #A855F7 0%, #7C3AED 100%)",
          }}
        >
          {player.odername.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="font-bold text-gray-800 text-sm uppercase tracking-wide">{player.odername}</p>
        <p className="text-gray-500 text-xs">{player.gamesPlayed} თამაში</p>
      </div>

      {/* Win/Loss Stats */}
      <div className="flex items-center gap-2">
        <div 
          className="flex items-center gap-1 px-2 py-1 rounded-lg"
          style={{
            background: "linear-gradient(180deg, #D1FAE5 0%, #A7F3D0 100%)",
            boxShadow: "0 2px 0 #6EE7B7",
          }}
        >
          <Trophy className="w-3 h-3 text-green-600" />
          <span className="text-xs text-green-700 font-bold">{player.wins}</span>
        </div>
        <div 
          className="flex items-center gap-1 px-2 py-1 rounded-lg"
          style={{
            background: "linear-gradient(180deg, #FEE2E2 0%, #FECACA 100%)",
            boxShadow: "0 2px 0 #FCA5A5",
          }}
        >
          <span className="text-xs text-red-600 font-bold">{player.losses}</span>
        </div>
      </div>
    </motion.div>
  );
}
