import { V3 } from "../theme";

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  /** The little superscript after the title ("NEW" on Paths). */
  badge?: string;
  color?: string;
  subtitleColor?: string;
  /** Paths' subtitle is set on its own 16px leading, the rows' on 17. */
  subtitleLineHeight?: number;
  /** Left edge. The rows sit at 28; the Paths heading at 25. */
  inset?: number;
}

/** 21px bold title, 14px semibold subtitle, 28px in from the left. */
export function SectionHeading({
  title,
  subtitle,
  badge,
  color = V3.ink,
  subtitleColor = V3.muted,
  subtitleLineHeight = 17,
  inset = 28,
}: SectionHeadingProps) {
  return (
    <div style={{ paddingLeft: inset, paddingRight: 28, fontFamily: V3.font }}>
      <h2
        className="flex items-start"
        style={{ margin: 0, color, fontSize: 21, fontWeight: 700, lineHeight: "26px", letterSpacing: "-0.005em" }}
      >
        <span>{title}</span>
        {badge && (
          <span style={{ fontSize: 12, fontWeight: 700, lineHeight: "12px", marginLeft: 6, marginTop: 1, letterSpacing: "0.01em" }}>
            {badge}
          </span>
        )}
      </h2>
      {subtitle && (
        <p
          style={{
            margin: "2px 0 0",
            color: subtitleColor,
            fontSize: 14,
            fontWeight: 600,
            lineHeight: `${subtitleLineHeight}px`,
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
