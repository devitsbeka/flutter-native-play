import { V3 } from "../theme";
import { TintedIcon } from "./TintedIcon";
import { BLUE_TINT } from "../tint";

interface ProBenefitsProps {
  title: string;
  items: Array<{ id: string; icon: string; title: string; blurb: string }>;
  onClick: () => void;
}

/** Title, then a row of 300px cards: 72px tile in a white frame, 16px title, 14px blurb. */
export function ProBenefits({ title, items, onClick }: ProBenefitsProps) {
  return (
    <section style={{ fontFamily: V3.font }}>
      <h2 style={{ margin: 0, paddingLeft: 28, color: V3.ink, fontSize: 22, fontWeight: 700, lineHeight: "26px" }}>{title}</h2>
      <div
        className="flex overflow-x-auto scrollbar-hide snap-x"
        style={{ gap: 26, paddingLeft: 22, paddingRight: 22, marginTop: 22, scrollPaddingLeft: 22, paddingTop: 12, paddingBottom: 6 }}
      >
        {items.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={onClick}
            className="flex shrink-0 snap-start text-left items-start active:opacity-80"
            style={{ width: 300, gap: 16, WebkitTapHighlightColor: "transparent" }}
          >
            <div
              className="relative shrink-0 flex items-center justify-center"
              style={{
                width: 78,
                height: 78,
                borderRadius: 21,
                background: "#ffffff",
                boxShadow: "0 3px 8px rgba(33, 50, 76, 0.16)",
              }}
            >
              <div
                className="flex items-center justify-center overflow-visible"
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 18,
                  background: `linear-gradient(160deg, ${V3.blueTileTop} 0%, ${V3.blueTileBottom} 100%)`,
                }}
              >
                <TintedIcon src={b.icon} tint={BLUE_TINT} width={66} height={66} style={{ transform: "translateY(-3px) scale(1.1)" }} />
              </div>
            </div>
            <div style={{ paddingTop: 9, minWidth: 0 }}>
              <div style={{ color: V3.ink, fontSize: 16, fontWeight: 700, lineHeight: "20px" }}>{b.title}</div>
              <div style={{ marginTop: 3, color: V3.muted, fontSize: 14, fontWeight: 400, lineHeight: "18px" }}>{b.blurb}</div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
