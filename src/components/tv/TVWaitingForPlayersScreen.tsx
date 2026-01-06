import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tv, Users, Loader2, QrCode, Sparkles } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Avatar } from '@/components/shared/Avatar';
import { ChunkyButton } from '@/components/ui/chunky-button';

interface Player {
  id: string;
  nickname: string;
  avatar_url?: string;
  score: number;
}

interface TVWaitingForPlayersScreenProps {
  guestJoinCode: string;
  players: Player[];
  onStartGame: () => void;
}

export const TVWaitingForPlayersScreen: React.FC<TVWaitingForPlayersScreenProps> = ({
  guestJoinCode,
  players,
  onStartGame,
}) => {
  const joinUrl = `${window.location.origin}/controller/${guestJoinCode}`;
  const [newPlayerIds, setNewPlayerIds] = useState<Set<string>>(new Set());
  const prevPlayersRef = useRef<Player[]>([]);

  // Track new players for animation
  useEffect(() => {
    const prevIds = new Set(prevPlayersRef.current.map(p => p.id));
    const newIds = players.filter(p => !prevIds.has(p.id)).map(p => p.id);
    
    if (newIds.length > 0) {
      setNewPlayerIds(new Set(newIds));
      // Clear the "new" status after animation
      setTimeout(() => setNewPlayerIds(new Set()), 2000);
    }
    
    prevPlayersRef.current = players;
  }, [players]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10 flex flex-col p-8 relative overflow-hidden">
      {/* Animated background particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-primary/20"
            initial={{ 
              x: Math.random() * 100 + '%', 
              y: '100%',
              opacity: 0 
            }}
            animate={{ 
              y: '-10%',
              opacity: [0, 0.5, 0],
            }}
            transition={{
              duration: 8 + Math.random() * 4,
              repeat: Infinity,
              delay: i * 2,
              ease: 'linear'
            }}
          />
        ))}
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-center gap-3 mb-8"
      >
        <Tv className="w-10 h-10 text-primary" />
        <h1 className="text-3xl font-bold text-foreground">TV Game Show</h1>
      </motion.div>

      <div className="flex-1 flex gap-8">
        {/* Left side - QR Code */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex-1 flex flex-col items-center justify-center"
        >
          <div className="bg-card border-2 border-border rounded-3xl p-8 shadow-2xl text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <QrCode className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">შემოუერთდი თამაშს</h2>
            </div>
            
            <p className="text-muted-foreground mb-6">
              დაასკანერე QR კოდი შენი ტელეფონით
            </p>

            {/* QR Code with pulse effect */}
            <motion.div 
              className="bg-white p-6 rounded-2xl inline-block mb-6 relative"
              animate={{ 
                boxShadow: [
                  '0 0 0 0 rgba(var(--primary), 0)',
                  '0 0 0 10px rgba(var(--primary), 0.1)',
                  '0 0 0 0 rgba(var(--primary), 0)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <QRCodeSVG 
                value={joinUrl} 
                size={280}
                level="H"
                includeMargin
              />
            </motion.div>

            {/* Join code display */}
            <div className="bg-primary/10 rounded-xl p-4 mb-4">
              <p className="text-muted-foreground text-sm mb-1">ან შეიყვანე კოდი:</p>
              <p className="text-primary font-mono text-3xl font-bold tracking-widest">
                {guestJoinCode}
              </p>
            </div>

            <p className="text-muted-foreground text-xs break-all max-w-[280px] mx-auto">
              {joinUrl}
            </p>
          </div>
        </motion.div>

        {/* Right side - Connected Players */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="flex-1 flex flex-col"
        >
          <div className="bg-card border border-border rounded-3xl p-6 flex-1">
            <motion.div 
              className="flex items-center justify-center gap-2 mb-6"
              animate={players.length > 0 ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              <Users className="w-6 h-6 text-muted-foreground" />
              <span className="text-muted-foreground text-lg">
                {players.length} მოთამაშე დაკავშირებულია
              </span>
            </motion.div>

            {/* Players Grid */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <AnimatePresence mode="popLayout">
                {players.map((player) => {
                  const isNew = newPlayerIds.has(player.id);
                  return (
                    <motion.div
                      key={player.id}
                      layout
                      initial={{ scale: 0, rotate: -10, opacity: 0 }}
                      animate={{ 
                        scale: 1, 
                        rotate: 0, 
                        opacity: 1,
                      }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ 
                        type: 'spring',
                        stiffness: 500,
                        damping: 25
                      }}
                      className={`relative bg-background border-2 rounded-2xl p-4 flex flex-col items-center gap-2 ${
                        isNew ? 'border-primary' : 'border-border'
                      }`}
                    >
                      {/* New player sparkle effect */}
                      {isNew && (
                        <>
                          <motion.div
                            className="absolute -top-2 -right-2"
                            initial={{ scale: 0, rotate: -45 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: 0.2 }}
                          >
                            <Sparkles className="w-6 h-6 text-primary" />
                          </motion.div>
                          <motion.div
                            className="absolute inset-0 rounded-2xl bg-primary/20"
                            initial={{ opacity: 1 }}
                            animate={{ opacity: 0 }}
                            transition={{ duration: 1 }}
                          />
                        </>
                      )}
                      
                      <motion.div
                        animate={isNew ? { 
                          scale: [1, 1.2, 1],
                          rotate: [0, 5, -5, 0]
                        } : {}}
                        transition={{ duration: 0.5 }}
                      >
                        <Avatar
                          imageUrl={player.avatar_url}
                          emoji={player.nickname?.[0] || '👤'}
                          size="lg"
                        />
                      </motion.div>
                      <span className="text-foreground font-medium text-sm truncate max-w-full">
                        {player.nickname}
                      </span>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Waiting placeholder slots */}
              {Array.from({ length: Math.max(0, 6 - players.length) }).map((_, index) => (
                <motion.div
                  key={`placeholder-${index}`}
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, delay: index * 0.2 }}
                  className="bg-background/50 border border-dashed border-border rounded-2xl p-4 flex flex-col items-center justify-center gap-2 min-h-[120px]"
                >
                  <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                  <span className="text-muted-foreground text-sm">ველოდებით...</span>
                </motion.div>
              ))}
            </div>

            {/* Start Game Button */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-center"
            >
              <p className="text-muted-foreground mb-4">
                მასპინძელმა ტელეფონიდან უნდა დააჭიროს "დაწყება"
              </p>
              
              {players.length >= 1 && (
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring' }}
                >
                  <ChunkyButton
                    variant="primary"
                    size="lg"
                    onClick={onStartGame}
                    className="text-xl px-12"
                  >
                    თამაშის დაწყება
                  </ChunkyButton>
                </motion.div>
              )}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
