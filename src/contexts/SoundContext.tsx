import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from "react";

// Sound effect types for the game
export type SoundEffect = 
  | "notification"
  | "friend-request"
  | "friend-accepted"
  | "correct-answer"
  | "wrong-answer"
  | "game-start"
  | "game-win"
  | "game-lose"
  | "countdown"
  | "button-click"
  | "level-up"
  | "reward"
  | "power-up";

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
  playSound: (soundId: SoundEffect) => void;
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

// Generate synthetic sounds using Web Audio API
function createSynthSound(
  audioContext: AudioContext,
  type: SoundEffect,
  volume: number
): void {
  const gainNode = audioContext.createGain();
  gainNode.connect(audioContext.destination);
  gainNode.gain.value = volume * 0.3;

  const now = audioContext.currentTime;

  switch (type) {
    case "notification":
    case "friend-request": {
      // Pleasant chime - two ascending notes
      [440, 660].forEach((freq, i) => {
        const osc = audioContext.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq;
        osc.connect(gainNode);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.2);
      });
      break;
    }

    case "friend-accepted": {
      // Happy ascending arpeggio
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = audioContext.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq;
        osc.connect(gainNode);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.15);
      });
      break;
    }

    case "correct-answer": {
      // Quick triumphant sound
      const osc = audioContext.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(783.99, now + 0.1);
      osc.connect(gainNode);
      osc.start(now);
      osc.stop(now + 0.2);
      break;
    }

    case "wrong-answer": {
      // Buzzer sound
      const osc = audioContext.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = 150;
      gainNode.gain.value = volume * 0.15;
      osc.connect(gainNode);
      osc.start(now);
      osc.stop(now + 0.3);
      break;
    }

    case "game-start":
    case "countdown": {
      // Countdown beep
      const osc = audioContext.createOscillator();
      osc.type = "sine";
      osc.frequency.value = 880;
      osc.connect(gainNode);
      osc.start(now);
      osc.stop(now + 0.1);
      break;
    }

    case "game-win": {
      // Victory fanfare
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, i) => {
        const osc = audioContext.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq;
        osc.connect(gainNode);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.3);
      });
      break;
    }

    case "game-lose": {
      // Descending sad tones
      [392, 349.23, 293.66].forEach((freq, i) => {
        const osc = audioContext.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq;
        osc.connect(gainNode);
        osc.start(now + i * 0.2);
        osc.stop(now + i * 0.2 + 0.3);
      });
      break;
    }

    case "button-click": {
      // Quick click
      const osc = audioContext.createOscillator();
      osc.type = "sine";
      osc.frequency.value = 600;
      gainNode.gain.value = volume * 0.1;
      osc.connect(gainNode);
      osc.start(now);
      osc.stop(now + 0.05);
      break;
    }

    case "level-up":
    case "reward": {
      // Magical sparkle
      [1046.5, 1318.5, 1568, 2093].forEach((freq, i) => {
        const osc = audioContext.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq;
        const localGain = audioContext.createGain();
        localGain.gain.setValueAtTime(volume * 0.2, now + i * 0.05);
        localGain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.3);
        osc.connect(localGain);
        localGain.connect(audioContext.destination);
        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.3);
      });
      break;
    }

    case "power-up": {
      // Power-up whoosh
      const osc = audioContext.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.2);
      osc.connect(gainNode);
      osc.start(now);
      osc.stop(now + 0.25);
      break;
    }
  }
}

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

  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize AudioContext on first user interaction
  useEffect(() => {
    const initAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
    };

    // Initialize on first click/touch
    const handleInteraction = () => {
      initAudio();
      document.removeEventListener("click", handleInteraction);
      document.removeEventListener("touchstart", handleInteraction);
    };

    document.addEventListener("click", handleInteraction);
    document.addEventListener("touchstart", handleInteraction);

    return () => {
      document.removeEventListener("click", handleInteraction);
      document.removeEventListener("touchstart", handleInteraction);
    };
  }, []);

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

  // Play sound effect using Web Audio API
  const playSound = useCallback(
    (soundId: SoundEffect) => {
      if (!settings.sfxEnabled) return;
      
      // Initialize AudioContext if needed
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;
      
      // Resume AudioContext if suspended (required by some browsers)
      if (audioContext.state === "suspended") {
        audioContext.resume();
      }

      try {
        createSynthSound(audioContext, soundId, settings.volume);
      } catch (error) {
        console.error("Error playing sound:", error);
      }
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
