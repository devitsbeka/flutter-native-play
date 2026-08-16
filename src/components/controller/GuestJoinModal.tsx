import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Sparkles, Gift, TrendingUp, ArrowRight, Loader2 } from 'lucide-react';
import { ChunkyButton } from '@/components/ui/chunky-button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

interface GuestJoinModalProps {
  isOpen: boolean;
  onJoinAsGuest: (nickname: string) => Promise<void>;
  onClose?: () => void;
  code: string;
  inline?: boolean;
}

export const GuestJoinModal = React.forwardRef<HTMLDivElement, GuestJoinModalProps>(
  function GuestJoinModal({ isOpen, onJoinAsGuest, onClose, code, inline }, ref) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [nickname, setNickname] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [showSignupBenefits, setShowSignupBenefits] = useState(false);
  const [nicknameError, setNicknameError] = useState<string | null>(null);

  const validateNickname = (value: string): boolean => {
    const trimmed = value.trim();
    if (trimmed.length < 2) { setNicknameError(t('guestJoin.minChars')); return false; }
    if (trimmed.length > 20) { setNicknameError(t('guestJoin.maxChars')); return false; }
    const validPattern = /^[\p{L}\p{N}\s]+$/u;
    if (!validPattern.test(trimmed)) { setNicknameError(t('guestJoin.lettersOnly')); return false; }
    const reserved = ['TV_DISPLAY', 'TV_MIRROR', 'SYSTEM', 'ADMIN', 'HOST'];
    if (reserved.includes(trimmed.toUpperCase())) { setNicknameError(t('guestJoin.reservedName')); return false; }
    setNicknameError(null);
    return true;
  };

  const handleNicknameChange = (value: string) => {
    setNickname(value);
    if (nicknameError) validateNickname(value);
  };

  const handleGuestJoin = async () => {
    if (!nickname.trim() || isJoining) return;
    if (!validateNickname(nickname)) return;
    setIsJoining(true);
    try { await onJoinAsGuest(nickname.trim()); } finally { setIsJoining(false); }
  };

  const handleSignup = () => {
    const returnUrl = `/join?code=${code}&autoJoin=true`;
    navigate(`/auth?returnTo=${encodeURIComponent(returnUrl)}`);
  };

  const benefits = [
    { icon: Sparkles, text: t('guestJoin.benefitAvatar'), color: 'text-purple-400' },
    { icon: Gift, text: t('guestJoin.benefitRewards'), color: 'text-yellow-400' },
    { icon: TrendingUp, text: t('guestJoin.benefitProgress'), color: 'text-green-400' },
  ];

  const modalContent = (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}
          className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-2xl">
          <User className="w-10 h-10 text-white" />
        </motion.div>
        <h2 className="text-2xl font-bold text-white mb-2">{t('guestJoin.title')}</h2>
        <p className="text-purple-200/80">{t('guestJoin.subtitle')}</p>
      </div>

      <div className="mb-6">
        <Input value={nickname} onChange={(e) => handleNicknameChange(e.target.value)}
          placeholder={t('guestJoin.namePlaceholder')} maxLength={20}
          className={`w-full h-14 text-lg text-center bg-white/10 border-2 rounded-2xl text-white placeholder:text-purple-300/50 focus:ring-purple-400/20 ${
            nicknameError ? 'border-red-400/50 focus:border-red-400' : 'border-purple-400/30 focus:border-purple-400'
          }`}
          onKeyDown={(e) => e.key === 'Enter' && handleGuestJoin()}
          onBlur={() => nickname.trim() && validateNickname(nickname)}
          autoFocus={!inline}
        />
        {nicknameError && <p className="text-red-400 text-sm mt-2 text-center">{nicknameError}</p>}
      </div>

      <ChunkyButton variant="primary" size="lg" onClick={handleGuestJoin}
        disabled={!nickname.trim() || isJoining} className="w-full mb-6"
        icon={isJoining ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}>
        {isJoining ? t('guestJoin.joining') : t('guestJoin.joinGame')}
      </ChunkyButton>

      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-purple-400/30" />
        <span className="text-purple-300/60 text-sm">{t('guestJoin.or')}</span>
        <div className="flex-1 h-px bg-purple-400/30" />
      </div>

      <motion.div initial={{ height: 'auto' }} animate={{ height: 'auto' }} className="rounded-2xl overflow-hidden"
        style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)', border: '1px solid rgba(255,255,255,0.15)' }}>
        <button onClick={() => setShowSignupBenefits(!showSignupBenefits)} className="w-full p-4 flex items-center justify-between">
          <span className="text-white font-medium">{t('guestJoin.createAccount')}</span>
          <motion.div animate={{ rotate: showSignupBenefits ? 180 : 0 }} className="text-purple-300">↓</motion.div>
        </button>
        <AnimatePresence>
          {showSignupBenefits && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="p-4 pt-0 space-y-3">
                {benefits.map((benefit, index) => (
                  <motion.div key={index} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }} className="flex items-center gap-3">
                    <benefit.icon className={`w-5 h-5 ${benefit.color}`} />
                    <span className="text-white/80">{benefit.text}</span>
                  </motion.div>
                ))}
                <ChunkyButton variant="secondary" size="md" onClick={handleSignup} className="w-full mt-4" icon={<Sparkles className="w-4 h-4" />}>
                  {t('guestJoin.createAccountButton')}
                </ChunkyButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );

  if (inline && isOpen) {
    return <div ref={ref} className="w-full px-4">{modalContent}</div>;
  }

  return (
    <div ref={ref}>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 safe-screen z-50 flex items-center justify-center p-4 bg-gradient-to-br from-purple-900/95 via-purple-800/95 to-indigo-900/95 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}>
              {modalContent}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

GuestJoinModal.displayName = "GuestJoinModal";
