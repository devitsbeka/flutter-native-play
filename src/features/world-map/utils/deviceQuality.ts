import { QualityTier } from "../state/worldStore";

interface NavigatorWithMemory extends Navigator {
  deviceMemory?: number;
}

/** Heuristic quality tier; measured once at mount, never per-frame. */
export function detectQualityTier(): QualityTier {
  if (typeof navigator === "undefined") return "medium";
  const nav = navigator as NavigatorWithMemory;
  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 4;
  const coarse = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
  if (cores >= 8 && memory >= 8 && !coarse) return "high";
  if (cores <= 3 || memory <= 2) return "low";
  return "medium";
}

export interface QualityProfile {
  dprCeiling: number;
  shadows: boolean;
  treeDensity: number;
  cloudCount: number;
}

export const qualityProfiles: Record<QualityTier, QualityProfile> = {
  low: { dprCeiling: 1, shadows: false, treeDensity: 0.55, cloudCount: 6 },
  medium: { dprCeiling: 1.5, shadows: true, treeDensity: 0.8, cloudCount: 10 },
  high: { dprCeiling: 2, shadows: true, treeDensity: 1, cloudCount: 14 },
};

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function webglAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}
