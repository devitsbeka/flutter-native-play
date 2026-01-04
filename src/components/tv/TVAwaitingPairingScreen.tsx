import React from 'react';
import { motion } from 'framer-motion';
import { Tv, Smartphone } from 'lucide-react';

interface TVAwaitingPairingScreenProps {
  pairingCode: string;
}

export const TVAwaitingPairingScreen: React.FC<TVAwaitingPairingScreenProps> = ({ 
  pairingCode 
}) => {
  const codeChars = pairingCode.split('');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10 flex flex-col items-center justify-center p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 mb-12"
      >
        <Tv className="w-16 h-16 text-primary" />
        <h1 className="text-5xl font-bold text-foreground">TV Game Show</h1>
      </motion.div>

      {/* Main Card */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-card border-2 border-border rounded-3xl p-12 shadow-2xl max-w-2xl w-full text-center"
      >
        {/* Instructions */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <Smartphone className="w-8 h-8 text-primary" />
          <p className="text-muted-foreground text-2xl">
            შეიყვანე ეს კოდი შენს ტელეფონში
          </p>
        </div>

        {/* Pairing Code Display */}
        <div className="flex gap-4 justify-center mb-8">
          {codeChars.map((char, index) => (
            <motion.div
              key={index}
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              transition={{ delay: 0.3 + index * 0.15 }}
              className="w-24 h-32 bg-primary/10 border-4 border-primary rounded-2xl flex items-center justify-center shadow-lg"
            >
              <span className="text-7xl font-bold text-primary">{char}</span>
            </motion.div>
          ))}
        </div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-muted-foreground text-lg"
        >
          ტელეფონში აირჩიე <span className="text-primary font-semibold">"TV-თან დაკავშირება"</span>
        </motion.p>
      </motion.div>

      {/* Loading indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-12 flex items-center gap-3"
      >
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-3 h-3 rounded-full bg-primary"
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
          className="w-3 h-3 rounded-full bg-primary"
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
          className="w-3 h-3 rounded-full bg-primary"
        />
        <span className="text-muted-foreground text-xl ml-2">ველოდებით მასპინძელს...</span>
      </motion.div>
    </div>
  );
};
