import { motion, AnimatePresence } from "framer-motion";
import { X, Volume2, VolumeX, Music, Vibrate } from "lucide-react";
import { useSound } from "@/contexts/SoundContext";
import { t } from "@/lib/i18n";

interface SoundSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Toggle switch component
const ToggleSwitch = ({
  enabled,
  onChange,
  icon: Icon,
  label,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  icon: React.ElementType;
  label: string;
}) => (
  <motion.button
    onClick={() => onChange(!enabled)}
    className="w-full flex items-center justify-between p-4 rounded-2xl transition-colors"
    style={{
      background: enabled ? "rgba(168,85,247,0.1)" : "rgba(0,0,0,0.03)",
    }}
    whileTap={{ scale: 0.98 }}
  >
    <div className="flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center"
        style={{
          background: enabled ? "hsl(var(--primary))" : "hsl(var(--muted))",
        }}
      >
        <Icon className={`w-5 h-5 ${enabled ? "text-white" : "text-muted-foreground"}`} />
      </div>
      <span className="font-semibold text-foreground">{label}</span>
    </div>
    
    {/* Toggle switch */}
    <div
      className="relative w-14 h-8 rounded-full transition-colors"
      style={{
        background: enabled ? "hsl(var(--primary))" : "hsl(var(--muted))",
      }}
    >
      <motion.div
        className="absolute top-1 w-6 h-6 rounded-full bg-white shadow-md"
        animate={{ left: enabled ? 30 : 4 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    </div>
  </motion.button>
);

export function SoundSettingsModal({ isOpen, onClose }: SoundSettingsModalProps) {
  const {
    musicEnabled,
    setMusicEnabled,
    sfxEnabled,
    setSfxEnabled,
    vibrationEnabled,
    setVibrationEnabled,
  } = useSound();
  
  if (!isOpen) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-sm overflow-hidden rounded-3xl"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(250,248,255,0.98) 100%)",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-border/50">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎧</span>
              <h2 className="font-display text-xl font-bold">{t("sound.title")}</h2>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-muted/80 flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Settings */}
          <div className="p-4 space-y-3">
            <ToggleSwitch
              enabled={musicEnabled}
              onChange={setMusicEnabled}
              icon={Music}
              label={t("sound.music")}
            />
            
            <ToggleSwitch
              enabled={sfxEnabled}
              onChange={setSfxEnabled}
              icon={sfxEnabled ? Volume2 : VolumeX}
              label={t("sound.soundEffects")}
            />
            
            <ToggleSwitch
              enabled={vibrationEnabled}
              onChange={setVibrationEnabled}
              icon={Vibrate}
              label={t("sound.vibration")}
            />
          </div>
          
          {/* Footer hint */}
          <div className="p-4 pt-0">
            <p className="text-xs text-center text-muted-foreground">
              პარამეტრები ავტომატურად შეინახება
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
