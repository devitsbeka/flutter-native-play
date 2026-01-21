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
  roomId?: string; // Pass room ID directly from parent context
}

export const TVSetupInline: React.FC<TVSetupInlineProps> = ({
  onComplete,
  onCancel,
  roomId: propRoomId,
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
        // Multiple sessions can share the same 4-digit code; pick the most recent unpaired one.
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !session) {
        toast.error('კოდი არ მოიძებნა ან უკვე დაკავშირებულია');
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
      
      // If we have a room ID, fetch its data and sync to TV session
      if (roomIdFromUrl) {
        const { data: roomData } = await supabase
          .from('game_rooms')
          .select('id, room_name, category_name, category_id')
          .eq('id', roomIdFromUrl)
          .maybeSingle();
        
        if (roomData) {
          roomId = roomData.id;
          roomName = roomData.room_name;
          categoryName = roomData.category_name;
          
          // Fetch category icon
          if (roomData.category_id) {
            const { data: cat } = await supabase
              .from('categories')
              .select('icon')
              .eq('id', roomData.category_id)
              .maybeSingle();
            categoryIcon = cat?.icon;
          }

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

          // Prepend initial room category first (if any)
          if (roomData.category_id) {
            rowsToInsert.push({
              session_id: session.id,
              position: 0,
              source_type: 'category',
              category_id: roomData.category_id,
              category_name: roomData.category_name,
              // NOTE: historically this column is used as an emoji in TV lobby UI
              icon_slug: categoryIcon,
              user_trivia_id: null,
            });
          }

          // Append lobby-selected queue items
          if (queueItems && queueItems.length > 0) {
            queueItems.forEach((item: any, idx: number) => {
              rowsToInsert.push({
                session_id: session.id,
                position: rowsToInsert.length + idx,
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
              toast.error('Queue sync failed - check console');
            } else {
              console.log('[TVSetupInline] SUCCESS - Seeded tv_session_queue:', insertedRows);
            }
          } else {
            console.warn('[TVSetupInline] No queue items to insert - queue will be empty on TV');
          }
        }
      }

      // Update TV session with room data and host
      const { error: updateError } = await supabase
        .from('tv_sessions')
        .update({
          host_user_id: user.id,
          is_paired: true,
          status: 'paired',
          room_id: roomId,
          room_name: roomName,
          category_name: categoryName,
          category_icon: categoryIcon,
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
      className="w-full max-w-md mx-auto overflow-hidden mb-6"
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
