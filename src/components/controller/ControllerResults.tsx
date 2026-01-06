import React from 'react';
import { motion } from 'framer-motion';
import { useTVGame } from '@/contexts/TVGameContext';
import { ChunkyButton } from '@/components/ui/chunky-button';
import { Trophy, RefreshCw } from 'lucide-react';

export const ControllerResults: React.FC = () => {
  const { players, myPlayerId, myScore, isHost, startGame } = useTVGame();
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const myRank = sortedPlayers.findIndex(p => p.id === myPlayerId) + 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-6 flex flex-col items-center justify-center">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
        <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
      </motion.div>
      
      <h1 className="text-3xl font-bold text-white mb-2">Game Over!</h1>
      
      <div className="bg-white/10 rounded-2xl p-6 mb-6 text-center">
        <p className="text-purple-300 mb-1">Your Rank</p>
        <p className="text-5xl font-bold text-white mb-2">#{myRank}</p>
        <p className="text-purple-300">Score: {myScore}</p>
      </div>
      
      {isHost && (
        <ChunkyButton variant="primary" size="lg" onClick={() => startGame()} icon={<RefreshCw className="w-5 h-5" />} className="w-full">
          Play Again
        </ChunkyButton>
      )}
    </div>
  );
};
