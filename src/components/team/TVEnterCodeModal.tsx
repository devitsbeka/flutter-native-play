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
import { getQuestions, resolveCategoryUuid } from '@/services/questionService';
import { markQuestionsAsAsked } from '@/services/questionTracker';

interface TVEnterCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  categoryId: string;
}

export const TVEnterCodeModal: React.FC<TVEnterCodeModalProps> = ({
  open,
  onOpenChange,
  roomId,
  categoryId,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [code, setCode] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const handleConnect = async () => {
    if (code.length !== 4 || !user) return;

    setIsConnecting(true);

    try {
      // Find TV session with this pairing code
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

      // Resolve category UUID
      const categoryUUID = await resolveCategoryUuid(categoryId);
      if (!categoryUUID) {
        toast.error('კატეგორია ვერ მოიძებნა');
        setIsConnecting(false);
        return;
      }

      // Use unified questionService for fetching
      const result = await getQuestions({
        mode: 'tv',
        categoryUuid: categoryUUID,
        count: 10,
      });

      if (result.questions.length === 0) {
        toast.error('კითხვები ვერ მოიძებნა ამ ენაზე');
        setIsConnecting(false);
        return;
      }

      // Log exhaustion info if relevant
      if (result.exhaustionInfo) {
        console.log('TV question exhaustion:', {
          totalAvailable: result.exhaustionInfo.totalAvailable,
          totalSeen: result.exhaustionInfo.totalSeen,
          wasReset: result.exhaustionInfo.wasReset,
          usedFallback: result.exhaustionInfo.usedFallback,
        });

        if (result.exhaustionInfo.usedFallback) {
          toast.info('ზოგიერთი კითხვა სხვა კატეგორიიდანაა');
        }
      }

      // Format questions for TV session
      const formattedQuestions = result.questions.map(q => ({
        id: q.id,
        question_text: q.question,
        options: q.allAnswers, // Already shuffled by questionService
        correct_answer: q.correctAnswer,
        difficulty: q.difficulty,
      }));

      // Track using standardized key
      const trackerKey = `tv_${categoryUUID}`;
      markQuestionsAsAsked(trackerKey, formattedQuestions.map(q => q.id));

      // Generate a 6-character player join code
      const playerJoinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Update the TV session - pair it with this host
      const { error: updateError } = await supabase
        .from('tv_sessions')
        .update({
          host_user_id: user.id,
          room_id: roomId,
          is_paired: true,
          status: 'waiting',
          pairing_code: playerJoinCode, // This is the code guests use to join
          questions: formattedQuestions as unknown as any,
        })
        .eq('id', session.id);

      if (updateError) {
        throw updateError;
      }

      // Update game room
      await supabase
        .from('game_rooms')
        .update({ 
          game_mode: 'tv_show',
          tv_session_id: session.id 
        })
        .eq('id', roomId);

      setSessionId(session.id);
      setIsConnected(true);

      toast.success('წარმატებით დაკავშირდა!');

      // Navigate to the host controller page (host controls the game, not plays as guest)
      setTimeout(() => {
        onOpenChange(false);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              <p className="text-muted-foreground">გადამისამართება მართვის პანელზე...</p>
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
