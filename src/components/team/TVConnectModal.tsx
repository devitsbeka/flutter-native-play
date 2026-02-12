import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Check, ChevronLeft, Monitor, Hash, Smartphone } from 'lucide-react';
import retroTvIcon from '@/assets/retro-tv-colored.png';
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

type ConnectionStep = 'instructions' | 'code-entry' | 'connected';

const steps = [
  {
    icon: Monitor,
    title: 'გახსენი mytrivia.io/tv',
    description: 'შენს TV-ის ბრაუზერში გახსენი ეს გვერდი',
  },
  {
    icon: Hash,
    title: '4-ციფრიანი კოდი გამოჩნდება',
    description: 'TV ეკრანზე დაინახავ კოდს',
  },
  {
    icon: Smartphone,
    title: 'შეიყვანე კოდი ტელეფონიდან',
    description: 'დააკავშირე ტელეფონი TV-სთან',
  },
];

export const TVConnectModal: React.FC<TVConnectModalProps> = ({
  open,
  onOpenChange,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<ConnectionStep>('instructions');
  const [code, setCode] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    if (code.length !== 4 || !user) return;

    setIsConnecting(true);

    try {
      const { data: session, error } = await supabase
        .from('tv_sessions')
        .select('*')
        .eq('tv_pairing_code', code)
        .eq('is_paired', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !session) {
        toast.error('კოდი არ მოიძებნა ან უკვე დაკავშირებულია');
        setIsConnecting(false);
        return;
      }

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

      setStep('connected');
      toast.success('წარმატებით დაკავშირდა!');

      setTimeout(() => {
        onOpenChange(false);
        setCode('');
        setStep('instructions');
        navigate(`/tv/host/${session.id}`);
      }, 1000);

    } catch (error) {
      console.error('Error connecting to TV:', error);
      toast.error('დაკავშირება ვერ მოხერხდა');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleClose = () => {
    setCode('');
    setStep('instructions');
    onOpenChange(false);
  };

  const handleBack = () => {
    if (step === 'code-entry') {
      setStep('instructions');
    } else {
      handleClose();
    }
  };

  const headerTitle = step === 'instructions' ? 'TV-ზე თამაში' : step === 'code-entry' ? 'კოდის შეყვანა' : 'დაკავშირებულია';

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
            <div className="max-w-[700px] md:max-w-[520px] mx-auto w-full flex items-center gap-3 px-4 py-3">
              <button
                onClick={handleBack}
                className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-foreground" />
              </button>
              <h1 className="text-lg font-bold text-foreground">{headerTitle}</h1>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="h-full overflow-y-auto pt-[60px] pb-6 safe-top">
            <div className="max-w-[700px] md:max-w-[520px] mx-auto w-full p-5">
              <AnimatePresence mode="wait">
                {step === 'connected' ? (
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
                    <p className="text-muted-foreground">გადამისამართება...</p>
                  </motion.div>
                ) : step === 'instructions' ? (
                  <motion.div
                    key="instructions"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="py-6"
                  >
                    <div className="text-center mb-8">
                      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                        <img src={retroTvIcon} alt="TV" className="w-12 h-12 object-contain" />
                      </div>
                      <p className="text-muted-foreground">
                        მიჰყევი ნაბიჯებს TV-სთან დასაკავშირებლად
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 mb-8">
                      {steps.map((s, i) => (
                        <div key={i} className="flex items-center gap-4 bg-muted/30 rounded-xl p-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-sm font-bold text-primary">{i + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground text-sm">{s.title}</p>
                            <p className="text-xs text-muted-foreground">{s.description}</p>
                          </div>
                          <s.icon className="w-5 h-5 text-muted-foreground shrink-0" />
                        </div>
                      ))}
                    </div>

                    <ChunkyButton
                      variant="primary"
                      className="w-full"
                      onClick={() => setStep('code-entry')}
                    >
                      გაგრძელება
                    </ChunkyButton>
                  </motion.div>
                ) : (
                  <motion.div
                    key="code-entry"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="py-6"
                  >
                    <div className="text-center mb-8">
                      <p className="text-muted-foreground">
                        შეიყვანე 4-ციფრიანი კოდი რომელიც ნაჩვენებია TV ეკრანზე
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
