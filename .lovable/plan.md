
Goal: make each onboarding spotlight/modal anchor to the actual button icon (not to layout containers), so the highlighted icon is perfectly centered and fully visible on mobile, tablet, and desktop.

1) Root-cause fix: target the real clickable icon elements
- Current issue comes from measuring wrapper containers (`flex-1`, wide desktop rows, padded wrappers) instead of the exact button/icon.
- I will change the onboarding anchors so each step (`explore`, `shop`, `rank`, `team`, `play`) is attached to the true interactive element.
- This removes horizontal drift, oversized highlight areas, and partial clipping.

2) File updates and exact strategy

A) `src/components/layout/UniversalBottomNav.tsx`
- Move `data-onboarding-id` off wrapper `<div className="flex-1 ...">` nodes.
- Add onboarding id to the actual target:
  - standard nav items: apply on `NavButton` root button (or icon container inside it).
  - center play item: apply on the real `motion.button` inside `Hex3DPlayButton` (the circular button face).
- Keep wrappers purely for layout only (no onboarding targeting).
- Optional precision improvement: expose `onboardingId?: string` prop on `NavButton` and set `data-onboarding-id={onboardingId}` there.

B) `src/components/layout/UnifiedDesktopNav.tsx`
- Move `data-onboarding-id` off the outer row wrapper `<div key={item.id}>`.
- Add onboarding id at icon-level target inside `NavButton` (recommended) or button root:
  - icon-level gives perfect centering over the icon across tablet + desktop label variants.
- Add a tiny helper prop like `onboardingId?: "explore" | "shop" | "rank" | "team"` so only relevant items receive an id.

C) `src/components/onboarding/WelcomeOnboardingOverlay.tsx`
- Improve `updateTargetRect` selection:
  - Query all matches for current step.
  - Filter for truly visible nodes (non-zero rect + visible style).
  - Prefer the node that is actually on-screen and closest to intended area (bottom for mobile nav steps, left sidebar for desktop/tablet nav steps).
- Remove dependence on broad fallback rectangles when a real anchor exists.
- Keep fallback rects only as last resort (for resilience), but not primary.
- Build spotlight rect from anchor with controlled padding and min size:
  - regular nav icons: use square-ish expansion so icon is centered and fully visible.
  - play button: larger expansion to cover the full circular button cleanly.
- Keep tooltip placement logic but compute arrow from the new anchor center so pointer lands exactly on highlighted icon/button.

3) Positioning behavior after fix
- Mobile: modal sits above bottom-nav icon/button currently highlighted, with arrow centered to that icon.
- Tablet: modal points to left nav icon (not row center drift).
- Desktop: modal aligns to the same precise icon target; labels no longer skew anchor center.
- Play step: always centers on the full play button shape.

4) Why this solves your specific complaint
- “Icons centered perfectly”: anchor rect will now come from icon/button geometry, not padded layout containers.
- “Visible fully”: spotlight padding + min-size per step prevents clipping of icon edges and the play circle.
- “On what button we’re showing info modal”: each step id maps directly to that button’s real DOM target.

5) Validation checklist (end-to-end)
- `/onboarding` at mobile width:
  - steps 1–5 each spotlight centered on the correct nav icon/button.
  - no off-screen clipping, no wrong-button highlights.
- Tablet width (md):
  - spotlight lands on sidebar icons (not row text center).
- Desktop width (lg+):
  - same correctness with labels visible.
- Confirm arrow points to anchor center for every step.
- Confirm all five steps remain trackable and dismiss/next still work.

Technical implementation notes
- This is a UI anchoring fix only; no backend/data/auth changes required.
- Existing animation styles (spinning conic border + pulse glow) stay intact.
- I’ll keep fallback logic for robustness, but reorder it to favor real visible anchors first.
