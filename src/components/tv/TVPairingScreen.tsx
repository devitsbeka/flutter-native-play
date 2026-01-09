import React from 'react';
import { motion } from 'framer-motion';
import { Tv, Users, Loader2 } from 'lucide-react';
import { useTVGame } from '@/contexts/TVGameContext';
import { Avatar } from '@/components/shared/Avatar';
import { ChunkyButton } from '@/components/ui/chunky-button';

interface TVPairingScreenProps {
  onStartGame: () => void;
}

export const TVPairingScreen: React.FC<TVPairingScreenProps> = ({ onStartGame }) => {
  const { code, players, isHost } = useTVGame();

  const codeChars = code?.split('') || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10 flex flex-col items-center justify-center p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-8"
      >
        <Tv className="w-12 h-12 text-primary" />
        <h1 className="text-4xl font-bold text-foreground">TV Game Show</h1>
      </motion.div>

      {/* Pairing Code */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-card border border-border rounded-3xl p-8 mb-8 shadow-2xl"
      >
        <p className="text-muted-foreground text-center mb-4 text-lg">
          შეიყვანეთ კოდი თქვენს ტელეფონში
        </p>
        <div className="flex gap-3 justify-center">
          {codeChars.map((char, index) => (
            <motion.div
              key={index}
              initial={{ rotateY: 90 }}
              animate={{ rotateY: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="w-16 h-20 bg-primary/10 border-2 border-primary rounded-xl flex items-center justify-center"
            >
              <span className="text-4xl font-bold text-primary">{char}</span>
            </motion.div>
          ))}
        </div>
        <p className="text-muted-foreground text-center mt-4 text-sm">
          ან გადადით: <span className="text-primary font-mono">mytrivia.io/tv/{code}</span>
        </p>
      </motion.div>

      {/* Connected Players */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="w-full max-w-2xl"
      >
        <div className="flex items-center justify-center gap-2 mb-6">
          <Users className="w-5 h-5 text-muted-foreground" />
          <span className="text-muted-foreground">
            {players.length} მოთამაშე დაკავშირებულია
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8">
          {players.map((player, index) => (
            <motion.div
              key={player.id}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.6 + index * 0.1, type: 'spring' }}
              className="bg-card border border-border rounded-2xl p-4 flex flex-col items-center gap-2"
            >
              <Avatar
                imageUrl={player.avatar_url}
                emoji={player.nickname?.[0] || '👤'}
                size="lg"
              />
              <span className="text-foreground font-medium text-sm truncate max-w-full">
                {player.nickname}
              </span>
            </motion.div>
          ))}

          {/* Waiting for players placeholder */}
          {players.length < 2 && (
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="bg-card/50 border border-dashed border-border rounded-2xl p-4 flex flex-col items-center justify-center gap-2"
            >
              <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
              <span className="text-muted-foreground text-sm">ველოდებით...</span>
            </motion.div>
          )}
        </div>

        {/* Start Button (Host only) */}
        {isHost && players.length >= 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex justify-center"
          >
            <ChunkyButton
              variant="primary"
              size="lg"
              onClick={onStartGame}
            >
              თამაშის დაწყება
            </ChunkyButton>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};
