import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tv, Loader2, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChunkyButton } from '@/components/ui/chunky-button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

interface TVConnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TVConnectModal: React.FC<TVConnectModalProps> = ({
  open,
  onOpenChange,
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
      // Find TV session with this 4-digit pairing code
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

      // Generate a 6-character guest join code
      const guestJoinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Update the TV session - pair it with this host (no category/questions yet)
      const { error: updateError } = await supabase
        .from('tv_sessions')
        .update({
          host_user_id: user.id,
          is_paired: true,
          status: 'waiting',
          pairing_code: guestJoinCode, // 6-char code for guests
        })
        .eq('id', session.id);

      if (updateError) {
        throw updateError;
      }

      setIsConnected(true);
      toast.success('წარმატებით დაკავშირდა!');

      // Navigate to the host controller page
      setTimeout(() => {
        onOpenChange(false);
        setCode('');
        setIsConnected(false);
        navigate(`/tv/host/${session.id}`);
      }, 1000);

    } catch (error) {
      console.error('Error connecting to TV:', error);
      toast.error('დაკავშირება ვერ მოხერხდა');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setCode('');
      setIsConnected(false);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tv className="w-5 h-5 text-primary" />
            TV-სთან დაკავშირება
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {isConnected ? (
            <motion.div
              key="connected"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-8 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', bounce: 0.5 }}
                className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <Check className="w-10 h-10 text-white" />
              </motion.div>
              <h3 className="text-xl font-bold text-foreground mb-2">დაკავშირებულია!</h3>
              <p className="text-muted-foreground">გადამისამართება...</p>
            </motion.div>
          ) : (
            <motion.div
              key="input"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-4"
            >
              <p className="text-muted-foreground text-center mb-6">
                შეიყვანე 4-ციფრიანი კოდი რომელიც ნაჩვენებია TV ეკრანზე
              </p>

              <div className="flex justify-center mb-6">
                <InputOTP
                  maxLength={4}
                  value={code}
                  onChange={setCode}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} className="w-14 h-16 text-2xl" />
                    <InputOTPSlot index={1} className="w-14 h-16 text-2xl" />
                    <InputOTPSlot index={2} className="w-14 h-16 text-2xl" />
                    <InputOTPSlot index={3} className="w-14 h-16 text-2xl" />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <ChunkyButton
                variant="primary"
                className="w-full"
                onClick={handleConnect}
                disabled={code.length !== 4 || isConnecting}
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    დაკავშირება...
                  </>
                ) : (
                  'დაკავშირება'
                )}
              </ChunkyButton>

              <p className="text-sm text-muted-foreground text-center mt-4">
                ჯერ გახსენი <span className="text-primary font-medium">mytrivia.io/tv</span> შენს TV-ზე
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};
