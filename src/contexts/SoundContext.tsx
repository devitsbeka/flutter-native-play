import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo, useRef } from "react";

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
  | "power-up"
  | "power-up-5050"
  | "power-up-freeze"
  | "power-up-replace"
  | "power-up-time-drain"
  | "room-join"
  | "room-message"
  | "game-invitation";

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
  
  // Background music
  startBackgroundMusic: () => void;
  stopBackgroundMusic: () => void;
  isPlayingMusic: boolean;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

const SOUND_STORAGE_KEY = "mytrivia_sound_settings";

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
      // Generic power-up whoosh
      const osc = audioContext.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.2);
      osc.connect(gainNode);
      osc.start(now);
      osc.stop(now + 0.25);
      break;
    }

    case "power-up-5050": {
      // 50/50 - Two quick "elimination" sounds
      gainNode.gain.value = volume * 0.25;
      [800, 400].forEach((freq, i) => {
        const osc = audioContext.createOscillator();
        osc.type = "square";
        osc.frequency.value = freq;
        const localGain = audioContext.createGain();
        localGain.gain.setValueAtTime(volume * 0.2, now + i * 0.15);
        localGain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.12);
        osc.connect(localGain);
        localGain.connect(audioContext.destination);
        osc.start(now + i * 0.15);
        osc.stop(now + i * 0.15 + 0.12);
      });
      break;
    }

    case "power-up-freeze": {
      // Freeze - Icy crystalline sound with shimmer
      gainNode.gain.value = volume * 0.2;
      [2000, 2400, 2800, 3200].forEach((freq, i) => {
        const osc = audioContext.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq;
        const localGain = audioContext.createGain();
        localGain.gain.setValueAtTime(volume * 0.15, now + i * 0.03);
        localGain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.03 + 0.4);
        osc.connect(localGain);
        localGain.connect(audioContext.destination);
        osc.start(now + i * 0.03);
        osc.stop(now + i * 0.03 + 0.4);
      });
      // Add a low rumble
      const rumble = audioContext.createOscillator();
      rumble.type = "sine";
      rumble.frequency.value = 80;
      const rumbleGain = audioContext.createGain();
      rumbleGain.gain.setValueAtTime(volume * 0.1, now);
      rumbleGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      rumble.connect(rumbleGain);
      rumbleGain.connect(audioContext.destination);
      rumble.start(now);
      rumble.stop(now + 0.5);
      break;
    }

    case "power-up-replace": {
      // Replace - Swap/shuffle sound
      gainNode.gain.value = volume * 0.2;
      // Descending then ascending - like cards shuffling
      [600, 500, 400, 500, 600, 800].forEach((freq, i) => {
        const osc = audioContext.createOscillator();
        osc.type = "triangle";
        osc.frequency.value = freq;
        const localGain = audioContext.createGain();
        localGain.gain.setValueAtTime(volume * 0.15, now + i * 0.04);
        localGain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.04 + 0.08);
        osc.connect(localGain);
        localGain.connect(audioContext.destination);
        osc.start(now + i * 0.04);
        osc.stop(now + i * 0.04 + 0.1);
      });
      break;
    }

    case "power-up-time-drain": {
      // Time Drain - Dramatic descending whoosh
      gainNode.gain.value = volume * 0.2;
      const drainOsc = audioContext.createOscillator();
      drainOsc.type = "sawtooth";
      drainOsc.frequency.setValueAtTime(1000, now);
      drainOsc.frequency.exponentialRampToValueAtTime(100, now + 0.4);
      const drainGain = audioContext.createGain();
      drainGain.gain.setValueAtTime(volume * 0.15, now);
      drainGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      drainOsc.connect(drainGain);
      drainGain.connect(audioContext.destination);
      drainOsc.start(now);
      drainOsc.stop(now + 0.5);
      break;
    }

    case "room-join": {
      // Player joined - friendly pop sound
      gainNode.gain.value = volume * 0.25;
      [440, 554.37, 659.25].forEach((freq, i) => {
        const osc = audioContext.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq;
        const localGain = audioContext.createGain();
        localGain.gain.setValueAtTime(volume * 0.2, now + i * 0.05);
        localGain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.15);
        osc.connect(localGain);
        localGain.connect(audioContext.destination);
        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.15);
      });
      break;
    }

    case "room-message": {
      // Chat message - subtle bubble pop
      gainNode.gain.value = volume * 0.15;
      const msgOsc = audioContext.createOscillator();
      msgOsc.type = "sine";
      msgOsc.frequency.setValueAtTime(800, now);
      msgOsc.frequency.exponentialRampToValueAtTime(600, now + 0.08);
      const msgGain = audioContext.createGain();
      msgGain.gain.setValueAtTime(volume * 0.12, now);
      msgGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      msgOsc.connect(msgGain);
      msgGain.connect(audioContext.destination);
      msgOsc.start(now);
      msgOsc.stop(now + 0.1);
      break;
    }

    case "game-invitation": {
      // Distinct attention-grabbing invitation sound - ascending fanfare with urgency
      gainNode.gain.value = volume * 0.3;
      // Three-note attention chime
      [587.33, 739.99, 880].forEach((freq, i) => {
        const osc = audioContext.createOscillator();
        osc.type = "triangle";
        osc.frequency.value = freq;
        const localGain = audioContext.createGain();
        localGain.gain.setValueAtTime(volume * 0.25, now + i * 0.1);
        localGain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.25);
        osc.connect(localGain);
        localGain.connect(audioContext.destination);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.25);
      });
      // Add a subtle second layer for richness
      setTimeout(() => {
        [1174.66, 1479.98].forEach((freq, i) => {
          const osc = audioContext.createOscillator();
          osc.type = "sine";
          osc.frequency.value = freq;
          const localGain = audioContext.createGain();
          localGain.gain.setValueAtTime(volume * 0.1, audioContext.currentTime + i * 0.08);
          localGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + i * 0.08 + 0.2);
          osc.connect(localGain);
          localGain.connect(audioContext.destination);
          osc.start(audioContext.currentTime + i * 0.08);
          osc.stop(audioContext.currentTime + i * 0.08 + 0.2);
        });
      }, 150);
      break;
    }
  }
}

// Generate looping background music using Web Audio API
function createBackgroundMusic(
  audioContext: AudioContext,
  volume: number
): { gainNode: GainNode; oscillators: OscillatorNode[] } {
  const masterGain = audioContext.createGain();
  masterGain.gain.value = volume * 0.15;
  masterGain.connect(audioContext.destination);

  const oscillators: OscillatorNode[] = [];

  // Create a simple ambient pad with multiple oscillators
  const baseFrequencies = [130.81, 164.81, 196.00, 261.63]; // C major chord
  
  baseFrequencies.forEach((freq, i) => {
    const osc = audioContext.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;

    // Add subtle vibrato
    const lfo = audioContext.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.5 + i * 0.1;
    
    const lfoGain = audioContext.createGain();
    lfoGain.gain.value = 2;
    
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    // Individual gain for layering
    const oscGain = audioContext.createGain();
    oscGain.gain.value = 0.25;
    
    osc.connect(oscGain);
    oscGain.connect(masterGain);

    lfo.start();
    osc.start();
    
    oscillators.push(osc);
  });

  // Add a gentle bass pulse
  const bassOsc = audioContext.createOscillator();
  bassOsc.type = "sine";
  bassOsc.frequency.value = 65.41; // Low C
  
  const bassGain = audioContext.createGain();
  bassGain.gain.value = 0.3;
  
  // Subtle pulsing
  const pulseLfo = audioContext.createOscillator();
  pulseLfo.type = "sine";
  pulseLfo.frequency.value = 0.25;
  
  const pulseGain = audioContext.createGain();
  pulseGain.gain.value = 0.1;
  
  pulseLfo.connect(pulseGain);
  pulseGain.connect(bassGain.gain);
  
  bassOsc.connect(bassGain);
  bassGain.connect(masterGain);
  
  pulseLfo.start();
  bassOsc.start();
  
  oscillators.push(bassOsc);

  return { gainNode: masterGain, oscillators };
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

  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const musicRef = useRef<{ gainNode: GainNode; oscillators: OscillatorNode[] } | null>(null);

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

  // Stop music when music is disabled
  useEffect(() => {
    if (!settings.musicEnabled && musicRef.current) {
      musicRef.current.oscillators.forEach(osc => {
        try { osc.stop(); } catch {}
      });
      musicRef.current = null;
      setIsPlayingMusic(false);
    }
  }, [settings.musicEnabled]);

  // Update music volume when volume changes
  useEffect(() => {
    if (musicRef.current) {
      musicRef.current.gainNode.gain.value = settings.volume * 0.15;
    }
  }, [settings.volume]);

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

  // Start background music
  const startBackgroundMusic = useCallback(() => {
    if (!settings.musicEnabled || isPlayingMusic) return;
    
    // Initialize AudioContext if needed
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const audioContext = audioContextRef.current;
    
    // Resume AudioContext if suspended
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    try {
      // Stop any existing music
      if (musicRef.current) {
        musicRef.current.oscillators.forEach(osc => {
          try { osc.stop(); } catch {}
        });
      }

      musicRef.current = createBackgroundMusic(audioContext, settings.volume);
      setIsPlayingMusic(true);
    } catch (error) {
      console.error("Error starting background music:", error);
    }
  }, [settings.musicEnabled, settings.volume, isPlayingMusic]);

  // Stop background music
  const stopBackgroundMusic = useCallback(() => {
    if (musicRef.current) {
      // Fade out gracefully
      const fadeTime = 0.5;
      musicRef.current.gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        (audioContextRef.current?.currentTime || 0) + fadeTime
      );
      
      setTimeout(() => {
        if (musicRef.current) {
          musicRef.current.oscillators.forEach(osc => {
            try { osc.stop(); } catch {}
          });
          musicRef.current = null;
        }
        setIsPlayingMusic(false);
      }, fadeTime * 1000);
    }
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (musicRef.current) {
        musicRef.current.oscillators.forEach(osc => {
          try { osc.stop(); } catch {}
        });
      }
    };
  }, []);

  const value = useMemo(
    () => ({
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
      startBackgroundMusic,
      stopBackgroundMusic,
      isPlayingMusic,
    }),
    [
      settings.musicEnabled,
      setMusicEnabled,
      settings.sfxEnabled,
      setSfxEnabled,
      settings.vibrationEnabled,
      setVibrationEnabled,
      settings.volume,
      setVolume,
      playSound,
      vibrate,
      startBackgroundMusic,
      stopBackgroundMusic,
      isPlayingMusic,
    ]
  );

  return (
    <SoundContext.Provider value={value}>
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
