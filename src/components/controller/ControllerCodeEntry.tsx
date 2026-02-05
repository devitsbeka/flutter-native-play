import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTVGame } from '@/contexts/TVGameContext';
import { ChunkyButton } from '@/components/ui/chunky-button';
import { Input } from '@/components/ui/input';
import { Tv, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { resolveAvatarUrl } from '@/utils/avatarUtils';

interface ControllerCodeEntryProps {
  initialCode?: string;
  onJoined: () => void;
}

export const ControllerCodeEntry: React.FC<ControllerCodeEntryProps> = ({ initialCode = '', onJoined }) => {
  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { joinSession } = useTVGame();
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const isUuid = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());

  // Auto-join if authenticated and code is provided
  useEffect(() => {
    // Wait for auth to finish loading before making decisions
    if (authLoading) return;
    
    const attemptAutoJoin = async () => {
      const trimmed = (initialCode || '').trim();
      if (!trimmed || loading) return;

      // If user is not authenticated, redirect to auth with return URL
      if (!user) {
        const returnUrl = isUuid(trimmed) 
          ? `/join/session/${trimmed}` 
          : `/join?code=${trimmed}`;
        navigate(`/auth?returnTo=${encodeURIComponent(returnUrl)}`);
        return;
      }

      if (user && profile) {
        setLoading(true);
        setError(null);

        const codeForJoin = isUuid(trimmed) ? trimmed : trimmed.toUpperCase();
        
        const success = await joinSession(
          codeForJoin,
          profile.nickname, 
          profile.avatar_url || profile.animated_avatar_url || undefined
        );
        
        if (success) {
          onJoined();
        } else {
          setError('თამაში ვერ მოიძებნა. შეამოწმეთ კოდი.');
        }
        setLoading(false);
      }
    };
    
    attemptAutoJoin();
  }, [initialCode, user, profile?.nickname, authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleJoin = async (codeToJoin: string, nickname: string, avatarUrl?: string) => {
    if (!codeToJoin || codeToJoin.length < 4) {
      setError('კოდი უნდა იყოს მინიმუმ 4 სიმბოლო');
      return false;
    }
    
    setLoading(true);
    setError(null);
    
    const normalized = codeToJoin.trim();
    const success = await joinSession(
      isUuid(normalized) ? normalized : normalized.toUpperCase(),
      nickname, 
      avatarUrl
    );
    
    if (success) {
      onJoined();
    } else {
      setError('თამაში ვერ მოიძებნა. შეამოწმეთ კოდი.');
    }
    setLoading(false);
    return success;
  };

  const handleSubmitCode = async () => {
    if (code.length < 4) {
      setError('კოდი უნდა იყოს მინიმუმ 4 სიმბოლო');
      return;
    }
    
    if (user && profile) {
      await handleJoin(code, profile.nickname, profile.avatar_url || profile.animated_avatar_url || undefined);
    } else {
      // Redirect to auth with return URL
      const returnUrl = isUuid(code) 
        ? `/join/session/${code}` 
        : `/join?code=${code}`;
      navigate(`/auth?returnTo=${encodeURIComponent(returnUrl)}`);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Hard switch: manual entry is the 4-digit code shown on the TV.
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCode(value);
    setError(null);
  };

  // Show loading while auth is checking
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex flex-col items-center justify-center p-6">
        <Loader2 className="w-12 h-12 text-purple-300 animate-spin mb-4" />
        <p className="text-white text-lg">იტვირთება...</p>
      </div>
    );
  }

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
                  <img src={resolveAvatarUrl(profile.avatar_url) || profile.avatar_url} alt="" className="w-full h-full object-cover" />
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
              maxLength={4}
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
    </>
  );
};
