import type { LanguageCode } from "@/locales";
import deFlag from "@/assets/flags/de.svg";
import esFlag from "@/assets/flags/es.svg";
import frFlag from "@/assets/flags/fr.svg";
import geFlag from "@/assets/flags/ge.svg";
import itFlag from "@/assets/flags/it.svg";
import ptFlag from "@/assets/flags/pt.svg";
import usFlag from "@/assets/flags/us.svg";

/**
 * Round flags for the seven languages we ship.
 *
 * The artwork is HatScripts/circle-flags (MIT) — the notice ships beside the
 * files in src/assets/flags/circle-flags-MIT-LICENSE.txt, which the licence
 * requires. Only our seven are vendored rather than the npm package, which
 * carries 400+.
 *
 * Emoji flags stood here first and are not dependable: they are
 * regional-indicator pairs, so what renders is whatever the platform font
 * decides — macOS and iOS draw them, Windows Chrome draws the letters "US",
 * and no webfont fixes it. They also wear the platform's own shading, which
 * never sits right against drawn UI.
 *
 * Rendered as <img> rather than inlined: every one of these files masks its
 * circle with `<mask id="a">`, so inlining all seven into one document would
 * have each flag after the first clipped by the first one's mask. As
 * separate documents they cannot collide. They are all under Vite's 4KB
 * inline limit, so the build emits them as data URLs — no extra requests.
 */

const FLAG_BY_LANGUAGE: Record<LanguageCode, string> = {
  ka: geFlag,
  en: usFlag,
  es: esFlag,
  fr: frFlag,
  de: deFlag,
  it: itFlag,
  pt: ptFlag,
};

export interface CircleFlagProps {
  code: LanguageCode;
  /** Sizing/spacing utilities. Give it a square, e.g. "size-6". */
  className?: string;
}

export function CircleFlag({ code, className }: CircleFlagProps) {
  return (
    <img
      src={FLAG_BY_LANGUAGE[code]}
      // Decorative: every caller already labels the control it sits in, and
      // "flag of the United States" announced for the English option is
      // noise at best and wrong at worst.
      alt=""
      aria-hidden
      draggable={false}
      className={className}
    />
  );
}
