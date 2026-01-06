import React from 'react';
import { motion } from 'framer-motion';
import { useTVGame } from '@/contexts/TVGameContext';
import { Users, Crown, Smartphone } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { QRCodeSVG } from 'qrcode.react';

export const TVLobbyScreen: React.FC = () => {
  const { code, players } = useTVGame();
  
  const joinUrl = `${window.location.origin}/join?code=${code}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-8 overflow-hidden">
      <div className="h-full flex gap-8">
        {/* Left side - Join info */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-80 flex-shrink-0"
        >
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
            <div className="flex items-center gap-2 mb-4">
              <Smartphone className="w-5 h-5 text-purple-300" />
              <p className="text-purple-200">Join the game</p>
            </div>

            {/* Code */}
            <div className="flex gap-1 mb-4">
              {code?.split('').map((char, i) => (
                <div
                  key={i}
                  className="w-10 h-12 bg-purple-600/50 rounded-lg flex items-center justify-center text-white text-xl font-bold font-mono"
                >
                  {char}
                </div>
              ))}
            </div>

            {/* QR */}
            <div className="bg-white rounded-xl p-3 inline-block">
              <QRCodeSVG value={joinUrl} size={100} level="M" />
            </div>

            <p className="text-purple-300/60 text-sm mt-4">
              mytrivia.io/join
            </p>
          </div>
        </motion.div>

        {/* Right side - Players */}
        <div className="flex-1">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-6"
          >
            <Users className="w-8 h-8 text-purple-300" />
            <h2 className="text-3xl font-bold text-white">
              Players ({players.length})
            </h2>
          </motion.div>

          {/* Player grid */}
          <div className="grid grid-cols-4 gap-4">
            {players.map((player, index) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/10 relative"
              >
                {player.isHost && (
                  <Crown className="absolute -top-2 -right-2 w-6 h-6 text-yellow-400" />
                )}
                <div className="flex flex-col items-center">
                  <Avatar className="w-16 h-16 mb-3 ring-2 ring-purple-400/50">
                    <AvatarImage src={player.avatar_url || undefined} />
                    <AvatarFallback className="bg-purple-600 text-white text-xl">
                      {player.nickname.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-white font-semibold truncate max-w-full">
                    {player.nickname}
                  </p>
                  {player.isHost && (
                    <span className="text-yellow-400 text-xs mt-1">Host</span>
                  )}
                </div>
              </motion.div>
            ))}

            {/* Empty slots */}
            {players.length < 8 && (
              <motion.div
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="bg-white/5 rounded-2xl p-4 border border-dashed border-white/20 flex items-center justify-center min-h-[120px]"
              >
                <p className="text-purple-300/50 text-sm">Waiting...</p>
              </motion.div>
            )}
          </div>

          {/* Instructions */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 text-center"
          >
            <p className="text-purple-200 text-xl">
              {players.some(p => p.isHost) 
                ? "The host will start the game from their phone"
                : "First player to join becomes the host"}
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
