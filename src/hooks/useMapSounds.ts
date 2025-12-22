import { useCallback, useRef, useEffect } from "react";

type Season = "spring" | "summer" | "autumn" | "winter";

// Simple sound generation using Web Audio API
const createAudioContext = () => {
  if (typeof window !== "undefined") {
    return new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return null;
};

// Season-specific ambient music parameters
const seasonMusicParams: Record<Season, { baseFreq: number; scale: number[]; tempo: number; mood: string }> = {
  spring: { baseFreq: 523, scale: [0, 2, 4, 5, 7, 9, 11], tempo: 120, mood: "bright" },
  summer: { baseFreq: 587, scale: [0, 2, 4, 7, 9], tempo: 140, mood: "upbeat" },
  autumn: { baseFreq: 440, scale: [0, 2, 3, 5, 7, 8, 10], tempo: 90, mood: "cozy" },
  winter: { baseFreq: 392, scale: [0, 2, 4, 5, 7, 9, 11], tempo: 70, mood: "magical" },
};

export function useMapSounds(enabled: boolean = true) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const musicGainRef = useRef<GainNode | null>(null);
  const musicOscillatorsRef = useRef<OscillatorNode[]>([]);
  const musicIntervalRef = useRef<number | null>(null);
  const currentSeasonRef = useRef<Season | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = createAudioContext();
    }
    return audioContextRef.current;
  }, []);

  const playTone = useCallback((frequency: number, duration: number, type: OscillatorType = "sine", volume: number = 0.3) => {
    if (!enabled) return;
    
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  }, [enabled, getAudioContext]);

  const playTap = useCallback(() => {
    playTone(800, 0.1, "sine", 0.2);
    setTimeout(() => playTone(1000, 0.08, "sine", 0.15), 30);
  }, [playTone]);

  const playTransition = useCallback(() => {
    const ctx = getAudioContext();
    if (!ctx || !enabled) return;

    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(200, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.2);
    oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.4);

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.4);
  }, [enabled, getAudioContext]);

  const playVictory = useCallback(() => {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.2, "sine", 0.2), i * 100);
    });
  }, [playTone]);

  const playUnlock = useCallback(() => {
    playTone(400, 0.15, "sine", 0.2);
    setTimeout(() => playTone(600, 0.15, "sine", 0.2), 100);
    setTimeout(() => playTone(800, 0.25, "sine", 0.25), 200);
  }, [playTone]);

  const playChestOpen = useCallback(() => {
    // Magical chest opening sound
    const ctx = getAudioContext();
    if (!ctx || !enabled) return;

    if (ctx.state === "suspended") {
      ctx.resume();
    }

    // Sparkle up sound
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        playTone(800 + i * 200, 0.15, "sine", 0.15);
      }, i * 60);
    }

    // Final flourish
    setTimeout(() => {
      playTone(1200, 0.3, "triangle", 0.2);
    }, 350);
  }, [enabled, getAudioContext, playTone]);

  // Ambient music system
  const stopAmbientMusic = useCallback(() => {
    if (musicIntervalRef.current) {
      clearInterval(musicIntervalRef.current);
      musicIntervalRef.current = null;
    }

    musicOscillatorsRef.current.forEach(osc => {
      try {
        osc.stop();
      } catch {}
    });
    musicOscillatorsRef.current = [];

    if (musicGainRef.current) {
      const ctx = getAudioContext();
      if (ctx) {
        musicGainRef.current.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      }
    }
  }, [getAudioContext]);

  const playAmbientMusic = useCallback((season: Season) => {
    if (!enabled) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      ctx.resume();
    }

    // If same season, don't restart
    if (currentSeasonRef.current === season) return;

    // Stop existing music with crossfade
    stopAmbientMusic();
    currentSeasonRef.current = season;

    // Create master gain for this music
    const masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);
    masterGain.gain.setValueAtTime(0, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 1); // Fade in
    musicGainRef.current = masterGain;

    const params = seasonMusicParams[season];
    
    // Create ambient pad
    const createPad = () => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(masterGain);
      
      const scaleNote = params.scale[Math.floor(Math.random() * params.scale.length)];
      const freq = params.baseFreq * Math.pow(2, scaleNote / 12);
      
      osc.type = season === "winter" ? "sine" : season === "autumn" ? "triangle" : "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      
      const noteDuration = (60 / params.tempo) * 2;
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + noteDuration);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + noteDuration);
      
      musicOscillatorsRef.current.push(osc);
    };

    // Create melodic pattern
    const createMelody = () => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(masterGain);
      
      const scaleNote = params.scale[Math.floor(Math.random() * params.scale.length)];
      const octave = Math.random() > 0.5 ? 1 : 2;
      const freq = params.baseFreq * octave * Math.pow(2, scaleNote / 12);
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      
      const noteDuration = (60 / params.tempo) * 0.5;
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + noteDuration);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + noteDuration);
      
      musicOscillatorsRef.current.push(osc);
    };

    // Play ambient notes at intervals
    const interval = (60 / params.tempo) * 1000;
    createPad();
    
    musicIntervalRef.current = window.setInterval(() => {
      if (Math.random() > 0.3) createPad();
      if (Math.random() > 0.6) createMelody();
    }, interval);
  }, [enabled, getAudioContext, stopAmbientMusic]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAmbientMusic();
    };
  }, [stopAmbientMusic]);

  // Stop music when disabled
  useEffect(() => {
    if (!enabled) {
      stopAmbientMusic();
      currentSeasonRef.current = null;
    }
  }, [enabled, stopAmbientMusic]);

  return {
    playTap,
    playTransition,
    playVictory,
    playUnlock,
    playChestOpen,
    playAmbientMusic,
    stopAmbientMusic,
  };
}
