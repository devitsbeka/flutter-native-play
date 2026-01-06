import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tv, Users, Loader2, QrCode, Sparkles, Gamepad2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Avatar } from '@/components/shared/Avatar';

interface Player {
  id: string;
  nickname: string;
  avatar_url?: string;
  score: number;
  isHost?: boolean;
}

interface TVWaitingForPlayersScreenProps {
  guestJoinCode: string;
  players: Player[];
  onStartGame?: () => void;
  gameName?: string;
  categoryName?: string;
  categoryIcon?: string;
}

export const TVWaitingForPlayersScreen: React.FC<TVWaitingForPlayersScreenProps> = ({
  guestJoinCode,
  players,
  onStartGame,
  gameName = 'TV კვიზი',
  categoryName,
  categoryIcon,
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
      setTimeout(() => setNewPlayerIds(new Set()), 2000);
    }
    
    prevPlayersRef.current = players;
  }, [players]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex flex-col p-8 relative overflow-hidden">
      {/* Animated background particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-white/10"
            initial={{ 
              x: `${Math.random() * 100}%`, 
              y: '110%',
              opacity: 0 
            }}
            animate={{ 
              y: '-10%',
              opacity: [0, 0.6, 0],
            }}
            transition={{
              duration: 8 + Math.random() * 6,
              repeat: Infinity,
              delay: i * 0.5,
              ease: 'linear'
            }}
          />
        ))}
        {/* Glowing orbs */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-purple-500/20 blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 5, repeat: Infinity }}
        />
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-center gap-4 mb-8 relative z-10"
      >
        <motion.div
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Tv className="w-12 h-12 text-purple-300" />
        </motion.div>
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white drop-shadow-lg">{gameName}</h1>
          {categoryName && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-center gap-2 mt-2"
            >
              {categoryIcon && <span className="text-2xl">{categoryIcon}</span>}
              <span className="text-xl text-purple-200">{categoryName}</span>
            </motion.div>
          )}
        </div>
        <motion.div
          animate={{ rotate: [0, -5, 5, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
        >
          <Gamepad2 className="w-12 h-12 text-purple-300" />
        </motion.div>
      </motion.div>

      <div className="flex-1 flex gap-8 relative z-10">
        {/* Left side - QR Code */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex-1 flex flex-col items-center justify-center"
        >
          <motion.div 
            className="bg-white/10 backdrop-blur-md border-2 border-white/20 rounded-3xl p-8 shadow-2xl text-center"
            animate={{
              boxShadow: [
                '0 0 30px rgba(168, 85, 247, 0.3)',
                '0 0 60px rgba(168, 85, 247, 0.5)',
                '0 0 30px rgba(168, 85, 247, 0.3)',
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="flex items-center justify-center gap-2 mb-4">
              <QrCode className="w-7 h-7 text-purple-300" />
              <h2 className="text-2xl font-bold text-white">შემოუერთდი თამაშს</h2>
            </div>
            
            <p className="text-purple-200 mb-6">
              დაასკანერე QR კოდი შენი ტელეფონით
            </p>

            {/* QR Code with pulse effect */}
            <motion.div 
              className="bg-white p-6 rounded-2xl inline-block mb-6 relative"
              animate={{ 
                boxShadow: [
                  '0 0 0 0 rgba(255, 255, 255, 0)',
                  '0 0 0 15px rgba(255, 255, 255, 0.1)',
                  '0 0 0 0 rgba(255, 255, 255, 0)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <QRCodeSVG 
                value={joinUrl} 
                size={240}
                level="H"
                includeMargin
              />
            </motion.div>

            {/* Join code display */}
            <motion.div 
              className="bg-purple-500/30 border border-purple-400/30 rounded-xl p-4 mb-4"
              whileHover={{ scale: 1.02 }}
            >
              <p className="text-purple-200 text-sm mb-1">ან შეიყვანე კოდი:</p>
              <p className="text-white font-mono text-4xl font-bold tracking-[0.3em]">
                {guestJoinCode}
              </p>
            </motion.div>

            <p className="text-purple-300/60 text-xs break-all max-w-[280px] mx-auto">
              {joinUrl}
            </p>
          </motion.div>
        </motion.div>

        {/* Right side - Connected Players */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="flex-1 flex flex-col"
        >
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 flex-1">
            <motion.div 
              className="flex items-center justify-center gap-3 mb-6"
              animate={players.length > 0 ? { scale: [1, 1.02, 1] } : {}}
              transition={{ duration: 0.5 }}
            >
              <Users className="w-7 h-7 text-purple-300" />
              <span className="text-purple-100 text-xl font-medium">
                {players.length} მოთამაშე დაკავშირებულია
              </span>
            </motion.div>

            {/* Players Grid */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <AnimatePresence mode="popLayout">
                {players.map((player) => {
                  const isNew = newPlayerIds.has(player.id);
                  return (
                    <motion.div
                      key={player.id}
                      layout
                      initial={{ scale: 0, rotate: -15, opacity: 0 }}
                      animate={{ 
                        scale: 1, 
                        rotate: 0, 
                        opacity: 1,
                      }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ 
                        type: 'spring',
                        stiffness: 400,
                        damping: 20
                      }}
                      className={`relative bg-white/10 backdrop-blur-sm border-2 rounded-2xl p-4 flex flex-col items-center gap-2 ${
                        isNew ? 'border-purple-400' : player.isHost ? 'border-yellow-400' : 'border-white/20'
                      }`}
                    >
                      {/* Host badge */}
                      {player.isHost && (
                        <motion.div
                          className="absolute -top-2 -right-2 bg-yellow-500 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                        >
                          HOST
                        </motion.div>
                      )}

                      {/* New player sparkle effect */}
                      {isNew && (
                        <>
                          <motion.div
                            className="absolute -top-2 -right-2"
                            initial={{ scale: 0, rotate: -45 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: 0.2 }}
                          >
                            <Sparkles className="w-6 h-6 text-purple-300" />
                          </motion.div>
                          <motion.div
                            className="absolute inset-0 rounded-2xl bg-purple-400/30"
                            initial={{ opacity: 1 }}
                            animate={{ opacity: 0 }}
                            transition={{ duration: 1 }}
                          />
                        </>
                      )}
                      
                      <motion.div
                        animate={isNew ? { 
                          scale: [1, 1.2, 1],
                          rotate: [0, 10, -10, 0]
                        } : {}}
                        transition={{ duration: 0.5 }}
                      >
                        <Avatar
                          imageUrl={player.avatar_url}
                          emoji={player.nickname?.[0] || '👤'}
                          size="lg"
                        />
                      </motion.div>
                      <span className="text-white font-medium text-sm truncate max-w-full">
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
                  animate={{ opacity: [0.3, 0.5, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, delay: index * 0.2 }}
                  className="bg-white/5 border border-dashed border-white/20 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 min-h-[120px]"
                >
                  <Loader2 className="w-8 h-8 text-purple-300/50 animate-spin" />
                  <span className="text-purple-200/50 text-sm">ველოდებით...</span>
                </motion.div>
              ))}
            </div>

            {/* Start Game hint */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-center"
            >
              <motion.p 
                className="text-purple-200/80"
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                მასპინძელმა ტელეფონიდან უნდა დააჭიროს "დაწყება"
              </motion.p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
