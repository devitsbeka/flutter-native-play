import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Tv, Wifi, WifiOff, Loader2, Check, ChevronRight, Keyboard, ChevronLeft } from 'lucide-react';
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

  // Navigate to host controller when connected
  useEffect(() => {
    if (connectionState === 'connected' && connectedSessionId) {
      toast.success(t('tv.connected'));
      
      setTimeout(() => {
        onOpenChange(false);
        navigate(`/tv/host/${connectedSessionId}`);
      }, 500);
    }
  }, [connectionState, connectedSessionId, navigate, onOpenChange, t]);

  const handleConnectToTV = async (tv: DiscoveredTV) => {
    setConnectingToId(tv.id);
    const result = await connectToTV(tv);
    if (!result) {
      toast.error(t('tv.connectionFailed'));
      setConnectingToId(null);
    }
  };

  const handleManualConnect = async () => {
    if (manualCode.length !== 4) return;
    const result = await connectWithCode(manualCode);
    if (!result) {
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

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background"
        >
          {/* Fixed Header */}
          <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-purple-600 to-indigo-600 safe-top">
            <div className="flex items-center gap-3 px-4 py-4">
              <button 
                onClick={() => onOpenChange(false)} 
                className="p-2 -ml-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Tv className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-lg font-bold text-white">{t('tv.connectToTV')}</h1>
                <p className="text-white/70 text-xs">{t('tv.discoverNearbyTVs')}</p>
              </div>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="h-full overflow-y-auto pt-[88px] pb-6 safe-top">
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
                        className="flex items-center justify-center gap-2 py-8"
                      >
                        {/* Radar animation */}
                        <div className="relative w-20 h-20">
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
                            <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center">
                              <Wifi className="w-5 h-5 text-white" />
                            </div>
                          </div>
                        </div>
                        <span className="text-muted-foreground text-sm ml-2">{t('tv.scanningForDevices')}</span>
                      </motion.div>
                    )}

                    {/* Discovered TVs list */}
                    <div className="space-y-3 min-h-[150px]">
                      {discoveredTVs.length === 0 && isScanning && (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-center text-muted-foreground text-sm py-8"
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
                          className="w-full flex items-center gap-3 p-4 rounded-xl bg-card border border-border shadow-sm hover:shadow-md hover:border-primary/30 transition-all disabled:opacity-50"
                        >
                          {/* TV Icon */}
                          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center flex-shrink-0">
                            <Tv className="w-7 h-7 text-foreground" />
                          </div>

                          {/* TV Info */}
                          <div className="flex-1 text-left">
                            <p className="font-semibold text-foreground">{tv.deviceName}</p>
                            <p className="text-xs text-muted-foreground">
                              {t('tv.code')}: {tv.pairingCode}
                            </p>
                          </div>

                          {/* Status / Signal */}
                          <div className="flex items-center gap-2">
                            {connectingToId === tv.id ? (
                              <Loader2 className="w-5 h-5 text-primary animate-spin" />
                            ) : tv.status === 'paired' ? (
                              <Check className="w-5 h-5 text-emerald-500" />
                            ) : (
                              <>
                                {getSignalIcon(tv.signalStrength)}
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                              </>
                            )}
                          </div>
                        </motion.button>
                      ))}

                      {!isScanning && discoveredTVs.length === 0 && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-center py-12"
                        >
                          <WifiOff className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                          <p className="text-muted-foreground text-sm mb-4">{t('tv.noDevicesFound')}</p>
                          <ChunkyButton
                            variant="outline"
                            size="sm"
                            onClick={startScanning}
                          >
                            {t('tv.scanAgain')}
                          </ChunkyButton>
                        </motion.div>
                      )}
                    </div>

                    {/* Manual code button */}
                    <button
                      onClick={() => setShowManualInput(true)}
                      className="w-full flex items-center justify-center gap-2 py-4 text-muted-foreground hover:text-primary transition-colors text-sm"
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
                    className="space-y-6 pt-4"
                  >
                    <p className="text-muted-foreground text-sm text-center">
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
                        className="text-center text-4xl font-bold tracking-[0.5em] w-52 h-20 border-2 bg-card"
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
                      className="w-full text-center text-muted-foreground text-sm hover:text-foreground py-2"
                    >
                      {t('common.back')}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
