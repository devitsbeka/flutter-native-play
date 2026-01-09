import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChunkyButton } from '@/components/ui/chunky-button';
import { Input } from '@/components/ui/input';
import { Tv, ArrowRight } from 'lucide-react';
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
    if (code.length < 4) return;
    setLoading(true);
    navigate(`/controller/${code.toUpperCase()}`);
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Accept both 4-digit numeric and 6-char alphanumeric codes
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setCode(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tv className="w-5 h-5 text-primary" />
            Join TV Game
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-muted-foreground text-sm mb-4">
            Enter the code shown on the TV screen to join the game:
          </p>

          <Input
            value={code}
            onChange={handleCodeChange}
            placeholder="Enter code"
            className="text-center text-2xl font-mono tracking-widest h-14"
            maxLength={6}
            autoFocus
          />

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: code.length >= 4 ? 1 : 0.5 }}
            className="mt-6"
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
        </div>
      </DialogContent>
    </Dialog>
  );
};
