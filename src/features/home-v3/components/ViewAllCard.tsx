import { V3 } from "../theme";
import { ArrowRightIcon } from "./Icons";

interface ViewAllCardProps {
  title: string;
  subtitle: string;
  cta: string;
  /** Three pictures for the overlapping circles, left to right. */
  pictures: string[];
  onClick: () => void;
}

/**
 * The closing band: 150px of the darker paper, title, a two-line line under
 * it, an orange "→ View", and three 64px portraits fanned at the right.
 */
export function ViewAllCard({ title, subtitle, cta, pictures, onClick }: ViewAllCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative block w-full text-left active:opacity-90"
      style={{ height: 150, background: V3.footerBand, fontFamily: V3.font, WebkitTapHighlightColor: "transparent" }}
    >
      <div className="absolute" style={{ left: 32, top: 25, width: 200 }}>
        <div style={{ color: V3.ink, fontSize: 20, fontWeight: 700, lineHeight: "26px" }}>{title}</div>
        <div style={{ marginTop: 1, color: V3.footerMuted, fontSize: 15, fontWeight: 400, lineHeight: "20px", maxWidth: 170 }}>{subtitle}</div>
        <div className="flex items-center" style={{ marginTop: 12, color: V3.footerLink, gap: 10, fontSize: 16, fontWeight: 700, lineHeight: "20px" }}>
          <ArrowRightIcon size={22} strokeWidth={1.9} />
          <span>{cta}</span>
        </div>
      </div>

      <div className="absolute flex" style={{ right: 36, top: 43 }}>
        {pictures.slice(0, 3).map((src, i) => (
          <div
            key={src + i}
            className="overflow-hidden"
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              border: `3px solid ${V3.bg}`,
              marginLeft: i === 0 ? 0 : -24,
              background: "#cfc6b8",
              boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
              zIndex: i + 1,
              position: "relative",
            }}
          >
            <img src={src} alt="" loading="lazy" draggable={false} className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
    </button>
  );
}
