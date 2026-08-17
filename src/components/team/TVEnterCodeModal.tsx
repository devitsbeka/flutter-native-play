import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Check, ChevronLeft } from 'lucide-react';
import retroTvIcon from '@/assets/retro-tv-colored.png';
import { ChunkyButton } from '@/components/ui/chunky-button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { getQuestions, resolveCategoryUuid } from '@/services/questionService';
import { markQuestionsAsAsked } from '@/services/questionTracker';
import { useLanguage } from '@/contexts/LanguageContext';

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
  const { t } = useLanguage();
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
        // Multiple sessions can share the same 4-digit code; pick the most recent unpaired one.
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !session) {
        toast.error(t("extra.tecCodeNotFound"));
        setIsConnecting(false);
        return;
      }

      // Resolve category UUID
      const categoryUUID = await resolveCategoryUuid(categoryId);
      if (!categoryUUID) {
        toast.error(t("extra.csmCategoryNotFound"));
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
        toast.error(t("extra.tecNoQuestionsLang"));
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
          toast.info(t("extra.tecFallbackQuestions"));
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

      // Claim the TV through the RPC rather than writing host_user_id
      // directly. A bare UPDATE has no way to check the session is still
      // unclaimed, so two phones typing the same code both "succeeded" and
      // the second silently took the first host's TV. The RPC locks the row
      // and CAS-claims it, so exactly one caller can win - and it only ever
      // considers sessions that are live, waiting and unclaimed.
      const { data: claimRaw, error: claimError } = await (supabase.rpc as unknown as (
        fn: string, args: Record<string, unknown>
      ) => Promise<{ data: unknown; error: unknown }>)('tv_claim_session', {
        p_pairing_code: code,
        p_room_id: roomId,
      });
      const claim = claimRaw as { claimed?: boolean; reason?: string; session_id?: string } | null;

      if (claimError || !claim?.claimed) {
        toast.error(
          claim?.reason === 'not_authenticated'
            ? t("extra.tecAuthRequired")
            : t("extra.tecCodeNotFound")
        );
        setIsConnecting(false);
        return;
      }

      // The RPC's filter is stricter than the lookup above, so trust its pick.
      const claimedSessionId = claim.session_id || session.id;

      // Questions are written after the claim, as the confirmed host.
      const { error: updateError } = await supabase
        .from('tv_sessions')
        .update({ questions: formattedQuestions as unknown as any })
        .eq('id', claimedSessionId);

      if (updateError) {
        throw updateError;
      }

      // Update game room
      await supabase
        .from('game_rooms')
        .update({ 
          game_mode: 'tv_show',
          tv_session_id: claimedSessionId 
        })
        .eq('id', roomId);

      setSessionId(claimedSessionId);
      setIsConnected(true);

      toast.success(t("extra.tecConnectedSuccess"));

      // Navigate to the host controller page (host controls the game, not plays as guest)
      setTimeout(() => {
        onOpenChange(false);
        navigate(`/tv/host/${claimedSessionId}`);
      }, 1500);

    } catch (error) {
      console.error('Error connecting to TV:', error);
      toast.error(t("tv.connectionFailed"));
    } finally {
      setIsConnecting(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 safe-screen z-50 bg-background flex flex-col"
        >
          {/* Fixed Header */}
          <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-background/95 backdrop-blur-sm">
            <button
              onClick={() => onOpenChange(false)}
              className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <img src={retroTvIcon} alt="TV" className="w-5 h-5 object-contain" />
              </div>
              <h2 className="text-lg font-bold text-foreground">{t("tv.connectToTV")}</h2>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto flex items-center justify-center p-4">
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
                  <h3 className="text-xl font-bold text-foreground mb-2">{t("tv.connected")}</h3>
                  <p className="text-muted-foreground">{t("extra.tecRedirecting")}</p>
                </motion.div>
              ) : (
                <motion.div
                  key="input"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-4 w-full max-w-md"
                >
                  <p className="text-muted-foreground text-center mb-6">
                    {t("extra.tecEnterCodeHint")}
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
                        {t("extra.connecting")}
                      </>
                    ) : (
                      t("tv.connect")
                    )}
                  </ChunkyButton>

                  <p className="text-sm text-muted-foreground text-center mt-4">
                    {t("extra.tecOpenTvPrefix")} <span className="text-primary font-medium">mytrivia.io/tv</span> {t("extra.tecOpenTvSuffix")}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
