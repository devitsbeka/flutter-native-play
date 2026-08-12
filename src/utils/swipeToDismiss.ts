/** Card travel that commits the delete once the finger lifts. */
export const SWIPE_THRESHOLD = 100;
/** How far left a row can be dragged; past this it resists. */
export const SWIPE_LIMIT = 240;
/** A fast flick deletes even if it did not travel the full threshold. */
export const FLICK_VELOCITY = 500;

/**
 * Whether a finished swipe should delete the row.
 *
 * The card tracks the finger 1:1 inside its constraints, so `offsetX` is also
 * how far the card actually moved — which is what makes a distance threshold
 * mean what it looks like it means. A quick flick counts too, so a decisive
 * short swipe is not ignored.
 */
export function shouldDismissSwipe(offsetX: number, velocityX: number): boolean {
  return offsetX < -SWIPE_THRESHOLD || velocityX < -FLICK_VELOCITY;
}
