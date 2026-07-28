import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DiscoveredTV {
  id: string;
  deviceName: string;
  pairingCode: string;
  signalStrength: 'strong' | 'medium' | 'weak';
  status: 'available' | 'pairing' | 'paired';
  lastSeen: Date;
}

interface TVPresenceState {
  tv_id: string;
  device_name: string;
  pairing_code: string;
  session_id: string;
  online_at: string;
}

export function useTVDiscovery() {
  const { user } = useAuth();
  const [discoveredTVs, setDiscoveredTVs] = useState<DiscoveredTV[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [connectionState, setConnectionState] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [connectedSessionId, setConnectedSessionId] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Start scanning for nearby TVs via Supabase Realtime Presence
  const startScanning = useCallback(() => {
    if (isScanning) return;
    setIsScanning(true);
    setDiscoveredTVs([]);

    // Join the TV broadcast channel
    const channel = supabase.channel('tv-broadcast', {
      config: {
        presence: {
          key: user?.id || 'anonymous',
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<TVPresenceState>();
        const tvs: DiscoveredTV[] = [];

        Object.entries(state).forEach(([key, presences]) => {
          presences.forEach((presence) => {
            if (presence.tv_id) {
              tvs.push({
                id: presence.tv_id,
                deviceName: presence.device_name || 'TV',
                pairingCode: presence.pairing_code,
                signalStrength: 'strong', // We can't measure actual signal, so default to strong
                status: 'available',
                lastSeen: new Date(presence.online_at),
              });
            }
          });
        });

        setDiscoveredTVs(tvs);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('TV joined:', key, newPresences);
        newPresences.forEach((presence: any) => {
          if (presence.tv_id) {
            setDiscoveredTVs((prev) => {
              const exists = prev.find((tv) => tv.id === presence.tv_id);
              if (exists) return prev;
              return [
                ...prev,
                {
                  id: presence.tv_id,
                  deviceName: presence.device_name || 'TV',
                  pairingCode: presence.pairing_code,
                  signalStrength: 'strong',
                  status: 'available',
                  lastSeen: new Date(presence.online_at),
                },
              ];
            });
          }
        });
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('TV left:', key, leftPresences);
        leftPresences.forEach((presence: any) => {
          if (presence.tv_id) {
            setDiscoveredTVs((prev) => prev.filter((tv) => tv.id !== presence.tv_id));
          }
        });
      })
      .subscribe();

    channelRef.current = channel;

    // Auto-stop scanning after 30 seconds
    scanTimeoutRef.current = setTimeout(() => {
      stopScanning();
    }, 30000);
  }, [isScanning, user?.id]);

  // Stop scanning
  const stopScanning = useCallback(() => {
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setIsScanning(false);
  }, []);

  // Connect to a discovered TV
  const connectToTV = useCallback(
    async (tv: DiscoveredTV) => {
      if (!user) {
        console.error('User not authenticated');
        setConnectionState('error');
        return null;
      }

      setConnectionState('connecting');

      // Update the TV's status in UI
      setDiscoveredTVs((prev) =>
        prev.map((t) => (t.id === tv.id ? { ...t, status: 'pairing' as const } : t))
      );

      try {
        // Find the TV session by pairing code
        const { data: session, error } = await supabase
          .from('tv_sessions')
          .select('*')
          .eq('tv_pairing_code', tv.pairingCode)
          .eq('is_paired', false)
          .single();

        if (error || !session) {
          console.error('TV session not found:', error);
          setConnectionState('error');
          return null;
        }

        // Pair with the TV
        const { error: updateError } = await supabase
          .from('tv_sessions')
          .update({
            is_paired: true,
            host_user_id: user.id,
            status: 'paired',
          })
          .eq('id', session.id);

        if (updateError) {
          console.error('Failed to pair with TV:', updateError);
          setConnectionState('error');
          return null;
        }

        // Update UI
        setDiscoveredTVs((prev) =>
          prev.map((t) => (t.id === tv.id ? { ...t, status: 'paired' as const } : t))
        );

        setConnectionState('connected');
        setConnectedSessionId(session.id);
        stopScanning();

        return { sessionId: session.id, playerJoinCode: tv.pairingCode };
      } catch (err) {
        console.error('Connection error:', err);
        setConnectionState('error');
        return null;
      }
    },
    [user, stopScanning]
  );

  // Connect using manual code
  const connectWithCode = useCallback(
    async (code: string) => {
      if (!user) {
        console.error('User not authenticated');
        setConnectionState('error');
        return null;
      }

      setConnectionState('connecting');

      try {
        // Find the TV session by pairing code
        const { data: session, error } = await supabase
          .from('tv_sessions')
          .select('*')
          .eq('tv_pairing_code', code.toUpperCase())
          .eq('is_paired', false)
          .single();

        if (error || !session) {
          console.error('TV session not found:', error);
          setConnectionState('error');
          return null;
        }

        // Pair with the TV
        const { error: updateError } = await supabase
          .from('tv_sessions')
          .update({
            is_paired: true,
            host_user_id: user.id,
            status: 'paired',
          })
          .eq('id', session.id);

        if (updateError) {
          console.error('Failed to pair with TV:', updateError);
          setConnectionState('error');
          return null;
        }

        setConnectionState('connected');
        setConnectedSessionId(session.id);

        return { sessionId: session.id, playerJoinCode: code };
      } catch (err) {
        console.error('Connection error:', err);
        setConnectionState('error');
        return null;
      }
    },
    [user]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, [stopScanning]);

  return {
    discoveredTVs,
    isScanning,
    connectionState,
    connectedSessionId,
    startScanning,
    stopScanning,
    connectToTV,
    connectWithCode,
  };
}
