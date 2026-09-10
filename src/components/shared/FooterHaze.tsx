/**
 * The haze under a floating footer: a progressive blur, not a stack of
 * panes, with a tint riding the same ramp.
 *
 * One uniform pane put a hard line across the screen where it began. Six
 * panes of rising strength, each starting a little higher, only turned that
 * one line into six — each pane's own top edge is still an edge, and at
 * these radii they read as bands (owner: "i see 2-3 strict lines it is not
 * smooth").
 *
 * What removes the edge is masking each layer rather than clipping it:
 * every layer spans the whole ramp and fades ITSELF in over a different
 * stretch of it, so the blur radius climbs continuously from nothing at the
 * top to 26px at the button and there is no boundary anywhere to see. Four
 * layers is enough because their masks overlap — 0-25%, 20-50%, 45-75%,
 * 70-100%.
 *
 * Masking a backdrop-filter is what an earlier note refused to do, on a
 * worry about iOS banding that was never tested and cost the thing it was
 * protecting. If a webview ignored the mask the layers would simply all
 * apply, which is the uniform pane this started as — the failure mode is
 * the old behaviour, not a worse one.
 *
 * Born in the lobby (UniversalLobby); the results screen's footer wears the
 * same one over its list of seats (owner: "use same background blur behind
 * the button what we use in lobby in bottom"). The tint is the screen's own
 * ground, so what shows through frosts into the page rather than into a
 * colour it does not have.
 */
export const FOOTER_HAZE_STEPS = [
  { blur: 2, from: 0, to: 25 },
  { blur: 6, from: 20, to: 50 },
  { blur: 14, from: 45, to: 75 },
  { blur: 26, from: 70, to: 100 },
] as const;

/** The lobby's lilac page, as "r,g,b". */
export const LOBBY_HAZE_TINT = "249,219,255";

export function FooterHaze({ tint = LOBBY_HAZE_TINT }: { tint?: string }) {
  return (
    <>
      {FOOTER_HAZE_STEPS.map((step) => (
        <div
          key={step.blur}
          aria-hidden
          style={{
            backdropFilter: `blur(${step.blur}px)`,
            WebkitBackdropFilter: `blur(${step.blur}px)`,
            WebkitMaskImage: `linear-gradient(180deg, transparent ${step.from}%, #000 ${step.to}%)`,
            maskImage: `linear-gradient(180deg, transparent ${step.from}%, #000 ${step.to}%)`,
          }}
          className="pointer-events-none absolute inset-x-0 bottom-0 top-[-120px]"
        />
      ))}
      {/* The tint rides the same ramp and tops out under half opacity, so
          what is behind still reads as content rather than as a bar. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 top-[-120px]"
        style={{
          background: `linear-gradient(180deg, rgba(${tint},0) 0%, rgba(${tint},0.05) 40%, rgba(${tint},0.2) 72%, rgba(${tint},0.46) 100%)`,
        }}
      />
    </>
  );
}

/**
 * The same ramp, upside down, under a floating header.
 *
 * The lobby's category chip sits over its scrolling body the way the footer
 * does, and the body used to simply start under the chip: a hard edge across
 * the screen where the tabs card was cut off (owner: "use same blur in top
 * while scrolling what we use in bottom - behind the purple button"). So the
 * body runs up under the chip and this hazes it: the same four masked
 * layers and tint, with every gradient turned to run from strongest at the
 * top to nothing at the bottom of whatever box it is given. The caller
 * sizes that box — the lobby's runs from the header's underside to just
 * above where its sticky tabs park, so the tabs themselves stay crisp.
 */
export function TopHaze({ tint = LOBBY_HAZE_TINT }: { tint?: string }) {
  return (
    <>
      {FOOTER_HAZE_STEPS.map((step) => (
        <div
          key={step.blur}
          aria-hidden
          style={{
            backdropFilter: `blur(${step.blur}px)`,
            WebkitBackdropFilter: `blur(${step.blur}px)`,
            WebkitMaskImage: `linear-gradient(0deg, transparent ${step.from}%, #000 ${step.to}%)`,
            maskImage: `linear-gradient(0deg, transparent ${step.from}%, #000 ${step.to}%)`,
          }}
          className="pointer-events-none absolute inset-0"
        />
      ))}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `linear-gradient(0deg, rgba(${tint},0) 0%, rgba(${tint},0.05) 40%, rgba(${tint},0.2) 72%, rgba(${tint},0.46) 100%)`,
        }}
      />
    </>
  );
}
