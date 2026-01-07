import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTVGame } from '@/contexts/TVGameContext';
import { ChunkyButton } from '@/components/ui/chunky-button';
import { Input } from '@/components/ui/input';
import { Tv, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { GuestJoinModal } from './GuestJoinModal';

interface ControllerCodeEntryProps {
  initialCode?: string;
  onJoined: () => void;
}

export const ControllerCodeEntry: React.FC<ControllerCodeEntryProps> = ({ initialCode = '', onJoined }) => {
  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const { joinSession } = useTVGame();
  const { user, profile } = useAuth();

  // Auto-join if authenticated and code is provided
  useEffect(() => {
    if (initialCode && user && profile) {
      handleAuthenticatedJoin();
    }
  }, [initialCode, user, profile]);

  const handleAuthenticatedJoin = async () => {
    if (!code || code.length < 4 || !profile) return;
    
    setLoading(true);
    setError(null);
    
    const success = await joinSession(
      code.toUpperCase(), 
      profile.nickname, 
      profile.avatar_url || profile.animated_avatar_url || undefined
    );
    
    if (success) {
      onJoined();
    } else {
      setError('თამაში ვერ მოიძებნა. შეამოწმეთ კოდი.');
    }
    setLoading(false);
  };

  const handleGuestJoin = async (nickname: string) => {
    if (!code || code.length < 4) return;
    
    const success = await joinSession(code.toUpperCase(), nickname);
    
    if (success) {
      setShowGuestModal(false);
      onJoined();
    } else {
      setError('თამაში ვერ მოიძებნა. შეამოწმეთ კოდი.');
    }
  };

  const handleSubmitCode = () => {
    if (code.length < 4) return;
    
    if (user && profile) {
      handleAuthenticatedJoin();
    } else {
      setShowGuestModal(true);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setCode(value);
    setError(null);
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 mb-8"
        >
          <Tv className="w-8 h-8 text-purple-300" />
          <h1 className="text-2xl font-bold text-white">TV თამაშში შესვლა</h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm space-y-4"
        >
          {user && profile && (
            <div className="flex items-center gap-3 p-3 bg-white/10 rounded-xl mb-4">
              <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center overflow-hidden">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-bold">
                    {profile.nickname.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <p className="text-white font-medium">{profile.nickname}</p>
                <p className="text-purple-300 text-xs">ავტორიზებული</p>
              </div>
            </div>
          )}

          <div>
            <label className="text-purple-200 text-sm mb-2 block">თამაშის კოდი</label>
            <Input
              value={code}
              onChange={handleCodeChange}
              placeholder="შეიყვანეთ კოდი"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/40 h-14 text-center text-2xl font-mono tracking-widest"
              maxLength={6}
              autoFocus
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <ChunkyButton
            variant="primary"
            size="lg"
            onClick={handleSubmitCode}
            disabled={code.length < 4 || loading}
            icon={loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
            className="w-full"
          >
            {loading ? 'შემოსვლა...' : 'შესვლა'}
          </ChunkyButton>
        </motion.div>
      </div>

      {/* Guest Join Modal */}
      <GuestJoinModal
        isOpen={showGuestModal}
        onJoinAsGuest={handleGuestJoin}
        onClose={() => setShowGuestModal(false)}
        code={code}
      />
    </>
  );
};
