import React from 'react';
import { motion } from 'framer-motion';
import { Tv, Users, Loader2, QrCode } from 'lucide-react';
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
  // Generate the controller join URL using the guest join code
  const joinUrl = `${window.location.origin}/controller/${guestJoinCode}`;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10 flex flex-col p-8">
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

            {/* QR Code */}
            <div className="bg-white p-6 rounded-2xl inline-block mb-6">
              <QRCodeSVG 
                value={joinUrl} 
                size={280}
                level="H"
                includeMargin
              />
            </div>

            {/* Manual URL */}
            <p className="text-muted-foreground text-sm">
              ან შედი ბმულზე:
            </p>
            <p className="text-primary font-mono text-lg break-all">
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
            <div className="flex items-center justify-center gap-2 mb-6">
              <Users className="w-6 h-6 text-muted-foreground" />
              <span className="text-muted-foreground text-lg">
                {players.length} მოთამაშე დაკავშირებულია
              </span>
            </div>

            {/* Players Grid */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {players.map((player, index) => (
                <motion.div
                  key={player.id}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4 + index * 0.1, type: 'spring' }}
                  className="bg-background border border-border rounded-2xl p-4 flex flex-col items-center gap-2"
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
                <ChunkyButton
                  variant="primary"
                  size="lg"
                  onClick={onStartGame}
                  className="text-xl px-12"
                >
                  თამაშის დაწყება
                </ChunkyButton>
              )}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
