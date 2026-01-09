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
import { getAskedQuestionIds, markQuestionsAsAsked, clearCategoryAskedQuestions, getSeenQuestionIds } from '@/services/questionTracker';

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

      // First get the category UUID from the slug
      const { data: categoryData } = await supabase
        .from('categories')
        .select('id')
        .eq('category_id', categoryId)
        .single();

      if (!categoryData) {
        toast.error('კატეგორია ვერ მოიძებნა');
        setIsConnecting(false);
        return;
      }

      // Get user's language preference
      const language = localStorage.getItem('preferredLanguage') || 'ka';

      // Get previously asked questions + all globally seen to avoid repetition
      const trackerKey = `tv_${categoryData.id}`;
      const categoryAskedIds = getAskedQuestionIds(trackerKey);
      const allSeenIds = getSeenQuestionIds();
      // Combine for maximum freshness
      let excludeIds = [...new Set([...categoryAskedIds, ...allSeenIds])];

      // Fetch questions for this category, excluding already asked ones
      let query = supabase
        .from('questions')
        .select('id, question_text, correct_answer, incorrect_answers, difficulty')
        .eq('category_id', categoryData.id)
        .eq('is_active', true)
        .eq('in_production', true)
        .eq('language', language);

      if (excludeIds.length > 0) {
        query = query.not('id', 'in', `(${excludeIds.join(',')})`);
      }

      const { data: questionsData } = await query.limit(20);

      let formattedQuestions = (questionsData || []).map(q => {
        const incorrectAnswers = Array.isArray(q.incorrect_answers) 
          ? q.incorrect_answers as string[] 
          : [];
        const allOptions = [q.correct_answer, ...incorrectAnswers].filter(Boolean);
        const shuffledOptions = allOptions.sort(() => Math.random() - 0.5);
        
        return {
          id: q.id,
          question_text: q.question_text,
          options: shuffledOptions,
          correct_answer: q.correct_answer,
          difficulty: q.difficulty || undefined,
        };
      });

      // If not enough questions, reset tracker and refetch
      if (formattedQuestions.length < 10) {
        clearCategoryAskedQuestions(trackerKey);
        
        const { data: resetQuestions } = await supabase
          .from('questions')
          .select('id, question_text, correct_answer, incorrect_answers, difficulty')
          .eq('category_id', categoryData.id)
          .eq('is_active', true)
          .eq('in_production', true)
          .eq('language', language)
          .limit(20);

        formattedQuestions = (resetQuestions || []).map(q => {
          const incorrectAnswers = Array.isArray(q.incorrect_answers) 
            ? q.incorrect_answers as string[] 
            : [];
          const allOptions = [q.correct_answer, ...incorrectAnswers].filter(Boolean);
          const shuffledOptions = allOptions.sort(() => Math.random() - 0.5);
          
          return {
            id: q.id,
            question_text: q.question_text,
            options: shuffledOptions,
            correct_answer: q.correct_answer,
            difficulty: q.difficulty || undefined,
          };
        });
      }

      // Fallback: if still not enough, fetch from any category
      if (formattedQuestions.length < 10) {
        const remainingNeeded = 10 - formattedQuestions.length;
        const existingIds = formattedQuestions.map(q => q.id);
        
        let fallbackQuery = supabase
          .from('questions')
          .select('id, question_text, correct_answer, incorrect_answers, difficulty')
          .eq('is_active', true)
          .eq('in_production', true)
          .eq('language', language)
          .neq('category_id', categoryData.id);

        if (existingIds.length > 0) {
          fallbackQuery = fallbackQuery.not('id', 'in', `(${existingIds.join(',')})`);
        }

        const { data: fallbackQuestions } = await fallbackQuery.limit(remainingNeeded);

        if (fallbackQuestions && fallbackQuestions.length > 0) {
          const formatted = fallbackQuestions.map(q => {
            const incorrectAnswers = Array.isArray(q.incorrect_answers) 
              ? q.incorrect_answers as string[] 
              : [];
            const allOptions = [q.correct_answer, ...incorrectAnswers].filter(Boolean);
            const shuffledOptions = allOptions.sort(() => Math.random() - 0.5);
            
            return {
              id: q.id,
              question_text: q.question_text,
              options: shuffledOptions,
              correct_answer: q.correct_answer,
              difficulty: q.difficulty || undefined,
            };
          });
          formattedQuestions.push(...formatted);
          toast.info('ზოგიერთი კითხვა სხვა კატეგორიიდანაა');
        }
      }

      // Shuffle and take 10
      formattedQuestions = formattedQuestions.sort(() => Math.random() - 0.5).slice(0, 10);

      if (formattedQuestions.length === 0) {
        toast.error('კითხვები ვერ მოიძებნა ამ ენაზე');
        setIsConnecting(false);
        return;
      }

      // Track these questions as asked
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
