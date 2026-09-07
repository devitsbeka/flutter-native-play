import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";

/**
 * The version string to show a player, taken from the binary rather than typed.
 *
 * The support page used to read `MyTrivia v1.0.0` as a literal, against a
 * binary that was 1.0 build 46. That is the one screen whose whole job is to
 * help someone report a problem, and it named a version that has never
 * existed — which makes a crash report impossible to place against a build.
 *
 * On native this is `CFBundleShortVersionString (CFBundleVersion)`, the same
 * pair App Store Connect and TestFlight show, so a tester reading it aloud
 * gives you something you can actually look up. On the web there is no bundle
 * to ask, so it falls back to the build stamp Vite writes.
 */
export function useAppVersion(): string {
  const [version, setVersion] = useState<string>(WEB_VERSION);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cancelled = false;
    void (async () => {
      try {
        const { App } = await import("@capacitor/app");
        const info = await App.getInfo();
        if (!cancelled) setVersion(`v${info.version} (${info.build})`);
      } catch {
        // A plugin that did not answer is not worth a broken support page.
        // The web fallback already reads as a version.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return version;
}

/**
 * `__BUILD_ID__` is defined in vite.config.ts's `define` block.
 * Guarded because vitest does not apply that define, so the identifier is
 * genuinely absent there rather than merely empty.
 */
const WEB_VERSION: string =
  typeof __BUILD_ID__ === "string" && __BUILD_ID__ ? `build ${__BUILD_ID__}` : "web";
