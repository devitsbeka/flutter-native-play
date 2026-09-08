import { BackgroundVideo } from "@/components/shared/BackgroundVideo";
import { useResponsiveVideo } from "@/hooks/useResponsiveVideo";
import { cn } from "@/lib/utils";

/**
 * The backdrop the play screens share (Figma 1102:3080, 1102:4081, 1102:4319).
 *
 * One picture, two layers over it. The blob loop is the picture — the same one
 * the rest of the app drifts behind — and the design then puts a flat white
 * veil across the whole of it and a violet fall from the top. That pairing is
 * what makes the lavender haze the play screens sit on: strong enough at the
 * header to read as colour, gone by the footer, and never anything the eye
 * has to look past to read a card.
 *
 * It is a component rather than three copies of the gradient because the
 * chooser, the lobby and the out-of-lives screen are one continuous flow —
 * tap a card, land in a lobby, or get stopped by the wall — and a wash that
 * differs by a few percent between them shows up as a flash at every step.
 */
export function PlayBackdrop({
  /**
   * How much white sits over the picture. The design uses 0.51 on the two
   * screens you can act on and 0.41 on the out-of-lives wall, where the
   * whole backdrop is blurred and can afford to keep more of its colour.
   */
  veil = 0.51,
  /** The out-of-lives wall blurs the picture itself (1102:4319). */
  blur = false,
  className,
}: {
  veil?: number;
  blur?: boolean;
  className?: string;
}) {
  const bubbleVideo = useResponsiveVideo("/videos/floating-blob.mp4");

  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <BackgroundVideo
        sources={[
          { src: bubbleVideo.webm, type: "video/webm" },
          { src: bubbleVideo.mp4, type: "video/mp4" },
        ]}
        still="/videos/floating-blob-still.jpg"
        // Inset by the blur radius so the softened edges never uncover the
        // page behind them.
        className={cn("absolute", blur ? "-inset-6 blur-[12px]" : "inset-0")}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: [
            `linear-gradient(90deg, rgba(255,255,255,${veil}) 0%, rgba(255,255,255,${veil}) 100%)`,
            "linear-gradient(180deg, rgba(152,124,255,0.3) 0%, rgba(255,255,255,0) 100%)",
          ].join(", "),
        }}
      />
    </div>
  );
}
