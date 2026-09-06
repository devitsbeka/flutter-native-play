import { useRef } from "react";
import { newSeed } from "@/utils/seededShuffle";

/**
 * A random seed fixed for the life of the component: different on every
 * visit, the same on every re-render. Feed it to seededShuffle to deal a
 * rail freshly each time the page opens without the cards moving under a
 * finger while it is being browsed.
 */
export function useMountSeed(): number {
  const seed = useRef<number | null>(null);
  if (seed.current === null) seed.current = newSeed();
  return seed.current;
}
