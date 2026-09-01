import { V3 } from "../theme";
import { PortraitCard, type PortraitCategory } from "./PortraitCard";
import { ViewLink } from "./ViewLink";

interface StartWithBandProps {
  title: string;
  categories: PortraitCategory[];
  viewLabel: string;
  isLocked: (category: PortraitCategory) => boolean;
  onCategory: (category: PortraitCategory) => void;
  onView: () => void;
}

/** Title 32px down, its 26px line, 18px, then the 218px tiles: where the band ends. */
const BAND_HEIGHT = 32 + 26 + 18 + 218;

/**
 * The near-black band the reference drops between the paths and the PRO
 * hero: a white title 32px down, the cards, and the band ending flush with
 * their bottom edge so the names sit on the paper beneath. The band is a
 * layer of its own height behind the content rather than the content's
 * box, which is what lets the names hang below its edge. The faint curves
 * are its texture, kept to a few percent.
 */
export function StartWithBand({ title, categories, viewLabel, isLocked, onCategory, onView }: StartWithBandProps) {
  return (
    <section className="relative">
      <div className="absolute left-0 right-0 top-0 overflow-hidden" style={{ height: BAND_HEIGHT, background: V3.band }} aria-hidden>
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 440 300">
          <path d="M-40 250 C 80 170, 200 320, 330 220 S 520 160, 560 230 V 300 H -40 Z" fill="#ffffff" fillOpacity="0.035" />
          <path d="M-40 300 C 100 200, 260 300, 480 190 V 300 Z" fill="#ffffff" fillOpacity="0.03" />
        </svg>
      </div>
      <h2
        className="relative"
        style={{ margin: 0, paddingTop: 32, paddingLeft: 32, color: "#ffffff", fontFamily: V3.font, fontSize: 21, fontWeight: 700, lineHeight: "26px" }}
      >
        {title}
      </h2>
      <div
        className="relative flex overflow-x-auto scrollbar-hide snap-x"
        style={{ gap: 16, paddingLeft: 28, paddingRight: 28, marginTop: 18, scrollPaddingLeft: 28 }}
      >
        {categories.map((c) => (
          <PortraitCard key={c.id} category={c} locked={isLocked(c)} onClick={() => onCategory(c)} />
        ))}
      </div>
      <div style={{ paddingLeft: 32, marginTop: 14 }}>
        <ViewLink label={viewLabel} onClick={onView} />
      </div>
    </section>
  );
}
