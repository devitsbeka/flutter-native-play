import React from 'react';
import { motion } from 'framer-motion';
import { useTVGame } from '@/contexts/TVGameContext';
import { Tv, Smartphone, Sparkles } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export const TVPairingScreenV2: React.FC = () => {
  const { code } = useTVGame();
  
  const joinUrl = `${window.location.origin}/join?code=${code}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex flex-col items-center justify-center p-8 overflow-hidden relative">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-purple-400/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.3, 0.8, 0.3],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-8"
      >
        <Tv className="w-10 h-10 text-purple-300" />
        <h1 className="text-4xl font-bold text-white font-display">MyTrivia TV</h1>
        <Sparkles className="w-8 h-8 text-yellow-400" />
      </motion.div>

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-white/10 backdrop-blur-xl rounded-3xl p-12 border border-white/20 shadow-2xl max-w-2xl w-full"
      >
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Smartphone className="w-6 h-6 text-purple-300" />
            <p className="text-purple-200 text-xl">Join with your phone</p>
          </div>
          <p className="text-purple-300/80">Visit the URL or scan the QR code</p>
        </div>

        {/* URL Display */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-white/5 rounded-2xl px-6 py-4 mb-8 text-center"
        >
          <p className="text-purple-200 text-sm mb-1">Go to</p>
          <p className="text-white text-2xl font-mono font-bold tracking-wide">
            mytrivia.io/join
          </p>
        </motion.div>

        <div className="flex items-center gap-8">
          {/* Code display */}
          <div className="flex-1">
            <p className="text-purple-200 text-center mb-4">Enter this code:</p>
            <div className="flex justify-center gap-2">
              {code?.split('').map((char, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, rotateY: -90 }}
                  animate={{ opacity: 1, rotateY: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="w-16 h-20 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl flex items-center justify-center text-white text-4xl font-bold font-mono shadow-lg"
                  style={{ perspective: 1000 }}
                >
                  {char}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="h-32 w-px bg-white/20" />

          {/* QR Code */}
          <div className="flex-shrink-0">
            <p className="text-purple-200 text-center mb-4">Or scan:</p>
            <div className="bg-white rounded-2xl p-4">
              <QRCodeSVG
                value={joinUrl}
                size={128}
                level="M"
                includeMargin={false}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Waiting indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-8 flex items-center gap-3"
      >
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-3 h-3 bg-purple-400 rounded-full"
        />
        <p className="text-purple-300">Waiting for players to join...</p>
      </motion.div>
    </div>
  );
};
