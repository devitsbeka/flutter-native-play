
Goal
- Fix onboarding spotlight targeting so that:
  1) desktop highlights cover the full nav row (icon + text),
  2) tablet/desktop always show the last “Play” step,
  3) spotlight stays fully visible and centered on the intended button.

What I found
- The desktop/tablet nav items currently apply `data-onboarding-id` to the icon wrapper in `UnifiedDesktopNav.tsx` (not the full row), so the spotlight only hugs the icon.
- The onboarding overlay (`WelcomeOnboardingOverlay.tsx`) currently forces a square spotlight via `buildSpotlightRect`, which is good for icon-only targets but wrong for full-row desktop targets.
- Only mobile bottom nav has `data-onboarding-id="play"` (in `UniversalBottomNav.tsx`). On tablet/desktop preview route (`/onboarding`), that element is hidden and no alternative `play` target exists, so the 5th step disappears.

Implementation plan

1) Make desktop/tablet nav anchors represent the full row
- File: `src/components/layout/UnifiedDesktopNav.tsx`
- Move onboarding anchoring from the inner icon container to the `motion.button` root in `NavButton`.
- Keep onboarding IDs for `explore/shop/rank/team` exactly as now, but bound to the full clickable row so spotlight includes icon + label on desktop.
- Keep behavior unchanged for locked items, badges, and hover.

2) Add a reliable desktop/tablet “Play” anchor
- File: `src/components/home/DesktopPlayButtonLarge.tsx`
- Add optional prop `onboardingId?: string`.
- Apply `data-onboarding-id={onboardingId}` on the actual clickable `motion.button`.
- This ensures the overlay can target the real play CTA (not a container).

3) Wire play onboarding ID in desktop/tablet play CTA usage
- Files:
  - `src/pages/Index.tsx`
  - `src/components/home/DesktopGuestSplitLayout.tsx` (if used in guest desktop flows)
- Pass `onboardingId="play"` to `DesktopPlayButtonLarge` where it is the visible play action.
- This covers real onboarding on home layouts for both logged-in and guest desktop/tablet variants.

4) Ensure `/onboarding` preview also has a play target on desktop/tablet
- File: `src/pages/OnboardingWelcomePreview.tsx`
- Add a small desktop/tablet preview play CTA section (using `DesktopPlayButtonLarge` with `onboardingId="play"`), so step 5 always has a visible anchor on preview route.
- Keep mobile preview unchanged (mobile still uses bottom nav play target).

5) Update overlay geometry logic for mixed target types
- File: `src/components/onboarding/WelcomeOnboardingOverlay.tsx`
- Refactor target resolution to keep both element and rect context (not only rect), enabling shape-aware spotlight behavior.
- Spotlight shaping rules:
  - For desktop/tablet nav rows (wide targets): use rectangular spotlight (preserve row width/height + controlled padding).
  - For icon-only targets (mobile nav icons): use square spotlight with min icon size.
  - For play targets: preserve actual button geometry with min bounds so full button is visible.
- Keep arrow logic anchored to true target center/right edge so pointer remains accurate after row-level targeting.

6) Improve candidate selection so hidden duplicates are never chosen
- File: `src/components/onboarding/WelcomeOnboardingOverlay.tsx`
- Tighten visibility filter (non-zero rect, computed visibility/display/opacity, in viewport).
- Add step-aware preference:
  - `explore/shop/rank/team` prefer left-nav candidates on md+.
  - `play` prefer visible desktop/tablet play CTA on md+; prefer bottom-nav play on mobile.
- Keep fallback retry; add last-resort play fallback rect only if no visible target is found after retries (to prevent flow from silently disappearing).

Expected result
- Desktop: first 4 steps spotlight full nav row (icon + text), not icon-only.
- Tablet: first 4 steps spotlight full tablet nav row area; tooltip remains properly positioned.
- Play step: visible and correctly anchored on desktop and tablet (including `/onboarding` preview).
- No regression on mobile bottom-nav spotlighting.

Validation checklist
1) `/onboarding` at desktop width (e.g., 1536):
- Steps 1–4 highlight full left-nav rows.
- Step 5 highlights a visible play button target (not missing).
- Tooltip arrow points to selected target correctly.

2) `/onboarding` at tablet width (e.g., 820):
- Steps align to tablet nav items.
- Step 5 appears and highlights play target.

3) Home page onboarding trigger on desktop/tablet:
- Play step highlights the real play CTA and remains fully visible.

4) Mobile regression check:
- Steps still align over bottom-nav icons and play button.
- No clipping/off-screen modal.

Technical notes
- UI-only change; no backend/database/auth changes required.
- Existing onboarding analytics/tracking stays unchanged.
