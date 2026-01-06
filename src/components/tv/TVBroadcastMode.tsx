import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Tv, Wifi, QrCode } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TVBroadcastModeProps {
  sessionId: string;
  pairingCode: string;
  deviceName?: string;
}

export const TVBroadcastMode: React.FC<TVBroadcastModeProps> = ({
  sessionId,
  pairingCode,
  deviceName = 'Living Room TV',
}) => {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Broadcast TV presence for discovery
  useEffect(() => {
    const channel = supabase.channel('tv-broadcast', {
      config: {
        presence: {
          key: sessionId,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        console.log('Presence sync');
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Broadcast this TV's presence
          await channel.track({
            tv_id: sessionId,
            device_name: deviceName,
            pairing_code: pairingCode,
            session_id: sessionId,
            online_at: new Date().toISOString(),
          });
          console.log('Broadcasting TV presence:', { sessionId, pairingCode, deviceName });
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [sessionId, pairingCode, deviceName]);

  return (
    <div className="absolute top-8 right-8 flex items-center gap-3">
      {/* Broadcasting indicator */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/40"
      >
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-2 h-2 rounded-full bg-emerald-500"
        />
        <Wifi className="w-4 h-4 text-emerald-500" />
        <span className="text-emerald-600 text-sm font-medium">ხელმისაწვდომია</span>
      </motion.div>

      {/* Device name */}
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20">
        <Tv className="w-4 h-4 text-white/70" />
        <span className="text-white/70 text-sm">{deviceName}</span>
      </div>
    </div>
  );
};
