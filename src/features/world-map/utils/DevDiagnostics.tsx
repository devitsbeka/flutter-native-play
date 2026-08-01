import { useEffect } from "react";
import { useThree } from "@react-three/fiber";

/**
 * Development-only render diagnostics: logs draw calls, triangles, texture
 * count and FPS every few seconds. Enabled with `?worldstats` in the URL;
 * compiled out of production builds entirely.
 */
export function DevDiagnostics() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    if (!import.meta.env.DEV || !window.location.search.includes("worldstats")) return;
    let frames = 0;
    let raf = 0;
    const tick = () => {
      frames++;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const interval = window.setInterval(() => {
      const info = gl.info;
      console.info(
        `[world-map] fps=${(frames / 5).toFixed(0)} drawCalls=${info.render.calls} triangles=${info.render.triangles} geometries=${info.memory.geometries} textures=${info.memory.textures}`,
      );
      frames = 0;
    }, 5000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(interval);
    };
  }, [gl]);
  return null;
}
