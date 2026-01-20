import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tv, Loader2, Check, ArrowRight, Globe, Keyboard, ChevronLeft } from 'lucide-react';
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
        // Multiple sessions can share the same 4-digit code; pick the most recent unpaired one.
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !session) {
        toast.error('კოდი არ მოიძებნა ან უკვე დაკავშირებულია');
        setIsConnecting(false);
        return;
      }

      // Update the TV session - pair it with this host
      const { error: updateError } = await supabase
        .from('tv_sessions')
        .update({
          host_user_id: user.id,
          is_paired: true,
          status: 'paired',
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

  const handleClose = () => {
    onCancel();
    resetState();
    onOpenChange(false);
  };

  const handleNext = () => {
    setStep(2);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background"
        >
          {/* Fixed Header */}
          <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/30 safe-top">
            <div className="max-w-[700px] md:max-w-[520px] mx-auto w-full flex items-center justify-between px-4 py-3">
              <button 
                onClick={handleClose} 
                className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-foreground" />
              </button>
              
              {/* Progress indicator */}
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full transition-colors ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
                <div className={`w-8 h-0.5 transition-colors ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
                <div className={`w-2 h-2 rounded-full transition-colors ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
              </div>
              
              <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full">
                <Tv className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-primary">TV</span>
              </div>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="h-full overflow-y-auto pt-[60px] pb-6 safe-top">
            <div className="max-w-[700px] md:max-w-[520px] mx-auto w-full p-5">
              <AnimatePresence mode="wait">
                {isConnected ? (
                  <motion.div
                    key="connected"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="py-12 text-center"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', bounce: 0.5 }}
                      className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6"
                    >
                      <Check className="w-12 h-12 text-white" />
                    </motion.div>
                    <h3 className="text-2xl font-bold text-foreground mb-2">დაკავშირებულია!</h3>
                    <p className="text-muted-foreground">მზადაა თამაშისთვის</p>
                  </motion.div>
                ) : step === 1 ? (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="py-6"
                  >
                    <div className="text-center mb-8">
                      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                        <Globe className="w-10 h-10 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold text-foreground mb-2">
                        გახსენი ბრაუზერი ტელევიზორზე
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        გადადი ამ მისამართზე:
                      </p>
                    </div>

                    <div className="bg-muted/50 rounded-2xl p-5 mb-8">
                      <p className="text-center text-2xl font-bold text-primary font-mono">
                        mytrivia.io/tv
                      </p>
                    </div>

                    <p className="text-sm text-muted-foreground text-center mb-8">
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
                    className="py-6"
                  >
                    <div className="text-center mb-8">
                      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                        <Keyboard className="w-10 h-10 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold text-foreground mb-2">
                        შეიყვანე კოდი
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        ჩაწერე 4-ციფრიანი კოდი ტელევიზორიდან
                      </p>
                    </div>

                    <div className="flex justify-center mb-8">
                      <InputOTP
                        maxLength={4}
                        value={code}
                        onChange={setCode}
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} className="w-16 h-20 text-3xl" />
                          <InputOTPSlot index={1} className="w-16 h-20 text-3xl" />
                          <InputOTPSlot index={2} className="w-16 h-20 text-3xl" />
                          <InputOTPSlot index={3} className="w-16 h-20 text-3xl" />
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
                      className="w-full mt-4 py-3 text-muted-foreground text-sm hover:text-foreground transition-colors"
                    >
                      უკან დაბრუნება
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
