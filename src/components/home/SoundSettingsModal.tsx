import { ICON_URLS } from "@/lib/toast-icons";
import { motion } from "framer-motion";
import { Volume2, VolumeX, Music, Vibrate } from "lucide-react";
import { useSound } from "@/contexts/SoundContext";
import { t } from "@/lib/i18n";
import { GameModal } from "@/components/ui/game-modal";

interface SoundSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Toggle switch component - Updated for light theme
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
      background: enabled 
        ? "linear-gradient(180deg, #EDE9FE 0%, #DDD6FE 100%)" 
        : "#F3F4F6",
      boxShadow: enabled 
        ? "0 3px 0 #C4B5FD, inset 0 1px 2px rgba(255,255,255,0.8)" 
        : "0 3px 0 #E5E7EB, inset 0 1px 2px rgba(255,255,255,0.8)",
    }}
    whileTap={{ scale: 0.98, y: 2 }}
  >
    <div className="flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center"
        style={{
          background: enabled 
            ? "linear-gradient(135deg, #A855F7 0%, #7C3AED 100%)" 
            : "#D1D5DB",
          boxShadow: enabled ? "0 2px 0 #6D28D9" : "0 2px 0 #9CA3AF",
        }}
      >
        <Icon className="w-5 h-5 text-white" />
      </div>
      <span className="font-semibold text-gray-800">{label}</span>
    </div>
    
    {/* Toggle switch */}
    <div
      className="relative w-14 h-8 rounded-full transition-colors"
      style={{
        background: enabled 
          ? "linear-gradient(135deg, #A855F7 0%, #7C3AED 100%)" 
          : "#D1D5DB",
        boxShadow: enabled ? "0 2px 0 #6D28D9" : "0 2px 0 #9CA3AF",
      }}
    >
      <motion.div
        className="absolute top-1 w-6 h-6 rounded-full bg-white"
        style={{
          boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
        }}
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
  
  return (
    <GameModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("sound.title")}
      iconSrc={ICON_URLS.headphones}
      showSparkles={false}
    >
      {/* Settings */}
      <div className="space-y-3 mb-4">
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
      <p className="text-xs text-center text-gray-400">
        {t("extra.settingsAutoSave")}
      </p>
    </GameModal>
  );
}
