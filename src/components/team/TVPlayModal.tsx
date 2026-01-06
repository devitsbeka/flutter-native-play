import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Tv, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { ChunkyButton } from '@/components/ui/chunky-button';
import { supabase } from '@/integrations/supabase/client';
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
  const [code, setCode] = useState(['', '', '', '']);
  const [isPairing, setIsPairing] = useState(false);
  const [pairSuccess, setPairSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDigitChange = (index: number, value: string) => {
    if (!/^[0-9]?$/.test(value)) return;
    
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError(null);

    // Auto-focus next input
    if (value && index < 3) {
      const nextInput = document.getElementById(`tv-code-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`tv-code-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pastedData.length === 4) {
      setCode(pastedData.split(''));
      setError(null);
    }
  };

  const handlePair = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== 4) {
      setError('შეიყვანეთ 4-ნიშნა კოდი');
      return;
    }

    setIsPairing(true);
    setError(null);

    try {
      // Find TV session with this code
      const { data: session, error: findError } = await supabase
        .from('tv_sessions')
        .select('*')
        .eq('tv_pairing_code', fullCode)
        .eq('status', 'waiting')
        .single();

      if (findError || !session) {
        setError('კოდი ვერ მოიძებნა. შეამოწმეთ TV ეკრანზე კოდი.');
        setIsPairing(false);
        return;
      }

      // Pair the session with room info
      const { error: updateError } = await supabase
        .from('tv_sessions')
        .update({
          room_id: roomId || null,
          category_id: categoryId || null,
          category_name: categoryName || null,
          is_paired: true,
          status: 'lobby',
        })
        .eq('id', session.id);

      if (updateError) throw updateError;

      setPairSuccess(true);
      
      // Close after success animation
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Pairing error:', err);
      setError('დაფიქსირდა შეცდომა. სცადეთ თავიდან.');
    } finally {
      setIsPairing(false);
    }
  };

  const isComplete = code.every(d => d !== '');

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
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
                  <Tv className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">TV-ზე თამაში</h2>
                  <p className="text-sm text-muted-foreground">შეიყვანეთ კოდი TV-დან</p>
                </div>
              </div>
              <button
                onClick={onClose}
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
                <p className="text-xl font-bold text-foreground">დაკავშირებულია!</p>
                <p className="text-sm text-muted-foreground">გადახვალთ TV ეკრანზე...</p>
              </motion.div>
            ) : (
              <>
                {/* Code Input */}
                <div className="mb-6">
                  <p className="text-center text-muted-foreground mb-4">
                    გახსენით <span className="font-bold text-foreground">mytrivia.io/tv</span> თქვენს TV-ზე
                  </p>
                  
                  <div className="flex justify-center gap-3" onPaste={handlePaste}>
                    {code.map((digit, index) => (
                      <motion.input
                        key={index}
                        id={`tv-code-${index}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleDigitChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        className="w-16 h-20 text-center text-3xl font-bold rounded-2xl bg-muted border-2 border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-foreground"
                        style={{
                          boxShadow: digit ? '0 4px 12px hsl(var(--primary) / 0.2)' : 'none',
                        }}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: index * 0.05 }}
                      />
                    ))}
                  </div>

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
                  icon={isPairing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Tv className="w-5 h-5" />}
                >
                  {isPairing ? 'კავშირდება...' : 'დაკავშირება'}
                </ChunkyButton>

                {/* Instructions */}
                <div className="mt-6 space-y-2 text-center text-sm text-muted-foreground">
                  <p>1. გახსენით mytrivia.io/tv ბრაუზერში</p>
                  <p>2. შეიყვანეთ 4-ნიშნა კოდი</p>
                  <p>3. მოიწვიეთ მეგობრები QR კოდით</p>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
