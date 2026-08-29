/**
 * Question-title sizing for the social frames.
 *
 * Two forces: longer questions should read smaller (a taste choice), and the
 * rendered block must fit its slot on every canvas (a hard constraint). The
 * length ramp alone failed the second one — on narrow 9:16 columns a
 * mid-length Georgian question wraps to six lines and runs into the answer
 * pills. So the ramp picks the starting size, then the fit loop shrinks
 * until the estimated wrapped height fits the slot.
 *
 * The estimate is glyph-metric arithmetic, not DOM measurement, so it works
 * identically in the admin preview, the headless renderer, and the offscreen
 * draft render. 0.6em average advance is calibrated for Noto Sans Georgian
 * SemiBold with Latin slightly narrower; the +1 slack line absorbs uneven
 * word breaks.
 */

const LINE_HEIGHT = 1.2;
const AVG_ADVANCE = 0.6;
const MIN_FACTOR = 0.4;

/** Continuous ramp: full size to 45 chars, ~0.45%/char down, floored at 52%. */
export function lengthRampFontSize(text: string, base: number): number {
  const factor = Math.min(1, Math.max(0.52, 1 - (text.length - 45) * 0.0045));
  return base * factor;
}

export function estimateLines(text: string, fontSize: number, maxWidth: number): number {
  const perLine = Math.max(4, Math.floor(maxWidth / (fontSize * AVG_ADVANCE)));
  if (text.length <= perLine) return 1;
  return Math.ceil(text.length / perLine) + 1;
}

/**
 * Largest font size (from the ramp downward) whose estimated wrapped block
 * fits maxWidth × maxHeight. Never returns less than 40% of base — at that
 * point the layout, not the type, is wrong.
 */
export function fitQuestionFont(
  text: string,
  base: number,
  maxWidth: number,
  maxHeight: number,
): number {
  let size = lengthRampFontSize(text, base);
  while (size > base * MIN_FACTOR) {
    const height = estimateLines(text, size, maxWidth) * size * LINE_HEIGHT;
    if (height <= maxHeight) break;
    size *= 0.94;
  }
  return size;
}
