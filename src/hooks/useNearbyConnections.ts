import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { 
  NearbyConnections, 
  DiscoveredRoom, 
  NearbyRoomInfo 
} from '@/plugins/nearby-connections';

export interface JoinRequest {
  peerId: string;
  roomCode: string;
}

export interface UseNearbyConnectionsOptions {
  onJoinRequest?: (request: JoinRequest) => void;
}

export interface UseNearbyConnectionsResult {
  // State
  isSupported: boolean;
  isAdvertising: boolean;
  isBrowsing: boolean;
  nearbyRooms: DiscoveredRoom[];
  pendingJoinRequests: JoinRequest[];
  
  // Actions
  startAdvertising: (roomInfo: NearbyRoomInfo) => Promise<boolean>;
  stopAdvertising: () => Promise<void>;
  updateAdvertising: (roomInfo: NearbyRoomInfo) => Promise<void>;
  startBrowsing: () => Promise<boolean>;
  stopBrowsing: () => Promise<void>;
  requestToJoin: (peerId: string) => Promise<string | null>;
  respondToJoinRequest: (peerId: string, accept: boolean) => Promise<boolean>;
  disconnect: () => Promise<void>;
  refreshRooms: () => Promise<void>;
  clearJoinRequest: (peerId: string) => void;
}

/**
 * React hook for Nearby Connections functionality
 * Allows discovering and connecting to nearby game rooms using Multipeer Connectivity
 */
export function useNearbyConnections(options?: UseNearbyConnectionsOptions): UseNearbyConnectionsResult {
  const [isSupported, setIsSupported] = useState(false);
  const [isAdvertising, setIsAdvertising] = useState(false);
  const [isBrowsing, setIsBrowsing] = useState(false);
  const [nearbyRooms, setNearbyRooms] = useState<DiscoveredRoom[]>([]);
  const [pendingJoinRequests, setPendingJoinRequests] = useState<JoinRequest[]>([]);
  
  const listenersSetup = useRef(false);
  const onJoinRequestRef = useRef(options?.onJoinRequest);
  
  // Keep the callback ref updated
  useEffect(() => {
    onJoinRequestRef.current = options?.onJoinRequest;
  }, [options?.onJoinRequest]);

  // Check if supported on mount
  useEffect(() => {
    const checkSupport = async () => {
      // Only supported on iOS native
      if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') {
        setIsSupported(false);
        return;
      }

      try {
        const result = await NearbyConnections.isSupported();
        setIsSupported(result.supported);
      } catch (error) {
        console.error('[NearbyConnections] Error checking support:', error);
        setIsSupported(false);
      }
    };

    checkSupport();
  }, []);

  // Set up event listeners
  useEffect(() => {
    if (!isSupported || listenersSetup.current) return;

    const setupListeners = async () => {
      // Room discovered
      await NearbyConnections.addListener('roomDiscovered', (room) => {
        setNearbyRooms(prev => {
          // Update if exists, add if new
          const index = prev.findIndex(r => r.peerId === room.peerId);
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = room;
            return updated;
          }
          return [...prev, room];
        });
      });

      // Room lost
      await NearbyConnections.addListener('roomLost', ({ peerId }) => {
        setNearbyRooms(prev => prev.filter(r => r.peerId !== peerId));
      });

      // Join request received (host side)
      await NearbyConnections.addListener('joinRequestReceived', ({ peerId, roomCode }) => {
        const request: JoinRequest = { peerId, roomCode };
        setPendingJoinRequests(prev => [...prev, request]);
        onJoinRequestRef.current?.(request);
      });

      // Peer connected
      await NearbyConnections.addListener('peerConnected', () => {});

      // Peer disconnected
      await NearbyConnections.addListener('peerDisconnected', () => {});

      listenersSetup.current = true;
    };

    setupListeners();

    return () => {
      NearbyConnections.removeAllListeners();
      listenersSetup.current = false;
    };
  }, [isSupported]);

  // Start advertising a room
  const startAdvertising = useCallback(async (roomInfo: NearbyRoomInfo): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      const result = await NearbyConnections.startAdvertising(roomInfo);
      setIsAdvertising(result.advertising);
      return result.advertising;
    } catch (error) {
      console.error('[NearbyConnections] Error starting advertising:', error);
      return false;
    }
  }, [isSupported]);

  // Stop advertising
  const stopAdvertising = useCallback(async (): Promise<void> => {
    if (!isSupported) return;

    try {
      await NearbyConnections.stopAdvertising();
      setIsAdvertising(false);
    } catch (error) {
      console.error('[NearbyConnections] Error stopping advertising:', error);
    }
  }, [isSupported]);

  // Update advertising info
  const updateAdvertising = useCallback(async (roomInfo: NearbyRoomInfo): Promise<void> => {
    if (!isSupported || !isAdvertising) return;

    try {
      await NearbyConnections.updateAdvertising(roomInfo);
    } catch (error) {
      console.error('[NearbyConnections] Error updating advertising:', error);
    }
  }, [isSupported, isAdvertising]);

  // Start browsing for nearby rooms
  const startBrowsing = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      setNearbyRooms([]);
      const result = await NearbyConnections.startBrowsing();
      setIsBrowsing(result.browsing);
      return result.browsing;
    } catch (error) {
      console.error('[NearbyConnections] Error starting browsing:', error);
      return false;
    }
  }, [isSupported]);

  // Stop browsing
  const stopBrowsing = useCallback(async (): Promise<void> => {
    if (!isSupported) return;

    try {
      await NearbyConnections.stopBrowsing();
      setIsBrowsing(false);
      setNearbyRooms([]);
    } catch (error) {
      console.error('[NearbyConnections] Error stopping browsing:', error);
    }
  }, [isSupported]);

  // Request to join a room
  const requestToJoin = useCallback(async (peerId: string): Promise<string | null> => {
    if (!isSupported) return null;

    try {
      const result = await NearbyConnections.requestToJoin({ peerId });
      return result.roomCode;
    } catch (error) {
      console.error('[NearbyConnections] Error requesting to join:', error);
      return null;
    }
  }, [isSupported]);

  // Disconnect from all peers
  const disconnect = useCallback(async (): Promise<void> => {
    if (!isSupported) return;

    try {
      await NearbyConnections.disconnect();
      setIsAdvertising(false);
      setIsBrowsing(false);
      setNearbyRooms([]);
    } catch (error) {
      console.error('[NearbyConnections] Error disconnecting:', error);
    }
  }, [isSupported]);

  // Refresh discovered rooms
  const refreshRooms = useCallback(async (): Promise<void> => {
    if (!isSupported || !isBrowsing) return;

    try {
      const result = await NearbyConnections.getDiscoveredRooms();
      setNearbyRooms(result.rooms);
    } catch (error) {
      console.error('[NearbyConnections] Error refreshing rooms:', error);
    }
  }, [isSupported, isBrowsing]);

  // Clear a join request from the pending list
  const clearJoinRequest = useCallback((peerId: string) => {
    setPendingJoinRequests(prev => prev.filter(r => r.peerId !== peerId));
  }, []);

  // Respond to a join request (host accepts or declines)
  const respondToJoinRequest = useCallback(async (peerId: string, accept: boolean): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      const result = await NearbyConnections.respondToJoinRequest({ peerId, accept });
      // Clear the request from pending list
      setPendingJoinRequests(prev => prev.filter(r => r.peerId !== peerId));
      return result.accepted;
    } catch (error) {
      console.error('[NearbyConnections] Error responding to join request:', error);
      return false;
    }
  }, [isSupported]);

  return {
    isSupported,
    isAdvertising,
    isBrowsing,
    nearbyRooms,
    pendingJoinRequests,
    startAdvertising,
    stopAdvertising,
    updateAdvertising,
    startBrowsing,
    stopBrowsing,
    requestToJoin,
    respondToJoinRequest,
    disconnect,
    refreshRooms,
    clearJoinRequest,
  };
}
