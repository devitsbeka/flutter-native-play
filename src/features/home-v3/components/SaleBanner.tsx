import { V3 } from "../theme";
import { useCountdown } from "../promo";
import { IOS_TAB_BAR_INSET_X } from "./TabBar";

interface SaleBannerProps {
  label: string;
  cta: string;
  /** When the offer ends — the clock counts to it (or to midnight, if sooner). */
  endsAt: string;
  onClick: () => void;
  /** Distance from the viewport's bottom — the tab bar's height plus the inset. */
  bottom: string;
}

/**
 * The 45px offer strip stacked just above the tab bar's capsule, with the
 * capsule's own side inset and rounding: leaf mark, the label, a live
 * HH : MM : SS, and a white "Get PRO" button 16px from the right.
 */
export function SaleBanner({ label, cta, endsAt, onClick, bottom }: SaleBannerProps) {
  const countdown = useCountdown(endsAt);
  return (
    <div className="fixed left-0 right-0 z-40" style={{ bottom, paddingLeft: IOS_TAB_BAR_INSET_X, paddingRight: IOS_TAB_BAR_INSET_X }}>
      <div
        className="relative mx-auto flex items-center"
        style={{
          maxWidth: 448,
          height: V3.saleBannerHeight,
          borderRadius: 16,
          boxShadow: "0 6px 18px rgba(208, 80, 52, 0.28)",
          background: V3.sale,
          fontFamily: V3.font,
          color: "#ffffff",
          paddingLeft: 12,
          paddingRight: 16,
        }}
      >
        <LeavesIcon />
        <span style={{ marginLeft: 4, fontSize: 15, fontWeight: 400, lineHeight: "20px" }}>{label}</span>
        <span className="ml-auto" style={{ fontSize: 15, fontWeight: 400, lineHeight: "20px", fontVariantNumeric: "tabular-nums", marginRight: 15 }}>
          {countdown}
        </span>
        <button
          type="button"
          onClick={onClick}
          className="flex items-center justify-center active:scale-95 transition-transform"
          style={{
            height: 24,
            padding: "0 10px",
            borderRadius: 6,
            background: "#ffffff",
            color: V3.saleText,
            fontSize: 15,
            fontWeight: 700,
            lineHeight: "24px",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          {cta}
        </button>
      </div>
    </div>
  );
}

/** Two autumn leaves in white line, 31 × 24 like the reference's mark. */
function LeavesIcon() {
  return (
    <svg width="31" height="24" viewBox="0 0 31 24" aria-hidden>
      <g fill="none" stroke="#ffffff" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
        <path d="M4 20c0-8 4-14 12-16-1 8-4 13-12 16Z" fill="rgba(255,255,255,0.15)" />
        <path d="M4 20 12 9" />
        <path d="M16 21c-2-7 1-13 8-16 2 7 0 13-8 16Z" fill="#f5a24a" fillOpacity="0.9" />
        <path d="M16 21 22 9" />
        <path d="M22 22c3-5 6-6 8-6-1 4-3 6-8 6Z" fill="rgba(255,255,255,0.2)" />
      </g>
    </svg>
  );
}
