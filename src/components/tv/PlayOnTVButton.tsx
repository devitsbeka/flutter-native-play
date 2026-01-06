import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Tv, Airplay, Cast, MonitorSmartphone } from 'lucide-react';
import { ChunkyButton } from '@/components/ui/chunky-button';
import { TVMirrorModal } from './TVMirrorModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { Capacitor } from '@capacitor/core';

interface PlayOnTVButtonProps {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function PlayOnTVButton({ variant = 'secondary', size = 'md', className = '' }: PlayOnTVButtonProps) {
  const { t } = useLanguage();
  const [showModal, setShowModal] = useState(false);
  
  const platform = Capacitor.getPlatform();
  
  // Choose the right icon based on platform
  const Icon = platform === 'ios' ? Airplay : platform === 'android' ? Cast : MonitorSmartphone;

  return (
    <>
      <ChunkyButton
        variant={variant}
        size={size}
        onClick={() => setShowModal(true)}
        className={className}
      >
        <Icon className="w-5 h-5 mr-2" />
        {t('tv.playOnTV')}
      </ChunkyButton>

      <TVMirrorModal
        open={showModal}
        onOpenChange={setShowModal}
      />
    </>
  );
}

// Compact version for tight spaces
export function PlayOnTVIconButton({ className = '' }: { className?: string }) {
  const { t } = useLanguage();
  const [showModal, setShowModal] = useState(false);
  
  const platform = Capacitor.getPlatform();
  const Icon = platform === 'ios' ? Airplay : platform === 'android' ? Cast : Tv;

  return (
    <>
      <motion.button
        onClick={() => setShowModal(true)}
        className={`relative flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg hover:shadow-xl transition-shadow ${className}`}
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95 }}
        title={t('tv.playOnTV')}
      >
        <Icon className="w-6 h-6" />
        
        {/* Pulse effect */}
        <motion.div
          className="absolute inset-0 rounded-2xl bg-purple-400"
          animate={{ scale: [1, 1.2], opacity: [0.4, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </motion.button>

      <TVMirrorModal
        open={showModal}
        onOpenChange={setShowModal}
      />
    </>
  );
}
