

# Integrate Meta (Facebook) Pixel with Full Conversion Tracking

## Overview
Add the Meta Pixel (ID: `845894748475852`) to MyTrivia with both the base PageView tracking and rich conversion events mapped to Facebook standard + custom events. This gives Facebook full visibility into user behavior for ad optimization.

## 1. Add Pixel Base Code to `index.html`
Insert the Meta Pixel snippet (provided by user) into the `<head>` section of `index.html`, right before the closing `</head>` tag. This handles:
- Pixel initialization
- Automatic `PageView` tracking on every page load
- The `<noscript>` fallback image

## 2. Create `src/lib/fbpixel.ts` -- a typed helper module
A thin wrapper around `window.fbq` that mirrors the existing `src/lib/analytics.ts` pattern. This module will:
- Declare the `fbq` type on `window`
- Provide helper functions that fire both **standard** and **custom** Facebook events
- Be safe to call even if the pixel script hasn't loaded (guards against `fbq` being undefined)

### Event Mapping (Facebook Standard Events)

| App Event | FB Standard Event | Parameters |
|-----------|------------------|------------|
| Signup completed | `CompleteRegistration` | `status: true, content_name: method` |
| Login completed | (custom) `Login` | `method` |
| VIP / PRO purchased | `Purchase` | `value, currency` |
| Shop item purchased | `Purchase` | `value, currency, content_name` |
| Quiz started | `StartTrial` | `content_name: categoryId` |
| Quiz completed | `ViewContent` | `content_name: categoryId, value: score` |
| Power-up purchased | `Purchase` | `value, currency: "coins/gems"` |

### Custom Events (via `fbq('trackCustom', ...)`)

| App Event | FB Custom Event | Parameters |
|-----------|----------------|------------|
| PVP game started | `PvpGameStarted` | `category_id, opponent` |
| PVP game finished | `PvpGameFinished` | `result, score` |
| Quiz abandoned | `QuizAbandoned` | `category_id, level` |
| Power-up used | `PowerUpUsed` | `type, context` |
| Category viewed | `CategoryViewed` | `category_id` |
| Level selected | `LevelSelected` | `category_id, level` |

## 3. Add SPA PageView tracking in `PostHogProvider.tsx`
Since this is an SPA, the base pixel only fires `PageView` on initial load. Add `fbq('track', 'PageView')` alongside the existing PostHog pageview call in `usePageviewTracker()` so every route change is tracked by Facebook too.

## 4. Wire FB events into existing analytics calls in `src/lib/analytics.ts`
Each existing `track*` function already fires PostHog events. Add a corresponding `fb*` call from the new `fbpixel.ts` module alongside each PostHog call. This keeps all analytics in one place with zero changes to consuming components.

## Files Changed

| File | Change |
|------|--------|
| `index.html` | Add Meta Pixel base code in `<head>` |
| `src/lib/fbpixel.ts` | **New file** -- typed FB Pixel helper functions |
| `src/lib/analytics.ts` | Import and call FB helpers alongside PostHog calls |
| `src/providers/PostHogProvider.tsx` | Add `fbq('track', 'PageView')` on SPA route changes |

## Technical Details

### `src/lib/fbpixel.ts`
```typescript
// Type-safe wrapper for fbq
declare global {
  interface Window {
    fbq: (...args: any[]) => void;
  }
}

function fbq(...args: any[]) {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq(...args);
  }
}

export function fbTrackPageView() {
  fbq('track', 'PageView');
}

export function fbTrackCompleteRegistration(method: string) {
  fbq('track', 'CompleteRegistration', {
    content_name: method,
    status: true,
  });
}

export function fbTrackPurchase(value: number, currency: string, contentName?: string) {
  fbq('track', 'Purchase', {
    value,
    currency,
    content_name: contentName,
  });
}

export function fbTrackStartTrial(categoryId: string) {
  fbq('track', 'StartTrial', { content_name: categoryId });
}

// ... custom events via fbq('trackCustom', ...)
```

### Integration in `analytics.ts` (example)
```typescript
import { fbTrackCompleteRegistration } from "./fbpixel";

export function trackSignupCompleted(method, hasReferral) {
  posthog.capture("signup_completed", { ... });
  fbTrackCompleteRegistration(method);  // <-- added
}
```

### SPA PageView in `PostHogProvider.tsx`
```typescript
import { fbTrackPageView } from "@/lib/fbpixel";

// Inside usePageviewTracker useEffect:
posthog.capture("$pageview", { ... });
fbTrackPageView();  // <-- added
```

