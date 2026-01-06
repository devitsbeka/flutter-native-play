import React from 'react';
import { motion } from 'framer-motion';
import { useTVGame } from '@/contexts/TVGameContext';
import { Tv, Gamepad2, Sparkles } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export const TVIdleScreen: React.FC = () => {
  const { code, players } = useTVGame();
  
  const joinUrl = `${window.location.origin}/join?code=${code}`;

  // Get top 3 from last round
  const topPlayers = [...players].sort((a, b) => b.score - a.score).slice(0, 3);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex flex-col items-center justify-center p-8 overflow-hidden relative">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-64 h-64 rounded-full bg-purple-500/10"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{
              duration: 8 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 4,
            }}
          />
        ))}
      </div>

      {/* Logo and title */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 text-center mb-12"
      >
        <div className="flex items-center justify-center gap-4 mb-4">
          <Tv className="w-16 h-16 text-purple-300" />
          <Sparkles className="w-10 h-10 text-yellow-400" />
        </div>
        <h1 className="text-6xl font-bold text-white font-display mb-2">MyTrivia</h1>
        <p className="text-purple-300 text-2xl">Waiting for next round</p>
      </motion.div>

      {/* Last round top 3 */}
      {topPlayers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="relative z-10 bg-white/10 backdrop-blur-xl rounded-3xl p-8 mb-12 border border-white/20"
        >
          <h3 className="text-purple-200 text-lg mb-4 text-center">Last Round Leaders</h3>
          <div className="flex items-end justify-center gap-8">
            {topPlayers.map((player, index) => (
              <div key={player.id} className="text-center">
                <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${
                  index === 0 ? 'from-yellow-400 to-yellow-600' :
                  index === 1 ? 'from-gray-300 to-gray-500' :
                  'from-orange-400 to-orange-600'
                } flex items-center justify-center text-white text-2xl font-bold mb-2`}>
                  {index + 1}
                </div>
                <p className="text-white font-semibold">{player.nickname}</p>
                <p className="text-purple-300 text-sm">{player.score} pts</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Join info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="relative z-10 flex items-center gap-8"
      >
        <div className="text-center">
          <div className="flex items-center gap-2 mb-2 justify-center">
            <Gamepad2 className="w-5 h-5 text-purple-300" />
            <p className="text-purple-200">Join with code</p>
          </div>
          <div className="flex gap-1">
            {code?.split('').map((char, i) => (
              <div
                key={i}
                className="w-10 h-12 bg-purple-600/50 rounded-lg flex items-center justify-center text-white text-xl font-bold font-mono"
              >
                {char}
              </div>
            ))}
          </div>
        </div>

        <div className="h-20 w-px bg-white/20" />

        <div className="bg-white rounded-xl p-3">
          <QRCodeSVG value={joinUrl} size={80} level="M" />
        </div>
      </motion.div>

      {/* Pulsing indicator */}
      <motion.div
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="mt-12 text-purple-300/60"
      >
        Host can start the next round anytime
      </motion.div>
    </div>
  );
};
