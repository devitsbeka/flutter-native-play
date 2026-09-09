/**
 * The frosted foot the quiz's bottom controls sit on.
 *
 * This is the lobby's start-game bar (src/components/lobby/UniversalLobby.tsx),
 * moved here rather than reinvented: four backdrop-blur layers, each
 * spanning the whole ramp and masking ITSELF in over a different stretch of
 * it, so the blur radius climbs continuously from nothing at the top to
 * 26px at the controls. The masks overlap — 0-25%, 20-50%, 45-75%, 70-100% —
 * which is why there is no boundary anywhere to see.
 *
 * A single band with a gradient does not do this. Whatever it fades to, it
 * has to stop somewhere, and that stop is a line across the screen. The
 * point of the ramp is that nothing about it has an edge.
 *
 * If a webview ignores the masks, every layer simply applies and the result
 * is one uniform frosted pane — the failure mode is the plainer look, not a
 * broken one.
 */

const RAMP = [
  { blur: 2, from: 0, to: 25 },
  { blur: 6, from: 20, to: 50 },
  { blur: 14, from: 45, to: 75 },
  { blur: 26, from: 70, to: 100 },
] as const;

/** The quiz ground (`bg-[#7E7ADB]`), which the tint has to be made of. */
const GROUND = "126,122,219";

interface QuizBottomBlurProps {
  /** How far above the controls the ramp starts, in px. */
  reach?: number;
}

export function QuizBottomBlur({ reach = 140 }: QuizBottomBlurProps) {
  return (
    <>
      {RAMP.map((step) => (
        <div
          key={step.blur}
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0"
          style={{
            top: -reach,
            backdropFilter: `blur(${step.blur}px)`,
            WebkitBackdropFilter: `blur(${step.blur}px)`,
            maskImage: `linear-gradient(180deg, transparent ${step.from}%, #000 ${step.to}%)`,
            WebkitMaskImage: `linear-gradient(180deg, transparent ${step.from}%, #000 ${step.to}%)`,
          }}
        />
      ))}
      {/* The tint rides the same ramp and tops out under half opacity, so
          what is behind still reads as content rather than as a bar. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0"
        style={{
          top: -reach,
          background: `linear-gradient(180deg, rgba(${GROUND},0) 0%, rgba(${GROUND},0.05) 40%, rgba(${GROUND},0.2) 72%, rgba(${GROUND},0.46) 100%)`,
        }}
      />
    </>
  );
}
