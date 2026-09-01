import { V3 } from "../theme";
import type { PathDef, PathStats } from "../paths";
import { TintedIcon } from "./TintedIcon";
import { PathTowers } from "./PathTowers";

interface PathCardProps {
  path: PathDef;
  tag: string;
  title: string;
  stats: PathStats;
  categoriesLabel: string;
  levelsLabel: string;
  viewLabel: string;
  onClick: () => void;
}

/**
 * One card of the Paths carousel: 324 × 486, the hero icon in the card's
 * hue, a white chip, the title, two counters, and "View →" at the foot with
 * the tower trail in the corner. Every offset is the reference's.
 */
export function PathCard({ path, tag, title, stats, categoriesLabel, levelsLabel, viewLabel, onClick }: PathCardProps) {
  const { theme } = path;
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative shrink-0 snap-start text-left overflow-hidden active:scale-[0.985] transition-transform duration-150"
      style={{
        width: 324,
        height: 486,
        borderRadius: 20,
        background: `linear-gradient(180deg, ${theme.gradient[0]} 0%, ${theme.gradient[1]} 100%)`,
        fontFamily: V3.font,
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {/* Hero icon: a 191 × 141 box, 30px down, centred */}
      <div className="absolute left-0 right-0 flex justify-center" style={{ top: 30 }}>
        <TintedIcon src={path.icon} tint={theme.tint} width={191} height={141} style={{ transform: "scale(1.12)" }} />
      </div>

      {/* Chip */}
      <div
        className="absolute inline-flex items-center"
        style={{
          left: 24,
          top: 194,
          height: 24,
          padding: "0 10px",
          borderRadius: 12,
          background: "#ffffff",
          color: theme.pillInk,
          fontSize: 13,
          fontWeight: 700,
          lineHeight: "24px",
          letterSpacing: "0.005em",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}
      >
        {tag}
      </div>

      {/* Title: two lines of 26/30, extra bold, white */}
      <div
        className="absolute"
        style={{
          left: 24,
          right: 24,
          top: 230,
          color: "#ffffff",
          fontSize: 26,
          fontWeight: 800,
          lineHeight: "30px",
          letterSpacing: "-0.005em",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {title}
      </div>

      {/* Counters */}
      <div className="absolute" style={{ left: 24, top: 316, fontSize: 20, lineHeight: "27px", fontWeight: 700 }}>
        <div>
          <span style={{ color: "#ffffff" }}>{stats.categories}</span>
          <span style={{ color: theme.label, marginLeft: 8 }}>{categoriesLabel}</span>
        </div>
        <div>
          <span style={{ color: "#ffffff" }}>{stats.levels}</span>
          <span style={{ color: theme.label, marginLeft: 8 }}>{levelsLabel}</span>
        </div>
      </div>

      {/* Trail, flush with the bottom-right corner */}
      <div className="absolute pointer-events-none" style={{ right: 4, bottom: -2 }}>
        <PathTowers color={theme.link} />
      </div>

      {/* View → */}
      <div
        className="absolute flex items-center"
        style={{ left: 24, bottom: 18, color: theme.link, fontSize: 21, fontWeight: 500, lineHeight: "24px", gap: 8 }}
      >
        <span>{viewLabel}</span>
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
          <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </button>
  );
}
