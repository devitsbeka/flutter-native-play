import { cn } from "@/lib/utils";
import partyLogo from "@/assets/mytrivia-party-logo.png";

/**
 * MyTrivia Party's own wordmark.
 *
 * The brand used to be drawn as a generic group-of-people icon with the
 * words "My Trivia Party" set beside it — two things saying the same thing,
 * and neither of them the logo. The logo says it itself (owner: "when you
 * replace logo make sure you don't show text 'my trivia party', logo
 * includes that text already"), so anywhere this goes, the caption comes
 * out.
 *
 * It is a WORDMARK, roughly 3.3:1, not an icon. It belongs where there is
 * width for it — a card's header, a menu row, a tile that was already
 * spelling the name out. The small square slots that show a room's face or
 * a draft's kind keep a square mark, because a 24px-tall wordmark is not
 * legible and not a face.
 *
 * Sized by HEIGHT: the width follows, so it lines up with whatever text or
 * control sits beside it.
 */
export function MyTriviaPartyLogo({
  height = 28,
  className,
}: {
  /** Cap height in px. Width follows the artwork's own ratio. */
  height?: number;
  className?: string;
}) {
  return (
    <img
      src={partyLogo}
      // The words are IN the picture, so this is what a screen reader gets
      // instead of them — the caption it replaces, not a description of art.
      alt="MyTrivia Party"
      style={{ height }}
      className={cn("w-auto shrink-0 select-none object-contain", className)}
      draggable={false}
    />
  );
}
