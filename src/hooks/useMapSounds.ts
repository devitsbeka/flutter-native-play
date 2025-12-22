import { useCallback, useRef } from "react";

// Simple sound generation using Web Audio API
const createAudioContext = () => {
  if (typeof window !== "undefined") {
    return new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return null;
};

export function useMapSounds(enabled: boolean = true) {
  const audioContextRef = useRef<AudioContext | null>(null);

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

    // Resume context if suspended (browser autoplay policy)
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
    // Quick, satisfying "pop" sound
    playTone(800, 0.1, "sine", 0.2);
    setTimeout(() => playTone(1000, 0.08, "sine", 0.15), 30);
  }, [playTone]);

  const playTransition = useCallback(() => {
    // Whoosh-like sound for season transition
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
    // Cheerful victory jingle
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.2, "sine", 0.2), i * 100);
    });
  }, [playTone]);

  const playUnlock = useCallback(() => {
    // Magical unlock sound
    playTone(400, 0.15, "sine", 0.2);
    setTimeout(() => playTone(600, 0.15, "sine", 0.2), 100);
    setTimeout(() => playTone(800, 0.25, "sine", 0.25), 200);
  }, [playTone]);

  return {
    playTap,
    playTransition,
    playVictory,
    playUnlock,
  };
}
