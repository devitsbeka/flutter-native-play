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
  shardDensity: number;
  lowCloudCount: number;
  mist: boolean;
  /** Ambient pastel orbs behind the route. */
  orbCount: number;
}

export const qualityProfiles: Record<QualityTier, QualityProfile> = {
  low: { dprCeiling: 1, shadows: false, treeDensity: 0.55, cloudCount: 9, shardDensity: 0.4, lowCloudCount: 0, mist: false, orbCount: 8 },
  medium: { dprCeiling: 1.5, shadows: true, treeDensity: 0.8, cloudCount: 16, shardDensity: 0.7, lowCloudCount: 6, mist: true, orbCount: 16 },
  high: { dprCeiling: 2, shadows: true, treeDensity: 1, cloudCount: 22, shardDensity: 1, lowCloudCount: 10, mist: true, orbCount: 24 },
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
