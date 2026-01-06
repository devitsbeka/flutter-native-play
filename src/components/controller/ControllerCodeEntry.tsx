import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTVGame } from '@/contexts/TVGameContext';
import { ChunkyButton } from '@/components/ui/chunky-button';
import { Input } from '@/components/ui/input';
import { Tv, ArrowRight } from 'lucide-react';

interface ControllerCodeEntryProps {
  initialCode?: string;
  onJoined: () => void;
}

export const ControllerCodeEntry: React.FC<ControllerCodeEntryProps> = ({ initialCode = '', onJoined }) => {
  const [code, setCode] = useState(initialCode);
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { joinSession } = useTVGame();

  const handleJoin = async () => {
    if (code.length < 4 || !nickname.trim()) return;
    
    setLoading(true);
    setError(null);
    
    const success = await joinSession(code.toUpperCase(), nickname.trim());
    
    if (success) {
      onJoined();
    } else {
      setError('Game not found. Check your code.');
    }
    setLoading(false);
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setCode(value);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 mb-8"
      >
        <Tv className="w-8 h-8 text-purple-300" />
        <h1 className="text-2xl font-bold text-white">Join TV Game</h1>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm space-y-4"
      >
        <div>
          <label className="text-purple-200 text-sm mb-2 block">Your nickname</label>
          <Input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Enter your name"
            className="bg-white/10 border-white/20 text-white placeholder:text-white/40 h-12"
            maxLength={20}
          />
        </div>

        <div>
          <label className="text-purple-200 text-sm mb-2 block">Game code</label>
          <Input
            value={code}
            onChange={handleCodeChange}
            placeholder="Enter code from TV"
            className="bg-white/10 border-white/20 text-white placeholder:text-white/40 h-14 text-center text-2xl font-mono tracking-widest"
            maxLength={6}
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}

        <ChunkyButton
          variant="primary"
          size="lg"
          onClick={handleJoin}
          disabled={code.length < 4 || !nickname.trim() || loading}
          icon={<ArrowRight className="w-5 h-5" />}
          className="w-full"
        >
          {loading ? 'Joining...' : 'Join Game'}
        </ChunkyButton>
      </motion.div>
    </div>
  );
};
