import { Capacitor } from "@capacitor/core";

/**
 * A translucent surface, and what it becomes inside the app.
 *
 * `backdrop-filter` is cheap in a browser and expensive in WKWebView, and on
 * a large surface inside a scrolling container it is worse than expensive: it
 * asks the compositor to re-sample everything behind it on every frame, and
 * when it cannot keep up it does not slow down — it hands back stale or empty
 * tiles. That is what "the whole page is glitching" looks like from the
 * outside: a card row that paints half of itself, artwork that never appears,
 * a screenful of blank below content that is really there.
 *
 * Discover stacked two of them — the sheet, and the tab strip sticky inside
 * it — over a sticky full-height image, which is about the worst arrangement
 * the engine can be handed. The Shop's header is a third.
 *
 * So the glass is for browsers, where it works and costs nothing. In the
 * native app the same surfaces go opaque, in a colour close enough that the
 * design reads the same: the blur was never doing anything a solid could not
 * do here, because what is behind these surfaces is either artwork nobody is
 * meant to read through them or the page's own flat background.
 *
 * Written as class strings rather than a component because the call sites are
 * template literals in three different files.
 */
const NATIVE = Capacitor.isNativePlatform();

/** True when this build cannot afford a live backdrop-filter. */
export const PREFERS_OPAQUE_SURFACES = NATIVE;

/**
 * Pick between a glass surface and its opaque stand-in.
 *
 * @param glass  classes to use in a browser — the translucent original
 * @param solid  classes to use in the app — an opaque colour of the same family
 */
export function glassSurface(glass: string, solid: string): string {
  return NATIVE ? solid : glass;
}
