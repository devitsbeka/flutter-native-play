import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tv, Loader2, Check, ArrowRight, Globe, Keyboard } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChunkyButton } from '@/components/ui/chunky-button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

interface TVSetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  onCancel: () => void;
}

export const TVSetupModal: React.FC<TVSetupModalProps> = ({
  open,
  onOpenChange,
  onComplete,
  onCancel,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
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
      
      // Update the TV session - pair it with this host
      const { error: updateError } = await supabase
        .from('tv_sessions')
        .update({
          host_user_id: user.id,
          is_paired: true,
          status: 'waiting',
          pairing_code: guestJoinCode,
        })
        .eq('id', session.id);

      if (updateError) {
        throw updateError;
      }

      setIsConnected(true);
      toast.success('წარმატებით დაკავშირდა!');

      // Navigate to the host controller page after a brief delay
      setTimeout(() => {
        onComplete();
        onOpenChange(false);
        resetState();
        navigate(`/tv/host/${session.id}`);
      }, 1500);

    } catch (error) {
      console.error('Error connecting to TV:', error);
      toast.error('დაკავშირება ვერ მოხერხდა');
    } finally {
      setIsConnecting(false);
    }
  };

  const resetState = () => {
    setStep(1);
    setCode('');
    setIsConnected(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      onCancel();
      resetState();
    }
    onOpenChange(newOpen);
  };

  const handleNext = () => {
    setStep(2);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground font-display text-xl">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Tv className="w-5 h-5 text-primary" />
            </div>
            TV-ზე თამაში
          </DialogTitle>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className={`w-2 h-2 rounded-full transition-colors ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`w-8 h-0.5 transition-colors ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`w-2 h-2 rounded-full transition-colors ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
        </div>

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
              <p className="text-muted-foreground">მზადაა თამაშისთვის</p>
            </motion.div>
          ) : step === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="py-4"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Globe className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  გახსენი ბრაუზერი ტელევიზორზე
                </h3>
                <p className="text-muted-foreground text-sm">
                  გადადი ამ მისამართზე:
                </p>
              </div>

              <div className="bg-muted/50 rounded-2xl p-4 mb-6">
                <p className="text-center text-xl font-bold text-primary font-mono">
                  mytrivia.io/tv
                </p>
              </div>

              <p className="text-sm text-muted-foreground text-center mb-6">
                ტელევიზორზე გამოჩნდება 4-ციფრიანი კოდი
              </p>

              <ChunkyButton
                variant="primary"
                className="w-full"
                onClick={handleNext}
                icon={<ArrowRight className="w-5 h-5" />}
              >
                შემდეგი
              </ChunkyButton>
            </motion.div>
          ) : (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="py-4"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Keyboard className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  შეიყვანე კოდი
                </h3>
                <p className="text-muted-foreground text-sm">
                  ჩაწერე 4-ციფრიანი კოდი ტელევიზორიდან
                </p>
              </div>

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

              <button
                onClick={() => setStep(1)}
                className="w-full mt-3 py-2 text-muted-foreground text-sm hover:text-foreground transition-colors"
              >
                უკან დაბრუნება
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};
