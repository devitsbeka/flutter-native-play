import React from 'react';
import { motion } from 'framer-motion';
import { useTVGame } from '@/contexts/TVGameContext';
import { ChunkyButton } from '@/components/ui/chunky-button';
import { Trophy, RefreshCw, Loader2, Tv } from 'lucide-react';

export const ControllerResults: React.FC = () => {
  const { players, myPlayerId, myScore, isHost, startGame, phase } = useTVGame();
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const myRank = sortedPlayers.findIndex(p => p.id === myPlayerId) + 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-6 flex flex-col items-center justify-center">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
        <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
      </motion.div>
      
      <h1 className="text-3xl font-bold text-white mb-2">თამაში დასრულდა!</h1>
      
      <div className="bg-white/10 rounded-2xl p-6 mb-6 text-center">
        <p className="text-purple-300 mb-1">შენი ადგილი</p>
        <p className="text-5xl font-bold text-white mb-2">#{myRank || '?'}</p>
        <p className="text-purple-300">ქულა: {myScore}</p>
      </div>
      
      {isHost ? (
        <ChunkyButton variant="primary" size="lg" onClick={() => startGame()} icon={<RefreshCw className="w-5 h-5" />} className="w-full">
          ახალი თამაში
        </ChunkyButton>
      ) : (
        <motion.div 
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Tv className="w-6 h-6 text-purple-300" />
            <span className="text-purple-200">შედეგებს ნახავ TV-ზე</span>
          </div>
          <div className="bg-white/10 rounded-2xl p-4 flex items-center gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <Loader2 className="w-5 h-5 text-purple-300" />
            </motion.div>
            <p className="text-purple-200 text-sm">
              ველოდებით შემდეგ თამაშს...
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
};
