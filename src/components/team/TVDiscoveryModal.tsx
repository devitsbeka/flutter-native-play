import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Tv, Wifi, WifiOff, Loader2, Check, ChevronRight, Keyboard } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChunkyButton } from '@/components/ui/chunky-button';
import { Input } from '@/components/ui/input';
import { useTVDiscovery, DiscoveredTV } from '@/hooks/useTVDiscovery';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

interface TVDiscoveryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TVDiscoveryModal({ open, onOpenChange }: TVDiscoveryModalProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
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

  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [connectingToId, setConnectingToId] = useState<string | null>(null);

  // Start scanning when modal opens
  useEffect(() => {
    if (open) {
      startScanning();
    } else {
      stopScanning();
      setShowManualInput(false);
      setManualCode('');
      setConnectingToId(null);
    }
  }, [open, startScanning, stopScanning]);

  // Navigate to controller when connected
  useEffect(() => {
    if (connectionState === 'connected' && connectedSessionId) {
      toast.success(t('tv.connected'));
      // Find the connected TV to get its pairing code
      const connectedTV = discoveredTVs.find(tv => tv.status === 'paired');
      const pairingCode = connectedTV?.pairingCode || manualCode;
      
      setTimeout(() => {
        onOpenChange(false);
        navigate(`/controller/${pairingCode}`);
      }, 500);
    }
  }, [connectionState, connectedSessionId, discoveredTVs, manualCode, navigate, onOpenChange, t]);

  const handleConnectToTV = async (tv: DiscoveredTV) => {
    setConnectingToId(tv.id);
    const sessionId = await connectToTV(tv);
    if (!sessionId) {
      toast.error(t('tv.connectionFailed'));
      setConnectingToId(null);
    }
  };

  const handleManualConnect = async () => {
    if (manualCode.length !== 4) return;
    const sessionId = await connectWithCode(manualCode);
    if (!sessionId) {
      toast.error(t('tv.connectionFailed'));
    }
  };

  const getSignalIcon = (strength: DiscoveredTV['signalStrength']) => {
    switch (strength) {
      case 'strong':
        return <Wifi className="w-4 h-4 text-emerald-500" />;
      case 'medium':
        return <Wifi className="w-4 h-4 text-amber-500" />;
      case 'weak':
        return <WifiOff className="w-4 h-4 text-red-500" />;
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
                <Tv className="w-6 h-6" />
              </div>
              {t('tv.connectToTV')}
            </DialogTitle>
          </DialogHeader>
          <p className="text-white/80 text-sm mt-2">
            {t('tv.discoverNearbyTVs')}
          </p>
        </div>

        <div className="p-5 space-y-4">
          <AnimatePresence mode="wait">
            {!showManualInput ? (
              <motion.div
                key="discovery"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {/* Scanning indicator */}
                {isScanning && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-center gap-2 py-4"
                  >
                    {/* Radar animation */}
                    <div className="relative w-16 h-16">
                      <motion.div
                        className="absolute inset-0 rounded-full border-2 border-purple-500/30"
                        animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                      <motion.div
                        className="absolute inset-0 rounded-full border-2 border-purple-500/30"
                        animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                          <Wifi className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    </div>
                    <span className="text-slate-600 text-sm ml-2">{t('tv.scanningForDevices')}</span>
                  </motion.div>
                )}

                {/* Discovered TVs list */}
                <div className="space-y-2 min-h-[120px]">
                  {discoveredTVs.length === 0 && isScanning && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center text-slate-500 text-sm py-6"
                    >
                      {t('tv.lookingForTVs')}
                    </motion.p>
                  )}

                  {discoveredTVs.map((tv, index) => (
                    <motion.button
                      key={tv.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => handleConnectToTV(tv)}
                      disabled={connectingToId !== null}
                      className="w-full flex items-center gap-3 p-4 rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-purple-300 transition-all disabled:opacity-50"
                    >
                      {/* TV Icon */}
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center flex-shrink-0">
                        <Tv className="w-6 h-6 text-slate-700" />
                      </div>

                      {/* TV Info */}
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-slate-800">{tv.deviceName}</p>
                        <p className="text-xs text-slate-500">
                          {t('tv.code')}: {tv.pairingCode}
                        </p>
                      </div>

                      {/* Status / Signal */}
                      <div className="flex items-center gap-2">
                        {connectingToId === tv.id ? (
                          <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />
                        ) : tv.status === 'paired' ? (
                          <Check className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <>
                            {getSignalIcon(tv.signalStrength)}
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          </>
                        )}
                      </div>
                    </motion.button>
                  ))}

                  {!isScanning && discoveredTVs.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-8"
                    >
                      <WifiOff className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500 text-sm">{t('tv.noDevicesFound')}</p>
                      <ChunkyButton
                        variant="outline"
                        size="sm"
                        onClick={startScanning}
                        className="mt-4"
                      >
                        {t('tv.scanAgain')}
                      </ChunkyButton>
                    </motion.div>
                  )}
                </div>

                {/* Manual code button */}
                <button
                  onClick={() => setShowManualInput(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 text-slate-600 hover:text-purple-600 transition-colors text-sm"
                >
                  <Keyboard className="w-4 h-4" />
                  {t('tv.enterCodeManually')}
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="manual"
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
                  disabled={manualCode.length !== 4 || connectionState === 'connecting'}
                  className="w-full"
                >
                  {connectionState === 'connecting' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      {t('tv.connecting')}
                    </>
                  ) : (
                    t('tv.connect')
                  )}
                </ChunkyButton>

                <button
                  onClick={() => setShowManualInput(false)}
                  className="w-full text-center text-slate-500 text-sm hover:text-slate-700 py-2"
                >
                  {t('common.back')}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
