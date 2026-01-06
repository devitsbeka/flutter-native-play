import React from 'react';
import { motion } from 'framer-motion';
import { useTVGame } from '@/contexts/TVGameContext';
import { ChunkyButton } from '@/components/ui/chunky-button';
import { Users, Crown, Play } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

export const ControllerLobby: React.FC = () => {
  const { players, isHost, startGame } = useTVGame();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">
          {isHost ? "You're the Host!" : "Waiting for Host"}
        </h1>
        <p className="text-purple-300">Watch the TV for the game</p>
      </motion.div>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-5 h-5 text-purple-300" />
          <span className="text-purple-200">Players ({players.length})</span>
        </div>
        <div className="space-y-2">
          {players.map(player => (
            <div key={player.id} className="bg-white/10 rounded-xl p-3 flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={player.avatar_url || undefined} />
                <AvatarFallback className="bg-purple-600 text-white">
                  {player.nickname.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-white flex-1">{player.nickname}</span>
              {player.isHost && <Crown className="w-5 h-5 text-yellow-400" />}
            </div>
          ))}
        </div>
      </div>

      {isHost && players.length >= 1 && (
        <ChunkyButton variant="success" size="lg" onClick={() => startGame()} icon={<Play className="w-5 h-5" />} className="w-full">
          Start Game
        </ChunkyButton>
      )}
    </div>
  );
};
