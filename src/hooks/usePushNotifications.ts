import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UsePushNotificationsResult {
  isSupported: boolean;
  isRegistered: boolean;
  fcmToken: string | null;
  error: string | null;
  registerForPush: () => Promise<boolean>;
  unregister: () => Promise<void>;
}

export function usePushNotifications(): UsePushNotificationsResult {
  const [isRegistered, setIsRegistered] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const listenersRegistered = useRef(false);

  const isSupported = Capacitor.isNativePlatform();

  // Save FCM token to database
  const saveFcmToken = useCallback(async (token: string) => {
    if (!user) return;

    try {
      const platform = Capacitor.getPlatform() as 'ios' | 'android';
      
      // Upsert token to push_tokens table
      const { error: upsertError } = await supabase
        .from('push_tokens')
        .upsert(
          { 
            user_id: user.id,
            token,
            platform,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'user_id,token' }
        );

      if (upsertError) {
        console.error('Failed to save FCM token:', upsertError);
      } else {
        console.log('FCM token saved successfully');
      }
    } catch (err) {
      console.error('Error saving FCM token:', err);
    }
  }, [user]);

  // Set up notification listeners
  useEffect(() => {
    if (!isSupported || listenersRegistered.current) return;

    const setupListeners = async () => {
      // Registration success
      await PushNotifications.addListener('registration', (token: Token) => {
        console.log('Push registration success, token:', token.value);
        setFcmToken(token.value);
        setIsRegistered(true);
        setError(null);
        saveFcmToken(token.value);
      });

      // Registration error
      await PushNotifications.addListener('registrationError', (err) => {
        console.error('Push registration error:', err.error);
        setError(err.error);
        setIsRegistered(false);
      });

      // Notification received while app is in foreground
      await PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
        console.log('Push notification received:', notification);
        // Handle foreground notification - could show a toast or in-app alert
        // The notification object contains: id, title, body, data
      });

      // User tapped on notification
      await PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
        console.log('Push notification action performed:', action);
        // Handle notification tap - navigate to relevant screen based on action.notification.data
        const data = action.notification.data;
        
        if (data?.type === 'game_invite') {
          // Navigate to game room
          window.location.href = `/room/${data.roomId}`;
        } else if (data?.type === 'daily_reward') {
          // Navigate to rewards
          window.location.href = '/rewards';
        } else if (data?.type === 'friend_request') {
          // Navigate to friends
          window.location.href = '/friends';
        }
      });

      listenersRegistered.current = true;
    };

    setupListeners();

    return () => {
      // Clean up listeners on unmount
      PushNotifications.removeAllListeners();
      listenersRegistered.current = false;
    };
  }, [isSupported, saveFcmToken]);

  // Check if already registered on mount
  useEffect(() => {
    if (!isSupported) return;

    const checkPermissions = async () => {
      try {
        const result = await PushNotifications.checkPermissions();
        if (result.receive === 'granted') {
          // Already have permission, register to get token
          await PushNotifications.register();
        }
      } catch (err) {
        console.error('Error checking push permissions:', err);
      }
    };

    checkPermissions();
  }, [isSupported]);

  const registerForPush = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('Push notifications are only supported on native platforms');
      return false;
    }

    try {
      // Request permission
      const permResult = await PushNotifications.requestPermissions();
      
      if (permResult.receive !== 'granted') {
        setError('Push notification permission denied');
        return false;
      }

      // Register with FCM/APNs
      await PushNotifications.register();
      
      return true;
    } catch (err: any) {
      console.error('Push registration failed:', err);
      setError(err.message || 'Failed to register for push notifications');
      return false;
    }
  }, [isSupported]);

  const unregister = useCallback(async (): Promise<void> => {
    if (!isSupported) return;

    try {
      await PushNotifications.unregister();
      setIsRegistered(false);
      setFcmToken(null);
    } catch (err: any) {
      console.error('Push unregister failed:', err);
      setError(err.message || 'Failed to unregister from push notifications');
    }
  }, [isSupported]);

  return {
    isSupported,
    isRegistered,
    fcmToken,
    error,
    registerForPush,
    unregister,
  };
}
