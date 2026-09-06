/**
 * The surface the change-name sheet (GameModal) floats on: a near-white
 * lavender gradient with four blurred brand blobs. The settings, help and
 * privacy pages wear the same one (owner's ask), so the sheet and the pages
 * it opens over are one room rather than a wash and a flat white sheet.
 *
 * Absolute, under the content, taking no taps. The parent must be
 * `relative`, and the content it sits under must be positioned above it
 * (`relative z-10`): an absolutely positioned box paints over in-flow
 * blocks otherwise.
 */
export const AMBIENT_SURFACE = "linear-gradient(180deg, #FDFAFF 0%, #F6E8FF 100%)";

export function AmbientBlobBackdrop() {
  return (
    <div
      className="absolute inset-0 z-0 overflow-hidden pointer-events-none"
      aria-hidden
      style={{ background: AMBIENT_SURFACE }}
    >
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-purple-300/30 blur-3xl" />
      <div className="absolute top-1/3 -right-28 w-[28rem] h-[28rem] rounded-full bg-violet-300/25 blur-3xl" />
      <div className="absolute bottom-[-6rem] left-1/4 w-96 h-96 rounded-full bg-emerald-200/30 blur-3xl" />
      <div className="absolute top-2/3 left-[-5rem] w-72 h-72 rounded-full bg-pink-200/30 blur-3xl" />
    </div>
  );
}

/** PageHeader over the backdrop: see-through with a blur, the sheet's own hairline. */
export const AMBIENT_HEADER_CLASS = "!bg-transparent backdrop-blur-md !border-purple-900/10";
