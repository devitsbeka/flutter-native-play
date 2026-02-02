import React from 'react';
import { motion } from 'framer-motion';
import { Smartphone, QrCode } from 'lucide-react';
import retroTvIcon from '@/assets/retro-tv-colored.png';
import myTriviaLogo from '@/assets/mytrivia-live-logo.png';
import { useTVGame } from '@/contexts/TVGameContext';

/**
 * TV Pairing Screen V3 - Shows a 4-digit code for phone pairing
 * Designed for TV display at mytrivia.io/tv
 */
export const TVPairingScreenV3: React.FC = () => {
  const { code } = useTVGame();
  const fourDigitCode = (code || '').padStart(4, '0');

  return (
    <div className="h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950 flex items-center justify-center p-6 overflow-hidden relative">

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
        {/* MyTriviaLive Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6 mt-8 flex justify-center"
        >
          <img 
            src={myTriviaLogo} 
            alt="MyTrivia LIVE" 
            className="h-14 w-auto"
            style={{
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4)) drop-shadow(0 8px 24px rgba(0,0,0,0.3))',
            }}
          />
        </motion.div>

        {/* Subtitle with TV Icon */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <div className="flex items-center justify-center gap-2">
            <img src={retroTvIcon} alt="TV" className="w-8 h-8 object-contain" />
            <span className="text-lg font-bold text-white">TV რეჟიმი</span>
            <span className="text-lg text-purple-200/80">-</span>
            <span className="text-lg text-purple-200/80">მოემზადეთ სახალისო თამაშისთვის!</span>
          </div>
        </motion.div>

        {/* Pairing Code Display */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mb-8"
        >
          <div 
            className="inline-block rounded-2xl p-5"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)',
              backdropFilter: 'blur(20px)',
              border: '2px solid rgba(255,255,255,0.2)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
            }}
          >
            <p className="text-purple-200 mb-2.5 text-sm">შეიყვანეთ ეს კოდი თქვენს ტელეფონზე</p>
            
            {/* 4-Digit Code Display */}
            <div className="flex justify-center gap-2.5">
              {fourDigitCode.split('').map((digit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="w-12 h-16 rounded-lg flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(180deg, #A855F7 0%, #7C3AED 100%)',
                    boxShadow: '0 6px 24px rgba(168, 85, 247, 0.4), inset 0 2px 4px rgba(255,255,255,0.3)',
                  }}
                >
                  <span className="text-3xl font-bold text-white" style={{ fontFamily: 'var(--font-display, inherit)' }}>
                    {digit}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="flex items-center gap-6 text-purple-200">
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Smartphone className="w-6 h-6" />
              </div>
              <span className="text-xs">გახსენით</span>
              <span className="font-bold text-sm">mytrivia.io/join</span>
            </div>
            
            <div className="text-2xl text-purple-400">→</div>
            
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <span className="text-lg font-bold">#</span>
              </div>
              <span className="text-xs">შეიყვანეთ კოდი</span>
            </div>
            
            <div className="text-2xl text-purple-400">→</div>
            
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <QrCode className="w-6 h-6" />
              </div>
              <span className="text-xs">მზად ხართ!</span>
            </div>
          </div>
        </motion.div>

        {/* Waiting Animation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-8"
        >
          <div className="flex items-center justify-center gap-2">
            <motion.div
              className="w-2.5 h-2.5 rounded-full bg-purple-400"
              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
            />
            <motion.div
              className="w-2.5 h-2.5 rounded-full bg-purple-400"
              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
            />
            <motion.div
              className="w-2.5 h-2.5 rounded-full bg-purple-400"
              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
            />
          </div>
          <p className="text-purple-300/60 mt-3 text-sm">მოლოდინი მოთამაშეების...</p>
        </motion.div>
      </div>
    </div>
  );
};
