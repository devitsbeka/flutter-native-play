import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tv, Loader2, Check, Globe } from 'lucide-react';
import { ChunkyButton } from '@/components/ui/chunky-button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from "@/lib/toast";
import { useNavigate } from 'react-router-dom';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

interface TVSetupInlineProps {
  onComplete: () => void;
  onCancel: () => void;
  roomId?: string; // Pass room ID directly from parent context
}

export const TVSetupInline: React.FC<TVSetupInlineProps> = ({
  onComplete,
  onCancel,
  roomId: propRoomId,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [code, setCode] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  /**
   * The caret is already in the first box when this panel opens.
   *
   * Turning TV mode on is a statement of intent — the only thing left to do
   * is type four digits — and asking for a second tap on the boxes to say so
   * again is a tap for nothing. The panel arrives on an AnimatePresence
   * entrance, so the focus waits a beat for it to be laid out and hittable;
   * calling focus() on an element still at opacity 0 mid-transition is how
   * this silently does nothing. Same 100ms the room-name field uses.
   */
  const codeInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (isConnected) return;
    const timer = setTimeout(() => codeInputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, [isConnected]);

  const handleConnect = async () => {
    if (code.length !== 4 || !user) return;

    setIsConnecting(true);

    try {
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
        toast.error(t('extra.tvCodeNotFound'));
        setIsConnecting(false);
        return;
      }

      // Use room ID from props first, fallback to URL parsing
      const roomIdFromUrl = propRoomId || 
                            window.location.pathname.match(/\/room\/([^/]+)/)?.[1] || 
                            window.location.pathname.match(/\/team\/([^/]+)/)?.[1];
      
      console.log('[TVSetupInline] Room ID resolution:', { propRoomId, roomIdFromUrl });
      
      let roomName = null;
      let categoryName = null;
      let categoryIcon = null;
      let roomId = null;
      
      // If we have a room ID, fetch its data
      if (roomIdFromUrl) {
        const { data: roomData } = await supabase
          .from('game_rooms')
          .select('id, room_name, category_name, category_id, user_trivia_id, game_mode')
          .eq('id', roomIdFromUrl)
          .maybeSingle();
        
        if (roomData) {
          roomId = roomData.id;
          roomName = roomData.room_name;
          categoryName = roomData.category_name;
          
          // Extract user_trivia_id from game_mode as fallback if not set directly
          let userTriviaId = roomData.user_trivia_id;
          let collectionId: string | null = null;
          
          if (!userTriviaId && roomData.game_mode) {
            const triviaMatch = roomData.game_mode.match(/^trivia:(.+)$/);
            if (triviaMatch) {
              userTriviaId = triviaMatch[1];
              console.log('[TVSetupInline] Extracted user_trivia_id from game_mode:', userTriviaId);
            }
            const collectionMatch = roomData.game_mode.match(/^collection:(.+)$/);
            if (collectionMatch) {
              collectionId = collectionMatch[1];
              console.log('[TVSetupInline] Extracted collection_id from game_mode:', collectionId);
            }
          }
          
          // Fetch category icon
          if (roomData.category_id) {
            const { data: cat } = await supabase
              .from('categories')
              .select('icon')
              .eq('id', roomData.category_id)
              .maybeSingle();
            categoryIcon = cat?.icon;
          }

          // Claim the TV atomically. This used to be a bare UPDATE setting
          // host_user_id, which could not tell whether the session was still
          // unclaimed - so two phones typing the same code both "succeeded"
          // and the second silently took the first host's TV. The RPC locks
          // the row and CAS-claims it (exactly one winner), and only
          // considers sessions that are live, waiting and unclaimed - the
          // old lookup happily matched long-expired abandoned rows.
          const { data: claimRaw, error: claimError } = await (supabase.rpc as unknown as (
            fn: string, args: Record<string, unknown>
          ) => Promise<{ data: unknown; error: unknown }>)('tv_claim_session', {
            p_pairing_code: code,
            p_room_id: roomId,
            p_room_name: roomName,
            p_category_name: categoryName,
            p_category_icon: categoryIcon,
          });
          const claim = claimRaw as { claimed?: boolean; reason?: string; session_id?: string } | null;

          if (claimError || !claim?.claimed) {
            console.error('[TVSetupInline] Claim refused:', claim?.reason, claimError);
            toast.error(
              claim?.reason === 'not_authenticated'
                ? t('extra.tecAuthRequired')
                : t('extra.tvCodeNotFound')
            );
            setIsConnecting(false);
            return;
          }

          // The RPC's candidate filter is stricter than the lookup above, so
          // its pick - not the pre-check's - is the session we are hosting.
          session.id = claim.session_id || session.id;

          console.log('[TVSetupInline] TV session claimed by host:', user.id, session.id);

          // Also update the game room to link to this TV session
          const { error: updateRoomError } = await supabase
            .from('game_rooms')
            .update({ 
              game_mode: 'tv_show',
              tv_session_id: session.id 
            })
            .eq('id', roomId);

          if (updateRoomError) {
            console.error('[TVSetupInline] Failed to update game room:', updateRoomError);
          }

          // NOW we can do queue operations (RLS will pass since user is now host)
          // Reset existing TV queue to avoid stale/duplicate items
          const { error: clearQueueError } = await supabase
            .from('tv_session_queue')
            .delete()
            .eq('session_id', session.id);

          if (clearQueueError) {
            console.error('[TVSetupInline] Failed to clear tv_session_queue', clearQueueError);
          }
          
          // Copy room + room_category_queue into tv_session_queue
          const { data: queueItems, error: queueFetchError } = await supabase
            .from('room_category_queue')
            .select('*')
            .eq('room_id', roomId)
            .order('position');

          console.log('[TVSetupInline] Room queue fetch:', { 
            roomId, 
            queueItems, 
            queueFetchError,
            initialCategory: roomData.category_id 
          });

          const rowsToInsert: Array<{
            session_id: string;
            position: number;
            source_type: string;
            category_id: string | null;
            category_name: string | null;
            icon_slug: string | null;
            user_trivia_id: string | null;
          }> = [];

          // Check if initial category/trivia is already in queue at position 0
          const initialAlreadyInQueue = queueItems?.some(
            (item: any) => 
              item.position === 0 && 
              ((roomData.category_id && item.category_id === roomData.category_id) || 
               (userTriviaId && item.user_trivia_id === userTriviaId))
          );

          console.log('[TVSetupInline] Initial already in queue check:', { 
            initialAlreadyInQueue, 
            categoryId: roomData.category_id, 
            userTriviaId,
            collectionId,
          });

          // Handle collection: fetch all rounds and add them to queue
          if (collectionId) {
            const { data: collectionRounds } = await supabase
              .from('user_quiz_posts')
              .select('id, title, round_number')
              .eq('collection_id', collectionId)
              .order('round_number', { ascending: true });
            
            if (collectionRounds && collectionRounds.length > 0) {
              console.log('[TVSetupInline] Found collection rounds:', collectionRounds);
              collectionRounds.forEach((round, idx) => {
                rowsToInsert.push({
                  session_id: session.id,
                  position: idx,
                  source_type: 'user_trivia',
                  category_id: null,
                  category_name: round.title,
                  icon_slug: null,
                  user_trivia_id: round.id,
                });
              });
            }
          }
          // Only prepend initial category/trivia if NOT already in queue and NOT a collection
          else if (!initialAlreadyInQueue) {
            if (roomData.category_id) {
              // The category's own icon_slug, which is what Discover draws
              // from; the hardcoded map is only the net underneath it.
              const { categoryIconSlugSync, primeCategoryIconSlugs } =
                await import('@/hooks/useCategoryDisplay');
              await primeCategoryIconSlugs();
              const iconSlug = categoryIconSlugSync(roomData.category_id);
              
              rowsToInsert.push({
                session_id: session.id,
                position: 0,
                source_type: 'category',
                category_id: roomData.category_id,
                category_name: roomData.category_name,
                icon_slug: iconSlug,
                user_trivia_id: null,
              });
            } else if (userTriviaId) {
              // Handle user trivia as initial round (use extracted ID)
              rowsToInsert.push({
                session_id: session.id,
                position: 0,
                source_type: 'user_trivia',
                category_id: null,
                category_name: roomData.category_name,
                icon_slug: null,
                user_trivia_id: userTriviaId,
              });
            }
          }

          // Append lobby-selected queue items
          if (queueItems && queueItems.length > 0) {
            queueItems.forEach((item: any, idx: number) => {
              // Calculate position: if initial was prepended, offset by rowsToInsert.length; otherwise use idx
              const position = initialAlreadyInQueue ? idx : rowsToInsert.length + idx;
              rowsToInsert.push({
                session_id: session.id,
                position: position,
                source_type: item.source_type,
                category_id: item.category_id,
                category_name: item.category_name,
                icon_slug: item.icon_slug,
                user_trivia_id: item.user_trivia_id,
              });
            });
          }

          console.log('[TVSetupInline] Rows to insert into tv_session_queue:', rowsToInsert);

          if (rowsToInsert.length > 0) {
            const { data: insertedRows, error: insertQueueError } = await supabase
              .from('tv_session_queue')
              .insert(rowsToInsert)
              .select();
              
            if (insertQueueError) {
              console.error('[TVSetupInline] FAILED to seed tv_session_queue:', insertQueueError);
              toast.error(t('common.error'));
            } else {
              console.log('[TVSetupInline] SUCCESS - Seeded tv_session_queue:', insertedRows);
            }
          } else {
            console.warn('[TVSetupInline] No queue items to insert - queue will be empty on TV');
          }
        }
      } else {
        // No room ID - just update TV session with basic info
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
      }

      setIsConnected(true);
      toast.success(t('extra.tvConnectedToast'));

      setTimeout(() => {
        onComplete();
        navigate(`/tv/host/${session.id}`);
      }, 1500);

    } catch (error) {
      console.error('Error connecting to TV:', error);
      toast.error(t('extra.tvConnectFailed'));
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <motion.div
      // Margin animates with the height — leaving it static (mb-6) made the
      // content below jump by 24px at the start/end of the reveal
      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
      animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="w-full max-w-md mx-auto overflow-hidden"
    >
      {/* This panel sits inside the lobby's light sheet, so its ink is the
          lobby's dark purple — white type here was invisible (owner's
          screenshot). */}
      <div className="p-4 rounded-2xl bg-white/50 border border-[#e8e0f5]">
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
              <p className="text-[#402666] font-semibold">{t('extra.tvConnected')}</p>
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
                <div className="w-10 h-10 rounded-xl bg-[#402666]/10 flex items-center justify-center flex-shrink-0">
                  <Globe className="w-5 h-5 text-[#523b76]" />
                </div>
                <div>
                  <p className="text-[#402666] text-sm font-medium">{t('extra.tvOpenOnTV')}</p>
                  <p className="text-[#7C3AED] font-bold">mytrivia.io/tv</p>
                </div>
              </div>

              {/* Code input */}
              <div className="mb-4">
                <p className="text-[#402666]/70 text-sm mb-2 text-center">{t('extra.tvEnterCode')}</p>
                <div className="flex justify-center">
                  <InputOTP
                    ref={codeInputRef}
                    maxLength={4}
                    value={code}
                    onChange={setCode}
                    // The digits are the only thing this box wants, and a
                    // numeric keypad is a much shorter reach than a keyboard.
                    inputMode="numeric"
                    autoComplete="one-time-code"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} className="w-12 h-14 text-xl bg-white border-[#c9b2ed] text-[#402666]" />
                      <InputOTPSlot index={1} className="w-12 h-14 text-xl bg-white border-[#c9b2ed] text-[#402666]" />
                      <InputOTPSlot index={2} className="w-12 h-14 text-xl bg-white border-[#c9b2ed] text-[#402666]" />
                      <InputOTPSlot index={3} className="w-12 h-14 text-xl bg-white border-[#c9b2ed] text-[#402666]" />
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
                    {t('extra.tvConnectingBtn')}
                  </>
                ) : (
                  t('extra.tvConnectBtn')
                )}
              </ChunkyButton>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
