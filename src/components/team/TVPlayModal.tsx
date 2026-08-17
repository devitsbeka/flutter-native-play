import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import retroTvIcon from '@/assets/retro-tv-colored.png';
import { ChunkyButton } from '@/components/ui/chunky-button';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';

interface TVPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId?: string;
  categoryId?: string;
  categoryName?: string;
}

export const TVPlayModal: React.FC<TVPlayModalProps> = ({
  isOpen,
  onClose,
  roomId,
  categoryId,
  categoryName,
}) => {
  const { t } = useLanguage();
  const [code, setCode] = useState('');
  const [isPairing, setIsPairing] = useState(false);
  const [pairSuccess, setPairSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setCode(value);
    setError(null);
  };

  const handlePair = async () => {
    if (code.length !== 6) {
      setError(t("extra.tpmEnter6Code"));
      return;
    }

    setIsPairing(true);
    setError(null);

    try {
      // Find TV session with this pairing code
      const { data: session, error: findError } = await supabase
        .from('tv_sessions')
        .select('*')
        .eq('pairing_code', code)
        .eq('status', 'waiting')
        .single();

      if (findError || !session) {
        setError(t("extra.tpmCodeNotFound"));
        setIsPairing(false);
        return;
      }

      // Pair the session with room info
      const { error: updateError } = await supabase
        .from('tv_sessions')
        .update({
          room_id: roomId || null,
          category_name: categoryName || null,
          is_paired: true,
          status: 'paired',  // Use 'paired' for DB constraint
        })
        .eq('id', session.id);

      if (updateError) throw updateError;

      setPairSuccess(true);
      
      // Close after success animation
      setTimeout(() => {
        onClose();
        // Reset state for next use
        setCode('');
        setPairSuccess(false);
      }, 1500);
    } catch (err) {
      console.error('Pairing error:', err);
      setError(t("extra.tpmErrorTryAgain"));
    } finally {
      setIsPairing(false);
    }
  };

  const handleClose = () => {
    setCode('');
    setError(null);
    setPairSuccess(false);
    onClose();
  };

  const isComplete = code.length === 6;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 pt-[calc(1rem_+_var(--safe-top))] pb-[calc(1rem_+_var(--safe-bottom))] bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-md rounded-3xl bg-gradient-to-b from-background to-muted p-6 shadow-2xl border border-border/50"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
                  <img src={retroTvIcon} alt="TV" className="w-7 h-7 object-contain" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">{t("tv.playOnTV")}</h2>
                  <p className="text-sm text-muted-foreground">{t("extra.enterCodeFromTV")}</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Success State */}
            {pairSuccess ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="py-12 flex flex-col items-center gap-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.1 }}
                >
                  <CheckCircle2 className="w-20 h-20 text-green-500" />
                </motion.div>
                <p className="text-xl font-bold text-foreground">{t("tv.connected")}</p>
                <p className="text-sm text-muted-foreground">{t("extra.tpmLobbyAppears")}</p>
              </motion.div>
            ) : (
              <>
                {/* Code Input */}
                <div className="mb-6">
                  <p className="text-center text-muted-foreground mb-4">
                    {t("extra.tpmOpenPrefix")} <span className="font-bold text-foreground">mytrivia.io/tv</span> {t("extra.tpmOpenSuffix")}
                  </p>
                  
                  <Input
                    type="text"
                    value={code}
                    onChange={handleCodeChange}
                    placeholder="ABC123"
                    className="text-center text-3xl font-mono tracking-[0.5em] h-16 bg-muted border-2 border-border focus:border-primary"
                    maxLength={6}
                    autoFocus
                  />

                  {/* Error Message */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 flex items-center justify-center gap-2 text-destructive"
                    >
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">{error}</span>
                    </motion.div>
                  )}
                </div>

                {/* Pair Button */}
                <ChunkyButton
                  variant="primary"
                  size="lg"
                  onClick={handlePair}
                  disabled={!isComplete || isPairing}
                  className="w-full"
                  icon={isPairing ? <Loader2 className="w-5 h-5 animate-spin" /> : <img src={retroTvIcon} alt="TV" className="w-5 h-5 object-contain" />}
                >
                  {isPairing ? t("tv.connecting") : t("tv.connect")}
                </ChunkyButton>

                {/* Instructions */}
                <div className="mt-6 space-y-2 text-center text-sm text-muted-foreground">
                  <p>{t("extra.tpmStep1")}</p>
                  <p>{t("extra.tpmStep2")}</p>
                  <p>{t("extra.tpmStep3")}</p>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
