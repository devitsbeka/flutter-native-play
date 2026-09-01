/**
 * How a bundled 3D PNG is recoloured into one hue.
 *
 * The reference draws every hero icon in its card's own hue (the helmet is
 * as purple as the card behind it). The app's icons are full-colour, so they
 * are drawn as a duotone: a flat `color`, masked to the PNG's own alpha, with
 * the PNG's luminosity blended over it — the shading survives, the hue is
 * exactly the one asked for. (A hue-rotate filter was tried first and drifts
 * towards magenta at large angles, because CSS hue-rotate is a linear
 * approximation rather than a rotation.)
 */
export interface IconTint {
  /** The mid-tone the icon is drawn in. */
  color: string;
  /** Contrast on the luminosity, 1 = as shipped. */
  contrast?: number;
  /** Scale on the luminosity: a bright icon (the yellow crown) needs < 1 to
   *  land on the reference's mid-tones instead of its highlights. */
  luma?: number;
}

/** The blue the PRO benefit tiles draw their icons in. */
export const BLUE_TINT: IconTint = { color: "#4aa8e2", contrast: 1.05, luma: 0.9 };

/** The neutral grey of the detail page's stat icons. */
export const GREY_TINT: IconTint = { color: "#9c9c9c", contrast: 1.1, luma: 0.8 };
