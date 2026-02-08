

## Fix: Tap Delay on Feed Cards + Slow Scroll Performance

### Problem 1: Cards still require multiple taps on mobile

The `touch-action: manipulation` on the body and card div is correct but insufficient. The real culprits are:

1. **Double motion.div wrappers**: Each feed card is wrapped in TWO `motion.div` layers -- one in `ExplorePortfolioFeed.tsx` (the list wrapper with staggered delay) and another inside `PlayerFeedItem.tsx` itself. Framer Motion intercepts touch/pointer events for its gesture system, which can swallow or delay tap events on mobile.

2. **Staggered animation delays**: The feed applies `delay: index * 0.05` to each card. For 15+ cards, later items have 750ms+ animation delays during which touch events may behave inconsistently.

3. **The card's `onClick` is on a nested div**, but the outer `motion.div` with animation props can interfere with event propagation on touch devices.

### Problem 2: Scroll is slow and not smooth on published URL

1. **`scroll-smooth` CSS class** on `#main-scroll-container` in `MainLayout.tsx` enables CSS smooth scrolling for ALL scroll interactions, not just programmatic ones. On mobile Safari/WebKit, this makes finger-swipe scrolling feel sluggish and delayed because the browser applies easing to every scroll movement.

2. **`-webkit-overflow-scrolling: auto`** in `index.css` on the body element disables iOS momentum/inertial scrolling. The default is `touch` which gives the native "fling" feel. Setting it to `auto` makes scrolling stop immediately when the finger lifts.

3. **Framer Motion animations on every feed item** with `opacity` and `y` transforms during scroll cause layout recalculations and compositing overhead, making the scroll jank.

---

### Solution

#### File: `src/index.css`

1. Remove `-webkit-overflow-scrolling: auto` from body (line 200) -- let iOS use its default momentum scrolling (`touch`)
2. Also remove it from `#main-scroll-container` (line 208) for the same reason

#### File: `src/components/layout/MainLayout.tsx`

1. Remove `scroll-smooth` from the main scroll container class. CSS `scroll-smooth` is meant for programmatic scrolling (e.g., `scrollTo`), not finger scrolling. Removing it restores native fast scrolling on mobile.

#### File: `src/components/social/ExplorePortfolioFeed.tsx`

1. **Remove the outer `motion.div` wrapper** from each feed item in the mobile list. Replace with a plain `div`. The `PlayerFeedItem` already has its own `motion.div` -- doubling up is unnecessary and causes touch event issues.
2. Remove staggered animation delays (`delay: index * 0.05`) which cause late-rendering items to be unresponsive during their animation window.

#### File: `src/components/social/PlayerFeedItem.tsx`

1. **Replace the outer `motion.div`** with a plain `div`. The entry animation (`opacity: 0, y: 20`) is causing touch event interception. On a feed that's already loaded, these animations provide minimal visual value but create real interaction problems.
2. Add `touch-action: manipulation` to the outermost container div as well (not just the inner card).

### Summary of Changes

| File | Change |
|---|---|
| `src/index.css` | Remove `-webkit-overflow-scrolling: auto` from body and `#main-scroll-container` |
| `src/components/layout/MainLayout.tsx` | Remove `scroll-smooth` from main container |
| `src/components/social/ExplorePortfolioFeed.tsx` | Replace `motion.div` with plain `div` for mobile feed items |
| `src/components/social/PlayerFeedItem.tsx` | Replace outer `motion.div` with plain `div`, add `touch-action: manipulation` to root |

These changes target the root causes: framer-motion touch event interception for the tap issue, and CSS scroll properties fighting native mobile scrolling for the jank issue.

