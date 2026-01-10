import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Tv, Smartphone, QrCode } from 'lucide-react';
import { useTVGame } from '@/contexts/TVGameContext';

/**
 * TV Pairing Screen V3 - Shows a 4-digit code for phone pairing
 * Designed for TV display at mytrivia.io/tv
 */
export const TVPairingScreenV3: React.FC = () => {
  const { code } = useTVGame();
  const [fourDigitCode, setFourDigitCode] = useState<string>('');

  // Generate a simple 4-digit code from the 6-char alphanumeric code
  useEffect(() => {
    if (code) {
      // Create a 4-digit code by hashing the alphanumeric code
      const hash = code.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const digits = String(hash % 10000).padStart(4, '0');
      setFourDigitCode(digits);
    }
  }, [code]);

  return (
    <div className="h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950 flex items-center justify-center p-6 overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-purple-400/20"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [-20, 20, -20],
              opacity: [0.2, 0.5, 0.2],
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

      <div className="relative z-10 text-center max-w-2xl mx-auto">
        {/* Logo/Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <div className="flex items-center justify-center gap-4 mb-4">
            <Tv className="w-16 h-16 text-purple-300" />
          </div>
          <h1 
            className="text-5xl font-bold text-white mb-2"
            style={{ fontFamily: 'var(--font-display, inherit)' }}
          >
            TV კვიზი
          </h1>
          <p className="text-xl text-purple-200/80">მოემზადეთ სახალისო თამაშისთვის!</p>
        </motion.div>

        {/* Pairing Code Display */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mb-12"
        >
          <div 
            className="inline-block rounded-3xl p-8"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)',
              backdropFilter: 'blur(20px)',
              border: '2px solid rgba(255,255,255,0.2)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            }}
          >
            <p className="text-purple-200 mb-4 text-lg">შეიყვანეთ ეს კოდი თქვენს ტელეფონზე</p>
            
            {/* 4-Digit Code Display */}
            <div className="flex justify-center gap-4 mb-4">
              {fourDigitCode.split('').map((digit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="w-20 h-24 rounded-2xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(180deg, #A855F7 0%, #7C3AED 100%)',
                    boxShadow: '0 8px 32px rgba(168, 85, 247, 0.4), inset 0 2px 4px rgba(255,255,255,0.3)',
                  }}
                >
                  <span className="text-5xl font-bold text-white" style={{ fontFamily: 'var(--font-display, inherit)' }}>
                    {digit}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* Full Code (smaller) */}
            <p className="text-purple-300/60 text-sm">
              ან გამოიყენეთ კოდი: <span className="font-mono font-bold text-purple-200">{code}</span>
            </p>
          </div>
        </motion.div>

        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col items-center gap-6"
        >
          <div className="flex items-center gap-8 text-purple-200">
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Smartphone className="w-8 h-8" />
              </div>
              <span className="text-sm">გახსენით</span>
              <span className="font-bold">mytrivia.io/join</span>
            </div>
            
            <div className="text-3xl text-purple-400">→</div>
            
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center">
                <span className="text-2xl font-bold">1234</span>
              </div>
              <span className="text-sm">შეიყვანეთ კოდი</span>
            </div>
            
            <div className="text-3xl text-purple-400">→</div>
            
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center">
                <QrCode className="w-8 h-8" />
              </div>
              <span className="text-sm">მზად ხართ!</span>
            </div>
          </div>
        </motion.div>

        {/* Waiting Animation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-12"
        >
          <div className="flex items-center justify-center gap-2">
            <motion.div
              className="w-3 h-3 rounded-full bg-purple-400"
              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
            />
            <motion.div
              className="w-3 h-3 rounded-full bg-purple-400"
              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
            />
            <motion.div
              className="w-3 h-3 rounded-full bg-purple-400"
              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
            />
          </div>
          <p className="text-purple-300/60 mt-4">მოლოდინი მოთამაშეების...</p>
        </motion.div>
      </div>
    </div>
  );
};
