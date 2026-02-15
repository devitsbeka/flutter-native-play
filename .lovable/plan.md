

## Fix: Silver League Badge Button and "შენი ლიგა" Visibility

### Issue 1: Silver badge button has bronze/gold colors
The "ნახე რეიტინგი" button on the Silver league page uses `variant="gold"` as its base, then tries to override with gray CSS classes. However, the ChunkyButton renders its 3D depth/border effects using **inline styles** from the gold variant (amber/bronze colors), which the CSS class override cannot overwrite. This makes the silver button look like it has a bronze border.

**Fix:** Add a dedicated `"silver"` variant to the ChunkyButton component with proper gray/silver depth colors, and use it in the AnimatedLeagueBadge for tier 2.

#### File: `src/components/ui/chunky-button.tsx`
- Add `"silver"` to the variant type union
- Add silver variant styles with gray gradient face, gray depth/border colors matching a proper silver look

#### File: `src/pages/Leaderboards.tsx`
- Update `AnimatedLeagueBadge` to use `variant="silver"` for tier 2 instead of `variant="outline"` with className overrides
- Remove the `silverStyle` className hack

---

### Issue 2: "შენი ლიგა" text not visible enough
The label currently uses `text-white` with a light text shadow. On the silver/light backgrounds, this is hard to read.

**Fix:** Change text color to a darker shade and increase text shadow intensity for better contrast on all league backgrounds.

#### File: `src/pages/Leaderboards.tsx`
- Change `text-white` to `text-white` with a stronger, darker text shadow (e.g., `0 1px 6px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,0.5)`)
- Apply this to all three instances of "შენი ლიგა" (mobile collapsed, mobile expanded, tablet/desktop)

