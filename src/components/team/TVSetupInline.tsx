import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tv, Loader2, Check, Globe } from 'lucide-react';
import { ChunkyButton } from '@/components/ui/chunky-button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

interface TVSetupInlineProps {
  onComplete: () => void;
  onCancel: () => void;
}

export const TVSetupInline: React.FC<TVSetupInlineProps> = ({
  onComplete,
  onCancel,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [code, setCode] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const handleConnect = async () => {
    if (code.length !== 4 || !user) return;

    setIsConnecting(true);

    try {
      const { data: session, error } = await supabase
        .from('tv_sessions')
        .select('*')
        .eq('tv_pairing_code', code)
        .eq('is_paired', false)
        .single();

      if (error || !session) {
        toast.error('კოდი არ მოიძებნა ან უკვე დაკავშირებულია');
        setIsConnecting(false);
        return;
      }

      // Don't regenerate pairing_code - use the existing one so TV and host have same QR
      const { error: updateError } = await supabase
        .from('tv_sessions')
        .update({
          host_user_id: user.id,
          is_paired: true,
          status: 'lobby',
        })
        .eq('id', session.id);

      if (updateError) {
        throw updateError;
      }

      setIsConnected(true);
      toast.success('წარმატებით დაკავშირდა!');

      setTimeout(() => {
        onComplete();
        navigate(`/tv/host/${session.id}`);
      }, 1500);

    } catch (error) {
      console.error('Error connecting to TV:', error);
      toast.error('დაკავშირება ვერ მოხერხდა');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="w-full max-w-md mx-auto overflow-hidden"
    >
      <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
        <AnimatePresence mode="wait">
          {isConnected ? (
            <motion.div
              key="connected"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-4 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', bounce: 0.5 }}
                className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3"
              >
                <Check className="w-6 h-6 text-white" />
              </motion.div>
              <p className="text-white font-semibold">დაკავშირებულია!</p>
            </motion.div>
          ) : (
            <motion.div
              key="input"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Instructions */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Globe className="w-5 h-5 text-white/80" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">გახსენი ტელევიზორზე:</p>
                  <p className="text-purple-300 font-bold">mytrivia.io/tv</p>
                </div>
              </div>

              {/* Code input */}
              <div className="mb-4">
                <p className="text-white/70 text-sm mb-2 text-center">შეიყვანე 4-ციფრიანი კოდი:</p>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={4}
                    value={code}
                    onChange={setCode}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} className="w-12 h-14 text-xl bg-white/10 border-white/30 text-white" />
                      <InputOTPSlot index={1} className="w-12 h-14 text-xl bg-white/10 border-white/30 text-white" />
                      <InputOTPSlot index={2} className="w-12 h-14 text-xl bg-white/10 border-white/30 text-white" />
                      <InputOTPSlot index={3} className="w-12 h-14 text-xl bg-white/10 border-white/30 text-white" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>

              {/* Connect button */}
              <ChunkyButton
                variant="primary"
                size="md"
                className="w-full"
                onClick={handleConnect}
                disabled={code.length !== 4 || isConnecting}
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    დაკავშირება...
                  </>
                ) : (
                  'დაკავშირება'
                )}
              </ChunkyButton>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
