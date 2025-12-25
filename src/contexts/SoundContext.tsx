import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

interface SoundContextType {
  musicEnabled: boolean;
  setMusicEnabled: (enabled: boolean) => void;
  sfxEnabled: boolean;
  setSfxEnabled: (enabled: boolean) => void;
  vibrationEnabled: boolean;
  setVibrationEnabled: (enabled: boolean) => void;
  volume: number;
  setVolume: (volume: number) => void;
  
  // Helper functions
  playSound: (soundId: string) => void;
  vibrate: (pattern?: number | number[]) => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

const SOUND_STORAGE_KEY = "worldquizzes_sound_settings";

interface SoundSettings {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  vibrationEnabled: boolean;
  volume: number;
}

const defaultSettings: SoundSettings = {
  musicEnabled: true,
  sfxEnabled: true,
  vibrationEnabled: true,
  volume: 0.7,
};

export function SoundProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SoundSettings>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(SOUND_STORAGE_KEY);
      if (stored) {
        try {
          return { ...defaultSettings, ...JSON.parse(stored) };
        } catch {
          return defaultSettings;
        }
      }
    }
    return defaultSettings;
  });

  // Persist settings to localStorage
  useEffect(() => {
    localStorage.setItem(SOUND_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const setMusicEnabled = useCallback((enabled: boolean) => {
    setSettings((prev) => ({ ...prev, musicEnabled: enabled }));
  }, []);

  const setSfxEnabled = useCallback((enabled: boolean) => {
    setSettings((prev) => ({ ...prev, sfxEnabled: enabled }));
  }, []);

  const setVibrationEnabled = useCallback((enabled: boolean) => {
    setSettings((prev) => ({ ...prev, vibrationEnabled: enabled }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    setSettings((prev) => ({ ...prev, volume: Math.max(0, Math.min(1, volume)) }));
  }, []);

  // Play sound effect
  const playSound = useCallback(
    (soundId: string) => {
      if (!settings.sfxEnabled) return;
      
      // In a real app, you'd have an audio system here
      // For now, we'll just log it
      console.log(`Playing sound: ${soundId} at volume ${settings.volume}`);
      
      // Example implementation with Audio API:
      // const audio = new Audio(`/sounds/${soundId}.mp3`);
      // audio.volume = settings.volume;
      // audio.play().catch(console.error);
    },
    [settings.sfxEnabled, settings.volume]
  );

  // Vibrate device
  const vibrate = useCallback(
    (pattern: number | number[] = 50) => {
      if (!settings.vibrationEnabled) return;
      
      if ("vibrate" in navigator) {
        navigator.vibrate(pattern);
      }
    },
    [settings.vibrationEnabled]
  );

  return (
    <SoundContext.Provider
      value={{
        musicEnabled: settings.musicEnabled,
        setMusicEnabled,
        sfxEnabled: settings.sfxEnabled,
        setSfxEnabled,
        vibrationEnabled: settings.vibrationEnabled,
        setVibrationEnabled,
        volume: settings.volume,
        setVolume,
        playSound,
        vibrate,
      }}
    >
      {children}
    </SoundContext.Provider>
  );
}

export function useSound() {
  const context = useContext(SoundContext);
  if (context === undefined) {
    throw new Error("useSound must be used within a SoundProvider");
  }
  return context;
}
