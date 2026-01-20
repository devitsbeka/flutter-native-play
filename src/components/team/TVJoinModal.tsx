import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChunkyButton } from '@/components/ui/chunky-button';
import { Input } from '@/components/ui/input';
import { Tv, ArrowRight, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TVJoinModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TVJoinModal: React.FC<TVJoinModalProps> = ({ open, onOpenChange }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleJoin = () => {
    if (code.length !== 4) return;
    setLoading(true);
    // Use /join/:code which uses TVGameContext with proper code lookup
    navigate(`/join/${code}`);
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Hard switch: only accept the 4-digit code shown on the TV.
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCode(value);
  };

  const handleClose = () => {
    setCode('');
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background flex flex-col"
        >
          {/* Fixed Header */}
          <div className="flex-shrink-0 border-b border-border/50 bg-background/95 backdrop-blur-sm">
            <div className="max-w-[700px] md:max-w-[520px] mx-auto w-full flex items-center gap-3 px-4 py-3">
              <button
                onClick={handleClose}
                className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-muted-foreground" />
              </button>
              <h2 className="text-lg font-bold text-foreground">Join TV Game</h2>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center">
            <div className="max-w-[700px] md:max-w-[520px] mx-auto w-full px-4 py-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-sm space-y-6"
            >
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Tv className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Enter Game Code</h3>
                <p className="text-muted-foreground text-sm">
                  Enter the code shown on the TV screen to join the game
                </p>
              </div>

              <Input
                value={code}
                onChange={handleCodeChange}
                placeholder="Enter code"
                className="text-center text-2xl font-mono tracking-widest h-16 rounded-xl"
                maxLength={4}
                autoFocus
              />

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: code.length >= 4 ? 1 : 0.5 }}
              >
                <ChunkyButton
                  variant="primary"
                  size="lg"
                  onClick={handleJoin}
                  disabled={code.length < 4 || loading}
                  icon={<ArrowRight className="w-5 h-5" />}
                  className="w-full"
                >
                  {loading ? 'Connecting...' : 'Join Game'}
                </ChunkyButton>
              </motion.div>
            </motion.div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
