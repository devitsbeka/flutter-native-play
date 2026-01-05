import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellOff, Check, X } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { ChunkyButton } from '@/components/ui/chunky-button';

interface PushNotificationSetupProps {
  onComplete?: () => void;
  showAsCard?: boolean;
}

export function PushNotificationSetup({ onComplete, showAsCard = true }: PushNotificationSetupProps) {
  const { isSupported, isRegistered, registerForPush, error } = usePushNotifications();
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleEnable = async () => {
    setIsLoading(true);
    const success = await registerForPush();
    setIsLoading(false);
    
    if (success) {
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onComplete?.();
      }, 2000);
    }
  };

  const handleSkip = () => {
    onComplete?.();
  };

  // Don't show on web
  if (!isSupported) {
    return null;
  }

  // Already registered
  if (isRegistered && !showSuccess) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Check className="w-4 h-4 text-green-500" />
        <span>Push notifications enabled</span>
      </div>
    );
  }

  const content = (
    <>
      <AnimatePresence mode="wait">
        {showSuccess ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center gap-3 py-4"
          >
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-lg font-semibold text-foreground">Notifications Enabled!</p>
            <p className="text-sm text-muted-foreground text-center">
              You'll receive alerts for game invites and daily rewards
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="setup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Bell className="w-8 h-8 text-primary" />
            </div>
            
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground mb-1">
                Stay in the Game!
              </h3>
              <p className="text-sm text-muted-foreground">
                Get notified about game invites, daily rewards, and challenges from friends
              </p>
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <div className="flex gap-3 w-full">
              <ChunkyButton
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={handleSkip}
              >
                Maybe Later
              </ChunkyButton>
              
              <ChunkyButton
                variant="primary"
                size="sm"
                className="flex-1"
                onClick={handleEnable}
                disabled={isLoading}
              >
                {isLoading ? 'Enabling...' : 'Enable'}
              </ChunkyButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  if (showAsCard) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl p-5 border border-border"
      >
        {content}
      </motion.div>
    );
  }

  return content;
}

// Toggle component for settings page
export function PushNotificationToggle() {
  const { isSupported, isRegistered, registerForPush, unregister, error } = usePushNotifications();
  const [isLoading, setIsLoading] = useState(false);

  if (!isSupported) {
    return (
      <div className="flex items-center justify-between py-3">
        <div className="flex items-center gap-3">
          <BellOff className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Push notifications (native only)
          </span>
        </div>
      </div>
    );
  }

  const handleToggle = async () => {
    setIsLoading(true);
    if (isRegistered) {
      await unregister();
    } else {
      await registerForPush();
    }
    setIsLoading(false);
  };

  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        {isRegistered ? (
          <Bell className="w-5 h-5 text-primary" />
        ) : (
          <BellOff className="w-5 h-5 text-muted-foreground" />
        )}
        <div>
          <p className="text-sm font-medium text-foreground">Push Notifications</p>
          <p className="text-xs text-muted-foreground">
            {isRegistered ? 'Enabled' : 'Disabled'}
          </p>
        </div>
      </div>
      
      <ChunkyButton
        variant={isRegistered ? 'secondary' : 'primary'}
        size="sm"
        onClick={handleToggle}
        disabled={isLoading}
      >
        {isLoading ? '...' : isRegistered ? 'Disable' : 'Enable'}
      </ChunkyButton>
    </div>
  );
}
