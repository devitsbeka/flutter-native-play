import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Smartphone, 
  Wifi, 
  Check, 
  Loader2, 
  ChevronRight,
  Keyboard,
  MonitorSmartphone,
  Airplay,
  Cast,
  ArrowRight,
} from 'lucide-react';
import retroTvIcon from '@/assets/retro-tv-colored.png';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChunkyButton } from '@/components/ui/chunky-button';
import { Input } from '@/components/ui/input';
import { useExternalDisplay } from '@/hooks/useExternalDisplay';
import { useTVDiscovery } from '@/hooks/useTVDiscovery';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast, connectivityToast } from "@/lib/toast";
import { Capacitor } from '@capacitor/core';

interface TVMirrorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'choose' | 'manual-code' | 'connecting' | 'connected';

export function TVMirrorModal({ open, onOpenChange }: TVMirrorModalProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { getConnectionInstructions, isSupported: mirrorSupported } = useExternalDisplay();
  const {
    discoveredTVs,
    isScanning,
    connectionState,
    connectedSessionId,
    startScanning,
    stopScanning,
    connectToTV,
    connectWithCode,
  } = useTVDiscovery();

  const [step, setStep] = useState<Step>('choose');
  const [manualCode, setManualCode] = useState('');
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  const platform = Capacitor.getPlatform();
  const instructions = getConnectionInstructions();

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setStep('choose');
      setManualCode('');
      startScanning();
    } else {
      stopScanning();
    }
  }, [open, startScanning, stopScanning]);

  // Navigate when connected
  useEffect(() => {
    if (connectionState === 'connected' && connectedSessionId) {
      setStep('connected');
      toast.success(t('tv.connected'));
      
      setTimeout(() => {
        onOpenChange(false);
        navigate(`/tv/host/${connectedSessionId}`);
      }, 1000);
    }
  }, [connectionState, connectedSessionId, navigate, onOpenChange, t]);

  // Create a new TV session for mirroring
  const handleStartMirrorMode = async () => {
    if (!user) {
      toast.error(t('auth.signInRequired'));
      return;
    }

    setIsCreatingSession(true);

    try {
      // Generate a simple 4-digit pairing code
      const pairingCode = Math.floor(1000 + Math.random() * 9000).toString();
      
      // Create TV session
      const { data: session, error } = await supabase
        .from('tv_sessions')
        .insert({
          host_user_id: user.id,
          tv_pairing_code: pairingCode,
          pairing_code: pairingCode, // Same code for guest joining
          status: 'waiting',
          is_paired: true, // Already paired since we're the host
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(t('tv.sessionCreated'));
      onOpenChange(false);
      navigate(`/tv/host/${session.id}`);
    } catch (error) {
      console.error('Failed to create TV session:', error);
      toast.error(t('tv.sessionCreateFailed'));
    } finally {
      setIsCreatingSession(false);
    }
  };

  // Connect with manual code
  const handleManualConnect = async () => {
    if (manualCode.length !== 4) return;
    
    setStep('connecting');
    const result = await connectWithCode(manualCode);
    
    if (!result) {
      connectivityToast.error(t('tv.connectionFailed'));
      setStep('manual-code');
    }
  };

  // Render step content
  const renderContent = () => {
    switch (step) {
      case 'choose':
        return (
          <motion.div
            key="choose"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Start hosting (if TV already has browser open) */}
            <button
              onClick={handleStartMirrorMode}
              disabled={isCreatingSession}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 hover:border-emerald-400 transition-all group disabled:opacity-50"
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                {isCreatingSession ? (
                  <Loader2 className="w-7 h-7 text-white animate-spin" />
                ) : (
                  <img src={retroTvIcon} alt="TV" className="w-9 h-9 object-contain" />
                )}
              </div>
              <div className="flex-1 text-left">
                <p className="font-bold text-slate-800 text-lg">{t('tv.startHosting')}</p>
                <p className="text-sm text-slate-600">
                  {t('tv.startHostingDescription')}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
            </button>

            {/* Discovered TVs (if any found via network) */}
            {discoveredTVs.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-sm font-medium text-slate-500 px-1">
                  {t('tv.nearbyTVs')}
                </p>
                {discoveredTVs.map((tv) => (
                  <button
                    key={tv.id}
                    onClick={() => connectToTV(tv)}
                    disabled={connectionState === 'connecting'}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200 hover:border-purple-300 transition-all"
                  >
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                      <img src={retroTvIcon} alt="TV" className="w-6 h-6 object-contain" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-slate-700">{tv.deviceName}</p>
                      <p className="text-xs text-slate-500">{t('tv.code')}: {tv.pairingCode}</p>
                    </div>
                    <Wifi className="w-4 h-4 text-emerald-500" />
                  </button>
                ))}
              </div>
            )}

            {/* Manual code link */}
            <button
              onClick={() => setStep('manual-code')}
              className="w-full flex items-center justify-center gap-2 py-3 text-slate-600 hover:text-purple-600 transition-colors text-sm"
            >
              <Keyboard className="w-4 h-4" />
              {t('tv.enterCodeManually')}
            </button>
          </motion.div>
        );

      case 'manual-code':
        return (
          <motion.div
            key="manual-code"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <p className="text-slate-600 text-sm text-center">
              {t('tv.enterCodeFromTV')}
            </p>

            {/* Code input */}
            <div className="flex justify-center">
              <Input
                type="text"
                maxLength={4}
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="0000"
                className="text-center text-4xl font-bold tracking-[0.5em] w-48 h-16 border-2"
                autoFocus
              />
            </div>

            <ChunkyButton
              variant="primary"
              onClick={handleManualConnect}
              disabled={manualCode.length !== 4}
              className="w-full"
            >
              {t('tv.connect')}
            </ChunkyButton>

            <button
              onClick={() => setStep('choose')}
              className="w-full text-center text-slate-500 text-sm hover:text-slate-700 py-2"
            >
              {t('common.back')}
            </button>
          </motion.div>
        );

      case 'connecting':
        return (
          <motion.div
            key="connecting"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center py-8"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="w-16 h-16 rounded-full border-4 border-purple-200 border-t-purple-600 mb-4"
            />
            <p className="text-slate-700 font-medium">{t('tv.connecting')}</p>
          </motion.div>
        );

      case 'connected':
        return (
          <motion.div
            key="connected"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center py-8"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center mb-4"
            >
              <Check className="w-8 h-8 text-white" />
            </motion.div>
            <p className="text-slate-700 font-medium">{t('tv.connected')}</p>
          </motion.div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-gradient-to-b from-white to-slate-50 border-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-white text-xl">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <img src={retroTvIcon} alt="TV" className="w-8 h-8 object-contain" />
              </div>
              {t('tv.playOnTV')}
            </DialogTitle>
          </DialogHeader>
          <p className="text-white/80 text-sm mt-2">
            {t('tv.playOnTVDescription')}
          </p>
        </div>

        <div className="p-5">
          <AnimatePresence mode="wait">
            {renderContent()}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
