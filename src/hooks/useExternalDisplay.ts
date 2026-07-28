import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';

// Presentation API types (not all browsers support this)
interface PresentationConnection {
  state: 'connecting' | 'connected' | 'closed' | 'terminated';
  send: (message: string) => void;
  terminate: () => void;
  onconnect: (() => void) | null;
  onterminate: (() => void) | null;
}

interface PresentationRequest {
  start: () => Promise<PresentationConnection>;
}

declare global {
  interface Navigator {
    presentation?: {
      defaultRequest?: PresentationRequest | null;
    };
  }
  
  interface Window {
    PresentationRequest?: new (urls: string[]) => PresentationRequest;
  }
}

export interface ExternalDisplayState {
  isConnected: boolean;
  displayName: string | null;
  displayType: 'airplay' | 'miracast' | 'presentation' | null;
  isSupported: boolean;
}

/**
 * Hook to detect and manage external display connections
 * Works with AirPlay (iOS) and Miracast/Presentation API (Android/Web)
 */
export function useExternalDisplay() {
  const [state, setState] = useState<ExternalDisplayState>({
    isConnected: false,
    displayName: null,
    displayType: null,
    isSupported: false,
  });
  
  const presentationRef = useRef<PresentationConnection | null>(null);
  const checkIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check if external display APIs are supported
  const checkSupport = useCallback(() => {
    const isNative = Capacitor.isNativePlatform();
    const platform = Capacitor.getPlatform();
    
    // On iOS native app, AirPlay is always available
    if (isNative && platform === 'ios') {
      return { supported: true, type: 'airplay' as const };
    }
    
    // On Android native app, Miracast/Presentation API
    if (isNative && platform === 'android') {
      return { supported: true, type: 'miracast' as const };
    }
    
    // On web, check for Presentation API (Chrome only)
    if ('presentation' in navigator && 'PresentationRequest' in window) {
      return { supported: true, type: 'presentation' as const };
    }
    
    return { supported: false, type: null };
  }, []);

  // Initialize and check for support
  useEffect(() => {
    const { supported, type } = checkSupport();
    setState(prev => ({
      ...prev,
      isSupported: supported,
      displayType: type,
    }));

    // For web, we can monitor screen changes
    if (typeof window !== 'undefined' && window.screen) {
      const handleScreenChange = () => {
        // Check if screen configuration changed (could indicate external display)
        const hasMultipleScreens = window.screen.availWidth > window.innerWidth * 1.5;
        if (hasMultipleScreens) {
          setState(prev => ({
            ...prev,
            isConnected: true,
            displayName: 'External Display',
          }));
        }
      };

      window.addEventListener('resize', handleScreenChange);
      return () => window.removeEventListener('resize', handleScreenChange);
    }
  }, [checkSupport]);

  // Request to present on external display (Web Presentation API)
  const requestPresentation = useCallback(async (url: string): Promise<boolean> => {
    if (!window.PresentationRequest) {
      console.log('Presentation API not supported');
      return false;
    }

    try {
      const request = new window.PresentationRequest([url]);
      
      // Show native display picker
      const connection = await request.start();
      presentationRef.current = connection;
      
      connection.onconnect = () => {
        setState(prev => ({
          ...prev,
          isConnected: true,
          displayName: 'Presentation Display',
        }));
      };

      connection.onterminate = () => {
        setState(prev => ({
          ...prev,
          isConnected: false,
          displayName: null,
        }));
        presentationRef.current = null;
      };

      return true;
    } catch (error) {
      console.error('Failed to start presentation:', error);
      return false;
    }
  }, []);

  // Send message to external display
  const sendMessage = useCallback((message: any) => {
    if (presentationRef.current?.state === 'connected') {
      presentationRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  // Close external display connection
  const closePresentation = useCallback(() => {
    if (presentationRef.current) {
      presentationRef.current.terminate();
      presentationRef.current = null;
    }
    setState(prev => ({
      ...prev,
      isConnected: false,
      displayName: null,
    }));
  }, []);

  // Get instructions for connecting based on platform
  const getConnectionInstructions = useCallback(() => {
    const platform = Capacitor.getPlatform();
    
    if (platform === 'ios') {
      return {
        steps: [
          'Swipe down from the top-right corner of your screen',
          'Tap "Screen Mirroring"',
          'Select your TV from the list',
          'Your TV will display the game automatically',
        ],
        icon: 'airplay',
        title: 'Connect via AirPlay',
      };
    }
    
    if (platform === 'android') {
      return {
        steps: [
          'Swipe down from the top of your screen',
          'Tap "Smart View", "Cast", or "Screen Mirroring"',
          'Select your TV from the list',
          'Your TV will display the game automatically',
        ],
        icon: 'cast',
        title: 'Connect via Smart View',
      };
    }
    
    // Web/Desktop
    return {
      steps: [
        'Click the Cast icon in your browser (Chrome)',
        'Select your TV or Chromecast device',
        'Choose "Cast tab" to share this page',
      ],
      icon: 'monitor',
      title: 'Connect via Cast',
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      closePresentation();
    };
  }, [closePresentation]);

  return {
    ...state,
    requestPresentation,
    sendMessage,
    closePresentation,
    getConnectionInstructions,
  };
}
